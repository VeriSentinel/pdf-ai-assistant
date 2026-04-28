import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, ChevronDown, BookOpen, Cpu, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askQuestion, exportHistory } from '../services/api';

/* ─── Sub-components ─── */

function TypingIndicator() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div className="typing-dots"><span/><span/><span/></div>
      <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>Thinking…</span>
    </div>
  );
}

function SourceCard({ source, index }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(o => !o)}
      style={{
        width:'100%', textAlign:'left', borderRadius:8, padding:'6px 10px',
        background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
        cursor:'pointer', marginBottom:4, transition:'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.14)'}
      onMouseLeave={e => e.currentTarget.style.background='rgba(99,102,241,0.08)'}
    >
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <BookOpen size={10} color="var(--accent-light)" />
        <span style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--accent-light)' }}>
          Source {index + 1}
        </span>
        <span style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginLeft:'auto' }}>
          {Math.round((source.score || 0) * 100)}% match
        </span>
        <ChevronDown size={10} color="var(--text-muted)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }} />
      </div>
      {open && (
        <p style={{ fontSize:'0.72rem', color:'var(--text-secondary)', lineHeight:1.6, marginTop:5 }}>
          {source.text}
        </p>
      )}
    </button>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity:0, y:8 }}
      animate={{ opacity:1, y:0 }}
      style={{
        display:'flex', gap:10,
        flexDirection: isUser ? 'row-reverse' : 'row',
        marginBottom:14,
      }}
    >
      {/* Avatar */}
      <div style={{
        width:28, height:28, borderRadius:9, flexShrink:0, marginTop:2,
        background: isUser
          ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
          : 'linear-gradient(135deg,#06b6d4,#0284c7)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        {isUser ? <User size={13} color="white" /> : <Bot size={13} color="white" />}
      </div>

      {/* Bubble + extras */}
      <div style={{
        flex:1, maxWidth:'85%',
        display:'flex', flexDirection:'column',
        alignItems: isUser ? 'flex-end' : 'flex-start', gap:5,
      }}>
        <div style={{
          padding:'10px 14px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser
            ? 'linear-gradient(135deg,rgba(99,102,241,0.28),rgba(79,70,229,0.2))'
            : 'rgba(255,255,255,0.05)',
          border: isUser
            ? '1px solid rgba(99,102,241,0.3)'
            : '1px solid rgba(255,255,255,0.08)',
        }}>
          {isUser ? (
            <p style={{ fontSize:'0.85rem', color:'var(--text-primary)', lineHeight:1.6 }}>{msg.content}</p>
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
          <div style={{
            display:'flex', alignItems:'center', gap:4, padding:'2px 7px',
            borderRadius:20, background:'rgba(6,182,212,0.1)',
          }}>
            <Cpu size={9} color="#22d3ee" />
            <span style={{ fontSize:'0.65rem', color:'#67e8f9' }}>
              {msg.model.split('/').pop()?.replace(':free','')}
            </span>
          </div>
        )}

        {/* Sources */}
        {!isUser && msg.sources?.length > 0 && (
          <div style={{ width:'100%' }}>
            <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginBottom:4 }}>📚 Sources used</p>
            {msg.sources.map((s, i) => <SourceCard key={i} source={s} index={i} />)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main component ─── */
export default function ChatInterface({ sessionId, pdfInfo, pendingQuestion, onQuestionHandled }) {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  // Welcome message when session opens
  useEffect(() => {
    if (sessionId) {
      setMessages([{
        id:'welcome', role:'assistant',
        content:`👋 **Hello!** I've analysed **${pdfInfo?.filename || 'your PDF'}** — ${pdfInfo?.pages || '?'} pages, ~${pdfInfo?.wordCount?.toLocaleString() || '?'} words.\n\nClick a suggested question or ask me anything about the document!`,
        sources:[],
      }]);
    }
  }, [sessionId]);

  // Handle question clicked in QuestionPanel
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

    const userId  = Date.now();
    const aiId    = Date.now() + 1;

    setMessages(prev => [
      ...prev,
      { id:userId, role:'user',      content:question },
      { id:aiId,   role:'assistant', content:'', loading:true, sources:[], model:'' },
    ]);
    setIsLoading(true);

    let fullContent = '';
    let sources     = [];
    let model       = '';

    try {
      await askQuestion(sessionId, question, {
        onToken:  (tok) => {
          fullContent += tok;
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, content:fullContent, loading:false } : m
          ));
        },
        onSources: (s) => {
          sources = s;
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, sources } : m));
        },
        onModel: (mdl) => {
          model = mdl;
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, model } : m));
        },
        onError: (err) => {
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleExport = () => {
    if (historyRef.current.length > 0) exportHistory(historyRef.current, pdfInfo?.filename);
  };

  const userQCount = messages.filter(m => m.role === 'user').length;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'8px 14px', borderBottom:'1px solid var(--border)',
        flexShrink:0, background:'rgba(255,255,255,0.01)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Bot size={14} color="var(--accent-cyan)" />
          <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-primary)' }}>AI Chat</span>
          {userQCount > 0 && (
            <span style={{
              fontSize:'0.68rem', padding:'1px 7px', borderRadius:20,
              background:'rgba(6,182,212,0.15)', color:'#22d3ee',
            }}>{userQCount} questions</span>
          )}
        </div>
        {historyRef.current.length > 0 && (
          <button onClick={handleExport} style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'4px 10px', borderRadius:8, fontSize:'0.72rem',
            fontWeight:600, cursor:'pointer',
            background:'rgba(99,102,241,0.15)',
            border:'1px solid rgba(99,102,241,0.25)',
            color:'var(--accent-light)', transition:'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(99,102,241,0.15)'}
          >
            <Download size={11} /> Export
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 4px' }}>
        <AnimatePresence>
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding:'10px 12px 12px',
        borderTop:'1px solid var(--border)',
        flexShrink:0,
        background:'rgba(8,8,24,0.6)',
      }}>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your PDF…"
            disabled={isLoading}
            rows={1}
            style={{
              flex:1, resize:'none', borderRadius:12,
              padding:'10px 14px', fontSize:'0.85rem',
              outline:'none', lineHeight:1.55,
              background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.1)',
              color:'var(--text-primary)',
              transition:'border-color 0.15s',
              maxHeight:120, overflowY:'auto',
            }}
            onFocus={e  => e.currentTarget.style.borderColor='rgba(99,102,241,0.5)'}
            onBlur={e   => e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}
          />
          <motion.button
            whileTap={{ scale:0.93 }}
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="btn-glow"
            style={{ width:42, height:42, borderRadius:12, flexShrink:0 }}
          >
            <Send size={15} />
          </motion.button>
        </div>
        <p style={{ textAlign:'center', fontSize:'0.65rem', color:'var(--text-muted)', marginTop:5 }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
