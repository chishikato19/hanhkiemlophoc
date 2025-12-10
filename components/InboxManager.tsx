
import React, { useState, useEffect } from 'react';
import { PendingReport, AttendanceStatus, AttendanceRecord, ConductRecord, Student, Settings } from '../types';
import { getPendingReports, savePendingReports, getStudents, getAttendance, saveAttendance, getConductRecords, saveConductRecords, getSettings, fetchPendingReportsCloud } from '../services/dataService';
import { Check, X, Inbox, Clock, AlertTriangle, RefreshCw, Calendar } from 'lucide-react';
import { addLog } from '../utils/logger';

const InboxManager: React.FC = () => {
    const [reports, setReports] = useState<PendingReport[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const settings = getSettings();

    useEffect(() => {
        setReports(getPendingReports());
        setStudents(getStudents());
    }, []);

    const handleRefresh = async () => {
        setLoading(true);
        await fetchPendingReportsCloud();
        setReports(getPendingReports());
        setLoading(false);
    };

    const handleApprove = (report: PendingReport) => {
        const student = students.find(s => s.name === report.targetStudentName);
        if (!student) {
            alert(`Không tìm thấy học sinh tên "${report.targetStudentName}" trong danh sách lớp!`);
            return;
        }

        const reportWeek = report.week || 1;
        const reportDate = report.targetDate || new Date(report.timestamp).toISOString().split('T')[0];

        // 1. Handle ATTENDANCE
        if (report.type === 'ATTENDANCE') {
            // A. Save to Attendance Log
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

            // B. If 'Unexcused' or 'Late', ALSO add to Conduct as a Violation
            if (report.content === AttendanceStatus.UNEXCUSED || report.content === AttendanceStatus.LATE) {
                applyViolation(student, reportWeek, report.content, report.note);
            }
        } 
        // 2. Handle VIOLATION
        else {
            applyViolation(student, reportWeek, report.content, report.note);
            addLog('INBOX', `Đã duyệt vi phạm: ${student.name} - ${report.content}`);
        }

        // 3. Remove from Inbox
        const updated = reports.filter(r => r.id !== report.id);
        setReports(updated);
        savePendingReports(updated);
    };

    const applyViolation = (student: Student, week: number, violationName: string, note?: string) => {
        const allConduct = getConductRecords();
        const existingIdx = allConduct.findIndex(r => r.studentId === student.id && r.week === week);
        
        // Find Violation points from settings
        let pointsToDeduct = 0;
        // Try exact match
        let vioConfig = settings.behaviorConfig.violations.find(v => v.label.toLowerCase() === violationName.toLowerCase());
        
        // If not found, try mapping "Vắng không phép" etc.
        if (!vioConfig) {
             if (violationName === AttendanceStatus.UNEXCUSED) vioConfig = settings.behaviorConfig.violations.find(v => v.label === 'Vắng không phép');
             if (violationName === AttendanceStatus.LATE) vioConfig = settings.behaviorConfig.violations.find(v => v.label === 'Đi muộn');
        }

        if (vioConfig) pointsToDeduct = Math.abs(vioConfig.points);
        else pointsToDeduct = 2; // Default penalty fallback

        // Format: "Violation (Note) (-Points)"
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

    const handleReject = (id: string) => {
        if (!window.confirm("Xóa báo cáo này?")) return;
        const updated = reports.filter(r => r.id !== id);
        setReports(updated);
        savePendingReports(updated);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border p-6 min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Inbox className="text-indigo-600" /> Hộp thư Báo cáo ({reports.length})
                </h2>
                <button onClick={handleRefresh} className="flex items-center gap-2 text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded transition">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Làm mới
                </button>
            </div>

            {reports.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <Inbox size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Không có báo cáo nào đang chờ duyệt.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reports.map(report => (
                        <div key={report.id} className="border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:shadow-md transition-shadow bg-gray-50">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                                    <span className="flex items-center gap-1 bg-white border px-1.5 rounded"><Calendar size={10}/> Tuần {report.week || '?'}</span>
                                    <span className="flex items-center gap-1"><Clock size={10} /> {report.targetDate || new Date(report.timestamp).toLocaleDateString()}</span>
                                    <span className="bg-gray-200 px-1.5 rounded ml-auto md:ml-0">Người báo: {report.reporterName || 'Ẩn danh'}</span>
                                </div>
                                <div className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                    {report.targetStudentName}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    {report.type === 'ATTENDANCE' ? (
                                        <span className={`text-sm font-bold px-2 py-0.5 rounded flex items-center gap-1 ${report.content === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : report.content === AttendanceStatus.EXCUSED ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                            <Clock size={14}/> {report.content}
                                        </span>
                                    ) : (
                                        <span className="text-sm font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 flex items-center gap-1">
                                            <AlertTriangle size={14}/> Vi phạm: {report.content}
                                        </span>
                                    )}
                                    {report.note && <span className="text-sm text-gray-600 italic bg-white px-2 rounded border">Ghi chú: {report.note}</span>}
                                </div>
                                {report.type === 'ATTENDANCE' && (report.content === AttendanceStatus.LATE || report.content === AttendanceStatus.UNEXCUSED) && (
                                     <div className="text-[10px] text-red-500 mt-1 italic">* Sẽ tự động trừ điểm hạnh kiểm khi duyệt</div>
                                )}
                            </div>
                            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                <button onClick={() => handleApprove(report)} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 shadow-sm">
                                    <Check size={16} /> Duyệt
                                </button>
                                <button onClick={() => handleReject(report.id)} className="flex-1 md:flex-none bg-white border hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                                    <X size={16} /> Xóa
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InboxManager;
