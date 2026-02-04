
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FundTransaction, Student } from '../types';
import { getFundTransactions, saveFundTransactions, getStudents } from '../services/dataService';
import { Plus, Minus, Trash2, Search, CheckSquare, Square, Users, FileText, Printer, List, Pencil, BarChart3, ArrowRightLeft, Eye, Filter, Check, ImageIcon } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { addLog } from '../utils/logger';

// Use global html2canvas from index.html
declare const html2canvas: any;

const FundManager: React.FC = () => {
    const [transactions, setTransactions] = useState<FundTransaction[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [view, setView] = useState<'LIST' | 'FORM' | 'BATCH' | 'REPORT' | 'SUMMARY'>('LIST');
    
    // Form State for Adding/Editing
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [formType, setFormType] = useState<'IN' | 'OUT'>('IN');
    const [amount, setAmount] = useState(''); 
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Detailed editing for individual student amounts in a batch
    const [editBatchAmounts, setEditBatchAmounts] = useState<Record<string, number>>({});

    // Batch Collection State
    const [batchMode, setBatchMode] = useState<'FIXED' | 'VARIABLE'>('FIXED');
    const [batchSearch, setBatchSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [variableAmounts, setVariableAmounts] = useState<Record<string, string>>({});

    // Report Selection State
    const [selectedBatchIdsForReport, setSelectedBatchIdsForReport] = useState<string[]>([]);
    const [selectedExpenseCatsForReport, setSelectedExpenseCatsForReport] = useState<string[]>([]);
    
    const reportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const trans = getFundTransactions();
        setTransactions(trans);
        setStudents(getStudents());
        
        // Auto-select all for report initially
        const uniqueBatches = Array.from(new Set(trans.filter(t => t.type === 'IN').map(t => `${t.category}::${t.description}`)));
        setSelectedBatchIdsForReport(uniqueBatches);
        const uniqueExCats = Array.from(new Set(trans.filter(t => t.type === 'OUT').map(t => t.category)));
        setSelectedExpenseCatsForReport(uniqueExCats);
    }, []);

    const activeStudents = useMemo(() => students.filter(s => s.isActive !== false), [students]);

    // Grouping transactions for Diary & Logic
    const groupedTransactions = useMemo(() => {
        const groups: Record<string, { 
            id: string, 
            date: string, 
            type: 'IN' | 'OUT', 
            category: string, 
            description: string, 
            totalAmount: number, 
            studentCount: number,
            originalIds: string[]
        }> = {};

        transactions.forEach(t => {
            const day = t.date.split('T')[0];
            const key = `${t.type}-${t.category}-${t.description}-${day}`;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    date: t.date,
                    type: t.type,
                    category: t.category,
                    description: t.description,
                    totalAmount: 0,
                    studentCount: 0,
                    originalIds: []
                };
            }
            groups[key].totalAmount += t.amount;
            groups[key].originalIds.push(t.id);
            if (t.type === 'IN' && t.relatedStudentIds?.length) {
                groups[key].studentCount += t.relatedStudentIds.length;
            } else if (t.type === 'IN') {
                groups[key].studentCount += 1;
            }
        });

        return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);

    const existingCategories = useMemo(() => Array.from(new Set(transactions.map(t => t.category))).sort(), [transactions]);

    const balance = useMemo(() => transactions.reduce((acc, curr) => curr.type === 'IN' ? acc + curr.amount : acc - curr.amount, 0), [transactions]);

    const categoryStats = useMemo(() => {
        const stats: Record<string, { in: number, out: number }> = {};
        transactions.forEach(t => {
            if (!stats[t.category]) stats[t.category] = { in: 0, out: 0 };
            if (t.type === 'IN') stats[t.category].in += t.amount;
            else stats[t.category].out += t.amount;
        });
        return Object.entries(stats).sort((a, b) => b[1].in - a[1].in);
    }, [transactions]);

    // --- Actions ---
    
    const handleEditGroup = (group: any) => {
        setEditingGroupId(group.id);
        setFormType(group.type);
        setCategory(group.category);
        setDescription(group.description);
        setDate(group.date.split('T')[0]);
        
        // Populate individual amounts for editing
        const amounts: Record<string, number> = {};
        const relevantTrans = transactions.filter(t => group.originalIds.includes(t.id));
        relevantTrans.forEach(t => {
            amounts[t.id] = t.amount;
        });
        setEditBatchAmounts(amounts);
        setAmount(group.totalAmount.toString());
        setView('FORM');
    };

    const handleSaveTransaction = () => {
        if (!category || !description) { alert("Vui lòng nhập đủ thông tin."); return; }
        
        let updatedTransactions: FundTransaction[] = [...transactions];

        if (editingGroupId) {
            const groupToEdit = groupedTransactions.find(g => g.id === editingGroupId);
            if (groupToEdit) {
                updatedTransactions = transactions.map(t => {
                    if (groupToEdit.originalIds.includes(t.id)) {
                        return { 
                            ...t, 
                            category, 
                            description, 
                            date: new Date(date).toISOString(),
                            amount: editBatchAmounts[t.id] ?? t.amount
                        };
                    }
                    return t;
                });
            }
        } else {
            const numAmount = parseInt(amount.replace(/\D/g, ''));
            const newTrans: FundTransaction = {
                id: `FT-${Date.now()}`,
                date: new Date(date).toISOString(),
                type: formType,
                amount: numAmount,
                category,
                description,
                relatedStudentIds: []
            };
            updatedTransactions = [newTrans, ...transactions];
        }

        setTransactions(updatedTransactions);
        saveFundTransactions(updatedTransactions);
        addLog('FUND', editingGroupId ? 'Đã cập nhật đợt giao dịch.' : 'Đã thêm giao dịch lẻ.');
        resetForm();
        setView('LIST');
    };

    const handleDeleteGroup = (originalIds: string[]) => {
        if (!window.confirm(`Xóa toàn bộ đợt này (${originalIds.length} bản ghi)?`)) return;
        const updated = transactions.filter(t => !originalIds.includes(t.id));
        setTransactions(updated);
        saveFundTransactions(updated);
        addLog('FUND', 'Đã xóa một đợt giao dịch.');
    };

    const handleBatchSubmit = () => {
        if (!category || !description || selectedStudentIds.length === 0) { alert("Thiếu thông tin."); return; }
        
        let newTrans: FundTransaction[] = [];
        const now = new Date().toISOString();

        if (batchMode === 'FIXED') {
            const fixedAmt = parseInt(amount);
            newTrans = selectedStudentIds.map(sid => ({
                id: `FT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                date: now,
                type: 'IN',
                amount: fixedAmt,
                category,
                description,
                relatedStudentIds: [sid]
            }));
        } else {
            newTrans = selectedStudentIds.map(sid => ({
                id: `FT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                date: now,
                type: 'IN',
                amount: parseInt(variableAmounts[sid] || '0'),
                category,
                description,
                relatedStudentIds: [sid]
            })).filter(t => t.amount > 0);
        }

        const updated = [...newTrans, ...transactions];
        setTransactions(updated);
        saveFundTransactions(updated);
        addLog('FUND', `Đã thu theo đợt cho ${newTrans.length} HS.`);
        resetForm();
        setView('LIST');
    };

    const resetForm = () => {
        setEditingGroupId(null);
        setAmount('');
        setCategory('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setSelectedStudentIds([]);
        setVariableAmounts({});
        setEditBatchAmounts({});
    };

    // --- Report Data Helpers ---
    const allUniqueBatches = useMemo(() => {
        const batches: Record<string, { id: string, name: string, category: string }> = {};
        transactions.filter(t => t.type === 'IN').forEach(t => {
            const key = `${t.category}::${t.description}`;
            if (!batches[key]) batches[key] = { id: key, name: t.description, category: t.category };
        });
        return Object.values(batches);
    }, [transactions]);

    const studentPaymentMatrix = useMemo(() => {
        const matrix: Record<string, Record<string, number>> = {};
        activeStudents.forEach(s => {
            matrix[s.id] = {};
            allUniqueBatches.forEach(b => {
                const total = transactions
                    .filter(t => t.type === 'IN' && `${t.category}::${t.description}` === b.id && t.relatedStudentIds?.includes(s.id))
                    .reduce((sum, t) => sum + t.amount, 0);
                matrix[s.id][b.id] = total;
            });
        });
        return matrix;
    }, [activeStudents, allUniqueBatches, transactions]);

    const handleExportImage = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 3, useCORS: true });
            const link = document.createElement('a');
            link.download = `BaoCao_TaiChinh_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (e) { alert("Lỗi khi tạo ảnh"); }
        setIsExporting(false);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Stats Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 no-print">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-center">
                        <div className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">Số dư hiện tại</div>
                        <div className="text-2xl font-black text-indigo-700">{formatCurrency(balance)}</div>
                    </div>
                    <div className="bg-green-50 p-5 rounded-2xl border border-green-100 flex flex-col justify-center">
                        <div className="text-green-600 text-[10px] font-black uppercase mb-1 tracking-widest">Tổng thu (+)</div>
                        <div className="text-xl font-bold text-green-700">{formatCurrency(transactions.filter(t => t.type === 'IN').reduce((s, t) => s + t.amount, 0))}</div>
                    </div>
                    <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex flex-col justify-center">
                        <div className="text-red-600 text-[10px] font-black uppercase mb-1 tracking-widest">Tổng chi (-)</div>
                        <div className="text-xl font-bold text-red-700">{formatCurrency(transactions.filter(t => t.type === 'OUT').reduce((s, t) => s + t.amount, 0))}</div>
                    </div>
                    <button onClick={() => setView('SUMMARY')} className="bg-indigo-600 p-5 rounded-2xl shadow-lg text-white font-bold flex items-center justify-between hover:bg-indigo-700 transition-all group">
                        <span>Thống kê mục</span>
                        <BarChart3 size={20} className="group-hover:scale-110 transition-transform"/>
                    </button>
                </div>

                {/* Sub Navigation */}
                <div className="flex flex-wrap gap-2 mb-6 border-b pb-4 no-print">
                    <button onClick={() => { setView('LIST'); resetForm(); }} className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${view === 'LIST' ? 'bg-indigo-700 text-white shadow' : 'bg-white text-gray-500 hover:bg-gray-100'}`}><List size={18}/> Nhật ký</button>
                    <button onClick={() => setView('SUMMARY')} className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${view === 'SUMMARY' ? 'bg-indigo-700 text-white shadow' : 'bg-white text-gray-500 hover:bg-gray-100'}`}><BarChart3 size={18}/> Tổng hợp mục</button>
                    <button onClick={() => setView('REPORT')} className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${view === 'REPORT' ? 'bg-indigo-700 text-white shadow' : 'bg-white text-gray-500 hover:bg-gray-100'}`}><FileText size={18}/> Báo cáo nộp</button>
                    
                    <div className="ml-auto flex gap-2">
                        <button onClick={() => { setView('FORM'); setFormType('IN'); resetForm(); }} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-green-700 shadow-sm"><Plus size={18}/> Thu lẻ</button>
                        <button onClick={() => { setView('FORM'); setFormType('OUT'); resetForm(); }} className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-700 shadow-sm"><Minus size={18}/> Chi quỹ</button>
                        <button onClick={() => { setView('BATCH'); setBatchMode('FIXED'); resetForm(); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-sm"><Users size={18}/> Thu theo Đợt</button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-2xl shadow-xl border overflow-hidden min-h-[500px]">
                    {view === 'LIST' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-800 text-white text-xs uppercase tracking-widest">
                                    <tr>
                                        <th className="p-4 w-32">Ngày</th>
                                        <th className="p-4 w-48">Khoản mục</th>
                                        <th className="p-4">Đợt / Diễn giải</th>
                                        <th className="p-4 text-right w-48">Tổng tiền</th>
                                        <th className="p-4 text-center w-24">Sửa/Xóa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm font-medium">
                                    {groupedTransactions.map(group => (
                                        <tr key={group.id} className="hover:bg-indigo-50 transition-colors group">
                                            <td className="p-4 text-gray-400 font-mono">{new Date(group.date).toLocaleDateString('vi-VN')}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${group.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {group.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-700 font-bold">
                                                {group.description}
                                                {group.studentCount > 0 && <span className="ml-2 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-black">{group.studentCount} HS</span>}
                                            </td>
                                            <td className={`p-4 text-right font-black ${group.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                                {group.type === 'IN' ? '+' : '-'}{formatCurrency(group.totalAmount)}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => handleEditGroup(group)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded"><Pencil size={16}/></button>
                                                    <button onClick={() => handleDeleteGroup(group.originalIds)} className="text-red-400 hover:bg-red-100 p-1.5 rounded"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {groupedTransactions.length === 0 && <tr><td colSpan={5} className="p-20 text-center text-gray-300">Chưa có dữ liệu giao dịch.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {view === 'FORM' && (
                        <div className="p-10 max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
                            <h3 className="text-2xl font-black mb-8 text-center text-gray-800">
                                {editingGroupId ? 'Chỉnh sửa đợt thu/chi' : (formType === 'IN' ? 'Ghi nhận Thu tiền' : 'Ghi nhận Chi quỹ')}
                            </h3>
                            
                            <div className="space-y-6 bg-gray-50 p-8 rounded-3xl border border-gray-200">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Khoản mục</label>
                                        <input list="cats" value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border rounded-xl font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="VD: Quỹ lớp..."/>
                                        <datalist id="cats">{existingCategories.map(c => <option key={c} value={c}/>)}</datalist>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Ngày</label>
                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border rounded-xl font-bold text-gray-600 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Đợt / Diễn giải</label>
                                    <input value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border rounded-xl font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="VD: Thu đợt 1..."/>
                                </div>

                                {editingGroupId ? (
                                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                                            <h4 className="font-black text-indigo-700 text-sm uppercase">Danh sách nộp trong đợt</h4>
                                            <div className="text-[10px] font-black text-gray-400 uppercase">Tổng tiền: <span className="text-indigo-600 text-sm">{formatCurrency((Object.values(editBatchAmounts) as number[]).reduce((a: number, b: number) => a + b, 0))}</span></div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                            {transactions.filter(t => editingGroupId && groupedTransactions.find(g => g.id === editingGroupId)?.originalIds.includes(t.id)).map(t => {
                                                const student = students.find(s => t.relatedStudentIds?.includes(s.id));
                                                return (
                                                    <div key={t.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                        <span className="text-sm font-bold text-gray-700">{student?.name || 'Vãng lai'}</span>
                                                        <input 
                                                            type="number" 
                                                            value={editBatchAmounts[t.id] ?? t.amount} 
                                                            onChange={e => setEditBatchAmounts(prev => ({ ...prev, [t.id]: parseInt(e.target.value) || 0 }))}
                                                            className="w-24 text-right border p-1 rounded font-black text-indigo-600 outline-none focus:ring-1 focus:ring-indigo-400"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Số tiền (VNĐ)</label>
                                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 border rounded-xl font-black text-2xl text-indigo-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0"/>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => { setView('LIST'); resetForm(); }} className="flex-1 py-4 bg-white border text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all uppercase text-xs tracking-widest">Hủy bỏ</button>
                                    <button onClick={handleSaveTransaction} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest">Lưu thay đổi</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'BATCH' && (
                        <div className="flex flex-col md:flex-row h-[700px] animate-in fade-in duration-300">
                            {/* Left Panel: Settings */}
                            <div className="w-full md:w-80 bg-gray-50 border-r p-6 flex flex-col shrink-0">
                                <h3 className="font-black text-xl text-indigo-800 mb-6 flex items-center gap-2"><Users size={24}/> Thu tiền đợt</h3>
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Hạng mục</label>
                                        <input list="cats" value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" placeholder="VD: Quỹ lớp..."/>
                                        <datalist id="cats">{existingCategories.map(c => <option key={c} value={c}/>)}</datalist>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Tên đợt thu</label>
                                        <input value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border rounded-xl font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" placeholder="VD: Đợt 1..."/>
                                    </div>
                                    <div className="bg-white p-1 rounded-xl border flex shadow-inner">
                                        <button onClick={() => setBatchMode('FIXED')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${batchMode === 'FIXED' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400'}`}>CỐ ĐỊNH</button>
                                        <button onClick={() => setBatchMode('VARIABLE')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${batchMode === 'VARIABLE' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400'}`}>TỰ NGUYỆN</button>
                                    </div>
                                    {batchMode === 'FIXED' && (
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Số tiền / 1 HS</label>
                                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 border rounded-xl font-black text-green-700 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0"/>
                                        </div>
                                    )}
                                    <div className="bg-indigo-900 p-5 rounded-3xl text-white shadow-2xl ring-4 ring-indigo-100">
                                        <div className="text-[10px] font-black opacity-60 uppercase mb-1 tracking-widest">Dự kiến tổng thu:</div>
                                        <div className="text-3xl font-black text-yellow-400">{formatCurrency(batchMode === 'FIXED' ? (parseInt(amount) || 0) * selectedStudentIds.length : (Object.values(variableAmounts) as string[]).reduce((s: number, v: string) => s + (parseInt(v) || 0), 0))}</div>
                                        <div className="mt-3 text-[10px] font-bold text-indigo-300 uppercase bg-indigo-800/50 px-2 py-1 rounded inline-block">{selectedStudentIds.length} học sinh đang chọn</div>
                                    </div>
                                </div>
                                <button onClick={handleBatchSubmit} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all mt-4 flex items-center justify-center gap-2">Xác nhận Lưu đợt</button>
                            </div>

                            {/* Right Panel: Student Selector */}
                            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                                <div className="p-4 border-b bg-gray-50 flex items-center gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-3 text-gray-400" size={18}/>
                                        <input value={batchSearch} onChange={e => setBatchSearch(e.target.value)} placeholder="Tìm học sinh nhanh..." className="w-full pl-12 pr-4 py-3 border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"/>
                                    </div>
                                    {batchMode === 'FIXED' && (
                                        <button onClick={() => selectedStudentIds.length === activeStudents.length ? setSelectedStudentIds([]) : setSelectedStudentIds(activeStudents.map(s => s.id))} className="text-[10px] font-black bg-white border border-gray-200 px-4 py-3 rounded-xl hover:bg-gray-100 transition-all uppercase tracking-widest shadow-sm">Tất cả</button>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 bg-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
                                    {activeStudents.filter(s => s.name.toLowerCase().includes(batchSearch.toLowerCase())).map(s => {
                                        const isSel = selectedStudentIds.includes(s.id);
                                        return (
                                            <div key={s.id} onClick={() => batchMode === 'FIXED' && setSelectedStudentIds(prev => isSel ? prev.filter(i => i !== s.id) : [...prev, s.id])} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group shadow-sm bg-white ${isSel ? 'border-indigo-600 ring-4 ring-indigo-50 translate-y-[-2px]' : 'border-transparent hover:border-indigo-100'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${isSel ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{s.name.charAt(0)}</div>
                                                    <span className={`text-sm font-bold ${isSel ? 'text-indigo-900' : 'text-gray-600'}`}>{s.name}</span>
                                                </div>
                                                {batchMode === 'VARIABLE' ? (
                                                    <input type="number" placeholder="..." className={`w-20 border-2 p-1.5 text-right text-xs font-black rounded-lg transition-all outline-none ${isSel ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 focus:border-indigo-400'}`} value={variableAmounts[s.id] || ''} onClick={e => e.stopPropagation()} onChange={e => {
                                                        const val = e.target.value;
                                                        setVariableAmounts(prev => ({...prev, [s.id]: val}));
                                                        if (parseInt(val) > 0 && !isSel) setSelectedStudentIds(p => [...p, s.id]);
                                                        else if (!val && isSel) setSelectedStudentIds(p => p.filter(i => i !== s.id));
                                                    }}/>
                                                ) : (
                                                    isSel ? <CheckSquare size={22} className="text-indigo-600"/> : <Square size={22} className="text-gray-200 group-hover:text-indigo-200"/>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'SUMMARY' && (
                        <div className="p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3 border-l-4 border-indigo-600 pl-3">Thống kê Thu - Chi theo Khoản mục</h3>
                            <div className="overflow-hidden rounded-3xl border border-gray-200 shadow-lg">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-5 font-black text-gray-500 uppercase text-[10px] tracking-widest">Tên hạng mục</th>
                                            <th className="p-5 font-black text-green-600 text-right uppercase text-[10px] tracking-widest">Tổng Thu (+)</th>
                                            <th className="p-5 font-black text-red-600 text-right uppercase text-[10px] tracking-widest">Tổng Chi (-)</th>
                                            <th className="p-5 font-black text-indigo-800 text-right uppercase text-[10px] tracking-widest">Số dư mục</th>
                                            <th className="p-5 text-center w-24">Xem chi tiết</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-sm font-bold">
                                        {categoryStats.map(([cat, val]) => (
                                            <tr key={cat} className="hover:bg-indigo-50/30 group transition-colors">
                                                <td className="p-5 text-gray-700">{cat}</td>
                                                <td className="p-5 text-right text-green-600">{formatCurrency(val.in)}</td>
                                                <td className="p-5 text-right text-red-500">{formatCurrency(val.out)}</td>
                                                <td className={`p-5 text-right font-black ${val.in - val.out >= 0 ? 'text-indigo-700' : 'text-orange-500'}`}>{formatCurrency(val.in - val.out)}</td>
                                                <td className="p-5 text-center">
                                                    <button onClick={() => setView('LIST')} className="text-indigo-400 hover:text-indigo-700 transition-colors p-2 hover:bg-white rounded-lg shadow-sm"><Eye size={18}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-indigo-900 text-white font-black text-base">
                                        <tr>
                                            <td className="p-6 uppercase tracking-widest text-xs">Tổng hợp cả lớp</td>
                                            <td className="p-6 text-right text-green-400">{formatCurrency(categoryStats.reduce((s, [_, v]) => s + v.in, 0))}</td>
                                            <td className="p-6 text-right text-red-300">{formatCurrency(categoryStats.reduce((s, [_, v]) => s + v.out, 0))}</td>
                                            <td className="p-6 text-right text-yellow-400 text-xl" colSpan={2}>{formatCurrency(balance)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {view === 'REPORT' && (
                        <div className="flex flex-col h-full bg-white animate-in fade-in duration-500">
                            {/* Filter Sidebar for Report Selection */}
                            <div className="p-6 bg-gray-50 border-b no-print">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2 uppercase tracking-tight"><Filter size={24}/> Tùy chỉnh báo cáo chi tiết</h3>
                                        <p className="text-xs text-gray-500 mt-1 font-bold italic">* Chỉ những khoản được tích chọn mới xuất hiện trong bản in.</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={handleExportImage} disabled={isExporting} className="bg-white border-2 border-indigo-600 text-indigo-600 px-6 py-2.5 rounded-2xl font-black text-xs hover:bg-indigo-50 shadow-sm transition-all flex items-center gap-2 uppercase tracking-widest">{isExporting ? 'Đang tạo ảnh...' : <><ImageIcon size={16}/> Lưu ảnh báo cáo</>}</button>
                                        <button onClick={() => window.print()} className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest flex items-center gap-2"><Printer size={16}/> In báo cáo</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white p-4 rounded-2xl border shadow-inner">
                                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chọn các đợt thu:</h4>
                                            <button onClick={() => setSelectedBatchIdsForReport(allUniqueBatches.map(b => b.id))} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Chọn tất cả</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                                            {allUniqueBatches.map(b => (
                                                <button key={b.id} onClick={() => setSelectedBatchIdsForReport(prev => prev.includes(b.id) ? prev.filter(i => i !== b.id) : [...prev, b.id])} className={`px-3 py-2 rounded-xl text-[10px] font-bold border-2 transition-all flex items-center gap-2 ${selectedBatchIdsForReport.includes(b.id) ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}>
                                                    {selectedBatchIdsForReport.includes(b.id) ? <Check size={12}/> : <div className="w-3 h-3"/>} {b.category} - {b.name}
                                                </button>
                                            ))}
                                            {allUniqueBatches.length === 0 && <div className="text-xs text-gray-400 italic">Chưa có đợt thu nào.</div>}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border shadow-inner">
                                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chọn các hạng mục chi:</h4>
                                            <button onClick={() => setSelectedExpenseCatsForReport(Array.from(new Set(transactions.filter(t => t.type === 'OUT').map(t => t.category))))} className="text-[9px] font-black text-red-600 uppercase hover:underline">Chọn tất cả</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                                            {Array.from(new Set(transactions.filter(t => t.type === 'OUT').map(t => t.category))).map(cat => (
                                                <button key={cat} onClick={() => setSelectedExpenseCatsForReport(prev => prev.includes(cat) ? prev.filter(i => i !== cat) : [...prev, cat])} className={`px-3 py-2 rounded-xl text-[10px] font-bold border-2 transition-all flex items-center gap-2 ${selectedExpenseCatsForReport.includes(cat) ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'}`}>
                                                    {selectedExpenseCatsForReport.includes(cat) ? <Check size={12}/> : <div className="w-3 h-3"/>} {cat}
                                                </button>
                                            ))}
                                            {transactions.filter(t => t.type === 'OUT').length === 0 && <div className="text-xs text-gray-400 italic">Chưa có khoản chi nào.</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Report Document */}
                            <div className="p-8 sm:p-16 bg-gray-200 overflow-x-auto print:bg-white print:p-0">
                                <div ref={reportRef} className="mx-auto border p-16 bg-white shadow-2xl min-w-[1100px] max-w-6xl rounded-sm print:shadow-none print:border-none">
                                    <div className="text-center mb-16 relative">
                                        <h2 className="text-5xl font-black text-gray-900 uppercase tracking-[0.2em] mb-4">SỔ CÔNG KHAI TÀI CHÍNH</h2>
                                        <p className="text-base text-indigo-600 font-black uppercase tracking-[0.4em] mb-2 italic">Lớp học thông minh v4.5</p>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Thời điểm báo cáo: {new Date().toLocaleString('vi-VN')}</p>
                                        <div className="mt-8 w-48 h-2 bg-indigo-600 mx-auto rounded-full"></div>
                                    </div>

                                    <div className="mb-16">
                                        <table className="w-full text-left text-[11px] border-collapse border-4 border-gray-900">
                                            <thead className="bg-gray-900 text-white font-black uppercase">
                                                <tr>
                                                    <th className="p-4 border border-gray-700 text-center w-12">STT</th>
                                                    <th className="p-4 border border-gray-700 min-w-[220px]">Họ tên học sinh</th>
                                                    {allUniqueBatches.filter(b => selectedBatchIdsForReport.includes(b.id)).map(b => (
                                                        <th key={b.id} className="p-4 border border-gray-700 text-right min-w-[130px]">
                                                            <div className="text-[10px] leading-tight">{b.category} - {b.name}</div>
                                                        </th>
                                                    ))}
                                                    <th className="p-4 border border-gray-700 text-right bg-indigo-800 w-36">Tổng nộp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y-2 divide-gray-900">
                                                {activeStudents.sort((a,b) => a.name.localeCompare(b.name)).map((s, idx) => {
                                                    const rowTotal = allUniqueBatches.filter(b => selectedBatchIdsForReport.includes(b.id)).reduce((sum, b) => sum + (studentPaymentMatrix[s.id][b.id] || 0), 0);
                                                    return (
                                                        <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="p-4 border border-gray-300 text-center font-mono text-gray-400 font-bold">{idx + 1}</td>
                                                            <td className="p-4 border border-gray-300 font-black text-gray-800 text-sm">{s.name}</td>
                                                            {allUniqueBatches.filter(b => selectedBatchIdsForReport.includes(b.id)).map(b => {
                                                                const amt = studentPaymentMatrix[s.id][b.id] || 0;
                                                                return (
                                                                    <td key={b.id} className={`p-4 border border-gray-300 text-right font-black ${amt > 0 ? 'text-green-700' : 'text-gray-200 italic'}`}>
                                                                        {amt > 0 ? formatCurrency(amt) : '---'}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="p-4 border border-gray-300 text-right font-black text-indigo-700 bg-indigo-50/50 text-sm">{formatCurrency(rowTotal)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-gray-100 font-black border-t-4 border-gray-900">
                                                <tr className="bg-indigo-50">
                                                    <td colSpan={2} className="p-6 text-right uppercase tracking-widest text-xs font-black">Tổng thu (Các đợt đã chọn):</td>
                                                    {allUniqueBatches.filter(b => selectedBatchIdsForReport.includes(b.id)).map(b => (
                                                        <td key={b.id} className="p-6 text-right text-green-700 text-sm font-black">
                                                            {formatCurrency(transactions.filter(t => t.type === 'IN' && `${t.category}::${t.description}` === b.id).reduce((s, t) => s + t.amount, 0))}
                                                        </td>
                                                    ))}
                                                    <td className="p-6 text-right text-xl text-indigo-900 bg-yellow-400 border-l-4 border-gray-900 font-black shadow-inner">
                                                        {formatCurrency(allUniqueBatches.filter(b => selectedBatchIdsForReport.includes(b.id)).reduce((s, b) => s + transactions.filter(t => t.type === 'IN' && `${t.category}::${t.description}` === b.id).reduce((sum, t) => sum + t.amount, 0), 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {selectedExpenseCatsForReport.length > 0 && (
                                        <div className="mt-20 bg-gray-50 p-12 rounded-3xl border-4 border-gray-900">
                                            <h4 className="font-black text-3xl mb-10 uppercase tracking-[0.3em] border-b-8 border-red-500 inline-block pb-2">Chi tiết các khoản chi đã chọn</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                                <div className="space-y-4">
                                                    {selectedExpenseCatsForReport.map(cat => (
                                                        <div key={cat} className="flex justify-between items-center p-6 bg-white border-2 border-gray-900 rounded-2xl shadow-sm">
                                                            <span className="font-black text-gray-700 uppercase text-xs tracking-wider">{cat}</span>
                                                            <span className="font-black text-red-600 text-lg">-{formatCurrency(transactions.filter(t => t.type === 'OUT' && t.category === cat).reduce((s, t) => s + t.amount, 0))}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="bg-indigo-900 p-12 rounded-3xl text-white flex flex-col justify-center items-center shadow-2xl ring-8 ring-indigo-50 border-4 border-gray-900">
                                                    <div className="text-[10px] font-black opacity-50 uppercase mb-4 tracking-[0.4em]">Tổng chi phí quyết toán</div>
                                                    <div className="text-5xl font-black text-red-400 mb-6">-{formatCurrency(transactions.filter(t => t.type === 'OUT' && selectedExpenseCatsForReport.includes(t.category)).reduce((s, t) => s + t.amount, 0))}</div>
                                                    <div className="w-full h-px bg-white/20 mb-6"></div>
                                                    <div className="text-[10px] font-black opacity-50 uppercase mb-2 tracking-[0.4em]">Tồn quỹ lớp hiện tại</div>
                                                    <div className="text-3xl font-black text-yellow-400">{formatCurrency(balance)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-32 grid grid-cols-2 text-center items-start">
                                        <div className="flex flex-col items-center">
                                            <p className="font-black mb-32 uppercase tracking-[0.3em] text-gray-400 text-xs">Người lập biểu (Thủ quỹ)</p>
                                            <p className="text-gray-900 font-black border-t-4 border-gray-900 pt-5 min-w-[280px] uppercase text-sm">Xác nhận của Thủ quỹ</p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <p className="font-black mb-32 uppercase tracking-[0.3em] text-gray-400 text-xs">Giáo viên chủ nhiệm</p>
                                            <p className="text-gray-900 font-black border-t-4 border-gray-900 pt-5 min-w-[280px] uppercase text-sm">Phê duyệt & Ký tên</p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-24 text-center opacity-30 text-[10px] font-black italic border-t-2 border-gray-100 pt-8 tracking-[0.5em] uppercase">Phần mềm Quản lý Lớp học Thông minh - Bản sao dữ liệu tài chính chính thức</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FundManager;
