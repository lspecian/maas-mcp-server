# TaskMaster AI Integration for FastMCP Migration

This document outlines how to use TaskMaster AI to manage the migration from Express.js to FastMCP.

## Setup TaskMaster AI

1. Initialize TaskMaster in the project:

```bash
# Install TaskMaster AI
npx -y --package=task-master-ai task-master-ai init

# Verify installation
npx task-master-ai --version
```

2. Generate tasks from the PRD:

```bash
# Parse the PRD to generate initial tasks
npx task-master-ai parse-prd --input=scripts/prd-refactor.txt
```

## Using TaskMaster AI for Migration Management

### 1. View Generated Tasks

```bash
# List all tasks
npx task-master-ai list

# Show the next task to work on
npx task-master-ai next
```

### 2. Analyze Task Complexity

```bash
# Analyze task complexity
npx task-master-ai analyze-complexity --research

# View complexity report
npx task-master-ai complexity-report
```

### 3. Expand Complex Tasks

```bash
# Expand a complex task into subtasks
npx task-master-ai expand --id=<task_id> --research
```

### 4. Track Progress

```bash
# Mark a task as in-progress
npx task-master-ai set-status --id=<task_id> --status=in-progress

# Mark a task as completed
npx task-master-ai set-status --id=<task_id> --status=done
```

### 5. Update Tasks with Implementation Details

```bash
# Update a task with implementation details
npx task-master-ai update-task --id=<task_id> --prompt="Implemented using FastMCP's built-in hooks for audit logging instead of custom middleware."
```

## Migration Workflow with TaskMaster AI

1. **Initial Planning**:
   - Parse the PRD to generate tasks
   - Analyze task complexity
   - Expand complex tasks into subtasks

2. **Implementation Tracking**:
   - Use `next` to determine which task to work on
   - Set task status to "in-progress" when starting
   - Update tasks with implementation details
   - Set task status to "done" when completed

3. **Handling Changes**:
   - If implementation differs from plan, update affected tasks
   - If new tasks are discovered, add them with dependencies

4. **Progress Monitoring**:
   - Regularly list tasks to see overall progress
   - Use complexity report to identify challenging areas

## Example TaskMaster AI Workflow

```bash
# Initialize TaskMaster
npx -y --package=task-master-ai task-master-ai init

# Parse the PRD
npx task-master-ai parse-prd --input=scripts/prd-refactor.txt

# Analyze complexity
npx task-master-ai analyze-complexity --research

# Get the next task
npx task-master-ai next

# Mark task as in-progress
npx task-master-ai set-status --id=1 --status=in-progress

# Expand task into subtasks
npx task-master-ai expand --id=1 --research

# Update subtask with implementation details
npx task-master-ai update-subtask --id=1.1 --prompt="Implemented basic FastMCP server with health endpoint."

# Mark subtask as done
npx task-master-ai set-status --id=1.1 --status=done

# Continue with next subtask
npx task-master-ai next
```

## Integration with Development Workflow

- Create a branch for each task or subtask
- Include task ID in commit messages
- Reference task ID in pull requests
- Update task status when merging pull requests

This approach ensures that the migration is well-organized, tracked, and manageable, with clear visibility into progress and remaining work.