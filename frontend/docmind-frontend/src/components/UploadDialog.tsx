import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  X, Upload, FileText, CheckCircle, AlertCircle, Loader2, Plus,
  File, FileCode, FilePieChart, Trash2, Sparkles, Layers,
  FileSpreadsheet
} from 'lucide-react';
import { documentApi } from '../services/api';
import { useDocumentStore } from '../store/documentStore';
import type { UploadingFile } from '../types';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getFileTypeDetails(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return {
        icon: <FileText className="w-5 h-5 text-rose-400" />,
        badge: 'PDF',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      };
    case 'docx':
      return {
        icon: <File className="w-5 h-5 text-blue-400" />,
        badge: 'DOCX',
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      };
    case 'csv':
      return {
        icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
        badge: 'CSV',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      };
    case 'md':
      return {
        icon: <FileCode className="w-5 h-5 text-purple-400" />,
        badge: 'MD',
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      };
    case 'txt':
      return {
        icon: <FileText className="w-5 h-5 text-amber-400" />,
        badge: 'TXT',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      };
    default:
      return {
        icon: <FilePieChart className="w-5 h-5 text-slate-400" />,
        badge: ext?.toUpperCase() || 'FILE',
        color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
      };
  }
}

const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { fetchDocuments } = useDocumentStore();

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: UploadingFile[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      progress: 0,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;
    setIsUploading(true);

    await Promise.all(
      pending.map(async (uf) => {
        setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, status: 'uploading' } : f)));
        try {
          const res = await documentApi.upload(uf.file, (pct) => {
            setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, progress: pct } : f)));
          });
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uf.id ? { ...f, status: 'done', progress: 100, result: res.data } : f
            )
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, status: 'error', error: msg } : f)));
        }
      })
    );

    setIsUploading(false);
    await fetchDocuments();
    const successCount = files.filter((f) => f.status !== 'error').length;
    if (successCount > 0) toast.success(`${successCount} document(s) indexed with pgvector`);
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      onClose();
    }
  };

  const allDone = files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'error');
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" onClick={handleClose} />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-xl bg-[#0f172a]/95 border border-slate-750 rounded-3xl shadow-2xl shadow-indigo-950/50 overflow-hidden ring-1 ring-white/10"
      >
        {/* Glow ambient header decoration */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-inner">
              <Upload className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Upload to RetrievalHub</h2>
                <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  pgvector RAG
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Automated chunking & 768-dim embeddings</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            aria-label="Close dialog"
            className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop zone */}
        <div className="p-6 space-y-4">
          <div
            {...getRootProps()}
            className={clsx(
              'relative border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all duration-300 overflow-hidden group',
              isDragActive
                ? 'border-indigo-400 bg-gradient-to-b from-indigo-500/15 to-purple-500/15 shadow-lg shadow-indigo-500/20 scale-[1.01]'
                : 'border-slate-700/80 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-850/50'
            )}
          >
            <input {...getInputProps()} />

            {/* Ambient hover glow */}
            <div className={clsx(
              'absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 transition-opacity duration-300 pointer-events-none',
              isDragActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )} />

            <div className="relative flex flex-col items-center gap-3">
              <div className={clsx(
                'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md',
                isDragActive
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 scale-110 shadow-indigo-500/40 text-white'
                  : 'bg-slate-800/90 text-slate-300 group-hover:text-indigo-400 group-hover:scale-105 border border-slate-700'
              )}>
                {isDragActive ? (
                  <Sparkles className="w-8 h-8 animate-pulse" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>

              <div>
                <p className="text-white font-semibold text-sm sm:text-base">
                  {isDragActive ? '✨ Drop files to index' : 'Drag & drop your documents here'}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  or <span className="text-indigo-400 font-medium underline underline-offset-4 group-hover:text-indigo-300">browse files from your computer</span>
                </p>
              </div>

              {/* Supported filetypes */}
              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                {[
                  { ext: 'PDF', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
                  { ext: 'DOCX', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                  { ext: 'TXT', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                  { ext: 'MD', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
                  { ext: 'CSV', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                ].map(({ ext, color }) => (
                  <span key={ext} className={clsx('text-[11px] px-2 py-0.5 rounded-md font-semibold border', color)}>
                    .{ext.toLowerCase()}
                  </span>
                ))}
                <span className="text-[11px] text-slate-500 py-0.5 px-1.5">Up to 25MB</span>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          {files.length > 0 && (
            <div className="flex items-center justify-between px-2 pt-1 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-semibold text-white">{files.length}</span> file{files.length !== 1 ? 's' : ''} queued
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{formatBytes(totalSize)} total</span>
              </div>
              {!isUploading && (
                <button
                  onClick={() => setFiles([])}
                  className="text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear list
                </button>
              )}
            </div>
          )}

          {/* File cards list */}
          {files.length > 0 && (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              <AnimatePresence>
                {files.map((uf) => {
                  const typeDetails = getFileTypeDetails(uf.file.name);
                  return (
                    <motion.div
                      key={uf.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex-shrink-0">
                          {typeDetails.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={clsx('text-[10px] px-1.5 py-0.2 rounded font-bold border', typeDetails.color)}>
                                {typeDetails.badge}
                              </span>
                              <p className="text-xs text-white font-medium truncate" title={uf.file.name}>
                                {uf.file.name}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] text-slate-400 font-mono">{formatBytes(uf.file.size)}</span>
                              {uf.status === 'pending' && (
                                <button
                                  onClick={() => removeFile(uf.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {uf.status === 'uploading' && (
                                <div className="flex items-center gap-1 text-indigo-400 text-xs">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>{uf.progress}%</span>
                                </div>
                              )}
                              {uf.status === 'done' && (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  <CheckCircle className="w-3.5 h-3.5" /> Indexed
                                </span>
                              )}
                              {uf.status === 'error' && (
                                <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                  <AlertCircle className="w-3.5 h-3.5" /> Error
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Animated Progress Bar */}
                          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                            <div
                              className={clsx(
                                'h-full rounded-full transition-all duration-300',
                                uf.status === 'done' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                                uf.status === 'error' ? 'bg-rose-500' :
                                uf.status === 'uploading' ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse' :
                                'bg-slate-800'
                              )}
                              style={{ width: uf.status === 'pending' ? '0%' : `${uf.progress}%` }}
                            />
                          </div>

                          {/* Result/Error message */}
                          {uf.status === 'error' && (
                            <p className="text-[11px] text-rose-400 mt-1.5">{uf.error}</p>
                          )}
                          {uf.status === 'done' && uf.result && (
                            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-emerald-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {uf.result.chunksCreated ?? 0} vector chunks created
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <p className="text-xs text-slate-500">
            {pendingCount > 0 ? `${pendingCount} ready to embed` : allDone ? 'Processing completed' : 'Select files to begin'}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              {allDone ? 'Done' : 'Cancel'}
            </button>
            {!allDone && (
              <button
                onClick={handleUpload}
                disabled={isUploading || pendingCount === 0}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Embeddings…</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Index {pendingCount} Document{pendingCount !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UploadDialog;

