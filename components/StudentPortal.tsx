
import React, { useState, useEffect } from 'react';
import { fetchStudentNamesOnly, sendStudentReport } from '../services/dataService';
import { Send, CheckCircle, AlertTriangle, Clock, UserCheck } from 'lucide-react';
import { PendingReport, AttendanceStatus } from '../types';

interface SimpleStudent { id: string; name: string; }

const StudentPortal: React.FC = () => {
    const [names, setNames] = useState<SimpleStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    
    // Form State
    const [reporterId, setReporterId] = useState(''); // Who is reporting
    const [targetId, setTargetId] = useState(''); // Who is the subject
    const [reportType, setReportType] = useState<'ATTENDANCE' | 'VIOLATION'>('ATTENDANCE');
    const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(AttendanceStatus.LATE);
    const [violationText, setViolationText] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        const loadNames = async () => {
            const data = await fetchStudentNamesOnly();
            setNames(data);
            setLoading(false);
        };
        loadNames();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const reporter = names.find(n => n.id === reporterId);
        const target = names.find(n => n.id === targetId);

        if (!reporter || !target) { alert("Vui lòng chọn tên người báo cáo và học sinh!"); return; }
        if (reportType === 'VIOLATION' && !violationText) { alert("Vui lòng nhập lỗi vi phạm!"); return; }

        const report: PendingReport = {
            id: `REP-${Date.now()}`,
            timestamp: new Date().toISOString(),
            reporterName: reporter.name,
            targetStudentName: target.name,
            type: reportType,
            content: reportType === 'ATTENDANCE' ? attendanceStatus : violationText,
            note: note
        };

        setLoading(true);
        const success = await sendStudentReport(report);
        setLoading(false);

        if (success) {
            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setTargetId('');
                setViolationText('');
                setNote('');
            }, 3000);
        } else {
            alert("Gửi thất bại. Vui lòng kiểm tra kết nối mạng.");
        }
    };

    if (loading && names.length === 0) return <div className="flex items-center justify-center min-h-screen text-gray-500">Đang tải danh sách lớp...</div>;

    if (submitted) return (
        <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4 text-center">
            <CheckCircle size={64} className="text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-700">Gửi báo cáo thành công!</h2>
            <p className="text-green-600 mb-8">Giáo viên sẽ xem xét báo cáo của bạn.</p>
            <button onClick={() => setSubmitted(false)} className="bg-white border border-green-200 text-green-700 px-6 py-2 rounded-full font-medium hover:bg-green-100">Gửi báo cáo khác</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 font-sans">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-orange-600 p-4 text-white">
                    <h1 className="text-xl font-bold flex items-center gap-2"><UserCheck /> Cổng Thông Tin Lớp Học</h1>
                    <p className="text-orange-100 text-xs mt-1">Dành cho Cán bộ lớp & Học sinh</p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Reporter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bạn là ai?</label>
                        <select 
                            value={reporterId} 
                            onChange={e => setReporterId(e.target.value)} 
                            className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50"
                            required
                        >
                            <option value="">-- Chọn tên bạn --</option>
                            {names.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Loại báo cáo</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                type="button"
                                onClick={() => setReportType('ATTENDANCE')}
                                className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-2 transition-all ${reportType === 'ATTENDANCE' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-500'}`}
                            >
                                <Clock size={20} /> Điểm Danh (Vắng/Muộn)
                            </button>
                            <button 
                                type="button"
                                onClick={() => setReportType('VIOLATION')}
                                className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-2 transition-all ${reportType === 'VIOLATION' ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-200 text-gray-500'}`}
                            >
                                <AlertTriangle size={20} /> Báo cáo Vi phạm
                            </button>
                        </div>
                    </div>

                    {/* Target */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Học sinh được báo cáo</label>
                        <select 
                            value={targetId} 
                            onChange={e => setTargetId(e.target.value)} 
                            className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            required
                        >
                            <option value="">-- Chọn học sinh --</option>
                            {names.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                    </div>

                    {/* Dynamic Content */}
                    {reportType === 'ATTENDANCE' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng</label>
                            <select 
                                value={attendanceStatus}
                                onChange={(e) => setAttendanceStatus(e.target.value as AttendanceStatus)}
                                className="w-full border p-2 rounded-lg"
                            >
                                <option value={AttendanceStatus.LATE}>{AttendanceStatus.LATE}</option>
                                <option value={AttendanceStatus.UNEXCUSED}>{AttendanceStatus.UNEXCUSED}</option>
                                <option value={AttendanceStatus.EXCUSED}>{AttendanceStatus.EXCUSED}</option>
                            </select>
                        </div>
                    ) : (
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Lỗi vi phạm</label>
                             <input 
                                type="text"
                                placeholder="Ví dụ: Nói chuyện riêng, Không làm bài..."
                                value={violationText}
                                onChange={e => setViolationText(e.target.value)}
                                className="w-full border p-2 rounded-lg"
                             />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thêm (Tùy chọn)</label>
                        <input 
                            type="text"
                            placeholder="Chi tiết..."
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="w-full border p-2 rounded-lg text-sm"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 ${loading ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700'}`}
                    >
                        {loading ? 'Đang gửi...' : <><Send size={18} /> Gửi Báo Cáo</>}
                    </button>
                </form>
                <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
                    Dữ liệu sẽ được gửi đến Giáo viên chủ nhiệm.
                </div>
            </div>
        </div>
    );
};

export default StudentPortal;
