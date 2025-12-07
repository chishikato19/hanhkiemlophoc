
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Student, ConductRecord, Settings, AcademicRank, BehaviorItem } from '../types';
import { getStudents, getConductRecords, saveConductRecords, getSettings, saveSettings, uploadToCloud } from '../services/dataService';
import { Settings as SettingsIcon, AlertTriangle, Calendar, User, CheckSquare, PlusCircle, X, Search, FileText, PieChart as PieChartIcon, LayoutList, ThumbsUp, Star, Trash2, Plus, MinusCircle, StickyNote, Download, ImageIcon, ArrowLeft, Copy, Lock, Unlock, Save, CloudUpload, ThumbsDown } from 'lucide-react';
import { addLog } from '../utils/logger';

// --- Constants ---
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']; // Good, Fair, Pass, Fail

// Use global html2canvas
declare const html2canvas: any;

// --- Tag Selector Component ---
const TagSelector: React.FC<{
    selectedTags: string[]; // Array of strings (can contain duplicates for frequency)
    availableItems: BehaviorItem[];
    onChange: (label: string, points: number, delta: number) => void;
    placeholder?: string;
    isPositive?: boolean;
    disabled?: boolean;
}> = ({ selectedTags, availableItems, onChange, placeholder = "...", isPositive = false, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Calculate counts map
    const counts = useMemo(() => {
        return selectedTags.reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [selectedTags]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    if (disabled) {
        return (
             <div className="flex flex-wrap gap-1 min-h-[28px] items-center opacity-60">
                 {Object.entries(counts).map(([tag, count], idx) => (
                    <span key={idx} className={`text-xs px-1.5 py-0.5 rounded border font-medium flex items-center gap-1 ${isPositive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {tag} {(count as number) > 1 && <span className="bg-white bg-opacity-50 px-1 rounded-full text-[10px]">x{count}</span>}
                    </span>
                 ))}
             </div>
        )
    }

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="flex gap-1 flex-wrap min-h-[28px]">
                {Object.keys(counts).length > 0 ? (
                    <div className="flex flex-wrap gap-1 w-full items-center" onClick={() => setIsOpen(!isOpen)}>
                        {Object.entries(counts).map(([tag, count], idx) => (
                            <span key={idx} className={`text-xs px-1.5 py-0.5 rounded border cursor-pointer font-medium flex items-center gap-1 ${isPositive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                {tag} 
                                {(count as number) > 1 && <span className="bg-white bg-opacity-50 px-1 rounded-full text-[10px]">x{count}</span>}
                            </span>
                        ))}
                         <button 
                            className={`ml-auto focus:outline-none opacity-50 hover:opacity-100 ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                        >
                            <PlusCircle size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex w-full items-center">
                         <input
                            type="text"
                            readOnly
                            onClick={() => setIsOpen(!isOpen)}
                            placeholder={placeholder}
                            className={`w-full border-b focus:border-indigo-500 outline-none bg-transparent text-sm py-1 cursor-pointer ${isPositive ? 'border-green-200 text-green-800' : 'border-red-200 text-red-800'}`}
                        />
                        <button 
                            onClick={() => setIsOpen(!isOpen)}
                            className={`focus:outline-none ${isPositive ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'}`}
                        >
                            <PlusCircle size={16} />
                        </button>
                    </div>
                )}
            </div>
            
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border rounded-lg shadow-xl z-20 p-3 max-h-72 overflow-y-auto">
                    <div className={`text-xs font-bold mb-2 uppercase flex justify-between ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{isPositive ? 'Chọn hành vi tốt' : 'Chọn lỗi vi phạm'}</span>
                        <span>SL / Điểm</span>
                    </div>
                    <div className="space-y-2">
                        {availableItems.map((item) => {
                            const count = counts[item.label] || 0;
                            return (
                                <div key={item.id} className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded text-sm">
                                    <div className="flex-1 mr-2">
                                        <div className="font-medium text-gray-800">{item.label}</div>
                                        <div className={`text-xs font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.points > 0 ? `+${item.points}` : item.points}đ
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                        <button 
                                            onClick={() => onChange(item.label, item.points, -1)}
                                            disabled={count === 0}
                                            className={`p-1 rounded hover:bg-white shadow-sm transition-all ${count === 0 ? 'text-gray-300' : 'text-red-500'}`}
                                        >
                                            <MinusCircle size={16} />
                                        </button>
                                        <span className={`w-8 text-center font-bold ${count > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                                            {count}
                                        </span>
                                        <button 
                                            onClick={() => onChange(item.label, item.points, 1)}
                                            className="p-1 rounded hover:bg-white shadow-sm transition-all text-green-600"
                                        >
                                            <PlusCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-2 text-[10px] text-gray-400 text-center italic border-t pt-1">
                        Thay đổi số lượng để cộng/trừ điểm tự động
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Report Card Component for Export ---
const ReportCard: React.FC<{
    student: Student;
    record: ConductRecord | undefined;
    week: number;
    settings: Settings;
    cardRef: React.RefObject<HTMLDivElement | null>;
}> = ({ student, record, week, settings, cardRef }) => {
    const score = record ? record.score : 0;
    
    const getRank = (s: number) => {
        if (s >= settings.thresholds.good) return AcademicRank.GOOD;
        if (s >= settings.thresholds.fair) return AcademicRank.FAIR;
        if (s >= settings.thresholds.pass) return AcademicRank.PASS;
        return AcademicRank.FAIL;
    };
    const rank = record ? getRank(score) : 'Chưa có';

    const formatGroupedList = (items: string[]) => {
        const counts = items.reduce((acc, item) => {
              acc[item] = (acc[item] || 0) + 1;
              return acc;
          }, {} as Record<string, number>);
        return Object.entries(counts).map(([name, count]) => count > 1 ? `${name} (x${count})` : name);
    };

    return (
        <div ref={cardRef} className="w-[450px] bg-white p-0 overflow-hidden shadow-2xl relative">
             {/* Header Decoration */}
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
                                {formatGroupedList(record.violations).map((v, i) => <li key={i}>{v}</li>)}
                            </ul>
                        </div>
                    )}
                    
                    {record && record.positiveBehaviors && record.positiveBehaviors.length > 0 && (
                        <div>
                            <h4 className="font-bold text-green-600 flex items-center gap-1 mb-1 text-xs uppercase"><ThumbsUp size={12}/> Lời khen / Điểm cộng:</h4>
                            <ul className="list-disc list-inside bg-green-50 p-2 rounded text-green-800 border border-green-100 text-xs">
                                {formatGroupedList(record.positiveBehaviors).map((v, i) => <li key={i}>{v}</li>)}
                            </ul>
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

// --- Student Detail Modal ---
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
    
    // Stats for charts
    const chartData = studentRecords.map(r => ({ name: `Tuần ${r.week}`, Score: r.score }));
    const avgScore = studentRecords.length > 0 
        ? Math.round(studentRecords.reduce((a, b) => a + b.score, 0) / studentRecords.length) 
        : 0;

    // Helper to group counts
    const getGroupedItems = (items: string[]) => {
        const counts = items.reduce((acc, item) => {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).map(([name, count]) => count > 1 ? `${name} (x${count})` : name);
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
            addLog('EXPORT', `Đã tải ảnh báo cáo tuần ${selectedWeekForCard} của ${student.name}`);
        } catch (error) {
            console.error(error);
            alert("Lỗi khi tạo ảnh. Vui lòng thử lại.");
        }
    };

    const handleCopyToClipboard = async () => {
        if (!cardRef.current) return;
        setIsCopying(true);
        try {
            const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
            canvas.toBlob(async (blob: Blob | null) => {
                if (!blob) {
                    alert("Lỗi tạo ảnh.");
                    setIsCopying(false);
                    return;
                }
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    alert("✅ Đã sao chép ảnh!\n\nBây giờ bạn hãy mở Zalo và nhấn Ctrl+V (Dán) vào khung chat để gửi.");
                    addLog('EXPORT', `Đã copy ảnh báo cáo tuần ${selectedWeekForCard} của ${student.name}`);
                } catch (err) {
                    console.error(err);
                    alert("Trình duyệt này không hỗ trợ Copy ảnh tự động. Vui lòng dùng nút 'Tải ảnh về máy'.");
                }
                setIsCopying(false);
            });
        } catch (error) {
            console.error(error);
            alert("Lỗi khi tạo ảnh.");
            setIsCopying(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-indigo-600 text-white flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <User size={24} /> {student.name}
                    </h3>
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
                                    <span className="block text-gray-500 text-xs uppercase">Điểm Trung Bình</span>
                                    <span className={`text-2xl font-bold ${avgScore >= 80 ? 'text-green-600' : avgScore >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                                        {avgScore}
                                    </span>
                                </div>
                                <div className="flex-1 ml-6 h-32 bg-white rounded-lg p-2 border shadow-sm">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                            <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false}/>
                                            <YAxis domain={[0, 100]} hide/>
                                            <Tooltip contentStyle={{borderRadius: '8px', fontSize: '12px'}}/>
                                            <Line type="monotone" dataKey="Score" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff'}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">Chi tiết từng tuần</h4>
                            {studentRecords.length === 0 ? (
                                <p className="text-gray-400 italic">Chưa có dữ liệu hạnh kiểm.</p>
                            ) : (
                                <div className="space-y-3">
                                    {studentRecords.map(r => (
                                        <div key={r.id} className="p-3 bg-white rounded-lg border hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="font-bold text-indigo-700">Tuần {r.week}</div>
                                                <div className={`font-bold px-2 py-0.5 rounded border text-sm
                                                    ${r.score >= 80 ? 'bg-green-50 text-green-700 border-green-100' : 
                                                      r.score >= 50 ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                                      'bg-red-50 text-red-700 border-red-100'}`}>
                                                    {r.score} điểm
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-red-500 font-semibold block mb-1 text-xs uppercase">Vi phạm</span>
                                                    {r.violations.length > 0 ? (
                                                        <ul className="list-disc list-inside text-red-700 text-xs space-y-0.5">
                                                            {getGroupedItems(r.violations).map((v, i) => <li key={i}>{v}</li>)}
                                                        </ul>
                                                    ) : <span className="text-gray-300 italic text-xs">Không có</span>}
                                                </div>
                                                <div>
                                                    <span className="text-green-600 font-semibold block mb-1 text-xs uppercase">Hành vi tốt</span>
                                                    {r.positiveBehaviors && r.positiveBehaviors.length > 0 ? (
                                                        <ul className="list-disc list-inside text-green-700 text-xs space-y-0.5">
                                                            {getGroupedItems(r.positiveBehaviors).map((v, i) => <li key={i}>{v}</li>)}
                                                        </ul>
                                                    ) : <span className="text-gray-300 italic text-xs">Không có</span>}
                                                </div>
                                            </div>
                                            {r.note && (
                                                <div className="mt-2 text-sm text-gray-600 border-t border-gray-100 pt-1 italic">
                                                    <span className="font-semibold text-gray-500 not-italic text-xs">Ghi chú:</span> {r.note}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="flex gap-2 items-center mb-4 w-full justify-center">
                                <label className="text-sm font-medium text-gray-700">Chọn tuần:</label>
                                <select 
                                    value={selectedWeekForCard}
                                    onChange={(e) => setSelectedWeekForCard(parseInt(e.target.value))}
                                    className="border rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 mr-2"
                                >
                                    {records.filter(r => r.studentId === student.id).sort((a,b) => b.week - a.week).map(r => (
                                        <option key={r.week} value={r.week}>Tuần {r.week} ({r.score}đ)</option>
                                    ))}
                                    {records.filter(r => r.studentId === student.id).length === 0 && <option value={1}>Tuần 1</option>}
                                </select>
                                
                                <button 
                                    onClick={handleCopyToClipboard}
                                    disabled={isCopying}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 shadow-sm"
                                    title="Copy ảnh để dán vào Zalo"
                                >
                                    {isCopying ? 'Đang xử lý...' : <><Copy size={16}/> Sao chép (Gửi Zalo)</>}
                                </button>

                                <button 
                                    onClick={handleDownloadImage}
                                    className="bg-white border text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded text-sm flex items-center gap-2 shadow-sm"
                                    title="Tải file ảnh về máy"
                                >
                                    <Download size={16}/> Tải về
                                </button>
                            </div>
                            
                            <div className="border shadow-inner bg-gray-200 p-8 rounded-xl overflow-auto w-full flex justify-center">
                                <ReportCard 
                                    cardRef={cardRef}
                                    student={student}
                                    week={selectedWeekForCard}
                                    record={records.find(r => r.studentId === student.id && r.week === selectedWeekForCard)}
                                    settings={settings}
                                />
                            </div>
                             <p className="mt-4 text-xs text-gray-500 text-center max-w-md mx-auto">
                                <span className="font-bold text-indigo-600">Mẹo gửi Zalo:</span> Nhấn nút <strong>"Sao chép"</strong> ở trên, sau đó mở cửa sổ chat Zalo với phụ huynh và nhấn <strong>Ctrl + V</strong> để dán ảnh.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
interface Props {
    setHasUnsavedChanges: (val: boolean) => void;
}

const ConductManager: React.FC<Props> = ({ setHasUnsavedChanges }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<ConductRecord[]>([]);
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [viewMode, setViewMode] = useState<'input' | 'stats'>('input');
  
  // Selection States
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);

  // Stats States
  const [statsStartWeek, setStatsStartWeek] = useState(1);
  const [statsEndWeek, setStatsEndWeek] = useState(4);
  const [statsTab, setStatsTab] = useState<'chart' | 'week-report' | 'multi-report' | 'semester'>('chart');
  const [semesterMode, setSemesterMode] = useState<'s1' | 's2' | 'year'>('s1');
  
  // Settings Tab State
  const [settingTab, setSettingTab] = useState<'general' | 'behaviors'>('general');

  // Behavior Edit State
  const [newBehaviorLabel, setNewBehaviorLabel] = useState('');
  const [newBehaviorPoints, setNewBehaviorPoints] = useState(0);

  // Refs for Class Export
  const classReportRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStudents(getStudents());
    setRecords(getConductRecords());
    setSettings(getSettings());
  }, []);

  const isLocked = useMemo(() => {
      return settings.lockedWeeks?.includes(selectedWeek);
  }, [settings.lockedWeeks, selectedWeek]);

  // Helpers
  const getWeekLabel = (weekNum: number) => {
      if (!settings.semesterStartDate) return `Tuần ${weekNum}`;
      const start = new Date(settings.semesterStartDate);
      start.setDate(start.getDate() + (weekNum - 1) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      
      const fmt = (d: Date) => `${d.getDate()}/${d.getMonth()+1}`;
      return `Tuần ${weekNum} (${fmt(start)} - ${fmt(end)})`;
  };

  const getRankFromScore = (score: number) => {
    if (score >= settings.thresholds.good) return AcademicRank.GOOD;
    if (score >= settings.thresholds.fair) return AcademicRank.FAIR;
    if (score >= settings.thresholds.pass) return AcademicRank.PASS;
    return AcademicRank.FAIL;
  };

  const getRankColor = (rank: string) => {
    switch(rank) {
        case AcademicRank.GOOD: return 'text-green-600 bg-green-50';
        case AcademicRank.FAIR: return 'text-blue-600 bg-blue-50';
        case AcademicRank.PASS: return 'text-yellow-600 bg-yellow-50';
        default: return 'text-red-600 bg-red-50';
    }
  };

  // Helper to format string array to grouped text for display (e.g. "Talk x2, Late")
  const formatGroupedList = (items: string[]) => {
      if (!items || items.length === 0) return '';
      const counts = items.reduce((acc, item) => {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
      return Object.entries(counts)
        .map(([name, count]) => count > 1 ? `${name} (x${count})` : name)
        .join(', ');
  };

  // --- Handlers ---

  const handleCloudSave = async () => {
      if (window.confirm("Bạn có muốn Lưu và gửi dữ liệu lên Cloud ngay bây giờ không?")) {
        setIsSaving(true);
        const success = await uploadToCloud();
        setIsSaving(false);
        if (success) {
            alert("Đã lưu dữ liệu thành công!");
            setHasUnsavedChanges(false);
        } else {
            alert("Lưu thất bại. Dữ liệu vẫn được lưu trên máy này, nhưng chưa lên Cloud.");
        }
      }
  };

  const toggleLockWeek = () => {
      let newLocked = settings.lockedWeeks ? [...settings.lockedWeeks] : [];
      if (isLocked) {
          if (!window.confirm(`Bạn có chắc chắn muốn MỞ KHÓA Tuần ${selectedWeek}? Dữ liệu có thể bị thay đổi.`)) return;
          newLocked = newLocked.filter(w => w !== selectedWeek);
      } else {
          newLocked.push(selectedWeek);
      }
      const newSettings = { ...settings, lockedWeeks: newLocked };
      setSettings(newSettings);
      saveSettings(newSettings);
  };

  const handleScoreChange = (studentId: string, week: number, val: string) => {
    if (isLocked) return;
    const score = parseInt(val);
    if (isNaN(score)) return;
    updateRecord(studentId, week, { score });
  };

  const handleNoteChange = (studentId: string, week: number, val: string) => {
    if (isLocked) return;
    updateRecord(studentId, week, { note: val });
  };

  const updateRecord = (studentId: string, week: number, updates: Partial<ConductRecord>) => {
    if (isLocked) return;
    const existingIdx = records.findIndex(r => r.studentId === studentId && r.week === week);
    let newRecords = [...records];
    
    if (existingIdx > -1) {
      newRecords[existingIdx] = { ...newRecords[existingIdx], ...updates };
    } else {
      newRecords.push({
        id: `CON-${studentId}-W${week}`,
        studentId,
        week,
        score: settings.defaultScore,
        violations: [],
        positiveBehaviors: [],
        note: '',
        ...updates
      });
    }
    setRecords(newRecords);
    saveConductRecords(newRecords);
    setHasUnsavedChanges(true);
  };

  // Tag Handlers with Frequency
  const handleTagChange = (studentId: string, week: number, label: string, points: number, delta: number, isPositive: boolean) => {
      if (isLocked) return;
      const rec = records.find(r => r.studentId === studentId && r.week === week);
      const currentList = isPositive ? (rec?.positiveBehaviors || []) : (rec?.violations || []);
      const currentScore = rec ? rec.score : settings.defaultScore;

      let newList = [...currentList];
      let newScore = currentScore;

      if (delta > 0) {
          // Add item
          newList.push(label);
          newScore = currentScore + points; 
      } else {
          // Remove item (find index of first occurrence)
          const idx = newList.indexOf(label);
          if (idx > -1) {
              newList.splice(idx, 1);
              newScore = currentScore - points; // Reverse points
          }
      }

      // Clamp score 0-100
      newScore = Math.max(0, Math.min(100, newScore));

      updateRecord(studentId, week, {
          [isPositive ? 'positiveBehaviors' : 'violations']: newList,
          score: newScore
      });
  };

  const handleFillDefault = () => {
      if (isLocked) return;
      if (!window.confirm(`Bạn có muốn điền điểm mặc định (${settings.defaultScore}) cho tất cả học sinh chưa có điểm trong Tuần ${selectedWeek}?`)) return;
      
      let newRecords = [...records];
      let count = 0;
      students.forEach(s => {
          const exists = newRecords.find(r => r.studentId === s.id && r.week === selectedWeek);
          if (!exists) {
              newRecords.push({
                  id: `CON-${s.id}-W${selectedWeek}`,
                  studentId: s.id,
                  week: selectedWeek,
                  score: settings.defaultScore || 100,
                  violations: [],
                  positiveBehaviors: [],
                  note: ''
              });
              count++;
          }
      });
      setRecords(newRecords);
      saveConductRecords(newRecords);
      setHasUnsavedChanges(true);
      addLog('CONDUCT', `Đã điền điểm mặc định cho ${count} học sinh tuần ${selectedWeek}.`);
  };

  const handleClassBonus = () => {
      if (isLocked) return;
      const bonusStr = prompt("Nhập số điểm muốn CỘNG cho cả lớp tuần này:", "5");
      if (!bonusStr) return;
      const bonus = parseInt(bonusStr);
      if (isNaN(bonus)) {
          alert("Vui lòng nhập số!");
          return;
      }
      
      const reason = prompt("Lý do cộng điểm (VD: Lớp xếp thứ nhất tuần):", "Thành tích tập thể");
      if (!reason) return;

      if (!window.confirm(`Cộng ${bonus} điểm cho TOÀN BỘ học sinh tuần ${selectedWeek}?\nLý do: ${reason}`)) return;

      applyClassScoreChange(bonus, reason, true);
  };

  const handleClassPenalty = () => {
      if (isLocked) return;
      const penaltyStr = prompt("Nhập số điểm muốn TRỪ cho cả lớp tuần này:", "2");
      if (!penaltyStr) return;
      const penalty = parseInt(penaltyStr);
      if (isNaN(penalty)) {
          alert("Vui lòng nhập số!");
          return;
      }

      const reason = prompt("Lý do trừ điểm (VD: Vệ sinh bẩn):", "Vi phạm tập thể");
      if (!reason) return;

      if (!window.confirm(`Trừ ${penalty} điểm cho TOÀN BỘ học sinh tuần ${selectedWeek}?\nLý do: ${reason}`)) return;

      applyClassScoreChange(penalty, reason, false);
  };

  const applyClassScoreChange = (amount: number, reason: string, isBonus: boolean) => {
      const newRecords = [...records];
      let count = 0;
      
      students.forEach(s => {
          const idx = newRecords.findIndex(r => r.studentId === s.id && r.week === selectedWeek);
          let record: ConductRecord;

          if (idx > -1) {
              // Update existing record
              record = { ...newRecords[idx] };
              record.score = isBonus 
                ? Math.min(100, record.score + amount) 
                : Math.max(0, record.score - amount);

              if (isBonus) {
                  const newPositives = [...(record.positiveBehaviors || [])];
                  newPositives.push(`${reason} (+${amount}đ)`);
                  record.positiveBehaviors = newPositives;
              } else {
                  const newViolations = [...(record.violations || [])];
                  newViolations.push(`${reason} (-${amount}đ)`);
                  record.violations = newViolations;
              }
              newRecords[idx] = record;
          } else {
               // Create new record
               const baseScore = settings.defaultScore;
               newRecords.push({
                   id: `CON-${s.id}-W${selectedWeek}`,
                   studentId: s.id,
                   week: selectedWeek,
                   score: isBonus ? Math.min(100, baseScore + amount) : Math.max(0, baseScore - amount),
                   violations: isBonus ? [] : [`${reason} (-${amount}đ)`],
                   positiveBehaviors: isBonus ? [`${reason} (+${amount}đ)`] : [],
                   note: ''
               });
          }
          count++;
      });
      
      setRecords(newRecords);
      saveConductRecords(newRecords);
      setHasUnsavedChanges(true);
      addLog('CONDUCT', `Đã ${isBonus ? 'cộng' : 'trừ'} ${amount} điểm cho ${count} học sinh tuần ${selectedWeek}.`);
  };

  const exportClassImage = async () => {
      if (!classReportRef.current) return;
      try {
          const canvas = await html2canvas(classReportRef.current, { scale: 1.5, useCORS: true });
          const image = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = image;
          link.download = `BaoCaoLop_Tuan${selectedWeek}.png`;
          link.click();
      } catch (e) {
          console.error(e);
          alert("Lỗi khi xuất ảnh. Vui lòng thử lại.");
      }
  };

  const updateSettings = (partialSettings: any) => {
      const newSettings = { ...settings, ...partialSettings };
      setSettings(newSettings);
      saveSettings(newSettings);
  };

  // Behavior Settings Helpers
  const addBehavior = (isPositive: boolean) => {
      if (!newBehaviorLabel.trim()) return;
      
      const newItem: BehaviorItem = {
          id: Date.now().toString(),
          label: newBehaviorLabel,
          points: parseInt(newBehaviorPoints.toString())
      };

      const config = { ...settings.behaviorConfig };
      if (isPositive) {
          config.positives = [...config.positives, newItem];
      } else {
          config.violations = [...config.violations, newItem];
      }
      
      updateSettings({ behaviorConfig: config });
      setNewBehaviorLabel('');
      setNewBehaviorPoints(isPositive ? 1 : -1);
  };

  const deleteBehavior = (id: string, isPositive: boolean) => {
      const config = { ...settings.behaviorConfig };
      if (isPositive) {
          config.positives = config.positives.filter(i => i.id !== id);
      } else {
          config.violations = config.violations.filter(i => i.id !== id);
      }
      updateSettings({ behaviorConfig: config });
  };

  // --- Statistics Logic ---
  const pieData = useMemo(() => {
    let good = 0, fair = 0, pass = 0, fail = 0;
    
    // Filter records within range
    const filteredRecords = records.filter(r => r.week >= statsStartWeek && r.week <= statsEndWeek);
    const studentStats = new Map<string, {total: number, count: number}>();
    
    filteredRecords.forEach(r => {
        const curr = studentStats.get(r.studentId) || { total: 0, count: 0};
        studentStats.set(r.studentId, { total: curr.total + r.score, count: curr.count + 1});
    });

    studentStats.forEach((val) => {
        const avg = Math.round(val.total / val.count);
        const rank = getRankFromScore(avg);
        if (rank === AcademicRank.GOOD) good++;
        else if (rank === AcademicRank.FAIR) fair++;
        else if (rank === AcademicRank.PASS) pass++;
        else fail++;
    });

    return [
        { name: 'Tốt', value: good },
        { name: 'Khá', value: fair },
        { name: 'Đạt', value: pass },
        { name: 'Chưa đạt', value: fail },
    ].filter(x => x.value > 0);
  }, [records, statsStartWeek, statsEndWeek, settings]);


  // --- Semester Calculation Logic ---
  const calculateSemesterRank = (student: Student, mode: 's1' | 's2' | 'year') => {
      let startW = 1;
      let endW = 35; // Default max

      if (mode === 's1') {
          startW = 1;
          endW = settings.semesterTwoStartWeek - 1;
      } else if (mode === 's2') {
          startW = settings.semesterTwoStartWeek;
          endW = 50; // Arbitrary high week
      } else {
          startW = 1;
          endW = 50;
      }

      // 1. Get weeks
      const relevantRecords = records.filter(r => r.studentId === student.id && r.week >= startW && r.week <= endW);
      if (relevantRecords.length === 0) return { avgRaw: 0, avgConverted: 0, rank: '-' };

      // 2. Convert each week to points
      let totalConverted = 0;
      let totalRaw = 0;

      relevantRecords.forEach(r => {
          totalRaw += r.score;
          const weeklyRank = getRankFromScore(r.score);
          let point = 0;
          switch(weeklyRank) {
              case AcademicRank.GOOD: point = settings.rankScores.good; break;
              case AcademicRank.FAIR: point = settings.rankScores.fair; break;
              case AcademicRank.PASS: point = settings.rankScores.pass; break;
              case AcademicRank.FAIL: point = settings.rankScores.fail; break;
          }
          totalConverted += point;
      });

      const avgRaw = Math.round(totalRaw / relevantRecords.length);
      const avgConverted = parseFloat((totalConverted / relevantRecords.length).toFixed(2));

      // 3. Map average converted points to Semester Rank
      let semesterRank = AcademicRank.FAIL;
      if (avgConverted >= settings.semesterThresholds.good) semesterRank = AcademicRank.GOOD;
      else if (avgConverted >= settings.semesterThresholds.fair) semesterRank = AcademicRank.FAIR;
      else if (avgConverted >= settings.semesterThresholds.pass) semesterRank = AcademicRank.PASS;

      return { avgRaw, avgConverted, rank: semesterRank };
  };

  // --- Renders ---

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[700px] shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2"><SettingsIcon size={20}/> Cấu hình hệ thống</h3>
                    <div className="flex gap-2 text-sm font-medium">
                        <button 
                            onClick={() => setSettingTab('general')}
                            className={`px-3 py-1 rounded ${settingTab === 'general' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            Chung
                        </button>
                        <button 
                             onClick={() => setSettingTab('behaviors')}
                             className={`px-3 py-1 rounded ${settingTab === 'behaviors' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            Danh mục Lỗi / Điểm cộng
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    {settingTab === 'general' ? (
                        <div className="space-y-6">
                            {/* General */}
                            <section>
                                <h4 className="font-bold text-indigo-700 text-sm mb-2">Thông số cơ bản</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Ngày bắt đầu học kỳ</label>
                                        <input 
                                            type="date" 
                                            value={settings.semesterStartDate} 
                                            onChange={e => updateSettings({ semesterStartDate: e.target.value })} 
                                            className="w-full border p-2 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Tuần bắt đầu HK2</label>
                                        <input 
                                            type="number" 
                                            value={settings.semesterTwoStartWeek} 
                                            onChange={e => updateSettings({ semesterTwoStartWeek: parseInt(e.target.value) })} 
                                            className="w-full border p-2 rounded"
                                            placeholder="19"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Điểm mặc định tuần</label>
                                        <input 
                                            type="number" 
                                            value={settings.defaultScore} 
                                            onChange={e => updateSettings({ defaultScore: parseInt(e.target.value) })} 
                                            className="w-full border p-2 rounded"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Weekly Thresholds */}
                            <section>
                                <h4 className="font-bold text-indigo-700 text-sm mb-2">Thang điểm Hạnh kiểm Tuần (0-100)</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-xs text-gray-600">Mốc Tốt</label>
                                        <input type="number" value={settings.thresholds.good} onChange={e => updateSettings({ thresholds: { ...settings.thresholds, good: parseInt(e.target.value) } })} className="w-full border p-2 rounded"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600">Mốc Khá</label>
                                        <input type="number" value={settings.thresholds.fair} onChange={e => updateSettings({ thresholds: { ...settings.thresholds, fair: parseInt(e.target.value) } })} className="w-full border p-2 rounded"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600">Mốc Đạt</label>
                                        <input type="number" value={settings.thresholds.pass} onChange={e => updateSettings({ thresholds: { ...settings.thresholds, pass: parseInt(e.target.value) } })} className="w-full border p-2 rounded"/>
                                    </div>
                                </div>
                            </section>
                            
                            {/* Conversion Scores */}
                            <section>
                                <h4 className="font-bold text-indigo-700 text-sm mb-2">Quy đổi: Xếp loại Tuần -&gt; Điểm số</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    <div>
                                        <label className="block text-xs text-green-700">Tốt</label>
                                        <input type="number" value={settings.rankScores.good} onChange={e => updateSettings({ rankScores: { ...settings.rankScores, good: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-blue-700">Khá</label>
                                        <input type="number" value={settings.rankScores.fair} onChange={e => updateSettings({ rankScores: { ...settings.rankScores, fair: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-yellow-700">Đạt</label>
                                        <input type="number" value={settings.rankScores.pass} onChange={e => updateSettings({ rankScores: { ...settings.rankScores, pass: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-red-700">Chưa Đạt</label>
                                        <input type="number" value={settings.rankScores.fail} onChange={e => updateSettings({ rankScores: { ...settings.rankScores, fail: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/>
                                    </div>
                                </div>
                            </section>

                            {/* Semester Thresholds */}
                            <section>
                                <h4 className="font-bold text-indigo-700 text-sm mb-2">Thang điểm Hạnh kiểm Học Kỳ</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-xs text-gray-600">Mốc Tốt (&ge;)</label>
                                        <input type="number" step="0.1" value={settings.semesterThresholds.good} onChange={e => updateSettings({ semesterThresholds: { ...settings.semesterThresholds, good: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600">Mốc Khá (&ge;)</label>
                                        <input type="number" step="0.1" value={settings.semesterThresholds.fair} onChange={e => updateSettings({ semesterThresholds: { ...settings.semesterThresholds, fair: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600">Mốc Đạt (&ge;)</label>
                                        <input type="number" step="0.1" value={settings.semesterThresholds.pass} onChange={e => updateSettings({ semesterThresholds: { ...settings.semesterThresholds, pass: parseFloat(e.target.value) } })} className="w-full border p-2 rounded"/>
                                    </div>
                                </div>
                            </section>
                        </div>
                    ) : (
                        <div className="space-y-8">
                             {/* Violations */}
                             <section>
                                <h4 className="font-bold text-red-700 text-sm mb-2 uppercase">Danh mục Lỗi Vi Phạm</h4>
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                    <div className="flex gap-2 mb-4">
                                        <input 
                                            placeholder="Tên lỗi vi phạm (ví dụ: Đi học muộn)" 
                                            className="flex-1 border p-2 rounded text-sm"
                                            value={newBehaviorLabel}
                                            onChange={e => setNewBehaviorLabel(e.target.value)}
                                        />
                                        <input 
                                            type="number" 
                                            placeholder="Điểm trừ" 
                                            className="w-24 border p-2 rounded text-sm"
                                            value={newBehaviorPoints}
                                            onChange={e => setNewBehaviorPoints(parseInt(e.target.value))}
                                        />
                                        <button onClick={() => addBehavior(false)} className="bg-red-600 text-white px-4 rounded hover:bg-red-700 text-sm font-medium">Thêm</button>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-2">
                                        {settings.behaviorConfig.violations.map(item => (
                                            <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
                                                <span className="text-sm font-medium">{item.label}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-bold text-red-600">{item.points}đ</span>
                                                    <button onClick={() => deleteBehavior(item.id, false)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
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
                                            value={newBehaviorLabel}
                                            onChange={e => setNewBehaviorLabel(e.target.value)}
                                        />
                                        <input 
                                            type="number" 
                                            placeholder="Điểm cộng" 
                                            className="w-24 border p-2 rounded text-sm"
                                            value={newBehaviorPoints}
                                            onChange={e => setNewBehaviorPoints(parseInt(e.target.value))}
                                        />
                                        <button onClick={() => addBehavior(true)} className="bg-green-600 text-white px-4 rounded hover:bg-green-700 text-sm font-medium">Thêm</button>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-2">
                                        {settings.behaviorConfig.positives.map(item => (
                                            <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
                                                <span className="text-sm font-medium">{item.label}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-bold text-green-600">+{item.points}đ</span>
                                                    <button onClick={() => deleteBehavior(item.id, true)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
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

      {/* Detail Modal */}
      <StudentDetailModal 
        student={selectedStudentForDetail} 
        records={records} 
        settings={settings}
        onClose={() => setSelectedStudentForDetail(null)} 
      />

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Quản Lý Hạnh Kiểm</h2>
            <div className="flex gap-2 mt-2">
                <button 
                    onClick={() => setViewMode('input')}
                    className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${viewMode === 'input' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                    <CheckSquare size={14} className="inline mr-1"/> Nhập liệu
                </button>
                <button 
                    onClick={() => setViewMode('stats')}
                    className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${viewMode === 'stats' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                    <PieChartIcon size={14} className="inline mr-1"/> Thống kê & Báo cáo
                </button>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={handleCloudSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-bold"
            >
                {isSaving ? 'Đang lưu...' : <><CloudUpload size={18} /> Lưu & Sync</>}
            </button>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 text-gray-600 bg-white border px-3 py-2 rounded hover:bg-gray-100 shadow-sm">
                <SettingsIcon size={18} /> Cấu hình
            </button>
        </div>
      </div>

      {/* === INPUT MODE === */}
      {viewMode === 'input' && (
          <div className="bg-white rounded-xl shadow overflow-hidden flex flex-col h-[calc(100vh-180px)]">
             <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-gray-500"/>
                        <select 
                            value={selectedWeek} 
                            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                            className="border border-gray-300 rounded px-2 py-1.5 font-medium text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {Array.from({length: 35}).map((_, i) => (
                                <option key={i+1} value={i+1}>{getWeekLabel(i+1)}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={toggleLockWeek}
                        className={`flex items-center gap-1 text-sm px-2 py-1 rounded font-medium ${isLocked ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}
                        title={isLocked ? "Mở khóa tuần này" : "Khóa tuần này để tránh sửa đổi"}
                    >
                        {isLocked ? <><Lock size={14}/> Đã khóa</> : <><Unlock size={14}/> Mở khóa</>}
                    </button>
                </div>
                
                {!isLocked && (
                    <div className="flex gap-2">
                        <button 
                            onClick={handleClassBonus}
                            className="flex items-center gap-2 text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 font-medium"
                        >
                            <Star size={16}/> Cộng cả lớp
                        </button>
                        <button 
                            onClick={handleClassPenalty}
                            className="flex items-center gap-2 text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 font-medium"
                        >
                            <ThumbsDown size={16}/> Trừ cả lớp
                        </button>
                        <button 
                            onClick={handleFillDefault}
                            className="flex items-center gap-2 text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded hover:bg-green-200 font-medium"
                        >
                            <CheckSquare size={16}/> Điền mặc định
                        </button>
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
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {students.map((s, idx) => {
                            const rec = records.find(r => r.studentId === s.id && r.week === selectedWeek);
                            const score = rec ? rec.score : '';
                            const rank = rec ? getRankFromScore(rec.score) : '-';
                            
                            return (
                                <tr key={s.id} className="hover:bg-indigo-50 transition-colors group">
                                    <td className="p-3 text-gray-400 text-xs text-center">{idx + 1}</td>
                                    <td className="p-3">
                                        <button 
                                            onClick={() => setSelectedStudentForDetail(s)}
                                            className="font-medium text-gray-800 hover:text-indigo-600 hover:underline text-left"
                                        >
                                            {s.name}
                                        </button>
                                    </td>
                                    <td className="p-3 text-center">
                                        <input 
                                            type="number" 
                                            placeholder={settings.defaultScore.toString()}
                                            value={score} 
                                            onChange={(e) => handleScoreChange(s.id, selectedWeek, e.target.value)}
                                            disabled={isLocked}
                                            className={`w-14 border rounded p-1 text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500
                                                ${rec && rec.score < settings.thresholds.pass ? 'text-red-600 bg-red-50 border-red-200' : 'text-gray-700'}
                                                ${isLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        {rank !== '-' && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getRankColor(rank)}`}>
                                                {rank}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 border-l border-gray-100 align-top">
                                        <TagSelector 
                                            selectedTags={rec ? rec.violations : []}
                                            availableItems={settings.behaviorConfig.violations}
                                            onChange={(label, points, delta) => handleTagChange(s.id, selectedWeek, label, points, delta, false)}
                                            placeholder="..."
                                            isPositive={false}
                                            disabled={isLocked}
                                        />
                                    </td>
                                    <td className="p-3 border-l border-gray-100 align-top">
                                        <TagSelector 
                                            selectedTags={rec?.positiveBehaviors || []}
                                            availableItems={settings.behaviorConfig.positives}
                                            onChange={(label, points, delta) => handleTagChange(s.id, selectedWeek, label, points, delta, true)}
                                            placeholder="..."
                                            isPositive={true}
                                            disabled={isLocked}
                                        />
                                    </td>
                                    <td className="p-3 border-l border-gray-100 align-top">
                                        <input
                                            type="text"
                                            className={`w-full border-b border-gray-200 focus:border-indigo-500 outline-none text-sm py-1 bg-transparent text-gray-600 placeholder-gray-300 ${isLocked ? 'cursor-not-allowed' : ''}`}
                                            placeholder="Thêm ghi chú..."
                                            value={rec?.note || ''}
                                            onChange={(e) => handleNoteChange(s.id, selectedWeek, e.target.value)}
                                            disabled={isLocked}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
          </div>
      )}

      {/* === STATS MODE === */}
      {viewMode === 'stats' && (
          <div className="flex flex-col h-full gap-4">
              {/* Filter Bar */}
              {statsTab !== 'semester' && (
                  <div className="bg-white p-4 rounded-xl shadow-sm flex flex-wrap items-center gap-4">
                      <span className="font-bold text-gray-700 flex items-center gap-2"><Search size={18}/> Bộ lọc:</span>
                      <div className="flex items-center gap-2">
                          <span className="text-sm">Từ tuần</span>
                          <input type="number" min="1" value={statsStartWeek} onChange={e => setStatsStartWeek(parseInt(e.target.value))} className="w-16 border rounded p-1 text-center"/>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="text-sm">Đến tuần</span>
                          <input type="number" min="1" value={statsEndWeek} onChange={e => setStatsEndWeek(parseInt(e.target.value))} className="w-16 border rounded p-1 text-center"/>
                      </div>
                  </div>
              )}

              {/* Stats Tabs */}
              <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                  <button onClick={() => setStatsTab('chart')} className={`px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'chart' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}>Biểu đồ</button>
                  <button onClick={() => setStatsTab('week-report')} className={`px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'week-report' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}>Báo cáo Tuần</button>
                  <button onClick={() => setStatsTab('multi-report')} className={`px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'multi-report' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}>Báo cáo Chi tiết</button>
                  <button onClick={() => setStatsTab('semester')} className={`px-4 py-2 font-bold text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'semester' ? 'bg-yellow-50 text-indigo-700 border border-yellow-200' : 'text-gray-500 hover:text-indigo-600'}`}>Tổng kết Học kỳ</button>
              </div>

              {/* Content */}
              <div className="bg-white rounded-b-xl rounded-tr-xl shadow p-6 min-h-[500px]">
                  
                  {statsTab === 'chart' && (
                      <div className="flex flex-col md:flex-row gap-8 items-center justify-center h-full">
                           <div className="w-full md:w-1/2 h-80 flex flex-col items-center">
                                <h3 className="font-bold text-gray-700 mb-4">Phân loại Hạnh Kiểm (Trung bình)</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                           </div>
                           <div className="w-full md:w-1/2">
                                <h4 className="font-bold mb-2">Thống kê nhanh (Tuần {statsStartWeek} - {statsEndWeek}):</h4>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li>Tổng số học sinh: <strong>{students.length}</strong></li>
                                    <li>Tuần dữ liệu: <strong>{new Set(records.filter(r => r.week >= statsStartWeek && r.week <= statsEndWeek).map(r => r.week)).size}</strong></li>
                                </ul>
                           </div>
                      </div>
                  )}

                  {statsTab === 'week-report' && (
                      <div>
                          <div className="mb-4 flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div className="flex items-center gap-2">
                                <label className="font-bold">Chọn tuần xem báo cáo:</label>
                                <select 
                                    value={selectedWeek} 
                                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                                    className="border rounded px-2 py-1"
                                >
                                    {Array.from({length: 35}).map((_, i) => (
                                        <option key={i+1} value={i+1}>{getWeekLabel(i+1)}</option>
                                    ))}
                                </select>
                              </div>
                              <button 
                                onClick={exportClassImage}
                                className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-indigo-700"
                              >
                                  <ImageIcon size={16}/> Xuất ảnh cả lớp
                              </button>
                          </div>
                          
                          {/* Wrapper for Image Export */}
                          <div ref={classReportRef} className="bg-white p-4">
                            <div className="text-center mb-4">
                                <h3 className="text-xl font-bold uppercase text-indigo-800">Báo cáo Tổng hợp Tuần {selectedWeek}</h3>
                                <p className="text-sm text-gray-500 italic">{getWeekLabel(selectedWeek)}</p>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-200 text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border p-2 w-10">STT</th>
                                            <th className="border p-2">Học sinh</th>
                                            <th className="border p-2 w-16">Điểm</th>
                                            <th className="border p-2 w-20">Xếp loại</th>
                                            <th className="border p-2 w-1/4">Vi phạm</th>
                                            <th className="border p-2 w-1/4">Hành vi tốt</th>
                                            <th className="border p-2 w-1/4">Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((stu, index) => {
                                            const r = records.find(rec => rec.studentId === stu.id && rec.week === selectedWeek);
                                            const score = r ? r.score : 0;
                                            const rank = r ? getRankFromScore(score) : 'Chưa có';
                                            return (
                                                <tr key={stu.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    <td className="border p-2 text-center text-gray-500">{index + 1}</td>
                                                    <td className="border p-2 font-medium">{stu.name}</td>
                                                    <td className={`border p-2 text-center font-bold ${r ? (r.score < 50 ? 'text-red-600' : r.score < 80 ? 'text-yellow-600' : 'text-green-600') : 'text-gray-400'}`}>
                                                        {r ? r.score : '-'}
                                                    </td>
                                                    <td className="border p-2 text-center">
                                                        {r && <span className={`text-xs font-bold px-1 rounded ${getRankColor(rank)}`}>{rank}</span>}
                                                    </td>
                                                    <td className="border p-2 text-red-700 text-xs">
                                                        {r ? formatGroupedList(r.violations) : ''}
                                                    </td>
                                                    <td className="border p-2 text-green-700 text-xs">
                                                        {r ? formatGroupedList(r.positiveBehaviors) : ''}
                                                    </td>
                                                    <td className="border p-2 text-gray-600 italic text-xs">
                                                        {r ? r.note : ''}
                                                    </td>
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
                           <h3 className="text-xl font-bold text-center mb-6 uppercase text-indigo-800">
                               Tổng hợp (Tuần {statsStartWeek} - {statsEndWeek})
                           </h3>
                           <div className="space-y-6">
                               {students.map(s => {
                                   const studentRecords = records.filter(r => r.studentId === s.id && r.week >= statsStartWeek && r.week <= statsEndWeek && (r.violations.length > 0 || (r.positiveBehaviors && r.positiveBehaviors.length > 0) || r.note));
                                   if (studentRecords.length === 0) return null;
                                   
                                   // Calculate quick stats for this period
                                   const avg = Math.round(studentRecords.reduce((acc, cur) => acc + cur.score, 0) / studentRecords.length);
                                   const rank = getRankFromScore(avg);

                                   return (
                                       <div key={s.id} className="border rounded-lg p-4 bg-gray-50 break-inside-avoid relative hover:shadow-md transition-shadow">
                                           <div className="flex justify-between items-start border-b pb-2 mb-2">
                                                <button 
                                                    onClick={() => setSelectedStudentForDetail(s)}
                                                    className="font-bold text-lg text-indigo-700 hover:underline flex items-center gap-2"
                                                >
                                                    {s.name} <User size={16}/>
                                                </button>
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-500">Trung bình giai đoạn</div>
                                                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${getRankColor(rank)}`}>
                                                        {avg}đ - {rank}
                                                    </span>
                                                </div>
                                           </div>
                                           
                                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                               {studentRecords.sort((a,b) => a.week - b.week).map(r => (
                                                   <div key={r.id} className="bg-white p-2 rounded border shadow-sm text-sm">
                                                       <div className="flex justify-between items-center mb-1">
                                                           <span className="font-bold text-indigo-600">Tuần {r.week}</span>
                                                           <div className="flex items-center gap-1">
                                                                <span className="text-xs font-bold border px-1 rounded">{r.score}đ</span>
                                                                <span className={`text-[10px] px-1 rounded ${getRankColor(getRankFromScore(r.score))}`}>{getRankFromScore(r.score)}</span>
                                                           </div>
                                                       </div>
                                                       {r.violations.length > 0 && <div className="text-red-700 mb-1">- {formatGroupedList(r.violations)}</div>}
                                                       {r.positiveBehaviors && r.positiveBehaviors.length > 0 && <div className="text-green-700">+ {formatGroupedList(r.positiveBehaviors)}</div>}
                                                       {r.note && <div className="text-gray-500 italic mt-1 border-t pt-1">Ghi chú: {r.note}</div>}
                                                   </div>
                                               ))}
                                           </div>
                                       </div>
                                   );
                               })}
                           </div>
                      </div>
                  )}

                  {statsTab === 'semester' && (
                      <div>
                          <div className="flex justify-between items-center mb-6 border-b pb-4">
                              <h3 className="text-xl font-bold uppercase text-indigo-800">
                                   Bảng Điểm Hạnh Kiểm
                              </h3>
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
                              <div className="text-xs mt-1 text-blue-600 opacity-80">
                                  Quy đổi điểm: Tốt={settings.rankScores.good}, Khá={settings.rankScores.fair}, Đạt={settings.rankScores.pass}, CĐ={settings.rankScores.fail}
                              </div>
                          </div>
                          
                          <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse border rounded-lg overflow-hidden">
                                  <thead className="bg-indigo-600 text-white text-sm">
                                      <tr>
                                          <th className="p-3">Học sinh</th>
                                          <th className="p-3 text-center">ĐTB (Gốc)</th>
                                          <th className="p-3 text-center">ĐTB (Quy đổi)</th>
                                          <th className="p-3 text-center">Xếp loại {semesterMode === 'year' ? 'Cả Năm' : 'Học Kỳ'}</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                      {students.map((s, idx) => {
                                          const result = calculateSemesterRank(s, semesterMode);
                                          return (
                                              <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                  <td className="p-3 font-medium">{s.name}</td>
                                                  <td className="p-3 text-center text-gray-600">{result.avgRaw}</td>
                                                  <td className="p-3 text-center font-bold text-indigo-600">{result.avgConverted}</td>
                                                  <td className="p-3 text-center">
                                                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRankColor(result.rank)}`}>
                                                          {result.rank}
                                                      </span>
                                                  </td>
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
