
import React, { useState, useMemo } from 'react';
import { X, Search, CheckSquare, Square, Users, Star, AlertTriangle, Send } from 'lucide-react';
import { Student, BehaviorItem, Settings } from '../../types';

interface Props {
    students: Student[];
    settings: Settings;
    onClose: () => void;
    onApply: (studentIds: string[], behaviorLabel: string, points: number, note: string, isPositive: boolean) => void;
}

const BatchInputModal: React.FC<Props> = ({ students, settings, onClose, onApply }) => {
    const [mode, setMode] = useState<'VIOLATION' | 'POSITIVE'>('VIOLATION');
    const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [note, setNote] = useState('');

    const activeStudents = useMemo(() => students.filter(s => s.isActive !== false), [students]);
    
    const filteredStudents = useMemo(() => {
        if (!search.trim()) return activeStudents;
        const lower = search.toLowerCase();
        return activeStudents.filter(s => s.name.toLowerCase().includes(lower));
    }, [activeStudents, search]);

    const behaviors = mode === 'VIOLATION' 
        ? settings.behaviorConfig.violations 
        : settings.behaviorConfig.positives;

    const currentBehavior = behaviors.find(b => b.id === selectedBehaviorId);

    const handleToggleStudent = (id: string) => {
        setSelectedStudentIds(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedStudentIds.length === filteredStudents.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
        }
    };

    const handleSubmit = () => {
        if (!selectedBehaviorId || !currentBehavior) {
            alert("Vui lòng chọn hành vi!");
            return;
        }
        if (selectedStudentIds.length === 0) {
            alert("Vui lòng chọn ít nhất 1 học sinh!");
            return;
        }

        onApply(
            selectedStudentIds, 
            currentBehavior.label, 
            currentBehavior.points, 
            note, 
            mode === 'POSITIVE'
        );
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        ⚡ Nhập liệu Nhanh / Theo nhóm
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Left: Behavior Selection */}
                    <div className="w-full md:w-1/3 border-r flex flex-col bg-gray-50">
                        <div className="flex border-b">
                            <button 
                                onClick={() => { setMode('VIOLATION'); setSelectedBehaviorId(null); }}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${mode === 'VIOLATION' ? 'bg-white text-red-600 border-t-2 border-red-500' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                <AlertTriangle size={16}/> Vi phạm
                            </button>
                            <button 
                                onClick={() => { setMode('POSITIVE'); setSelectedBehaviorId(null); }}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${mode === 'POSITIVE' ? 'bg-white text-green-600 border-t-2 border-green-500' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                <Star size={16}/> Khen thưởng
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {behaviors.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => setSelectedBehaviorId(b.id)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all text-sm flex justify-between items-center ${selectedBehaviorId === b.id ? (mode === 'VIOLATION' ? 'bg-red-50 border-red-300 text-red-800 ring-1 ring-red-300' : 'bg-green-50 border-green-300 text-green-800 ring-1 ring-green-300') : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className="font-medium">{b.label}</span>
                                    <span className={`font-bold ${mode === 'VIOLATION' ? 'text-red-600' : 'text-green-600'}`}>
                                        {b.points > 0 ? '+' : ''}{b.points}đ
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Student Selection */}
                    <div className="flex-1 flex flex-col bg-white">
                        <div className="p-3 border-b flex items-center gap-3 bg-white">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Tìm học sinh..." 
                                    className="w-full pl-9 pr-4 py-2 border rounded-full text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleSelectAll}
                                className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                            >
                                {selectedStudentIds.length === filteredStudents.length ? <CheckSquare size={18}/> : <Square size={18}/>}
                                Chọn tất cả
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredStudents.map(s => {
                                    const isSelected = selectedStudentIds.includes(s.id);
                                    return (
                                        <div 
                                            key={s.id}
                                            onClick={() => handleToggleStudent(s.id)}
                                            className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between hover:shadow-sm transition-all select-none ${isSelected ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' : 'bg-white border-gray-100'}`}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0">
                                                    {s.avatarUrl || s.name.charAt(0)}
                                                </div>
                                                <span className={`text-sm truncate ${isSelected ? 'font-bold text-indigo-900' : 'text-gray-700'}`}>{s.name}</span>
                                            </div>
                                            {isSelected ? <CheckSquare size={20} className="text-indigo-600 fill-indigo-50 shrink-0"/> : <Square size={20} className="text-gray-300 shrink-0"/>}
                                        </div>
                                    )
                                })}
                            </div>
                            {filteredStudents.length === 0 && <div className="text-center text-gray-400 mt-10">Không tìm thấy học sinh.</div>}
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 border-t bg-gray-50">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-bold text-gray-600 whitespace-nowrap">Đang chọn:</span>
                                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">{selectedStudentIds.length} học sinh</span>
                                {currentBehavior && (
                                    <>
                                        <span className="text-gray-400">|</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${mode === 'VIOLATION' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {currentBehavior.label} ({currentBehavior.points > 0 ? '+' : ''}{currentBehavior.points}đ)
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Ghi chú (Tùy chọn)..." 
                                    className="flex-1 border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                                <button 
                                    onClick={handleSubmit}
                                    disabled={!selectedBehaviorId || selectedStudentIds.length === 0}
                                    className={`px-6 py-2 rounded-lg text-white font-bold shadow-md flex items-center gap-2 transition-all ${!selectedBehaviorId || selectedStudentIds.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5'}`}
                                >
                                    <Send size={18} /> Áp dụng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchInputModal;
