#!/bin/bash

# worktree-health.sh - Health check and diagnostics for worktrees

set -euo pipefail

source scripts/worktree-utils.sh

# Health check modes
MODE="${1:-check}"
FIX="${2:-no}"

# Statistics
STATS_TOTAL=0
STATS_HEALTHY=0
STATS_ISSUES=0
STATS_STALE=0

# Check results
ISSUES=()
RECOMMENDATIONS=()

# Function to add issue
add_issue() {
    local severity="$1"
    local description="$2"
    local fix_command="${3:-}"
    
    ISSUES+=("[$severity] $description")
    if [[ -n "$fix_command" ]]; then
        ISSUES+=("  Fix: $fix_command")
    fi
    ((STATS_ISSUES++))
}

# Function to add recommendation
add_recommendation() {
    local description="$1"
    RECOMMENDATIONS+=("$description")
}

# Check if worktrees are set up
check_setup() {
    print_info "Checking worktree setup..."
    
    if [[ ! -d "$WORKTREES_DIR" ]]; then
        add_issue "CRITICAL" "Worktrees not set up" "./scripts/setup-worktrees.sh"
        return 1
    fi
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        add_issue "HIGH" "Configuration file missing" "./scripts/setup-worktrees.sh"
        return 1
    fi
    
    # Validate config JSON
    if ! jq . "$CONFIG_FILE" >/dev/null 2>&1; then
        add_issue "HIGH" "Invalid configuration JSON" "Fix $CONFIG_FILE manually"
        return 1
    fi
    
    print_status "Setup check passed"
    return 0
}

# Check individual worktree health
check_worktree_health() {
    local worktree_path="$1"
    local worktree_name=$(basename "$worktree_path")
    local issues_found=0
    
    # Check if directory exists
    if [[ ! -d "$worktree_path" ]]; then
        add_issue "MEDIUM" "Worktree directory missing: $worktree_name" "git worktree prune"
        return 1
    fi
    
    # Check if it's a valid git worktree
    if [[ ! -f "$worktree_path/.git" ]]; then
        add_issue "MEDIUM" "Invalid worktree: $worktree_name" "git worktree remove $worktree_path"
        ((issues_found++))
    fi
    
    # Check metadata file
    local meta_file="$worktree_path/.worktree-meta.json"
    if [[ ! -f "$meta_file" ]]; then
        add_issue "LOW" "Missing metadata: $worktree_name" "Recreate worktree"
        ((issues_found++))
    else
        # Validate metadata JSON
        if ! jq . "$meta_file" >/dev/null 2>&1; then
            add_issue "MEDIUM" "Invalid metadata JSON: $worktree_name" "Fix $meta_file"
            ((issues_found++))
        fi
    fi
    
    # Check for uncommitted changes
    if [[ -d "$worktree_path/.git" ]] || [[ -f "$worktree_path/.git" ]]; then
        cd "$worktree_path"
        if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
            add_issue "INFO" "Uncommitted changes: $worktree_name" "cd $worktree_path && git status"
            ((issues_found++))
        fi
        cd - >/dev/null
    fi
    
    # Check node_modules
    if [[ ! -d "$worktree_path/node_modules" ]]; then
        add_issue "LOW" "Missing dependencies: $worktree_name" "cd $worktree_path && bun install"
        ((issues_found++))
    fi
    
    # Check for stale worktrees
    if [[ -f "$meta_file" ]]; then
        local created=$(jq -r '.created' "$meta_file" 2>/dev/null || echo "")
        if [[ -n "$created" ]]; then
            local age=$(get_age_days "$created")
            local type=$(jq -r '.type' "$meta_file" 2>/dev/null || echo "unknown")
            local max_age=$(load_config | jq -r ".worktrees.types.$type.maxAge // 30")
            
            if [[ $age -gt $max_age ]]; then
                add_issue "INFO" "Stale worktree: $worktree_name (${age}d old, max: ${max_age}d)" "./scripts/worktree-cleanup.sh clean"
                ((STATS_STALE++))
                ((issues_found++))
            fi
        fi
    fi
    
    if [[ $issues_found -eq 0 ]]; then
        ((STATS_HEALTHY++))
        return 0
    else
        return 1
    fi
}

# Check all worktrees
check_all_worktrees() {
    print_info "Checking all worktrees..."
    
    # Get worktrees from git
    local worktree_count=0
    
    while IFS= read -r line; do
        local path=$(echo "$line" | awk '{print $1}')
        
        # Only check worktrees in our directory
        if [[ "$path" == *"$WORKTREES_DIR"* ]]; then
            ((worktree_count++))
            ((STATS_TOTAL++))
            
            local name=$(basename "$path")
            print_info "  Checking $name..."
            
            if check_worktree_health "$path"; then
                print_status "  $name is healthy"
            else
                print_warning "  $name has issues"
            fi
        fi
    done < <(git worktree list 2>/dev/null || echo "")
    
    if [[ $worktree_count -eq 0 ]]; then
        print_info "No worktrees found"
    fi
}

# Check disk usage
check_disk_usage() {
    print_info "Checking disk usage..."
    
    if [[ -d "$WORKTREES_DIR" ]]; then
        local size=$(du -sh "$WORKTREES_DIR" 2>/dev/null | cut -f1)
        print_info "Worktrees directory size: $size"
        
        # Check individual worktree sizes
        find "$WORKTREES_DIR" -mindepth 2 -maxdepth 2 -type d | while read -r dir; do
            local name=$(basename "$dir")
            local dir_size=$(du -sh "$dir" 2>/dev/null | cut -f1)
            echo "  $name: $dir_size"
        done
        
        # Recommend cleanup if size is large
        local size_mb=$(du -sm "$WORKTREES_DIR" 2>/dev/null | cut -f1)
        if [[ $size_mb -gt 1000 ]]; then
            add_recommendation "Consider cleaning up worktrees (${size}MB used)"
        fi
    fi
}

