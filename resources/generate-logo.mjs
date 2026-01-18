#!/usr/bin/env node

/**
 * Generate ekkOS logo with tagline for VS Code extension
 * Based on brand guidelines: "ekkOS_™" with "AI memory infrastructure" tagline
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

// Generate SVG logo - Circular black background with white ekkOS_™ text
const generateLogoSVG = () => {
  const width = 512;
  const height = 512;
  const radius = 256; // Full circle
  const fontSize = 96;
  const centerX = width / 2;
  const centerY = height / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Purple gradient: lighter top-left to darker bottom-right -->
    <radialGradient id="purpleGradient" cx="30%" cy="30%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="1"/>
      <stop offset="100%" stop-color="#5b21b6" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <!-- Circular purple gradient background -->
  <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="url(#purpleGradient)"/>
  
  <!-- Logo text: ekkOS_™ - White text, centered, Inter 900 -->
  <text 
    x="${centerX}" 
    y="${centerY}" 
    text-anchor="middle" 
    dominant-baseline="central" 
    font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font-weight="900"
    font-size="${fontSize}"
    fill="#FFFFFF"
    letter-spacing="-0.01em"
  >
    ekkOS<tspan>_</tspan>
    <tspan font-size="${fontSize * 0.25}" dy="${-fontSize * 0.4}" dx="2" font-weight="900">™</tspan>
  </text>
</svg>`;
};

// Generate the logo
const svg = generateLogoSVG();
const svgPath = './ekkos-logo.svg';
const pngPath = './icon.png';

console.log('🎨 Generating ekkOS logo...');

// Write SVG
writeFileSync(svgPath, svg);
console.log(`✅ Created ${svgPath}`);

// Convert to PNG using sips (macOS)
try {
  execSync(`sips -s format png -z 512 512 ${svgPath} --out ${pngPath}`, { stdio: 'inherit' });
  console.log(`✅ Created ${pngPath}`);
  console.log('\n✨ Logo generated successfully!');
} catch (error) {
  console.error('❌ Failed to convert SVG to PNG. Please convert manually or use ImageMagick.');
  console.error('   SVG saved at:', svgPath);
  process.exit(1);
}




























