
import React, { useMemo } from 'react';
import { AlertTriangle, ThumbsUp, Sparkles, StickyNote } from 'lucide-react';
import { Student, ConductRecord, Settings, AcademicRank } from '../../types';
import { analyzeStudent } from '../../utils/analytics';
import { formatGroupedList } from '../../utils/formatters';

interface Props {
    student: Student;
    record: ConductRecord | undefined;
    allRecords: ConductRecord[];
    week: number;
    settings: Settings;
    cardRef: React.RefObject<HTMLDivElement | null>;
}

const ReportCard: React.FC<Props> = ({ student, record, allRecords, week, settings, cardRef }) => {
    const score = record ? record.score : 0;
    const alerts = useMemo(() => {
        const activeWeeksSet = new Set<number>();
        allRecords.forEach(r => activeWeeksSet.add(r.week));
        const activeWeeks = Array.from(activeWeeksSet).sort((a,b) => a - b);
        return analyzeStudent(student, allRecords, settings, week, activeWeeks);
    }, [student, allRecords, week, settings]);

    const getRank = (s: number) => {
        if (s >= settings.thresholds.good) return AcademicRank.GOOD;
        if (s >= settings.thresholds.fair) return AcademicRank.FAIR;
        if (s >= settings.thresholds.pass) return AcademicRank.PASS;
        return AcademicRank.FAIL;
    };
    const rank = record ? getRank(score) : 'Chưa có';
    
    return (
        <div ref={cardRef} className="w-[450px] bg-white p-0 overflow-hidden shadow-2xl relative">
             <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3"></div>
             <div className="p-6 border-x border-b border-gray-100">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-indigo-800 uppercase tracking-wide border-b-2 border-indigo-100 inline-block pb-1">Phiếu Liên Lạc Tuần {week}</h2>
                    <p className="text-gray-500 text-xs mt-1 italic">Năm học 2024 - 2025</p>
                </div>
                <div className="flex items-center gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-indigo-500 shadow-sm border border-indigo-100">{student.name.charAt(0)}</div>
                     <div>
                         <h3 className="font-bold text-gray-800 text-lg">{student.name}</h3>
                         <p className="text-sm text-gray-500">Mã HS: {student.id}</p>
                     </div>
                     <div className="ml-auto text-right">
                         <div className="text-xs text-gray-400 uppercase">Xếp loại</div>
                         <div className={`font-bold text-lg px-2 rounded ${rank === AcademicRank.GOOD ? 'text-green-600 bg-green-50' : rank === AcademicRank.FAIR ? 'text-blue-600 bg-blue-50' : rank === AcademicRank.PASS ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'}`}>{rank}</div>
                     </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white border rounded-lg p-3 shadow-sm text-center">
                         <div className="text-gray-400 text-xs uppercase mb-1">Điểm Hạnh Kiểm</div>
                         <div className="text-4xl font-black text-indigo-600">{score}</div>
                    </div>
                    <div className="bg-white border rounded-lg p-3 shadow-sm flex flex-col justify-center">
                         <div className="text-xs flex justify-between mb-1"><span className="text-gray-500">Tốt:</span><span className="font-bold">&ge; {settings.thresholds.good}</span></div>
                         <div className="text-xs flex justify-between mb-1"><span className="text-gray-500">Khá:</span><span className="font-bold">{settings.thresholds.fair}-{settings.thresholds.good-1}</span></div>
                         <div className="text-xs flex justify-between"><span className="text-gray-500">Đạt:</span><span className="font-bold">{settings.thresholds.pass}-{settings.thresholds.fair-1}</span></div>
                    </div>
                </div>
                <div className="space-y-4 text-sm">
                    {record && record.violations.length > 0 && (
                        <div>
                            <h4 className="font-bold text-red-600 flex items-center gap-1 mb-1 text-xs uppercase"><AlertTriangle size={12}/> Vi phạm cần khắc phục:</h4>
                            <ul className="list-disc list-inside bg-red-50 p-2 rounded text-red-800 border border-red-100 text-xs">
                                {formatGroupedList(record.violations, settings.behaviorConfig.violations).map((v, i) => <li key={i}>{v}</li>)}
                            </ul>
                        </div>
                    )}
                    {record && record.positiveBehaviors && record.positiveBehaviors.length > 0 && (
                        <div>
                            <h4 className="font-bold text-green-600 flex items-center gap-1 mb-1 text-xs uppercase"><ThumbsUp size={12}/> Lời khen / Điểm cộng:</h4>
                            <ul className="list-disc list-inside bg-green-50 p-2 rounded text-green-800 border border-green-100 text-xs">
                                {formatGroupedList(record.positiveBehaviors, settings.behaviorConfig.positives).map((v, i) => <li key={i}>{v}</li>)}
                            </ul>
                        </div>
                    )}
                    {alerts.length > 0 && (
                        <div>
                             <h4 className="font-bold text-orange-600 flex items-center gap-1 mb-1 text-xs uppercase"><Sparkles size={12} className="text-orange-500" /> Gợi ý từ hệ thống:</h4>
                             <div className="bg-orange-50 p-2 rounded border border-orange-100 text-xs space-y-1">{alerts.map((a, i) => (<p key={i} className="text-orange-800 flex gap-1.5 items-start"><span className="mt-0.5">•</span> <span>{a.message}</span></p>))}</div>
                        </div>
                    )}
                    {record && record.note && (
                        <div>
                            <h4 className="font-bold text-gray-500 flex items-center gap-1 mb-1 text-xs uppercase"><StickyNote size={12}/> Nhận xét giáo viên:</h4>
                            <div className="bg-gray-50 p-3 rounded text-gray-700 italic border border-gray-100 text-xs">"{record.note}"</div>
                        </div>
                    )}
                </div>
                <div className="mt-8 text-center text-[10px] text-gray-400">Thông báo từ Ứng dụng Lớp Học Thông Minh</div>
             </div>
        </div>
    );
};

export default ReportCard;
