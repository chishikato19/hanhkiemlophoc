
import React, { useState, useEffect } from 'react';
import { PendingReport, AttendanceStatus, AttendanceRecord, ConductRecord, Student, Settings, PendingOrder, FundTransaction } from '../types';
import { getPendingReports, savePendingReports, getStudents, saveStudents, getAttendance, saveAttendance, getConductRecords, saveConductRecords, getSettings, fetchPendingReportsCloud, getPendingOrders, savePendingOrders, getFundTransactions, saveFundTransactions } from '../services/dataService';
import { Check, X, Inbox, Clock, AlertTriangle, RefreshCw, Calendar, CheckCircle, XCircle, ShoppingBag, Coins, Shield, Award, Banknote } from 'lucide-react';
import { addLog } from '../utils/logger';
import { processOrder } from '../utils/gamification';
import { formatCurrency } from '../utils/formatters';

const InboxManager: React.FC = () => {
    const [tab, setTab] = useState<'REPORTS' | 'ORDERS'>('REPORTS');
    const [reports, setReports] = useState<PendingReport[]>([]);
    const [orders, setOrders] = useState<PendingOrder[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const settings = getSettings();

    useEffect(() => {
        setReports(getPendingReports());
        setOrders(getPendingOrders());
        setStudents(getStudents());
    }, []);

    const handleRefresh = async () => {
        setLoading(true);
        await fetchPendingReportsCloud(); 
        setReports(getPendingReports());
        setOrders(getPendingOrders());
        setStudents(getStudents());
        setLoading(false);
    };

    // --- Report Logic ---

    const handleApproveReport = (report: PendingReport, useImmunity: boolean = false) => {
        const student = students.find(s => s.name === report.targetStudentName);
        if (!student) {
            alert(`Không tìm thấy học sinh tên "${report.targetStudentName}" trong danh sách lớp!`);
            return;
        }

        const reportWeek = report.week || 1;
        const reportDate = report.targetDate || new Date(report.timestamp).toISOString().split('T')[0];

        // Immunity Handling
        if (useImmunity) {
             const immunityItem = (student.inventory || []).find(i => settings.gamification.rewards.find(r => r.id === i.itemId)?.type === 'IMMUNITY');
             if (immunityItem && immunityItem.count > 0) {
                 let newInventory = [...(student.inventory || [])];
                 if (immunityItem.count > 1) {
                     newInventory = newInventory.map(i => i.itemId === immunityItem.itemId ? { ...i, count: i.count - 1 } : i);
                 } else {
                     newInventory = newInventory.filter(i => i.itemId !== immunityItem.itemId);
                 }
                 
                 const updatedStudent = { ...student, inventory: newInventory };
                 const newStudents = students.map(s => s.id === student.id ? updatedStudent : s);
                 setStudents(newStudents);
                 saveStudents(newStudents);
                 addLog('GAME', `${student.name} đã dùng Kim Bài Miễn Tử cho lỗi: ${report.content}`);
                 
                 const updatedReports = reports.map(r => r.id === report.id ? { ...r, status: 'APPROVED', note: `${r.note || ''} [Đã dùng Kim Bài]` } as PendingReport : r);
                 setReports(updatedReports);
                 savePendingReports(updatedReports);
                 return;
             } else {
                 alert("Học sinh không còn Kim Bài!");
                 return;
             }
        }

        // 1. Handle ATTENDANCE
        if (report.type === 'ATTENDANCE') {
            const allAttendance = getAttendance();
            const newAttRecord: AttendanceRecord = {
                id: `ATT-${Date.now()}`,
                studentId: student.id,
                date: reportDate,
                status: report.content as AttendanceStatus,
                note: report.note
            };
            saveAttendance([...allAttendance, newAttRecord]);
            addLog('INBOX', `Đã duyệt điểm danh: ${student.name} - ${report.content}`);

            if (report.content === AttendanceStatus.UNEXCUSED || report.content === AttendanceStatus.LATE) {
                applyViolation(student, reportWeek, report.content, report.note);
            }
        } 
        // 2. Handle BONUS (Coins)
        else if (report.type === 'BONUS') {
            const reward = report.rewardAmount || 0;
            const allConduct = getConductRecords();
            const existingIdx = allConduct.findIndex(r => r.studentId === student.id && r.week === reportWeek);
            let newRecords = [...allConduct];
            const behaviorLabel = `${report.content}`;

            if (existingIdx > -1) {
                newRecords[existingIdx] = {
                    ...newRecords[existingIdx],
                    positiveBehaviors: [...(newRecords[existingIdx].positiveBehaviors || []), behaviorLabel]
                };
            } else {
                newRecords.push({
                    id: `CON-${student.id}-W${reportWeek}`,
                    studentId: student.id,
                    week: reportWeek,
                    score: settings.defaultScore,
                    violations: [],
                    positiveBehaviors: [behaviorLabel],
                    note: ''
                });
            }
            saveConductRecords(newRecords);

            const currentBalance = student.balance || 0;
            const updatedStudent = { ...student, balance: currentBalance + reward };
            const newStudents = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
            setStudents(newStudents);
            saveStudents(newStudents);

            addLog('INBOX', `Đã duyệt thưởng: ${student.name} +${reward} xu`);
        }
        // 3. Handle FUND (Money)
        else if (report.type === 'FUND') {
            const amount = report.fundAmount || 0;
            const newTrans: FundTransaction = {
                id: `FT-${Date.now()}`,
                date: reportDate,
                type: 'IN',
                amount: amount,
                category: 'Thu quỹ (Thủ quỹ báo)',
                description: `${report.note || 'Thu tiền'} - ${student.name}`,
                relatedStudentIds: [student.id],
                pic: report.reporterName
            };
            const currentFunds = getFundTransactions();
            saveFundTransactions([newTrans, ...currentFunds]);
            addLog('INBOX', `Đã duyệt thu quỹ: ${student.name} - ${formatCurrency(amount)}`);
        }
        // 4. Handle VIOLATION
        else {
            applyViolation(student, reportWeek, report.content, report.note);
            addLog('INBOX', `Đã duyệt vi phạm: ${student.name} - ${report.content}`);
        }

        // 5. Mark as APPROVED
        const updated = reports.map(r => r.id === report.id ? { ...r, status: 'APPROVED' } as PendingReport : r);
        setReports(updated);
        savePendingReports(updated);
    };

    const applyViolation = (student: Student, week: number, violationName: string, note?: string) => {
        const allConduct = getConductRecords();
        const existingIdx = allConduct.findIndex(r => r.studentId === student.id && r.week === week);
        
        let pointsToDeduct = 0;
        let vioConfig = settings.behaviorConfig.violations.find(v => v.label.toLowerCase() === violationName.toLowerCase());
        
        if (!vioConfig) {
             if (violationName === AttendanceStatus.UNEXCUSED) vioConfig = settings.behaviorConfig.violations.find(v => v.label === 'Vắng không phép');
             if (violationName === AttendanceStatus.LATE) vioConfig = settings.behaviorConfig.violations.find(v => v.label === 'Đi muộn');
        }

        if (vioConfig) pointsToDeduct = Math.abs(vioConfig.points);
        else pointsToDeduct = 2; 

        const labelWithNote = note ? `${violationName} (${note})` : violationName;
        const finalLabel = `${labelWithNote} (-${pointsToDeduct}đ)`;

        let newRecords = [...allConduct];
        if (existingIdx > -1) {
            const rec = newRecords[existingIdx];
            newRecords[existingIdx] = {
                ...rec,
                score: Math.max(0, rec.score - pointsToDeduct),
                violations: [...rec.violations, finalLabel]
            };
        } else {
            newRecords.push({
                id: `CON-${student.id}-W${week}`,
                studentId: student.id,
                week: week,
                score: settings.defaultScore - pointsToDeduct,
                violations: [finalLabel],
                positiveBehaviors: [],
                note: ''
            });
        }
        saveConductRecords(newRecords);
    };

    const handleRejectReport = (id: string) => {
        if (!window.confirm("Từ chối báo cáo này?")) return;
        const updated = reports.map(r => r.id === id ? { ...r, status: 'REJECTED' } as PendingReport : r);
        setReports(updated);
        savePendingReports(updated);
    };

    const handleResolveOrder = (order: PendingOrder, action: 'APPROVE' | 'REJECT') => {
        const student = students.find(s => s.id === order.studentId);
        if (!student) { alert("Không tìm thấy học sinh!"); return; }
        if (action === 'REJECT' && !window.confirm(`Từ chối đơn hàng của ${order.studentName}? Xu sẽ được hoàn lại.`)) return;

        const updatedStudent = processOrder(student, order, action, settings);
        const newStudents = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
        setStudents(newStudents);
        saveStudents(newStudents);

        const updatedOrders = orders.map(o => o.id === order.id ? { ...o, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } as PendingOrder : o);
        setOrders(updatedOrders);
        savePendingOrders(updatedOrders);
        
        addLog('SHOP', `${action === 'APPROVE' ? 'Đã duyệt' : 'Đã từ chối'} đơn hàng: ${order.itemName} cho ${student.name}`);
    };

    const pendingReports = reports.filter(r => r.status === 'PENDING' || !r.status);
    const pendingOrders = orders.filter(o => o.status === 'PENDING');
    pendingOrders.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const renderReportItem = (report: PendingReport) => {
        const student = students.find(s => s.name === report.targetStudentName);
        const hasImmunity = student?.inventory?.some(i => settings.gamification.rewards.find(r => r.id === i.itemId)?.type === 'IMMUNITY');
        const isBonus = report.type === 'BONUS';
        const isFund = report.type === 'FUND';

        return (
            <div key={report.id} className={`border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:shadow-md transition-shadow ${isBonus ? 'bg-yellow-50 border-yellow-200' : isFund ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-indigo-100'}`}>
                <div className="flex-1">
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                        <span className="flex items-center gap-1 bg-white border px-1.5 rounded"><Calendar size={10}/> Tuần {report.week || '?'}</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {report.targetDate || new Date(report.timestamp).toLocaleDateString()}</span>
                        <span className="bg-white border px-1.5 rounded ml-auto md:ml-0 font-medium">Người báo: {report.reporterName || 'Ẩn danh'}</span>
                    </div>
                    <div className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        {report.targetStudentName}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        {report.type === 'ATTENDANCE' ? (
                            <span className={`text-sm font-bold px-2 py-0.5 rounded flex items-center gap-1 ${report.content === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : report.content === AttendanceStatus.EXCUSED ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                <Clock size={14}/> {report.content}
                            </span>
                        ) : report.type === 'BONUS' ? (
                            <span className="text-sm font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 flex items-center gap-1 border border-yellow-200">
                                <Award size={14}/> {report.content}
                            </span>
                        ) : report.type === 'FUND' ? (
                            <span className="text-sm font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 flex items-center gap-1 border border-green-200">
                                <Banknote size={14}/> {report.content}
                            </span>
                        ) : (
                            <span className="text-sm font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 flex items-center gap-1">
                                <AlertTriangle size={14}/> Vi phạm: {report.content}
                            </span>
                        )}
                        {report.note && <span className="text-sm text-gray-600 italic bg-white px-2 rounded border">Ghi chú: {report.note}</span>}
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    {hasImmunity && report.type === 'VIOLATION' && (
                        <button onClick={() => handleApproveReport(report, true)} className="flex-1 md:flex-none bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 shadow-sm" title="Học sinh có Kim Bài">
                            <Shield size={16} /> Dùng Kim Bài
                        </button>
                    )}
                    <button onClick={() => handleApproveReport(report, false)} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 shadow-sm">
                        <Check size={16} /> Duyệt
                    </button>
                    <button onClick={() => handleRejectReport(report.id)} className="flex-1 md:flex-none bg-white border hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                        <X size={16} /> Hủy
                    </button>
                </div>
            </div>
        );
    }

    const renderOrderItem = (order: PendingOrder) => {
        return (
            <div key={order.id} className="border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:shadow-md transition-shadow bg-indigo-50 border-indigo-100">
                <div className="flex-1">
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(order.timestamp).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        {order.studentName}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-sm font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                            <ShoppingBag size={14}/> {order.itemType === 'REWARD' ? 'Đổi quà' : order.itemType === 'AVATAR' ? 'Mua Avatar' : 'Mua Khung'}: {order.itemName}
                        </span>
                        <span className="text-sm font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 flex items-center gap-1 border border-yellow-200">
                            <Coins size={14}/> {order.cost} xu
                        </span>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button onClick={() => handleResolveOrder(order, 'APPROVE')} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 shadow-sm">
                        <Check size={16} /> Duyệt
                    </button>
                    <button onClick={() => handleResolveOrder(order, 'REJECT')} className="flex-1 md:flex-none bg-white border hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                        <X size={16} /> Từ chối
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border p-6 min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Inbox className="text-indigo-600" /> Hộp thư & Duyệt đơn
                </h2>
                <button onClick={handleRefresh} className="flex items-center gap-2 text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded transition">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Đồng bộ
                </button>
            </div>

            <div className="flex gap-2 border-b mb-4">
                <button onClick={() => setTab('REPORTS')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${tab === 'REPORTS' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}>
                    <AlertTriangle size={16}/> Báo cáo ({pendingReports.length})
                </button>
                <button onClick={() => setTab('ORDERS')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${tab === 'ORDERS' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}>
                    <ShoppingBag size={16}/> Đơn hàng ({pendingOrders.length})
                </button>
            </div>

            <div className="space-y-4">
                {tab === 'REPORTS' && (
                    <>
                         {pendingReports.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 bg-gray-50 rounded border border-dashed">
                                <p>Không có báo cáo nào cần duyệt.</p>
                            </div>
                         ) : (
                             pendingReports.map(r => renderReportItem(r))
                         )}
                    </>
                )}

                {tab === 'ORDERS' && (
                    <>
                        {pendingOrders.length === 0 ? (
                             <div className="text-center py-10 text-gray-400 bg-gray-50 rounded border border-dashed">
                                 <p>Không có đơn hàng nào chờ duyệt.</p>
                             </div>
                        ) : (
                             pendingOrders.map(o => renderOrderItem(o))
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default InboxManager;
