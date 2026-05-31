import React, { useRef, useState } from 'react';
import { Upload, HelpCircle, X } from 'lucide-react';
import * as xlsx from 'xlsx';

interface CSVImporterProps {
  onImport: (data: any[]) => void;
  label?: string;
  className?: string;
  instructions?: React.ReactNode;
}

export default function CSVImporter({ onImport, label = "Import Data", className = "", instructions }: CSVImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(worksheet);
      
      onImport(json);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error parsing spreadsheet:", error);
      alert("Failed to parse spreadsheet file. Please check the format.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1">
      <input 
        type="file" 
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-[#27272a] text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 ${className}`}
        title="Import from Excel or CSV Spreadsheet"
      >
        <Upload size={14} /> {loading ? "Importing..." : label}
      </button>

      {instructions && (
        <>
          <button 
            onClick={() => setShowInstructions(true)}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            title="Import Instructions"
          >
            <HelpCircle size={16} />
          </button>

          {showInstructions && (
            <div className="absolute top-full mt-2 right-0 z-50 w-80 p-4 bg-[#09090b] border border-[#27272a] shadow-2xl rounded-xl text-left">
              <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Import Instructions</h4>
                <button onClick={() => setShowInstructions(false)} className="text-zinc-500 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="text-sm text-zinc-300">
                {instructions}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
