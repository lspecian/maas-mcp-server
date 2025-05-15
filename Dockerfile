# Use a multi-stage build for a smaller final image
FROM golang:1.22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy go.mod and go.sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the MCP server
RUN go build -o mcp-server-clean pkg/mcp/cmd/main.go

# Create the final image
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Set working directory
WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/mcp-server-clean /app/mcp-server-clean

# Copy config example (will be overridden by volume mount)
COPY config/config.yaml.example /app/config/config.yaml

# Expose the MCP server port
EXPOSE 8082

# Set environment variables
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8082
ENV LOG_LEVEL=info
ENV AUTH_ENABLED=false

# Run the MCP server
ENTRYPOINT ["/app/mcp-server-clean"]
CMD ["stdio"]