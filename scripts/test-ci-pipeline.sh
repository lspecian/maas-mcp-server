#!/bin/bash
# Script to test the CI pipeline by creating branches with passing and failing tests

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing CI Pipeline${NC}"
echo "This script will create two branches to test the CI pipeline:"
echo "1. A branch with passing tests"
echo "2. A branch with failing tests"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed${NC}"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: There are uncommitted changes. Please commit or stash them before running this script.${NC}"
    exit 1
fi

# Get the current branch
current_branch=$(git branch --show-current)
echo "Current branch: $current_branch"

# Create a branch with passing tests
echo -e "\n${GREEN}Creating branch with passing tests${NC}"
passing_branch="test-ci-passing-$(date +%Y%m%d%H%M%S)"
git checkout -b $passing_branch

# Create a simple passing test
echo -e "\n${GREEN}Creating a passing test${NC}"
mkdir -p test/ci
cat > test/ci/passing_test.go << EOL
package ci

import (
	"testing"
)

func TestPassingTest(t *testing.T) {
	// This test should pass
	if 1+1 != 2 {
		t.Errorf("1+1 = %d; want 2", 1+1)
	}
}
EOL

# Commit the passing test
git add test/ci/passing_test.go
git commit -m "Add passing test for CI pipeline testing"

# Push the branch with passing tests
echo -e "\n${GREEN}Pushing branch with passing tests${NC}"
git push -u origin $passing_branch

# Create a branch with failing tests
echo -e "\n${GREEN}Creating branch with failing tests${NC}"
failing_branch="test-ci-failing-$(date +%Y%m%d%H%M%S)"
git checkout -b $failing_branch $passing_branch

# Create a simple failing test
echo -e "\n${GREEN}Creating a failing test${NC}"
cat > test/ci/failing_test.go << EOL
package ci

import (
	"testing"
)

func TestFailingTest(t *testing.T) {
	// This test should fail
	if 1+1 != 3 {
		t.Errorf("1+1 = %d; want 3", 1+1)
	}
}
EOL

# Commit the failing test
git add test/ci/failing_test.go
git commit -m "Add failing test for CI pipeline testing"

# Push the branch with failing tests
echo -e "\n${GREEN}Pushing branch with failing tests${NC}"
git push -u origin $failing_branch

# Return to the original branch
git checkout $current_branch

echo -e "\n${GREEN}CI Pipeline Test Setup Complete${NC}"
echo "Created branches:"
echo "- $passing_branch (should pass CI)"
echo "- $failing_branch (should fail CI)"
echo ""
echo "Next steps:"
echo "1. Create a PR from the $passing_branch branch to verify that the CI pipeline passes"
echo "2. Create a PR from the $failing_branch branch to verify that the CI pipeline fails"
echo "3. Check the CI pipeline results in GitHub Actions"