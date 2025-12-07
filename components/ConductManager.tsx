
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Student, ConductRecord, Settings, AcademicRank, BehaviorItem } from '../types';
import { getStudents, getConductRecords, saveConductRecords, getSettings, saveSettings, uploadToCloud } from '../services/dataService';
import { Settings as SettingsIcon, AlertTriangle, Calendar, User, CheckSquare, PlusCircle, X, Search, FileText, PieChart as PieChartIcon, LayoutList, ThumbsUp, Star, Trash2, Plus, MinusCircle, StickyNote, Download, ImageIcon, ArrowLeft, Copy, Lock, Unlock, Save, CloudUpload, ThumbsDown, BellRing, Filter, Eraser, Sparkles, TrendingDown, Repeat, FileQuestion, Pencil, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { addLog } from '../utils/logger';
import { generateClassAnalysis, analyzeStudent, Alert } from '../utils/analytics';

// --- Constants ---
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']; // Good, Fair, Pass, Fail

// Use global html2canvas
declare const html2canvas: any;

interface Props {
    setHasUnsavedChanges: (val: boolean) => void;
}

// --- Helper to format display text with points ---
const formatItemWithPoints = (name: string, configItems: BehaviorItem[]) => {
    if (name.match(/\([+-]?\d+đ\)/)) return name;
    const item = configItems.find(i => i.label === name);
    if (item) {
        const sign = item.points > 0 ? '+' : '';
        return `${name} (${sign}${item.points}đ)`;
    }
    return name;
};

// --- Helper to strip points for matching ---
const cleanLabel = (label: string): string => {
  return label.replace(/\s*\([+-]?\d+đ\)/g, '').replace(/\s*\(x\d+\)/g, '').trim();
};

// --- Tag Selector Component ---
const TagSelector: React.FC<{
    selectedTags: string[]; 
    availableItems: BehaviorItem[];
    onChange: (label: string, points: number, delta: number) => void;
    placeholder?: string;
    isPositive?: boolean;
    disabled?: boolean;
}> = ({ selectedTags, availableItems, onChange, placeholder = "...", isPositive = false, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const counts = useMemo(() => {
        return selectedTags.reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [selectedTags]);

    // Filter items based on search
    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return availableItems;
        const lower = searchTerm.toLowerCase();
        return availableItems.filter(i => i.label.toLowerCase().includes(lower));
    }, [availableItems, searchTerm]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) setSearchTerm('');
    }, [isOpen]);

    const handleRemoveTag = (e: React.MouseEvent, tag: string) => {
        e.stopPropagation();
        if (disabled) return;

        const item = availableItems.find(i => i.label === tag);
        if (item) {
            onChange(tag, item.points, -1);
            return;
        }

        const match = tag.match(/\(([+-]?\d+)đ\)/);
        let parsedPoints = 0;
        if (match && match[1]) {
            parsedPoints = parseInt(match[1], 10);
        }
        onChange(tag, parsedPoints, -1);
    };

    if (disabled) {
        return (
             <div className="flex flex-wrap gap-1 min-h-[28px] items-center opacity-60">
                 {Object.entries(counts).map(([tag, count], idx) => (
                    <span key={idx} className={`text-xs px-1.5 py-0.5 rounded border font-medium flex items-center gap-1 ${isPositive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {formatItemWithPoints(tag, availableItems)} {(count as number) > 1 && <span className="bg-white bg-opacity-50 px-1 rounded-full text-[10px]">x{count}</span>}
                    </span>
                 ))}
             </div>
        )
    }

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="flex gap-1 flex-wrap min-h-[28px]" onClick={() => !isOpen && setIsOpen(true)}>
                {Object.keys(counts).length > 0 ? (
                    <div className="flex flex-wrap gap-1 w-full items-center">
                        {Object.entries(counts).map(([tag, count], idx) => (
                            <span 
                                key={idx} 
                                className={`group relative text-xs px-1.5 py-0.5 rounded border cursor-pointer font-medium flex items-center gap-1 pr-5 hover:pr-5 transition-all
                                ${isPositive ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'}`}
                                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                            >
                                {formatItemWithPoints(tag, availableItems)} 
                                {(count as number) > 1 && <span className="bg-white bg-opacity-50 px-1 rounded-full text-[10px]">x{count}</span>}
                                
                                <button
                                    onClick={(e) => handleRemoveTag(e, tag)}
                                    className={`absolute right-0.5 top-0.5 p-0.5 rounded-full hover:bg-white hover:shadow-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                                    title="Xóa lỗi này (Hoàn lại điểm)"
                                >
                                    <X size={10} strokeWidth={3} />
                                </button>
                            </span>
                        ))}
                         <button 
                            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                            className={`ml-auto focus:outline-none opacity-50 hover:opacity-100 ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                        >
                            <PlusCircle size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex w-full items-center cursor-pointer">
                         <span className={`text-sm py-1 ${isPositive ? 'text-green-800' : 'text-red-800'} opacity-50`}>{placeholder}</span>
                        <button className={`ml-auto focus:outline-none ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            <PlusCircle size={16} />
                        </button>
                    </div>
                )}
            </div>
            
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border rounded-lg shadow-xl z-20 p-3 max-h-80 overflow-y-auto">
                    <div className={`text-xs font-bold mb-2 uppercase flex justify-between ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{isPositive ? 'Chọn hành vi tốt' : 'Chọn lỗi vi phạm'}</span>
                        <span>SL / Điểm</span>
                    </div>
                    
                    {/* Search Box */}
                    <div className="mb-2 relative">
                        <input 
                            ref={inputRef}
                            type="text" 
                            className="w-full border rounded px-2 py-1.5 pl-7 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Gõ để tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                    </div>

                    <div className="space-y-1">
                        {filteredItems.map((item) => {
                            const count = counts[item.label] || 0;
                            return (
                                <div key={item.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded text-sm transition-colors border-b border-transparent hover:border-gray-100">
                                    <div className="flex-1 mr-2 cursor-pointer" onClick={() => onChange(item.label, item.points, 1)}>
                                        <div className="font-medium text-gray-800">{item.label}</div>
                                        <div className={`text-[10px] font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.points > 0 ? `+${item.points}` : item.points}đ
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onChange(item.label, item.points, -1); }}
                                            disabled={count === 0}
                                            className={`p-1 rounded hover:bg-white shadow-sm transition-all ${count === 0 ? 'text-gray-300' : 'text-red-500'}`}
                                        >
                                            <MinusCircle size={14} />
                                        </button>
                                        <span className={`w-6 text-center font-bold text-xs ${count > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                                            {count}
                                        </span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onChange(item.label, item.points, 1); }}
                                            className="p-1 rounded hover:bg-white shadow-sm transition-all text-green-600"
                                        >
                                            <PlusCircle size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredItems.length === 0 && (
                            <div className="text-center text-gray-400 text-xs py-2">Không tìm thấy kết quả</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ReportCard: React.FC<{
    student: Student;
    record: ConductRecord | undefined;
    allRecords: ConductRecord[];
    week: number;
    settings: Settings;
    cardRef: React.RefObject<HTMLDivElement | null>;
}> = ({ student, record, allRecords, week, settings, cardRef }) => {
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

    const formatGroupedList = (items: string[], configItems: BehaviorItem[]) => {
        const counts = items.reduce((acc, item) => {
              acc[item] = (acc[item] || 0) + 1;
              return acc;
          }, {} as Record<string, number>);
        return Object.entries(counts).map(([name, count]) => {
            const displayName = formatItemWithPoints(name, configItems);
            return count > 1 ? `${displayName} (x${count})` : displayName;
        });
    };

    return (
        <div ref={cardRef} className="w-[450px] bg-white p-0 overflow-hidden shadow-2xl relative">
             <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3"></div>
             <div className="p-6 border-x border-b border-gray-100">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-indigo-800 uppercase tracking-wide border-b-2 border-indigo-100 inline-block pb-1">Phiếu Liên Lạc Tuần {week}</h2>
                    <p className="text-gray-500 text-xs mt-1 italic">Năm học 2024 - 2025</p>
                </div>

                <div className="flex items-center gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-indigo-500 shadow-sm border border-indigo-100">
                        {student.name.charAt(0)}
                     </div>
                     <div>
                         <h3 className="font-bold text-gray-800 text-lg">{student.name}</h3>
                         <p className="text-sm text-gray-500">Mã HS: {student.id}</p>
                     </div>
                     <div className="ml-auto text-right">
                         <div className="text-xs text-gray-400 uppercase">Xếp loại</div>
                         <div className={`font-bold text-lg px-2 rounded 
                            ${rank === AcademicRank.GOOD ? 'text-green-600 bg-green-50' : 
                              rank === AcademicRank.FAIR ? 'text-blue-600 bg-blue-50' : 
                              rank === AcademicRank.PASS ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'}`}>
                             {rank}
                         </div>
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white border rounded-lg p-3 shadow-sm text-center">
                         <div className="text-gray-400 text-xs uppercase mb-1">Điểm Hạnh Kiểm</div>
                         <div className="text-4xl font-black text-indigo-600">{score}</div>
                    </div>
                    <div className="bg-white border rounded-lg p-3 shadow-sm flex flex-col justify-center">
                         <div className="text-xs flex justify-between mb-1">
                             <span className="text-gray-500">Tốt:</span>
                             <span className="font-bold">&ge; {settings.thresholds.good}</span>
                         </div>
                         <div className="text-xs flex justify-between mb-1">
                             <span className="text-gray-500">Khá:</span>
                             <span className="font-bold">{settings.thresholds.fair}-{settings.thresholds.good-1}</span>
                         </div>
                         <div className="text-xs flex justify-between">
                             <span className="text-gray-500">Đạt:</span>
                             <span className="font-bold">{settings.thresholds.pass}-{settings.thresholds.fair-1}</span>
                         </div>
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
                             <h4 className="font-bold text-orange-600 flex items-center gap-1 mb-1 text-xs uppercase">
                                <Sparkles size={12} className="text-orange-500" /> Gợi ý từ hệ thống:
                             </h4>
                             <div className="bg-orange-50 p-2 rounded border border-orange-100 text-xs space-y-1">
                                {alerts.map((a, i) => (
                                    <p key={i} className="text-orange-800 flex gap-1.5 items-start">
                                        <span className="mt-0.5">•</span> <span>{a.message}</span>
                                    </p>
                                ))}
                             </div>
                        </div>
                    )}

                    {record && record.note && (
                        <div>
                            <h4 className="font-bold text-gray-500 flex items-center gap-1 mb-1 text-xs uppercase"><StickyNote size={12}/> Nhận xét giáo viên:</h4>
                            <div className="bg-gray-50 p-3 rounded text-gray-700 italic border border-gray-100 text-xs">
                                "{record.note}"
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mt-8 text-center text-[10px] text-gray-400">
                    Thông báo từ Ứng dụng Lớp Học Thông Minh
                </div>
             </div>
        </div>
    );
};

const StudentDetailModal: React.FC<{
    student: Student | null;
    records: ConductRecord[];
    settings: Settings;
    onClose: () => void;
}> = ({ student, records, settings, onClose }) => {
    
    const [view, setView] = useState<'chart' | 'card'>('chart');
    const [selectedWeekForCard, setSelectedWeekForCard] = useState(records.length > 0 ? records[records.length-1].week : 1);
    const cardRef = useRef<HTMLDivElement>(null);
    const [isCopying, setIsCopying] = useState(false);

    if (!student) return null;
    const studentRecords = records.filter(r => r.studentId === student.id).sort((a, b) => a.week - b.week);
    const chartData = studentRecords.map(r => ({ name: `Tuần ${r.week}`, Score: r.score }));
    const avgScore = studentRecords.length > 0 ? Math.round(studentRecords.reduce((a, b) => a + b.score, 0) / studentRecords.length) : 0;
    
    const getGroupedItems = (items: string[], configItems: BehaviorItem[]) => {
        const counts = items.reduce((acc, item) => { acc[item] = (acc[item] || 0) + 1; return acc; }, {} as Record<string, number>);
        return Object.entries(counts).map(([name, count]) => {
             const displayName = formatItemWithPoints(name, configItems);
             return count > 1 ? `${displayName} (x${count})` : displayName;
        });
    };

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
                try {
                    await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
                    alert("✅ Đã sao chép ảnh! Ctrl+V để dán.");
                } catch (err) { alert("Không thể copy tự động. Hãy dùng nút Tải về."); }
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
                <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                    {view === 'chart' ? (
                        <>
                             <div className="flex justify-between items-center mb-6">
                                <div className="text-center bg-white p-3 rounded-lg border shadow-sm">
                                    <span className="block text-gray-500 text-xs uppercase">Điểm TB</span>
                                    <span className={`text-2xl font-bold ${avgScore >= 80 ? 'text-green-600' : avgScore >= 50 ? 'text-blue-600' : 'text-red-600'}`}>{avgScore}</span>
                                </div>
                                <div className="flex-1 ml-6 h-32 bg-white rounded-lg p-2 border shadow-sm">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                            <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false}/>
                                            <Line type="monotone" dataKey="Score" stroke="#4f46e5" strokeWidth={3} dot={{r: 4}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {studentRecords.map(r => (
                                    <div key={r.id} className="p-3 bg-white rounded-lg border hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="font-bold text-indigo-700">Tuần {r.week}</div>
                                            <div className="font-bold px-2 py-0.5 rounded border text-sm">{r.score} điểm</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><span className="text-red-500 font-semibold text-xs uppercase">Vi phạm</span>
                                                {r.violations.length>0 ? <ul className="list-disc list-inside text-red-700 text-xs">{getGroupedItems(r.violations, settings.behaviorConfig.violations).map((v,i)=><li key={i}>{v}</li>)}</ul> : <span className="text-gray-300 italic text-xs block">Không</span>}
                                            </div>
                                            <div><span className="text-green-600 font-semibold text-xs uppercase">Tích cực</span>
                                                {r.positiveBehaviors?.length>0 ? <ul className="list-disc list-inside text-green-700 text-xs">{getGroupedItems(r.positiveBehaviors, settings.behaviorConfig.positives).map((v,i)=><li key={i}>{v}</li>)}</ul> : <span className="text-gray-300 italic text-xs block">Không</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="flex gap-2 mb-4">
                                <select value={selectedWeekForCard} onChange={(e) => setSelectedWeekForCard(parseInt(e.target.value))} className="border rounded px-2 text-sm">
                                    {records.filter(r => r.studentId === student.id).sort((a,b) => b.week - a.week).map(r => <option key={r.week} value={r.week}>Tuần {r.week}</option>)}
                                </select>
                                <button onClick={handleCopyToClipboard} disabled={isCopying} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">{isCopying ? '...' : 'Sao chép'}</button>
                                <button onClick={handleDownloadImage} className="border px-3 py-1 rounded text-sm">Tải về</button>
                            </div>
                            <div className="border shadow-inner bg-gray-200 p-8 rounded-xl overflow-auto w-full flex justify-center">
                                <ReportCard cardRef={cardRef} student={student} allRecords={records} week={selectedWeekForCard} record={records.find(r => r.studentId === student.id && r.week === selectedWeekForCard)} settings={settings}/>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
const ConductManager: React.FC<Props> = ({ setHasUnsavedChanges }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<ConductRecord[]>([]);
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [viewMode, setViewMode] = useState<'input' | 'stats'>('input');
  
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);

  const [statsStartWeek, setStatsStartWeek] = useState(1);
  const [statsEndWeek, setStatsEndWeek] = useState(4);
  const [statsTab, setStatsTab] = useState<'chart' | 'week-report' | 'multi-report' | 'semester'>('chart');
  const [semesterMode, setSemesterMode] = useState<'s1' | 's2' | 'year'>('s1');
  const [filterEmptyReports, setFilterEmptyReports] = useState(false); 
  
  const [settingTab, setSettingTab] = useState<'general' | 'behaviors'>('general');

  // Behavior Edit State
  const [newBehaviorLabel, setNewBehaviorLabel] = useState('');
  const [newBehaviorPoints, setNewBehaviorPoints] = useState(0);
  const [editingBehaviorId, setEditingBehaviorId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'points_desc' | 'points_asc' | 'alpha'>('points_asc');

  const classReportRef = useRef<HTMLDivElement>(null);
  const multiReportRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStudents(getStudents());
    setRecords(getConductRecords());
    setSettings(getSettings());
  }, []);

  useEffect(() => {
    if (viewMode === 'stats') {
         const maxWeek = records.length > 0 ? Math.max(...records.map(r => r.week)) : 1;
         setStatsEndWeek(maxWeek);
    }
  }, [viewMode, records.length]);

  const activeStudents = useMemo(() => students.filter(s => s.isActive !== false), [students]);
  const isLocked = useMemo(() => settings.lockedWeeks?.includes(selectedWeek), [settings.lockedWeeks, selectedWeek]);
  
  // Update classAlerts to use the new logic (exclude class-wide errors)
  const classAlerts = useMemo(() => {
      return generateClassAnalysis(students, records, settings, statsEndWeek);
  }, [students, records, settings, statsEndWeek]);

  // --- Recalculate Scores Logic ---
  const recalculateAllScores = (currentRecords: ConductRecord[], newSettings: Settings) => {
      const updatedRecords = currentRecords.map(rec => {
          let score = newSettings.defaultScore;
          
          // Re-tally violations
          rec.violations.forEach(v => {
              // 1. Check in settings
              // Try exact match first
              const item = newSettings.behaviorConfig.violations.find(i => i.label === v);
              if (item) {
                  score += item.points; // points are negative usually
              } else {
                  // 2. Try parse custom points
                  const match = v.match(/\(([+-]?\d+)đ\)/);
                  if (match && match[1]) {
                      score += parseInt(match[1]);
                  } else {
                      // 3. Try to find match by stripped name if renamed? No, simple match for now.
                      // If not found and no points embedded, assume 0 change (ignore)
                  }
              }
          });

          // Re-tally positives
          (rec.positiveBehaviors || []).forEach(p => {
               const item = newSettings.behaviorConfig.positives.find(i => i.label === p);
               if (item) {
                   score += item.points;
               } else {
                    const match = p.match(/\(([+-]?\d+)đ\)/);
                    if (match && match[1]) score += parseInt(match[1]);
               }
          });

          return { ...rec, score: Math.max(0, Math.min(100, score)) };
      });
      return updatedRecords;
  };

  const migrateBehaviorName = (oldName: string, newName: string, isPositive: boolean) => {
      const updatedRecords = records.map(rec => {
          let hasChange = false;
          let newViolations = [...rec.violations];
          let newPositives = [...(rec.positiveBehaviors || [])];

          if (!isPositive) {
              if (newViolations.includes(oldName)) {
                  newViolations = newViolations.map(v => v === oldName ? newName : v);
                  hasChange = true;
              }
          } else {
              if (newPositives.includes(oldName)) {
                  newPositives = newPositives.map(p => p === oldName ? newName : p);
                  hasChange = true;
              }
          }
          return hasChange ? { ...rec, violations: newViolations, positiveBehaviors: newPositives } : rec;
      });
      return updatedRecords;
  };


  const updateSettings = (partialSettings: any) => {
      const newSettings = { ...settings, ...partialSettings };
      setSettings(newSettings);
      saveSettings(newSettings);
  };

  const handleUpdateBehavior = (isPositive: boolean) => {
      if (!newBehaviorLabel.trim()) return;
      const points = parseInt(newBehaviorPoints.toString());
      
      const config = { ...settings.behaviorConfig };
      const list = isPositive ? config.positives : config.violations;

      if (editingBehaviorId) {
          // Edit existing
          const existingItem = list.find(i => i.id === editingBehaviorId);
          if (!existingItem) return;

          const oldName = existingItem.label;
          const newName = newBehaviorLabel;
          const oldPoints = existingItem.points;
          
          // 1. Update Config
          const newList = list.map(i => i.id === editingBehaviorId ? { ...i, label: newName, points } : i);
          if (isPositive) config.positives = newList;
          else config.violations = newList;
          
          const newSettings = { ...settings, behaviorConfig: config };
          
          // 2. Migrate Data if Name Changed
          let currentRecs = records;
          if (oldName !== newName) {
              currentRecs = migrateBehaviorName(oldName, newName, isPositive);
          }

          // 3. Recalculate Scores (Always, to ensure points match)
          const finalRecs = recalculateAllScores(currentRecs, newSettings);
          
          setSettings(newSettings);
          saveSettings(newSettings);
          setRecords(finalRecs);
          saveConductRecords(finalRecs);
          setHasUnsavedChanges(true);

          addLog('SETTINGS', `Đã sửa lỗi "${oldName}" -> "${newName}" (${points}đ). Đã cập nhật lại điểm.`);
      } else {
          // Add New
          const newItem: BehaviorItem = {
              id: Date.now().toString(),
              label: newBehaviorLabel,
              points
          };
          if (isPositive) config.positives = [...config.positives, newItem];
          else config.violations = [...config.violations, newItem];
          
          updateSettings({ behaviorConfig: config });
      }

      setNewBehaviorLabel('');
      setNewBehaviorPoints(isPositive ? 1 : -1);
      setEditingBehaviorId(null);
  };

  const editBehavior = (item: BehaviorItem) => {
      setNewBehaviorLabel(item.label);
      setNewBehaviorPoints(item.points);
      setEditingBehaviorId(item.id);
  };

  const cancelEdit = () => {
      setNewBehaviorLabel('');
      setNewBehaviorPoints(0);
      setEditingBehaviorId(null);
  };

  const deleteBehavior = (id: string, isPositive: boolean) => {
      if (!window.confirm("Bạn có chắc chắn muốn xóa? Điểm của học sinh đã vi phạm lỗi này sẽ không đổi (vì hệ thống sẽ coi là lỗi tùy chỉnh).")) return;
      const config = { ...settings.behaviorConfig };
      if (isPositive) {
          config.positives = config.positives.filter(i => i.id !== id);
      } else {
          config.violations = config.violations.filter(i => i.id !== id);
      }
      updateSettings({ behaviorConfig: config });
  };

  const getSortedBehaviors = (items: BehaviorItem[]) => {
      return [...items].sort((a, b) => {
          if (sortOrder === 'alpha') return a.label.localeCompare(b.label);
          if (sortOrder === 'points_desc') return Math.abs(b.points) - Math.abs(a.points);
          return Math.abs(a.points) - Math.abs(b.points);
      });
  };

  const updateRecord = (studentId: string, week: number, updates: Partial<ConductRecord>) => {
    if (isLocked) return;
    const existingIdx = records.findIndex(r => r.studentId === studentId && r.week === week);
    let newRecords = [...records];
    if (existingIdx > -1) { newRecords[existingIdx] = { ...newRecords[existingIdx], ...updates }; } 
    else { newRecords.push({ id: `CON-${studentId}-W${week}`, studentId, week, score: settings.defaultScore, violations: [], positiveBehaviors: [], note: '', ...updates }); }
    setRecords(newRecords);
    saveConductRecords(newRecords);
    setHasUnsavedChanges(true);
  };

  const handleTagChange = (studentId: string, week: number, label: string, points: number, delta: number, isPositive: boolean) => {
      if (isLocked) return;
      const rec = records.find(r => r.studentId === studentId && r.week === week);
      const currentList = isPositive ? (rec?.positiveBehaviors || []) : (rec?.violations || []);
      const currentScore = rec ? rec.score : settings.defaultScore;

      let newList = [...currentList];
      let newScore = currentScore;

      if (delta > 0) {
          newList.push(label);
          newScore = currentScore + points; 
      } else {
          const idx = newList.indexOf(label);
          if (idx > -1) {
              newList.splice(idx, 1);
              newScore = currentScore - points;
          }
      }
      newScore = Math.max(0, Math.min(100, newScore));
      updateRecord(studentId, week, { [isPositive ? 'positiveBehaviors' : 'violations']: newList, score: newScore });
  };

  // Helper functions used in render
  const getRankFromScore = (s: number) => {
    if (s >= settings.thresholds.good) return AcademicRank.GOOD;
    if (s >= settings.thresholds.fair) return AcademicRank.FAIR;
    if (s >= settings.thresholds.pass) return AcademicRank.PASS;
    return AcademicRank.FAIL;
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
        case AcademicRank.GOOD: return 'bg-green-100 text-green-800 border-green-200';
        case AcademicRank.FAIR: return 'bg-blue-100 text-blue-800 border-blue-200';
        case AcademicRank.PASS: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default: return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const formatGroupedList = (items: string[], configItems: BehaviorItem[]) => {
      const counts = items.reduce((acc, item) => {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
      return Object.entries(counts).map(([name, count]) => {
          const displayName = formatItemWithPoints(name, configItems);
          return count > 1 ? `${displayName} (x${count})` : displayName;
      }).join(', ');
  };

  // Event Handlers
  const handleScoreChange = (studentId: string, week: number, val: string) => {
    if (isLocked) return;
    const num = parseInt(val);
    if (isNaN(num)) return;
    updateRecord(studentId, week, { score: num });
  };

  const handleNoteChange = (studentId: string, week: number, val: string) => {
     if (isLocked) return;
     updateRecord(studentId, week, { note: val });
  };

  const handleClearStudentData = (studentId: string) => {
    if (isLocked) return;
    if(!window.confirm("Xóa dữ liệu tuần này của học sinh?")) return;
    updateRecord(studentId, selectedWeek, { 
        score: settings.defaultScore, 
        violations: [], 
        positiveBehaviors: [], 
        note: '' 
    });
  };

  const toggleLockWeek = () => {
    let newLocked = [...settings.lockedWeeks];
    if (isLocked) {
        if (!window.confirm(`Mở khóa Tuần ${selectedWeek}?`)) return;
        newLocked = newLocked.filter(w => w !== selectedWeek);
        addLog('LOCK', `Đã mở khóa Tuần ${selectedWeek}`);
    } else {
        newLocked.push(selectedWeek);
        addLog('LOCK', `Đã khóa Tuần ${selectedWeek}`);
    }
    updateSettings({ lockedWeeks: newLocked });
  };

  const handleClassBonus = () => {
    const reason = prompt("Nhập lý do thưởng cả lớp (VD: Vệ sinh sạch):");
    if (!reason) return;
    const pointsStr = prompt("Nhập số điểm cộng:", "2");
    if (!pointsStr) return;
    const points = parseInt(pointsStr);
    
    // Logic to add positive behavior to all active students for this week
    const newRecords = [...records];
    activeStudents.forEach(s => {
        const idx = newRecords.findIndex(r => r.studentId === s.id && r.week === selectedWeek);
        const label = `${reason} (+${points}đ)`;
        
        if (idx > -1) {
            const r = newRecords[idx];
            newRecords[idx] = {
                ...r,
                score: Math.min(100, r.score + points),
                positiveBehaviors: [...(r.positiveBehaviors || []), label]
            };
        } else {
            newRecords.push({
                id: `CON-${s.id}-W${selectedWeek}`,
                studentId: s.id,
                week: selectedWeek,
                score: settings.defaultScore + points,
                violations: [],
                positiveBehaviors: [label],
                note: ''
            });
        }
    });
    setRecords(newRecords);
    saveConductRecords(newRecords);
    setHasUnsavedChanges(true);
    addLog('BATCH', `Đã cộng ${points}đ cho cả lớp: ${reason}`);
  };

  const handleClassPenalty = () => {
    const reason = prompt("Nhập lý do trừ cả lớp (VD: Ồn ào):");
    if (!reason) return;
    const pointsStr = prompt("Nhập số điểm trừ:", "2");
    if (!pointsStr) return;
    const points = parseInt(pointsStr);
    
    const newRecords = [...records];
    activeStudents.forEach(s => {
        const idx = newRecords.findIndex(r => r.studentId === s.id && r.week === selectedWeek);
        const label = `${reason} (-${points}đ)`;
        
        if (idx > -1) {
            const r = newRecords[idx];
            newRecords[idx] = {
                ...r,
                score: Math.max(0, r.score - points),
                violations: [...r.violations, label]
            };
        } else {
            newRecords.push({
                id: `CON-${s.id}-W${selectedWeek}`,
                studentId: s.id,
                week: selectedWeek,
                score: settings.defaultScore - points,
                violations: [label],
                positiveBehaviors: [],
                note: ''
            });
        }
    });
    setRecords(newRecords);
    saveConductRecords(newRecords);
    setHasUnsavedChanges(true);
    addLog('BATCH', `Đã trừ ${points}đ cả lớp: ${reason}`);
  };

  const handleFillDefault = () => {
    if (!window.confirm("Tự động điền điểm mặc định cho những bạn chưa có dữ liệu trong tuần này?")) return;
    const newRecords = [...records];
    let count = 0;
    activeStudents.forEach(s => {
        const exists = newRecords.find(r => r.studentId === s.id && r.week === selectedWeek);
        if (!exists) {
            newRecords.push({
                id: `CON-${s.id}-W${selectedWeek}`,
                studentId: s.id,
                week: selectedWeek,
                score: settings.defaultScore,
                violations: [],
                positiveBehaviors: []
            });
            count++;
        }
    });
    if (count > 0) {
        setRecords(newRecords);
        saveConductRecords(newRecords);
        setHasUnsavedChanges(true);
        addLog('BATCH', `Đã điền mặc định cho ${count} học sinh.`);
    }
  };

  const handleClearAllWeekData = () => {
    if (confirm(`Bạn có chắc muốn XÓA TOÀN BỘ dữ liệu của Tuần ${selectedWeek}?`)) {
        const newRecords = records.filter(r => r.week !== selectedWeek);
        setRecords(newRecords);
        saveConductRecords(newRecords);
        setHasUnsavedChanges(true);
        addLog('BATCH', `Đã xóa dữ liệu Tuần ${selectedWeek}`);
    }
  };

  const handleCloudSave = async () => {
    setIsSaving(true);
    const success = await uploadToCloud();
    setIsSaving(false);
    if (success) {
        setHasUnsavedChanges(false);
        alert("Đã lưu và đồng bộ thành công!");
    } else {
        alert("Lưu thất bại. Vui lòng kiểm tra lại kết nối.");
    }
  };

  // Calculations
  const pieData = useMemo(() => {
    const weekRecords = records.filter(r => r.week >= statsStartWeek && r.week <= statsEndWeek && activeStudents.find(s => s.id === r.studentId));
    if (weekRecords.length === 0) return [];
    
    // Average score per student over the period
    const studentScores: Record<string, number[]> = {};
    weekRecords.forEach(r => {
        if (!studentScores[r.studentId]) studentScores[r.studentId] = [];
        studentScores[r.studentId].push(r.score);
    });

    const ranks = { [AcademicRank.GOOD]: 0, [AcademicRank.FAIR]: 0, [AcademicRank.PASS]: 0, [AcademicRank.FAIL]: 0 };
    
    Object.values(studentScores).forEach(scores => {
        const avg = Math.round(scores.reduce((a,b)=>a+b,0) / scores.length);
        const r = getRankFromScore(avg);
        ranks[r]++;
    });

    return [
        { name: AcademicRank.GOOD, value: ranks[AcademicRank.GOOD] },
        { name: AcademicRank.FAIR, value: ranks[AcademicRank.FAIR] },
        { name: AcademicRank.PASS, value: ranks[AcademicRank.PASS] },
        { name: AcademicRank.FAIL, value: ranks[AcademicRank.FAIL] },
    ];
  }, [records, statsStartWeek, statsEndWeek, activeStudents, settings]);

  const commonViolations = useMemo(() => {
    const weekRecords = records.filter(r => r.week === selectedWeek);
    if (weekRecords.length === 0) return [];
    
    const counts: Record<string, number> = {};
    weekRecords.forEach(r => {
        const unique = new Set(r.violations);
        unique.forEach(v => counts[v] = (counts[v] || 0) + 1);
    });
    
    const threshold = weekRecords.length * 0.8;
    return Object.keys(counts).filter(k => counts[k] >= threshold);
  }, [records, selectedWeek]);

  const commonPositives = useMemo(() => {
    const weekRecords = records.filter(r => r.week === selectedWeek);
    if (weekRecords.length === 0) return [];
    
    const counts: Record<string, number> = {};
    weekRecords.forEach(r => {
        const unique = new Set(r.positiveBehaviors || []);
        unique.forEach(v => counts[v] = (counts[v] || 0) + 1);
    });
    
    const threshold = weekRecords.length * 0.8;
    return Object.keys(counts).filter(k => counts[k] >= threshold);
  }, [records, selectedWeek]);

  const exportClassImage = async () => {
    if (!classReportRef.current) return;
    try {
        const canvas = await html2canvas(classReportRef.current, { scale: 2 });
        const link = document.createElement('a');
        link.download = `BaoCao_Tuan${selectedWeek}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } catch (e) { alert("Lỗi xuất ảnh"); }
  };

  const exportMultiReportImage = async () => {
    if (!multiReportRef.current) return;
    try {
         const canvas = await html2canvas(multiReportRef.current, { scale: 2 });
         const link = document.createElement('a');
         link.download = `BaoCao_TongHop_Tuan${statsStartWeek}-${statsEndWeek}.png`;
         link.href = canvas.toDataURL();
         link.click();
    } catch (e) { alert("Lỗi xuất ảnh"); }
  };

  const calculateSemesterRank = (student: Student, mode: 's1' | 's2' | 'year') => {
    const studentRecords = records.filter(r => r.studentId === student.id);
    let targetRecords: ConductRecord[] = [];
    
    if (mode === 's1') {
        targetRecords = studentRecords.filter(r => r.week < settings.semesterTwoStartWeek);
    } else if (mode === 's2') {
        targetRecords = studentRecords.filter(r => r.week >= settings.semesterTwoStartWeek);
    } else {
        targetRecords = studentRecords;
    }

    if (targetRecords.length === 0) return { avgRaw: '-', avgConverted: '-', rank: 'N/A' };
    
    let totalConverted = 0;
    let totalRaw = 0;
    
    targetRecords.forEach(r => {
        totalRaw += r.score;
        const wRank = getRankFromScore(r.score);
        let p = 0;
        if (wRank === AcademicRank.GOOD) p = settings.rankScores.good;
        else if (wRank === AcademicRank.FAIR) p = settings.rankScores.fair;
        else if (wRank === AcademicRank.PASS) p = settings.rankScores.pass;
        else p = settings.rankScores.fail;
        totalConverted += p;
    });

    const avgConverted = parseFloat((totalConverted / targetRecords.length).toFixed(1));
    const avgRaw = Math.round(totalRaw / targetRecords.length);

    let rank = AcademicRank.FAIL;
    if (avgConverted >= settings.semesterThresholds.good) rank = AcademicRank.GOOD;
    else if (avgConverted >= settings.semesterThresholds.fair) rank = AcademicRank.FAIR;
    else if (avgConverted >= settings.semesterThresholds.pass) rank = AcademicRank.PASS;

    return { avgRaw, avgConverted, rank };
  };

  const getWeekLabel = (weekNum: number) => {
      if (!settings.semesterStartDate) return `Tuần ${weekNum}`;
      const start = new Date(settings.semesterStartDate);
      start.setDate(start.getDate() + (weekNum - 1) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `Tuần ${weekNum} (${start.getDate()}/${start.getMonth()+1} - ${end.getDate()}/${end.getMonth()+1})`;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[700px] shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2"><SettingsIcon size={20}/> Cấu hình hệ thống</h3>
                    <div className="flex gap-2 text-sm font-medium">
                        <button onClick={() => setSettingTab('general')} className={`px-3 py-1 rounded ${settingTab === 'general' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>Chung</button>
                        <button onClick={() => setSettingTab('behaviors')} className={`px-3 py-1 rounded ${settingTab === 'behaviors' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>Danh mục Lỗi / Điểm cộng</button>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 p-6">
                    {settingTab === 'general' ? (
                        <div className="space-y-6">
                           {/* ... General Settings Inputs ... */}
                           <section>
                                <h4 className="font-bold text-indigo-700 text-sm mb-2">Thông số cơ bản</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs text-gray-600 mb-1">Ngày bắt đầu HK1</label><input type="date" value={settings.semesterStartDate} onChange={e => updateSettings({ semesterStartDate: e.target.value })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600 mb-1">Tuần bắt đầu HK2</label><input type="number" value={settings.semesterTwoStartWeek} onChange={e => updateSettings({ semesterTwoStartWeek: parseInt(e.target.value) })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600 mb-1">Điểm mặc định tuần</label><input type="number" value={settings.defaultScore} onChange={e => updateSettings({ defaultScore: parseInt(e.target.value) })} className="w-full border p-2 rounded"/></div>
                                </div>
                            </section>
                            <section>
                                <h4 className="font-bold text-indigo-700 text-sm mb-2">Thang điểm Hạnh kiểm Tuần</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <div><label className="block text-xs text-gray-600">Tốt</label><input type="number" value={settings.thresholds.good} onChange={e => updateSettings({ thresholds: { ...settings.thresholds, good: parseInt(e.target.value) } })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600">Khá</label><input type="number" value={settings.thresholds.fair} onChange={e => updateSettings({ thresholds: { ...settings.thresholds, fair: parseInt(e.target.value) } })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600">Đạt</label><input type="number" value={settings.thresholds.pass} onChange={e => updateSettings({ thresholds: { ...settings.thresholds, pass: parseInt(e.target.value) } })} className="w-full border p-2 rounded"/></div>
                                </div>
                            </section>
                             <section>
                                <h4 className="font-bold text-indigo-700 text-sm mb-2">Quy đổi: Xếp loại -&gt; Điểm số (Tính HK)</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    <div><label className="block text-xs text-green-700">Tốt</label><input type="number" value={settings.rankScores.good} onChange={e => updateSettings({ rankScores: { ...settings.rankScores, good: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-blue-700">Khá</label><input type="number" value={settings.rankScores.fair} onChange={e => updateSettings({ rankScores: { ...settings.rankScores, fair: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-yellow-700">Đạt</label><input type="number" value={settings.rankScores.pass} onChange={e => updateSettings({ rankScores: { ...settings.rankScores, pass: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-red-700">CĐ</label><input type="number" value={settings.rankScores.fail} onChange={e => updateSettings({ rankScores: { ...settings.rankScores, fail: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/></div>
                                </div>
                            </section>
                            <section>
                                <h4 className="font-bold text-indigo-700 text-sm mb-2">Thang điểm Hạnh kiểm Học Kỳ</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <div><label className="block text-xs text-gray-600">Mốc Tốt</label><input type="number" step="0.1" value={settings.semesterThresholds.good} onChange={e => updateSettings({ semesterThresholds: { ...settings.semesterThresholds, good: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600">Mốc Khá</label><input type="number" step="0.1" value={settings.semesterThresholds.fair} onChange={e => updateSettings({ semesterThresholds: { ...settings.semesterThresholds, fair: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600">Mốc Đạt</label><input type="number" step="0.1" value={settings.semesterThresholds.pass} onChange={e => updateSettings({ semesterThresholds: { ...settings.semesterThresholds, pass: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/></div>
                                </div>
                            </section>
                        </div>
                    ) : (
                        <div className="space-y-8">
                             {/* Shared sort buttons */}
                             <div className="flex gap-2 justify-end">
                                 <button onClick={() => setSortOrder('points_desc')} className={`p-1 rounded ${sortOrder === 'points_desc' ? 'bg-gray-200' : 'hover:bg-gray-100'}`} title="Điểm cao -> thấp"><ArrowDown size={16}/></button>
                                 <button onClick={() => setSortOrder('points_asc')} className={`p-1 rounded ${sortOrder === 'points_asc' ? 'bg-gray-200' : 'hover:bg-gray-100'}`} title="Điểm thấp -> cao"><ArrowUp size={16}/></button>
                                 <button onClick={() => setSortOrder('alpha')} className={`p-1 rounded ${sortOrder === 'alpha' ? 'bg-gray-200' : 'hover:bg-gray-100'}`} title="Tên A-Z"><ArrowUpDown size={16}/></button>
                             </div>

                             {/* Violations */}
                             <section>
                                <h4 className="font-bold text-red-700 text-sm mb-2 uppercase">Danh mục Lỗi Vi Phạm</h4>
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                    <div className="flex gap-2 mb-4">
                                        <input 
                                            placeholder="Tên lỗi vi phạm" 
                                            className="flex-1 border p-2 rounded text-sm"
                                            value={!editingBehaviorId || newBehaviorPoints > 0 ? newBehaviorLabel : ''}
                                            onChange={e => setNewBehaviorLabel(e.target.value)}
                                            disabled={!!editingBehaviorId && newBehaviorPoints > 0} 
                                        />
                                        <input 
                                            type="number" 
                                            placeholder="Điểm trừ" 
                                            className="w-24 border p-2 rounded text-sm"
                                            value={!editingBehaviorId || newBehaviorPoints > 0 ? (newBehaviorPoints === 0 ? '' : Math.abs(newBehaviorPoints)) : ''}
                                            onChange={e => setNewBehaviorPoints(-Math.abs(parseInt(e.target.value)))}
                                            disabled={!!editingBehaviorId && newBehaviorPoints > 0}
                                        />
                                        {!editingBehaviorId && <button onClick={() => handleUpdateBehavior(false)} className="bg-red-600 text-white px-4 rounded hover:bg-red-700 text-sm font-medium">Thêm</button>}
                                    </div>

                                    {/* Edit Form in List */}
                                    {editingBehaviorId && newBehaviorPoints <= 0 && (
                                        <div className="bg-white p-3 border border-indigo-300 rounded mb-4 shadow-md">
                                            <div className="text-xs text-indigo-600 font-bold mb-1">Đang sửa:</div>
                                            <div className="flex gap-2">
                                                 <input className="flex-1 border p-1 rounded text-sm" value={newBehaviorLabel} onChange={e => setNewBehaviorLabel(e.target.value)} autoFocus />
                                                 <input className="w-20 border p-1 rounded text-sm" type="number" value={newBehaviorPoints} onChange={e => setNewBehaviorPoints(parseInt(e.target.value))} />
                                                 <button onClick={() => handleUpdateBehavior(false)} className="bg-green-600 text-white px-3 rounded text-sm">Lưu</button>
                                                 <button onClick={cancelEdit} className="bg-gray-400 text-white px-3 rounded text-sm">Hủy</button>
                                            </div>
                                            <div className="text-[10px] text-gray-500 mt-1 italic">*Lưu ý: Nếu sửa tên, lịch sử cũ sẽ được cập nhật. Nếu sửa điểm, điểm số học sinh sẽ được tính lại toàn bộ.</div>
                                        </div>
                                    )}

                                    <div className="max-h-48 overflow-y-auto space-y-2">
                                        {getSortedBehaviors(settings.behaviorConfig.violations).map(item => (
                                            <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
                                                <span className="text-sm font-medium">{item.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-red-600">{item.points}đ</span>
                                                    <button onClick={() => editBehavior(item)} className="text-gray-400 hover:text-indigo-500 p-1"><Pencil size={14}/></button>
                                                    <button onClick={() => deleteBehavior(item.id, false)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             </section>

                             {/* Positives */}
                             <section>
                                <h4 className="font-bold text-green-700 text-sm mb-2 uppercase">Danh mục Hành Vi Tốt</h4>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                    <div className="flex gap-2 mb-4">
                                        <input 
                                            placeholder="Tên hành vi tốt" 
                                            className="flex-1 border p-2 rounded text-sm"
                                            value={!editingBehaviorId || newBehaviorPoints <= 0 ? newBehaviorLabel : ''}
                                            onChange={e => setNewBehaviorLabel(e.target.value)}
                                            disabled={!!editingBehaviorId && newBehaviorPoints <= 0}
                                        />
                                        <input 
                                            type="number" 
                                            placeholder="Điểm cộng" 
                                            className="w-24 border p-2 rounded text-sm"
                                            value={!editingBehaviorId || newBehaviorPoints <= 0 ? (newBehaviorPoints === 0 ? '' : newBehaviorPoints) : ''}
                                            onChange={e => setNewBehaviorPoints(Math.abs(parseInt(e.target.value)))}
                                            disabled={!!editingBehaviorId && newBehaviorPoints <= 0}
                                        />
                                        {!editingBehaviorId && <button onClick={() => handleUpdateBehavior(true)} className="bg-green-600 text-white px-4 rounded hover:bg-green-700 text-sm font-medium">Thêm</button>}
                                    </div>

                                    {/* Edit Form in List */}
                                    {editingBehaviorId && newBehaviorPoints > 0 && (
                                        <div className="bg-white p-3 border border-indigo-300 rounded mb-4 shadow-md">
                                            <div className="text-xs text-indigo-600 font-bold mb-1">Đang sửa:</div>
                                            <div className="flex gap-2">
                                                 <input className="flex-1 border p-1 rounded text-sm" value={newBehaviorLabel} onChange={e => setNewBehaviorLabel(e.target.value)} autoFocus />
                                                 <input className="w-20 border p-1 rounded text-sm" type="number" value={newBehaviorPoints} onChange={e => setNewBehaviorPoints(parseInt(e.target.value))} />
                                                 <button onClick={() => handleUpdateBehavior(true)} className="bg-green-600 text-white px-3 rounded text-sm">Lưu</button>
                                                 <button onClick={cancelEdit} className="bg-gray-400 text-white px-3 rounded text-sm">Hủy</button>
                                            </div>
                                             <div className="text-[10px] text-gray-500 mt-1 italic">*Lưu ý: Nếu sửa tên, lịch sử cũ sẽ được cập nhật. Nếu sửa điểm, điểm số học sinh sẽ được tính lại toàn bộ.</div>
                                        </div>
                                    )}

                                    <div className="max-h-48 overflow-y-auto space-y-2">
                                        {getSortedBehaviors(settings.behaviorConfig.positives).map(item => (
                                            <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
                                                <span className="text-sm font-medium">{item.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-green-600">+{item.points}đ</span>
                                                    <button onClick={() => editBehavior(item)} className="text-gray-400 hover:text-indigo-500 p-1"><Pencil size={14}/></button>
                                                    <button onClick={() => deleteBehavior(item.id, true)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             </section>
                        </div>
                    )}
                </div>
                <div className="p-4 flex justify-end border-t bg-gray-50 rounded-b-lg">
                    <button onClick={() => setShowSettings(false)} className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-gray-900 shadow">Đóng & Lưu</button>
                </div>
            </div>
        </div>
      )}

      <StudentDetailModal student={selectedStudentForDetail} records={records} settings={settings} onClose={() => setSelectedStudentForDetail(null)} />

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Quản Lý Hạnh Kiểm</h2>
            <div className="flex gap-2 mt-2">
                <button onClick={() => setViewMode('input')} className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${viewMode === 'input' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><CheckSquare size={14} className="inline mr-1"/> Nhập liệu</button>
                <button onClick={() => setViewMode('stats')} className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${viewMode === 'stats' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><PieChartIcon size={14} className="inline mr-1"/> Thống kê & Báo cáo</button>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleCloudSave} disabled={isSaving} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-bold">{isSaving ? 'Đang lưu...' : <><CloudUpload size={18} /> Lưu & Sync</>}</button>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 text-gray-600 bg-white border px-3 py-2 rounded hover:bg-gray-100 shadow-sm"><SettingsIcon size={18} /> Cấu hình</button>
        </div>
      </div>

      {/* VIEW MODES */}
      {viewMode === 'input' && (
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
                        <button onClick={handleClearAllWeekData} className="flex items-center gap-2 text-sm bg-gray-100 text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 font-medium"><Trash2 size={16}/> Xóa Tuần này</button>
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
                                    <td className="p-3"><button onClick={() => setSelectedStudentForDetail(s)} className="font-medium text-gray-800 hover:text-indigo-600 hover:underline text-left">{s.name}</button></td>
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
      )}

      {/* STATS MODE */}
      {viewMode === 'stats' && (
          <div className="flex flex-col h-full gap-4">
              {classAlerts.length > 0 && statsTab !== 'semester' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                      <h3 className="text-orange-800 font-bold flex items-center gap-2 mb-2"><AlertTriangle size={20} className="text-orange-600"/> Học sinh cần lưu ý (Tuần {statsStartWeek} - {statsEndWeek})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {classAlerts.map(analysis => (
                              <div key={analysis.studentId} className="bg-white border border-orange-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="font-bold text-gray-800 flex justify-between">{analysis.studentName} {analysis.alerts.some(a => a.type === 'CRITICAL') && <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded font-bold">NGUY HIỂM</span>}</div>
                                  <ul className="mt-2 space-y-1">
                                      {analysis.alerts.map((alert, idx) => (
                                          <li key={idx} className="text-xs flex gap-2 items-start text-gray-700">
                                              <span className="mt-0.5 min-w-[14px]">
                                                  {alert.code === 'TREND' && <TrendingDown size={12} className="text-red-500"/>}
                                                  {alert.code === 'RECURRING' && <Repeat size={12} className="text-orange-500"/>}
                                                  {alert.code === 'DROP' && <TrendingDown size={12} className="text-yellow-600"/>}
                                                  {alert.code === 'THRESHOLD' && <AlertTriangle size={12} className="text-red-500"/>}
                                                  {alert.code === 'MISSING_DATA' && <FileQuestion size={12} className="text-blue-500"/>}
                                              </span>
                                              <span>{alert.message}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {statsTab !== 'semester' && (
                  <div className="bg-white p-4 rounded-xl shadow-sm flex flex-wrap items-center gap-4">
                      <span className="font-bold text-gray-700 flex items-center gap-2"><Search size={18}/> Bộ lọc:</span>
                      <div className="flex items-center gap-2"><span className="text-sm">Từ tuần</span><input type="number" min="1" value={statsStartWeek} onChange={e => setStatsStartWeek(parseInt(e.target.value))} className="w-16 border rounded p-1 text-center"/></div>
                      <div className="flex items-center gap-2"><span className="text-sm">Đến tuần</span><input type="number" min="1" value={statsEndWeek} onChange={e => setStatsEndWeek(parseInt(e.target.value))} className="w-16 border rounded p-1 text-center"/></div>
                  </div>
              )}

              <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                  <button onClick={() => setStatsTab('chart')} className={`px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'chart' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}>Biểu đồ</button>
                  <button onClick={() => setStatsTab('week-report')} className={`px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'week-report' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}>Báo cáo Tuần</button>
                  <button onClick={() => setStatsTab('multi-report')} className={`px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'multi-report' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}>Báo cáo Chi tiết</button>
                  <button onClick={() => setStatsTab('semester')} className={`px-4 py-2 font-bold text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'semester' ? 'bg-yellow-50 text-indigo-700 border border-yellow-200' : 'text-gray-500 hover:text-indigo-600'}`}>Tổng kết Học kỳ</button>
              </div>

              <div className="bg-white rounded-b-xl rounded-tr-xl shadow p-6 min-h-[500px]">
                  {statsTab === 'chart' && (
                      <div className="flex flex-col md:flex-row gap-8 items-center justify-center h-full">
                           <div className="w-full md:w-1/2 h-80 flex flex-col items-center">
                                <h3 className="font-bold text-gray-700 mb-4">Phân loại Hạnh Kiểm (Trung bình)</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                           </div>
                           <div className="w-full md:w-1/2">
                                <h4 className="font-bold mb-2">Thống kê nhanh (Tuần {statsStartWeek} - {statsEndWeek}):</h4>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li>Tổng số học sinh (Active): <strong>{activeStudents.length}</strong></li>
                                    <li>Tuần dữ liệu: <strong>{new Set(records.filter(r => r.week >= statsStartWeek && r.week <= statsEndWeek).map(r => r.week)).size}</strong></li>
                                </ul>
                           </div>
                      </div>
                  )}

                  {statsTab === 'week-report' && (
                      <div>
                          <div className="mb-4 flex flex-wrap items-center justify-between bg-gray-50 p-3 rounded gap-2">
                              <div className="flex items-center gap-2">
                                <label className="font-bold">Chọn tuần xem báo cáo:</label>
                                <select value={selectedWeek} onChange={(e) => setSelectedWeek(parseInt(e.target.value))} className="border rounded px-2 py-1">
                                    {Array.from({length: 35}).map((_, i) => (<option key={i+1} value={i+1}>{getWeekLabel(i+1)}</option>))}
                                </select>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer select-none border px-3 py-1 bg-white rounded shadow-sm hover:bg-gray-100">
                                  <input type="checkbox" checked={filterEmptyReports} onChange={e => setFilterEmptyReports(e.target.checked)} className="w-4 h-4 text-indigo-600"/>
                                  <span className="text-sm font-medium text-gray-700">Rút gọn danh sách</span>
                              </label>
                              <button onClick={exportClassImage} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-indigo-700 ml-auto"><ImageIcon size={16}/> Xuất ảnh cả lớp</button>
                          </div>
                          
                          <div ref={classReportRef} className="bg-white p-4">
                            <div className="text-center mb-4">
                                <h3 className="text-xl font-bold uppercase text-indigo-800">Báo cáo Tổng hợp Tuần {selectedWeek}</h3>
                                <p className="text-sm text-gray-500 italic">{getWeekLabel(selectedWeek)}</p>
                            </div>

                            {(commonViolations.length > 0 || commonPositives.length > 0) && (
                                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {commonViolations.length > 0 && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <h4 className="font-bold text-red-700 text-sm flex items-center gap-2 uppercase mb-2"><AlertTriangle size={16}/> Vi phạm chung (Trừ điểm cả lớp)</h4>
                                            <ul className="list-disc list-inside text-sm text-red-800">{formatGroupedList(commonViolations, settings.behaviorConfig.violations).split(', ').map((item, i) => (<li key={i}>{item}</li>))}</ul>
                                        </div>
                                    )}
                                    {commonPositives.length > 0 && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <h4 className="font-bold text-green-700 text-sm flex items-center gap-2 uppercase mb-2"><Star size={16}/> Thành tích chung (Cộng điểm cả lớp)</h4>
                                            <ul className="list-disc list-inside text-sm text-green-800">{formatGroupedList(commonPositives, settings.behaviorConfig.positives).split(', ').map((item, i) => (<li key={i}>{item}</li>))}</ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-200 text-sm">
                                    <thead className="bg-gray-100">
                                        <tr><th className="border p-2 w-10">STT</th><th className="border p-2">Học sinh</th><th className="border p-2 w-16">Điểm</th><th className="border p-2 w-20">Xếp loại</th><th className="border p-2 w-1/4">Vi phạm (Cá nhân)</th><th className="border p-2 w-1/4">Hành vi tốt (Cá nhân)</th><th className="border p-2 w-1/4">Ghi chú</th></tr>
                                    </thead>
                                    <tbody>
                                        {activeStudents.filter(stu => {
                                            if (!filterEmptyReports) return true;
                                            const r = records.find(rec => rec.studentId === stu.id && rec.week === selectedWeek);
                                            const displayViolations = r ? r.violations.filter(v => !commonViolations.includes(v)) : [];
                                            const displayPositives = r ? (r.positiveBehaviors || []).filter(p => !commonPositives.includes(p)) : [];
                                            return displayViolations.length > 0 || displayPositives.length > 0 || (r && r.note);
                                        }).map((stu, index) => {
                                            const r = records.find(rec => rec.studentId === stu.id && rec.week === selectedWeek);
                                            const score = r ? r.score : 0;
                                            const rank = r ? getRankFromScore(score) : 'Chưa có';
                                            const displayViolations = r ? r.violations.filter(v => !commonViolations.includes(v)) : [];
                                            const displayPositives = r ? (r.positiveBehaviors || []).filter(p => !commonPositives.includes(p)) : [];

                                            return (
                                                <tr key={stu.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    <td className="border p-2 text-center text-gray-500">{index + 1}</td>
                                                    <td className="border p-2 font-medium">{stu.name}</td>
                                                    <td className={`border p-2 text-center font-bold ${r ? (r.score < 50 ? 'text-red-600' : r.score < 80 ? 'text-yellow-600' : 'text-green-600') : 'text-gray-400'}`}>{r ? r.score : '-'}</td>
                                                    <td className="border p-2 text-center">{r && <span className={`text-xs font-bold px-1 rounded ${getRankColor(rank)}`}>{rank}</span>}</td>
                                                    <td className="border p-2 text-red-700 text-xs">{r ? formatGroupedList(displayViolations, settings.behaviorConfig.violations) : ''}</td>
                                                    <td className="border p-2 text-green-700 text-xs">{r ? formatGroupedList(displayPositives, settings.behaviorConfig.positives) : ''}</td>
                                                    <td className="border p-2 text-gray-600 italic text-xs">{r ? r.note : ''}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-right text-xs text-gray-400">Xuất từ Ứng dụng Lớp Học Thông Minh</div>
                          </div>
                      </div>
                  )}

                  {statsTab === 'multi-report' && (
                      <div>
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-xl font-bold uppercase text-indigo-800">Tổng hợp (Tuần {statsStartWeek} - {statsEndWeek})</h3>
                                <button onClick={exportMultiReportImage} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-indigo-700"><ImageIcon size={16}/> Xuất ảnh chi tiết</button>
                            </div>
                           <div ref={multiReportRef} className="bg-white p-4">
                               <div className="space-y-6">
                                   {activeStudents.map(s => {
                                       const studentRecords = records.filter(r => r.studentId === s.id && r.week >= statsStartWeek && r.week <= statsEndWeek && (r.violations.length > 0 || (r.positiveBehaviors && r.positiveBehaviors.length > 0) || r.note));
                                       if (studentRecords.length === 0) return null;
                                       const avg = Math.round(studentRecords.reduce((acc, cur) => acc + cur.score, 0) / studentRecords.length);
                                       const rank = getRankFromScore(avg);
                                       return (
                                           <div key={s.id} className="border rounded-lg p-4 bg-gray-50 break-inside-avoid relative hover:shadow-md transition-shadow">
                                               <div className="flex justify-between items-start border-b pb-2 mb-2">
                                                    <button onClick={() => setSelectedStudentForDetail(s)} className="font-bold text-lg text-indigo-700 hover:underline flex items-center gap-2">{s.name} <User size={16}/></button>
                                                    <div className="text-right">
                                                        <div className="text-xs text-gray-500">Trung bình giai đoạn</div>
                                                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${getRankColor(rank)}`}>{avg}đ - {rank}</span>
                                                    </div>
                                               </div>
                                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                   {studentRecords.sort((a,b) => a.week - b.week).map(r => (
                                                       <div key={r.id} className="bg-white p-2 rounded border shadow-sm text-sm">
                                                           <div className="flex justify-between items-center mb-1">
                                                               <span className="font-bold text-indigo-600">Tuần {r.week}</span>
                                                               <div className="flex items-center gap-1"><span className="text-xs font-bold border px-1 rounded">{r.score}đ</span><span className={`text-[10px] px-1 rounded ${getRankColor(getRankFromScore(r.score))}`}>{getRankFromScore(r.score)}</span></div>
                                                           </div>
                                                           {r.violations.length > 0 && <div className="text-red-700 mb-1">- {formatGroupedList(r.violations, settings.behaviorConfig.violations)}</div>}
                                                           {r.positiveBehaviors && r.positiveBehaviors.length > 0 && <div className="text-green-700">+ {formatGroupedList(r.positiveBehaviors, settings.behaviorConfig.positives)}</div>}
                                                           {r.note && <div className="text-gray-500 italic mt-1 border-t pt-1">Ghi chú: {r.note}</div>}
                                                       </div>
                                                   ))}
                                               </div>
                                           </div>
                                       );
                                   })}
                               </div>
                               <div className="mt-6 text-center text-xs text-gray-400">Xuất từ Ứng dụng Lớp Học Thông Minh</div>
                           </div>
                      </div>
                  )}

                  {statsTab === 'semester' && (
                      <div>
                          <div className="flex justify-between items-center mb-6 border-b pb-4">
                              <h3 className="text-xl font-bold uppercase text-indigo-800">Bảng Điểm Hạnh Kiểm</h3>
                              <div className="flex bg-gray-100 p-1 rounded-lg">
                                  <button onClick={() => setSemesterMode('s1')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${semesterMode === 's1' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>Học Kỳ 1</button>
                                  <button onClick={() => setSemesterMode('s2')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${semesterMode === 's2' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>Học Kỳ 2</button>
                                  <button onClick={() => setSemesterMode('year')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${semesterMode === 'year' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>Cả Năm</button>
                              </div>
                          </div>
                          <div className="mb-4 text-center bg-blue-50 text-blue-800 p-3 rounded text-sm">
                              {semesterMode === 's1' && <span><strong>Học Kỳ 1:</strong> Tính từ Tuần 1 đến Tuần {settings.semesterTwoStartWeek - 1}</span>}
                              {semesterMode === 's2' && <span><strong>Học Kỳ 2:</strong> Tính từ Tuần {settings.semesterTwoStartWeek} trở đi</span>}
                              {semesterMode === 'year' && <span><strong>Cả Năm:</strong> Tổng hợp tất cả các tuần đã nhập</span>}
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse border rounded-lg overflow-hidden">
                                  <thead className="bg-indigo-600 text-white text-sm">
                                      <tr><th className="p-3">Học sinh</th><th className="p-3 text-center">ĐTB (Gốc)</th><th className="p-3 text-center">ĐTB (Quy đổi)</th><th className="p-3 text-center">Xếp loại</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                      {activeStudents.map((s, idx) => {
                                          const result = calculateSemesterRank(s, semesterMode);
                                          return (
                                              <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                  <td className="p-3 font-medium">{s.name}</td>
                                                  <td className="p-3 text-center text-gray-600">{result.avgRaw}</td>
                                                  <td className="p-3 text-center font-bold text-indigo-600">{result.avgConverted}</td>
                                                  <td className="p-3 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRankColor(result.rank)}`}>{result.rank}</span></td>
                                              </tr>
                                          )
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default ConductManager;
