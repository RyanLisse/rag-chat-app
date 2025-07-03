#!/bin/bash

# RAG Chat Application Setup Script
# This script sets up the development environment for cloud-based agents

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info "🚀 Setting up RAG Chat Application..."

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Verify project name
if ! grep -q '"name": "rag-chat-app"' package.json; then
    print_error "This doesn't appear to be the RAG Chat Application project."
    exit 1
fi

# Check for required tools
check_requirements() {
    print_info "Checking system requirements..."
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed."
        exit 1
    fi
    
    # Check for Bun (preferred) or npm
    if command -v bun &> /dev/null; then
        PACKAGE_MANAGER="bun"
        print_info "Using Bun as package manager"
    elif command -v npm &> /dev/null; then
        PACKAGE_MANAGER="npm"
        print_warn "Using npm as package manager (Bun is recommended)"
    else
        print_error "Neither Bun nor npm found. Please install one of them."
        exit 1
    fi
}

# Kill any processes that might be using our ports
cleanup_ports() {
    print_info "Cleaning up ports..."
    local ports=(3000 3001 3002 6379 5432)
    
    for port in "${ports[@]}"; do
        if lsof -ti:$port &> /dev/null; then
            print_info "Killing process on port $port"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
        fi
    done
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    if [[ "$PACKAGE_MANAGER" == "bun" ]]; then
        bun install
    else
        npm install
    fi
}

# Setup environment file
setup_environment() {
    print_info "Setting up environment configuration..."
    
    if [[ ! -f ".env.local" ]]; then
        if [[ -f ".env.local.example" ]]; then
            cp .env.local.example .env.local
            print_info "Created .env.local from example"
            print_warn "Please configure your API keys in .env.local"
        else
            print_error ".env.local.example not found"
            exit 1
        fi
    else
        print_info ".env.local already exists"
    fi
}

# Verify database setup
verify_database() {
    print_info "Verifying database setup..."
    
    if [[ "$PACKAGE_MANAGER" == "bun" ]]; then
        if ! bun run db:generate &> /dev/null; then
            print_warn "Database generation failed - this is normal if not configured yet"
        fi
    else
        if ! npm run db:generate &> /dev/null; then
            print_warn "Database generation failed - this is normal if not configured yet"
        fi
    fi
}

# Run type checking
run_typecheck() {
    print_info "Running TypeScript type checking..."
    
    if [[ "$PACKAGE_MANAGER" == "bun" ]]; then
        bun run typecheck
    else
        npm run typecheck
    fi
}

# Run linting
run_lint() {
    print_info "Running linting..."
    
    if [[ "$PACKAGE_MANAGER" == "bun" ]]; then
        bun run lint
    else
        npm run lint
    fi
}

# Run quick tests
run_quick_tests() {
    print_info "Running quick tests..."
    
    if [[ "$PACKAGE_MANAGER" == "bun" ]]; then
        bun run test:fast || print_warn "Some tests failed - check configuration"
    else
        npm run test:unit || print_warn "Some tests failed - check configuration"
    fi
}

# Main setup function
main() {
    check_requirements
    cleanup_ports
    install_dependencies
    setup_environment
    verify_database
    run_typecheck
    run_lint
    run_quick_tests
    
    print_info "✅ Setup complete!"
    echo
    print_info "Next steps:"
    echo "1. Configure API keys in .env.local"
    echo "2. Start development server: make dev"
    echo "3. Visit http://localhost:3000"
    echo
    print_info "Available commands:"
    echo "- make dev          # Start development server"
    echo "- make test         # Run tests"
    echo "- make build        # Build for production"
    echo "- make help         # Show all commands"
}

# Run setup if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi