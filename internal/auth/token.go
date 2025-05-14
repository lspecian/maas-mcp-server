package auth

import (
	"crypto/rsa"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

// TokenType represents the type of token
type TokenType string

const (
	// TokenTypeAccess represents an access token
	TokenTypeAccess TokenType = "access"
	// TokenTypeRefresh represents a refresh token
	TokenTypeRefresh TokenType = "refresh"
)

// Token represents a token in the token store
type Token struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Value     string    `json:"value"`
	Type      TokenType `json:"type"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	Revoked   bool      `json:"revoked"`
}

// TokenStore defines the interface for token storage
type TokenStore interface {
	// StoreToken stores a token
	StoreToken(token *Token) error

	// GetToken retrieves a token by its value
	GetToken(value string) (*Token, error)

	// GetTokensByUserID retrieves all tokens for a user
	GetTokensByUserID(userID string) ([]*Token, error)

	// RevokeToken revokes a token
	RevokeToken(value string) error

	// RevokeAllUserTokens revokes all tokens for a user
	RevokeAllUserTokens(userID string) error

	// CleanupExpiredTokens removes expired tokens
	CleanupExpiredTokens() error
}

// MemoryTokenStore implements TokenStore using an in-memory map
type MemoryTokenStore struct {
	tokens    map[string]*Token   // token value -> Token
	userIndex map[string][]string // user ID -> list of token values
	mu        sync.RWMutex
}

// NewMemoryTokenStore creates a new in-memory token store
func NewMemoryTokenStore() *MemoryTokenStore {
	return &MemoryTokenStore{
		tokens:    make(map[string]*Token),
		userIndex: make(map[string][]string),
	}
}

// StoreToken stores a token
func (s *MemoryTokenStore) StoreToken(token *Token) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Store a copy to avoid race conditions
	tokenCopy := *token
	s.tokens[token.Value] = &tokenCopy

	// Update user index
	s.userIndex[token.UserID] = append(s.userIndex[token.UserID], token.Value)

	return nil
}

// GetToken retrieves a token by its value
func (s *MemoryTokenStore) GetToken(value string) (*Token, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	token, exists := s.tokens[value]
	if !exists {
		return nil, errors.New("token not found")
	}

	if token.Revoked {
		return nil, errors.New("token has been revoked")
	}

	if time.Now().After(token.ExpiresAt) {
		return nil, errors.New("token has expired")
	}

	// Return a copy to avoid race conditions
	tokenCopy := *token
	return &tokenCopy, nil
}

// GetTokensByUserID retrieves all tokens for a user
func (s *MemoryTokenStore) GetTokensByUserID(userID string) ([]*Token, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	tokenValues, exists := s.userIndex[userID]
	if !exists {
		return []*Token{}, nil
	}

	tokens := make([]*Token, 0, len(tokenValues))
	for _, value := range tokenValues {
		token, exists := s.tokens[value]
		if exists && !token.Revoked && time.Now().Before(token.ExpiresAt) {
			// Create a copy to avoid race conditions
			tokenCopy := *token
			tokens = append(tokens, &tokenCopy)
		}
	}

	return tokens, nil
}

// RevokeToken revokes a token
func (s *MemoryTokenStore) RevokeToken(value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	token, exists := s.tokens[value]
	if !exists {
		return errors.New("token not found")
	}

	token.Revoked = true
	return nil
}

// RevokeAllUserTokens revokes all tokens for a user
func (s *MemoryTokenStore) RevokeAllUserTokens(userID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	tokenValues, exists := s.userIndex[userID]
	if !exists {
		return nil
	}

	for _, value := range tokenValues {
		if token, exists := s.tokens[value]; exists {
			token.Revoked = true
		}
	}

	return nil
}

// CleanupExpiredTokens removes expired tokens
func (s *MemoryTokenStore) CleanupExpiredTokens() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	for value, token := range s.tokens {
		if token.Revoked || now.After(token.ExpiresAt) {
			delete(s.tokens, value)
		}
	}

	// Rebuild user index
	s.userIndex = make(map[string][]string)
	for value, token := range s.tokens {
		s.userIndex[token.UserID] = append(s.userIndex[token.UserID], value)
	}

	return nil
}

// FileTokenStore implements TokenStore using a JSON file
type FileTokenStore struct {
	filePath string
	memory   *MemoryTokenStore
	mu       sync.RWMutex
}

// NewFileTokenStore creates a new file-based token store
func NewFileTokenStore(filePath string) (*FileTokenStore, error) {
	store := &FileTokenStore{
		filePath: filePath,
		memory:   NewMemoryTokenStore(),
	}

	// Load existing tokens from file
	if err := store.load(); err != nil {
		// If file doesn't exist, that's fine - we'll create it when saving
		if !os.IsNotExist(err) {
			return nil, fmt.Errorf("failed to load tokens from file: %w", err)
		}
	}

	return store, nil
}

// load reads tokens from the file
func (s *FileTokenStore) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	file, err := os.Open(s.filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	var tokens []*Token
	if err := json.NewDecoder(file).Decode(&tokens); err != nil {
		return fmt.Errorf("failed to decode tokens: %w", err)
	}

	// Reset memory store
	s.memory = NewMemoryTokenStore()

	// Add tokens to memory store
	for _, token := range tokens {
		if err := s.memory.StoreToken(token); err != nil {
			return fmt.Errorf("failed to add token to memory store: %w", err)
		}
	}

	return nil
}

// save writes tokens to the file
func (s *FileTokenStore) save() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Get all tokens
	var tokens []*Token
	for _, userTokens := range s.memory.userIndex {
		for _, value := range userTokens {
			if token, exists := s.memory.tokens[value]; exists {
				tokens = append(tokens, token)
			}
		}
	}

	// Create directory if it doesn't exist
	dir := s.filePath[:len(s.filePath)-len(s.filePath)]
	if dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory: %w", err)
		}
	}

	file, err := os.Create(s.filePath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	if err := json.NewEncoder(file).Encode(tokens); err != nil {
		return fmt.Errorf("failed to encode tokens: %w", err)
	}

	return nil
}

// StoreToken stores a token
func (s *FileTokenStore) StoreToken(token *Token) error {
	if err := s.memory.StoreToken(token); err != nil {
		return err
	}

	return s.save()
}

// GetToken retrieves a token by its value
func (s *FileTokenStore) GetToken(value string) (*Token, error) {
	return s.memory.GetToken(value)
}

// GetTokensByUserID retrieves all tokens for a user
func (s *FileTokenStore) GetTokensByUserID(userID string) ([]*Token, error) {
	return s.memory.GetTokensByUserID(userID)
}

// RevokeToken revokes a token
func (s *FileTokenStore) RevokeToken(value string) error {
	if err := s.memory.RevokeToken(value); err != nil {
		return err
	}

	return s.save()
}

// RevokeAllUserTokens revokes all tokens for a user
func (s *FileTokenStore) RevokeAllUserTokens(userID string) error {
	if err := s.memory.RevokeAllUserTokens(userID); err != nil {
		return err
	}

	return s.save()
}

// CleanupExpiredTokens removes expired tokens
func (s *FileTokenStore) CleanupExpiredTokens() error {
	if err := s.memory.CleanupExpiredTokens(); err != nil {
		return err
	}

	return s.save()
}

// JWTManager handles JWT token generation and validation
type JWTManager struct {
	secret     []byte
	publicKey  *rsa.PublicKey
	privateKey *rsa.PrivateKey
	algorithm  string
	issuer     string
	audience   []string
	expiration time.Duration
	tokenStore TokenStore
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(config *JWTConfig, tokenStore TokenStore) (*JWTManager, error) {
	manager := &JWTManager{
		algorithm:  config.Algorithm,
		issuer:     config.Issuer,
		audience:   config.Audience,
		expiration: time.Duration(config.ExpirationMinutes) * time.Minute,
		tokenStore: tokenStore,
	}

	// Initialize keys based on algorithm
	if config.Algorithm == "HS256" || config.Algorithm == "HS384" || config.Algorithm == "HS512" {
		manager.secret = []byte(config.Secret)
	} else {
		// Load RSA or ECDSA keys
		privateKeyBytes, err := os.ReadFile(config.PrivateKeyPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read private key: %w", err)
		}

		publicKeyBytes, err := os.ReadFile(config.PublicKeyPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read public key: %w", err)
		}

		if config.Algorithm == "RS256" || config.Algorithm == "RS384" || config.Algorithm == "RS512" {
			privateKey, err := jwt.ParseRSAPrivateKeyFromPEM(privateKeyBytes)
			if err != nil {
				return nil, fmt.Errorf("failed to parse RSA private key: %w", err)
			}
			manager.privateKey = privateKey

			publicKey, err := jwt.ParseRSAPublicKeyFromPEM(publicKeyBytes)
			if err != nil {
				return nil, fmt.Errorf("failed to parse RSA public key: %w", err)
			}
			manager.publicKey = publicKey
		} else {
			// ES256, ES384, ES512
			// Note: ECDSA keys would be handled similarly but with different parsing functions
			return nil, fmt.Errorf("ECDSA algorithms not yet implemented")
		}
	}

	return manager, nil
}

// GenerateToken generates a new JWT token for a user
func (m *JWTManager) GenerateToken(userID string, claims map[string]interface{}) (string, error) {
	now := time.Now()
	expiresAt := now.Add(m.expiration)

	// Create token with claims
	token := jwt.New(m.getSigningMethod())

	// Set standard claims
	token.Claims = jwt.MapClaims{
		"sub": userID,
		"iat": now.Unix(),
		"exp": expiresAt.Unix(),
		"jti": uuid.New().String(),
	}

	// Add issuer if configured
	if m.issuer != "" {
		token.Claims.(jwt.MapClaims)["iss"] = m.issuer
	}

	// Add audience if configured
	if len(m.audience) > 0 {
		token.Claims.(jwt.MapClaims)["aud"] = m.audience
	}

	// Add custom claims
	for key, value := range claims {
		token.Claims.(jwt.MapClaims)[key] = value
	}

	// Sign the token
	var tokenString string
	var err error

	if m.algorithm == "HS256" || m.algorithm == "HS384" || m.algorithm == "HS512" {
		tokenString, err = token.SignedString(m.secret)
	} else {
		tokenString, err = token.SignedString(m.privateKey)
	}

	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	// Store the token
	tokenID := token.Claims.(jwt.MapClaims)["jti"].(string)
	tokenObj := &Token{
		ID:        tokenID,
		UserID:    userID,
		Value:     tokenString,
		Type:      TokenTypeAccess,
		ExpiresAt: expiresAt,
		CreatedAt: now,
		Revoked:   false,
	}

	if err := m.tokenStore.StoreToken(tokenObj); err != nil {
		return "", fmt.Errorf("failed to store token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken validates a JWT token
func (m *JWTManager) ValidateToken(tokenString string) (jwt.MapClaims, error) {
	// Check if token is in the store and not revoked
	_, err := m.tokenStore.GetToken(tokenString)
	if err != nil {
		return nil, err
	}

	// Parse and validate the token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if token.Method != m.getSigningMethod() {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Return the appropriate key based on the algorithm
		if m.algorithm == "HS256" || m.algorithm == "HS384" || m.algorithm == "HS512" {
			return m.secret, nil
		}
		return m.publicKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid claims")
	}

	// Validate issuer if configured
	if m.issuer != "" {
		if !claims.VerifyIssuer(m.issuer, true) {
			return nil, errors.New("invalid issuer")
		}
	}

	// Validate audience if configured
	if len(m.audience) > 0 {
		validAudience := false
		for _, aud := range m.audience {
			if claims.VerifyAudience(aud, false) {
				validAudience = true
				break
			}
		}
		if !validAudience {
			return nil, errors.New("invalid audience")
		}
	}

	return claims, nil
}

// RevokeToken revokes a JWT token
func (m *JWTManager) RevokeToken(tokenString string) error {
	return m.tokenStore.RevokeToken(tokenString)
}

// RevokeAllUserTokens revokes all tokens for a user
func (m *JWTManager) RevokeAllUserTokens(userID string) error {
	return m.tokenStore.RevokeAllUserTokens(userID)
}

// getSigningMethod returns the appropriate signing method based on the algorithm
func (m *JWTManager) getSigningMethod() jwt.SigningMethod {
	switch m.algorithm {
	case "HS256":
		return jwt.SigningMethodHS256
	case "HS384":
		return jwt.SigningMethodHS384
	case "HS512":
		return jwt.SigningMethodHS512
	case "RS256":
		return jwt.SigningMethodRS256
	case "RS384":
		return jwt.SigningMethodRS384
	case "RS512":
		return jwt.SigningMethodRS512
	case "ES256":
		return jwt.SigningMethodES256
	case "ES384":
		return jwt.SigningMethodES384
	case "ES512":
		return jwt.SigningMethodES512
	default:
		return jwt.SigningMethodHS256
	}
}

// JWTConfig represents the configuration for JWT authentication
type JWTConfig struct {
	Secret            string
	PublicKeyPath     string
	PrivateKeyPath    string
	Algorithm         string
	Issuer            string
	Audience          []string
	ExpirationMinutes int
}
