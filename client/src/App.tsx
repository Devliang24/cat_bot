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

  useEffect(() => {
    loadKnowledgeBase();
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
        content: data.reply,
        action: data.action,
        trace: data.trace,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, agentMsg]);

      const newTrace: TraceRecord = {
        key: traces.length + 1,
        index: traces.length + 1,
        input: userMsg.content,
        tokens: data.trace?.token_usage?.total_tokens || 0,
        latency: `${(data.trace?.latency_ms / 1000).toFixed(1)}s`,
        trace: data.trace,
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
                          {msg.role === 'agent' && msg.action && (
                            <div className="message-action">
                              <Tag color="orange" style={{ margin: 0 }}>{msg.action?.action || 'NONE'}</Tag>
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
                {['打开空调', '导航去公司', '播放音乐', '调高温度', '打开车窗'].map((cmd) => (
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
                <ul style={{ margin: 0, paddingLeft: 20, maxHeight: 120, overflow: 'auto' }}>
                  {rules.map((rule, idx) => (
                    <li key={idx} style={{ fontSize: 12 }}>{rule}</li>
                  ))}
                </ul>
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
            <Descriptions.Item label="Token 用量">
              输入: {selectedTrace.token_usage?.input_tokens || 0}, 
              输出: {selectedTrace.token_usage?.output_tokens || 0}, 
              总计: {selectedTrace.token_usage?.total_tokens || 0}
            </Descriptions.Item>
            <Descriptions.Item label="延迟">{(selectedTrace.latency_ms / 1000).toFixed(2)}s</Descriptions.Item>
            <Descriptions.Item label="原始响应">
              <pre style={{ maxHeight: 150, overflow: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                {selectedTrace.raw_response}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="完整 Prompt">
              <pre style={{ maxHeight: 'calc(100vh - 500px)', overflow: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                {selectedTrace.full_prompt}
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
