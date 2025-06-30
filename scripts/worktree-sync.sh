#!/bin/bash
# worktree-sync.sh - Sync files between main and worktrees

set -euo pipefail

source scripts/worktree-utils.sh

MODE="${1:-all}"
WORKTREE="${2:-}"

# Load configuration
CONFIG=$(load_config)

# Function to sync a single worktree
sync_worktree() {
    local worktree_path="$1"
    local worktree_name=$(basename "$worktree_path")
    
    print_status "Syncing worktree: $worktree_name"
    
    # Sync files
    FILES=$(echo "$CONFIG" | jq -r '.sync.files[]')
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            cp "$file" "$worktree_path/$file"
            print_info "  Synced: $file"
        fi
    done <<< "$FILES"
    
    # Sync directories
    DIRS=$(echo "$CONFIG" | jq -r '.sync.directories[]')
    while IFS= read -r dir; do
        if [[ -d "$dir" ]]; then
            rsync -a --delete "$dir/" "$worktree_path/$dir/"
            print_info "  Synced: $dir/"
        fi
    done <<< "$DIRS"
    
    # Update metadata
    if [[ -f "$worktree_path/.worktree-meta.json" ]]; then
        jq ".lastSync = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$worktree_path/.worktree-meta.json" > tmp.json
        mv tmp.json "$worktree_path/.worktree-meta.json"
    fi
}

# Sync based on mode
case "$MODE" in
    all)
        # Sync all worktrees
        git worktree list | while read -r line; do
            path=$(echo "$line" | awk '{print $1}')
            if [[ "$path" == *"$WORKTREES_DIR"* ]] && [[ "$path" != "$(pwd)" ]]; then
                sync_worktree "$path"
            fi
        done
        ;;
    single)
        if [[ -z "$WORKTREE" ]]; then
            print_error "Worktree name required for single mode"
            exit 1
        fi
        WORKTREE_PATH=$(find_worktree "$WORKTREE")
        if [[ -n "$WORKTREE_PATH" ]]; then
            sync_worktree "$WORKTREE_PATH"
        else
            print_error "Worktree not found: $WORKTREE"
            exit 1
        fi
        ;;
    *)
        print_error "Unknown mode: $MODE"
        echo "Usage: $0 [all|single] [worktree-name]"
        exit 1
        ;;
esac

print_status "Sync completed!"
