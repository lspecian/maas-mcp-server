package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// OAuthProvider represents an OAuth 2.0 provider
type OAuthProvider struct {
	Name         string
	ClientID     string
	ClientSecret string
	AuthURL      string
	TokenURL     string
	RedirectURL  string
	Scopes       []string
}

// OAuthManager handles OAuth authentication
type OAuthManager struct {
	providers  map[string]*OAuthProvider
	tokenStore TokenStore
	mu         sync.RWMutex
}

// OAuthTokenResponse represents the response from an OAuth token request
type OAuthTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	Scope        string `json:"scope,omitempty"`
	IDToken      string `json:"id_token,omitempty"`
}

// OAuthUserInfo represents user information from an OAuth provider
type OAuthUserInfo struct {
	ID            string                 `json:"id,omitempty"`
	Email         string                 `json:"email,omitempty"`
	VerifiedEmail bool                   `json:"verified_email,omitempty"`
	Name          string                 `json:"name,omitempty"`
	GivenName     string                 `json:"given_name,omitempty"`
	FamilyName    string                 `json:"family_name,omitempty"`
	Picture       string                 `json:"picture,omitempty"`
	Locale        string                 `json:"locale,omitempty"`
	Raw           map[string]interface{} `json:"-"`
}

// NewOAuthManager creates a new OAuth manager
func NewOAuthManager(providers map[string]*OAuthProvider, tokenStore TokenStore) *OAuthManager {
	return &OAuthManager{
		providers:  providers,
		tokenStore: tokenStore,
	}
}

// GetAuthURL returns the authorization URL for the specified provider
func (m *OAuthManager) GetAuthURL(providerName string, state string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	provider, exists := m.providers[providerName]
	if !exists {
		return "", fmt.Errorf("unknown OAuth provider: %s", providerName)
	}

	// Build the authorization URL
	u, err := url.Parse(provider.AuthURL)
	if err != nil {
		return "", fmt.Errorf("invalid auth URL: %w", err)
	}

	q := u.Query()
	q.Set("client_id", provider.ClientID)
	q.Set("redirect_uri", provider.RedirectURL)
	q.Set("response_type", "code")
	q.Set("state", state)
	q.Set("scope", strings.Join(provider.Scopes, " "))
	u.RawQuery = q.Encode()

	return u.String(), nil
}

// ExchangeCodeForToken exchanges an authorization code for an access token
func (m *OAuthManager) ExchangeCodeForToken(providerName, code string) (*OAuthTokenResponse, error) {
	m.mu.RLock()
	provider, exists := m.providers[providerName]
	m.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("unknown OAuth provider: %s", providerName)
	}

	// Prepare the token request
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("client_id", provider.ClientID)
	data.Set("client_secret", provider.ClientSecret)
	data.Set("redirect_uri", provider.RedirectURL)

	// Send the token request
	req, err := http.NewRequest("POST", provider.TokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token request failed with status: %s", resp.Status)
	}

	// Parse the token response
	var tokenResp OAuthTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %w", err)
	}

	// Store the token
	now := time.Now()
	expiresAt := now.Add(time.Duration(tokenResp.ExpiresIn) * time.Second)

	token := &Token{
		ID:        uuid.New().String(),
		UserID:    "", // Will be set after getting user info
		Value:     tokenResp.AccessToken,
		Type:      TokenTypeAccess,
		ExpiresAt: expiresAt,
		CreatedAt: now,
		Revoked:   false,
	}

	if err := m.tokenStore.StoreToken(token); err != nil {
		return nil, fmt.Errorf("failed to store access token: %w", err)
	}

	// Store refresh token if provided
	if tokenResp.RefreshToken != "" {
		refreshToken := &Token{
			ID:        uuid.New().String(),
			UserID:    "", // Will be set after getting user info
			Value:     tokenResp.RefreshToken,
			Type:      TokenTypeRefresh,
			ExpiresAt: now.Add(30 * 24 * time.Hour), // Default to 30 days
			CreatedAt: now,
			Revoked:   false,
		}

		if err := m.tokenStore.StoreToken(refreshToken); err != nil {
			return nil, fmt.Errorf("failed to store refresh token: %w", err)
		}
	}

	return &tokenResp, nil
}

