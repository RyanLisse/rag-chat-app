# Git Worktrees Quick Start Guide

Welcome to the Git Worktrees workflow! This guide will get you started in under 5 minutes.

## 🚀 Quick Commands

### Create a Feature
```bash
bun run wt:create feature my-awesome-feature
cd .worktrees/feature/my-awesome-feature
bun run dev
```

### Fix a Bug
```bash
bun run wt:create bugfix fix-that-annoying-bug
bun run wt:switch fix-that-annoying-bug
```

### List & Switch
```bash
git wtl                    # List all worktrees
bun run wt:switch          # Interactive switch
bun run wt:switch my-feature  # Direct switch
```

### Merge Your Work
```bash
bun run wt:merge my-feature
```

## 📁 Where Are My Worktrees?

All worktrees live in the `.worktrees/` directory:

```
.worktrees/
├── feature/my-awesome-feature/     # Your feature code
├── bugfix/fix-that-bug/           # Your bugfix code
└── config.json                    # Configuration
```

## 🎯 Common Workflows

### Working on Multiple Features
```bash
# Terminal 1
cd .worktrees/feature/feature-a
bun run dev  # Runs on port 3000

# Terminal 2  
cd .worktrees/feature/feature-b
bun run dev  # Runs on port 3001
```

### Quick Bug Fix While Working on Feature
```bash
# You're working on a feature...
# Urgent bug reported!

# Just create a new worktree (no stashing needed!)
bun run wt:create bugfix urgent-fix

# Fix it in a new terminal
cd .worktrees/bugfix/urgent-fix
# fix the bug...
git add . && git commit -m "fix: urgent issue"
bun run wt:merge urgent-fix

# Your feature work is untouched!
```

## 🛠️ Essential Commands

| What | Command | Alias |
|------|---------|-------|
| Create worktree | `bun run wt:create <type> <name>` | `git wta <type> <name>` |
| List worktrees | `git worktree list` | `git wtl` |
| Switch worktree | `bun run wt:switch <name>` | `git wts <name>` |
| Sync files | `bun run wt:sync` | `git wtsync` |
| Merge & cleanup | `bun run wt:merge <name>` | `git wtm <name>` |
| Clean old worktrees | `bun run wt:clean` | `git wtclean` |

## 💡 Pro Tips

1. **Name clearly**: Use descriptive names like `user-auth` not `feature1`
2. **Stay focused**: One feature/fix per worktree
3. **Clean regularly**: Merged worktrees are auto-removed, but run `bun run wt:clean` weekly
4. **Sync smart**: Config changes? Run `bun run wt:sync` to update all worktrees

## ❓ Need Help?

- Full docs: `docs/WORKTREES.md`
- List commands: `bun run wt:switch` (with no args)
- Check config: `cat .worktrees/config.json`

Happy parallel coding! 🎉