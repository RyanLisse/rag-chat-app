#!/bin/bash
# worktree-cleanup.sh - Clean up old and unused worktrees

set -euo pipefail

source scripts/worktree-utils.sh

MODE="${1:-check}"
FORCE="${2:-no}"

# Load configuration
CONFIG=$(load_config)

# Function to calculate age in days
get_age_days() {
    local created="$1"
    local created_ts=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$created" +%s 2>/dev/null || date -d "$created" +%s)
    local now_ts=$(date +%s)
    echo $(( (now_ts - created_ts) / 86400 ))
}

# Function to check if branch exists on remote
branch_exists_remote() {
    local branch="$1"
    git ls-remote --heads origin "$branch" | grep -q "$branch"
}

# Collect worktrees to clean
TO_CLEAN=()

print_info "Checking worktrees for cleanup..."

git worktree list | while read -r line; do
    path=$(echo "$line" | awk '{print $1}')
    branch=$(echo "$line" | awk '{print $3}' | tr -d '[]')
    
    if [[ "$path" == *"$WORKTREES_DIR"* ]]; then
        # Check metadata
        META_FILE="$path/.worktree-meta.json"
        if [[ -f "$META_FILE" ]]; then
            type=$(jq -r '.type' "$META_FILE")
            created=$(jq -r '.created' "$META_FILE")
            age=$(get_age_days "$created")
            max_age=$(echo "$CONFIG" | jq -r ".worktrees.types.$type.maxAge // 30")
            auto_delete=$(echo "$CONFIG" | jq -r ".worktrees.types.$type.autoDelete // true")
            
            # Check various cleanup conditions
            should_clean=false
            reason=""
            
            # Age check
            if [[ $age -gt $max_age ]]; then
                should_clean=true
                reason="older than $max_age days (age: $age days)"
            fi
            
            # Check if branch was deleted on remote
            if ! branch_exists_remote "$branch"; then
                should_clean=true
                reason="branch deleted on remote"
            fi
            
            # Check if worktree is clean
            if [[ -n "$(cd "$path" && git status --porcelain 2>/dev/null)" ]]; then
                should_clean=false
                reason="has uncommitted changes"
                print_warning "  $(basename "$path") - $reason"
            elif [[ "$should_clean" == "true" ]]; then
                if [[ "$auto_delete" == "true" || "$FORCE" == "yes" ]]; then
                    TO_CLEAN+=("$path|$branch|$reason")
                    print_info "  $(basename "$path") - will clean: $reason"
                else
                    print_warning "  $(basename "$path") - skipped (auto-delete disabled): $reason"
                fi
            fi
        fi
    fi
done

# Process cleanup
if [[ ${#TO_CLEAN[@]} -eq 0 ]]; then
    print_status "No worktrees to clean up"
    exit 0
fi

if [[ "$MODE" == "check" ]]; then
    print_info "Run with 'clean' mode to perform cleanup"
    exit 0
fi

if [[ "$MODE" == "clean" ]]; then
    print_warning "About to clean ${#TO_CLEAN[@]} worktrees"
    
    if [[ "$FORCE" != "yes" ]]; then
        read -p "Continue? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
    
    for item in "${TO_CLEAN[@]}"; do
        IFS='|' read -r path branch reason <<< "$item"
        print_status "Cleaning: $(basename "$path")"
        
        # Remove worktree
        git worktree remove --force "$path" 2>/dev/null || true
        
        # Delete local branch
        git branch -D "$branch" 2>/dev/null || true
        
        # Delete remote branch if it exists
        if branch_exists_remote "$branch"; then
            git push origin --delete "$branch" 2>/dev/null || true
        fi
    done
    
    print_status "Cleanup completed!"
fi