# Check configuration consistency
check_config_consistency() {
    print_info "Checking configuration consistency..."
    
    local config=$(load_config)
    
    # Check if all required tools are available
    local tools=("git" "jq" "bun")
    for tool in "${tools[@]}"; do
        if ! command_exists "$tool"; then
            add_issue "HIGH" "$tool is not available" "Install $tool"
        fi
    done
    
    # Check sync files exist
    local sync_files=$(echo "$config" | jq -r '.sync.files[]? // empty')
    while IFS= read -r file; do
        if [[ -n "$file" ]] && [[ ! -f "$file" ]]; then
            add_issue "LOW" "Sync file missing: $file" "Create $file or update config"
        fi
    done <<< "$sync_files"
    
    # Check sync directories exist
    local sync_dirs=$(echo "$config" | jq -r '.sync.directories[]? // empty')
    while IFS= read -r dir; do
        if [[ -n "$dir" ]] && [[ ! -d "$dir" ]]; then
            add_issue "LOW" "Sync directory missing: $dir" "Create $dir or update config"
        fi
    done <<< "$sync_dirs"
}

# Check git configuration
check_git_config() {
    print_info "Checking git configuration..."
    
    # Check if aliases are set up
    local aliases=("wt" "wtl" "wta" "wtr" "wts" "wtc" "wtm" "wtsync" "wtclean")
    local missing_aliases=()
    
    for alias in "${aliases[@]}"; do
        if ! git config --get "alias.$alias" >/dev/null 2>&1; then
            missing_aliases+=("$alias")
        fi
    done
    
    if [[ ${#missing_aliases[@]} -gt 0 ]]; then
        add_issue "MEDIUM" "Missing git aliases: ${missing_aliases[*]}" "./scripts/setup-worktrees.sh"
    fi
    
    # Check if worktree config exists
    local worktree_config=$(git config --get-all worktree.guessRemote 2>/dev/null || echo "")
    if [[ -z "$worktree_config" ]]; then
        add_recommendation "Consider setting: git config worktree.guessRemote true"
    fi
}

# Auto-fix issues
auto_fix_issues() {
    print_info "Attempting to auto-fix issues..."
    
    local fixed=0
    
    # Prune deleted worktrees
    if git worktree prune 2>/dev/null; then
        print_status "Pruned deleted worktrees"
        ((fixed++))
    fi
    
    # Install missing dependencies
    find "$WORKTREES_DIR" -mindepth 2 -maxdepth 2 -type d | while read -r dir; do
        if [[ ! -d "$dir/node_modules" ]] && [[ -f "$dir/package.json" ]]; then
            print_info "Installing dependencies in $(basename "$dir")..."
            (cd "$dir" && bun install >/dev/null 2>&1) && ((fixed++))
        fi
    done
    
    # Fix git aliases
    if [[ $fixed -gt 0 ]]; then
        print_status "Auto-fixed $fixed issues"
    else
        print_info "No auto-fixable issues found"
    fi
}

# Generate report
generate_report() {
    echo
    print_info "=== WORKTREE HEALTH REPORT ==="
    echo
    
    # Statistics
    echo "Statistics:"
    echo "  Total worktrees: $STATS_TOTAL"
    echo "  Healthy: $STATS_HEALTHY"
    echo "  With issues: $STATS_ISSUES"
    echo "  Stale: $STATS_STALE"
    echo
    
    # Issues
    if [[ ${#ISSUES[@]} -gt 0 ]]; then
        echo "Issues found:"
        for issue in "${ISSUES[@]}"; do
            echo "  $issue"
        done
        echo
    else
        print_status "No issues found!"
        echo
    fi
    
    # Recommendations
    if [[ ${#RECOMMENDATIONS[@]} -gt 0 ]]; then
        echo "Recommendations:"
        for rec in "${RECOMMENDATIONS[@]}"; do
            echo "  - $rec"
        done
        echo
    fi
    
    # Overall health
    if [[ $STATS_ISSUES -eq 0 ]]; then
        print_status "Overall health: EXCELLENT"
    elif [[ $STATS_ISSUES -le 2 ]]; then
        print_warning "Overall health: GOOD (minor issues)"
    elif [[ $STATS_ISSUES -le 5 ]]; then
        print_warning "Overall health: FAIR (some issues)"
    else
        print_error "Overall health: POOR (many issues)"
    fi
}

# Main health check
main() {
    print_info "Starting worktree health check..."
    
    # Run checks
    if ! check_setup; then
        print_error "Setup check failed - cannot continue"
        generate_report
        exit 1
    fi
    
    check_all_worktrees
    check_disk_usage
    check_config_consistency
    check_git_config
    
    # Auto-fix if requested
    if [[ "$FIX" == "yes" ]]; then
        auto_fix_issues
    fi
    
    # Generate report
    generate_report
    
    # Exit with appropriate code
    if [[ $STATS_ISSUES -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Handle different modes
case "$MODE" in
    check)
        main
        ;;
    fix)
        FIX="yes"
        main
        ;;
    report)
        # Quick report only
        check_setup
        check_all_worktrees
        generate_report
        ;;
    *)
        echo "Usage: $0 [check|fix|report] [yes|no]"
        echo "  check - Run health check (default)"
        echo "  fix   - Run health check and auto-fix issues"
        echo "  report - Generate quick report"
        exit 1
        ;;
esac