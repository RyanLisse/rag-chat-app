# Biome.js Setup

This project uses Biome.js as the sole tool for linting, formatting, and code quality checks. ESLint and Prettier have been completely removed in favor of Biome.js's comprehensive ruleset.

## Features

### Formatting
- **Consistent code style**: 2-space indentation, single quotes for JS/TS, double quotes for JSX
- **Trailing commas**: ES5 style (trailing commas in arrays and objects)
- **Line endings**: LF (Unix-style)
- **Line width**: 80 characters
- **Semicolons**: Always required
- **Arrow function parentheses**: Always required

### Linting
- **TypeScript/React support**: Full support for TypeScript and React patterns
- **Next.js compatibility**: Special rules for Next.js app directory structure
- **Import organization**: Automatic import sorting and organization
- **Security checks**: Protection against common security vulnerabilities
- **Accessibility**: Comprehensive a11y rules for React components
- **Performance**: Rules to catch performance anti-patterns
- **Code quality**: Extensive rules for maintainable code

## Usage

### Check code (lint + format check)
```bash
bun run check        # Check for issues
bun run check:ci     # CI mode (exits with error code)
```

### Fix code (lint + format)
```bash
bun run lint         # Fix safe issues and format
bun run lint:fix     # Fix all issues including unsafe ones
```

### Format only
```bash
bun run format       # Format all files
```

### Pre-commit hook
```bash
bun run precommit    # Runs check + typecheck + unit tests
```

## Configuration

The configuration is in `biome.jsonc` and includes:

1. **Comprehensive linting rules**:
   - All recommended rules enabled
   - Additional security, performance, and quality rules
   - React/Next.js specific rules
   - TypeScript best practices

2. **Smart overrides**:
   - Next.js pages allow default exports
   - Test files allow `any` and `console.log`
   - Migration files skip linting
   - Playwright files allow empty destructuring

3. **Ignored paths**:
   - `node_modules`, `.next`, `public`, `.vercel`
   - UI components directory
   - Test files (for linting, not formatting)
   - Build outputs and minified files

## Benefits over ESLint + Prettier

1. **Single tool**: One configuration file, one command, one dependency
2. **Performance**: 10-100x faster than ESLint + Prettier
3. **Consistency**: No conflicts between linter and formatter
4. **Built-in rules**: No need for multiple plugins
5. **Better error messages**: Clear, actionable feedback
6. **Safe fixes**: Distinguishes between safe and unsafe fixes

## Migration from ESLint/Prettier

The following packages have been removed:
- `eslint`
- `eslint-config-next`
- `eslint-config-prettier`
- `eslint-import-resolver-typescript`
- `eslint-plugin-tailwindcss`

All their functionality has been replaced by Biome.js rules.

## VS Code Integration

Install the [Biome VS Code extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) for:
- Format on save
- Real-time linting
- Quick fixes
- Import organization

Add to your VS Code settings:
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

## Tailwind CSS Class Sorting

Biome.js includes the `useSortedClasses` rule which automatically sorts Tailwind CSS classes in:
- `className` and `class` attributes
- `cn()`, `clsx()`, `classnames()`, and `tw()` function calls

This replaces the functionality of `eslint-plugin-tailwindcss`.