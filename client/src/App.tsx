import React, { useState, useRef, useEffect } from 'react';
import { Tabs, Table, Modal, Input, Button, Tag, Typography, Descriptions, Alert } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, MessageOutlined, CopyOutlined } from '@ant-design/icons';
import { message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import './index.css';

const { TextArea } = Input;
const { Text } = Typography;

interface Message {
  role: 'user' | 'agent';
  content: string;
  action?: any;
  trace?: any;
  commands?: any[];
  results?: any[];
  timestamp: string;
}

interface TraceRecord {
  key: number;
  index: number;
  input: string;
  tokens: number;
  latency: string;
  trace: any;
}

interface IntentRecord {
  key: number;
  index: number;
  domain: string;
  ability: string;
  feature: string;
  intent: string;
  query: string;
}

// API 测试配置
const API_ENDPOINTS = [
  { key: 'health', method: 'GET', path: '/', name: '健康检查', body: null },
  { key: 'knowledge', method: 'GET', path: '/knowledge', name: '获取知识库', body: null },
  { key: 'logs', method: 'GET', path: '/logs?limit=10', name: '查询日志', body: null },
  { key: 'chat', method: 'POST', path: '/chat', name: '完整对话', body: '{"message": "打开空调，导航去公司，播放音乐", "history": []}' },
  { key: 'recognize', method: 'POST', path: '/chat/recognize', name: '模块识别', body: '{"message": "打开空调，导航去公司"}' },
  { key: 'execute', method: 'POST', path: '/chat/execute', name: '执行命令', body: '{"commands": [{"module": "AC", "text": "打开空调"}, {"module": "NAV", "text": "导航去公司"}]}' },
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('打开空调');
  const [loading, setLoading] = useState(false);
  const [traces, setTraces] = useState<TraceRecord[]>([]);
  const [intents, setIntents] = useState<IntentRecord[]>([]);
  const [rules, setRules] = useState<string[]>([]);
  const [traceModalOpen, setTraceModalOpen] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // API 测试相关状态
  const [apiTestBody, setApiTestBody] = useState<{[key: string]: string}>({});
  const [apiTestResponse, setApiTestResponse] = useState<{[key: string]: string}>({});
  const [apiTestLoading, setApiTestLoading] = useState<{[key: string]: boolean}>({});
  const [apiTestLatency, setApiTestLatency] = useState<{[key: string]: number}>({});

  useEffect(() => {
    loadKnowledgeBase();
    loadLogs();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadKnowledgeBase = async () => {
    try {
      const res = await axios.get('http://localhost:8000/knowledge');
      const data = res.data;
      
      if (data.rules) {
        setRules(data.rules);
      }
      
      if (data.intents) {
        let lastDomain = '';
        let lastAbility = '';
        let lastFeature = '';
        
        const intentList: IntentRecord[] = data.intents.map((item: any, idx: number) => {
          const domain = item.domain || lastDomain;
          const ability = item.ability || lastAbility;
          const feature = item.feature || lastFeature;
          
          if (item.domain) lastDomain = item.domain;
          if (item.ability) lastAbility = item.ability;
          if (item.feature) lastFeature = item.feature;
          
          return {
            key: idx + 1,
            index: idx + 1,
            domain,
            ability,
            feature,
            intent: item.intent || '',
            query: item.query || '',
          };
        });
        setIntents(intentList);
      }
    } catch (e) {
      console.error('Failed to load knowledge base', e);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await axios.get('http://localhost:8000/logs?limit=50');
      const logs = res.data.map((log: any, idx: number) => {
        let traceData = { user_input: log.user_input, latency_ms: log.latency_ms };
        try {
          if (log.raw_response) {
            traceData = { ...JSON.parse(log.raw_response), user_input: log.user_input, latency_ms: log.latency_ms };
          }
        } catch (e) {}
        return {
          key: log.id,
          index: idx + 1,
          input: log.user_input,
          tokens: 0,
          latency: `${((log.latency_ms || 0) / 1000).toFixed(1)}s`,
          trace: traceData,
        };
      });
      setTraces(logs.reverse());
    } catch (e) {
      console.error('Failed to load logs', e);
    }
  };

  // 执行 API 测试
  const runApiTest = async (endpoint: any) => {
    const key = endpoint.key;
    setApiTestLoading(prev => ({ ...prev, [key]: true }));
    const startTime = Date.now();
    
    try {
      let res;
      const url = `http://localhost:8000${endpoint.path}`;
      
      if (endpoint.method === 'GET') {
        res = await axios.get(url);
      } else {
        const bodyStr = apiTestBody[key] || endpoint.body || '{}';
        const body = JSON.parse(bodyStr);
        res = await axios.post(url, body);
      }
      
      setApiTestLatency(prev => ({ ...prev, [key]: Date.now() - startTime }));
      setApiTestResponse(prev => ({ ...prev, [key]: JSON.stringify(res.data, null, 2) }));
    } catch (e: any) {
      setApiTestLatency(prev => ({ ...prev, [key]: Date.now() - startTime }));
      setApiTestResponse(prev => ({ ...prev, [key]: `Error: ${e.message}` }));
    } finally {
      setApiTestLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await axios.post('http://localhost:8000/chat', {
        message: userMsg.content,
        history,
      });

      const data = res.data;
      const agentMsg: Message = {
        role: 'agent',
        content: data.reply || data.summary,
        action: data.action,
        trace: data.trace,
        commands: data.commands,
        results: data.results,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, agentMsg]);

      const newTrace: TraceRecord = {
        key: traces.length + 1,
        index: traces.length + 1,
        input: userMsg.content,
        tokens: data.trace?.token_usage?.total_tokens || 0,
        latency: `${((data.latency_ms || data.trace?.latency_ms || 0) / 1000).toFixed(1)}s`,
        trace: { ...data, user_input: userMsg.content },
      };
      setTraces(prev => [...prev, newTrace]);
    } catch (e) {
      console.error(e);
      const errorMsg: Message = {
        role: 'agent',
        content: '连接服务器失败',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const traceColumns: ColumnsType<TraceRecord> = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 70 },
    { title: '输入', dataIndex: 'input', key: 'input', ellipsis: true },
    { title: 'Token', dataIndex: 'tokens', key: 'tokens', width: 80 },
    { title: '延迟', dataIndex: 'latency', key: 'latency', width: 80 },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => { setSelectedTrace(record.trace); setTraceModalOpen(true); }}>
          查看
        </Button>
      ),
    },
  ];

  const intentColumns: ColumnsType<IntentRecord> = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 70 },
    { title: '领域 Domain', dataIndex: 'domain', key: 'domain', width: 100 },
    { title: '能力 Ability', dataIndex: 'ability', key: 'ability', width: 120, ellipsis: true },
    { title: '功能 Feature', dataIndex: 'feature', key: 'feature', width: 140, ellipsis: true },
    { title: '意图 Intent', dataIndex: 'intent', key: 'intent', ellipsis: true },
    { title: '查询示例 Query', dataIndex: 'query', key: 'query', ellipsis: true },
  ];

  const tabItems = [
    {
      key: 'chat',
      label: '对话',
      children: (
        <div className="chat-wrapper">
          <div className="chat-container">
            <div className="chat-header">
              <div className="chat-header-avatar">
                <RobotOutlined />
              </div>
              <div className="chat-header-info">
                <h3>车载语音助手</h3>
              </div>
            </div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <MessageOutlined className="chat-empty-icon" />
                  <p>发送消息开始对话</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`message-item message-${msg.role}`}>
                      <div className="message-avatar">
                        {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                      </div>
                      <div className="message-content">
                        <div className="message-bubble">
                          {msg.content}
                          {msg.role === 'agent' && msg.results && msg.results.length > 0 && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                              {msg.results.map((r: any, i: number) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 }}>
                                  <Tag color="blue" style={{ margin: 0 }}>{r.module}</Tag>
                                  <span style={{ color: '#666' }}>{r.intent}</span>
                                  <Tag color="green" style={{ margin: 0 }}>{r.action}</Tag>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="message-time">{msg.timestamp}</div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="thinking-wrapper">
                      <div className="thinking-avatar">
                        <RobotOutlined />
                      </div>
                      <div className="thinking-bubble">
                        <span className="thinking-text">思考中</span>
                        <div className="thinking-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            <div className="chat-footer">
              <div className="chat-input-area">
                <TextArea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="输入指令..."
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  style={{ flex: 1, borderRadius: 20 }}
                />
                <Button 
                  type="primary" 
                  shape="circle"
                  icon={<SendOutlined />} 
                  onClick={handleSend} 
                  loading={loading}
                  size="large"
                />
              </div>
              <div className="quick-commands">
                {['打开空调，导航去公司', '播放音乐，温度调到26度', '打开车窗，关闭空调'].map((cmd) => (
                  <Tag 
                    key={cmd} 
                    className="quick-cmd-tag"
                    onClick={() => setInput(cmd)}
                  >
                    {cmd}
                  </Tag>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'trace',
      label: '思维链',
      children: (
        <div className="tab-content">
          <Table
            columns={traceColumns}
            dataSource={traces}
            pagination={false}
            scroll={{ y: 'calc(100vh - 280px)' }}
            size="small"
            locale={{ emptyText: '暂无记录，请先在对话中发送消息' }}
          />
        </div>
      ),
    },
    {
      key: 'knowledge',
      label: '知识库',
      children: (
        <div className="tab-content">
          {rules.length > 0 && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={`车辆控制规则 (${rules.length} 条)`}
              description={
                <div style={{ maxHeight: 120, overflow: 'auto' }}>
                  {rules.map((rule, idx) => (
                    <div key={idx} style={{ fontSize: 12, marginBottom: 4 }}>{rule}</div>
                  ))}
                </div>
              }
            />
          )}
          <Table
            columns={intentColumns}
            dataSource={intents}
            pagination={false}
            scroll={{ y: rules.length > 0 ? 'calc(100vh - 400px)' : 'calc(100vh - 280px)' }}
            size="small"
          />
        </div>
      ),
    },
    {
      key: 'api',
      label: 'API文档',
      children: (
        <div className="tab-content" style={{ padding: 16, overflow: 'auto', height: 'calc(100vh - 180px)' }}>
          <Typography.Title level={4}>接口文档 <Text type="secondary" style={{ fontSize: 14 }}>点击"测试"按钮可在线调试</Text></Typography.Title>
          
          {/* 接口列表 */}
          {API_ENDPOINTS.map((endpoint) => (
            <div key={endpoint.key} style={{ marginBottom: 16, padding: 16, background: endpoint.method === 'GET' ? '#fafafa' : '#e6f7ff', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span>
                  <Tag color={endpoint.method === 'GET' ? 'green' : 'blue'}>{endpoint.method}</Tag>
                  <Text strong style={{ fontSize: 15 }}>{endpoint.path}</Text>
                  <Text type="secondary" style={{ marginLeft: 12 }}>{endpoint.name}</Text>
                </span>
                <span>
                  {apiTestLatency[endpoint.key] > 0 && <Text type="secondary" style={{ marginRight: 12 }}>{apiTestLatency[endpoint.key]}ms</Text>}
                  <Button type="primary" onClick={() => runApiTest(endpoint)} loading={apiTestLoading[endpoint.key]}>测试</Button>
                </span>
              </div>
              
              {/* 接口说明 */}
              <div style={{ marginBottom: 12, padding: 12, background: '#fff', borderRadius: 4, border: '1px solid #e8e8e8', fontSize: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>说明：</Text>
                  <Text type="secondary">
                    {endpoint.key === 'health' && '检查服务是否正常运行'}
                    {endpoint.key === 'knowledge' && '返回知识库数据，包含规则和意图列表'}
                    {endpoint.key === 'logs' && '查询对话历史记录'}
                    {endpoint.key === 'chat' && '完整对话流程：自动识别多指令 → 分发到各模块 → 返回执行结果'}
                    {endpoint.key === 'recognize' && '阶段1-模块识别：将用户输入拆分为多条指令，识别所属模块'}
                    {endpoint.key === 'execute' && '阶段2-执行命令：根据模块和指令，生成动作代码和回复'}
                  </Text>
                </div>
                
                <div style={{ marginBottom: 8 }}>
                  <Text strong>请求参数：</Text>
                  <Text>
                    {endpoint.key === 'health' && '无'}
                    {endpoint.key === 'knowledge' && '无'}
                    {endpoint.key === 'logs' && 'limit (可选，默认50)'}
                    {endpoint.key === 'chat' && 'message: string (用户输入), history: array (对话历史，可选)'}
                    {endpoint.key === 'recognize' && 'message: string (用户输入，支持多指令如"打开空调，导航去公司")'}
                    {endpoint.key === 'execute' && 'commands: array [{module: "AC"|"NAV"|..., text: "指令文本"}]'}
                  </Text>
                </div>
                
                <div>
                  <Text strong>响应字段：</Text>
                  <Text>
                    {endpoint.key === 'health' && 'status, service'}
                    {endpoint.key === 'knowledge' && 'rules: string[], intents: [{domain, ability, feature, intent, query}]'}
                    {endpoint.key === 'logs' && '[{id, user_input, intent_detected, latency_ms, created_at}]'}
                    {endpoint.key === 'chat' && 'commands[], results[], summary, reply, latency_ms, log_id'}
                    {endpoint.key === 'recognize' && 'commands: [{index, module, text, confidence}], latency_ms'}
                    {endpoint.key === 'execute' && 'results: [{index, module, intent, params, action, reply}], summary, latency_ms'}
                  </Text>
                </div>
              </div>
              
              {endpoint.method === 'POST' && (
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>请求体:</Text>
                  <TextArea
                    value={apiTestBody[endpoint.key] ?? endpoint.body ?? ''}
                    onChange={(e) => setApiTestBody(prev => ({ ...prev, [endpoint.key]: e.target.value }))}
                    rows={6}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                </div>
              )}
              
              {apiTestResponse[endpoint.key] && (
                <div>
                  <Text strong style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>响应结果:</Text>
                  <pre style={{ margin: 0, padding: 12, background: '#1f1f1f', color: '#0f0', borderRadius: 4, fontSize: 12, maxHeight: 250, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {apiTestResponse[endpoint.key]}
                  </pre>
                </div>
              )}
            </div>
          ))}

          {/* 模块说明 */}
          <Typography.Title level={5}>支持的模块</Typography.Title>
          <Table
            columns={[
              { title: '模块', dataIndex: 'module', key: 'module', width: 100 },
              { title: '代码', dataIndex: 'code', key: 'code', width: 80, render: (t: string) => <Tag color="purple">{t}</Tag> },
              { title: '功能', dataIndex: 'features', key: 'features' },
              { title: '动作代码示例', dataIndex: 'actions', key: 'actions', render: (t: string) => <Text code style={{ fontSize: 11 }}>{t}</Text> },
            ]}
            dataSource={[
              { key: 1, module: '空调控制', code: 'AC', features: '开关、温度、风量、制冷/制热、除霜除雾', actions: 'AC_ON, AC_OFF, TEMP_SET_26, TEMP_UP' },
              { key: 2, module: '导航', code: 'NAV', features: '目的地导航、回家、去公司、搜索POI', actions: 'NAV_TO, NAV_HOME, NAV_COMPANY, NAV_SEARCH' },
              { key: 3, module: '媒体', code: 'MEDIA', features: '播放/暂停、上下首、音量、电台', actions: 'MEDIA_PLAY, MEDIA_PAUSE, VOL_UP, VOL_DOWN' },
              { key: 4, module: '座椅', code: 'SEAT', features: '加热、通风、按摩、位置调节', actions: 'SEAT_HEAT_ON, SEAT_VENT_ON, SEAT_MASSAGE_ON' },
              { key: 5, module: '车窗', code: 'WINDOW', features: '车窗开关、天窗控制', actions: 'WINDOW_OPEN, WINDOW_CLOSE, SUNROOF_OPEN' },
              { key: 6, module: '灯光', code: 'LIGHT', features: '近光灯、远光灯、雾灯、氛围灯', actions: 'LIGHT_ON, LIGHT_HIGH, AMBIENT_ON' },
            ]}
            pagination={false}
            size="small"
          />

          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => window.open('http://localhost:8000/docs', '_blank')}>
              查看 Swagger 文档
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="app-container">
      <div className="app-wrapper">
        <div className="app-header">
          <h1>车载语音助手</h1>
        </div>
        <div className="app-content">
          <Tabs items={tabItems} style={{ height: '100%' }} tabBarStyle={{ padding: '0 16px' }} />
        </div>
      </div>

      <Modal
        title="思维链详情"
        open={traceModalOpen}
        onCancel={() => setTraceModalOpen(false)}
        footer={null}
        width={900}
      >
        {selectedTrace && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="用户输入">{selectedTrace.user_input}</Descriptions.Item>
            <Descriptions.Item label="延迟">{((selectedTrace.latency_ms || 0) / 1000).toFixed(2)}s</Descriptions.Item>
            <Descriptions.Item label="识别指令">
              {selectedTrace.commands?.map((cmd: any, i: number) => (
                <Tag key={i} color="blue" style={{ marginBottom: 4 }}>[{cmd.module}] {cmd.text}</Tag>
              )) || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="执行结果">
              {selectedTrace.results?.map((r: any, i: number) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <Tag color="blue">{r.module}</Tag>
                  <Tag color="purple">{r.intent}</Tag>
                  <Tag color="green">{r.action}</Tag>
                  <span style={{ color: '#666', fontSize: 12 }}>{r.reply}</span>
                </div>
              )) || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="合并回复">{selectedTrace.summary || selectedTrace.reply}</Descriptions.Item>
            <Descriptions.Item label="完整响应">
              <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                {JSON.stringify(selectedTrace, null, 2)}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="cURL">
              <div style={{ position: 'relative' }}>
                <CopyOutlined 
                  style={{ position: 'absolute', right: 8, top: 8, cursor: 'pointer', color: '#aaa', fontSize: 14, zIndex: 1 }}
                  onClick={() => {
                    const curlCmd = `curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d '${JSON.stringify({ message: selectedTrace.user_input, history: [] })}'`;
                    navigator.clipboard.writeText(curlCmd);
                    message.success('已复制');
                  }}
                />
                <pre style={{ maxHeight: 120, overflow: 'auto', background: '#1f1f1f', color: '#fff', padding: 8, paddingRight: 30, borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
{`curl -X POST http://localhost:8000/chat \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ message: selectedTrace.user_input, history: [] })}'`}
                </pre>
              </div>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default App;
