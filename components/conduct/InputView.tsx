
import React from 'react';
import { Calendar, Lock, Unlock, Star, ThumbsDown, CheckSquare, Coins, Trash2, Eraser, Gift } from 'lucide-react';
import { Student, ConductRecord, Settings, AcademicRank } from '../../types';
import TagSelector from '../shared/TagSelector';

interface Props {
    students: Student[];
    records: ConductRecord[];
    settings: Settings;
    selectedWeek: number;
    setSelectedWeek: (w: number) => void;
    isLocked: boolean;
    toggleLockWeek: () => void;
    getWeekLabel: (w: number) => string;
    handleClassBonus: () => void;
    handleClassPenalty: () => void;
    handleFillDefault: () => void;
    handleCalculateCoinsForWeek: () => void;
    handleClearAllWeekData: () => void;
    handleScoreChange: (sid: string, week: number, val: string) => void;
    handleTagChange: (sid: string, week: number, label: string, points: number, delta: number, isPos: boolean) => void;
    handleNoteChange: (sid: string, week: number, val: string) => void;
    handleClearStudentData: (sid: string) => void;
    handleOpenGamification: (s: Student) => void;
    setSelectedStudentForDetail: (s: Student) => void;
    getRankFromScore: (s: number) => AcademicRank;
    getRankColor: (r: string) => string;
}

