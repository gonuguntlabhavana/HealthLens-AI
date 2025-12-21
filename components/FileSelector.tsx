
import React from 'react';
import { FileData } from '../types';

interface FileSelectorProps {
  label: string;
  accept: string;
  icon: React.ReactNode;
  onFileSelect: (file: FileData | null) => void;
  selectedFile: FileData | null;
}

const FileSelector: React.FC<FileSelectorProps> = ({ label, accept, icon, onFileSelect, selectedFile }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      onFileSelect(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      onFileSelect({
        base64,
        mimeType: file.type,
        fileName: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${selectedFile ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}>
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center justify-center text-slate-500 pointer-events-none">
          <div className="mb-2">{icon}</div>
          {selectedFile ? (
            <div className="text-center">
              <span className="text-xs font-medium text-blue-700 truncate block max-w-[150px]">
                {selectedFile.fileName}
              </span>
              <button 
                onClick={(e) => { e.preventDefault(); onFileSelect(null); }}
                className="text-[10px] text-red-500 hover:underline mt-1 z-20 pointer-events-auto"
              >
                Remove
              </button>
            </div>
          ) : (
            <span className="text-xs text-center">Click or drag to upload</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileSelector;
