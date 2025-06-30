#!/bin/bash
# worktree-create.sh - Create new worktree with proper setup

set -euo pipefail

source scripts/worktree-utils.sh

# Parse arguments
TYPE="${1:-feature}"
NAME="${2:-}"
BASE_BRANCH="${3:-main}"

if [[ -z "$NAME" ]]; then
    print_error "Usage: $0 <type> <name> [base-branch]"
    echo "Types: feature, bugfix, hotfix, release"
    exit 1
fi

# Load configuration
CONFIG=$(load_config)
PREFIX=$(echo "$CONFIG" | jq -r ".worktrees.types.$TYPE.prefix // \"\"")

if [[ -z "$PREFIX" ]]; then
    print_error "Unknown worktree type: $TYPE"
    exit 1
fi

# Create branch name
BRANCH_NAME="${PREFIX}${NAME}"
WORKTREE_PATH="$WORKTREES_DIR/$TYPE/$NAME"

# Check if worktree already exists
if git worktree list | grep -q "$WORKTREE_PATH"; then
    print_error "Worktree already exists: $WORKTREE_PATH"
    exit 1
fi

# Create worktree
print_status "Creating worktree: $BRANCH_NAME"
git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_BRANCH"

# Run post-creation hooks
print_status "Running post-creation hooks..."
cd "$WORKTREE_PATH"

# Run configured hooks
HOOKS=$(echo "$CONFIG" | jq -r '.hooks.postWorktree[]')
while IFS= read -r hook; do
    if [[ -n "$hook" ]]; then
        print_info "Running: $hook"
        eval "$hook"
    fi
done <<< "$HOOKS"

# Copy environment files
if [[ -f "../../.env.local" ]]; then
    cp "../../.env.local" ".env.local"
    print_status "Copied .env.local"
fi

# Create worktree metadata
cat > .worktree-meta.json << JSON
{
  "type": "$TYPE",
  "name": "$NAME",
  "branch": "$BRANCH_NAME",
  "baseBranch": "$BASE_BRANCH",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "lastSync": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

print_status "Worktree created successfully!"
print_info "Switch to it with: cd $WORKTREE_PATH"
print_info "Or use: ./scripts/worktree-switch.sh $NAME"
