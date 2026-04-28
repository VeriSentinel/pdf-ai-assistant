import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, ChevronRight, MessageSquare } from 'lucide-react';
import { generateQuestions } from '../services/api';

const ICONS = ['🔍','📌','💡','🎯','📊','🧠','❓','🔬'];

export default function QuestionPanel({ sessionId, onSelectQuestion }) {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (sessionId) fetchQuestions();
  }, [sessionId]);

  async function fetchQuestions() {
    setLoading(true);
    setError('');
    try {
      const qs = await generateQuestions(sessionId);
      setQuestions(qs);
    } catch (err) {
      console.error('Question gen error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Panel header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'8px 14px', borderBottom:'1px solid var(--border)',
        flexShrink:0, background:'rgba(255,255,255,0.01)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Sparkles size={14} color="var(--accent)" />
          <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-primary)' }}>
            Suggested Questions
          </span>
          {questions.length > 0 && !loading && (
            <span style={{
              fontSize:'0.68rem', fontWeight:600, padding:'1px 7px',
              borderRadius:20, background:'rgba(99,102,241,0.2)', color:'var(--accent-light)',
            }}>{questions.length}</span>
          )}
        </div>
        {questions.length > 0 && !loading && (
          <button
            onClick={fetchQuestions}
            title="Regenerate"
            style={{
              width:26, height:26, borderRadius:7, border:'none',
              background:'rgba(255,255,255,0.05)', color:'var(--text-secondary)',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
          >
            <RefreshCw size={11} />
          </button>
        )}
      </div>

      {/* Scrollable list */}
      <div style={{ flex:1, overflowY:'auto', padding:'8px 10px' }}>
        <AnimatePresence mode="wait">

          {loading && (
            <motion.div key="skel" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{
                  height:48, marginBottom:6, animationDelay:`${i*0.1}s`
                }} />
              ))}
            </motion.div>
          )}

          {!loading && error && (
            <motion.div key="err" initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'24px 8px', textAlign:'center' }}>
              <MessageSquare size={22} color="var(--text-muted)" />
              <p style={{ fontSize:'0.78rem', color:'var(--text-secondary)', lineHeight:1.5 }}>{error}</p>
              <button onClick={fetchQuestions} style={{
                fontSize:'0.75rem', padding:'5px 14px', borderRadius:8, cursor:'pointer',
                background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.3)',
                color:'var(--accent-light)',
              }}>Retry</button>
            </motion.div>
          )}

          {!loading && !error && questions.length === 0 && (
            <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ textAlign:'center', padding:'24px 8px' }}>
              <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>No questions yet</p>
            </motion.div>
          )}

          {!loading && questions.length > 0 && (
            <motion.div key="list" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              {questions.map((q, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity:0, x:-8 }}
                  animate={{ opacity:1, x:0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => onSelectQuestion(q)}
                  style={{
                    width:'100%', textAlign:'left', marginBottom:5,
                    padding:'8px 10px', borderRadius:10, cursor:'pointer',
                    background:'rgba(255,255,255,0.03)',
                    border:'1px solid rgba(255,255,255,0.07)',
                    display:'flex', alignItems:'flex-start', gap:8,
                    transition:'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                  }}
                >
                  <span style={{ fontSize:'0.9rem', flexShrink:0, marginTop:1 }}>{ICONS[i % ICONS.length]}</span>
                  <span style={{ fontSize:'0.77rem', color:'var(--text-secondary)', lineHeight:1.5, flex:1 }}>{q}</span>
                  <ChevronRight size={11} color="var(--accent)" style={{ flexShrink:0, marginTop:3, opacity:0.6 }} />
                </motion.button>
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
