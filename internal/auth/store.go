package auth

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"
)

// User represents an authenticated user
type User struct {
	Username string    `json:"username"`
	APIKey   string    `json:"api_key"`
	Password string    `json:"password,omitempty"` // Only used for basic auth
	Role     string    `json:"role"`
	Created  time.Time `json:"created"`
	LastUsed time.Time `json:"last_used,omitempty"`
}

// Store defines the interface for user storage
type Store interface {
	// GetUserByAPIKey retrieves a user by their API key
	GetUserByAPIKey(apiKey string) (*User, error)

	// GetUserByCredentials retrieves a user by username and password
	GetUserByCredentials(username, password string) (*User, error)

	// AddUser adds a new user to the store
	AddUser(user *User) error

	// UpdateUser updates an existing user
	UpdateUser(user *User) error

	// DeleteUser removes a user from the store
	DeleteUser(username string) error

	// ListUsers returns all users in the store
	ListUsers() ([]*User, error)
}

// MemoryStore implements Store using an in-memory map
type MemoryStore struct {
	users map[string]*User  // username -> User
	keys  map[string]string // apiKey -> username
	mu    sync.RWMutex
}

// NewMemoryStore creates a new in-memory user store
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		users: make(map[string]*User),
		keys:  make(map[string]string),
	}
}

// GetUserByAPIKey retrieves a user by their API key
func (s *MemoryStore) GetUserByAPIKey(apiKey string) (*User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	username, exists := s.keys[apiKey]
	if !exists {
		return nil, fmt.Errorf("user not found for API key")
	}

	user, exists := s.users[username]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}

	// Create a copy to avoid race conditions
	userCopy := *user
	return &userCopy, nil
}

// GetUserByCredentials retrieves a user by username and password
func (s *MemoryStore) GetUserByCredentials(username, password string) (*User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, exists := s.users[username]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}

	if user.Password != password {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Create a copy to avoid race conditions
	userCopy := *user
	return &userCopy, nil
}

// AddUser adds a new user to the store
func (s *MemoryStore) AddUser(user *User) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.users[user.Username]; exists {
		return fmt.Errorf("user already exists")
	}

	if user.APIKey != "" {
		if _, exists := s.keys[user.APIKey]; exists {
			return fmt.Errorf("API key already in use")
		}
		s.keys[user.APIKey] = user.Username
	}

	// Store a copy to avoid race conditions
	userCopy := *user
	s.users[user.Username] = &userCopy

	return nil
}

// UpdateUser updates an existing user
func (s *MemoryStore) UpdateUser(user *User) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	existingUser, exists := s.users[user.Username]
	if !exists {
		return fmt.Errorf("user not found")
	}

	// Remove old API key mapping if it changed
	if existingUser.APIKey != user.APIKey && existingUser.APIKey != "" {
		delete(s.keys, existingUser.APIKey)
	}

	// Add new API key mapping
	if user.APIKey != "" {
		if existingUsername, exists := s.keys[user.APIKey]; exists && existingUsername != user.Username {
			return fmt.Errorf("API key already in use")
		}
		s.keys[user.APIKey] = user.Username
	}

	// Store a copy to avoid race conditions
	userCopy := *user
	s.users[user.Username] = &userCopy

	return nil
}

// DeleteUser removes a user from the store
func (s *MemoryStore) DeleteUser(username string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[username]
	if !exists {
		return fmt.Errorf("user not found")
	}

	if user.APIKey != "" {
		delete(s.keys, user.APIKey)
	}

	delete(s.users, username)

	return nil
}

// ListUsers returns all users in the store
func (s *MemoryStore) ListUsers() ([]*User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	users := make([]*User, 0, len(s.users))
	for _, user := range s.users {
		// Create a copy to avoid race conditions
		userCopy := *user
		users = append(users, &userCopy)
	}

	return users, nil
}

// FileStore implements Store using a JSON file
type FileStore struct {
	filePath string
	memory   *MemoryStore
	mu       sync.RWMutex
}

// NewFileStore creates a new file-based user store
func NewFileStore(filePath string) (*FileStore, error) {
	store := &FileStore{
		filePath: filePath,
		memory:   NewMemoryStore(),
	}

	// Load existing users from file
	if err := store.load(); err != nil {
		// If file doesn't exist, that's fine - we'll create it when saving
		if !os.IsNotExist(err) {
			return nil, fmt.Errorf("failed to load users from file: %w", err)
		}
	}

	return store, nil
}

// load reads users from the file
func (s *FileStore) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	file, err := os.Open(s.filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	var users []*User
	if err := json.NewDecoder(file).Decode(&users); err != nil {
		return fmt.Errorf("failed to decode users: %w", err)
	}

	// Reset memory store
	s.memory = NewMemoryStore()

	// Add users to memory store
	for _, user := range users {
		if err := s.memory.AddUser(user); err != nil {
			return fmt.Errorf("failed to add user to memory store: %w", err)
		}
	}

	return nil
}

// save writes users to the file
func (s *FileStore) save() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	users, err := s.memory.ListUsers()
	if err != nil {
		return fmt.Errorf("failed to list users: %w", err)
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

	if err := json.NewEncoder(file).Encode(users); err != nil {
		return fmt.Errorf("failed to encode users: %w", err)
	}

	return nil
}

// GetUserByAPIKey retrieves a user by their API key
func (s *FileStore) GetUserByAPIKey(apiKey string) (*User, error) {
	return s.memory.GetUserByAPIKey(apiKey)
}

// GetUserByCredentials retrieves a user by username and password
func (s *FileStore) GetUserByCredentials(username, password string) (*User, error) {
	return s.memory.GetUserByCredentials(username, password)
}

// AddUser adds a new user to the store
func (s *FileStore) AddUser(user *User) error {
	if err := s.memory.AddUser(user); err != nil {
		return err
	}

	return s.save()
}

// UpdateUser updates an existing user
func (s *FileStore) UpdateUser(user *User) error {
	if err := s.memory.UpdateUser(user); err != nil {
		return err
	}

	return s.save()
}

// DeleteUser removes a user from the store
func (s *FileStore) DeleteUser(username string) error {
	if err := s.memory.DeleteUser(username); err != nil {
		return err
	}

	return s.save()
}

// ListUsers returns all users in the store
func (s *FileStore) ListUsers() ([]*User, error) {
	return s.memory.ListUsers()
}
