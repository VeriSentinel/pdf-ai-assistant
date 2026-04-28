import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { uploadPDF } from '../services/api';

export default function UploadZone({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFile = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be under 50MB.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const data = await uploadPDF(file, setProgress);
      setSuccess(true);
      setTimeout(() => {
        onUploadSuccess(data, file);
        setSuccess(false);
        setUploading(false);
        setProgress(0);
      }, 800);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
      setUploading(false);
      setProgress(0);
    }
  }, [onUploadSuccess]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const onInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #22d3ee)' }}>
            <FileText size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">PDF AI Assistant</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Upload a PDF and let AI answer your questions
        </p>
      </motion.div>

      {/* Drop Zone */}
      <motion.label
        htmlFor="pdf-upload-input"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className="w-full max-w-lg cursor-pointer"
        style={{ display: 'block' }}
      >
        <motion.div
          animate={{
            borderColor: isDragging ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.1)',
            background: isDragging
              ? 'rgba(99,102,241,0.1)'
              : 'rgba(255,255,255,0.03)',
            boxShadow: isDragging
              ? '0 0 40px rgba(99,102,241,0.2), inset 0 0 40px rgba(99,102,241,0.05)'
              : '0 0 0px transparent',
          }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-5 text-center"
          style={{
            borderColor: 'rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-4 w-full"
              >
                {success ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <CheckCircle2 size={48} style={{ color: '#22d3ee' }} />
                  </motion.div>
                ) : (
                  <Loader2 size={48} className="animate-spin" style={{ color: '#6366f1' }} />
                )}
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {success ? 'Processing complete!' : 'Processing PDF...'}
                </p>
                {!success && (
                  <div className="w-full max-w-xs">
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      <span>Uploading & analyzing</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #6366f1, #22d3ee)' }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(34,211,238,0.15))' }}
                >
                  <Upload size={30} style={{ color: '#6366f1' }} />
                </motion.div>
                <div>
                  <p className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Drop your PDF here
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    or <span className="font-semibold" style={{ color: '#6366f1' }}>click to browse</span>
                  </p>
                </div>
                <p className="text-xs px-4 py-2 rounded-full" style={{
                  color: 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  Supports PDF up to 50MB • 100+ pages
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.label>

      <input
        id="pdf-upload-input"
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={onInputChange}
        disabled={uploading}
      />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature chips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap justify-center gap-3 mt-8"
      >
        {['🔍 Smart Search', '💬 AI Chat', '📋 Export Q&A', '⚡ Fast Analysis'].map(f => (
          <span key={f} className="text-xs px-3 py-1.5 rounded-full" style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
            color: '#a5b4fc',
          }}>{f}</span>
        ))}
      </motion.div>
    </div>
  );
}
