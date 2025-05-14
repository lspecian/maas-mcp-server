# Makefile for MAAS MCP Server

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=mcp-server
BINARY_UNIX=$(BINARY_NAME)_unix
MAIN_PATH=./cmd/server

# Linting
GOLINT=golangci-lint

.PHONY: all build clean test coverage lint fmt mod-tidy mod-download help

all: lint test build

build:
	$(GOBUILD) -o $(BINARY_NAME) -v $(MAIN_PATH)

clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)

test:
	$(GOTEST) -v ./...

coverage:
	$(GOTEST) -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out

lint:
	$(GOLINT) run ./...

fmt:
	$(GOCMD) fmt ./...

mod-tidy:
	$(GOMOD) tidy

mod-download:
	$(GOMOD) download

run:
	$(GOBUILD) -o $(BINARY_NAME) -v $(MAIN_PATH)
	./$(BINARY_NAME)

# Cross compilation
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) -o $(BINARY_UNIX) -v $(MAIN_PATH)

# Install development tools
install-tools:
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(shell go env GOPATH)/bin v1.55.2

help:
	@echo "Make commands:"
	@echo "  all          - Run lint, test, and build"
	@echo "  build        - Build the binary"
	@echo "  clean        - Clean build files"
	@echo "  test         - Run tests"
	@echo "  coverage     - Generate test coverage report"
	@echo "  lint         - Run linter"
	@echo "  fmt          - Format code"
	@echo "  mod-tidy     - Tidy Go modules"
	@echo "  mod-download - Download Go modules"
	@echo "  run          - Build and run the server"
	@echo "  build-linux  - Cross-compile for Linux"
	@echo "  install-tools - Install development tools"