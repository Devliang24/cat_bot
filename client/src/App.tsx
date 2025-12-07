import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tabs, Table, Modal, Input, Button, Tag, Typography, Descriptions, Alert } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, MessageOutlined, CopyOutlined, GlobalOutlined, UploadOutlined, DownloadOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Upload, Popconfirm } from 'antd';
import { message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import { messages as i18nMessages } from './i18n';
import type { Lang } from './i18n';
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
  latency?: number;
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
  { key: 'chat', method: 'POST', path: '/chat', name: '完整对话', body: JSON.stringify({ message: "打开空调，导航去公司，播放音乐", history: [] }, null, 2) },
  { key: 'recognize', method: 'POST', path: '/chat/recognize', name: '模块识别', body: JSON.stringify({ message: "打开空调，导航去公司" }, null, 2) },
  { key: 'execute', method: 'POST', path: '/chat/execute', name: '执行命令', body: JSON.stringify({ commands: [{ module: "AC", text: "打开空调" }, { module: "NAV", text: "导航去公司" }] }, null, 2) },
];

const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>('en');
  const t = useCallback((key: string) => i18nMessages[lang][key] || key, [lang]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('打开空调，导航去公司，播放音乐');
  const [loading, setLoading] = useState(false);
  const [traces, setTraces] = useState<TraceRecord[]>([]);
  const [traceFilter, setTraceFilter] = useState<{type: string, module: string, keyword: string}>({type: '', module: '', keyword: ''});
  const [intents, setIntents] = useState<IntentRecord[]>([]);
  const [intentFilter, setIntentFilter] = useState<{ability: string, feature: string, keyword: string}>({ability: '', feature: '', keyword: ''});
  const [rules, setRules] = useState<string[]>([]);
  const [traceModalOpen, setTraceModalOpen] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // API 测试相关状态
  const [apiTestBody, setApiTestBody] = useState<{[key: string]: string}>({});
  const [apiTestResponse, setApiTestResponse] = useState<{[key: string]: string}>({});
  const [apiTestLoading, setApiTestLoading] = useState<{[key: string]: boolean}>({});
  const [apiTestLatency, setApiTestLatency] = useState<{[key: string]: number}>({});
  
  // 文件管理相关状态
  interface KBFile { id: string; name: string; source: string; rules: number; intents: number; active: boolean; }
  const [kbFiles, setKbFiles] = useState<KBFile[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    loadKnowledgeBase();
    loadLogs();
    loadKBFiles();
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
        let traceData: any = { user_input: log.user_input, latency_ms: log.latency_ms };
        if (log.raw_response) {
          try {
            // 先尝试直接解析 JSON
            traceData = { ...JSON.parse(log.raw_response), user_input: log.user_input, latency_ms: log.latency_ms };
          } catch {
            try {
              // 兼容 Python dict 格式
              const jsonStr = log.raw_response.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null');
              traceData = { ...JSON.parse(jsonStr), user_input: log.user_input, latency_ms: log.latency_ms };
            } catch (e) {
              console.warn('Failed to parse raw_response', log.id, e);
            }
          }
        }
        return {
          key: log.id,
          index: idx + 1,
          input: log.user_input,
          tokens: traceData.token_usage?.total_tokens || 0,
          latency: `${((log.latency_ms || 0) / 1000).toFixed(1)}s`,
          trace: traceData,
        };
      });
      setTraces(logs);  // 后端已按倒序返回
    } catch (e) {
      console.error('Failed to load logs', e);
    }
  };

  // 加载知识库文件列表
  const loadKBFiles = async () => {
    try {
      const res = await axios.get('http://localhost:8000/knowledge/files');
      setKbFiles(res.data);
    } catch (e) {
      console.error('Failed to load KB files', e);
    }
  };

  // 上传知识库
  const handleUploadKB = async (file: File) => {
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('http://localhost:8000/knowledge/upload', formData);
      message.success(`${t('importSuccess')}: ${res.data.intents} ${t('intents')} (${res.data.duplicates_removed} ${t('duplicatesRemoved')})`);
      loadKBFiles();
      loadKnowledgeBase();
    } catch (e: any) {
      message.error(`${t('importFailed')}: ${e.response?.data?.detail || e.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  // 激活知识库
  const handleActivateKB = async (fileId: string) => {
    try {
      await axios.post(`http://localhost:8000/knowledge/activate/${fileId}`);
      message.success('Activated');
      loadKBFiles();
      loadKnowledgeBase();
    } catch (e: any) {
      message.error(e.response?.data?.detail || e.message);
    }
  };

  // 删除知识库
  const handleDeleteKB = async (fileId: string) => {
    try {
      await axios.delete(`http://localhost:8000/knowledge/files/${fileId}`);
      message.success('Deleted');
      loadKBFiles();
      loadKnowledgeBase();
    } catch (e: any) {
      message.error(e.response?.data?.detail || e.message);
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
      const res = await axios.post('http://localhost:8000/chat', {
        message: userMsg.content,
        history: [],  // 单轮对话
      });

      const data = res.data;
      const agentMsg: Message = {
        role: 'agent',
        content: data.reply || data.summary,
        action: data.action,
        trace: data.trace,
        commands: data.commands,
        results: data.results,
        latency: data.latency_ms,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, agentMsg]);

      setTraces(prev => {
        const newTrace: TraceRecord = {
          key: Date.now(),
          index: 1,
          input: userMsg.content,
          tokens: data.token_usage?.total_tokens || 0,
          latency: `${((data.latency_ms || 0) / 1000).toFixed(1)}s`,
          trace: { ...data, user_input: userMsg.content },
        };
        // 新记录插入到最前面，更新其他记录的 index
        return [newTrace, ...prev.map((t, i) => ({...t, index: i + 2}))];
      });
    } catch (e) {
      console.error(e);
      const errorMsg: Message = {
        role: 'agent',
        content: t('connectError'),
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const traceColumns: ColumnsType<TraceRecord> = [
    { title: '#', dataIndex: 'index', key: 'index', width: 60 },
    { title: t('input'), dataIndex: 'input', key: 'input', ellipsis: true },
    { 
      title: t('type'), 
      key: 'type', 
      width: 80,
      render: (_, record) => {
        const count = record.trace?.commands?.length || 0;
        return <Tag color={count > 1 ? 'blue' : 'default'}>{count > 1 ? t('multi') : t('single')}</Tag>;
      }
    },
    { 
      title: t('module'), 
      key: 'modules', 
      width: 120,
      render: (_, record) => {
        const modules = [...new Set((record.trace?.commands || []).map((c: any) => c.module))] as string[];
        return modules.map((m) => <Tag key={m} color="purple" style={{ marginBottom: 2 }}>{m}</Tag>);
      }
    },
    { title: t('token'), dataIndex: 'tokens', key: 'tokens', width: 70 },
    { title: t('delay'), dataIndex: 'latency', key: 'latency', width: 70 },
    {
      title: t('action'),
      key: 'action',
      width: 60,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => { setSelectedTrace(record.trace); setTraceModalOpen(true); }}>
          {t('view')}
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
      label: t('chat'),
      children: (
        <div className="chat-wrapper">
          <div className="chat-container">
            <div className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="chat-header-avatar">
                  <RobotOutlined />
                </div>
                <h3 style={{ margin: 0 }}>{t('title')}</h3>
              </div>
              {messages.length > 0 && (
                <Button size="small" type="text" style={{ color: 'rgba(255,255,255,0.8)' }} onClick={() => setMessages([])}>
                  {t('clearChat')}
                </Button>
              )}
            </div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <MessageOutlined className="chat-empty-icon" />
                  <p>{t('sendMessage')}</p>
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
                          {msg.role === 'agent' && msg.latency && (
                            <div style={{ marginTop: 6, fontSize: 11, color: '#999', textAlign: 'right' }}>
                              {t('latency')} {(msg.latency / 1000).toFixed(2)}s
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
                  placeholder={t('inputPlaceholder')}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  style={{ flex: 1, borderRadius: 20 }}
                />
                <Button 
                  type="primary" 
                  shape="circle"
                  icon={<SendOutlined />} 
                  onClick={handleSend} 
                  loading={loading}
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
      label: t('trace'),
      children: (
        <div className="tab-content">
          <div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
            <span>
              <Text style={{ marginRight: 8 }}>{t('type')}:</Text>
              <select 
                value={traceFilter.type} 
                onChange={(e) => setTraceFilter(prev => ({...prev, type: e.target.value}))}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }}
              >
                <option value="">{t('all')}</option>
                <option value="single">{t('single')}</option>
                <option value="multi">{t('multi')}</option>
              </select>
            </span>
            <span>
              <Text style={{ marginRight: 8 }}>{t('module')}:</Text>
              <select 
                value={traceFilter.module} 
                onChange={(e) => setTraceFilter(prev => ({...prev, module: e.target.value}))}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }}
              >
                <option value="">{t('all')}</option>
                <option value="AC">{t('moduleAC')}</option>
                <option value="SEAT">{t('moduleSEAT')}</option>
                <option value="WINDOW">{t('moduleWINDOW')}</option>
                <option value="LIGHT">{t('moduleLIGHT')}</option>
                <option value="MEDIA">{t('moduleMEDIA')}</option>
                <option value="NAV">{t('moduleNAV')}</option>
              </select>
            </span>
            <span>
              <Text style={{ marginRight: 8 }}>{t('search')}:</Text>
              <input 
                type="text"
                value={traceFilter.keyword} 
                onChange={(e) => setTraceFilter(prev => ({...prev, keyword: e.target.value}))}
                placeholder={t('search')}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9', width: 200 }}
              />
            </span>
            {(traceFilter.type || traceFilter.module || traceFilter.keyword) && (
              <Button size="small" onClick={() => setTraceFilter({type: '', module: '', keyword: ''})}>{t('clear')}</Button>
            )}
          </div>
          <Table
            columns={traceColumns}
            dataSource={traces.filter(t => {
              const cmdCount = t.trace?.commands?.length || 0;
              const modules = (t.trace?.commands || []).map((c: any) => c.module);
              if (traceFilter.type === 'single' && cmdCount !== 1) return false;
              if (traceFilter.type === 'multi' && cmdCount <= 1) return false;
              if (traceFilter.module && !modules.includes(traceFilter.module)) return false;
              if (traceFilter.keyword && !t.input.includes(traceFilter.keyword)) return false;
              return true;
            })}
            pagination={false}
            scroll={{ y: 'calc(100vh - 200px)' }}
            size="small"
            locale={{ emptyText: t('noRecord') }}
          />
        </div>
      ),
    },
    {
      key: 'knowledge',
      label: t('knowledge'),
      children: (
        <div className="tab-content">
          <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>
              <Text style={{ marginRight: 8 }}>{t('ability')}:</Text>
              <select 
                value={intentFilter.ability} 
                onChange={(e) => setIntentFilter(prev => ({...prev, ability: e.target.value, feature: ''}))}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9', minWidth: 120 }}
              >
                <option value="">{t('all')}</option>
                {[...new Set(intents.map(i => i.ability))].map(ability => (
                  <option key={ability} value={ability}>{ability}</option>
                ))}
              </select>
            </span>
            <span>
              <Text style={{ marginRight: 8 }}>{t('feature')}:</Text>
              <select 
                value={intentFilter.feature} 
                onChange={(e) => setIntentFilter(prev => ({...prev, feature: e.target.value}))}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9', maxWidth: 150 }}
              >
                <option value="">{t('all')}</option>
                {[...new Set(intents.filter(i => !intentFilter.ability || i.ability === intentFilter.ability).map(i => i.feature))].map(feature => (
                  <option key={feature} value={feature}>{feature.length > 10 ? feature.slice(0, 10) + '...' : feature}</option>
                ))}
              </select>
            </span>
            <span>
              <Text style={{ marginRight: 8 }}>{t('search')}:</Text>
              <input 
                type="text"
                value={intentFilter.keyword} 
                onChange={(e) => setIntentFilter(prev => ({...prev, keyword: e.target.value}))}
                placeholder={t('searchPlaceholder')}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9', width: 200 }}
              />
            </span>
            {(intentFilter.ability || intentFilter.feature || intentFilter.keyword) && (
              <Button size="small" onClick={() => setIntentFilter({ability: '', feature: '', keyword: ''})}>{t('clear')}</Button>
            )}
            <Text type="secondary" style={{ marginLeft: 'auto' }}>
              {(() => {
                const filtered = intents.filter(i => {
                  if (intentFilter.ability && i.ability !== intentFilter.ability) return false;
                  if (intentFilter.feature && i.feature !== intentFilter.feature) return false;
                  if (intentFilter.keyword && !i.intent.includes(intentFilter.keyword) && !i.query.includes(intentFilter.keyword)) return false;
                  return true;
                });
                return `${t('showing')} ${filtered.length} / ${intents.length} ${t('total')}`;
              })()}
            </Text>
          </div>
          <Table
            columns={intentColumns}
            dataSource={intents.filter(i => {
              if (intentFilter.ability && i.ability !== intentFilter.ability) return false;
              if (intentFilter.feature && i.feature !== intentFilter.feature) return false;
              if (intentFilter.keyword && !i.intent.includes(intentFilter.keyword) && !i.query.includes(intentFilter.keyword)) return false;
              return true;
            })}
            pagination={false}
            scroll={{ y: 'calc(100vh - 280px)' }}
            size="small"
          />
        </div>
      ),
    },
    {
      key: 'files',
      label: t('files'),
      children: (
        <div className="tab-content" style={{ padding: 16 }}>
          <div style={{ marginBottom: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={() => window.open('http://localhost:8000/knowledge/template', '_blank')}
            >
              {t('downloadTemplate')}
            </Button>
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={(file) => { handleUploadKB(file); return false; }}
            >
              <Button icon={<UploadOutlined />} loading={uploadLoading} type="primary">
                {t('importExcel')}
              </Button>
            </Upload>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={() => window.open('http://localhost:8000/knowledge/export', '_blank')}
            >
              {t('exportCurrent')}
            </Button>
          </div>
          <Table
            dataSource={kbFiles.map((f, i) => ({ ...f, key: f.id, index: i + 1 }))}
            columns={[
              { title: '#', dataIndex: 'index', key: 'index', width: 50 },
              { title: t('filename'), dataIndex: 'name', key: 'name' },
              { 
                title: t('source'), 
                dataIndex: 'source', 
                key: 'source',
                width: 100,
                render: (source: string) => (
                  <Tag color={source === 'System' ? 'blue' : 'green'}>{source === 'System' ? t('system') : t('imported')}</Tag>
                )
              },
              { 
                title: t('intents'), 
                dataIndex: 'intents',
                key: 'intents',
                width: 80,
              },
              {
                title: t('action'),
                key: 'action',
                width: 150,
                render: (_: any, record: KBFile) => (
                  <span>
                    {record.active ? (
                      <Tag color="green" icon={<CheckCircleOutlined />}>{t('active')}</Tag>
                    ) : (
                      <Button size="small" type="link" onClick={() => handleActivateKB(record.id)}>{t('use')}</Button>
                    )}
                    {record.source !== 'System' && (
                      <Popconfirm title={t('confirmDelete')} onConfirm={() => handleDeleteKB(record.id)}>
                        <Button size="small" type="link" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )}
                  </span>
                )
              }
            ]}
            pagination={false}
            size="small"
          />
        </div>
      ),
    },
    {
      key: 'api',
      label: t('api'),
      children: (
        <div className="tab-content" style={{ padding: 16, overflow: 'auto', height: 'calc(100vh - 180px)' }}>
          <Typography.Title level={4}>{t('apiTitle')} <Text type="secondary" style={{ fontSize: 14 }}>{t('apiTip')}</Text></Typography.Title>
          
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
          <h1>{t('title')}</h1>
          <Button 
            type="text" 
            icon={<GlobalOutlined />} 
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </Button>
        </div>
        <div className="app-content">
          <Tabs items={tabItems} style={{ height: '100%' }} tabBarStyle={{ padding: '0 16px' }} destroyInactiveTabPane={false} />
        </div>
      </div>

      <Modal
        title={t('traceDetail')}
        open={traceModalOpen}
        onCancel={() => setTraceModalOpen(false)}
        footer={null}
        width={900}
      >
        {selectedTrace && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t('userInput')}>{selectedTrace.user_input}</Descriptions.Item>
            <Descriptions.Item label={t('latency')}>{((selectedTrace.latency_ms || 0) / 1000).toFixed(2)}s</Descriptions.Item>
            <Descriptions.Item label={t('recognizedCommands')}>
              {selectedTrace.commands?.map((cmd: any, i: number) => (
                <Tag key={i} color="blue" style={{ marginBottom: 4 }}>[{cmd.module}] {cmd.text}</Tag>
              )) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('execResults')}>
              {selectedTrace.results?.map((r: any, i: number) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <Tag color="blue">{r.module}</Tag>
                  <Tag color="purple">{r.intent}</Tag>
                  <Tag color="green">{r.action}</Tag>
                  <span style={{ color: '#666', fontSize: 12 }}>{r.reply}</span>
                </div>
              )) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('mergedReply')}>{selectedTrace.summary || selectedTrace.reply}</Descriptions.Item>
            <Descriptions.Item label={t('fullResponse')}>
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
