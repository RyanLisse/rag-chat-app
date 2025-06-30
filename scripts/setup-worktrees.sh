#!/bin/bash

# setup-worktrees.sh - Initialize Git worktrees for parallel development
# This script sets up worktree-based development workflow for the RAG Chat RRA project

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKTREES_DIR=".worktrees"
MAIN_BRANCH="main"
CONFIG_FILE=".worktrees/config.json"

# Function to print colored output
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

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
}

# Check if worktrees are already set up
check_existing_worktrees() {
    if [[ -d "$WORKTREES_DIR" ]]; then
        print_warning "Worktrees directory already exists"
        read -p "Do you want to continue and potentially overwrite? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
}

# Create worktrees directory structure
create_directory_structure() {
    print_status "Creating worktrees directory structure..."
    
    mkdir -p "$WORKTREES_DIR"/{feature,bugfix,hotfix,release}
    mkdir -p "$WORKTREES_DIR"/.config
    mkdir -p "$WORKTREES_DIR"/.hooks
    mkdir -p "$WORKTREES_DIR"/.templates
    
    # Create .gitignore for worktrees
    cat > "$WORKTREES_DIR/.gitignore" << 'EOF'
# Worktree-specific files
*/node_modules/
*/.env.local
*/.env.*.local
*/coverage/
*/.next/
*/out/
*/build/
*/.turbo/
*.log

# IDE files
*/.vscode/
*/.idea/

# OS files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
*.swp
*.swo
*~
EOF

    print_status "Directory structure created"
}

# Create configuration file
create_config_file() {
    print_status "Creating configuration file..."
    
    cat > "$CONFIG_FILE" << 'EOF'
{
  "version": "1.0.0",
  "project": "rag-chat-rra",
  "worktrees": {
    "basePath": ".worktrees",
    "types": {
      "feature": {
        "prefix": "feature/",
        "baseFrom": "main",
        "autoDelete": true,
        "maxAge": 30
      },
      "bugfix": {
        "prefix": "bugfix/",
        "baseFrom": "main",
        "autoDelete": true,
        "maxAge": 14
      },
      "hotfix": {
        "prefix": "hotfix/",
        "baseFrom": "main",
        "autoDelete": false,
        "maxAge": 7
      },
      "release": {
        "prefix": "release/",
        "baseFrom": "main",
        "autoDelete": false,
        "maxAge": 60
      }
    }
  },
  "sync": {
    "enabled": true,
    "files": [
      ".env.example",
      "package.json",
      "bun.lockb",
      "tsconfig.json",
      "next.config.js",
      "tailwind.config.ts",
      "biome.json",
      "drizzle.config.ts"
    ],
    "directories": [
      "scripts",
      "lib/db/schema"
    ]
  },
  "hooks": {
    "preWorktree": [],
    "postWorktree": [
      "bun install",
      "bun run db:generate"
    ],
    "preSwitch": [],
    "postSwitch": [],
    "preMerge": [
      "bun run lint",
      "bun run typecheck",
      "bun run test:unit"
    ],
    "postMerge": []
  },
  "aliases": {
    "wt": "worktree",
    "wtl": "worktree list",
    "wta": "worktree add",
    "wtr": "worktree remove",
    "wts": "scripts/worktree-switch.sh",
    "wtc": "scripts/worktree-create.sh",
    "wtm": "scripts/worktree-merge.sh",
    "wtsync": "scripts/worktree-sync.sh",
    "wtclean": "scripts/worktree-cleanup.sh"
  }
}
EOF

    print_status "Configuration file created"
}

# Create worktree management scripts
create_management_scripts() {
    print_status "Creating worktree management scripts..."
    
    # Create worktree-create.sh
    cat > scripts/worktree-create.sh << 'EOF'
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
EOF

    # Create worktree-switch.sh
    cat > scripts/worktree-switch.sh << 'EOF'
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
EOF

    # Create worktree-sync.sh
    cat > scripts/worktree-sync.sh << 'EOF'
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
EOF

    # Create worktree-merge.sh
    cat > scripts/worktree-merge.sh << 'EOF'
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
EOF

    # Create worktree-cleanup.sh
    cat > scripts/worktree-cleanup.sh << 'EOF'
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
EOF

    # Create worktree-utils.sh
    cat > scripts/worktree-utils.sh << 'EOF'
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
EOF

    # Make all scripts executable
    chmod +x scripts/worktree-*.sh
    
    print_status "Management scripts created"
}

