# Whying Plugin

Lightweight desktop-only utilities for Obsidian:

- Fold the current Markdown note to a heading depth from `H1` to `H6`
- Increase or decrease the current heading fold depth
- Zoom the current tab and persist zoom per tab view state
- Reset the current tab or all tabs back to the default zoom

[简体中文](README.zh-CN.md)

## Features

### Heading fold

- Fold the active note to any heading level from `H1` to `H6`
- Increase or decrease the current fold level with commands
- Unfold all headings in the active editor

### Tab zoom

- Zoom the active tab in or out
- Save zoom per tab view state and restore it after layout reload
- Reset the current tab or all tabs back to the default zoom
- Optionally show the current zoom percentage in the status bar

## Commands

- `Fold to H1`
- `Fold to H2`
- `Fold to H3`
- `Fold to H4`
- `Fold to H5`
- `Fold to H6`
- `Unfold all headings`
- `Increase fold level`
- `Decrease fold level`
- `Zoom in current tab`
- `Zoom out current tab`
- `Reset current tab zoom`
- `Reset all tabs zoom`

## Settings

Each feature can be enabled or disabled independently.

Tab zoom provides:

- Default zoom percentage for tabs without a saved zoom value
- Zoom step used by zoom in and zoom out commands
- Status bar visibility
- Clear all saved tab zoom records

## Installation

### Manual installation

Copy the release files into:

`<Vault>/.obsidian/plugins/whying-plugin/`

Required files:

- `main.js`
- `manifest.json`
- `styles.css`

Then reload Obsidian and enable the plugin in **Settings -> Community plugins**.

### Local development

1. Clone this repository into `<Vault>/.obsidian/plugins/whying-plugin/`
2. Run `npm install`
3. Run `npm run dev`
4. Reload Obsidian and enable the plugin

## Development

- `npm run dev` builds in watch mode
- `npm run build` runs a production build
- `npm run lint` runs ESLint

## Notes

- The plugin is desktop-only
- Plugin data is stored locally with Obsidian's `loadData()` and `saveData()` APIs

## License

0BSD
