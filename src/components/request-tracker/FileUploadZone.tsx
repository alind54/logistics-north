import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';

interface Props {
  onUpload: (file: File) => Promise<boolean>;
}

export default function FileUploadZone({ onUpload }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      await onUpload(files[i]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragEnter={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg px-4 py-3 text-center cursor-pointer transition-colors ${
        isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      } ${uploading ? 'opacity-50 cursor-wait' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={e => handleFiles(e.target.files)}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
      />
      {uploading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading...
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <Upload className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-500">Drop files here or click to browse</span>
          <span className="text-xs text-gray-400">PDF, images, Office docs, text, CSV, ZIP (max 10MB)</span>
        </div>
      )}
    </div>
  );
}
