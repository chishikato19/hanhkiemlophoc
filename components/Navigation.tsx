
import React, { useState } from 'react';
import { Users, ClipboardList, LayoutGrid, BookOpen, Cloud, UploadCloud, DownloadCloud, Loader, AlertCircle, Inbox } from 'lucide-react';
import { uploadToCloud, downloadFromCloud } from '../services/dataService';

interface NavProps {
  currentTab: string;
  setTab: (t: string) => void;
  hasUnsavedChanges: boolean;
}

const Navigation: React.FC<NavProps> = ({ currentTab, setTab, hasUnsavedChanges }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const tabs = [
    { id: 'students', label: 'Học Sinh', icon: Users },
    { id: 'conduct', label: 'Hạnh Kiểm', icon: ClipboardList },
    { id: 'seating', label: 'Sơ Đồ Lớp', icon: LayoutGrid },
    { id: 'inbox', label: 'Duyệt Báo Cáo', icon: Inbox },
    { id: 'docs', label: 'Nhật Ký & HDSD', icon: BookOpen },
  ];

  const handleTabChange = (tabId: string) => {
      if (hasUnsavedChanges && currentTab === 'conduct') {
          if (!window.confirm("CẢNH BÁO: Bạn chưa lưu dữ liệu hạnh kiểm!\nNếu chuyển trang, bạn có thể quên lưu. Bạn có chắc chắn muốn chuyển không?")) {
              return;
          }
      }
      setTab(tabId);
  };

  const handleUpload = async () => {
      setIsSyncing(true);
      const success = await uploadToCloud();
      setIsSyncing(false);
      setShowSyncModal(false);
      if (success) alert("Đồng bộ lên đám mây thành công!");
      else alert("Lỗi khi đồng bộ. Vui lòng kiểm tra URL hoặc kết nối mạng.");
  };

  const handleDownload = async () => {
      if (!window.confirm("Cảnh báo: Dữ liệu trên máy này sẽ bị ghi đè bởi dữ liệu trên Cloud. Bạn có chắc chắn không?")) return;
      setIsSyncing(true);
      const success = await downloadFromCloud();
      setIsSyncing(false);
      setShowSyncModal(false);
      if (success) {
          alert("Đã tải dữ liệu về thành công! Trang web sẽ tải lại.");
          window.location.reload();
      } else {
          alert("Lỗi khi tải dữ liệu. Vui lòng kiểm tra lại.");
      }
  };

  return (
    <>
        <div className="bg-indigo-700 text-white shadow-lg sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={() => handleTabChange('students')}>
                <BookOpen className="w-6 h-6" />
                <span className="hidden sm:inline">Lớp Học Thông Minh</span>
            </div>
            
            <div className="flex items-center space-x-2">
                <div className="flex space-x-1 overflow-x-auto mr-2">
                    {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = currentTab === tab.id;
                    return (
                        <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActive
                            ? 'bg-indigo-800 text-white shadow-inner'
                            : 'text-indigo-100 hover:bg-indigo-600'
                        }`}
                        >
                        <Icon className="w-4 h-4 mr-2" />
                        <span className="hidden md:inline">{tab.label}</span>
                        {isActive && hasUnsavedChanges && (
                            <span className="ml-1 w-2 h-2 bg-red-400 rounded-full animate-pulse" title="Chưa lưu"></span>
                        )}
                        </button>
                    );
                    })}
                </div>

                <div className="border-l border-indigo-500 pl-2">
                    <button 
                        onClick={() => setShowSyncModal(true)}
                        className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-indigo-400"
                        title="Đồng bộ Google Sheets"
                    >
                        {hasUnsavedChanges ? <AlertCircle size={16} className="text-red-300"/> : <Cloud size={16} />} 
                        <span className="hidden sm:inline">Sync</span>
                    </button>
                </div>
            </div>
            </div>
        </div>
        </div>

        {/* Sync Modal */}
        {showSyncModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                    <div className="mx-auto bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-indigo-600">
                        <Cloud size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Đồng bộ Google Sheets</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Kết nối 2 chiều để lưu trữ an toàn và sử dụng trên nhiều thiết bị.
                    </p>

                    {isSyncing ? (
                        <div className="py-8 flex flex-col items-center text-indigo-600 animate-pulse">
                            <Loader size={32} className="animate-spin mb-2" />
                            <span className="text-sm font-medium">Đang xử lý dữ liệu...</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <button 
                                onClick={handleUpload}
                                className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
                            >
                                <UploadCloud size={20} /> 
                                <div className="text-left">
                                    <div className="text-sm">Gửi lên Cloud</div>
                                    <div className="text-[10px] opacity-80 font-normal">Lưu dữ liệu máy này lên Sheet</div>
                                </div>
                            </button>
                            
                            <button 
                                onClick={handleDownload}
                                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-indigo-100 text-indigo-700 py-3 rounded-lg hover:bg-indigo-50 transition font-medium"
                            >
                                <DownloadCloud size={20} />
                                <div className="text-left">
                                    <div className="text-sm">Lấy về Máy</div>
                                    <div className="text-[10px] opacity-70 font-normal">Ghi đè dữ liệu máy này từ Sheet</div>
                                </div>
                            </button>
                        </div>
                    )}

                    <button 
                        onClick={() => setShowSyncModal(false)}
                        disabled={isSyncing}
                        className="mt-6 text-gray-400 text-sm hover:text-gray-600 underline"
                    >
                        Đóng lại
                    </button>
                </div>
            </div>
        )}
    </>
  );
};

export default Navigation;
