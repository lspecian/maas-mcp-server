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

		var tags []struct {
			Name        string `json:"name"`
			Description string `json:"description,omitempty"`
			Comment     string `json:"comment,omitempty"`
			Definition  string `json:"definition,omitempty"`
		}
		ParseJSONResponse(t, respBody, &tags)

		// Verify we got the expected tags
		require.Len(t, tags, 3)

		// Check for expected tag names
		tagNames := make(map[string]bool)
		for _, tag := range tags {
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
		require.Equal(t, http.StatusOK, resp.StatusCode)

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

		var tags []struct {
			Name        string `json:"name"`
			Description string `json:"description,omitempty"`
			Comment     string `json:"comment,omitempty"`
			Definition  string `json:"definition,omitempty"`
		}
		ParseJSONResponse(t, listRespBody, &tags)

		// Verify we now have 4 tags (the 3 initial ones plus our new one)
		require.Len(t, tags, 4)

		// Check for our new tag
		found := false
		for _, t := range tags {
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
		require.Equal(t, http.StatusOK, createResp.StatusCode)

		// Now apply the tag to a machine
		reqBody := struct {
			TagName  string `json:"tag_name"`
			SystemID string `json:"system_id"`
		}{
			TagName:  "apply-test-tag",
			SystemID: "abc123",
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags/apply", reqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]string
		ParseJSONResponse(t, respBody, &result)
		assert.Contains(t, result["message"], "successfully")

		// Verify the tag was actually applied by getting machine details
		machineResp, machineRespBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/details",
			map[string]string{"system_id": "abc123"})
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
		reqBody := struct {
			TagName  string `json:"tag_name"`
			SystemID string `json:"system_id"`
		}{
			TagName:  "nonexistent-tag",
			SystemID: "abc123",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags/apply", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("ApplyTagToNonExistentMachine", func(t *testing.T) {
		// Make request with non-existent machine
		reqBody := struct {
			TagName  string `json:"tag_name"`
			SystemID string `json:"system_id"`
		}{
			TagName:  "test",
			SystemID: "nonexistent",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags/apply", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("ApplyTagWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "ApplyTagToMachine")

		// Make request
		reqBody := struct {
			TagName  string `json:"tag_name"`
			SystemID string `json:"system_id"`
		}{
			TagName:  "test",
			SystemID: "abc123",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags/apply", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

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
		applyReqBody := struct {
			TagName  string `json:"tag_name"`
			SystemID string `json:"system_id"`
		}{
			TagName:  "test",
			SystemID: "abc123",
		}
		applyResp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags/apply", applyReqBody)
		require.Equal(t, http.StatusOK, applyResp.StatusCode)

		// Now remove the tag
		reqBody := struct {
			TagName  string `json:"tag_name"`
			SystemID string `json:"system_id"`
		}{
			TagName:  "test",
			SystemID: "abc123",
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags/remove", reqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]string
		ParseJSONResponse(t, respBody, &result)
		assert.Contains(t, result["message"], "successfully")

		// Verify the tag was actually removed by getting machine details
		machineResp, machineRespBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/details",
			map[string]string{"system_id": "abc123"})
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
		reqBody := struct {
			TagName  string `json:"tag_name"`
			SystemID string `json:"system_id"`
		}{
			TagName:  "nonexistent-tag",
			SystemID: "abc123",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags/remove", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("RemoveTagFromNonExistentMachine", func(t *testing.T) {
		// Make request with non-existent machine
		reqBody := struct {
			TagName  string `json:"tag_name"`
			SystemID string `json:"system_id"`
		}{
			TagName:  "test",
			SystemID: "nonexistent",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags/remove", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("RemoveTagWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "RemoveTagFromMachine")

		// Make request
		reqBody := struct {
			TagName  string `json:"tag_name"`
			SystemID string `json:"system_id"`
		}{
			TagName:  "test",
			SystemID: "abc123",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/tags/remove", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}
