# whying Plugin

一个轻量的 Obsidian 插件，提供两个面向编辑器的实用功能：

- 基于标题层级的 Markdown 折叠命令
- 按标签页保存的缩放控制

[English](README.md)

## 功能特性

### 标题折叠

- 按 `H1` 到 `H6` 任意标题层级折叠当前笔记
- 通过命令逐级加深或减小当前折叠层级
- 一键展开当前编辑器中的所有标题

### 标签页缩放

- 放大或缩小当前标签页
- 按标签页保存缩放级别，并在布局恢复后自动还原
- 将当前标签页或所有标签页重置为默认缩放
- 可选在状态栏显示当前缩放百分比

## 命令

插件会注册以下命令：

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

## 设置项

你可以在插件设置中分别开启或关闭每个功能模块。

标签页缩放支持以下配置：

- 新标签页的默认缩放比例
- 放大和缩小命令使用的步进值
- 最小和最大缩放比例
- 是否在状态栏显示缩放百分比
- 清空已保存的缩放记录

## 安装

### 手动安装

将以下文件复制到你的 Vault 目录：

`<Vault>/.obsidian/plugins/whying-plugin/`

必需文件：

- `main.js`
- `manifest.json`
- `styles.css`

然后重新加载 Obsidian，并在 **Settings → Community plugins** 中启用插件。

### 本地开发

1. 将仓库克隆到 `<Vault>/.obsidian/plugins/whying-plugin/`
2. 运行 `npm install`
3. 运行 `npm run dev`
4. 重新加载 Obsidian 并启用插件

## 开发

- `npm run dev` 以监听模式构建
- `npm run build` 执行生产构建
- `npm run lint` 运行 ESLint

## 说明

- 插件数据通过 Obsidian 的 `loadData()` 和 `saveData()` 接口保存在本地
- 当前 `manifest.json` 中的 `isDesktopOnly` 为 `false`

## 许可证

0BSD
