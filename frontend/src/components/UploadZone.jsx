import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Zap, Brain, Search, FileOutput } from 'lucide-react';
import { uploadPDF } from '../services/api';

/* ─── Orbiting dots ─── */
function OrbitDot({ angle, radius, delay, size = 6, color = '#6366f1' }) {
  const style = {
    position:'absolute',
    width: size, height: size,
    borderRadius:'50%',
    background: color,
    boxShadow: `0 0 ${size + 4}px ${color}`,
    top:'50%', left:'50%',
    transformOrigin: `${-radius}px 0`,
    transform: `rotate(${angle}deg) translateX(-${radius}px)`,
    animation: `orbit-spin 4s linear ${delay}s infinite`,
  };
  return <div style={style} />;
}

/* ─── Features ─── */
const FEATURES = [
  { icon: Search,      label:'Smart Search',     color:'#6366f1' },
  { icon: Brain,       label:'AI Analysis',      color:'#a78bfa' },
  { icon: FileOutput,  label:'Export PDF & MD',  color:'#22d3ee' },
  { icon: Zap,         label:'Instant Answers',  color:'#f59e0b' },
];

export default function UploadZone({ onUploadSuccess }) {
  const [isDragging,  setIsDragging]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);
  const inputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File must be under 20 MB.');
      return;
    }
    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const data = await uploadPDF(file, (pct) => setProgress(pct));
      setSuccess(true);
      setTimeout(() => onUploadSuccess(data, file), 600);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed. Please try again.');
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer?.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onFileChange = (e) => { const f = e.target.files[0]; if (f) processFile(f); };

  return (
    <>
      {/* Orbit keyframes injected once */}
      <style>{`
        @keyframes orbit-spin {
          from { transform: rotate(var(--start, 0deg)) translateX(var(--r, -96px)); }
          to   { transform: rotate(calc(var(--start, 0deg) + 360deg)) translateX(var(--r, -96px)); }
        }
      `}</style>

      <div className="portal-wrap">
        {/* ── Brand tagline ── */}
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{delay:.1}}
          style={{textAlign:'center'}}>
          <div style={{
            fontFamily:"'Orbitron',sans-serif", fontWeight:900,
            fontSize:'clamp(1.4rem,4vw,2.2rem)', letterSpacing:'.05em',
            background:'linear-gradient(135deg,#6366f1,#a78bfa,#22d3ee)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            marginBottom:4,
          }}>VSAIMS AI Assistant</div>
          <p style={{ fontSize:'.78rem', color:'#6366f1', fontStyle:'italic' }}>
            Powered by VSAIMS LABS · Refining AI for human work
          </p>
        </motion.div>

        {/* ── Portal ring ── */}
        <motion.div initial={{opacity:0,scale:.85}} animate={{opacity:1,scale:1}} transition={{delay:.2,type:'spring'}}>
          <div
            className={`portal-ring-outer ${isDragging ? 'drag-over' : ''}`}
            onClick={() => !uploading && inputRef.current?.click()}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          >
            {/* Orbiting dots */}
            {[0,60,120,180,240,300].map((a,i) => (
              <div key={i} style={{
                position:'absolute', width:7, height:7, borderRadius:'50%',
                background:['#6366f1','#22d3ee','#a78bfa','#f59e0b','#22d3ee','#6366f1'][i],
                boxShadow:`0 0 10px ${'#6366f1'}`,
                top:'50%', left:'50%',
                animation:`orbit-spin ${3.5 + i*.3}s linear ${-i*.5}s infinite`,
                transformOrigin:`0 0`,
                transform:`rotate(${a}deg) translateX(115px) translateY(-3.5px)`,
                '--start':`${a}deg`, '--r':'-115px',
              }} />
            ))}

            {/* Inner portal */}
            <div className="portal-inner">
              <AnimatePresence mode="wait">
                {!uploading && !success && (
                  <motion.div key="idle"
                    initial={{opacity:0,scale:.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.8}}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}
                  >
                    <div className="portal-icon-wrap">
                      {isDragging
                        ? <Zap size={26} color="#22d3ee" />
                        : <Upload size={26} color="white" />}
                    </div>
                    <div style={{textAlign:'center'}}>
                      <p style={{fontSize:'.8rem',fontWeight:600,color:'#e2e8f0'}}>
                        {isDragging ? 'Release to Upload' : 'Drop PDF here'}
                      </p>
                      <p style={{fontSize:'.68rem',color:'#6366f1',marginTop:2}}>or click to browse</p>
                    </div>
                  </motion.div>
                )}

                {uploading && !success && (
                  <motion.div key="uploading"
                    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}
                  >
                    <Loader2 size={32} color="#6366f1" style={{animation:'spin 1s linear infinite'}} />
                    <div style={{textAlign:'center'}}>
                      <p style={{fontSize:'.8rem',fontWeight:600,color:'#e2e8f0'}}>Analysing PDF…</p>
                      <div style={{
                        marginTop:8, width:100, height:4, borderRadius:4,
                        background:'rgba(255,255,255,.1)',overflow:'hidden',
                      }}>
                        <motion.div
                          style={{height:'100%',borderRadius:4,background:'linear-gradient(90deg,#6366f1,#22d3ee)'}}
                          animate={{width:`${progress}%`}} transition={{duration:.3}}
                        />
                      </div>
                      <p style={{fontSize:'.68rem',color:'#6366f1',marginTop:4}}>{progress}%</p>
                    </div>
                  </motion.div>
                )}

                {success && (
                  <motion.div key="success"
                    initial={{opacity:0,scale:.8}} animate={{opacity:1,scale:1}}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}
                  >
                    <CheckCircle2 size={36} color="#22d3ee" />
                    <p style={{fontSize:'.8rem',fontWeight:600,color:'#22d3ee'}}>Ready!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{
                display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:10,
                background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',
                fontSize:'.78rem',color:'#fca5a5',maxWidth:360,textAlign:'center',
              }}
            >
              <AlertCircle size={14} color="#f87171" style={{flexShrink:0}} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── File size hint ── */}
        <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.4}}
          style={{fontSize:'.68rem',color:'#475569',textAlign:'center'}}>
          Supports PDF up to 20 MB · Any number of pages
        </motion.p>

        {/* ── Feature chips ── */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.5}}
          style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',maxWidth:380}}
        >
          {FEATURES.map(({ icon: Icon, label, color }) => (
            <div key={label} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'6px 12px', borderRadius:20,
              background:`rgba(${color==='#6366f1'?'99,102,241':color==='#a78bfa'?'167,139,250':color==='#22d3ee'?'34,211,238':'245,158,11'},.1)`,
              border:`1px solid ${color}30`,
              fontSize:'.72rem', fontWeight:500, color,
            }}>
              <Icon size={11}/>{label}
            </div>
          ))}
        </motion.div>
      </div>

      <input ref={inputRef} type="file" accept=".pdf,application/pdf"
        onChange={onFileChange} style={{display:'none'}} />
    </>
  );
}
