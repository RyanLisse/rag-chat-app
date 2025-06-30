# Git Worktrees Development Workflow

This document provides a comprehensive guide to using Git worktrees for parallel development in the RAG Chat RRA project.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Core Concepts](#core-concepts)
- [Commands Reference](#commands-reference)
- [Workflows](#workflows)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Git worktrees allow multiple branches to be checked out simultaneously in separate directories, enabling:

- **Parallel Development**: Work on multiple features without switching branches
- **Instant Context Switching**: Move between tasks without stashing
- **Isolated Environments**: Each worktree has its own working directory
- **Concurrent Testing**: Run tests on different branches simultaneously
- **Clean Git History**: No WIP commits needed when switching tasks

## Setup

### Initial Setup

Run the setup script once to initialize the worktree infrastructure:

```bash
bun run setup:worktrees
# or
./scripts/setup-worktrees.sh
```

This creates:
- `.worktrees/` directory structure
- Configuration file at `.worktrees/config.json`
- Management scripts in `scripts/`
- Git aliases for convenience
- Hook templates and documentation

### Directory Structure

```
.worktrees/
├── config.json          # Worktree configuration
├── feature/            # Feature worktrees
├── bugfix/             # Bugfix worktrees
├── hotfix/             # Hotfix worktrees
├── release/            # Release worktrees
├── .config/            # Additional configurations
├── .hooks/             # Hook templates
└── .templates/         # Workflow templates
```

## Core Concepts

### Worktree Types

Each worktree type has specific configurations:

| Type | Prefix | Base Branch | Auto-Delete | Max Age | Use Case |
|------|--------|-------------|-------------|---------|----------|
| feature | feature/ | main | Yes | 30 days | New features, enhancements |
| bugfix | bugfix/ | main | Yes | 14 days | Non-critical bug fixes |
| hotfix | hotfix/ | main/production | No | 7 days | Critical production fixes |
| release | release/ | main | No | 60 days | Release preparation |

### Synchronized Files

The following files/directories are automatically synchronized across worktrees:
- Configuration files: `package.json`, `tsconfig.json`, `next.config.js`
- Development configs: `tailwind.config.ts`, `biome.json`, `drizzle.config.ts`
- Shared scripts: `scripts/` directory
- Database schema: `lib/db/schema/` directory

### Hooks

Hooks run automatically at different stages:

- **postWorktree**: After creating a worktree (installs dependencies, generates DB)
- **preMerge**: Before merging (runs lint, typecheck, unit tests)
- **postMerge**: After successful merge
- **preSwitch/postSwitch**: When switching between worktrees

## Commands Reference

### NPM Scripts

```bash
# Setup worktrees (first time only)
bun run setup:worktrees

# Create a new worktree
bun run wt:create <type> <name> [base-branch]

# Switch between worktrees
bun run wt:switch [name]

# Sync files across worktrees
bun run wt:sync [all|single] [name]

# Merge worktree back to base
bun run wt:merge <name> [target-branch] [delete-after]

# Clean up old worktrees
bun run wt:clean [check|clean] [force]
```

### Git Aliases

```bash
# List all worktrees
git wtl

# Create new worktree
git wta feature my-feature

# Switch to worktree
git wts my-feature

# Sync worktrees
git wtsync

# Merge worktree
git wtm my-feature

# Clean up worktrees
git wtclean
```

### Direct Script Usage

```bash
# Create feature worktree
./scripts/worktree-create.sh feature user-auth

# Create bugfix from specific base
./scripts/worktree-create.sh bugfix fix-header main

# Switch with interactive selection
./scripts/worktree-switch.sh

# Sync single worktree
./scripts/worktree-sync.sh single user-auth

# Merge without deleting
./scripts/worktree-merge.sh user-auth main no

# Force cleanup
./scripts/worktree-cleanup.sh clean yes
```

## Workflows

### Standard Feature Development

```bash
# 1. Create feature worktree
bun run wt:create feature user-dashboard

# 2. Switch to worktree
cd .worktrees/feature/user-dashboard

# 3. Development workflow
bun run dev                    # Start dev server
# Make changes...
git add .
git commit -m "feat: add user dashboard"

# 4. Keep synchronized
bun run wt:sync single user-dashboard

# 5. Merge when complete
bun run wt:merge user-dashboard
```

### Urgent Bug Fix

```bash
# 1. Create bugfix worktree (from any location)
bun run wt:create bugfix critical-login-fix

# 2. Quick switch
bun run wt:switch critical-login-fix

# 3. Fix and test
bun run dev
# Fix the bug...
bun run test
git add .
git commit -m "fix: resolve critical login issue"

# 4. Fast merge
bun run wt:merge critical-login-fix
```

### Parallel Development

```bash
# Terminal 1: Feature A
cd .worktrees/feature/new-api
bun run dev                    # Port 3000

# Terminal 2: Feature B
cd .worktrees/feature/ui-refresh
bun run dev                    # Port 3001

# Terminal 3: Bug fix
cd .worktrees/bugfix/data-sync
bun run test:watch
```

### Release Preparation

```bash
# 1. Create release worktree
bun run wt:create release v1.2.0

# 2. Prepare release
cd .worktrees/release/v1.2.0
# Update versions, changelogs
bun run build
bun run test:ci

# 3. Merge to main
bun run wt:merge v1.2.0

# 4. Tag and deploy from main
git tag v1.2.0
git push --tags
```

## Configuration

### Config File Structure

`.worktrees/config.json`:

```json
{
  "worktrees": {
    "types": {
      "feature": {
        "prefix": "feature/",
        "baseFrom": "main",
        "autoDelete": true,
        "maxAge": 30
      }
    }
  },
  "sync": {
    "files": ["package.json", "tsconfig.json"],
    "directories": ["scripts", "lib/db/schema"]
  },
  "hooks": {
    "postWorktree": ["bun install", "bun run db:generate"],
    "preMerge": ["bun run lint", "bun run test:unit"]
  }
}
```

### Customizing Behavior

1. **Add sync files**: Edit `sync.files` array
2. **Add sync directories**: Edit `sync.directories` array
3. **Modify hooks**: Add commands to hook arrays
4. **Change type settings**: Adjust prefix, maxAge, autoDelete

### Environment Variables

Each worktree gets its own `.env.local`:

```bash
# Copy from main
cp .env.local .worktrees/feature/my-feature/.env.local

# Or use different configs per worktree
echo "API_URL=http://localhost:4000" >> .worktrees/feature/api-test/.env.local
```

## Best Practices

### Naming Conventions

- **Features**: `user-auth`, `payment-integration`, `dashboard-v2`
- **Bugfixes**: `fix-login-error`, `resolve-data-sync`, `patch-memory-leak`
- **Hotfixes**: `critical-security-patch`, `prod-crash-fix`
- **Releases**: `v1.2.0`, `2024-q1-release`

### Workflow Tips

1. **One worktree per task**: Keep worktrees focused on single features/fixes
2. **Sync before starting**: Run sync to get latest configurations
3. **Commit frequently**: Make small, atomic commits in worktrees
4. **Clean up regularly**: Remove merged worktrees to avoid clutter
5. **Use descriptive names**: Make worktree purpose clear from the name

### Performance Optimization

- **Limit active worktrees**: Keep 3-5 active worktrees maximum
- **Use shallow clones**: For large repos, consider shallow worktrees
- **Regular cleanup**: Run cleanup weekly to remove stale worktrees
- **Selective sync**: Only sync necessary files to reduce overhead

### Team Collaboration

1. **Branch naming**: Follow team conventions for branch names
2. **Communication**: Announce worktree creation for shared features
3. **PR workflow**: Create PRs from worktree branches as normal
4. **Code reviews**: Review in worktree before merging

## Troubleshooting

### Common Issues

#### Worktree has uncommitted changes
```bash
cd .worktrees/feature/my-feature
git stash
# or
git commit -m "WIP: saving work"
```

#### Cannot create worktree - branch exists
```bash
# Delete existing branch
git branch -D feature/my-feature
git push origin --delete feature/my-feature
```

#### Sync conflicts
```bash
# Manual resolution needed
cd .worktrees/feature/my-feature
# Resolve conflicts in affected files
git add .
git commit -m "resolve: sync conflicts"
```

#### Worktree corrupted
```bash
# Force remove and recreate
git worktree remove --force .worktrees/feature/broken
bun run wt:create feature broken
```

### Debug Commands

```bash
# List all worktrees with details
git worktree list --verbose

# Check worktree status
cd .worktrees/feature/my-feature
git status
cat .worktree-meta.json

# Verify configuration
cat .worktrees/config.json | jq .

# Check for locked worktrees
find .worktrees -name "*.lock"
```

### Recovery Procedures

#### Recover lost work
```bash
# Check reflog
git reflog show feature/my-feature

# Recover commit
git checkout -b recovery <commit-hash>
```

#### Fix broken worktree
```bash
# Remove worktree reference
git worktree prune

# Manually clean up
rm -rf .worktrees/feature/broken
git branch -D feature/broken
```

#### Reset worktree
```bash
cd .worktrees/feature/my-feature
git reset --hard origin/main
bun install
bun run db:generate
```

## Advanced Usage

### Custom Worktree Types

Add to `.worktrees/config.json`:

```json
{
  "worktrees": {
    "types": {
      "experiment": {
        "prefix": "exp/",
        "baseFrom": "main",
        "autoDelete": true,
        "maxAge": 7
      }
    }
  }
}
```

### Automated Workflows

Create `.github/workflows/worktree-cleanup.yml`:

```yaml
name: Cleanup Stale Worktrees
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/worktree-cleanup.sh clean yes
```

### Integration with CI/CD

```bash
# In CI pipeline
if [[ "$BRANCH" == feature/* ]]; then
  ./scripts/worktree-create.sh feature "$BRANCH_NAME"
  cd ".worktrees/feature/$BRANCH_NAME"
  bun run test:ci
fi
```

### Performance Monitoring

```bash
# Track worktree usage
find .worktrees -name ".worktree-meta.json" -exec \
  jq -r '[.type, .name, .created, .lastSync] | @csv' {} \; > worktree-usage.csv
```

## Appendix

### Complete Command Reference

| Command | Description | Example |
|---------|-------------|---------|
| `setup-worktrees.sh` | Initial setup | `./scripts/setup-worktrees.sh` |
| `worktree-create.sh` | Create new worktree | `./scripts/worktree-create.sh feature auth` |
| `worktree-switch.sh` | Switch between worktrees | `./scripts/worktree-switch.sh auth` |
| `worktree-sync.sh` | Sync files | `./scripts/worktree-sync.sh all` |
| `worktree-merge.sh` | Merge worktree | `./scripts/worktree-merge.sh auth main yes` |
| `worktree-cleanup.sh` | Clean old worktrees | `./scripts/worktree-cleanup.sh clean` |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WORKTREES_DIR` | Base directory for worktrees | `.worktrees` |
| `WORKTREE_MAX_AGE` | Override max age (days) | Per type config |
| `WORKTREE_AUTO_SYNC` | Enable auto-sync | `true` |
| `WORKTREE_FORCE_CLEAN` | Force cleanup without prompt | `false` |

### File Structure Reference

```
project-root/
├── .git/                      # Main git directory
├── .worktrees/               # Worktrees base directory
│   ├── config.json           # Configuration
│   ├── feature/             # Feature worktrees
│   │   └── user-auth/       # Example feature worktree
│   │       ├── .git         # Worktree git file
│   │       ├── .worktree-meta.json  # Metadata
│   │       └── ...          # Project files
│   ├── bugfix/
│   ├── hotfix/
│   └── release/
├── scripts/                  # Management scripts
│   ├── setup-worktrees.sh
│   ├── worktree-create.sh
│   ├── worktree-switch.sh
│   ├── worktree-sync.sh
│   ├── worktree-merge.sh
│   ├── worktree-cleanup.sh
│   └── worktree-utils.sh
└── docs/
    ├── worktrees-workflow.md
    └── WORKTREES.md         # This file
```