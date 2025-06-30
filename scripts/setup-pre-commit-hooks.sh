#!/bin/bash
# Pre-commit Hook Setup Script

set -e

HOOK_DIR=".git/hooks"
PRE_COMMIT_HOOK="$HOOK_DIR/pre-commit"

echo "🔧 Setting up pre-commit test validation hooks..."

# Create hooks directory if it doesn't exist
mkdir -p "$HOOK_DIR"

# Create pre-commit hook
cat > "$PRE_COMMIT_HOOK" << 'EOF'
#!/bin/bash
# Pre-commit test validation hook

set -e

echo "🧪 Running pre-commit test validation..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
HAS_JS_TS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(js|ts|jsx|tsx)$' || true)
HAS_TEST_FILES=$(echo "$STAGED_FILES" | grep -E '\.test\.(js|ts|jsx|tsx)$' || true)

# Skip if no relevant files
if [ -z "$HAS_JS_TS_FILES" ]; then
    echo "✅ No JS/TS files changed, skipping tests"
    exit 0
fi

# Run linting and type checking
echo "📝 Running linting and type checking..."
bun run check || {
    echo "❌ Linting failed - fix errors before committing"
    exit 1
}

bun run typecheck || {
    echo "❌ Type checking failed - fix errors before committing"
    exit 1
}

# Run unit tests
echo "🧪 Running unit tests..."
bun run test:unit || {
    echo "❌ Unit tests failed - fix failing tests before committing"
    exit 1
}

# Run affected integration tests if test files changed
if [ -n "$HAS_TEST_FILES" ]; then
    echo "🔗 Running integration tests for changed test files..."
    bun run test:integration || {
        echo "❌ Integration tests failed - fix failing tests before committing"
        exit 1
    }
fi

# Security check for sensitive data
echo "🔒 Checking for sensitive data..."
SENSITIVE_PATTERNS="(api_key|secret|password|token|private_key)"
if echo "$STAGED_FILES" | xargs grep -iE "$SENSITIVE_PATTERNS" 2>/dev/null; then
    echo "❌ Sensitive data detected in staged files - remove before committing"
    exit 1
fi

# Check for TODO/FIXME in committed code (warning only)
TODO_COUNT=$(echo "$STAGED_FILES" | xargs grep -iE "(TODO|FIXME|XXX)" 2>/dev/null | wc -l || echo "0")
if [ "$TODO_COUNT" -gt 0 ]; then
    echo "⚠️  Warning: $TODO_COUNT TODO/FIXME comments found in staged files"
fi

echo "✅ Pre-commit validation passed!"
EOF

# Make hook executable
chmod +x "$PRE_COMMIT_HOOK"

# Create commit-msg hook for conventional commits
cat > "$HOOK_DIR/commit-msg" << 'EOF'
#!/bin/bash
# Commit message validation hook

commit_regex='^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "❌ Invalid commit message format!"
    echo "📝 Use conventional commits: type(scope): description"
    echo "   Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
    echo "   Example: feat(auth): add login validation"
    exit 1
fi

echo "✅ Commit message format valid"
EOF

chmod +x "$HOOK_DIR/commit-msg"

# Create pre-push hook for comprehensive validation
cat > "$HOOK_DIR/pre-push" << 'EOF'
#!/bin/bash
# Pre-push comprehensive test validation

set -e

echo "🚀 Running pre-push test validation..."

# Run comprehensive test suite
echo "🧪 Running comprehensive test suite..."
bun run test:ci || {
    echo "❌ Comprehensive tests failed - fix issues before pushing"
    exit 1
}

# Check for merge conflicts
if git diff --name-only | xargs grep -l "<<<<<<< HEAD" 2>/dev/null; then
    echo "❌ Merge conflict markers found - resolve before pushing"
    exit 1
fi

# Ensure no debug code in production
if git diff --name-only | xargs grep -E "(console\.(log|debug|warn)|debugger)" --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo "⚠️  Warning: Debug code found - consider removing before production"
fi

echo "✅ Pre-push validation passed!"
EOF

chmod +x "$HOOK_DIR/pre-push"

echo "✅ Pre-commit hooks installed successfully!"
echo ""
echo "Hooks installed:"
echo "  📝 pre-commit: Runs linting, type checking, and unit tests"
echo "  💬 commit-msg: Validates conventional commit format"
echo "  🚀 pre-push: Runs comprehensive test suite"
echo ""
echo "To skip hooks temporarily, use:"
echo "  git commit --no-verify"
echo "  git push --no-verify"