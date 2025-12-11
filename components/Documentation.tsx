
import React, { useState, useEffect, useRef } from 'react';
import { getLogs, clearLogs } from '../utils/logger';
import { LogEntry } from '../types';
import { seedData, getGasUrl, saveGasUrl, exportFullData, importFullData } from '../services/dataService';
import { Bug, Database, Book, History, GitCommit, Download, Upload, Cloud, Save, Copy } from 'lucide-react';

const Documentation: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'log' | 'guide' | 'manual' | 'data' | 'version'>('guide');
  
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
            onClick={() => setActiveSubTab('manual')}
            className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeSubTab === 'manual' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}
        >
            Hướng dẫn Sử dụng
        </button>
        <button 
            onClick={() => setActiveSubTab('guide')}
            className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeSubTab === 'guide' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}
        >
            Kết nối Online
        </button>
        <button 
            onClick={() => setActiveSubTab('version')}
            className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeSubTab === 'version' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}
        >
            Lịch sử Cập nhật
        </button>
        <button 
            onClick={() => setActiveSubTab('data')}
            className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeSubTab === 'data' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}
        >
            Dữ liệu (Backup)
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

        {activeSubTab === 'manual' && (
             <div className="prose max-w-none text-gray-700">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-700"><Book size={24}/> Hướng dẫn sử dụng phần mềm</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-200 col-span-2">
                         <h4 className="font-bold text-lg mb-2 text-indigo-700">Mới: Chế độ Đăng nhập & Học sinh</h4>
                         <ul className="list-disc list-inside text-sm space-y-2">
                             <li><strong>Giáo viên:</strong> Dùng mật khẩu (Mặc định: 123456) để vào quản trị.</li>
                             <li><strong>Học sinh:</strong> Dùng Mã lớp (Mặc định: 1111) để vào giao diện báo cáo.</li>
                             <li><strong>Inbox:</strong> Giáo viên vào tab "Inbox" để duyệt các báo cáo do học sinh gửi lên.</li>
                         </ul>
                     </div>

                    <div className="bg-gray-50 p-5 rounded-xl border">
                        <h4 className="font-bold text-lg mb-2 text-indigo-600">1. Quản lý Học sinh</h4>
                        <ul className="list-disc list-inside text-sm space-y-2">
                            <li><strong>Thêm mới/Import:</strong> Nhập từ Excel dễ dàng.</li>
                            <li><strong>Khóa học sinh:</strong> Dùng cho học sinh nghỉ học/bảo lưu.</li>
                        </ul>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-xl border">
                        <h4 className="font-bold text-lg mb-2 text-indigo-600">2. Hạnh kiểm & Điểm danh</h4>
                        <ul className="list-disc list-inside text-sm space-y-2">
                            <li><strong>Hạnh kiểm:</strong> Nhập lỗi vi phạm, cộng điểm theo tuần.</li>
                            <li><strong>Điểm danh:</strong> Theo dõi vắng, muộn (Có trong tab Báo cáo).</li>
                            <li><strong>Gamification:</strong> Vào Cửa Hàng để xem Xu và đổi quà cho học sinh.</li>
                        </ul>
                    </div>
                </div>
             </div>
        )}

        {activeSubTab === 'guide' && (
            <div className="prose max-w-none text-gray-700">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Cloud size={24}/> Hướng dẫn Kết nối Google Sheets</h3>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm mb-4">
                    <strong>CẬP NHẬT QUAN TRỌNG (v2.2):</strong> Vui lòng cập nhật đoạn mã bên dưới vào Google Apps Script để khắc phục lỗi mất dữ liệu Xu và Huy hiệu khi đồng bộ.
                </div>

                <div className="bg-gray-100 p-4 rounded text-sm text-gray-600">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-indigo-700">Mã Script Mới (v2.2):</h4>
                        </div>
                        <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto font-mono whitespace-pre-wrap select-all">
{`function doGet(e) {
  return ContentService.createTextOutput("Smart Classroom API v2.2 is running.");
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- 1. LƯU DỮ LIỆU GIÁO VIÊN (SAVE) ---
    if (payload.action === 'save') {
      var data = payload.data;
      
      // Save Students as JSON to preserve coins/inventory
      var sSheet = getSheet(sheet, 'Students'); sSheet.clear();
      if (data.students && data.students.length > 0) {
        // ID | Name | JSON Data
        var rows = data.students.map(s => [s.id, s.name, JSON.stringify(s)]);
        sSheet.getRange(1, 1, rows.length, 3).setValues(rows);
      }
      
      var cSheet = getSheet(sheet, 'Conduct'); cSheet.clear();
      if (data.conduct && data.conduct.length > 0) {
        var cRows = data.conduct.map(c => [c.id, c.studentId, c.week, JSON.stringify(c)]);
        cSheet.getRange(1, 1, cRows.length, 4).setValues(cRows);
      }
      
      var aSheet = getSheet(sheet, 'Attendance'); aSheet.clear();
      if (data.attendance && data.attendance.length > 0) {
         var aRows = data.attendance.map(a => [a.id, a.studentId, a.date, JSON.stringify(a)]);
         aSheet.getRange(1, 1, aRows.length, 4).setValues(aRows);
      }
      
      var cfgSheet = getSheet(sheet, 'Config'); cfgSheet.clear();
      var configRows = [
         ['seating', JSON.stringify(data.seating)],
         ['settings', JSON.stringify(data.settings)],
         ['last_updated', data.timestamp]
      ];
      cfgSheet.getRange(1, 1, configRows.length, 2).setValues(configRows);
      
      return response({status: 'success'});
    }
    
    // --- 2. TẢI DỮ LIỆU GIÁO VIÊN (LOAD) ---
    if (payload.action === 'load') {
      var result = {};
      
      var sSheet = sheet.getSheetByName('Students');
      if (sSheet && sSheet.getLastRow() > 0) {
         // Load from JSON column (Col 3)
         var rows = sSheet.getRange(1, 1, sSheet.getLastRow(), 3).getValues();
         result.students = rows.map(r => {
             try { return JSON.parse(r[2]); } 
             catch(e) { 
                 // Fallback for old data format
                 return {id: r[0], name: r[1], gender: 'Nam', rank: 'Đạt', isTalkative: false}; 
             }
         });
      }
      
      var cSheet = sheet.getSheetByName('Conduct');
      if (cSheet && cSheet.getLastRow() > 0) {
         var rows = cSheet.getRange(1, 1, cSheet.getLastRow(), 4).getValues();
         result.conduct = rows.map(r => JSON.parse(r[3]));
      }
      
      var aSheet = sheet.getSheetByName('Attendance');
      if (aSheet && aSheet.getLastRow() > 0) {
         var rows = aSheet.getRange(1, 1, aSheet.getLastRow(), 4).getValues();
         result.attendance = rows.map(r => JSON.parse(r[3]));
      }
      
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

    // --- 3. HỌC SINH: LẤY DANH SÁCH TÊN (GET_NAMES) ---
    if (payload.action === 'get_names') {
       var sSheet = sheet.getSheetByName('Students');
       var names = [];
       if (sSheet && sSheet.getLastRow() > 0) {
          // Get ID and Name
          var rows = sSheet.getRange(1, 1, sSheet.getLastRow(), 2).getValues();
          names = rows.map(r => ({id: r[0], name: r[1]}));
       }
       return response({status: 'success', data: names});
    }

    // --- 3B. HỌC SINH: LẤY DANH SÁCH LỖI (GET_BEHAVIORS) ---
    if (payload.action === 'get_behaviors') {
       var cfgSheet = sheet.getSheetByName('Config');
       var violations = [];
       if (cfgSheet && cfgSheet.getLastRow() > 0) {
          var rows = cfgSheet.getRange(1, 1, cfgSheet.getLastRow(), 2).getValues();
          rows.forEach(r => {
             if(r[0] === 'settings') {
                var settings = JSON.parse(r[1]);
                if (settings.behaviorConfig && settings.behaviorConfig.violations) {
                    violations = settings.behaviorConfig.violations;
                }
             }
          });
       }
       return response({status: 'success', data: violations});
    }

    // --- 4. HỌC SINH: GỬI BÁO CÁO (STUDENT_SUBMIT) ---
    if (payload.action === 'student_submit') {
       var inboxSheet = getSheet(sheet, 'Inbox_Logs');
       var report = payload.data;
       inboxSheet.appendRow([
         report.id, 
         report.timestamp, 
         report.reporterName, 
         report.targetStudentName, 
         report.type, 
         JSON.stringify(report)
       ]);
       return response({status: 'success'});
    }

    // --- 5. GIÁO VIÊN: LẤY INBOX (GET_PENDING) ---
    if (payload.action === 'get_pending') {
       var inboxSheet = sheet.getSheetByName('Inbox_Logs');
       var reports = [];
       if (inboxSheet && inboxSheet.getLastRow() > 0) {
          var rows = inboxSheet.getRange(1, 6, inboxSheet.getLastRow(), 1).getValues(); // Get JSON col
          reports = rows.map(r => JSON.parse(r[0]));
       }
       return response({status: 'success', data: reports});
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
            </div>
        )}
        
        {activeSubTab === 'version' && (
            <div className="max-w-3xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-700"><History size={24}/> Lịch sử Cập nhật</h3>
                <div className="relative border-l-2 border-indigo-200 ml-3 space-y-8 pl-6 py-2">
                     {/* v2.2 */}
                     <div className="relative">
                        <span className="absolute -left-[33px] bg-green-600 text-white rounded-full p-1.5 ring-4 ring-green-50"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 2.2</h4>
                        <span className="text-xs text-gray-500 font-mono">Đồng bộ Dữ liệu</span>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside bg-gray-50 p-3 rounded-lg border">
                            <li><strong>Sửa lỗi Đồng bộ:</strong> Cập nhật mã Script để lưu trữ đầy đủ thông tin Xu, Túi đồ và Huy hiệu của học sinh lên Google Sheet (không còn bị mất khi tải về).</li>
                            <li><strong>Hiển thị Xu:</strong> Thêm hiển thị số dư Xu ngay trong bảng nhập liệu hạnh kiểm để tiện theo dõi.</li>
                            <li><strong>Xử lý lỗi Cloud:</strong> Cải thiện thông báo lỗi khi URL Google Sheet chưa chính xác.</li>
                        </ul>
                    </div>
                     {/* v2.1 */}
                     <div className="relative">
                        <span className="absolute -left-[33px] bg-indigo-600 text-white rounded-full p-1.5 ring-4 ring-indigo-50"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-600">Phiên bản 2.1</h4>
                        <span className="text-xs text-gray-500 font-mono">Cải tiến Nhập liệu</span>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside bg-gray-50 p-3 rounded-lg border">
                            <li><strong>Chọn nhiều học sinh:</strong> Giao diện Cổng thông tin cho phép chọn nhiều học sinh cùng lúc khi điểm danh.</li>
                            <li><strong>Danh sách lỗi thông minh:</strong> Học sinh chọn lỗi từ danh sách có sẵn thay vì tự gõ.</li>
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
                </section>
            </div>
        )}
      </div>
    </div>
  );
};

export default Documentation;
