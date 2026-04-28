import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, ChevronDown, BookOpen, Cpu, Download, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askQuestion, exportHistory } from '../services/api';
import { exportQAasPDF } from '../utils/exportPDF';

/* ─── Typing indicator ─── */
function TypingIndicator() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div className="typing-dots"><span/><span/><span/></div>
      <span style={{ fontSize:'.72rem', color:'#475569' }}>VSAIMS AI is thinking…</span>
    </div>
  );
}

/* ─── Source card ─── */
function SourceCard({ source, index }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(o => !o)} style={{
      width:'100%', textAlign:'left', borderRadius:7, padding:'5px 9px',
      background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.18)',
      cursor:'pointer', marginBottom:3, transition:'all .15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,.14)'}
      onMouseLeave={e => e.currentTarget.style.background='rgba(99,102,241,.07)'}
    >
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        <BookOpen size={10} color="#a78bfa" />
        <span style={{ fontSize:'.68rem', fontWeight:600, color:'#a78bfa' }}>Source {index + 1}</span>
        <span style={{ fontSize:'.65rem', color:'#475569', marginLeft:'auto' }}>
          {Math.round((source.score || 0) * 100)}% match
        </span>
        <ChevronDown size={10} color="#475569"
          style={{ transform: open ? 'rotate(180deg)':'none', transition:'transform .2s' }} />
      </div>
      {open && <p style={{ fontSize:'.7rem', color:'#94a3b8', lineHeight:1.6, marginTop:5 }}>{source.text}</p>}
    </button>
  );
}