# Create Git aliases
create_git_aliases() {
    print_status "Setting up Git aliases..."
    
    # Read aliases from config
    CONFIG=$(cat "$CONFIG_FILE")
    
    # Set up aliases
    git config alias.wt 'worktree'
    git config alias.wtl 'worktree list'
    git config alias.wta '!./scripts/worktree-create.sh'
    git config alias.wtr 'worktree remove'
    git config alias.wts '!./scripts/worktree-switch.sh'
    git config alias.wtc '!./scripts/worktree-create.sh'
    git config alias.wtm '!./scripts/worktree-merge.sh'
    git config alias.wtsync '!./scripts/worktree-sync.sh'
    git config alias.wtclean '!./scripts/worktree-cleanup.sh'
    
    print_status "Git aliases configured"
}

# Create hook templates
create_hook_templates() {
    print_status "Creating hook templates..."
    
    # Pre-commit hook template
    cat > "$WORKTREES_DIR/.hooks/pre-commit" << 'EOF'
#!/bin/bash
# Worktree pre-commit hook

# Run linting
echo "Running linting..."
bun run lint

# Run type checking
echo "Running type checking..."
bun run typecheck

# Run unit tests
echo "Running unit tests..."
bun run test:unit
EOF

    # Post-checkout hook template
    cat > "$WORKTREES_DIR/.hooks/post-checkout" << 'EOF'
#!/bin/bash
# Worktree post-checkout hook

# Install dependencies if package.json changed
if git diff HEAD@{1} --name-only | grep -q "package.json"; then
    echo "package.json changed, installing dependencies..."
    bun install
fi

# Run database migrations if schema changed
if git diff HEAD@{1} --name-only | grep -q "lib/db/schema"; then
    echo "Database schema changed, running migrations..."
    bun run db:generate
fi
EOF

    chmod +x "$WORKTREES_DIR/.hooks/"*
    print_status "Hook templates created"
}

# Create documentation
create_documentation() {
    print_status "Creating documentation..."
    
    mkdir -p docs
    
    cat > docs/worktrees-workflow.md << 'EOF'
# Git Worktrees Workflow

This project uses Git worktrees for parallel development, allowing multiple branches to be worked on simultaneously without the overhead of switching branches or stashing changes.

## Quick Start

### Initial Setup
```bash
# Run the setup script (only needed once)
./scripts/setup-worktrees.sh
```

### Creating a New Worktree
```bash
# Create a feature worktree
./scripts/worktree-create.sh feature my-feature

# Create a bugfix worktree
./scripts/worktree-create.sh bugfix fix-header-bug

# Create a hotfix worktree from a specific base
./scripts/worktree-create.sh hotfix critical-fix production
```

### Switching Between Worktrees
```bash
# List available worktrees
./scripts/worktree-switch.sh

# Switch to a specific worktree
./scripts/worktree-switch.sh my-feature
```

### Syncing Files
```bash
# Sync all worktrees with main
./scripts/worktree-sync.sh

# Sync a specific worktree
./scripts/worktree-sync.sh single my-feature
```

### Merging Work
```bash
# Merge and clean up (default)
./scripts/worktree-merge.sh my-feature

# Merge to a specific branch
./scripts/worktree-merge.sh my-feature staging

# Merge but keep the worktree
./scripts/worktree-merge.sh my-feature main no
```

### Cleanup
```bash
# Check what would be cleaned
./scripts/worktree-cleanup.sh check

# Perform cleanup
./scripts/worktree-cleanup.sh clean

# Force cleanup (bypass auto-delete settings)
./scripts/worktree-cleanup.sh clean yes
```

## Git Aliases

The following Git aliases are available:

- `git wt` - Shorthand for worktree
- `git wtl` - List all worktrees
- `git wta <type> <name>` - Add a new worktree
- `git wtr <name>` - Remove a worktree
- `git wts [name]` - Switch to a worktree
- `git wtm <name>` - Merge a worktree
- `git wtsync` - Sync all worktrees
- `git wtclean` - Clean up old worktrees

## Worktree Types

### Feature
- Prefix: `feature/`
- Base: `main`
- Auto-delete: Yes
- Max age: 30 days
- Use for: New features, enhancements

### Bugfix
- Prefix: `bugfix/`
- Base: `main`
- Auto-delete: Yes
- Max age: 14 days
- Use for: Non-critical bug fixes

### Hotfix
- Prefix: `hotfix/`
- Base: `main` or `production`
- Auto-delete: No
- Max age: 7 days
- Use for: Critical production fixes

### Release
- Prefix: `release/`
- Base: `main`
- Auto-delete: No
- Max age: 60 days
- Use for: Release preparation

## Configuration

The worktree configuration is stored in `.worktrees/config.json`. You can modify:

- **Sync files/directories**: Which files to keep synchronized
- **Hooks**: Commands to run at various stages
- **Type settings**: Prefixes, max ages, auto-delete behavior

## Best Practices

1. **Use descriptive names**: Choose clear, descriptive names for your worktrees
2. **Keep worktrees focused**: One feature/fix per worktree
3. **Sync regularly**: Run sync before starting work to get latest config
4. **Clean up**: Remove worktrees when done to keep things tidy
5. **Commit often**: Make small, focused commits in your worktree

## Troubleshooting

### Worktree has uncommitted changes
```bash
# Check status
cd .worktrees/feature/my-feature
git status

# Either commit or stash changes
git add .
git commit -m "WIP: Save work"
# or
git stash
```

### Merge conflicts during sync
The sync script uses `rsync` which overwrites files. If you have local changes to synced files, commit them first.

### Cannot remove worktree
```bash
# Force remove if necessary
git worktree remove --force .worktrees/feature/my-feature
```

### Branch already exists
```bash
# Delete the old branch first
git branch -D feature/my-feature
git push origin --delete feature/my-feature
```

## Advanced Usage

### Custom Hooks
Add custom hooks to `.worktrees/config.json`:

```json
{
  "hooks": {
    "postWorktree": [
      "bun install",
      "bun run db:generate",
      "cp .env.example .env.local"
    ]
  }
}
```

### Parallel Testing
Run tests in multiple worktrees simultaneously:

```bash
# In terminal 1
cd .worktrees/feature/feature-a
bun run test:watch

# In terminal 2
cd .worktrees/feature/feature-b
bun run test:watch
```

### Environment Variables
Each worktree gets its own `.env.local` file, allowing different configurations:

```bash
# Production-like testing in one worktree
cd .worktrees/feature/perf-testing
echo "NEXT_PUBLIC_API_URL=https://api.production.com" >> .env.local

# Local testing in another
cd .worktrees/feature/new-ui
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" >> .env.local
```
EOF

    print_status "Documentation created"
}