// GetUserInfo retrieves user information using the access token
func (m *OAuthManager) GetUserInfo(ctx context.Context, providerName, accessToken string) (*OAuthUserInfo, error) {
	m.mu.RLock()
	_, exists := m.providers[providerName]
	m.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("unknown OAuth provider: %s", providerName)
	}

	// The user info endpoint varies by provider
	var userInfoURL string
	switch providerName {
	case "google":
		userInfoURL = "https://www.googleapis.com/oauth2/v3/userinfo"
	case "github":
		userInfoURL = "https://api.github.com/user"
	default:
		return nil, fmt.Errorf("user info endpoint not configured for provider: %s", providerName)
	}

	// Send the user info request
	req, err := http.NewRequestWithContext(ctx, "GET", userInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create user info request: %w", err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("user info request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("user info request failed with status: %s", resp.Status)
	}

	// Parse the user info response
	var userInfo OAuthUserInfo
	var rawData map[string]interface{}

	if err := json.NewDecoder(resp.Body).Decode(&rawData); err != nil {
		return nil, fmt.Errorf("failed to parse user info response: %w", err)
	}

	// Store the raw data
	userInfo.Raw = rawData

	// Extract common fields
	if id, ok := rawData["id"].(string); ok {
		userInfo.ID = id
	} else if id, ok := rawData["sub"].(string); ok {
		userInfo.ID = id
	}

	if email, ok := rawData["email"].(string); ok {
		userInfo.Email = email
	}

	if name, ok := rawData["name"].(string); ok {
		userInfo.Name = name
	}

	if picture, ok := rawData["picture"].(string); ok {
		userInfo.Picture = picture
	}

	return &userInfo, nil
}

// RefreshToken refreshes an OAuth access token using a refresh token
func (m *OAuthManager) RefreshToken(providerName, refreshToken string) (*OAuthTokenResponse, error) {
	m.mu.RLock()
	provider, exists := m.providers[providerName]
	m.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("unknown OAuth provider: %s", providerName)
	}

	// Prepare the refresh token request
	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", refreshToken)
	data.Set("client_id", provider.ClientID)
	data.Set("client_secret", provider.ClientSecret)

	// Send the refresh token request
	req, err := http.NewRequest("POST", provider.TokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create refresh token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("refresh token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("refresh token request failed with status: %s", resp.Status)
	}

	// Parse the token response
	var tokenResp OAuthTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse refresh token response: %w", err)
	}

	// Revoke the old access token
	// This is a best effort operation, so we don't return an error if it fails
	tokens, _ := m.tokenStore.GetTokensByUserID("")
	for _, token := range tokens {
		if token.Type == TokenTypeAccess {
			m.tokenStore.RevokeToken(token.Value)
			break
		}
	}

	// Store the new access token
	now := time.Now()
	expiresAt := now.Add(time.Duration(tokenResp.ExpiresIn) * time.Second)

	token := &Token{
		ID:        uuid.New().String(),
		UserID:    "", // Should be updated with the actual user ID
		Value:     tokenResp.AccessToken,
		Type:      TokenTypeAccess,
		ExpiresAt: expiresAt,
		CreatedAt: now,
		Revoked:   false,
	}

	if err := m.tokenStore.StoreToken(token); err != nil {
		return nil, fmt.Errorf("failed to store access token: %w", err)
	}

	// Store the new refresh token if provided
	if tokenResp.RefreshToken != "" {
		refreshToken := &Token{
			ID:        uuid.New().String(),
			UserID:    "", // Should be updated with the actual user ID
			Value:     tokenResp.RefreshToken,
			Type:      TokenTypeRefresh,
			ExpiresAt: now.Add(30 * 24 * time.Hour), // Default to 30 days
			CreatedAt: now,
			Revoked:   false,
		}

		if err := m.tokenStore.StoreToken(refreshToken); err != nil {
			return nil, fmt.Errorf("failed to store refresh token: %w", err)
		}
	}

	return &tokenResp, nil
}

// ValidateToken validates an OAuth access token
func (m *OAuthManager) ValidateToken(accessToken string) (bool, error) {
	token, err := m.tokenStore.GetToken(accessToken)
	if err != nil {
		return false, err
	}

	if token.Revoked {
		return false, errors.New("token has been revoked")
	}

	if time.Now().After(token.ExpiresAt) {
		return false, errors.New("token has expired")
	}

	return true, nil
}

// RevokeToken revokes an OAuth token
func (m *OAuthManager) RevokeToken(accessToken string) error {
	return m.tokenStore.RevokeToken(accessToken)
}

// RevokeAllUserTokens revokes all tokens for a user
func (m *OAuthManager) RevokeAllUserTokens(userID string) error {
	return m.tokenStore.RevokeAllUserTokens(userID)
}
