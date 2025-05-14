package integration

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListTags(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("ListAllTags", func(t *testing.T) {
		// Make request
		resp, respBody := ts.MakeRequest(t, http.MethodGet, "/api/v1/tags", nil)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var responseData struct {
			Tags []struct {
				Name        string `json:"name"`
				Description string `json:"description,omitempty"`
				Comment     string `json:"comment,omitempty"`
				Definition  string `json:"definition,omitempty"`
				// Add Color and Category if they are part of TagContext and expected in response
				Color    string `json:"color,omitempty"`
				Category string `json:"category,omitempty"`
			} `json:"tags"`
		}
		ParseJSONResponse(t, respBody, &responseData)

		// Verify we got the expected tags
		require.Len(t, responseData.Tags, 3)

		// Check for expected tag names
		tagNames := make(map[string]bool)
		for _, tag := range responseData.Tags {
			tagNames[tag.Name] = true
		}
		assert.True(t, tagNames["test"])
		assert.True(t, tagNames["virtual"])
		assert.True(t, tagNames["physical"])
	})

	t.Run("ListTagsWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "ListTags")

		// Make request
		resp, _ := ts.MakeRequest(t, http.MethodGet, "/api/v1/tags", nil)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}

func TestCreateTag(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("CreateNewTag", func(t *testing.T) {
		// Make request
		reqBody := struct {
			Name       string `json:"name"`
			Comment    string `json:"comment,omitempty"`
			Definition string `json:"definition,omitempty"`
		}{
			Name:       "new-tag",
			Comment:    "A new test tag",
			Definition: "",
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags", reqBody)

		// Verify response
		require.Equal(t, http.StatusCreated, resp.StatusCode) // Changed to 201 Created

		var tag struct {
			Name        string `json:"name"`
			Description string `json:"description,omitempty"`
			Comment     string `json:"comment,omitempty"`
			Definition  string `json:"definition,omitempty"`
		}
		ParseJSONResponse(t, respBody, &tag)

		// Verify tag details
		assert.Equal(t, "new-tag", tag.Name)
		assert.Equal(t, "A new test tag", tag.Comment)

		// Verify the tag was actually created by listing tags
		listResp, listRespBody := ts.MakeRequest(t, http.MethodGet, "/api/v1/tags", nil)
		require.Equal(t, http.StatusOK, listResp.StatusCode)

		var listResponseData struct {
			Tags []struct {
				Name        string `json:"name"`
				Description string `json:"description,omitempty"`
				Comment     string `json:"comment,omitempty"`
				Definition  string `json:"definition,omitempty"`
				Color       string `json:"color,omitempty"`
				Category    string `json:"category,omitempty"`
			} `json:"tags"`
		}
		ParseJSONResponse(t, listRespBody, &listResponseData)

		// Verify we now have 4 tags (the 3 initial ones plus our new one)
		require.Len(t, listResponseData.Tags, 4)

		// Check for our new tag
		found := false
		for _, t := range listResponseData.Tags {
			if t.Name == "new-tag" {
				found = true
				break
			}
		}
		assert.True(t, found, "Newly created tag not found in tag list")
	})

	t.Run("CreateDuplicateTag", func(t *testing.T) {
		// Make request with existing tag name
		reqBody := struct {
			Name       string `json:"name"`
			Comment    string `json:"comment,omitempty"`
			Definition string `json:"definition,omitempty"`
		}{
			Name:    "test", // This tag already exists
			Comment: "Duplicate tag",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("CreateTagWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "CreateTag")

		// Make request
		reqBody := struct {
			Name       string `json:"name"`
			Comment    string `json:"comment,omitempty"`
			Definition string `json:"definition,omitempty"`
		}{
			Name:    "another-tag",
			Comment: "This should fail",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}

func TestApplyTagToMachine(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("ApplyTagToMachine", func(t *testing.T) {
		// Create a new tag first
		newTagReqBody := struct {
			Name       string `json:"name"`
			Comment    string `json:"comment,omitempty"`
			Definition string `json:"definition,omitempty"`
		}{
			Name:    "apply-test-tag",
			Comment: "Tag for testing apply",
		}
		createResp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags", newTagReqBody)
		require.Equal(t, http.StatusCreated, createResp.StatusCode) // Changed to 201 Created

		// Now apply the tag to a machine
		// Route is POST /machines/:id/tags/:tag
		machineID := "abc123"
		tagName := "apply-test-tag"
		url := "/api/v1/machines/" + machineID + "/tags/" + tagName
		// No request body needed for this endpoint as params are in path
		resp, respBody := ts.MakeRequest(t, http.MethodPost, url, nil)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode) // Handler returns 200 for successful apply

		var result map[string]string
		ParseJSONResponse(t, respBody, &result)
		assert.Contains(t, result["message"], "successfully")

		// Verify the tag was actually applied by getting machine details
		detailUrl := "/api/v1/machines/abc123" // GET request for details
		machineResp, machineRespBody := ts.MakeRequest(t, http.MethodGet, detailUrl, nil)
		require.Equal(t, http.StatusOK, machineResp.StatusCode)

		var machine struct {
			SystemID string   `json:"system_id"`
			Tags     []string `json:"tags"`
		}
		ParseJSONResponse(t, machineRespBody, &machine)

		// Check if our tag is in the machine's tags
		found := false
		for _, tag := range machine.Tags {
			if tag == "apply-test-tag" {
				found = true
				break
			}
		}
		assert.True(t, found, "Applied tag not found in machine tags")
	})

	t.Run("ApplyNonExistentTag", func(t *testing.T) {
		// Make request with non-existent tag
		machineID := "abc123"
		tagName := "nonexistent-tag"
		url := "/api/v1/machines/" + machineID + "/tags/" + tagName
		resp, _ := ts.MakeRequest(t, http.MethodPost, url, nil)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode) // Current behavior with generic mock error
	})

	t.Run("ApplyTagToNonExistentMachine", func(t *testing.T) {
		// Make request with non-existent machine
		machineID := "nonexistent"
		tagName := "test"
		url := "/api/v1/machines/" + machineID + "/tags/" + tagName
		resp, _ := ts.MakeRequest(t, http.MethodPost, url, nil)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode) // Current behavior with generic mock error
	})

	t.Run("ApplyTagWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "ApplyTagToMachine")

		// Make request
		machineID := "abc123"
		tagName := "test"
		url := "/api/v1/machines/" + machineID + "/tags/" + tagName
		resp, _ := ts.MakeRequest(t, http.MethodPost, url, nil)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode) // Current behavior with generic mock error

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}

func TestRemoveTagFromMachine(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("RemoveTagFromMachine", func(t *testing.T) {
		// First apply a tag to a machine to ensure it's there
		// applyReqBody := struct { // This variable is unused
		// 	TagName  string `json:"tag_name"`
		// 	SystemID string `json:"system_id"`
		// }{
		// 	TagName:  "test",
		// 	SystemID: "abc123",
		// }
		// Apply tag using the correct path: POST /api/v1/machines/:id/tags/:tag
		applyURL := "/api/v1/machines/abc123/tags/test"
		applyResp, _ := ts.MakeRequest(t, http.MethodPost, applyURL, nil) // No body needed for this apply route
		require.Equal(t, http.StatusOK, applyResp.StatusCode)

		// Now remove the tag
		// Route is DELETE /api/v1/machines/:id/tags/:tag
		removeMachineID := "abc123"
		removeTagName := "test"
		removeURL := "/api/v1/machines/" + removeMachineID + "/tags/" + removeTagName
		// No request body needed for DELETE
		resp, respBody := ts.MakeRequest(t, http.MethodDelete, removeURL, nil)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]string
		ParseJSONResponse(t, respBody, &result)
		assert.Contains(t, result["message"], "successfully")

		// Verify the tag was actually removed by getting machine details
		detailUrl := "/api/v1/machines/abc123" // GET request for details
		machineResp, machineRespBody := ts.MakeRequest(t, http.MethodGet, detailUrl, nil)
		require.Equal(t, http.StatusOK, machineResp.StatusCode)

		var machine struct {
			SystemID string   `json:"system_id"`
			Tags     []string `json:"tags"`
		}
		ParseJSONResponse(t, machineRespBody, &machine)

		// Check that our tag is not in the machine's tags
		for _, tag := range machine.Tags {
			assert.NotEqual(t, "test", tag, "Removed tag still found in machine tags")
		}
	})

	t.Run("RemoveNonExistentTag", func(t *testing.T) {
		// Make request with non-existent tag
		machineID := "abc123"
		tagName := "nonexistent-tag"
		url := "/api/v1/machines/" + machineID + "/tags/" + tagName
		resp, _ := ts.MakeRequest(t, http.MethodDelete, url, nil)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode) // Current behavior
	})

	t.Run("RemoveTagFromNonExistentMachine", func(t *testing.T) {
		// Make request with non-existent machine
		machineID := "nonexistent"
		tagName := "test"
		url := "/api/v1/machines/" + machineID + "/tags/" + tagName
		resp, _ := ts.MakeRequest(t, http.MethodDelete, url, nil)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode) // Current behavior
	})

	t.Run("RemoveTagWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "RemoveTagFromMachine")

		// Make request
		machineID := "abc123"
		tagName := "test"
		url := "/api/v1/machines/" + machineID + "/tags/" + tagName
		resp, _ := ts.MakeRequest(t, http.MethodDelete, url, nil)

		// Verify response
		// If RemoveTagFromMachine mock fails, service should return an error, mapped by handler.
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode) // Current behavior

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}
