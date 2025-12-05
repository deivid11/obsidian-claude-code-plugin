/**
 * Chinese (Simplified) translations
 */
export const zh = {
    // Header
    'header.title': 'Claude Code 助手',
    'header.noNoteSelected': '未选择笔记',

    // Input Section
    'input.label': '输入指令：',
    'input.placeholder': '例如："为这个部分添加更多示例" 或 "用更好的标题重新组织"（回车发送，Ctrl+回车换行）',
    'input.conversationalMode': '对话模式（不修改文件）',
    'input.conversationalModeTooltip': '与 Claude 对话但不修改任何文件',
    'input.selectedTextOnly': '仅编辑选中文本',
    'input.autoAccept': '自动应用更改',
    'input.modelLabel': '模型：',
    'input.modelDefault': '默认',
    'input.runButton': '运行 Claude Code',
    'input.runningButton': '运行中...',
    'input.cancelButton': '取消',

    // Result Section
    'result.title': '结果',

    // Output Section
    'output.title': '输出',

    // Preview Section
    'preview.title': '预览',
    'preview.tabRaw': '原始',
    'preview.tabDiff': '差异',
    'preview.tabRendered': '渲染',
    'preview.originalChars': '原始：',
    'preview.modifiedChars': '修改后：',
    'preview.chars': '字符',
    'preview.applyButton': '应用更改',
    'preview.rejectButton': '拒绝',

    // History Section
    'history.title': '历史记录',
    'history.clearButton': '清除',

    // Agent Section
    'agent.planTitle': '计划',
    'agent.activityTitle': '活动',
    'agent.noPlan': '尚未创建计划',

    // Todo Status
    'todo.pending': '待处理',
    'todo.inProgress': '进行中',
    'todo.completed': '已完成',

    // Interactive Prompt
    'interactive.header': 'Claude 正在请求确认',
    'interactive.yesButton': '是',
    'interactive.noButton': '否',
    'interactive.customPlaceholder': '或输入自定义回复...',

    // Permission Approval
    'permission.header': '需要权限',
    'permission.message': 'Claude 正在请求执行操作的权限。',
    'permission.approveButton': '批准并继续',
    'permission.denyButton': '拒绝',

    // Status Messages
    'status.processing': 'Claude 正在处理',
    'status.autoApplying': '正在自动应用更改...',
    'status.runningAuthorized': '正在执行授权任务',
    'status.runningInBackground': '后台运行中...',
    'status.failed': '失败 - 请查看下方错误信息',

    // Notifications
    'notice.alreadyProcessing': '正在处理请求，请稍候。',
    'notice.enterPrompt': '请输入指令',
    'notice.noActiveNote': '未找到活动笔记，请先打开一个 Markdown 笔记',
    'notice.noEditor': '未找到 Markdown 编辑器，请确保已打开笔记',
    'notice.noVaultPath': '无法确定仓库路径',
    'notice.completed': 'Claude Code 已完成',
    'notice.completedNoChanges': 'Claude Code 已完成（无文件更改）',
    'notice.changesApplied': '更改已自动应用',
    'notice.changesAppliedSuccess': '更改已成功应用',
    'notice.failedApplyChanges': '应用更改失败',
    'notice.changesRejected': '更改已拒绝',
    'notice.cancelled': '已取消',
    'notice.permissionRequest': 'Claude 正在请求权限 - 请批准或拒绝',
    'notice.permissionDenied': '权限被拒绝 - Claude 将不会继续',
    'notice.noChangesToApply': '没有可应用的更改',
    'notice.noActiveFile': '没有活动文件',
    'notice.historyRestored': '历史记录项已恢复',
    'notice.historyRestoredWithChanges': '历史记录项已恢复（包含建议的更改）',
    'notice.historyCleared': '历史记录已清除',

    // Diff View
    'diff.original': '原始',
    'diff.modified': '修改后',

    // Result Renderer
    'result.directAnswer': '直接回答',
    'result.additionalContext': '附加内容',
    'result.tokens': '令牌',
    'result.tokensIn': '输入',
    'result.tokensOut': '输出',

    // Preview Stats
    'preview.originalLabel': '原始：',
    'preview.modifiedLabel': '修改后：',
    'preview.charsLabel': '字符',

    // Misc
    'misc.noPendingRequest': '未找到待处理的请求',
    'misc.languageChanged': '语言已更改。部分界面元素将在重新加载后更新。',
    'misc.testFailed': 'Claude Code 测试失败',

    // Settings
    'settings.autoDetectPath': '自动检测 Claude Code 路径',
    'settings.autoDetectPathDesc': '自动检测 Claude Code 可执行文件的位置',
    'settings.executablePath': 'Claude Code 可执行文件路径',
    'settings.executablePathDesc': 'Claude Code 可执行文件的完整路径（例如：/usr/local/bin/claude）',
    'settings.testInstallation': '测试 Claude Code 安装',
    'settings.testInstallationDesc': '验证 Claude Code 是否可访问并正常工作',
    'settings.testButton': '测试',
    'settings.testWorking': '正常工作！',
    'settings.testFailed': '失败',
    'settings.customPrompt': '自定义系统提示',
    'settings.customPromptDesc': '可选的自定义系统提示，将添加到所有请求前',
    'settings.customPromptPlaceholder': '你正在帮助编辑 Markdown 笔记...',
    'settings.preserveCursor': '保持光标位置',
    'settings.preserveCursorDesc': '应用更改后尝试保持光标位置',
    'settings.autoAcceptChanges': '自动接受更改',
    'settings.autoAcceptChangesDesc': '自动应用更改而不显示预览（请谨慎使用！）',
    'settings.model': '模型',
    'settings.modelDesc': '选择要使用的 Claude 模型：Sonnet（平衡）、Opus（最强大）或 Haiku（最快）。留空使用默认子代理模型。',
    'settings.modelDefault': '默认（子代理模型）',
    'settings.modelSonnet': 'Sonnet（平衡）',
    'settings.modelOpus': 'Opus（最强大）',
    'settings.modelHaiku': 'Haiku（最快）',
    'settings.vaultAccess': '允许仓库范围访问',
    'settings.vaultAccessDesc': '允许 Claude 读取/搜索仓库中的其他文件（不仅仅是当前笔记）',
    'settings.permissionlessMode': '启用无权限模式',
    'settings.permissionlessModeDesc': '允许 Claude 执行操作而无需每次请求权限（请谨慎使用！Claude 将拥有完全控制权）',
    'settings.timeout': '超时时间（秒）',
    'settings.timeoutDesc': '等待 Claude Code 响应的最长时间（0 = 无超时）',
    'settings.customApiConfig': '自定义 API 配置',
    'settings.customApiConfigDesc': '为 Claude 不可直接访问的地区配置自定义 API 端点。留空使用默认设置。',
    'settings.apiBaseUrl': 'API 基础 URL',
    'settings.apiBaseUrlDesc': '自定义 API 端点 URL（例如：https://api.kimi.com/coding/）',
    'settings.apiAuthToken': 'API 认证令牌',
    'settings.apiAuthTokenDesc': 'API 端点的自定义认证令牌',
    'settings.apiAuthTokenPlaceholder': '输入您的 API 令牌',
    'settings.customModel': '自定义模型',
    'settings.customModelDesc': '要使用的自定义模型名称（例如：kimi-for-coding）。将覆盖上面的模型下拉选项。',
    'settings.customSmallModel': '自定义小型/快速模型',
    'settings.customSmallModelDesc': '用于快速操作的自定义模型名称（例如：kimi-for-coding）',
    'settings.language': '语言',
    'settings.languageDesc': '选择界面语言',
};
