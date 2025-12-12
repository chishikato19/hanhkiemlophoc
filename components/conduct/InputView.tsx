
import React from 'react';
import { Calendar, Lock, Unlock, Star, ThumbsDown, CheckSquare, Coins, Trash2, Eraser, RotateCcw } from 'lucide-react';
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
    handleUndoCoinsForWeek: () => void;
    handleClearAllWeekData: () => void;
    handleScoreChange: (sid: string, week: number, val: string) => void;
    handleTagChange: (sid: string, week: number, label: string, points: number, delta: number, isPos: boolean) => void;
    handleNoteChange: (sid: string, week: number, val: string) => void;
    handleClearStudentData: (sid: string) => void;
    setSelectedStudentForDetail: (s: Student) => void;
    getRankFromScore: (s: number) => AcademicRank;
    getRankColor: (r: string) => string;
}

const InputView: React.FC<Props> = ({
    students, records, settings, selectedWeek, setSelectedWeek, isLocked, toggleLockWeek, getWeekLabel,
    handleClassBonus, handleClassPenalty, handleFillDefault, handleCalculateCoinsForWeek, handleUndoCoinsForWeek,
    handleClearAllWeekData, handleScoreChange, handleTagChange, handleNoteChange, handleClearStudentData, setSelectedStudentForDetail,
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

                {/* Coin Controls - Visible Always, but styling changes based on Lock status */}
                <div className="flex gap-1 border-l border-r border-gray-300 px-2 mx-1">
                        <button 
                            onClick={handleCalculateCoinsForWeek} 
                            disabled={!isLocked}
                            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded font-medium border transition-colors
                            ${isLocked 
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 cursor-pointer' 
                                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'}`}
                            title={isLocked ? "Cộng xu cho học sinh" : "Vui lòng KHÓA tuần này để tính xu"}
                        >
                            <Coins size={16}/> Tính Xu
                        </button>
                        <button 
                            onClick={handleUndoCoinsForWeek} 
                            className="flex items-center gap-1 text-sm bg-gray-100 text-gray-600 px-2 py-1.5 rounded hover:bg-gray-200 font-medium border" 
                            title="Xóa xu đã cộng tuần này"
                        >
                            <RotateCcw size={16}/>
                        </button>
                </div>

                {/* Bulk Edit Controls - Only visible when Unlocked */}
                {!isLocked && (
                    <div className="flex gap-2">
                        <button onClick={handleClassBonus} className="flex items-center gap-2 text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 font-medium"><Star size={16}/> Cộng cả lớp</button>
                        <button onClick={handleClassPenalty} className="flex items-center gap-2 text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 font-medium"><ThumbsDown size={16}/> Trừ cả lớp</button>
                        <button onClick={handleFillDefault} className="flex items-center gap-2 text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded hover:bg-green-200 font-medium"><CheckSquare size={16}/> Điền mặc định</button>
                        <button onClick={handleClearAllWeekData} className="flex items-center gap-2 text-sm bg-gray-100 text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 font-medium"><Trash2 size={16}/> Xóa Tuần</button>
                    </div>
                )}
             </div>

             <div className="flex-1 overflow-auto relative">
                {/* Overlay only blocks inputs, not the whole table, so we can still see data */}
                {isLocked && <div className="absolute inset-0 z-0 bg-gray-50 bg-opacity-10 pointer-events-none"></div>}
                
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm text-gray-600 font-semibold">
                        <tr>
                            <th className="p-3 w-10 text-center">#</th>
                            <th className="p-3 w-48">Học Sinh</th>
                            <th className="p-3 w-20 text-center">Điểm</th>
                            <th className="p-3 w-24 text-center">Xếp loại</th>
                            <th className="p-3 border-l border-white w-1/4">Lỗi vi phạm</th>
                            <th className="p-3 border-l border-white w-1/4">Hành vi tốt</th>
                            <th className="p-3 border-l border-white flex-1">Ghi chú</th>
                            <th className="p-3 w-10 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {activeStudents.map((s, idx) => {
                            const rec = records.find(r => r.studentId === s.id && r.week === selectedWeek);
                            const score = rec ? rec.score : '';
                            const rank = rec ? getRankFromScore(rec.score) : '-';
                            const badgesToShow = s.badges 
                                ? ((s.displayedBadges && s.displayedBadges.length > 0) ? s.displayedBadges : s.badges.slice(0, 5)) 
                                : [];

                            return (
                                <tr key={s.id} className="hover:bg-indigo-50 transition-colors group">
                                    <td className="p-3 text-gray-400 text-xs text-center">{idx + 1}</td>
                                    <td className="p-3">
                                        <button onClick={() => setSelectedStudentForDetail(s)} className="font-medium text-gray-800 hover:text-indigo-600 hover:underline text-left flex items-center gap-3">
                                            <div className="relative w-8 h-8 flex-shrink-0 flex items-center justify-center">
                                                {s.frameUrl && <img src={s.frameUrl} className="absolute inset-0 w-full h-full z-10 scale-125" alt="" />}
                                                <span className="text-xl leading-none z-0">{s.avatarUrl || '👤'}</span>
                                            </div>
                                            <span>{s.name}</span>
                                        </button>
                                        <div className="flex gap-1 mt-1 flex-wrap ml-11">
                                            {/* Coin Badge */}
                                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-yellow-200 font-bold" title="Số dư xu">
                                                <Coins size={10}/> {s.balance || 0}
                                            </span>
                                            {badgesToShow.map(bid => {
                                                const badge = settings.gamification.badges.find(b => b.id === bid);
                                                return badge ? <span key={bid} title={badge.label} className="text-sm leading-none">{badge.icon}</span> : null;
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
