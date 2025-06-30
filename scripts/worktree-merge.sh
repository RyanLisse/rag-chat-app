#!/bin/bash
# worktree-merge.sh - Automated merge workflow for worktrees

set -euo pipefail

source scripts/worktree-utils.sh

NAME="${1:-}"
TARGET_BRANCH="${2:-main}"
DELETE_AFTER="${3:-yes}"

if [[ -z "$NAME" ]]; then
    print_error "Usage: $0 <worktree-name> [target-branch] [delete-after:yes|no]"
    exit 1
fi

# Find worktree
WORKTREE_PATH=$(find_worktree "$NAME")

if [[ -z "$WORKTREE_PATH" ]]; then
    print_error "Worktree not found: $NAME"
    exit 1
fi

# Load metadata
META_FILE="$WORKTREE_PATH/.worktree-meta.json"
if [[ ! -f "$META_FILE" ]]; then
    print_error "Worktree metadata not found"
    exit 1
fi

BRANCH_NAME=$(jq -r '.branch' "$META_FILE")
WORKTREE_TYPE=$(jq -r '.type' "$META_FILE")

# Switch to worktree
cd "$WORKTREE_PATH"

# Ensure worktree is clean
if [[ -n "$(git status --porcelain)" ]]; then
    print_error "Worktree has uncommitted changes"
    git status --short
    exit 1
fi

# Run pre-merge hooks
CONFIG=$(load_config)
HOOKS=$(echo "$CONFIG" | jq -r '.hooks.preMerge[]')
while IFS= read -r hook; do
    if [[ -n "$hook" ]]; then
        print_info "Running pre-merge hook: $hook"
        if ! eval "$hook"; then
            print_error "Pre-merge hook failed: $hook"
            exit 1
        fi
    fi
done <<< "$HOOKS"

# Update from target branch
print_status "Updating from $TARGET_BRANCH..."
git fetch origin "$TARGET_BRANCH"
if ! git merge "origin/$TARGET_BRANCH"; then
    print_error "Merge conflicts detected. Please resolve manually."
    exit 1
fi

# Switch to main worktree
cd ../..

# Merge the branch
print_status "Merging $BRANCH_NAME into $TARGET_BRANCH..."
git checkout "$TARGET_BRANCH"
git pull origin "$TARGET_BRANCH"

if git merge --no-ff "$BRANCH_NAME" -m "Merge $BRANCH_NAME into $TARGET_BRANCH"; then
    print_status "Merge successful!"
    
    # Push changes
    print_status "Pushing changes..."
    git push origin "$TARGET_BRANCH"
    
    # Delete branch and worktree if requested
    if [[ "$DELETE_AFTER" == "yes" ]]; then
        print_status "Cleaning up..."
        git branch -d "$BRANCH_NAME"
        git push origin --delete "$BRANCH_NAME"
        git worktree remove "$WORKTREE_PATH"
        print_status "Worktree and branch deleted"
    fi
    
    # Run post-merge hooks
    HOOKS=$(echo "$CONFIG" | jq -r '.hooks.postMerge[]')
    while IFS= read -r hook; do
        if [[ -n "$hook" ]]; then
            print_info "Running post-merge hook: $hook"
            eval "$hook"
        fi
    done <<< "$HOOKS"
else
    print_error "Merge failed. Please resolve conflicts manually."
    exit 1
fi

print_status "Merge workflow completed!"
