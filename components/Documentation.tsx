
import React, { useState, useEffect, useRef } from 'react';
import { getLogs, clearLogs } from '../utils/logger';
import { LogEntry } from '../types';
import { seedData, getGasUrl, saveGasUrl, exportFullData, importFullData } from '../services/dataService';
import { Bug, Database, Book, History, GitCommit, Download, Upload, Link, Save, Cloud } from 'lucide-react';

const Documentation: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'log' | 'guide' | 'data' | 'version'>('guide');
  
  // GAS URL State
  const [gasUrl, setGasUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogs(getLogs());
    setGasUrl(getGasUrl());
    const interval = setInterval(() => setLogs(getLogs()), 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveUrl = () => {
      saveGasUrl(gasUrl.trim());
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExport = () => {
      const json = exportFullData();
      const blob = new Blob([json], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `backup_lop_hoc_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          if (importFullData(content)) {
              alert("Nhập dữ liệu thành công! Trang web sẽ tải lại.");
              window.location.reload();
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex gap-4 mb-6 border-b pb-2 overflow-x-auto">
        <button 
            onClick={() => setActiveSubTab('guide')}
            className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeSubTab === 'guide' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}
        >
            Hướng dẫn sử dụng
        </button>
        <button 
            onClick={() => setActiveSubTab('version')}
            className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeSubTab === 'version' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}
        >
            Phiên bản & Cập nhật
        </button>
        <button 
            onClick={() => setActiveSubTab('data')}
            className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeSubTab === 'data' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}
        >
            Dữ liệu & Kết nối
        </button>
        <button 
            onClick={() => setActiveSubTab('log')}
            className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeSubTab === 'log' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}
        >
            Nhật ký (Debug)
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow min-h-[500px]">
        {activeSubTab === 'log' && (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Bug size={20}/> Nhật ký hoạt động & Debug</h3>
                    <div className="space-x-2">
                        <button onClick={() => seedData()} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">
                             <Database size={14} className="inline mr-1"/> Tạo dữ liệu mẫu
                        </button>
                        <button onClick={() => { clearLogs(); setLogs([]); }} className="text-sm text-red-500 underline">Xóa log</button>
                    </div>
                </div>
                <div className="bg-black text-green-400 font-mono text-xs p-4 rounded h-96 overflow-y-auto">
                    {logs.length === 0 && <span className="text-gray-500">// Chưa có log nào...</span>}
                    {logs.map((log, idx) => (
                        <div key={idx} className="mb-1 border-b border-gray-800 pb-1">
                            <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className="text-yellow-500 font-bold mx-2">[{log.action}]</span>
                            <span>{log.details}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeSubTab === 'guide' && (
            <div className="prose max-w-none text-gray-700">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Book size={24}/> Hướng dẫn sử dụng</h3>
                
                <h4 className="font-bold mt-4">1. Quản lý Học sinh</h4>
                <ul className="list-disc ml-5">
                    <li>Nhập tay từng học sinh hoặc dùng nút <strong>"Import Excel"</strong>.</li>
                    <li>Định dạng copy từ Excel: 4 cột (Tên, Giới tính, Học lực, Hay nói chuyện). Copy cả bảng và paste vào ô text.</li>
                    <li>Đã bổ sung tính năng Sửa/Xóa học sinh trực tiếp trên danh sách.</li>
                </ul>

                <h4 className="font-bold mt-4">2. Hạnh kiểm & Phiếu Liên Lạc</h4>
                <ul className="list-disc ml-5">
                    <li>Chọn tuần cần nhập liệu ở góc trên.</li>
                    <li><strong>Nhập điểm:</strong> Hệ thống tự xếp loại (Tốt/Khá/Đạt/Chưa Đạt).</li>
                    <li><strong>Xuất ảnh phiếu liên lạc:</strong> Nhấn vào tên học sinh -&gt; Chọn chế độ "Phiếu Liên Lạc" -&gt; Tải ảnh về máy.</li>
                    <li>Ảnh được thiết kế đẹp mắt để gửi ngay cho phụ huynh qua Zalo.</li>
                </ul>

                <h4 className="font-bold mt-4">3. Đồng bộ đám mây (Cloud Sync)</h4>
                <ul className="list-disc ml-5">
                    <li>Kết nối với Google Sheets để lưu trữ dữ liệu an toàn.</li>
                    <li>Nhấn nút <strong>"Sync"</strong> trên thanh menu.</li>
                    <li><strong>Gửi lên Cloud:</strong> Đẩy dữ liệu từ máy này lên Sheet.</li>
                    <li><strong>Lấy về Máy:</strong> Tải dữ liệu từ Sheet về (sẽ ghi đè dữ liệu hiện tại).</li>
                </ul>
            </div>
        )}
        
        {activeSubTab === 'version' && (
            <div className="max-w-3xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-700"><History size={24}/> Lịch sử Cập nhật</h3>
                
                <div className="relative border-l-2 border-indigo-200 ml-3 space-y-8 pl-6 py-2">
                     {/* v1.6 */}
                    <div className="relative">
                        <span className="absolute -left-[33px] bg-indigo-600 text-white rounded-full p-1.5 ring-4 ring-indigo-50"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.6 (Mới nhất)</h4>
                        <span className="text-xs text-gray-500 font-mono">Current Build</span>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside bg-gray-50 p-3 rounded-lg border">
                            <li><strong>Đồng bộ Google Sheets 2 chiều:</strong> Upload và Download dữ liệu trọn vẹn (Học sinh, Hạnh kiểm, Cấu hình).</li>
                            <li><strong>Xuất Phiếu Liên Lạc:</strong> Tạo ảnh phiếu điểm tuần đẹp mắt để gửi Zalo cho phụ huynh.</li>
                        </ul>
                    </div>

                    {/* v1.5 */}
                    <div className="relative">
                        <span className="absolute -left-[33px] bg-gray-200 text-gray-500 rounded-full p-1.5"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.5</h4>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                            <li>Thêm tính năng <strong>Sao lưu & Phục hồi</strong> dữ liệu qua file JSON.</li>
                            <li>Bổ sung ô nhập <strong>Google Apps Script URL</strong>.</li>
                        </ul>
                    </div>

                    {/* v1.4 */}
                    <div className="relative">
                        <span className="absolute -left-[33px] bg-gray-200 text-gray-500 rounded-full p-1.5"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.4</h4>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                            <li>Thêm cột <strong>Ghi chú</strong> vào bảng nhập hạnh kiểm.</li>
                            <li>Bổ sung tab Lịch sử cập nhật (Changelog).</li>
                        </ul>
                    </div>
                </div>
            </div>
        )}
        
        {activeSubTab === 'data' && (
            <div className="space-y-8">
                {/* Backup & Restore */}
                <section>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800"><Database size={24}/> Sao lưu & Phục hồi Dữ liệu</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="flex gap-4">
                            <button 
                                onClick={handleExport}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <Download size={20} /> Xuất dữ liệu (.json)
                            </button>
                            
                            <button 
                                onClick={handleImportClick}
                                className="flex items-center gap-2 bg-white text-gray-700 border px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                            >
                                <Upload size={20} /> Nhập dữ liệu (.json)
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept=".json"
                            />
                        </div>
                    </div>
                </section>

                {/* Google Sheet Connection */}
                <section>
                     <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-700 border-t pt-8"><Cloud size={24}/> Kết nối Google Sheets</h3>
                     
                     <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <label className="block font-semibold text-gray-700 mb-2">Google Apps Script Web App URL</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={gasUrl} 
                                onChange={(e) => setGasUrl(e.target.value)} 
                                placeholder="https://script.google.com/macros/s/......./exec"
                                className="flex-1 border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm"
                            />
                            <button 
                                onClick={handleSaveUrl}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 min-w-[100px] justify-center"
                            >
                                {isSaved ? 'Đã lưu!' : <><Save size={18}/> Lưu</>}
                            </button>
                        </div>
                     </div>

                     <div className="mt-4 bg-gray-100 p-4 rounded text-sm text-gray-600">
                        <h4 className="font-bold mb-2">Hướng dẫn Cập nhật mã Apps Script (Quan trọng!):</h4>
                        <p className="mb-2">Bạn cần copy đoạn mã <strong>mới nhất</strong> bên dưới vào File <code>Code.gs</code> trên Google Script Editor và Deploy lại (chọn New Version).</p>
                        <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto font-mono whitespace-pre-wrap select-all">
{`function doGet(e) {
  // Trả về thông báo đơn giản hoặc hướng dẫn
  return ContentService.createTextOutput("Smart Classroom API is running.");
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // ACTION: SAVE (Upload từ App -> Sheet)
    if (payload.action === 'save') {
      var data = payload.data;
      
      // 1. Lưu Students (Vào Sheet 'Students')
      var sSheet = getSheet(sheet, 'Students');
      sSheet.clear();
      if (data.students && data.students.length > 0) {
        var rows = data.students.map(s => [s.id, s.name, s.gender, s.rank, s.isTalkative]);
        sSheet.getRange(1, 1, rows.length, 5).setValues(rows);
      }
      
      // 2. Lưu Conduct (Vào Sheet 'Conduct') - Lưu dạng JSON string cho mỗi record để đơn giản hóa cấu trúc
      var cSheet = getSheet(sheet, 'Conduct');
      cSheet.clear();
      if (data.conduct && data.conduct.length > 0) {
        var cRows = data.conduct.map(c => [c.id, c.studentId, c.week, JSON.stringify(c)]);
        cSheet.getRange(1, 1, cRows.length, 4).setValues(cRows);
      }
      
      // 3. Lưu Settings & Seating (Vào Sheet 'Config' dạng Key-Value)
      var cfgSheet = getSheet(sheet, 'Config');
      cfgSheet.clear();
      var configRows = [
         ['seating', JSON.stringify(data.seating)],
         ['settings', JSON.stringify(data.settings)],
         ['last_updated', data.timestamp]
      ];
      cfgSheet.getRange(1, 1, configRows.length, 2).setValues(configRows);
      
      return response({status: 'success'});
    }
    
    // ACTION: LOAD (Download từ Sheet -> App)
    if (payload.action === 'load') {
      var result = {};
      
      // 1. Load Students
      var sSheet = sheet.getSheetByName('Students');
      if (sSheet && sSheet.getLastRow() > 0) {
         var rows = sSheet.getRange(1, 1, sSheet.getLastRow(), 5).getValues();
         result.students = rows.map(r => ({
           id: r[0], name: r[1], gender: r[2], rank: r[3], isTalkative: r[4]
         }));
      }
      
      // 2. Load Conduct
      var cSheet = sheet.getSheetByName('Conduct');
      if (cSheet && cSheet.getLastRow() > 0) {
         var rows = cSheet.getRange(1, 1, cSheet.getLastRow(), 4).getValues();
         // Cột 4 chứa JSON full record
         result.conduct = rows.map(r => JSON.parse(r[3]));
      }
      
      // 3. Load Config
      var cfgSheet = sheet.getSheetByName('Config');
      if (cfgSheet && cfgSheet.getLastRow() > 0) {
         var rows = cfgSheet.getRange(1, 1, cfgSheet.getLastRow(), 2).getValues();
         rows.forEach(r => {
             if(r[0] === 'seating') result.seating = JSON.parse(r[1]);
             if(r[0] === 'settings') result.settings = JSON.parse(r[1]);
         });
      }
      
      return response({status: 'success', data: result});
    }

  } catch(err) {
    return response({status: 'error', error: err.toString()});
  }
}

function getSheet(spreadsheet, name) {
  var s = spreadsheet.getSheetByName(name);
  if (!s) s = spreadsheet.insertSheet(name);
  return s;
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`}
                        </pre>
                     </div>
                </section>
            </div>
        )}
      </div>
    </div>
  );
};

export default Documentation;
