
import React, { useState, useEffect, useRef } from 'react';
import { getLogs, clearLogs } from '../utils/logger';
import { LogEntry } from '../types';
import { seedData, getGasUrl, saveGasUrl, exportFullData, importFullData } from '../services/dataService';
import { Bug, Database, Book, History, GitCommit, Download, Upload, Cloud, Save, Copy, Smile, UserCheck, Check, Link, Share2, BarChart2, LayoutGrid } from 'lucide-react';

const Documentation: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'log' | 'guide' | 'manual' | 'data' | 'version'>('guide');
  
  // GAS URL State
  const [gasUrl, setGasUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogs(getLogs());
    setGasUrl(getGasUrl());
    const interval = setInterval(() => setLogs(getLogs()), 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveUrl = () => {
      if (!gasUrl.trim()) return;
      saveGasUrl(gasUrl.trim());
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
  };

  const handleGenerateLink = () => {
      if (!gasUrl.trim()) {
          alert("Bạn chưa nhập URL Google Sheet!");
          return;
      }
      // Base64 encode the URL to make it a single parameter
      const encoded = btoa(gasUrl.trim());
      const link = `${window.location.origin}${window.location.pathname}?classId=${encoded}`;
      setGeneratedLink(link);
  };

  const copyLink = () => {
      navigator.clipboard.writeText(generatedLink);
      alert("Đã sao chép link! Hãy gửi link này vào nhóm lớp (Zalo/Messenger).");
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
            Kết nối Google Sheet (Quan trọng)
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
                     <div className="bg-green-50 p-5 rounded-xl border border-green-200 col-span-2">
                         <h4 className="font-bold text-lg mb-2 text-green-700">Mới: Quỹ Lớp (Tiền Thật)</h4>
                         <ul className="list-disc list-inside text-sm space-y-2">
                             <li><strong>Giáo viên:</strong> Quản lý thu/chi trong tab "Quỹ Lớp". Có thể thu nhanh theo danh sách.</li>
                             <li><strong>Thủ quỹ:</strong> Đăng nhập Cổng Học Sinh - chọn tab "Thu Quỹ" để báo cáo đã thu tiền của bạn nào.</li>
                             <li><strong>Duyệt:</strong> Giáo viên vào "Hộp thư" để duyệt báo cáo của Thủ quỹ, tiền sẽ tự động cộng vào sổ quỹ.</li>
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
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Cloud size={24}/> Hướng dẫn Kết nối Google Sheets (Chi tiết)</h3>
                
                <div className="bg-white border-l-4 border-indigo-500 p-4 shadow-sm mb-6">
                    <h4 className="font-bold text-indigo-700 mb-2">Tại sao cần làm bước này?</h4>
                    <p className="text-sm">Để dữ liệu (Học sinh, Điểm, Xu, Quỹ lớp) được lưu vĩnh viễn và không bị mất khi bạn tải lại trang hoặc dùng máy khác. Dữ liệu sẽ được lưu trên Google Drive của chính bạn.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> Tạo Google Sheet</h4>
                        <p className="text-sm ml-8">Truy cập <a href="https://sheets.new" target="_blank" className="text-blue-600 underline">sheets.new</a> để tạo một file Excel mới. Đặt tên file là "QuanLyLopHoc".</p>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> Mở Script Editor</h4>
                        <p className="text-sm ml-8">Trên thanh menu Google Sheet, chọn <strong>Extensions (Tiện ích mở rộng)</strong> &rarr; <strong>Apps Script</strong>.</p>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> Dán mã Script (Có cập nhật Quỹ Lớp)</h4>
                        <p className="text-sm ml-8 mb-2">Xóa hết mã cũ trong file <code>Code.gs</code> và dán toàn bộ đoạn mã dưới đây vào. <span className="text-red-600 font-bold">Lưu ý: Phải cập nhật Deployment mới sau khi sửa code!</span></p>
                        <div className="ml-8 relative">
                             <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto font-mono whitespace-pre-wrap select-all max-h-60 overflow-y-auto">
{`function doGet(e) {
  return ContentService.createTextOutput("Smart Classroom API v3.0.0 (Funds Supported) is running.");
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- 1. LƯU DỮ LIỆU GIÁO VIÊN (SAVE) ---
    if (payload.action === 'save') {
      var data = payload.data;
      
      // Save Students as JSON (This preserves Avatars, Inventory, Coins correctly)
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

      var fSheet = getSheet(sheet, 'Funds'); fSheet.clear();
      if (data.funds && data.funds.length > 0) {
         var fRows = data.funds.map(f => [f.id, f.date, f.type, f.amount, JSON.stringify(f)]);
         fSheet.getRange(1, 1, fRows.length, 5).setValues(fRows);
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
         var rows = sSheet.getRange(1, 1, sSheet.getLastRow(), 3).getValues();
         result.students = rows.map(r => {
             try { return JSON.parse(r[2]); } 
             catch(e) { return {id: r[0], name: r[1], gender: 'Nam', rank: 'Đạt'}; }
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

      var fSheet = sheet.getSheetByName('Funds');
      if (fSheet && fSheet.getLastRow() > 0) {
         var rows = fSheet.getRange(1, 1, fSheet.getLastRow(), 5).getValues();
         result.funds = rows.map(r => JSON.parse(r[4]));
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
          var rows = inboxSheet.getRange(1, 6, inboxSheet.getLastRow(), 1).getValues();
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

                    <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span> Triển khai (Deploy)</h4>
                        <ol className="list-decimal ml-10 text-sm space-y-1">
                            <li>Bấm nút <strong>Deploy (Triển khai)</strong> màu xanh góc trên bên phải &rarr; chọn <strong>New deployment (Bài triển khai mới)</strong>.</li>
                            <li>Bấm biểu tượng bánh răng chọn <strong>Web app</strong>.</li>
                            <li><strong>Description:</strong> Nhập version mới (vd: v3).</li>
                            <li><strong>Execute as (Thực thi dưới dạng):</strong> Chọn <em>"Me (Chính tôi)"</em>.</li>
                            <li><strong>Who has access (Ai có quyền truy cập):</strong> <span className="text-red-600 font-bold">Bắt buộc chọn "Anyone (Bất kỳ ai)"</span>.</li>
                            <li>Bấm <strong>Deploy</strong>.</li>
                            <li>Copy <strong>Web App URL</strong> (có đuôi <code>/exec</code>).</li>
                        </ol>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">5</span> Dán URL vào App</h4>
                        <p className="text-sm ml-8">Quay lại đây, vào tab <strong>Dữ liệu (Backup)</strong> bên dưới và dán URL vào ô "Google Apps Script Web App URL". Bấm Lưu.</p>
                    </div>
                </div>
            </div>
        )}
        
        {activeSubTab === 'version' && (
            <div className="max-w-3xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-700"><History size={24}/> Lịch sử Cập nhật</h3>
                <div className="relative border-l-2 border-indigo-200 ml-3 space-y-8 pl-6 py-2">
                     {/* v4.4 */}
                     <div className="relative">
                        <span className="absolute -left-[33px] bg-indigo-700 text-white rounded-full p-1.5 ring-4 ring-indigo-50"><LayoutGrid size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 4.4 (Smart Seating)</h4>
                        <span className="text-xs text-gray-500 font-mono">Academic Balancing Update</span>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside bg-gray-50 p-3 rounded-lg border">
                            <li><strong>Thuật toán xếp chỗ mới:</strong> Tự động phân bổ học sinh theo khối 2x2. Đảm bảo mỗi nhóm đều có "hạt nhân" (1 học sinh Tốt hoặc 2-3 học sinh Khá) để hỗ trợ nhau học tập.</li>
                            <li><strong>Ưu tiên VIP:</strong> Học sinh có Vé Chọn Chỗ VIP sẽ được ưu tiên xếp vào các vị trí hàng đầu trước khi chạy thuật toán cân bằng.</li>
                        </ul>
                    </div>
                     {/* v4.3 */}
                     <div className="relative">
                        <span className="absolute -left-[33px] bg-indigo-600 text-white rounded-full p-1.5 ring-4 ring-indigo-50"><BarChart2 size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 4.3 (Student Report)</h4>
                        <span className="text-xs text-gray-500 font-mono">Transparency Update</span>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside bg-gray-50 p-3 rounded-lg border">
                            <li><strong>Học sinh xem điểm:</strong> Học sinh có thể tự xem điểm hạnh kiểm, xếp loại và chi tiết lỗi vi phạm/điểm cộng của mình theo từng tuần.</li>
                            <li><strong>Quyền Lớp Trưởng:</strong> Lớp trưởng có quyền tra cứu kết quả hạnh kiểm của tất cả các bạn trong lớp.</li>
                        </ul>
                    </div>
                     {/* v4.2 */}
                     <div className="relative">
                        <span className="absolute -left-[33px] bg-purple-600 text-white rounded-full p-1.5 ring-4 ring-purple-50"><Link size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 4.2 (Smart Link)</h4>
                        <span className="text-xs text-gray-500 font-mono">Connectivity Update</span>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside bg-gray-50 p-3 rounded-lg border">
                            <li><strong>Link kết nối tự động:</strong> Giáo viên tạo link chia sẻ, học sinh chỉ cần bấm vào là tự động kết nối Google Sheet, không cần dán URL thủ công.</li>
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
                     
                     <div className="space-y-4">
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
                            <p className="text-xs text-gray-500 mt-2">Xem hướng dẫn chi tiết ở tab "Kết nối Google Sheet" để lấy URL.</p>
                         </div>

                         {/* SHARE LINK SECTION */}
                         <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                             <h4 className="font-bold text-purple-800 flex items-center gap-2 mb-2"><Share2 size={20}/> Chia sẻ cho Học sinh (Kết nối nhanh)</h4>
                             <p className="text-sm text-purple-700 mb-4">
                                 Thay vì gửi URL Script dài dòng, hãy bấm nút dưới đây để tạo một đường link thông minh. 
                                 Học sinh chỉ cần bấm vào link này là ứng dụng sẽ tự động kết nối với Google Sheet của lớp.
                             </p>
                             
                             {!generatedLink ? (
                                <button onClick={handleGenerateLink} className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 font-bold flex items-center gap-2">
                                    <Link size={18}/> Tạo Link Chia Sẻ
                                </button>
                             ) : (
                                 <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                                     <input 
                                        readOnly 
                                        value={generatedLink} 
                                        className="flex-1 border p-2 rounded bg-white text-gray-600 text-sm font-mono"
                                     />
                                     <button onClick={copyLink} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-bold flex items-center gap-2 whitespace-nowrap">
                                         <Copy size={18}/> Sao chép
                                     </button>
                                 </div>
                             )}
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
