
import React, { useState, useEffect } from 'react';
import { fetchStudentNamesOnly, sendStudentReport, fetchBehaviorList } from '../services/dataService';
import { Send, CheckCircle, AlertTriangle, Clock, UserCheck, Search, CheckSquare, Square } from 'lucide-react';
import { PendingReport, AttendanceStatus, BehaviorItem } from '../types';

interface SimpleStudent { id: string; name: string; }

const StudentPortal: React.FC = () => {
    const [names, setNames] = useState<SimpleStudent[]>([]);
    const [behaviors, setBehaviors] = useState<BehaviorItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    
    // Form State
    const [reporterId, setReporterId] = useState(''); 
    const [reportType, setReportType] = useState<'ATTENDANCE' | 'VIOLATION'>('ATTENDANCE');
    
    // Multi-Select Target State
    const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
    const [studentSearch, setStudentSearch] = useState('');

    // Context State
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Data State
    const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(AttendanceStatus.LATE);
    
    // Violation Data
    const [selectedBehaviorId, setSelectedBehaviorId] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const [nameData, behaviorData] = await Promise.all([
                fetchStudentNamesOnly(),
                fetchBehaviorList()
            ]);
            setNames(nameData);
            setBehaviors(behaviorData);
            setLoading(false);
        };
        loadData();
    }, []);

    const toggleTargetStudent = (id: string) => {
        if (selectedTargetIds.includes(id)) {
            setSelectedTargetIds(selectedTargetIds.filter(tid => tid !== id));
        } else {
            setSelectedTargetIds([...selectedTargetIds, id]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const reporter = names.find(n => n.id === reporterId);

        if (!reporter) { alert("Vui lòng chọn tên người báo cáo!"); return; }
        if (selectedTargetIds.length === 0) { alert("Vui lòng chọn ít nhất 1 học sinh!"); return; }
        
        // Prepare content
        let content = '';
        if (reportType === 'ATTENDANCE') {
            content = attendanceStatus;
        } else {
            if (!selectedBehaviorId) { alert("Vui lòng chọn lỗi vi phạm!"); return; }
            const behavior = behaviors.find(b => b.id === selectedBehaviorId);
            content = behavior ? behavior.label : 'Lỗi không xác định';
        }

        setLoading(true);

        // Send multiple reports (one for each selected student)
        const promises = selectedTargetIds.map(targetId => {
            const target = names.find(n => n.id === targetId);
            if (!target) return Promise.resolve(false);

            const report: PendingReport = {
                id: `REP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                timestamp: new Date().toISOString(),
                targetDate: selectedDate,
                week: selectedWeek,
                reporterName: reporter.name,
                targetStudentName: target.name,
                type: reportType,
                content: content,
                note: note
            };
            return sendStudentReport(report);
        });

        await Promise.all(promises);
        setLoading(false);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setSelectedTargetIds([]);
            setSelectedBehaviorId('');
            setNote('');
        }, 3000);
    };

    const filteredStudents = names.filter(n => n.name.toLowerCase().includes(studentSearch.toLowerCase()));

    if (loading && names.length === 0) return <div className="flex items-center justify-center min-h-screen text-gray-500">Đang tải dữ liệu lớp học...</div>;

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
            <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-[90vh]">
                <div className="bg-orange-600 p-4 text-white shrink-0">
                    <h1 className="text-xl font-bold flex items-center gap-2"><UserCheck /> Cổng Thông Tin Lớp Học</h1>
                    <p className="text-orange-100 text-xs mt-1">Dành cho Cán bộ lớp & Học sinh</p>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 space-y-4 shrink-0 border-b">
                         {/* Reporter */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Người báo cáo</label>
                            <select 
                                value={reporterId} 
                                onChange={e => setReporterId(e.target.value)} 
                                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50 text-sm"
                                required
                            >
                                <option value="">-- Chọn tên bạn --</option>
                                {names.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                            </select>
                        </div>
                        
                        {/* Date Context */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tuần</label>
                                <select value={selectedWeek} onChange={(e) => setSelectedWeek(parseInt(e.target.value))} className="w-full border p-2 rounded-lg text-sm">
                                    {Array.from({length: 35}).map((_, i) => <option key={i+1} value={i+1}>Tuần {i+1}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Ngày</label>
                                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full border p-2 rounded-lg text-sm" required />
                            </div>
                        </div>

                        {/* Report Type */}
                        <div>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setReportType('ATTENDANCE')}
                                    className={`p-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${reportType === 'ATTENDANCE' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-500'}`}
                                >
                                    <Clock size={16} /> Điểm Danh
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setReportType('VIOLATION')}
                                    className={`p-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${reportType === 'VIOLATION' ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-200 text-gray-500'}`}
                                >
                                    <AlertTriangle size={16} /> Báo Vi phạm
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Student Selector (Scrollable) */}
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-gray-50">
                        <div className="p-2 bg-white border-b flex items-center gap-2">
                             <Search size={16} className="text-gray-400"/>
                             <input 
                                className="flex-1 outline-none text-sm" 
                                placeholder="Tìm tên học sinh..." 
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                             />
                             <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{selectedTargetIds.length} đã chọn</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="grid grid-cols-1 gap-2">
                                {filteredStudents.map(student => {
                                    const isSelected = selectedTargetIds.includes(student.id);
                                    return (
                                        <div 
                                            key={student.id}
                                            onClick={() => toggleTargetStudent(student.id)}
                                            className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200 hover:border-orange-200'}`}
                                        >
                                            <span className={`font-medium text-sm ${isSelected ? 'text-orange-800' : 'text-gray-700'}`}>{student.name}</span>
                                            {isSelected ? <CheckSquare size={20} className="text-orange-500 fill-orange-50"/> : <Square size={20} className="text-gray-300"/>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer Details */}
                    <div className="p-4 bg-white border-t space-y-3 shrink-0">
                         {/* Dynamic Content */}
                        {reportType === 'ATTENDANCE' ? (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tình trạng</label>
                                <select 
                                    value={attendanceStatus}
                                    onChange={(e) => setAttendanceStatus(e.target.value as AttendanceStatus)}
                                    className="w-full border p-2 rounded-lg bg-yellow-50 text-sm font-medium"
                                >
                                    <option value={AttendanceStatus.LATE}>{AttendanceStatus.LATE}</option>
                                    <option value={AttendanceStatus.UNEXCUSED}>{AttendanceStatus.UNEXCUSED}</option>
                                    <option value={AttendanceStatus.EXCUSED}>{AttendanceStatus.EXCUSED}</option>
                                </select>
                            </div>
                        ) : (
                            <div>
                                 <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Chọn lỗi vi phạm</label>
                                 <select 
                                    value={selectedBehaviorId}
                                    onChange={e => setSelectedBehaviorId(e.target.value)}
                                    className="w-full border p-2 rounded-lg bg-red-50 text-sm font-medium"
                                 >
                                    <option value="">-- Chọn lỗi --</option>
                                    {behaviors.map(b => (
                                        <option key={b.id} value={b.id}>{b.label} ({b.points}đ)</option>
                                    ))}
                                 </select>
                            </div>
                        )}

                        <div>
                            <input 
                                type="text"
                                placeholder={reportType === 'ATTENDANCE' ? "Lý do (nếu có)..." : "Ghi chú (Giờ học, hoàn cảnh)..."}
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
                            {loading ? 'Đang gửi...' : <><Send size={18} /> Gửi Báo Cáo ({selectedTargetIds.length})</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudentPortal;
