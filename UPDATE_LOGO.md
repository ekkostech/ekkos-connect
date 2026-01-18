# How to Update the Extension Logo

The VS Code extension uses logos in two places:

## 1. Marketplace Logo (Required)

**Location**: Shown in VS Code Marketplace listing

**Requirements**:

- Format: PNG
- Size: At least 128x128 pixels (recommended: 256x256 or 512x512)
- File location: `resources/icon.png` (or any path in your extension)

**Steps to update**:

1. **Create/Prepare your logo**:

   - Use a PNG image
   - Recommended size: 256x256 or 512x512 pixels
   - Square aspect ratio (1:1)
   - Transparent background works well

2. **Place the file**:

   ```bash
   # Copy your logo to the resources folder
   cp your-logo.png extensions/ekkos-connect/resources/icon.png
   ```

3. **Update package.json**:
   The `icon` field is already configured in `package.json`:

   ```json
   {
     "icon": "resources/icon.png"
   }
   ```

4. **Convert from SVG** (if you have the SVG):

   ```bash
   # Using ImageMagick
   convert resources/ekkos-icon.svg -resize 512x512 resources/icon.png

   # Or using online tools:
   # - https://cloudconvert.com/svg-to-png
   # - https://convertio.co/svg-png/
   ```

5. **Republish**:
   ```bash
   cd extensions/ekkos-connect
   npm run compile
   npm run package
   npx @vscode/vsce publish
   ```

## 2. Activity Bar Icon (In VS Code)

**Location**: The icon shown in VS Code's activity bar (left sidebar)

**Current**: `resources/ekkos-icon.svg`

**To update**:

1. Replace `resources/ekkos-icon.svg` with your new SVG
2. Or update the path in `package.json` under `contributes.viewsContainers.activitybar[0].icon`

**Requirements**:

- Format: SVG (recommended) or PNG
- Size: 24x24 to 48x48 pixels (will be scaled)
- Should work well at small sizes

## Quick Update Commands

```bash
# 1. Add your logo (replace with your file)
cp /path/to/your-logo.png extensions/ekkos-connect/resources/icon.png

# 2. Verify it's in package.json (already configured)
grep '"icon"' extensions/ekkos-connect/package.json

# 3. Rebuild and republish
cd extensions/ekkos-connect
npm run compile
npm run package
npx @vscode/vsce publish
```

## Current Setup

- **Marketplace Icon**: Not set (needs `resources/icon.png`)
- **Activity Bar Icon**: `resources/ekkos-icon.svg` ✅

## Notes

- The marketplace icon appears in:
  - Extension listing page
  - Search results
  - Extension details page
- The activity bar icon appears:

  - In VS Code's left sidebar
  - When the extension adds a view container

- After updating, it may take a few minutes for the marketplace to show the new logo





















































































































































































































































