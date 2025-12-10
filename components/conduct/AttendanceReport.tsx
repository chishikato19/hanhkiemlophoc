
import React, { useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus } from '../../types';
import { getAttendance } from '../../services/dataService';
import { Clock, XCircle, AlertCircle } from 'lucide-react';

interface Props {
    students: Student[];
}

const AttendanceReport: React.FC<Props> = ({ students }) => {
    const attendanceRecords = getAttendance();

    const stats = useMemo(() => {
        const res: Record<string, { late: number, unexcused: number, excused: number, dates: string[] }> = {};
        students.forEach(s => {
            res[s.id] = { late: 0, unexcused: 0, excused: 0, dates: [] };
        });

        attendanceRecords.forEach(rec => {
            if (res[rec.studentId]) {
                if (rec.status === AttendanceStatus.LATE) res[rec.studentId].late++;
                if (rec.status === AttendanceStatus.UNEXCUSED) res[rec.studentId].unexcused++;
                if (rec.status === AttendanceStatus.EXCUSED) res[rec.studentId].excused++;
                res[rec.studentId].dates.push(`${rec.date} (${rec.status})`);
            }
        });
        return res;
    }, [students, attendanceRecords]);

    const activeStudents = students.filter(s => s.isActive !== false);

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
                            <th className="p-3 border-b">Chi tiết ngày</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {activeStudents.map(s => {
                            const stat = stats[s.id];
                            if (stat.late === 0 && stat.unexcused === 0 && stat.excused === 0) return null; // Hide students with perfect attendance? Or keep all. Let's hide for clean view or filter.
                            
                            return (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-800">{s.name}</td>
                                    <td className={`p-3 text-center ${stat.late > 0 ? 'font-bold bg-yellow-50 text-yellow-700' : 'text-gray-300'}`}>{stat.late}</td>
                                    <td className={`p-3 text-center ${stat.unexcused > 0 ? 'font-bold bg-red-50 text-red-700' : 'text-gray-300'}`}>{stat.unexcused}</td>
                                    <td className={`p-3 text-center ${stat.excused > 0 ? 'font-bold bg-blue-50 text-blue-700' : 'text-gray-300'}`}>{stat.excused}</td>
                                    <td className="p-3 text-xs text-gray-500">
                                        {stat.dates.join(', ')}
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