const InputView: React.FC<Props> = ({
    students, records, settings, selectedWeek, setSelectedWeek, isLocked, toggleLockWeek, getWeekLabel,
    handleClassBonus, handleClassPenalty, handleFillDefault, handleCalculateCoinsForWeek, handleClearAllWeekData,
    handleScoreChange, handleTagChange, handleNoteChange, handleClearStudentData, handleOpenGamification, setSelectedStudentForDetail,
    getRankFromScore, getRankColor
}) => {
    const activeStudents = students.filter(s => s.isActive !== false);

    return (
        <div className="bg-white rounded-xl shadow overflow-hidden flex flex-col h-[calc(100vh-180px)]">
             <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-gray-500"/>
                        <select value={selectedWeek} onChange={(e) => setSelectedWeek(parseInt(e.target.value))} className="border border-gray-300 rounded px-2 py-1.5 font-medium text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                            {Array.from({length: 35}).map((_, i) => (<option key={i+1} value={i+1}>{getWeekLabel(i+1)}</option>))}
                        </select>
                    </div>
                    <button onClick={toggleLockWeek} className={`flex items-center gap-1 text-sm px-2 py-1 rounded font-medium ${isLocked ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                        {isLocked ? <><Lock size={14}/> Đã khóa</> : <><Unlock size={14}/> Mở khóa</>}
                    </button>
                </div>
                {!isLocked && (
                    <div className="flex gap-2">
                        <button onClick={handleClassBonus} className="flex items-center gap-2 text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 font-medium"><Star size={16}/> Cộng cả lớp</button>
                        <button onClick={handleClassPenalty} className="flex items-center gap-2 text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 font-medium"><ThumbsDown size={16}/> Trừ cả lớp</button>
                        <button onClick={handleFillDefault} className="flex items-center gap-2 text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded hover:bg-green-200 font-medium"><CheckSquare size={16}/> Điền mặc định</button>
                        <button onClick={handleCalculateCoinsForWeek} className="flex items-center gap-2 text-sm bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded hover:bg-yellow-200 font-medium border border-yellow-200"><Coins size={16}/> Tính Xu Tuần</button>
                        <button onClick={handleClearAllWeekData} className="flex items-center gap-2 text-sm bg-gray-100 text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 font-medium"><Trash2 size={16}/> Xóa Tuần</button>
                    </div>
                )}
             </div>

             <div className="flex-1 overflow-auto relative">
                {isLocked && <div className="absolute inset-0 bg-gray-100 bg-opacity-20 pointer-events-none z-0"></div>}
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm text-gray-600 font-semibold">
                        <tr>
                            <th className="p-3 w-10 text-center">#</th>
                            <th className="p-3 w-40">Học Sinh</th>
                            <th className="p-3 w-20 text-center">Điểm</th>
                            <th className="p-3 w-24 text-center">Xếp loại</th>
                            <th className="p-3 border-l border-white w-1/4">Lỗi vi phạm</th>
                            <th className="p-3 border-l border-white w-1/4">Hành vi tốt</th>
                            <th className="p-3 border-l border-white flex-1">Ghi chú</th>
                            <th className="p-3 w-24 text-center">Đổi quà</th>
                            <th className="p-3 w-10 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {activeStudents.map((s, idx) => {
                            const rec = records.find(r => r.studentId === s.id && r.week === selectedWeek);
                            const score = rec ? rec.score : '';
                            const rank = rec ? getRankFromScore(rec.score) : '-';
                            return (
                                <tr key={s.id} className="hover:bg-indigo-50 transition-colors group">
                                    <td className="p-3 text-gray-400 text-xs text-center">{idx + 1}</td>
                                    <td className="p-3">
                                        <button onClick={() => setSelectedStudentForDetail(s)} className="font-medium text-gray-800 hover:text-indigo-600 hover:underline text-left">{s.name}</button>
                                        <div className="flex gap-1 mt-1">
                                            {s.badges?.slice(0, 3).map(bid => {
                                                const badge = settings.gamification.badges.find(b => b.id === bid);
                                                return badge ? <span key={bid} title={badge.label} className="text-xs">{badge.icon}</span> : null;
                                            })}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <input type="number" placeholder={settings.defaultScore.toString()} value={score} onChange={(e) => handleScoreChange(s.id, selectedWeek, e.target.value)} disabled={isLocked} className={`w-14 border rounded p-1 text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500 ${rec && rec.score < settings.thresholds.pass ? 'text-red-600 bg-red-50 border-red-200' : 'text-gray-700'} ${isLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
                                    </td>
                                    <td className="p-3 text-center">{rank !== '-' && <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getRankColor(rank)}`}>{rank}</span>}</td>
                                    <td className="p-3 border-l border-gray-100 align-top"><TagSelector selectedTags={rec ? rec.violations : []} availableItems={settings.behaviorConfig.violations} onChange={(label, points, delta) => handleTagChange(s.id, selectedWeek, label, points, delta, false)} placeholder="..." isPositive={false} disabled={isLocked}/></td>
                                    <td className="p-3 border-l border-gray-100 align-top"><TagSelector selectedTags={rec?.positiveBehaviors || []} availableItems={settings.behaviorConfig.positives} onChange={(label, points, delta) => handleTagChange(s.id, selectedWeek, label, points, delta, true)} placeholder="..." isPositive={true} disabled={isLocked}/></td>
                                    <td className="p-3 border-l border-gray-100 align-top"><input type="text" className={`w-full border-b border-gray-200 focus:border-indigo-500 outline-none text-sm py-1 bg-transparent text-gray-600 placeholder-gray-300 ${isLocked ? 'cursor-not-allowed' : ''}`} placeholder="Thêm ghi chú..." value={rec?.note || ''} onChange={(e) => handleNoteChange(s.id, selectedWeek, e.target.value)} disabled={isLocked}/></td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => handleOpenGamification(s)} className="text-orange-500 hover:text-orange-600 flex flex-col items-center mx-auto">
                                            <Gift size={16} />
                                            <span className="text-[10px] font-bold">{s.balance || 0} Xu</span>
                                        </button>
                                    </td>
                                    <td className="p-3 text-center align-top"><button onClick={() => handleClearStudentData(s.id)} disabled={isLocked} className={`text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100 ${isLocked ? 'opacity-30 cursor-not-allowed' : ''}`}><Eraser size={16} /></button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
          </div>
    );
};

export default InputView;
