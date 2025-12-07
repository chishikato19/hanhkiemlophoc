
import React, { useState, useEffect, useRef } from 'react';
import { getLogs, clearLogs } from '../utils/logger';
import { LogEntry } from '../types';
import { seedData, getGasUrl, saveGasUrl, exportFullData, importFullData } from '../services/dataService';
import { Bug, Database, Book, History, GitCommit, Download, Upload, Link, Save, Cloud, Info } from 'lucide-react';

const Documentation: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'log' | 'guide' | 'manual' | 'data' | 'version'>('manual');
  
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
                    {/* Module 1: Students */}
                    <div className="bg-gray-50 p-5 rounded-xl border">
                        <h4 className="font-bold text-lg mb-2 text-indigo-600">1. Quản lý Học sinh</h4>
                        <ul className="list-disc list-inside text-sm space-y-2">
                            <li><strong>Thêm mới:</strong> Nhập tên, giới tính, học lực và nhấn nút "Thêm".</li>
                            <li><strong>Sửa thông tin:</strong> Nhấn biểu tượng Bút chì ở danh sách để sửa.</li>
                            <li><strong>Nhập từ Excel:</strong> 
                                <ol className="list-decimal list-inside ml-4 text-xs mt-1 text-gray-600">
                                    <li>Chuẩn bị file Excel với các cột: Tên | Giới tính | Học lực | Hay nói chuyện.</li>
                                    <li>Copy dữ liệu (Ctrl+C).</li>
                                    <li>Nhấn nút <strong>Import Excel</strong> trên phần mềm và dán (Ctrl+V) vào ô trống.</li>
                                </ol>
                            </li>
                        </ul>
                    </div>

                    {/* Module 2: Conduct */}
                    <div className="bg-gray-50 p-5 rounded-xl border">
                        <h4 className="font-bold text-lg mb-2 text-indigo-600">2. Quản lý Hạnh kiểm</h4>
                        <ul className="list-disc list-inside text-sm space-y-2">
                            <li><strong>Nhập liệu:</strong> Chọn Tuần, sau đó nhập điểm số hoặc chọn các lỗi vi phạm/điểm cộng.</li>
                            <li><strong>Khóa tuần:</strong> Nhấn nút "Khóa" để ngăn không cho chỉnh sửa nhầm dữ liệu các tuần cũ.</li>
                            <li><strong>Cộng/Trừ cả lớp:</strong> Dùng nút ở thanh công cụ để thưởng/phạt tập thể.</li>
                            <li><strong>Cấu hình:</strong> Vào mục Cấu hình để thêm bớt các lỗi vi phạm, thang điểm, và mốc thời gian học kỳ.</li>
                        </ul>
                    </div>

                    {/* Module 3: Reports */}
                    <div className="bg-gray-50 p-5 rounded-xl border">
                        <h4 className="font-bold text-lg mb-2 text-indigo-600">3. Báo cáo & Thống kê</h4>
                        <ul className="list-disc list-inside text-sm space-y-2">
                            <li><strong>Báo cáo Tuần:</strong> Xem tổng hợp điểm và xếp loại hạnh kiểm của cả lớp trong 1 tuần. Có thể xuất ảnh để gửi Zalo.</li>
                            <li><strong>Báo cáo Chi tiết:</strong> Nhấn vào tên học sinh trong bảng tổng hợp để xem chi tiết biểu đồ tiến bộ và lỗi vi phạm qua các tuần.</li>
                            <li><strong>Tổng kết Học kỳ:</strong> Chọn tab "Tổng kết Học kỳ" để xem điểm trung bình và xếp loại theo HK1, HK2 hoặc Cả năm.</li>
                        </ul>
                    </div>

                    {/* Module 4: Seating */}
                    <div className="bg-gray-50 p-5 rounded-xl border">
                        <h4 className="font-bold text-lg mb-2 text-indigo-600">4. Sơ đồ Lớp học</h4>
                        <ul className="list-disc list-inside text-sm space-y-2">
                            <li><strong>Tự động xếp:</strong> Nhấn nút để máy tính tự sắp xếp sao cho cân bằng học lực giữa các nhóm.</li>
                            <li><strong>Thủ công:</strong> Kéo thả tên học sinh từ chỗ này sang chỗ khác.</li>
                            <li><strong>Lưu ý:</strong> Sơ đồ tự động lưu khi bạn thay đổi.</li>
                        </ul>
                    </div>
                </div>
             </div>
        )}

        {activeSubTab === 'guide' && (
            <div className="prose max-w-none text-gray-700">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Cloud size={24}/> Hướng dẫn Kết nối Google Sheets</h3>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm">
                    <p>Để lưu dữ liệu online và dùng trên nhiều máy, hãy làm theo các bước sau:</p>
                </div>

                <h4 className="font-bold mt-4">Bước 1: Tạo File Google Sheet</h4>
                <ol className="list-decimal ml-5 space-y-1">
                    <li>Truy cập <a href="https://sheets.google.com" target="_blank" className="text-blue-600 underline">Google Sheets</a> và tạo bảng tính mới.</li>
                    <li>Đặt tên file (ví dụ: <code>DuLieu_LopHoc</code>).</li>
                    <li>Không cần tạo sheet con, hệ thống sẽ tự động tạo.</li>
                </ol>

                <h4 className="font-bold mt-4">Bước 2: Mở trình chỉnh sửa Apps Script</h4>
                <ol className="list-decimal ml-5 space-y-1">
                    <li>Trên thanh menu của Google Sheet, chọn <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
                    <li>Đặt tên cho dự án (góc trên trái).</li>
                </ol>

                <h4 className="font-bold mt-4">Bước 3: Dán mã kết nối</h4>
                <ol className="list-decimal ml-5 space-y-1">
                    <li>Copy <strong>TOÀN BỘ</strong> đoạn mã trong khung màu đen ở tab <strong>"Dữ liệu (Backup)"</strong> bên cạnh.</li>
                    <li>Quay lại tab Apps Script, xóa hết nội dung cũ trong file <code>Code.gs</code>.</li>
                    <li>Dán đoạn mã vừa copy vào. Nhấn <strong>Lưu</strong> (biểu tượng đĩa mềm).</li>
                </ol>

                <h4 className="font-bold mt-4">Bước 4: Triển khai (Deploy) - QUAN TRỌNG</h4>
                <ol className="list-decimal ml-5 space-y-1">
                    <li>Nhấn nút <strong>Triển khai (Deploy)</strong> màu xanh &gt; <strong>Tùy chọn triển khai mới (New deployment)</strong>.</li>
                    <li>Bấm vào biểu tượng bánh răng &gt; chọn <strong>Ứng dụng web (Web app)</strong>.</li>
                    <li>Điền thông tin:
                        <ul className="list-disc ml-5 mt-1">
                            <li>Mô tả: <code>v1</code></li>
                            <li>Thực thi dưới dạng (Execute as): <strong>Tôi (Me)</strong></li>
                            <li>Ai có quyền truy cập (Who has access): <strong>Bất kỳ ai (Anyone)</strong> <span className="text-red-500 font-bold">(Bắt buộc)</span></li>
                        </ul>
                    </li>
                    <li>Nhấn <strong>Triển khai</strong>. Cấp quyền truy cập cho Google (chọn tài khoản của bạn &gt; Nâng cao &gt; Đi tới... (không an toàn)).</li>
                    <li>Copy <strong>Ứng dụng Web URL</strong> (có dạng <code>https://script.google.com/...</code>).</li>
                </ol>

                <h4 className="font-bold mt-4">Bước 5: Kết nối vào App</h4>
                <ol className="list-decimal ml-5 space-y-1">
                    <li>Quay lại App này, vào tab <strong>"Dữ liệu (Backup)"</strong> (Phần Kết nối Google Sheets).</li>
                    <li>Dán URL vào ô nhập liệu và nhấn <strong>Lưu</strong>.</li>
                    <li>Bây giờ bạn có thể dùng nút <strong>Sync</strong> (Đám mây) hoặc nút <strong>Lưu & Sync</strong> ở màn hình Hạnh kiểm.</li>
                </ol>
            </div>
        )}
        
        {activeSubTab === 'version' && (
            <div className="max-w-3xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-700"><History size={24}/> Lịch sử Cập nhật</h3>
                
                <div className="relative border-l-2 border-indigo-200 ml-3 space-y-8 pl-6 py-2">
                     {/* v1.9 */}
                    <div className="relative">
                        <span className="absolute -left-[33px] bg-indigo-600 text-white rounded-full p-1.5 ring-4 ring-indigo-50"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.9 (Mới nhất)</h4>
                        <span className="text-xs text-gray-500 font-mono">Build hiện tại</span>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside bg-gray-50 p-3 rounded-lg border">
                            <li><strong>Phân tích Thông minh (Smart Analytics):</strong> Tự động cảnh báo khi học sinh sa sút phong độ, vi phạm lặp lại.</li>
                            <li><strong>Cảnh báo trực quan:</strong> Hiển thị widget "Học sinh cần lưu ý" ở màn hình Thống kê.</li>
                            <li><strong>Gợi ý Phiếu liên lạc:</strong> Tự động thêm nhận xét gợi ý từ hệ thống vào ảnh phiếu liên lạc.</li>
                        </ul>
                    </div>

                     {/* v1.8 */}
                    <div className="relative">
                        <span className="absolute -left-[33px] bg-gray-200 text-gray-500 rounded-full p-1.5"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.8</h4>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                            <li><strong>Báo cáo Chi tiết:</strong> Xem chi tiết học sinh trực tiếp từ bảng tổng hợp.</li>
                            <li><strong>Tổng kết Học kỳ:</strong> Hỗ trợ tính điểm HK1, HK2 và Cả năm.</li>
                            <li><strong>Cập nhật giao diện:</strong> Hiển thị xếp loại trong các bảng báo cáo.</li>
                            <li><strong>Hướng dẫn sử dụng:</strong> Bổ sung tài liệu hướng dẫn chi tiết các tính năng.</li>
                        </ul>
                    </div>

                     {/* v1.7 */}
                    <div className="relative">
                        <span className="absolute -left-[33px] bg-gray-200 text-gray-500 rounded-full p-1.5"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.7</h4>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                            <li><strong>Khóa/Mở khóa tuần:</strong> Ngăn chặn chỉnh sửa nhầm dữ liệu.</li>
                            <li><strong>Nút Lưu nhanh:</strong> Thêm nút "Lưu & Sync" tiện lợi.</li>
                            <li><strong>Cảnh báo chưa lưu:</strong> Nhắc nhở khi chuyển trang mà quên lưu.</li>
                            <li><strong>Xuất ảnh Cả lớp:</strong> Báo cáo tuần dạng ảnh cho toàn bộ lớp.</li>
                            <li><strong>Trừ điểm cả lớp:</strong> Tính năng phạt tập thể.</li>
                        </ul>
                    </div>

                     {/* v1.6 */}
                    <div className="relative">
                        <span className="absolute -left-[33px] bg-gray-200 text-gray-500 rounded-full p-1.5"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.6</h4>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                            <li><strong>Đồng bộ Google Sheets 2 chiều:</strong> Upload và Download dữ liệu.</li>
                            <li><strong>Xuất Phiếu Liên Lạc:</strong> Tạo ảnh phiếu điểm tuần cá nhân.</li>
                            <li><strong>Gửi Zalo nhanh:</strong> Tính năng copy ảnh vào clipboard.</li>
                        </ul>
                    </div>

                    {/* v1.5 */}
                    <div className="relative">
                        <span className="absolute -left-[33px] bg-gray-200 text-gray-500 rounded-full p-1.5"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.5</h4>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                            <li>Thêm tính năng <strong>Sao lưu & Phục hồi</strong> file JSON.</li>
                            <li>Tích hợp mã Google Apps Script.</li>
                        </ul>
                    </div>

                     {/* v1.4 */}
                    <div className="relative">
                        <span className="absolute -left-[33px] bg-gray-200 text-gray-500 rounded-full p-1.5"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.4</h4>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                            <li>Thêm cột <strong>Ghi chú</strong> cho mỗi học sinh.</li>
                            <li>Cập nhật giao diện nhập liệu dạng bảng.</li>
                        </ul>
                    </div>

                     {/* v1.3 */}
                     <div className="relative">
                        <span className="absolute -left-[33px] bg-gray-200 text-gray-500 rounded-full p-1.5"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.3</h4>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                            <li><strong>Cộng điểm cả lớp:</strong> Thưởng điểm tập thể.</li>
                            <li>Hiển thị tên học sinh trực tiếp trên sơ đồ lớp.</li>
                        </ul>
                    </div>

                     {/* v1.2 */}
                     <div className="relative">
                        <span className="absolute -left-[33px] bg-gray-200 text-gray-500 rounded-full p-1.5"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.2</h4>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                            <li><strong>Cấu hình Hạnh kiểm:</strong> Tùy chỉnh danh mục lỗi và điểm số.</li>
                            <li>Cập nhật thuật toán xếp chỗ ngồi (Fix lỗi hiển thị).</li>
                        </ul>
                    </div>

                    {/* v1.1 */}
                    <div className="relative">
                        <span className="absolute -left-[33px] bg-gray-200 text-gray-500 rounded-full p-1.5"><GitCommit size={16}/></span>
                        <h4 className="font-bold text-lg text-gray-800">Phiên bản 1.1</h4>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                            <li>Bổ sung tính năng nhập học sinh bằng cách dán từ Excel.</li>
                            <li>Thêm biểu đồ tròn thống kê hạnh kiểm.</li>
                            <li>Bộ chọn lỗi vi phạm nâng cao (số lượng x1, x2).</li>
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
                        <h4 className="font-bold mb-2">Mã Script (Copy đoạn này vào Code.gs):</h4>
                        <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto font-mono whitespace-pre-wrap select-all">
{`function doGet(e) {
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
      
      // 2. Lưu Conduct (Vào Sheet 'Conduct') - Lưu dạng JSON string
      var cSheet = getSheet(sheet, 'Conduct');
      cSheet.clear();
      if (data.conduct && data.conduct.length > 0) {
        var cRows = data.conduct.map(c => [c.id, c.studentId, c.week, JSON.stringify(c)]);
        cSheet.getRange(1, 1, cRows.length, 4).setValues(cRows);
      }
      
      // 3. Lưu Settings & Seating
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
