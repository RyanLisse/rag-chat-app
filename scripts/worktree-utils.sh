#!/bin/bash
# worktree-utils.sh - Shared utilities for worktree scripts

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
WORKTREES_DIR=".worktrees"
CONFIG_FILE=".worktrees/config.json"

# Print functions
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Load configuration
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        cat "$CONFIG_FILE"
    else
        echo "{}"
    fi
}

# Find worktree by name
find_worktree() {
    local name="$1"
    git worktree list | while read -r line; do
        path=$(echo "$line" | awk '{print $1}')
        if [[ "$(basename "$path")" == "$name" ]]; then
            echo "$path"
            return
        fi
    done
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Ensure required tools
ensure_tools() {
    local tools=("git" "jq")
    for tool in "${tools[@]}"; do
        if ! command_exists "$tool"; then
            print_error "$tool is required but not installed"
            exit 1
        fi
    done
}

# Run command with error handling
run_command() {
    local cmd="$1"
    local desc="${2:-Running command}"
    
    print_info "$desc"
    if eval "$cmd"; then
        return 0
    else
        print_error "Command failed: $cmd"
        return 1
    fi
}

# Ensure we're in the project root
ensure_project_root() {
    if [[ ! -f "package.json" ]] || [[ ! -d ".git" ]]; then
        print_error "Must be run from project root"
        exit 1
    fi
}

# Initialize
ensure_tools
ensure_project_root
