#!/bin/bash
# worktree-completion.bash - Bash completion for worktree commands

_worktree_types() {
    echo "feature bugfix hotfix release"
}

_worktree_names() {
    if [[ -d ".worktrees" ]]; then
        find .worktrees -mindepth 2 -maxdepth 2 -type d -exec basename {} \; 2>/dev/null
    fi
}

_worktree_branches() {
    git worktree list --porcelain | grep "branch" | cut -d' ' -f2 | sed 's/refs\/heads\///'
}

# Completion for worktree-create.sh
_worktree_create_completion() {
    local cur prev
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    case ${COMP_CWORD} in
        1)
            # Complete worktree types
            COMPREPLY=( $(compgen -W "$(_worktree_types)" -- ${cur}) )
            ;;
        2)
            # No completion for name (user input)
            ;;
        3)
            # Complete branch names
            COMPREPLY=( $(compgen -W "$(git branch -a | sed 's/^[* ]*//' | sed 's/remotes\/origin\///')" -- ${cur}) )
            ;;
    esac
}

# Completion for worktree-switch.sh
_worktree_switch_completion() {
    local cur
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    
    COMPREPLY=( $(compgen -W "$(_worktree_names)" -- ${cur}) )
}

# Completion for worktree-merge.sh
_worktree_merge_completion() {
    local cur prev
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    case ${COMP_CWORD} in
        1)
            # Complete worktree names
            COMPREPLY=( $(compgen -W "$(_worktree_names)" -- ${cur}) )
            ;;
        2)
            # Complete branch names for target
            COMPREPLY=( $(compgen -W "main staging production $(git branch -a | sed 's/^[* ]*//' | sed 's/remotes\/origin\///')" -- ${cur}) )
            ;;
        3)
            # Complete yes/no for delete after
            COMPREPLY=( $(compgen -W "yes no" -- ${cur}) )
            ;;
    esac
}

# Completion for worktree-sync.sh
_worktree_sync_completion() {
    local cur prev
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    case ${COMP_CWORD} in
        1)
            # Complete sync modes
            COMPREPLY=( $(compgen -W "all single" -- ${cur}) )
            ;;
        2)
            # Complete worktree names if mode is "single"
            if [[ "${COMP_WORDS[1]}" == "single" ]]; then
                COMPREPLY=( $(compgen -W "$(_worktree_names)" -- ${cur}) )
            fi
            ;;
    esac
}

# Completion for worktree-cleanup.sh
_worktree_cleanup_completion() {
    local cur prev
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    case ${COMP_CWORD} in
        1)
            # Complete cleanup modes
            COMPREPLY=( $(compgen -W "check clean" -- ${cur}) )
            ;;
        2)
            # Complete force option
            if [[ "${COMP_WORDS[1]}" == "clean" ]]; then
                COMPREPLY=( $(compgen -W "yes no" -- ${cur}) )
            fi
            ;;
    esac
}

# Register completions
complete -F _worktree_create_completion worktree-create.sh
complete -F _worktree_switch_completion worktree-switch.sh
complete -F _worktree_merge_completion worktree-merge.sh
complete -F _worktree_sync_completion worktree-sync.sh
complete -F _worktree_cleanup_completion worktree-cleanup.sh

# Also register for the npm/bun run commands
complete -F _worktree_create_completion "bun run wt:create"
complete -F _worktree_switch_completion "bun run wt:switch"
complete -F _worktree_merge_completion "bun run wt:merge"
complete -F _worktree_sync_completion "bun run wt:sync"
complete -F _worktree_cleanup_completion "bun run wt:clean"

# Git alias completions
_git_wta() {
    _worktree_create_completion
}

_git_wts() {
    _worktree_switch_completion
}

_git_wtm() {
    _worktree_merge_completion
}

_git_wtsync() {
    _worktree_sync_completion
}

_git_wtclean() {
    _worktree_cleanup_completion
}

# Installation instructions
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "To enable bash completion for worktree commands, add this line to your ~/.bashrc or ~/.bash_profile:"
    echo ""
    echo "source $(pwd)/worktree-completion.bash"
    echo ""
    echo "Then reload your shell or run: source ~/.bashrc"
fi