export const messages: Record<string, Record<string, string>> = {
  zh: {
    // 页面标题
    title: '车载语音助手',
    
    // Tab 标签
    chat: '对话',
    trace: '思维链',
    knowledge: '知识库',
    api: 'API文档',
    
    // 对话
    clearChat: '清除对话',
    sendMessage: '发送消息开始对话',
    inputPlaceholder: '输入指令，如：打开空调',
    connectError: '连接服务器失败',
    latency: '耗时',
    
    // 思维链
    type: '类型',
    module: '领域',
    search: '搜索',
    clear: '清除',
    single: '单指令',
    multi: '多指令',
    all: '全部',
    noRecord: '暂无记录',
    input: '输入',
    token: 'Token',
    delay: '延迟',
    action: '操作',
    view: '查看',
    traceDetail: '思维链详情',
    userInput: '用户输入',
    recognizedCommands: '识别指令',
    execResults: '执行结果',
    mergedReply: '合并回复',
    fullResponse: '完整响应',
    
    // 知识库
    ability: '能力',
    feature: '功能',
    searchPlaceholder: '意图/示例关键词',
    rulesTitle: '车辆控制规则',
    showing: '显示',
    total: '条',
    
    // API 文档
    apiTitle: '接口文档',
    apiTip: '点击"测试"按钮可在线调试',
    test: '测试',
    healthCheck: '健康检查',
    getKnowledge: '获取知识库',
    queryLogs: '查询日志',
    fullChat: '完整对话',
    moduleRecognize: '模块识别',
    execCommand: '执行命令',
    desc: '说明',
    reqParams: '请求参数',
    respFields: '响应字段',
    reqBody: '请求体',
    respResult: '响应结果',
    
    // 模块名称
    moduleAC: '空调 AC',
    moduleSEAT: '座椅 SEAT',
    moduleWINDOW: '车窗 WINDOW',
    moduleLIGHT: '灯光 LIGHT',
    moduleMEDIA: '媒体 MEDIA',
    moduleNAV: '导航 NAV',
  },
  en: {
    // Page title
    title: 'Car Voice Assistant',
    
    // Tab labels
    chat: 'Chat',
    trace: 'Trace',
    knowledge: 'Knowledge',
    api: 'API Docs',
    
    // Chat
    clearChat: 'Clear',
    sendMessage: 'Send a message to start',
    inputPlaceholder: 'Enter command, e.g.: turn on AC',
    connectError: 'Failed to connect server',
    latency: 'Latency',
    
    // Trace
    type: 'Type',
    module: 'Module',
    search: 'Search',
    clear: 'Clear',
    single: 'Single',
    multi: 'Multi',
    all: 'All',
    noRecord: 'No records',
    input: 'Input',
    token: 'Token',
    delay: 'Delay',
    action: 'Action',
    view: 'View',
    traceDetail: 'Trace Detail',
    userInput: 'User Input',
    recognizedCommands: 'Commands',
    execResults: 'Results',
    mergedReply: 'Reply',
    fullResponse: 'Full Response',
    
    // Knowledge
    ability: 'Ability',
    feature: 'Feature',
    searchPlaceholder: 'Search intent/query',
    rulesTitle: 'Vehicle Control Rules',
    showing: 'Showing',
    total: 'items',
    
    // API Docs
    apiTitle: 'API Documentation',
    apiTip: 'Click "Test" to debug online',
    test: 'Test',
    healthCheck: 'Health Check',
    getKnowledge: 'Get Knowledge',
    queryLogs: 'Query Logs',
    fullChat: 'Full Chat',
    moduleRecognize: 'Recognize',
    execCommand: 'Execute',
    desc: 'Description',
    reqParams: 'Request Params',
    respFields: 'Response Fields',
    reqBody: 'Request Body',
    respResult: 'Response',
    
    // Module names
    moduleAC: 'AC',
    moduleSEAT: 'SEAT',
    moduleWINDOW: 'WINDOW',
    moduleLIGHT: 'LIGHT',
    moduleMEDIA: 'MEDIA',
    moduleNAV: 'NAV',
  }
};

export type Lang = 'zh' | 'en';
