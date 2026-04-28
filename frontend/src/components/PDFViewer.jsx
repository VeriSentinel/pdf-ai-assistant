import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const BTN = {
  width:28, height:28, borderRadius:7, border:'none', cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center',
  background:'rgba(255,255,255,0.05)', color:'var(--text-secondary)',
  transition:'all 0.15s', flexShrink:0,
};

export default function PDFViewer({ file, pdfInfo }) {
  const [numPages,   setNumPages]   = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale,      setScale]      = useState(1.0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const onLoadSuccess = ({ numPages }) => { setNumPages(numPages); setLoading(false); };
  const onLoadError   = () => { setError('PDF preview unavailable. Use the chat to ask questions.'); setLoading(false); };

  const btnHover = e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
  const btnLeave = e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Top bar */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'6px 12px', borderBottom:'1px solid var(--border)',
        flexShrink:0, background:'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
          <div style={{
            width:28, height:28, borderRadius:8, flexShrink:0,
            background:'rgba(99,102,241,0.18)', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <FileText size={13} color="var(--accent-light)" />
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {pdfInfo?.filename || 'Document'}
            </p>
            <p style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>
              {pdfInfo?.pages || numPages || '?'} pages · {pdfInfo?.wordCount?.toLocaleString() || '—'} words
            </p>
          </div>
        </div>

        {/* Zoom */}
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <button style={BTN} onClick={() => setScale(s => Math.max(0.5, s - 0.2))} onMouseEnter={btnHover} onMouseLeave={btnLeave} title="Zoom out">
            <ZoomOut size={12} />
          </button>
          <button style={{ ...BTN, width:'auto', padding:'0 7px', fontSize:'0.7rem', fontWeight:600 }}
            onClick={() => setScale(1)} onMouseEnter={btnHover} onMouseLeave={btnLeave} title="Reset zoom">
            {Math.round(scale * 100)}%
          </button>
          <button style={BTN} onClick={() => setScale(s => Math.min(2.5, s + 0.2))} onMouseEnter={btnHover} onMouseLeave={btnLeave} title="Zoom in">
            <ZoomIn size={12} />
          </button>
        </div>
      </div>

      {/* PDF canvas */}
      <div className="pdf-canvas-wrap">
        {error ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:32, textAlign:'center' }}>
            <div style={{ width:48, height:48, borderRadius:14, background:'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FileText size={22} color="#f87171" />
            </div>
            <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{error}</p>
          </div>
        ) : (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.35 }}>
            {loading && !file && (
              <div className="skeleton" style={{ width:380, height:520 }} />
            )}
            {file && (
              <Document file={file} onLoadSuccess={onLoadSuccess} onLoadError={onLoadError} loading={null}>
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                  loading={<div className="skeleton" style={{ width:380, height:520 }} />}
                />
              </Document>
            )}
            {!file && !loading && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:32, textAlign:'center' }}>
                <FileText size={40} color="var(--text-muted)" />
                <p style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>No preview available</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Page nav */}
      {numPages && numPages > 1 && (
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          padding:'7px 12px', borderTop:'1px solid var(--border)',
          flexShrink:0, background:'rgba(255,255,255,0.02)',
        }}>
          <button style={{ ...BTN, opacity: pageNumber <= 1 ? 0.3 : 1 }}
            disabled={pageNumber <= 1} onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            onMouseEnter={btnHover} onMouseLeave={btnLeave}>
            <ChevronLeft size={14} />
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input
              type="number" min={1} max={numPages} value={pageNumber}
              onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= numPages) setPageNumber(v); }}
              style={{
                width:44, textAlign:'center', borderRadius:7, fontSize:'0.8rem',
                padding:'3px 0', background:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(255,255,255,0.12)', color:'var(--text-primary)',
              }}
            />
            <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>/ {numPages}</span>
          </div>
          <button style={{ ...BTN, opacity: pageNumber >= numPages ? 0.3 : 1 }}
            disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
            onMouseEnter={btnHover} onMouseLeave={btnLeave}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
