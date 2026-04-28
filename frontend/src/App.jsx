import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, MessageSquare, Sparkles, Upload, Zap } from 'lucide-react';
import StarCanvas from './components/StarCanvas';
import UploadZone from './components/UploadZone';
import PDFViewer from './components/PDFViewer';
import QuestionPanel from './components/QuestionPanel';
import ChatInterface from './components/ChatInterface';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const TABS = [
  { id:'viewer',    label:'PDF',       icon: FileText },
  { id:'questions', label:'Questions', icon: Sparkles },
  { id:'chat',      label:'Chat',      icon: MessageSquare },
];

export default function App() {
  const [pdfFile,         setPdfFile]        = useState(null);
  const [pdfInfo,         setPdfInfo]        = useState(null);
  const [sessionId,       setSessionId]      = useState(null);
  const [pendingQuestion, setPendingQ]       = useState(null);
  const [activeTab,       setActiveTab]      = useState('viewer');

  const handleUploadSuccess = (data, file) => {
    setSessionId(data.sessionId);
    setPdfInfo(data);
    if (file) setPdfFile(file);
    setActiveTab('questions');
  };

  const handleSelectQuestion = (q) => {
    setPendingQ(q);
    setActiveTab('chat');
  };

  const handleReset = () => {
    setPdfFile(null); setPdfInfo(null);
    setSessionId(null); setPendingQ(null);
    setActiveTab('viewer');
  };

  return (
    <>
      {/* ── Animated starfield background ── */}
      <StarCanvas />

      <div className="app-shell">
        {/* ─── Header ─── */}
        <header className="app-header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Logo mark */}
            <div style={{
              width:38, height:38, borderRadius:12, flexShrink:0,
              background:'linear-gradient(135deg,#6366f1,#a78bfa,#22d3ee)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 0 20px rgba(99,102,241,.5)',
            }}>
              <Zap size={18} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                <span className="grad-text" style={{
                  fontFamily:"'Orbitron',sans-serif",
                  fontWeight:700, fontSize:'1rem', lineHeight:1, letterSpacing:'.04em',
                }}>VSAIMS</span>
                <span style={{ fontWeight:600, fontSize:'.9rem', color:'#e2e8f0', lineHeight:1 }}>
                  AI Assistant
                </span>
              </div>
              <div style={{ fontSize:'.62rem', color:'#6366f1', lineHeight:1.3, marginTop:2, fontStyle:'italic' }}>
                Powered by VSAIMS LABS · Refining AI for human work
              </div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {pdfInfo && (
              <div style={{
                display:'flex', alignItems:'center', gap:5,
                padding:'4px 10px', borderRadius:8, fontSize:'.72rem',
                background:'rgba(34,211,238,.1)', border:'1px solid rgba(34,211,238,.2)',
                color:'#67e8f9', maxWidth:180,
              }}>
                <FileText size={11} />
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {pdfInfo.filename}
                </span>
              </div>
            )}
            {sessionId && (
              <button onClick={handleReset} style={{
                display:'flex', alignItems:'center', gap:5,
                padding:'5px 10px', borderRadius:8, fontSize:'.72rem', fontWeight:600,
                cursor:'pointer', background:'rgba(239,68,68,.1)',
                border:'1px solid rgba(239,68,68,.25)', color:'#f87171',
                transition:'all .15s',
              }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,.2)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,.1)'}
              >
                <Upload size={11}/> New PDF
              </button>
            )}
          </div>
        </header>

        {/* ─── Body ─── */}
        <div className="app-body">
          <AnimatePresence mode="wait">
            {!sessionId ? (
              <motion.div key="upload"
                initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
                style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}
              >
                <div className="upload-page">
                  <UploadZone onUploadSuccess={handleUploadSuccess} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="workspace"
                initial={{ opacity:0 }} animate={{ opacity:1 }}
                style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}
              >
                {/* Mobile tabs */}
                <div className="mobile-tabs">
                  {TABS.map(t => (
                    <button key={t.id}
                      className={`tab-btn ${activeTab===t.id?'active':''}`}
                      onClick={()=>setActiveTab(t.id)}
                    >
                      <t.icon size={13}/>{t.label}
                    </button>
                  ))}
                </div>

                {/* Desktop layout */}
                <div className="desktop-view" style={{ flex:1, overflow:'hidden' }}>
                  <div className="panel-pdf">
                    <PDFViewer file={pdfFile} pdfInfo={pdfInfo} />
                  </div>
                  <div className="panel-right">
                    <div className="panel-questions">
                      <QuestionPanel sessionId={sessionId} onSelectQuestion={handleSelectQuestion} />
                    </div>
                    <div className="panel-chat">
                      <ChatInterface sessionId={sessionId} pdfInfo={pdfInfo}
                        pendingQuestion={pendingQuestion} onQuestionHandled={()=>setPendingQ(null)} />
                    </div>
                  </div>
                </div>

                {/* Mobile views */}
                <div className="mobile-view">
                  <AnimatePresence mode="wait">
                    {activeTab==='viewer' && (
                      <motion.div key="m-pdf" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
                        <PDFViewer file={pdfFile} pdfInfo={pdfInfo}/>
                      </motion.div>
                    )}
                    {activeTab==='questions' && (
                      <motion.div key="m-q" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
                        <QuestionPanel sessionId={sessionId} onSelectQuestion={handleSelectQuestion}/>
                      </motion.div>
                    )}
                    {activeTab==='chat' && (
                      <motion.div key="m-chat" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
                        <ChatInterface sessionId={sessionId} pdfInfo={pdfInfo}
                          pendingQuestion={pendingQuestion} onQuestionHandled={()=>setPendingQ(null)}/>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
