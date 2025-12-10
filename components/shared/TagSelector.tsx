
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, X, PlusCircle, MinusCircle } from 'lucide-react';
import { BehaviorItem } from '../../types';
import { formatItemWithPoints } from '../../utils/formatters';

interface Props {
    selectedTags: string[]; 
    availableItems: BehaviorItem[];
    onChange: (label: string, points: number, delta: number) => void;
    placeholder?: string;
    isPositive?: boolean;
    disabled?: boolean;
}

const TagSelector: React.FC<Props> = ({ selectedTags, availableItems, onChange, placeholder = "...", isPositive = false, disabled = false }) => {
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
        if (item) { onChange(tag, item.points, -1); return; }
        const match = tag.match(/\(([+-]?\d+)đ\)/);
        let parsedPoints = 0;
        if (match && match[1]) { parsedPoints = parseInt(match[1], 10); }
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
                                <button onClick={(e) => handleRemoveTag(e, tag)} className={`absolute right-0.5 top-0.5 p-0.5 rounded-full hover:bg-white hover:shadow-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`} title="Xóa"><X size={10} strokeWidth={3} /></button>
                            </span>
                        ))}
                         <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className={`ml-auto focus:outline-none opacity-50 hover:opacity-100 ${isPositive ? 'text-green-600' : 'text-red-600'}`}><PlusCircle size={16} /></button>
                    </div>
                ) : (
                    <div className="flex w-full items-center cursor-pointer">
                         <span className={`text-sm py-1 ${isPositive ? 'text-green-800' : 'text-red-800'} opacity-50`}>{placeholder}</span>
                        <button className={`ml-auto focus:outline-none ${isPositive ? 'text-green-400' : 'text-red-400'}`}><PlusCircle size={16} /></button>
                    </div>
                )}
            </div>
            
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border rounded-lg shadow-xl z-20 p-3 max-h-80 overflow-y-auto">
                    <div className={`text-xs font-bold mb-2 uppercase flex justify-between ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{isPositive ? 'Chọn hành vi tốt' : 'Chọn lỗi vi phạm'}</span>
                        <span>SL / Điểm</span>
                    </div>
                    <div className="mb-2 relative">
                        <input ref={inputRef} type="text" className="w-full border rounded px-2 py-1.5 pl-7 text-sm outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Gõ để tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} />
                        <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                    </div>
                    <div className="space-y-1">
                        {filteredItems.map((item) => {
                            const count = counts[item.label] || 0;
                            return (
                                <div key={item.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded text-sm transition-colors border-b border-transparent hover:border-gray-100">
                                    <div className="flex-1 mr-2 cursor-pointer" onClick={() => onChange(item.label, item.points, 1)}>
                                        <div className="font-medium text-gray-800">{item.label}</div>
                                        <div className={`text-[10px] font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>{item.points > 0 ? `+${item.points}` : item.points}đ</div>
                                    </div>
                                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                                        <button onClick={(e) => { e.stopPropagation(); onChange(item.label, item.points, -1); }} disabled={count === 0} className={`p-1 rounded hover:bg-white shadow-sm transition-all ${count === 0 ? 'text-gray-300' : 'text-red-500'}`}><MinusCircle size={14} /></button>
                                        <span className={`w-6 text-center font-bold text-xs ${count > 0 ? 'text-gray-800' : 'text-gray-400'}`}>{count}</span>
                                        <button onClick={(e) => { e.stopPropagation(); onChange(item.label, item.points, 1); }} className="p-1 rounded hover:bg-white shadow-sm transition-all text-green-600"><PlusCircle size={14} /></button>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredItems.length === 0 && <div className="text-center text-gray-400 text-xs py-2">Không tìm thấy kết quả</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TagSelector;
