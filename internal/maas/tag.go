package maas

import (
	"fmt"
	"strings"
	"time"

	"github.com/canonical/gomaasclient/client"
	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/maas/common"
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// tagClient implements the common.TagClient interface
type tagClient struct {
	client *client.Client
	logger *logrus.Logger
	retry  common.RetryFunc
}

// newTagClient creates a new tag client
func newTagClient(client *client.Client, logger *logrus.Logger, retry common.RetryFunc) common.TagClient {
	return &tagClient{
		client: client,
		logger: logger,
		retry:  retry,
	}
}

// ListTags retrieves all tags.
func (t *tagClient) ListTags() ([]models.Tag, error) {
	var entityTags []entity.Tag
	operation := func() error {
		var err error
		entityTags, err = t.client.Tags.Get()
		if err != nil {
			t.logger.Errorf("MAAS API error listing tags: %v", err)
			return fmt.Errorf("MAAS API error listing tags: %w", err)
		}
		return nil
	}

	err := t.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}

	modelTags := make([]models.Tag, len(entityTags))
	for i, et := range entityTags {
		var mt models.Tag
		mt.FromEntity(&et)
		modelTags[i] = mt
	}
	return modelTags, nil
}

// CreateTag creates a new tag.
func (t *tagClient) CreateTag(name, comment, definition string) (*models.Tag, error) {
	var entityTag *entity.Tag
	// gomaasclient Tags.Create takes *entity.TagParams
	tagParams := &entity.TagParams{
		Name:       name,
		Comment:    comment,
		Definition: definition,
		// KernelOpts: "", // if applicable - assuming TagParams has these fields
	}
	operation := func() error {
		var err error
		entityTag, err = t.client.Tags.Create(tagParams)
		if err != nil {
			t.logger.Errorf("MAAS API error creating tag '%s': %v", name, err)
			return fmt.Errorf("MAAS API error creating tag '%s': %w", name, err)
		}
		return nil
	}

	err := t.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}

	var modelTag models.Tag
	modelTag.FromEntity(entityTag)
	return &modelTag, nil
}

// ApplyTagToMachine applies a tag to a machine.
func (t *tagClient) ApplyTagToMachine(tagName, systemID string) error {
	operation := func() error {
		entityMachine, err := t.client.Machine.Get(systemID)
		if err != nil {
			t.logger.Errorf("MAAS API error getting machine %s for applying tag: %v", systemID, err)
			return fmt.Errorf("MAAS API error getting machine %s for applying tag: %w", systemID, err)
		}

		currentTags := entityMachine.TagNames
		tagExists := false
		for _, tag := range currentTags {
			if tag == tagName {
				tagExists = true
				break
			}
		}

		if !tagExists {
			newTagsList := append(currentTags, tagName)
			opArgs := make(map[string]interface{})
			opArgs["tags"] = strings.Join(newTagsList, ",")

			// MachineParams can be nil if not updating other machine attributes
			_, err = t.client.Machine.Update(systemID, nil, opArgs)
			if err != nil {
				t.logger.Errorf("MAAS API error applying tag '%s' to machine '%s' via Update: %v", tagName, systemID, err)
				return fmt.Errorf("MAAS API error applying tag '%s' to machine '%s' via Update: %w", tagName, systemID, err)
			}
		}
		return nil
	}
	return t.retry(operation, 3, 2*time.Second)
}

// RemoveTagFromMachine removes a tag from a machine.
func (t *tagClient) RemoveTagFromMachine(tagName, systemID string) error {
	operation := func() error {
		entityMachine, err := t.client.Machine.Get(systemID)
		if err != nil {
			t.logger.Errorf("MAAS API error getting machine %s for removing tag: %v", systemID, err)
			return fmt.Errorf("MAAS API error getting machine %s for removing tag: %w", systemID, err)
		}

		currentTags := entityMachine.TagNames
		newTagsList := make([]string, 0, len(currentTags))
		tagFound := false
		for _, t := range currentTags {
			if t == tagName {
				tagFound = true
			} else {
				newTagsList = append(newTagsList, t)
			}
		}

		if tagFound { // Only update if the tag was actually found and removed from the list
			opArgs := make(map[string]interface{})
			if len(newTagsList) > 0 {
				opArgs["tags"] = strings.Join(newTagsList, ",")
			} else {
				opArgs["tags"] = "" // Send empty string to remove all tags if it was the last one
			}

			// MachineParams can be nil if not updating other machine attributes
			_, err = t.client.Machine.Update(systemID, nil, opArgs)
			if err != nil {
				t.logger.Errorf("MAAS API error removing tag '%s' from machine '%s' via Update: %v", tagName, systemID, err)
				return fmt.Errorf("MAAS API error removing tag '%s' from machine '%s' via Update: %w", tagName, systemID, err)
			}
		}
		return nil
	}
	return t.retry(operation, 3, 2*time.Second)
}
