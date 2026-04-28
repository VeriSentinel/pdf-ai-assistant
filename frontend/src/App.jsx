import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, MessageSquare, Sparkles, Upload } from 'lucide-react';
import UploadZone from './components/UploadZone';
import PDFViewer from './components/PDFViewer';
import QuestionPanel from './components/QuestionPanel';
import ChatInterface from './components/ChatInterface';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const TABS = [
  { id: 'viewer',    label: 'PDF',       icon: FileText },
  { id: 'questions', label: 'Questions', icon: Sparkles },
  { id: 'chat',      label: 'Chat',      icon: MessageSquare },
];

export default function App() {
  const [pdfFile,         setPdfFile]         = useState(null);
  const [pdfInfo,         setPdfInfo]          = useState(null);
  const [sessionId,       setSessionId]        = useState(null);
  const [pendingQuestion, setPendingQuestion]  = useState(null);
  const [activeTab,       setActiveTab]        = useState('viewer');

  const handleUploadSuccess = (data, file) => {
    setSessionId(data.sessionId);
    setPdfInfo(data);
    if (file) setPdfFile(file);
    setActiveTab('questions');
  };

  const handleSelectQuestion = (q) => {
    setPendingQuestion(q);
    setActiveTab('chat');
  };

  const handleReset = () => {
    setPdfFile(null);
    setPdfInfo(null);
    setSessionId(null);
    setPendingQuestion(null);
    setActiveTab('viewer');
  };

  return (
    <div className="app-shell">
      {/* Ambient background */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* ── Header ── */}
      <header className="app-header">
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{
            width:32, height:32, borderRadius:10, flexShrink:0,
            background:'linear-gradient(135deg,#6366f1,#22d3ee)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <FileText size={16} color="white" />
          </div>
          <div>
            <div className="gradient-text" style={{ fontWeight:700, fontSize:'0.95rem', lineHeight:1 }}>
              PDF AI Assistant
            </div>
            <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', lineHeight:1.3 }}>
              Powered by Claude &amp; OpenRouter
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {pdfInfo && (
            <div style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'4px 10px', borderRadius:8, fontSize:'0.72rem',
              background:'rgba(34,211,238,0.1)',
              border:'1px solid rgba(34,211,238,0.2)',
              color:'#67e8f9', maxWidth:180,
            }}>
              <FileText size={11} />
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {pdfInfo.filename}
              </span>
            </div>
          )}
          {sessionId && (
            <button
              onClick={handleReset}
              style={{
                display:'flex', alignItems:'center', gap:5,
                padding:'5px 10px', borderRadius:8, fontSize:'0.72rem',
                fontWeight:600, cursor:'pointer',
                background:'rgba(239,68,68,0.1)',
                border:'1px solid rgba(239,68,68,0.25)',
                color:'#f87171', transition:'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}
            >
              <Upload size={11} /> New PDF
            </button>
          )}
        </div>
      </header>

      {/* ── Main body ── */}
      <div className="app-body" style={{ position:'relative', zIndex:1 }}>
        <AnimatePresence mode="wait">
          {!sessionId ? (
            /* ── Upload page ── */
            <motion.div
              key="upload"
              initial={{ opacity:0, y:16 }}
              animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-16 }}
              style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}
            >
              <div className="upload-page">
                <UploadZone onUploadSuccess={handleUploadSuccess} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity:0 }}
              animate={{ opacity:1 }}
              style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}
            >
              {/* ── Mobile tab bar ── */}
              <div className="mobile-tabs">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <tab.icon size={13} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Desktop layout ── */}
              <div className="desktop-view" style={{ flex:1, overflow:'hidden' }}>
                {/* Left: PDF viewer */}
                <div className="panel-pdf">
                  <div className="panel-pdf-inner">
                    <PDFViewer file={pdfFile} pdfInfo={pdfInfo} />
                  </div>
                </div>

                {/* Right: Questions + Chat */}
                <div className="panel-right">
                  <div className="panel-questions">
                    <QuestionPanel
                      sessionId={sessionId}
                      onSelectQuestion={handleSelectQuestion}
                    />
                  </div>
                  <div className="panel-chat">
                    <ChatInterface
                      sessionId={sessionId}
                      pdfInfo={pdfInfo}
                      pendingQuestion={pendingQuestion}
                      onQuestionHandled={() => setPendingQuestion(null)}
                    />
                  </div>
                </div>
              </div>

              {/* ── Mobile tab views ── */}
              <div className="mobile-view">
                <AnimatePresence mode="wait">
                  {activeTab === 'viewer' && (
                    <motion.div key="m-pdf"
                      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}
                    >
                      <PDFViewer file={pdfFile} pdfInfo={pdfInfo} />
                    </motion.div>
                  )}
                  {activeTab === 'questions' && (
                    <motion.div key="m-q"
                      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}
                    >
                      <QuestionPanel
                        sessionId={sessionId}
                        onSelectQuestion={handleSelectQuestion}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'chat' && (
                    <motion.div key="m-chat"
                      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}
                    >
                      <ChatInterface
                        sessionId={sessionId}
                        pdfInfo={pdfInfo}
                        pendingQuestion={pendingQuestion}
                        onQuestionHandled={() => setPendingQuestion(null)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
