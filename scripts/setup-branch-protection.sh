#!/bin/bash

# Script to set up branch protection rules using GitHub CLI
set -euo pipefail

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is required but not installed."
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Please authenticate with GitHub CLI first:"
    echo "gh auth login"
    exit 1
fi

# Get repository information
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Setting up branch protection for repository: $REPO"

# Read branch protection configuration
CONFIG_FILE=".github/branch-protection.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Branch protection configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Function to apply branch protection
apply_branch_protection() {
    local branch=$1
    local rules=$2
    
    echo "Applying protection rules to branch: $branch"
    
    # Extract settings from JSON
    local require_pr_reviews=$(echo "$rules" | jq -r '.required_pull_request_reviews // empty')
    local required_checks=$(echo "$rules" | jq -r '.required_status_checks // empty')
    local enforce_admins=$(echo "$rules" | jq -r '.enforce_admins // false')
    local allow_force_pushes=$(echo "$rules" | jq -r '.allow_force_pushes // false')
    local allow_deletions=$(echo "$rules" | jq -r '.allow_deletions // false')
    local required_conversation_resolution=$(echo "$rules" | jq -r '.required_conversation_resolution // false')
    
    # Build gh command
    local cmd="gh api repos/$REPO/branches/$branch/protection --method PUT"
    
    # Add required status checks
    if [ -n "$required_checks" ]; then
        local strict=$(echo "$required_checks" | jq -r '.strict // false')
        local contexts=$(echo "$required_checks" | jq -c '.contexts // []')
        cmd="$cmd --field required_status_checks[strict]=$strict"
        cmd="$cmd --field required_status_checks[contexts]=$contexts"
    fi
    
    # Add pull request reviews
    if [ -n "$require_pr_reviews" ]; then
        local dismiss_stale=$(echo "$require_pr_reviews" | jq -r '.dismiss_stale_reviews // false')
        local require_code_owner=$(echo "$require_pr_reviews" | jq -r '.require_code_owner_reviews // false')
        local required_count=$(echo "$require_pr_reviews" | jq -r '.required_approving_review_count // 1')
        
        cmd="$cmd --field required_pull_request_reviews[dismiss_stale_reviews]=$dismiss_stale"
        cmd="$cmd --field required_pull_request_reviews[require_code_owner_reviews]=$require_code_owner"
        cmd="$cmd --field required_pull_request_reviews[required_approving_review_count]=$required_count"
    fi
    
    # Add other settings
    cmd="$cmd --field enforce_admins=$enforce_admins"
    cmd="$cmd --field allow_force_pushes=$allow_force_pushes"
    cmd="$cmd --field allow_deletions=$allow_deletions"
    cmd="$cmd --field required_conversation_resolution=$required_conversation_resolution"
    
    # Execute command
    if eval "$cmd"; then
        echo "✓ Successfully applied protection to branch: $branch"
    else
        echo "✗ Failed to apply protection to branch: $branch"
        return 1
    fi
}

# Main execution
main() {
    # Parse configuration
    local branches=$(jq -r '.protection_rules | keys[]' "$CONFIG_FILE")
    
    for branch in $branches; do
        # Check if branch pattern contains wildcards
        if [[ "$branch" == *"*"* ]]; then
            echo "Note: Wildcard branch patterns like '$branch' must be configured through GitHub UI"
            continue
        fi
        
        # Get rules for this branch
        local rules=$(jq -r ".protection_rules[\"$branch\"]" "$CONFIG_FILE")
        
        # Apply protection
        apply_branch_protection "$branch" "$rules"
    done
    
    echo ""
    echo "Branch protection setup complete!"
    echo "Note: Some advanced settings may require manual configuration in GitHub UI:"
    echo "  - Wildcard branch patterns (e.g., release/*)"
    echo "  - Team/user restrictions"
    echo "  - Required signatures"
}

# Run main function
main