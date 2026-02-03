
import React, { useState } from 'react';
import { Student, ConductRecord, Settings, AcademicRank } from '../../types';
import { Search, AlertTriangle, ThumbsUp, StickyNote } from 'lucide-react';
import { formatGroupedList } from '../../utils/formatters';

interface Props {
    currentUser: Student;
    allStudents: Student[];
    settings: Settings;
    allConduct: ConductRecord[];
}

const ScoresScreen: React.FC<Props> = ({ currentUser, allStudents, settings, allConduct }) => {
    const isMonitor = currentUser.roles?.includes('MONITOR');
    const [viewingWeek, setViewingWeek] = useState(1);
    const [viewingStudentId, setViewingStudentId] = useState<string>(currentUser.id);

    // Find record
    const record = allConduct.find(r => r.studentId === viewingStudentId && r.week === viewingWeek);
    const score = record ? record.score : settings.defaultScore;
    const targetStudent = allStudents.find(s => s.id === viewingStudentId);

    const getRank = (s: number) => {
        if (s >= settings.thresholds.good) return AcademicRank.GOOD;
        if (s >= settings.thresholds.fair) return AcademicRank.FAIR;
        if (s >= settings.thresholds.pass) return AcademicRank.PASS;
        return AcademicRank.FAIL;
    };
    const rank = getRank(score);

    const getRankColor = (r: string) => {
        switch (r) {
            case AcademicRank.GOOD: return 'bg-green-100 text-green-800';
            case AcademicRank.FAIR: return 'bg-blue-100 text-blue-800';
            case AcademicRank.PASS: return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-red-100 text-red-800';
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header Controls */}
            <div className="bg-white p-3 shadow-sm border-b shrink-0 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-500">Xem tuần:</label>
                    <select 
                        value={viewingWeek} 
                        onChange={e => setViewingWeek(parseInt(e.target.value))} 
                        className="border p-1.5 rounded text-sm font-bold bg-gray-50 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        {Array.from({length: 35}).map((_, i) => <option key={i+1} value={i+1}>Tuần {i+1}</option>)}
                    </select>
                </div>
                
                {/* Monitor Search Bar */}
                {isMonitor && (
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                        <select 
                            value={viewingStudentId}
                            onChange={e => setViewingStudentId(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value={currentUser.id}>{currentUser.name} (Tôi)</option>
                            {allStudents.filter(s => s.id !== currentUser.id && s.isActive).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* Summary Card */}
                <div className="bg-white rounded-xl shadow-md border p-4 mb-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{targetStudent?.name}</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Tuần {viewingWeek}</p>
                        </div>
                        <div className="text-right">
                            <div className={`text-xs font-bold px-2 py-0.5 rounded uppercase inline-block mb-1 ${getRankColor(rank)}`}>{rank}</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-center py-2">
                        <div className="text-center">
                            <div className="text-5xl font-black text-indigo-600 tracking-tighter">{score}</div>
                            <div className="text-xs text-gray-400 font-medium uppercase mt-1">Điểm Hạnh Kiểm</div>
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                    <div className="bg-white rounded-xl shadow-sm border p-3">
                        <h4 className="font-bold text-red-600 text-sm flex items-center gap-2 mb-2 uppercase border-b pb-1 border-red-100">
                            <AlertTriangle size={16}/> Vi phạm trừ điểm
                        </h4>
                        {record && record.violations.length > 0 ? (
                            <ul className="space-y-1">
                                {formatGroupedList(record.violations, settings.behaviorConfig.violations).map((v, i) => (
                                    <li key={i} className="text-sm text-red-800 bg-red-50 px-2 py-1.5 rounded flex items-start gap-2">
                                        <span className="mt-1.5 w-1 h-1 bg-red-400 rounded-full shrink-0"></span>
                                        {v}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-xs text-gray-400 italic text-center py-2">Không có vi phạm. Giỏi lắm!</div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border p-3">
                        <h4 className="font-bold text-green-600 text-sm flex items-center gap-2 mb-2 uppercase border-b pb-1 border-green-100">
                            <ThumbsUp size={16}/> Điểm cộng / Lời khen
                        </h4>
                        {record && record.positiveBehaviors && record.positiveBehaviors.length > 0 ? (
                            <ul className="space-y-1">
                                {formatGroupedList(record.positiveBehaviors, settings.behaviorConfig.positives).map((v, i) => (
                                    <li key={i} className="text-sm text-green-800 bg-green-50 px-2 py-1.5 rounded flex items-start gap-2">
                                        <span className="mt-1.5 w-1 h-1 bg-green-400 rounded-full shrink-0"></span>
                                        {v}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-xs text-gray-400 italic text-center py-2">Chưa có điểm cộng tuần này.</div>
                        )}
                    </div>

                    {record && record.note && (
                        <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-3">
                            <h4 className="font-bold text-blue-700 text-sm flex items-center gap-2 mb-1 uppercase">
                                <StickyNote size={16}/> Nhận xét giáo viên
                            </h4>
                            <p className="text-sm text-blue-900 italic">"{record.note}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScoresScreen;
