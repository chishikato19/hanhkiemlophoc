
import React, { useState, useEffect } from 'react';
import { PendingReport, AttendanceStatus, AttendanceRecord, ConductRecord, Student, Settings } from '../types';
import { getPendingReports, savePendingReports, getStudents, getAttendance, saveAttendance, getConductRecords, saveConductRecords, getSettings, fetchPendingReportsCloud } from '../services/dataService';
import { Check, X, Inbox, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
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
        // Simulate fetch from cloud or local check
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

        if (report.type === 'ATTENDANCE') {
            const allAttendance = getAttendance();
            const date = new Date(report.timestamp).toISOString().split('T')[0];
            const newRecord: AttendanceRecord = {
                id: `ATT-${Date.now()}`,
                studentId: student.id,
                date: date,
                status: report.content as AttendanceStatus,
                note: report.note
            };
            saveAttendance([...allAttendance, newRecord]);
            addLog('INBOX', `Đã duyệt điểm danh: ${student.name} - ${report.content}`);
        } else {
            // Violation Logic
            // Find current week (Logic simplified: assume current week based on date or selected week in main app? 
            // Since Inbox is standalone, let's assume Week 1 or we need context. 
            // For robustness, let's just create a record for "Current Week" calculated from date vs semester start)
            
            // Calculate week from timestamp
            const reportDate = new Date(report.timestamp);
            const semStart = new Date(settings.semesterStartDate);
            const diffTime = Math.abs(reportDate.getTime() - semStart.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            const weekNum = Math.ceil(diffDays / 7) || 1;

            const allConduct = getConductRecords();
            const existingIdx = allConduct.findIndex(r => r.studentId === student.id && r.week === weekNum);
            
            // Find Violation points
            let pointsToDeduct = 0;
            const vioConfig = settings.behaviorConfig.violations.find(v => v.label.toLowerCase() === report.content.toLowerCase());
            if (vioConfig) pointsToDeduct = Math.abs(vioConfig.points);
            else pointsToDeduct = 2; // Default penalty if unknown

            let newRecords = [...allConduct];
            if (existingIdx > -1) {
                const rec = newRecords[existingIdx];
                newRecords[existingIdx] = {
                    ...rec,
                    score: Math.max(0, rec.score - pointsToDeduct),
                    violations: [...rec.violations, report.content + (report.note ? ` (${report.note})` : '')]
                };
            } else {
                newRecords.push({
                    id: `CON-${student.id}-W${weekNum}`,
                    studentId: student.id,
                    week: weekNum,
                    score: settings.defaultScore - pointsToDeduct,
                    violations: [report.content + (report.note ? ` (${report.note})` : '')],
                    positiveBehaviors: [],
                    note: ''
                });
            }
            saveConductRecords(newRecords);
            addLog('INBOX', `Đã duyệt vi phạm: ${student.name} - ${report.content}`);
        }

        // Remove from list
        const updated = reports.filter(r => r.id !== report.id);
        setReports(updated);
        savePendingReports(updated);
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
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                    <Clock size={12} /> {new Date(report.timestamp).toLocaleString()}
                                    <span className="bg-gray-200 px-1.5 rounded">Người báo: {report.reporterName || 'Ẩn danh'}</span>
                                </div>
                                <div className="font-medium text-lg text-gray-800">
                                    {report.targetStudentName}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    {report.type === 'ATTENDANCE' ? (
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 ${report.content === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                            <Clock size={12}/> {report.content}
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 flex items-center gap-1">
                                            <AlertTriangle size={12}/> Vi phạm: {report.content}
                                        </span>
                                    )}
                                    {report.note && <span className="text-xs text-gray-500 italic">- {report.note}</span>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleApprove(report)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 shadow-sm">
                                    <Check size={16} /> Duyệt
                                </button>
                                <button onClick={() => handleReject(report.id)} className="bg-white border hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1">
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
