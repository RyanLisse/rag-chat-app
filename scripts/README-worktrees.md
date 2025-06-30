# Worktree Scripts

This directory contains scripts for managing Git worktrees in the RAG Chat RRA project.

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup-worktrees.sh` | Initial setup of worktree infrastructure | `./scripts/setup-worktrees.sh` |
| `worktree-create.sh` | Create new worktrees | `./scripts/worktree-create.sh <type> <name> [base]` |
| `worktree-switch.sh` | Switch between worktrees | `./scripts/worktree-switch.sh [name]` |
| `worktree-sync.sh` | Sync files between worktrees | `./scripts/worktree-sync.sh [all\|single] [name]` |
| `worktree-merge.sh` | Merge worktree back to main | `./scripts/worktree-merge.sh <name> [target] [delete]` |
| `worktree-cleanup.sh` | Clean up old/stale worktrees | `./scripts/worktree-cleanup.sh [check\|clean] [force]` |
| `worktree-health.sh` | Health check and diagnostics | `./scripts/worktree-health.sh [check\|fix\|report]` |
| `worktree-utils.sh` | Shared utilities (sourced by others) | N/A |
| `worktree-completion.bash` | Bash completion for commands | `source worktree-completion.bash` |

## Quick Commands

### NPM/Bun Scripts
```bash
bun run setup:worktrees          # Initial setup
bun run wt:create feature auth   # Create feature worktree
bun run wt:switch auth          # Switch to worktree
bun run wt:sync                 # Sync all worktrees
bun run wt:merge auth           # Merge worktree
bun run wt:clean                # Clean up old worktrees
bun run wt:health               # Check worktree health
```

### Git Aliases (after setup)
```bash
git wta feature auth    # Create worktree
git wts auth           # Switch to worktree
git wtl               # List worktrees
git wtsync            # Sync all worktrees
git wtm auth          # Merge worktree
git wtclean           # Clean up
```

## Worktree Types

- **feature**: New features (`feature/user-auth`)
- **bugfix**: Bug fixes (`bugfix/fix-header`)
- **hotfix**: Critical fixes (`hotfix/security-patch`)
- **release**: Release prep (`release/v1.2.0`)

## File Structure

After setup, the following structure is created:

```
.worktrees/
├── config.json              # Configuration
├── feature/                 # Feature worktrees
├── bugfix/                  # Bugfix worktrees
├── hotfix/                  # Hotfix worktrees
├── release/                 # Release worktrees
├── .config/                 # Additional configs
├── .hooks/                  # Git hook templates
└── .templates/              # Workflow templates
```

## Configuration

Edit `.worktrees/config.json` to customize:
- Worktree types and their settings
- Files/directories to sync
- Hooks to run at various stages
- Cleanup policies

## Common Workflows

### Create and Work on Feature
```bash
bun run wt:create feature user-dashboard
cd .worktrees/feature/user-dashboard
bun run dev
# ... develop ...
git add . && git commit -m "feat: add user dashboard"
bun run wt:merge user-dashboard
```

### Quick Bug Fix
```bash
bun run wt:create bugfix urgent-fix
bun run wt:switch urgent-fix
# ... fix bug ...
git add . && git commit -m "fix: resolve urgent issue"
bun run wt:merge urgent-fix
```

### Parallel Development
```bash
# Terminal 1
cd .worktrees/feature/feature-a
bun run dev  # Port 3000

# Terminal 2
cd .worktrees/feature/feature-b
bun run dev  # Port 3001
```

## Maintenance

### Weekly Cleanup
```bash
bun run wt:clean check    # See what would be cleaned
bun run wt:clean clean    # Clean up old worktrees
```

### Health Check
```bash
bun run wt:health check   # Check for issues
bun run wt:health fix     # Auto-fix issues
```

### Sync Updates
```bash
bun run wt:sync           # Sync config changes to all worktrees
```

## Troubleshooting

### Common Issues

1. **Worktree has uncommitted changes**
   ```bash
   cd .worktrees/feature/my-feature
   git stash  # or commit changes
   ```

2. **Cannot create worktree - branch exists**
   ```bash
   git branch -D feature/my-feature
   git push origin --delete feature/my-feature
   ```

3. **Worktree directory corrupted**
   ```bash
   git worktree remove --force .worktrees/feature/broken
   bun run wt:create feature broken
   ```

4. **Health check failures**
   ```bash
   bun run wt:health fix    # Auto-fix common issues
   ```

### Debug Commands

```bash
git worktree list --verbose    # List all worktrees with details
cat .worktrees/config.json     # View configuration
ls -la .worktrees/             # Check directory structure
```

## Integration

### IDE Setup
Most IDEs will automatically detect worktrees as separate projects. Configure your IDE to:
- Index each worktree separately
- Use different terminal sessions for each worktree
- Set up different run configurations

### CI/CD Integration
```bash
# In CI pipeline
if [[ "$BRANCH" == feature/* ]]; then
  ./scripts/worktree-create.sh feature "$BRANCH_NAME"
  cd ".worktrees/feature/$BRANCH_NAME"
  bun run test:ci
fi
```

### Shell Integration
Add to your shell profile:
```bash
# Enable bash completion
source /path/to/project/scripts/worktree-completion.bash

# Add useful aliases
alias wt='git worktree'
alias wtcd='cd $(find .worktrees -name "$1" -type d 2>/dev/null | head -1)'
```

## Best Practices

1. **Use descriptive names**: `user-auth` not `feature1`
2. **One task per worktree**: Keep worktrees focused
3. **Regular cleanup**: Remove finished worktrees
4. **Sync regularly**: Keep configs updated across worktrees
5. **Health checks**: Run weekly health checks
6. **Commit frequently**: Small, focused commits in worktrees

## Support

- Full documentation: `docs/WORKTREES.md`
- Quick start: `docs/worktrees-quickstart.md`
- Configuration: `.worktrees/config.json`
- Issues: Run `bun run wt:health` for diagnostics