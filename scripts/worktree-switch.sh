#!/bin/bash
# worktree-switch.sh - Switch between worktrees easily

set -euo pipefail

source scripts/worktree-utils.sh

NAME="${1:-}"

if [[ -z "$NAME" ]]; then
    # List available worktrees
    print_info "Available worktrees:"
    git worktree list | while read -r line; do
        path=$(echo "$line" | awk '{print $1}')
        branch=$(echo "$line" | awk '{print $3}' | tr -d '[]')
        if [[ "$path" == *"$WORKTREES_DIR"* ]]; then
            name=$(basename "$path")
            type=$(basename "$(dirname "$path")")
            echo "  - $name ($type) → $branch"
        fi
    done
    exit 0
fi

# Find worktree
WORKTREE_PATH=$(find_worktree "$NAME")

if [[ -z "$WORKTREE_PATH" ]]; then
    print_error "Worktree not found: $NAME"
    exit 1
fi

# Switch to worktree
print_status "Switching to worktree: $NAME"
cd "$WORKTREE_PATH"
exec $SHELL
