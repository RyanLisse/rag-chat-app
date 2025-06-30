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
