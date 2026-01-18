# ekkOS Extension Logos

High-quality SVG logos for IDEs, operating systems, and services used in the ekkOS extension.

## Directory Structure

```
logos/
├── ides/           # IDE logos (VS Code, Cursor, Windsurf, Claude)
├── os/             # Operating system logos (macOS, Windows, Linux)
├── services/       # Service logos (Vercel, Supabase, Anthropic, npm, Homebrew)
├── ATTRIBUTION.md  # Complete attribution and licensing info
└── README.md       # This file
```

## Available Logos

### IDEs (5)
- `claude-code.svg` - Claude Code
- `claude.svg` - Claude AI
- `cursor.svg` - Cursor IDE
- `vscode.svg` - Visual Studio Code
- `windsurf.svg` - Windsurf IDE

### Operating Systems (3)
- `linux.svg` - Linux
- `macos.svg` - macOS (Apple)
- `windows.svg` - Windows

### Services (5)
- `anthropic.svg` - Anthropic
- `homebrew.svg` - Homebrew package manager
- `npm.svg` - npm package manager
- `supabase.svg` - Supabase
- `vercel.svg` - Vercel

## Usage in Extension

Import logos in your TypeScript/JavaScript code:

```typescript
import * as path from 'path';

const logoPath = path.join(__dirname, '../resources/logos/ides/vscode.svg');
```

Or reference in HTML/Markdown:

```html
<img src="./resources/logos/ides/vscode.svg" alt="VS Code" />
```

## License

All logos are sourced from Simple Icons and are released under CC0 1.0 Universal (Public Domain). See [ATTRIBUTION.md](./ATTRIBUTION.md) for complete details.

## Updating Logos

To update or add new logos from Simple Icons:

```bash
# Download from jsdelivr CDN
curl -s "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/<icon-name>.svg" -o <category>/<name>.svg

# Or from simpleicons.org CDN
curl -s "https://cdn.simpleicons.org/<icon-name>" -o <category>/<name>.svg
```

Find available icons at: https://simpleicons.org

## Notes

- All logos are monochrome SVGs (single color, typically black)
- Logos can be styled with CSS `fill` or `color` properties
- SVG format ensures crisp display at any size
- File sizes range from 147B to 5.3KB (optimized)