/* ─── Message bubble ─── */
function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', gap:9, flexDirection: isUser ? 'row-reverse':'row', marginBottom:14 }}>
      {/* Avatar */}
      <div style={{
        width:28, height:28, borderRadius:9, flexShrink:0, marginTop:2,
        background: isUser
          ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
          : 'linear-gradient(135deg,#06b6d4,#0284c7)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: isUser ? '0 0 10px rgba(99,102,241,.4)' : '0 0 10px rgba(6,182,212,.4)',
      }}>
        {isUser ? <User size={13} color="white" /> : <Bot size={13} color="white" />}
      </div>

      {/* Content */}
      <div style={{ flex:1, maxWidth:'86%', display:'flex', flexDirection:'column',
        alignItems: isUser ? 'flex-end':'flex-start', gap:5 }}>
        <div style={{
          padding:'9px 13px',
          borderRadius: isUser ? '15px 15px 4px 15px' : '15px 15px 15px 4px',
          background: isUser
            ? 'linear-gradient(135deg,rgba(99,102,241,.25),rgba(79,70,229,.18))'
            : 'rgba(255,255,255,.04)',
          border: isUser
            ? '1px solid rgba(99,102,241,.3)'
            : '1px solid rgba(255,255,255,.07)',
        }}>
          {isUser ? (
            <p style={{ fontSize:'.84rem', color:'#f1f5f9', lineHeight:1.6 }}>{msg.content}</p>
          ) : msg.loading ? (
            <TypingIndicator />
          ) : (
            <div className="md">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Model badge */}
        {!isUser && msg.model && (
          <div style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 7px',
            borderRadius:20, background:'rgba(6,182,212,.1)' }}>
            <Cpu size={9} color="#22d3ee" />
            <span style={{ fontSize:'.63rem', color:'#67e8f9' }}>
              {msg.model.split('/').pop()?.replace(':free','')}
            </span>
          </div>
        )}

        {/* Sources */}
        {!isUser && msg.sources?.length > 0 && (
          <div style={{ width:'100%' }}>
            <p style={{ fontSize:'.66rem', color:'#475569', marginBottom:4 }}>📚 Sources</p>
            {msg.sources.map((s, i) => <SourceCard key={i} source={s} index={i} />)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main component ─── */
export default function ChatInterface({ sessionId, pdfInfo, pendingQuestion, onQuestionHandled }) {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  // Welcome message
  useEffect(() => {
    if (sessionId) {
      setMessages([{
        id:'welcome', role:'assistant',
        content:`⚡ **VSAIMS AI is ready!** I've analysed **${pdfInfo?.filename || 'your PDF'}** — ${pdfInfo?.pages || '?'} pages, ~${pdfInfo?.wordCount?.toLocaleString() || '?'} words.\n\nClick a suggested question on the left, or type your own question below!`,
        sources:[],
      }]);
    }
  }, [sessionId]);

  // Handle question from QuestionPanel
  useEffect(() => {
    if (pendingQuestion && !isLoading) {
      handleSend(pendingQuestion);
      onQuestionHandled();
    }
  }, [pendingQuestion]);

  const handleSend = useCallback(async (overrideQ) => {
    const question = (overrideQ ?? input).trim();
    if (!question || isLoading) return;
    setInput('');

    const userId = Date.now(), aiId = Date.now() + 1;
    setMessages(prev => [
      ...prev,
      { id:userId, role:'user',      content:question },
      { id:aiId,   role:'assistant', content:'', loading:true, sources:[], model:'' },
    ]);
    setIsLoading(true);

    let fullContent = '', sources = [], model = '';
    try {
      await askQuestion(sessionId, question, {
        onToken:   tok => {
          fullContent += tok;
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content:fullContent, loading:false } : m));
        },
        onSources: s => {
          sources = s;
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, sources } : m));
        },
        onModel: mdl => {
          model = mdl;
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, model } : m));
        },
        onError: err => {
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, content:`❌ ${err}`, loading:false } : m
          ));
        },
      });
      historyRef.current.push({ question, answer:fullContent, sources });
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content:`❌ ${err.message}`, loading:false } : m
      ));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, sessionId]);

  const handleKeyDown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleExportPDF = () => { if (historyRef.current.length > 0) exportQAasPDF(historyRef.current, pdfInfo?.filename); };
  const handleExportMD  = () => { if (historyRef.current.length > 0) exportHistory(historyRef.current, pdfInfo?.filename); };

  const userQCount = messages.filter(m => m.role === 'user').length;

  const xBtnStyle = color => ({
    display:'flex', alignItems:'center', gap:4, padding:'3px 9px',
    borderRadius:7, fontSize:'.69rem', fontWeight:600, cursor:'pointer',
    background:`rgba(${color},.12)`, border:`1px solid rgba(${color},.25)`,
    color:`rgb(${color})`, transition:'all .15s',
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'7px 12px', borderBottom:'1px solid var(--border)',
        flexShrink:0, background:'rgba(0,0,8,.5)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Bot size={14} color="#22d3ee" />
          <span style={{ fontSize:'.8rem', fontWeight:600, color:'#e2e8f0' }}>VSAIMS Chat</span>
          {userQCount > 0 && (
            <span style={{ fontSize:'.65rem', padding:'1px 7px', borderRadius:20,
              background:'rgba(34,211,238,.13)', color:'#22d3ee' }}>{userQCount} Q</span>
          )}
        </div>
        {historyRef.current.length > 0 && (
          <div style={{ display:'flex', gap:5 }}>
            <button onClick={handleExportPDF}
              style={xBtnStyle('167,139,250')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(167,139,250,.12)'}
            ><FileText size={10}/> PDF</button>
            <button onClick={handleExportMD}
              style={xBtnStyle('99,102,241')}
              onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(99,102,241,.12)'}
            ><Download size={10}/> MD</button>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 12px 4px' }}>
        <AnimatePresence>
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div style={{ padding:'8px 10px 10px', borderTop:'1px solid var(--border)',
        flexShrink:0, background:'rgba(0,0,8,.6)' }}>
        <div style={{ display:'flex', gap:7, alignItems:'flex-end' }}>
          <textarea ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask anything about your PDF…"
            disabled={isLoading} rows={1}
            style={{
              flex:1, resize:'none', borderRadius:11, padding:'9px 13px',
              fontSize:'.84rem', outline:'none', lineHeight:1.55,
              background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)',
              color:'#f1f5f9', transition:'border-color .15s', maxHeight:110, overflowY:'auto',
            }}
            onFocus={e => e.currentTarget.style.borderColor='rgba(99,102,241,.5)'}
            onBlur={e  => e.currentTarget.style.borderColor='rgba(255,255,255,.1)'}
          />
          <motion.button whileTap={{ scale:.93 }} onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="btn-glow"
            style={{ width:40, height:40, borderRadius:11, flexShrink:0 }}>
            <Send size={14} />
          </motion.button>
        </div>
        <p style={{ textAlign:'center', fontSize:'.62rem', color:'#334155', marginTop:4 }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
