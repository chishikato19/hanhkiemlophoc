
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus } from '../../types';
import { getAttendance, saveAttendance } from '../../services/dataService';
import { Clock, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { addLog } from '../../utils/logger';

interface Props {
    students: Student[];
}

const AttendanceReport: React.FC<Props> = ({ students }) => {
    // Change to state to allow updates (deletions)
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

    useEffect(() => {
        setAttendanceRecords(getAttendance());
    }, []);

    const handleDeleteRecord = (recordId: string, studentName: string, date: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa lượt điểm danh của ${studentName} ngày ${date}?`)) {
            const newRecords = attendanceRecords.filter(r => r.id !== recordId);
            setAttendanceRecords(newRecords);
            saveAttendance(newRecords);
            addLog('ATTENDANCE', `Đã xóa thủ công lượt điểm danh của ${studentName}`);
        }
    };

    const stats = useMemo(() => {
        const res: Record<string, { late: number, unexcused: number, excused: number, records: AttendanceRecord[] }> = {};
        students.forEach(s => {
            res[s.id] = { late: 0, unexcused: 0, excused: 0, records: [] };
        });

        attendanceRecords.forEach(rec => {
            if (res[rec.studentId]) {
                if (rec.status === AttendanceStatus.LATE) res[rec.studentId].late++;
                if (rec.status === AttendanceStatus.UNEXCUSED) res[rec.studentId].unexcused++;
                if (rec.status === AttendanceStatus.EXCUSED) res[rec.studentId].excused++;
                res[rec.studentId].records.push(rec);
            }
        });
        return res;
    }, [students, attendanceRecords]);

    const activeStudents = students.filter(s => s.isActive !== false);

    const getStatusColor = (status: AttendanceStatus) => {
        switch (status) {
            case AttendanceStatus.LATE: return 'text-yellow-700 bg-yellow-50 border-yellow-200';
            case AttendanceStatus.UNEXCUSED: return 'text-red-700 bg-red-50 border-red-200';
            case AttendanceStatus.EXCUSED: return 'text-blue-700 bg-blue-50 border-blue-200';
            default: return 'text-gray-700 bg-gray-50';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="text-indigo-600"/> Thống kê Điểm danh & Chuyên cần
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-100 text-gray-600 font-semibold">
                        <tr>
                            <th className="p-3 border-b">Học sinh</th>
                            <th className="p-3 border-b text-center w-24 text-yellow-600">Đi muộn</th>
                            <th className="p-3 border-b text-center w-24 text-red-600">Vắng KP</th>
                            <th className="p-3 border-b text-center w-24 text-blue-600">Vắng CP</th>
                            <th className="p-3 border-b">Chi tiết ngày (Bấm X để xóa)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {activeStudents.map(s => {
                            const stat = stats[s.id];
                            // Show row only if there is data
                            if (stat.late === 0 && stat.unexcused === 0 && stat.excused === 0) return null; 
                            
                            return (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-800 align-top">{s.name}</td>
                                    <td className={`p-3 text-center align-top ${stat.late > 0 ? 'font-bold bg-yellow-50 text-yellow-700' : 'text-gray-300'}`}>{stat.late}</td>
                                    <td className={`p-3 text-center align-top ${stat.unexcused > 0 ? 'font-bold bg-red-50 text-red-700' : 'text-gray-300'}`}>{stat.unexcused}</td>
                                    <td className={`p-3 text-center align-top ${stat.excused > 0 ? 'font-bold bg-blue-50 text-blue-700' : 'text-gray-300'}`}>{stat.excused}</td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-2">
                                            {stat.records.map((rec) => (
                                                <div key={rec.id} className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${getStatusColor(rec.status)}`}>
                                                    <span>{rec.date} ({rec.status})</span>
                                                    <button 
                                                        onClick={() => handleDeleteRecord(rec.id, s.name, rec.date)}
                                                        className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
                                                        title="Xóa lượt điểm danh này"
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {activeStudents.every(s => stats[s.id].late === 0 && stats[s.id].unexcused === 0 && stats[s.id].excused === 0) && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                                    Chưa có dữ liệu vắng/muộn nào. Lớp đi học đầy đủ!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttendanceReport;