# Create example workflow
create_example_workflow() {
    print_status "Creating example workflow..."
    
    cat > "$WORKTREES_DIR/.templates/workflow-example.md" << 'EOF'
# Example Worktree Workflow

## Scenario: Implementing a new feature while fixing a bug

### 1. Start the feature
```bash
# Create feature worktree
./scripts/worktree-create.sh feature user-dashboard

# Switch to it
cd .worktrees/feature/user-dashboard

# Start development server
bun run dev
```

### 2. Urgent bug comes in
```bash
# Without closing anything, create bugfix worktree
./scripts/worktree-create.sh bugfix fix-login-error

# Switch to new terminal/tab
cd .worktrees/bugfix/fix-login-error

# Fix the bug
bun run dev  # Runs on different port
```

### 3. Complete the bugfix
```bash
# In bugfix worktree
git add .
git commit -m "fix: resolve login error with OAuth"

# Merge it
./scripts/worktree-merge.sh fix-login-error
```

### 4. Continue feature work
```bash
# Back to feature terminal
# Work continues uninterrupted

# When ready
git add .
git commit -m "feat: implement user dashboard"

# Merge when complete
./scripts/worktree-merge.sh user-dashboard
```

## Benefits Demonstrated

1. **No context switching**: Feature work continued uninterrupted
2. **No stashing**: Each worktree maintains its own state
3. **Parallel development**: Both dev servers ran simultaneously
4. **Clean history**: Each branch has focused commits
5. **Fast switching**: No need to reinstall dependencies
EOF

    print_status "Example workflow created"
}

# Main setup flow
main() {
    print_info "Setting up Git worktrees for RAG Chat RRA..."
    
    check_git_repo
    check_existing_worktrees
    create_directory_structure
    create_config_file
    create_management_scripts
    create_git_aliases
    create_hook_templates
    create_documentation
    create_example_workflow
    
    print_status "Git worktrees setup completed!"
    print_info "Next steps:"
    echo "  1. Review the configuration in $CONFIG_FILE"
    echo "  2. Read the documentation in docs/worktrees-workflow.md"
    echo "  3. Try creating your first worktree:"
    echo "     ./scripts/worktree-create.sh feature my-first-feature"
    echo ""
    print_info "Available commands:"
    echo "  - git wtl                    # List worktrees"
    echo "  - git wts                    # Switch between worktrees"
    echo "  - git wta feature my-feature # Create new worktree"
    echo "  - git wtsync                 # Sync all worktrees"
    echo "  - git wtclean                # Clean up old worktrees"
}

# Run main function
main "$@"
EOF

chmod +x scripts/setup-worktrees.sh