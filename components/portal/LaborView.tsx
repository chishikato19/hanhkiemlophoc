
import React, { useState, useRef } from 'react';
import { Printer, Download, X } from 'lucide-react';
import { DutyTask, Student, PendingReport } from '../../types';
import { getDutyRoster, saveDutyRoster, sendStudentReport } from '../../services/dataService';

// Use global html2canvas
declare const html2canvas: any;

interface Props {
    students: Student[];
    currentUser: Student;
    onLoading: (isLoading: boolean) => void;
    filteredStudents: Student[];
    studentSearch: string;
    setStudentSearch: (s: string) => void;
    selectedDate: string;
    selectedWeek: number;
}

const LaborView: React.FC<Props> = ({ students, currentUser, onLoading, filteredStudents, studentSearch, setStudentSearch, selectedDate, selectedWeek }) => {
    const [laborTab, setLaborTab] = useState<'EVALUATE' | 'ROSTER'>('EVALUATE');
    const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 2 : new Date().getDay() + 1);
    const [dutyRoster, setDutyRoster] = useState<DutyTask[]>(getDutyRoster());
    const [draggingStudent, setDraggingStudent] = useState<string | null>(null);
    const rosterRef = useRef<HTMLDivElement>(null);

    const getDutyForDay = (day: number) => dutyRoster.find(d => d.dayOfWeek === day) || { dayOfWeek: day, morning: [], board: [], afternoon: [] };

    const updateDuty = (day: number, field: 'morning' | 'board' | 'afternoon', studentId: string, remove: boolean = false) => {
        const current = getDutyForDay(day);
        let updatedTask = { ...current };
        if (remove) {
            updatedTask[field] = updatedTask[field].filter(id => id !== studentId);
        } else {
            if (!updatedTask[field].includes(studentId)) updatedTask[field] = [...updatedTask[field], studentId];
        }
        
        const newRoster = dutyRoster.filter(d => d.dayOfWeek !== day);
        newRoster.push(updatedTask);
        setDutyRoster(newRoster);
        saveDutyRoster(newRoster);
    };

    const handleEvaluateDuty = async (studentId: string, rating: 'GOOD' | 'PASS' | 'FAIL') => {
        const student = students.find(s => s.id === studentId);
        if (!student || !currentUser) return;
        
        let type: 'VIOLATION' | 'BONUS' = 'BONUS';
        let content = '';

        if (rating === 'GOOD') {
            content = 'Trực nhật Tốt (+2đ)';
        } else if (rating === 'PASS') {
            return; // Just logging
        } else {
            type = 'VIOLATION';
            content = 'Trực nhật bẩn/Chưa đạt (-2đ)';
        }

        const report: PendingReport = {
            id: `REP-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString(),
            targetDate: selectedDate,
            week: selectedWeek,
            reporterName: currentUser.name,
            roleId: (currentUser.roles || []).join(','),
            targetStudentName: student.name,
            type,
            content,
            note: 'Đánh giá từ Lớp phó Lao động'
        };
        
        onLoading(true);
        await sendStudentReport(report);
        onLoading(false);
        alert(`Đã đánh giá ${rating} cho ${student.name}`);
    };

    const handleExportRoster = async () => {
        if (!rosterRef.current) return;
        try {
            const canvas = await html2canvas(rosterRef.current, { scale: 2, useCORS: true });
            const link = document.createElement('a');
            link.download = `PhanCongTrucNhat_Thu${selectedDay}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (e) { alert("Lỗi xuất ảnh"); }
    };

    return (
        <div className="flex-1 overflow-y-auto p-2 bg-gray-50 flex flex-col">
            <div className="flex bg-white rounded-lg shadow-sm border p-1 mb-2 shrink-0">
                <button type="button" onClick={() => setLaborTab('EVALUATE')} className={`flex-1 py-1.5 text-xs font-bold rounded ${laborTab === 'EVALUATE' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Đánh giá</button>
                <button type="button" onClick={() => setLaborTab('ROSTER')} className={`flex-1 py-1.5 text-xs font-bold rounded ${laborTab === 'ROSTER' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Phân công</button>
            </div>

            {laborTab === 'EVALUATE' ? (
                <div className="space-y-3">
                    <div className="bg-white p-3 rounded-lg border">
                        <label className="text-xs font-bold text-gray-500 block mb-2">Chọn ngày đánh giá:</label>
                        <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            {[2,3,4,5,6,7].map(d => (
                                <button key={d} type="button" onClick={() => setSelectedDay(d)} className={`w-8 h-8 rounded-full text-xs font-bold shrink-0 ${selectedDay === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>T{d}</button>
                            ))}
                        </div>
                    </div>
                    {['morning', 'board', 'afternoon'].map(time => {
                        const duty = getDutyForDay(selectedDay);
                        const studentIds = (duty as any)[time] || [];
                        const label = time === 'morning' ? 'Đầu giờ' : time === 'board' ? 'Lau bảng' : 'Cuối giờ';
                        return (
                            <div key={time} className="bg-white p-3 rounded-lg border shadow-sm">
                                <h4 className="font-bold text-indigo-800 text-sm mb-2">{label}</h4>
                                {studentIds.length === 0 && <span className="text-xs text-gray-400">Chưa phân công</span>}
                                {studentIds.map((sid: string) => {
                                    const s = students.find(st => st.id === sid);
                                    return (
                                        <div key={sid} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <span className="text-sm font-medium">{s?.name}</span>
                                            <div className="flex gap-1">
                                                <button type="button" onClick={() => handleEvaluateDuty(sid, 'GOOD')} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-bold">Tốt</button>
                                                <button type="button" onClick={() => handleEvaluateDuty(sid, 'PASS')} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-bold">Đạt</button>
                                                <button type="button" onClick={() => handleEvaluateDuty(sid, 'FAIL')} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-bold">Ẩu</button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex-1 flex flex-col h-full">
                    <div className="flex justify-between mb-2">
                        <div className="flex gap-1">
                            {[2,3,4,5,6,7].map(d => (<button key={d} type="button" onClick={() => setSelectedDay(d)} className={`w-8 h-8 rounded text-xs font-bold ${selectedDay === d ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>T{d}</button>))}
                        </div>
                        <div className="flex gap-1">
                            <button type="button" onClick={handleExportRoster} className="bg-green-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1"><Download size={12}/> Ảnh</button>
                            <button type="button" onClick={() => window.print()} className="bg-gray-800 text-white px-3 py-1 rounded text-xs flex items-center gap-1"><Printer size={12}/> In</button>
                        </div>
                    </div>
                    <div ref={rosterRef} className="flex-1 bg-white border rounded-lg p-2 overflow-hidden flex flex-col">
                        <h4 className="text-center font-bold text-indigo-800 mb-2 uppercase text-sm bg-gray-100 py-1 rounded">Phân công Thứ {selectedDay}</h4>
                        <div className="grid grid-cols-3 gap-2 h-1/2 mb-2">
                            {['morning', 'board', 'afternoon'].map(time => (
                                <div key={time} className="border rounded bg-gray-50 p-2 flex flex-col" onDragOver={e => e.preventDefault()} onDrop={() => draggingStudent && updateDuty(selectedDay, time as any, draggingStudent)}>
                                    <h5 className="font-bold text-xs text-center mb-1 text-gray-500 uppercase">{time === 'morning' ? 'Đầu giờ' : time === 'board' ? 'Lau bảng' : 'Cuối giờ'}</h5>
                                    <div className="flex-1 overflow-y-auto space-y-1">
                                        {(getDutyForDay(selectedDay) as any)[time]?.map((sid: string) => (
                                            <div key={sid} className="bg-white border px-2 py-1 rounded text-xs flex justify-between items-center shadow-sm">
                                                <span className="truncate">{students.find(s => s.id === sid)?.name}</span>
                                                <button type="button" onClick={() => updateDuty(selectedDay, time as any, sid, true)}><X size={10} className="text-red-400"/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t pt-2 flex-1 flex flex-col">
                            <input className="w-full border p-1 rounded text-xs mb-2" placeholder="Tìm học sinh..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)}/>
                            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2">
                                {filteredStudents.map(s => (
                                    <div key={s.id} draggable onDragStart={() => setDraggingStudent(s.id)} className="bg-white border p-2 rounded text-xs cursor-grab active:cursor-grabbing hover:bg-indigo-50">
                                        {s.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaborView;
