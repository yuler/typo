# typo 紧急产品修改清单

> 整理日期：2026-06-05  
> 目标：让产品更易用、定位更明确。  
> 方法：结合当前仓库实现、官网/文档文案，以及同类产品公开信息整理。

## 一句话定位建议

建议把 typo 从泛泛的“AI 润色工具”调整为：

**一个隐私可控、键盘优先的桌面文本动作工具：选中文本，按快捷键，可靠地润色、翻译、改写或执行自定义动作。**

这个定位更清楚地区分了三件事：

- 不是聊天机器人：不要求用户离开当前应用。
- 不是单一润色器：核心是可复用的文本动作。
- 不是纯云端工具：本地 Ollama 是重要差异点，应被明确包装为隐私优势。

## 外部对照结论

同类产品正在把竞争点从“能 AI 改写”推进到“动作预设、选区工作流、隐私说明、结果可控”：

- Raycast AI Commands 已经提供内置动作，如 Improve Writing、Fix Spelling and Grammar、Change Tone、Summarize，并支持 `{selection}`、参数、模型、创造性、改动高亮和 Quick Fix 原地替换。
- PopClip 的强项是选择文本后立即弹出动作入口，并依靠扩展库覆盖大量文本操作。
- RewriteBar 强调“任何应用中写作”、本地模型、动作预设、改动对比、多步工作流和隐私。
- Grammarly/Superhuman 这类成熟写作助手强调跨应用、语气/清晰度、生成式 AI 开关、隐私与训练控制。

对 typo 的直接启发：不要只讲“AI 润色”，要把“选区动作入口 + 本地隐私 + 可控替换 + 预设模板”做成产品主线。

参考来源：

- Raycast AI Commands: https://manual.raycast.com/ai/ai-commands
- Raycast Dynamic Placeholders: https://manual.raycast.com/dynamic-placeholders
- PopClip: https://www.popclip.app/
- PopClip Extensions: https://www.popclip.app/extensions/
- RewriteBar: https://rewritebar.com/
- RewriteBar Privacy Policy: https://rewritebar.com/privacy-policy
- Grammarly generative AI support: https://support.grammarly.com/hc/en-us/articles/14528857014285-Introducing-GrammarlyGO
- Grammarly Privacy Policy: https://www.grammarly.com/privacy-policy

## P0：必须马上修

### 1. 把“自动替换”改成更可信的默认体验

现状：

- Indicator 主流程在 AI 返回后直接调用 `keyboard_paste_text` 替换原文。
- Quick Pick 已经有“查看结果后再复制/插入”的模式，但不是默认主体验。

问题：

- 新用户第一次使用时会担心原文被覆盖。
- AI 输出不稳定时，自动替换会放大错误成本。
- 隐私敏感文本被发送和替换前没有足够确认。

建议：

- 默认快捷键改为打开 Quick Pick 或预览结果，而不是直接替换。
- 保留“快速自动替换”作为高级开关，例如“自动插入结果”。
- 结果页明确提供三个动作：`Replace`、`Copy`、`Cancel`。
- 增加“保留原文到剪贴板”或“一键撤回上次替换”的兜底。

产品收益：

- 第一次体验更安全。
- 用户更容易信任产品。
- 更符合“文本动作工具”定位，而不是黑箱自动改写器。

### 2. 修复斜杠提示词文档与实现不一致

现状：

- 官网文档写“最多 5 个斜杠提示词”，桌面端和后端实际是 10 个。
- 官网文档写支持 `{{args}}` 和 `{{text}}` 占位符，但当前实现注释明确是 `no template substitution yet`。

问题：

- 这是直接影响信任的基础问题。
- 用户按文档配置后得不到预期结果，会认为产品坏了。

建议二选一：

- 推荐：实现 `{{text}}`、`{{args}}`、`{{selection}}` 占位符，并同步桌面端提示文案。
- 兜底：如果短期不实现，占位符文档立即删除，改成当前真实行为说明。

产品收益：

- Prompt 系统从“会用但难懂”变成“可编程文本动作”。
- 为后续模板市场、默认动作、团队共享打基础。

### 3. 明确 Provider 数据流向和隐私模式

现状：

- 默认 Provider 是 Typo Cloud。
- Typo Cloud 会把文本和提示词发送到后端。
- DeepSeek 会把文本发送到第三方模型服务。
- Ollama 是本地路径。
- 代码日志中存在记录 prompt、输入、输出的行为。

问题：

- 文本工具天然涉及邮件、合同、代码、客户资料等敏感内容。
- 如果不主动解释，隐私疑虑会阻止高价值用户使用。

建议：

- 在 AI Provider 设置页给每个选项增加数据流向说明：
  - Typo Cloud：发送到 typo 服务，可能保存历史。
  - DeepSeek：发送到用户配置的 DeepSeek API。
  - Ollama：本机处理，不离开本地模型服务。
- 增加“隐私优先模式”：默认选择 Ollama 或禁止历史保存/正文日志。
- 增加“不要保存历史记录”开关。
- 移除或脱敏所有正文日志，至少默认不记录输入/输出全文。
- 官网新增 Privacy 页面，明确 Provider、历史记录、日志、训练、删除策略。

产品收益：

- 让 Ollama 变成差异化，而不是一个普通 Provider。
- 降低企业、开发者、隐私敏感用户的采用阻力。

### 4. 给用户默认动作模板，不要让用户从空白 prompt 开始

现状：

- 默认提示词和斜杠提示词需要用户自己配置。
- Quick Pick 能搜索命令，但没有足够强的内置动作库表达。

