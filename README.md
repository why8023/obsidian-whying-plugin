# whying Plugin

A lightweight Obsidian plugin that adds two focused editor utilities:

- Heading-based folding commands for Markdown notes
- Per-tab zoom controls with persistent zoom records

[简体中文](README.zh-CN.md)

## Features

### Heading fold

- Fold the current note to any heading depth from `H1` to `H6`
- Increase or decrease the current fold depth with commands
- Unfold all headings in the active editor

### Tab zoom

- Zoom the active tab in or out
- Save zoom level per tab and restore it after layout reload
- Reset the current tab or all tabs back to the default zoom
- Optionally show the current zoom percentage in the status bar

## Commands

The plugin registers the following commands:

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

Each feature can be enabled or disabled independently in the plugin settings.

For tab zoom, the following options are available:

- Default zoom percentage for new tabs
- Zoom step used by zoom in and zoom out commands
- Minimum and maximum allowed zoom
- Status bar visibility
- Clear all saved zoom records

## Installation

### Manual installation

Copy the release files into your vault:

`<Vault>/.obsidian/plugins/whying-plugin/`

Required files:

- `main.js`
- `manifest.json`
- `styles.css`

Then reload Obsidian and enable the plugin in **Settings → Community plugins**.

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

- Plugin data is stored locally with Obsidian's `loadData()` and `saveData()` APIs
- `manifest.json` currently sets `isDesktopOnly` to `false`

## License

0BSD
