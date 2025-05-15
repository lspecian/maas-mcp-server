package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"
)

// JSONRPCRequest represents a JSON-RPC request
type JSONRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
	ID      string          `json:"id"`
}

// JSONRPCResponse represents a JSON-RPC response
type JSONRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *JSONRPCError   `json:"error,omitempty"`
	ID      string          `json:"id"`
}

// JSONRPCError represents a JSON-RPC error
type JSONRPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

func main() {
	// Start the MCP server in stdio mode
	cmd := exec.Command("../../build.sh", "run-mcp-stdio")

	// Get stdin and stdout pipes
	stdin, err := cmd.StdinPipe()
	if err != nil {
		fmt.Printf("Error getting stdin pipe: %v\n", err)
		os.Exit(1)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Printf("Error getting stdout pipe: %v\n", err)
		os.Exit(1)
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		fmt.Printf("Error starting command: %v\n", err)
		os.Exit(1)
	}

	// Create a reader for stdout
	reader := bufio.NewReader(stdout)

	// Wait for the server to start and skip build output
	fmt.Println("Waiting for server to start...")
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			fmt.Printf("Error reading from stdout: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Server: %s", line)

		// Check if this is the "MCP server ready" message
		if strings.TrimSpace(line) == "MCP server ready" {
			fmt.Println("Server is ready!")
			break
		}
	}

	// Send a discovery request
	fmt.Println("Sending discovery request...")
	discoveryRequest := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "discover",
		Params:  json.RawMessage("{}"),
		ID:      "1",
	}

	// Marshal the request to JSON
	requestJSON, err := json.Marshal(discoveryRequest)
	if err != nil {
		fmt.Printf("Error marshaling request: %v\n", err)
		os.Exit(1)
	}

	// Send the request
	fmt.Printf("Sending: %s\n", string(requestJSON))
	_, err = io.WriteString(stdin, string(requestJSON)+"\n")
	if err != nil {
		fmt.Printf("Error writing to stdin: %v\n", err)
		os.Exit(1)
	}

	// Wait for the response
	fmt.Println("Waiting for response...")
	responseStr, err := reader.ReadString('\n')
	if err != nil {
		fmt.Printf("Error reading from stdout: %v\n", err)
		os.Exit(1)
	}

	// Print the response
	fmt.Printf("Response: %s", responseStr)

	// Parse the response
	var response JSONRPCResponse
	if err := json.Unmarshal([]byte(responseStr), &response); err != nil {
		fmt.Printf("Error parsing response: %v\n", err)
		os.Exit(1)
	}

	// Check if there's an error
	if response.Error != nil {
		fmt.Printf("Error: %s\n", response.Error.Message)
		os.Exit(1)
	}

	// Print the result
	fmt.Println("Discovery successful!")

	// Send a list machines request
	fmt.Println("\nSending list machines request...")
	listMachinesRequest := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "maas_list_machines",
		Params:  json.RawMessage("{}"),
		ID:      "2",
	}

	// Marshal the request to JSON
	requestJSON, err = json.Marshal(listMachinesRequest)
	if err != nil {
		fmt.Printf("Error marshaling request: %v\n", err)
		os.Exit(1)
	}

	// Send the request
	fmt.Printf("Sending: %s\n", string(requestJSON))
	_, err = io.WriteString(stdin, string(requestJSON)+"\n")
	if err != nil {
		fmt.Printf("Error writing to stdin: %v\n", err)
		os.Exit(1)
	}

	// Wait for the response
	fmt.Println("Waiting for response...")
	responseStr, err = reader.ReadString('\n')
	if err != nil {
		fmt.Printf("Error reading from stdout: %v\n", err)
		os.Exit(1)
	}

	// Print the response
	fmt.Printf("Response: %s", responseStr)

	// Parse the response
	if err := json.Unmarshal([]byte(responseStr), &response); err != nil {
		fmt.Printf("Error parsing response: %v\n", err)
		os.Exit(1)
	}

	// Check if there's an error
	if response.Error != nil {
		fmt.Printf("Error: %s\n", response.Error.Message)
		os.Exit(1)
	}

	// Print the result
	fmt.Println("List machines successful!")

	// Wait a bit before exiting
	time.Sleep(1 * time.Second)

	// Kill the server
	if err := cmd.Process.Kill(); err != nil {
		fmt.Printf("Error killing process: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Test completed successfully!")
}
