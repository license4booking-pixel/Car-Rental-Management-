import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import * as xlsx from 'xlsx';

interface CSVImporterProps {
  onImport: (data: any[]) => void;
  label?: string;
  className?: string;
}

export default function CSVImporter({ onImport, label = "Import Data", className = "" }: CSVImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

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
    <>
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
    </>
  );
}
