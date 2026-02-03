
import React, { useState, useRef } from 'react';
import { User, X, LineChart as ChartIcon } from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, Line } from 'recharts';
import { Student, ConductRecord, Settings } from '../../types';
import { formatGroupedList } from '../../utils/formatters';
import ReportCard from './ReportCard';

// Use global html2canvas
declare const html2canvas: any;

interface Props {
    student: Student | null;
    records: ConductRecord[];
    settings: Settings;
    onClose: () => void;
}

const StudentDetailModal: React.FC<Props> = ({ student, records, settings, onClose }) => {
    const [view, setView] = useState<'chart' | 'card'>('chart');
    const [selectedWeekForCard, setSelectedWeekForCard] = useState(records.length > 0 ? records[records.length-1].week : 1);
    const cardRef = useRef<HTMLDivElement>(null);
    const [isCopying, setIsCopying] = useState(false);

    if (!student) return null;
    const studentRecords = records.filter(r => r.studentId === student.id).sort((a, b) => a.week - b.week);
    const chartData = studentRecords.map(r => ({ name: `Tuần ${r.week}`, Score: r.score }));
    const avgScore = studentRecords.length > 0 ? Math.round(studentRecords.reduce((a, b) => a + b.score, 0) / studentRecords.length) : 0;
    
    const handleDownloadImage = async () => {
        if (!cardRef.current) return;
        try {
            const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `PhieuLienLac_${student.name}_Tuan${selectedWeekForCard}.png`;
            link.click();
        } catch (e) { alert("Lỗi khi tạo ảnh."); }
    };
    const handleCopyToClipboard = async () => {
        if (!cardRef.current) return;
        setIsCopying(true);
        try {
            const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
            canvas.toBlob(async (blob: Blob | null) => {
                if (!blob) { setIsCopying(false); return; }
                try { await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]); alert("✅ Đã sao chép ảnh! Ctrl+V để dán."); } catch (err) { alert("Không thể copy tự động. Hãy dùng nút Tải về."); }
                setIsCopying(false);
            });
        } catch (error) { setIsCopying(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-indigo-600 text-white flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2"><User size={24} /> {student.name}</h3>
                    <div className="flex items-center gap-2">
                         <div className="flex bg-indigo-800 rounded-lg p-0.5 text-xs font-medium">
                            <button onClick={() => setView('chart')} className={`px-2 py-1 rounded-md ${view === 'chart' ? 'bg-white text-indigo-900 shadow' : 'text-indigo-200 hover:text-white'}`}>Chi tiết</button>
                            <button onClick={() => setView('card')} className={`px-2 py-1 rounded-md ${view === 'card' ? 'bg-white text-indigo-900 shadow' : 'text-indigo-200 hover:text-white'}`}>Phiếu Liên Lạc</button>
                         </div>
                         <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded"><X size={24}/></button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                    {view === 'chart' ? (
                        <>
                             <div className="flex justify-between items-center mb-6">
                                <div className="text-center bg-white p-3 rounded-lg border shadow-sm">
                                    <span className="block text-gray-500 text-xs uppercase">Điểm TB</span>
                                    <span className={`text-2xl font-bold ${avgScore >= 80 ? 'text-green-600' : avgScore >= 50 ? 'text-blue-600' : 'text-red-600'}`}>{avgScore}</span>
                                </div>
                                <div className="flex-1 ml-6 h-32 bg-white rounded-lg p-2 border shadow-sm"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/><XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false}/><Line type="monotone" dataKey="Score" stroke="#4f46e5" strokeWidth={3} dot={{r: 4}} /></LineChart></ResponsiveContainer></div>
                            </div>
                            <div className="space-y-3">
                                {studentRecords.map(r => (
                                    <div key={r.id} className="p-3 bg-white rounded-lg border hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-2"><div className="font-bold text-indigo-700">Tuần {r.week}</div><div className="font-bold px-2 py-0.5 rounded border text-sm">{r.score} điểm</div></div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><span className="text-red-500 font-semibold text-xs uppercase">Vi phạm</span>{r.violations.length>0 ? <ul className="list-disc list-inside text-red-700 text-xs">{formatGroupedList(r.violations, settings.behaviorConfig.violations).map((v,i)=><li key={i}>{v}</li>)}</ul> : <span className="text-gray-300 italic text-xs block">Không</span>}</div>
                                            <div><span className="text-green-600 font-semibold text-xs uppercase">Tích cực</span>{r.positiveBehaviors?.length>0 ? <ul className="list-disc list-inside text-green-700 text-xs">{formatGroupedList(r.positiveBehaviors, settings.behaviorConfig.positives).map((v,i)=><li key={i}>{v}</li>)}</ul> : <span className="text-gray-300 italic text-xs block">Không</span>}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="flex gap-2 mb-4">
                                <select value={selectedWeekForCard} onChange={(e) => setSelectedWeekForCard(parseInt(e.target.value))} className="border rounded px-2 text-sm">{records.filter(r => r.studentId === student.id).sort((a,b) => b.week - a.week).map(r => <option key={r.week} value={r.week}>Tuần {r.week}</option>)}</select>
                                <button onClick={handleCopyToClipboard} disabled={isCopying} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">{isCopying ? '...' : 'Sao chép'}</button>
                                <button onClick={handleDownloadImage} className="border px-3 py-1 rounded text-sm">Tải về</button>
                            </div>
                            <div className="border shadow-inner bg-gray-200 p-8 rounded-xl overflow-auto w-full flex justify-center"><ReportCard cardRef={cardRef} student={student} allRecords={records} week={selectedWeekForCard} record={records.find(r => r.studentId === student.id && r.week === selectedWeekForCard)} settings={settings}/></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentDetailModal;
