# Whying Plugin

面向 Obsidian 的轻量级桌面插件，提供两类编辑器工具：

- 按标题层级折叠当前 Markdown 笔记
- 按标签页视图状态保存和恢复缩放比例

[English](README.md)

## 功能

### 标题折叠

- 将当前笔记折叠到任意 `H1` 到 `H6` 层级
- 通过命令逐级增加或减少当前折叠层级
- 一键展开当前编辑器中的全部标题

### 标签页缩放

- 放大或缩小当前标签页
- 按标签页视图状态保存缩放比例，并在布局恢复后自动恢复
- 将当前标签页或全部标签页重置为默认缩放
- 可选在状态栏显示当前缩放百分比

## 命令

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

## 设置

每个功能都可以在插件设置中单独启用或禁用。

标签页缩放支持：

- 为没有单独记录的标签页设置默认缩放比例
- 设置放大和缩小命令使用的步进值
- 控制是否在状态栏显示当前缩放比例
- 清空全部已保存的标签页缩放记录

## 安装

### 手动安装

将以下文件复制到：

`<Vault>/.obsidian/plugins/whying-plugin/`

必需文件：

- `main.js`
- `manifest.json`
- `styles.css`

然后重新加载 Obsidian，并在 **Settings -> Community plugins** 中启用插件。

### 本地开发

1. 将仓库克隆到 `<Vault>/.obsidian/plugins/whying-plugin/`
2. 运行 `npm install`
3. 运行 `npm run dev`
4. 重新加载 Obsidian 并启用插件

## 开发

- `npm run dev`：监听并持续构建
- `npm run build`：执行生产构建
- `npm run lint`：运行 ESLint

## 说明

- 插件当前仅支持桌面端
- 插件数据通过 Obsidian 的 `loadData()` 和 `saveData()` API 保存在本地

## 许可证

0BSD
