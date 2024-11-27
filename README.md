# Component Replacer VSCode 扩展

一个 Visual Studio Code 扩展,帮助您自动替换 React 组件,同时保持其功能并提高代码一致性。

## 功能特性

- 自动将指定的 React 组件替换为其增强版本
- 保留组件的 props 和子元素
- 处理简单组件和复合组件(例如 DatePickerExt.RangePicker)
- 保留现有的导入语句,并根据需要添加新的导入
- 替换后使用 Prettier 格式化代码

## 支持的组件替换

目前支持以下组件替换:

| 原始组件 | 替换组件 |
|---------|--------|
| Input | InputOutLineExt |
| Select | SelectOutLineExt |
| DatePickerExt.RangePicker | RangePickerOutLineExt |

## 使用方法

1. 在 VSCode 中打开一个 React/TypeScript 文件
2. 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux) 打开命令面板
3. 输入 "Replace Components" 并选择该命令
4. 扩展将自动替换当前文件中所有支持的组件

## 配置

组件替换规则在 `componentReplaceRules` 数组中定义。每个规则指定:
- 原始组件名称
- 替换组件名称
- 导入源

## 行为

- 只替换 FormItemExt 的直接子组件
- 在替换过程中保留所有 props 和属性
- 保持现有的导入语句,并根据需要添加新的导入
- 替换后自动格式化代码

## 要求

- Visual Studio Code 版本 1.60.0 或更高
- 带有 React 语法的 TypeScript/JavaScript 文件

## 扩展设置

此扩展提供以下设置:

* `component-replacer.enable`: 启用/禁用此扩展
* `component-replacer.formatOnReplace`: 启用/禁用替换后的自动代码格式化

## 已知问题

- 目前仅支持 TypeScript/TSX 文件
- 必须在 React 项目中使用

## 发布说明

### 1.0.0

Component Replacer 的初始发布版本

## 贡献

欢迎贡献!请随时提交 Pull Request。

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 LICENSE 文件

