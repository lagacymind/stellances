// Tells TypeScript that importing a .css file as a side effect is valid.
// Required because Tailwind CSS v4 uses @import "tailwindcss" inside globals.css,
// which does not ship type declarations, causing TS2882 in the editor.
declare module "*.css" {}