问题：

- 普通用户不知道应该创建哪些命令。
- 产品价值被隐藏在设置页里。
- 和 Raycast、RewriteBar 等产品相比，缺少“开箱即用的动作集合”。

建议第一批内置动作：

- `/fix` 修正语法、拼写、标点，不改变意思。
- `/polish` 润色表达，保持原意。
- `/shorten` 缩短文本。
- `/friendly` 改成友好语气。
- `/formal` 改成正式语气。
- `/zh` 翻译成中文。
- `/en` 翻译成英文。
- `/jp` 翻译成日语。
- `/summary` 总结要点。
- `/reply` 根据原文草拟回复。

产品收益：

- 用户第一次打开 Quick Pick 就能看到产品能力。
- “文本动作工具”的定位会自然成立。

## P1：一周内应处理

### 5. 重新组织首页和 README 文案

现状：

- 当前文案重点是“AI-powered desktop tool that refines selected text”。
- 官网 feature 主要是多模型、快捷键、粘贴、可定制。

问题：

- “AI 润色”太泛，差异化不够。
- 没有把本地隐私、Quick Pick、动作模板讲成核心卖点。

建议首页主文案：

**Stop copy-pasting into chat. Run AI text actions anywhere.**

中文：

**不用再把文字复制到聊天窗口。选中文本，直接运行 AI 文本动作。**

建议四个核心卖点：

- Anywhere：在任意应用处理选中文本。
- Actions：润色、翻译、缩短、改语气、自定义命令。
- Control：先预览再替换，保留复制/取消选择。
- Privacy：Typo Cloud、DeepSeek、本地 Ollama 可选。

### 6. 把 Quick Pick 提升为核心入口

现状：

- Quick Pick 已存在，快捷键默认 `CommandOrControl+Shift+Space`。
- 但产品文案和主流程仍偏向默认全局润色。

建议：

- 首页和 Quickstart 把 Quick Pick 作为推荐流程。
- 全局快捷键只做“立即执行默认动作”，Quick Pick 做“选择动作后执行”。
- Quick Pick 支持最近使用、默认动作置顶、动作分类。
- 允许用户在结果页继续追问或二次修改。

产品收益：

- 更容易解释产品：这是桌面文本动作菜单。
- 降低斜杠命令的学习成本。

### 7. 加一个首次引导和权限检测页

现状：

- macOS、Linux Wayland 权限和兼容说明主要在文档里。
- 用户需要自己读文档解决问题。

建议：

- 首次启动检测系统、权限、快捷键注册、Ollama 可用性。
- 明确显示状态：`Selection capture`、`Paste replacement`、`Global shortcut`、`AI provider`。
- 每项失败给出按钮或命令指导。
- Wayland 场景直接引导用户配置系统快捷键。

产品收益：

- 减少首次失败。
- 把复杂平台问题产品化，而不是丢给 FAQ。

### 8. 增加“改动对比”

现状：

- 历史记录展示原文和润色文。
- Quick Pick 结果页没有明确的 diff/对比能力。

建议：

- 结果页增加 side-by-side 或 inline diff。
- 对 `/fix`、`/polish` 等改写动作显示“改了哪里”。
- 如果输出与输入差异过大，提示用户确认。

产品收益：

- 强化信任。
- 对写作工具尤其重要，因为用户关心“有没有改坏我的意思”。

## P2：两到四周内做

### 9. 支持更长文本和分段处理

现状：

- Typo Cloud 输入限制是 2048 字符。

建议：

- 短期：UI 明确提示限制，并在超限时建议改用本地/分段。
- 中期：支持分段处理、长文本摘要、流式进度。

### 10. 增加动作导入/导出和分享

建议：

- 支持导出 slash prompts 为 JSON。
- 支持导入模板包。
- 支持一键安装官方模板。

产品收益：

- 高级用户更容易迁移和沉淀工作流。
- 为社区模板或团队共享打基础。

### 11. 重新处理历史记录的产品边界

现状：

- 历史记录是账户登录后的同步能力。
- 对隐私敏感用户可能是负担。

建议：

- 历史记录默认说明清楚：保存什么、保存在哪里、怎么删除。
- 增加“本地历史”和“云端历史”的区别。
- 增加“不要保存这次结果”或“默认不保存正文”的选项。

## 建议执行顺序

### 第 1 阶段：先止血

1. 删除或脱敏正文日志。
2. 修复斜杠提示词文档/实现不一致。
3. 在 Provider 设置页补数据流向说明。
4. 把默认主流程改为可确认结果，或至少增加明显开关。

### 第 2 阶段：让产品好用

1. 内置 8 到 10 个默认动作模板。
2. Quick Pick 作为推荐入口写进官网和 Quickstart。
3. 做首次引导和权限检测。
4. 增加结果对比。

### 第 3 阶段：让定位清晰

1. 改首页和 README 文案。
2. 新增 Privacy 页面。
3. 把 Ollama 包装为“Local Privacy Mode”。
4. 发布一篇“为什么不是另一个聊天机器人”的博客。

## 最小可发布版本建议

如果只做一个紧急小版本，建议范围控制在：

- 默认动作模板。
- Quick Pick 推荐流程。
- 隐私/Provider 说明。
- 删除正文日志。
- 修复斜杠提示词文档与实现不一致。

这个版本的目标不是功能最多，而是让用户第一次使用时能明白：

**typo 是一个在任意应用里运行 AI 文本动作的桌面工具；它能预览、能替换、能本地处理，也能自定义工作流。**
