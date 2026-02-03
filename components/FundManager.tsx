import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FundTransaction, Student } from '../types';
import { getFundTransactions, saveFundTransactions, getStudents } from '../services/dataService';
import { TrendingUp, TrendingDown, Plus, Minus, Trash2, Search, CheckSquare, Square, Banknote, Wallet, Users, HeartHandshake, FileText, Printer, ChevronRight, LayoutGrid, List, History, Tag, Calculator } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { addLog } from '../utils/logger';

// Use global html2canvas
declare const html2canvas: any;

const FundManager: React.FC = () => {
    const [transactions, setTransactions] = useState<FundTransaction[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [view, setView] = useState<'LIST' | 'FORM' | 'BATCH' | 'REPORT'>('LIST');
    
    // Form State
    const [formType, setFormType] = useState<'IN' | 'OUT'>('IN');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    
    // Batch Collection State
    const [batchMode, setBatchMode] = useState<'FIXED' | 'VARIABLE'>('FIXED');
    const [batchSearch, setBatchSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [variableAmounts, setVariableAmounts] = useState<Record<string, string>>({});

    // Report Selection State
    const [selectedIncomeBatchIds, setSelectedIncomeBatchIds] = useState<string[]>([]);
    const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<string[]>([]);
    const [reportMode, setReportMode] = useState<'LOG' | 'STUDENT_GRID'>('STUDENT_GRID');
    
    const reportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        setTransactions(getFundTransactions());
        setStudents(getStudents());
    }, []);

    const activeStudents = useMemo(() => students.filter(s => s.isActive !== false), [students]);

    const balance = useMemo(() => {
        return transactions.reduce((acc, curr) => {
            return curr.type === 'IN' ? acc + curr.amount : acc - curr.amount;
        }, 0);
    }, [transactions]);

    const income = useMemo(() => transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0), [transactions]);
    const expense = useMemo(() => transactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0), [transactions]);

    const existingCategories = useMemo(() => {
        const cats = transactions.map(t => t.category);
        return Array.from(new Set(cats)).sort();
    }, [transactions]);

    const filteredBatchStudents = useMemo(() => activeStudents.filter(s => s.name.toLowerCase().includes(batchSearch.toLowerCase())), [activeStudents, batchSearch]);

    const totalBatchAmount = useMemo(() => {
        if (batchMode === 'FIXED') {
            return (parseInt(amount) || 0) * selectedStudentIds.length;
        } else {
            return selectedStudentIds.reduce((sum, id) => sum + (parseInt(variableAmounts[id]) || 0), 0);
        }
    }, [batchMode, amount, selectedStudentIds, variableAmounts]);

    // --- Report Calculations ---
    
    // Get all unique income batches (Category + Description combo)
    const incomeBatches = useMemo(() => {
        const batches: Record<string, { category: string, batchName: string, id: string, total: number }> = {};
        transactions.filter(t => t.type === 'IN').forEach(t => {
            const bName = t.description || 'Chung';
            const id = `${t.category}::${bName}`;
            if (!batches[id]) {
                batches[id] = { category: t.category, batchName: bName, id, total: 0 };
            }
            batches[id].total += t.amount;
        });
        return Object.values(batches).sort((a, b) => a.category.localeCompare(b.category));
    }, [transactions]);

    // Get unique expense categories
    const expenseCategories = useMemo(() => {
        const cats: Record<string, { name: string, total: number }> = {};
        transactions.filter(t => t.type === 'OUT').forEach(t => {
            if (!cats[t.category]) {
                cats[t.category] = { name: t.category, total: 0 };
            }
            cats[t.category].total += t.amount;
        });
        return Object.values(cats).sort((a, b) => a.name.localeCompare(b.name));
    }, [transactions]);

    const selectedIncomesData = useMemo(() => {
        return incomeBatches.filter(b => selectedIncomeBatchIds.includes(b.id));
    }, [incomeBatches, selectedIncomeBatchIds]);

    const selectedExpensesData = useMemo(() => {
        return expenseCategories.filter(e => selectedExpenseCategories.includes(e.name));
    }, [expenseCategories, selectedExpenseCategories]);

    const reportTotalIn = useMemo(() => selectedIncomesData.reduce((s, b) => s + b.total, 0), [selectedIncomesData]);
    const reportTotalOut = useMemo(() => selectedExpensesData.reduce((s, e) => s + e.total, 0), [selectedExpensesData]);

    const studentPaymentMatrix = useMemo(() => {
        const matrix: Record<string, Record<string, number>> = {};
        activeStudents.forEach(s => {
            matrix[s.id] = {};
            selectedIncomesData.forEach(col => {
                const total = transactions
                    .filter(t => 
                        t.type === 'IN' && 
                        t.category === col.category && 
                        (t.description || 'Chung') === col.batchName &&
                        t.relatedStudentIds?.includes(s.id)
                    )
                    .reduce((sum, t) => sum + t.amount, 0);
                matrix[s.id][col.id] = total;
            });
        });
        return matrix;
    }, [activeStudents, selectedIncomesData, transactions]);

    // Grouped Transactions for LOG mode
    const groupedReportTransactions = useMemo(() => {
        const filtered = transactions.filter(t => 
            (t.type === 'IN' && selectedIncomeBatchIds.includes(`${t.category}::${t.description || 'Chung'}`)) ||
            (t.type === 'OUT' && selectedExpenseCategories.includes(t.category))
        );

        const groups: Record<string, { 
            id: string, 
            date: string, 
            type: 'IN' | 'OUT', 
            category: string, 
            description: string, 
            amount: number, 
            count: number 
        }> = {};

        filtered.forEach(t => {
            // Group key: Type + Category + Description
            const key = `${t.type}_${t.category}_${t.description || 'Chung'}`;
            if (!groups[key]) {
                groups[key] = {
                    id: t.id,
                    date: t.date,
                    type: t.type,
                    category: t.category,
                    description: t.description || 'Chung',
                    amount: 0,
                    count: 0
                };
            }
            groups[key].amount += t.amount;
            // Count students if it's a student-linked transaction
            if (t.relatedStudentIds && t.relatedStudentIds.length > 0) {
                groups[key].count += t.relatedStudentIds.length;
            } else if (t.type === 'IN') {
                groups[key].count += 1;
            }
            // Use the most recent date for the group
            if (new Date(t.date) > new Date(groups[key].date)) {
                groups[key].date = t.date;
            }
        });

        return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, selectedIncomeBatchIds, selectedExpenseCategories]);

    const handleDelete = (id: string) => {
        if (!window.confirm("Xóa giao dịch này?")) return;
        const newTrans = transactions.filter(t => t.id !== id);
        setTransactions(newTrans);
        saveFundTransactions(newTrans);
        addLog('FUND', 'Đã xóa giao dịch quỹ.');
    };

    const handleSaveTransaction = () => {
        if (!amount || !category) { alert("Vui lòng nhập đủ thông tin."); return; }
        const numAmount = parseInt(amount.replace(/\D/g, ''));
        if (isNaN(numAmount) || numAmount <= 0) { alert("Số tiền không hợp lệ."); return; }

        const newTrans: FundTransaction = {
            id: `FT-${Date.now()}`,
            date: new Date().toISOString(),
            type: formType,
            amount: numAmount,
            category,
            description,
            relatedStudentIds: []
        };

        const updated = [newTrans, ...transactions];
        setTransactions(updated);
        saveFundTransactions(updated);
        addLog('FUND', `Đã tạo phiếu ${formType === 'IN' ? 'Thu' : 'Chi'}: ${formatCurrency(numAmount)}`);
        
        resetForm();
        setView('LIST');
    };

    const handleBatchSubmit = () => {
        if (!category) { alert("Vui lòng nhập khoản thu."); return; }
        if (!description) { alert("Vui lòng nhập tên đợt thu (ví dụ: Đợt 1, Tháng 9...)"); return; }
        if (selectedStudentIds.length === 0) { alert("Vui lòng chọn ít nhất 1 học sinh."); return; }

        let newBatchTransactions: FundTransaction[] = [];

        if (batchMode === 'FIXED') {
            const fixedAmt = parseInt(amount);
            if (isNaN(fixedAmt) || fixedAmt <= 0) { alert("Số tiền cố định không hợp lệ."); return; }
            
            newBatchTransactions = selectedStudentIds.map(sid => {
                return {
                    id: `FT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    date: new Date().toISOString(),
                    type: 'IN',
                    amount: fixedAmt,
                    category,
                    description: description,
                    relatedStudentIds: [sid]
                };
            });
        } else {
            const validSelections = selectedStudentIds.filter(id => (parseInt(variableAmounts[id]) || 0) > 0);
            if (validSelections.length === 0) { alert("Vui lòng nhập số tiền cho ít nhất 1 học sinh."); return; }

            newBatchTransactions = validSelections.map(sid => {
                const amt = parseInt(variableAmounts[sid]);
                return {
                    id: `FT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    date: new Date().toISOString(),
                    type: 'IN',
                    amount: amt,
                    category,
                    description: description,
                    relatedStudentIds: [sid]
                };
            });
        }

        const updated = [...newBatchTransactions, ...transactions];
        setTransactions(updated);
        saveFundTransactions(updated);
        addLog('FUND', `Đã thu tiền hàng loạt (${newBatchTransactions.length} HS). Tổng: ${formatCurrency(totalBatchAmount)}`);
        
        resetForm();
        setView('LIST');
    };

    const resetForm = () => {
        setAmount('');
        setCategory('');
        setDescription('');
        setSelectedStudentIds([]);
        setVariableAmounts({});
    };

    const toggleStudent = (id: string) => {
        setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleVariableAmountChange = (id: string, val: string) => {
        setVariableAmounts(prev => ({ ...prev, [id]: val }));
        const num = parseInt(val) || 0;
        if (num > 0 && !selectedStudentIds.includes(id)) {
            setSelectedStudentIds(prev => [...prev, id]);
        } else if (num <= 0 && selectedStudentIds.includes(id)) {
            setSelectedStudentIds(prev => prev.filter(p => p !== id));
        }
    };

    const selectAll = () => {
        if (selectedStudentIds.length === filteredBatchStudents.length) setSelectedStudentIds([]);
        else setSelectedStudentIds(filteredBatchStudents.map(s => s.id));
    };

    const toggleIncomeBatch = (id: string) => {
        setSelectedIncomeBatchIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleExpenseCategory = (name: string) => {
        setSelectedExpenseCategories(prev => prev.includes(name) ? prev.filter(e => e !== name) : [...prev, name]);
    };

    const handlePrintReport = () => {
        window.print();
    };

    const handleExportImage = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(reportRef.current, { 
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const link = document.createElement('a');
            link.download = `BaoCao_ThuChi_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            alert("Lỗi khi xuất ảnh.");
        }
        setIsExporting(false);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 no-print">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-gray-500 mb-2"><Wallet /> Tổng Quỹ Hiện Tại</div>
                        <div className="text-3xl font-bold text-indigo-700">{formatCurrency(balance)}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-gray-500 mb-2"><TrendingUp className="text-green-500"/> Tổng Thu</div>
                        <div className="text-2xl font-bold text-green-600">+{formatCurrency(income)}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-gray-500 mb-2"><TrendingDown className="text-red-500"/> Tổng Chi</div>
                        <div className="text-2xl font-bold text-red-600">-{formatCurrency(expense)}</div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-between items-center mb-6 no-print">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Banknote/> Sổ Quỹ Lớp</h2>
                    <div className="flex flex-wrap gap-2">
                        {view === 'LIST' ? (
                            <>
                                <button onClick={() => { setView('FORM'); setFormType('IN'); }} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 shadow-sm"><Plus size={18}/> Thu Lẻ</button>
                                <button onClick={() => { setView('FORM'); setFormType('OUT'); }} className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 shadow-sm"><Minus size={18}/> Chi Quỹ</button>
                                <button onClick={() => { setView('BATCH'); setBatchMode('FIXED'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm"><Users size={18}/> Thu Theo DS (Đợt)</button>
                                <button onClick={() => { setView('REPORT'); }} className="bg-white border-2 border-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 flex items-center gap-2 shadow-sm"><FileText size={18}/> Báo Cáo Tổng Hợp</button>
                            </>
                        ) : (
                            <button onClick={() => { setView('LIST'); resetForm(); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300">Quay lại</button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    {view === 'LIST' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 text-gray-600 text-sm">
                                    <tr>
                                        <th className="p-4">Ngày</th>
                                        <th className="p-4">Khoản mục</th>
                                        <th className="p-4">Đợt/Diễn giải</th>
                                        <th className="p-4 text-right">Số tiền</th>
                                        <th className="p-4 text-center">Xóa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {transactions.map(t => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="p-4 text-sm text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-gray-700">{t.description}</td>
                                            <td className={`p-4 text-right font-bold ${t.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                                {t.type === 'IN' ? '+' : '-'}{formatCurrency(t.amount)}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Chưa có giao dịch nào.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {view === 'FORM' && (
                        <div className="p-8 max-w-lg mx-auto">
                            <h3 className="text-lg font-bold mb-6 text-center">{formType === 'IN' ? 'Thu Tiền Lẻ' : 'Tạo Phiếu Chi'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ)</label>
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg" placeholder="VD: 50000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Khoản mục</label>
                                    <input list="categories" value={category} onChange={e => setCategory(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Chọn hoặc nhập mới..." />
                                    <datalist id="categories">
                                        {existingCategories.map(c => <option key={c} value={c} />)}
                                        <option value="Quỹ lớp" />
                                        <option value="Photo tài liệu" />
                                        <option value="Liên hoan" />
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Diễn giải</label>
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none h-24" placeholder="Chi tiết giao dịch..." />
                                </div>
                                <button onClick={handleSaveTransaction} className={`w-full py-3 rounded-lg text-white font-bold shadow ${formType === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    Lưu Phiếu {formType === 'IN' ? 'Thu' : 'Chi'}
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'BATCH' && (
                        <div className="flex flex-col md:flex-row h-[700px]">
                            <div className="w-full md:w-80 bg-gray-50 p-6 border-r flex flex-col">
                                <h3 className="text-lg font-bold mb-4 text-indigo-800">Thu theo đợt / Lớp</h3>
                                
                                <div className="bg-white p-1 rounded-lg border flex mb-4">
                                    <button 
                                        onClick={() => setBatchMode('FIXED')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${batchMode === 'FIXED' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        <Users size={14}/> Cố định
                                    </button>
                                    <button 
                                        onClick={() => setBatchMode('VARIABLE')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${batchMode === 'VARIABLE' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        <HeartHandshake size={14}/> Tự nguyện
                                    </button>
                                </div>

                                <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">Tên khoản thu (Khoản mục)</label>
                                        <input list="categories" value={category} onChange={e => setCategory(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-bold" placeholder="VD: Quỹ lớp" />
                                        <datalist id="categories">
                                            {existingCategories.map(c => <option key={c} value={c} />)}
                                        </datalist>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider flex items-center gap-1"><Tag size={10}/> Tên Đợt Thu (Tạo cột báo cáo)</label>
                                        <input value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-700 font-bold" placeholder="VD: Đợt 1, Tháng 10..." />
                                        <p className="text-[9px] text-gray-400 mt-1 italic">* Mỗi đợt thu khác nhau sẽ có cột riêng trong báo cáo.</p>
                                    </div>

                                    {batchMode === 'FIXED' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">Số tiền / 1 HS</label>
                                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border p-2 rounded font-bold text-green-700 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="VD: 50000" />
                                        </div>
                                    )}

                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Đang chọn:</span>
                                            <span className="font-bold text-indigo-700">{selectedStudentIds.length} học sinh</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-indigo-200">
                                            <span className="text-sm font-bold text-gray-700">Tổng thu:</span>
                                            <span className="text-xl font-black text-green-600">{formatCurrency(totalBatchAmount)}</span>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleBatchSubmit} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg mt-4 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    <Banknote size={20}/> Xác nhận Thu Hàng Loạt
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col bg-white">
                                <div className="p-4 border-b flex items-center gap-4 bg-gray-50">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                        <input value={batchSearch} onChange={e => setBatchSearch(e.target.value)} placeholder="Tìm tên học sinh..." className="w-full pl-10 pr-4 py-2 border rounded-full text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                                    </div>
                                    {batchMode === 'FIXED' && (
                                        <button onClick={selectAll} className="text-xs bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-full font-bold shadow-sm transition-all whitespace-nowrap">
                                            {selectedStudentIds.length === filteredBatchStudents.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 content-start pb-20">
                                        {filteredBatchStudents.map(s => {
                                            const isSelected = selectedStudentIds.includes(s.id);
                                            return (
                                                <div 
                                                    key={s.id} 
                                                    onClick={() => batchMode === 'FIXED' && toggleStudent(s.id)} 
                                                    className={`p-3 rounded-xl border transition-all select-none flex items-center justify-between group 
                                                    ${isSelected ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200 shadow-sm' : 'bg-white border-gray-200 hover:border-indigo-200'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                            {s.avatarUrl || s.name.charAt(0)}
                                                        </div>
                                                        <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900 font-bold' : 'text-gray-700'}`}>{s.name}</span>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {batchMode === 'VARIABLE' ? (
                                                            <div className="flex items-center gap-2">
                                                                <input 
                                                                    type="number" 
                                                                    placeholder="Số tiền..." 
                                                                    className={`w-28 border rounded-lg p-1.5 text-right text-sm font-bold outline-none focus:ring-2 focus:ring-green-500 ${isSelected ? 'bg-white border-green-300 text-green-700' : 'bg-gray-50 border-gray-200'}`}
                                                                    value={variableAmounts[s.id] || ''}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => handleVariableAmountChange(s.id, e.target.value)}
                                                                />
                                                                <span className="text-[10px] font-bold text-gray-400">VNĐ</span>
                                                            </div>
                                                        ) : (
                                                            isSelected ? <CheckSquare size={24} className="text-indigo-600 fill-indigo-50"/> : <Square size={24} className="text-gray-300 group-hover:text-indigo-300"/>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'REPORT' && (
                        <div className="flex flex-col h-full bg-white print:p-0">
                            {/* Configuration Panel */}
                            <div className="p-6 bg-gray-50 border-b no-print">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2"><Calculator size={20}/> Cấu hình báo cáo tổng hợp</h3>
                                    <div className="bg-white p-1 rounded-lg border flex gap-1 shadow-sm">
                                        <button 
                                            onClick={() => setReportMode('STUDENT_GRID')}
                                            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${reportMode === 'STUDENT_GRID' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            <LayoutGrid size={14}/> Theo học sinh
                                        </button>
                                        <button 
                                            onClick={() => setReportMode('LOG')}
                                            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${reportMode === 'LOG' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            <List size={14}/> Theo giao dịch
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Select Incomes */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14} className="text-green-500"/> Chọn các đợt thu</h4>
                                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                                            {incomeBatches.map(batch => (
                                                <button 
                                                    key={batch.id} 
                                                    onClick={() => toggleIncomeBatch(batch.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all flex items-center gap-2 
                                                    ${selectedIncomeBatchIds.includes(batch.id) ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'}`}
                                                >
                                                    {selectedIncomeBatchIds.includes(batch.id) ? <CheckSquare size={14}/> : <Square size={14}/>}
                                                    <div className="text-left">
                                                        <div className="opacity-70 text-[8px] leading-none">{batch.category}</div>
                                                        <div>{batch.batchName}</div>
                                                    </div>
                                                </button>
                                            ))}
                                            {incomeBatches.length === 0 && <p className="text-gray-400 italic text-xs">Chưa có dữ liệu thu.</p>}
                                        </div>
                                    </div>

                                    {/* Select Expenses */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><TrendingDown size={14} className="text-red-500"/> Chọn các khoản chi</h4>
                                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                                            {expenseCategories.map(cat => (
                                                <button 
                                                    key={cat.name} 
                                                    onClick={() => toggleExpenseCategory(cat.name)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all flex items-center gap-2 
                                                    ${selectedExpenseCategories.includes(cat.name) ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}
                                                >
                                                    {selectedExpenseCategories.includes(cat.name) ? <CheckSquare size={14}/> : <Square size={14}/>}
                                                    {cat.name}
                                                </button>
                                            ))}
                                            {expenseCategories.length === 0 && <p className="text-gray-400 italic text-xs">Chưa có dữ liệu chi.</p>}
                                        </div>
                                    </div>
                                </div>

                                {(selectedIncomeBatchIds.length > 0 || selectedExpenseCategories.length > 0) && (
                                    <div className="mt-8 flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-inner">
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
                                            <div className="text-sm">
                                                <span className="text-gray-500">Tổng thu:</span>
                                                <span className="ml-2 font-black text-green-600">{formatCurrency(reportTotalIn)}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-500">Tổng chi:</span>
                                                <span className="ml-2 font-black text-red-600">{formatCurrency(reportTotalOut)}</span>
                                            </div>
                                            <div className="h-6 w-px bg-indigo-200 hidden sm:block"></div>
                                            <div className="text-lg font-bold text-gray-800">Còn lại: <span className={`text-2xl font-black ml-1 ${reportTotalIn - reportTotalOut >= 0 ? 'text-indigo-700' : 'text-orange-600'}`}>{formatCurrency(reportTotalIn - reportTotalOut)}</span></div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleExportImage} disabled={isExporting} className="bg-white border-2 border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-50 shadow-sm transition-all">
                                                {isExporting ? '...' : <><History size={18}/> Xuất ảnh</>}
                                            </button>
                                            <button onClick={handlePrintReport} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg transition-all"><Printer size={18}/> In PDF</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Report Layout Container */}
                            <div className="flex-1 p-4 sm:p-10 bg-gray-100 overflow-x-auto">
                                {(selectedIncomeBatchIds.length > 0 || selectedExpenseCategories.length > 0) ? (
                                    <div ref={reportRef} className="mx-auto border p-10 bg-white shadow-2xl print:border-0 print:shadow-none min-w-[800px] max-w-7xl">
                                        <div className="text-center mb-10">
                                            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-[0.15em] mb-2">Báo Cáo Tổng Hợp Tài Chính Lớp</h2>
                                            <p className="text-sm text-gray-500 font-medium italic">Ngày lập: {new Date().toLocaleDateString('vi-VN')} - Theo dõi chi tiết thu chi</p>
                                            <div className="mt-4 w-32 h-1.5 bg-indigo-600 mx-auto rounded-full"></div>
                                        </div>

                                        {/* Financial Summary Box */}
                                        <div className="grid grid-cols-3 gap-4 mb-8">
                                            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                                <div className="text-[10px] font-black text-green-600 uppercase mb-1">Tổng Thu (Đã chọn)</div>
                                                <div className="text-xl font-black text-green-700">{formatCurrency(reportTotalIn)}</div>
                                            </div>
                                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                                <div className="text-[10px] font-black text-red-600 uppercase mb-1">Tổng Chi (Đã chọn)</div>
                                                <div className="text-xl font-black text-red-700">{formatCurrency(reportTotalOut)}</div>
                                            </div>
                                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                                <div className="text-[10px] font-black text-indigo-600 uppercase mb-1">Dư Báo Cáo</div>
                                                <div className="text-xl font-black text-indigo-700">{formatCurrency(reportTotalIn - reportTotalOut)}</div>
                                            </div>
                                        </div>

                                        {reportMode === 'STUDENT_GRID' ? (
                                            <div className="space-y-10">
                                                {/* GRID SECTION */}
                                                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                                                    <table className="w-full text-left text-[11px] border-collapse">
                                                        <thead className="bg-gray-800 text-white font-bold uppercase tracking-wider">
                                                            <tr>
                                                                <th className="p-3 border-r border-gray-700 w-10 text-center sticky left-0 bg-gray-800 z-10">STT</th>
                                                                <th className="p-3 border-r border-gray-700 min-w-[140px] sticky left-10 bg-gray-800 z-10">Học sinh</th>
                                                                {selectedIncomesData.map(col => (
                                                                    <th key={col.id} className="p-3 border-r border-gray-700 text-right min-w-[100px]">
                                                                        <div className="text-[8px] opacity-60 font-normal">{col.category}</div>
                                                                        <div>{col.batchName}</div>
                                                                    </th>
                                                                ))}
                                                                <th className="p-3 text-right bg-indigo-900 sticky right-0 z-10">Cộng nộp</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {activeStudents.sort((a,b) => a.name.localeCompare(b.name)).map((s, idx) => {
                                                                // Fix: Explicitly type reduce parameters and handle potential undefined matrix entries to avoid unknown types
                                                                const matrixEntry = studentPaymentMatrix[s.id] || {};
                                                                const studentTotal = Object.values(matrixEntry).reduce((sum: number, val: number) => sum + val, 0);
                                                                return (
                                                                    <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                        <td className="p-3 border-r text-center text-gray-400 font-mono sticky left-0 bg-inherit">{idx + 1}</td>
                                                                        <td className="p-3 border-r font-bold text-gray-700 sticky left-10 bg-inherit">{s.name}</td>
                                                                        {selectedIncomesData.map(col => {
                                                                            // Fix: Added safety check for nested lookup
                                                                            const payment = studentPaymentMatrix[s.id]?.[col.id] || 0;
                                                                            return (
                                                                                <td key={col.id} className={`p-3 border-r text-right font-medium ${payment > 0 ? 'text-green-600' : 'text-gray-300 italic'}`}>
                                                                                    {payment > 0 ? formatCurrency(payment) : '-'}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                        <td className="p-3 text-right font-black text-indigo-700 bg-indigo-50 bg-opacity-30 sticky right-0 bg-inherit">
                                                                            {formatCurrency(studentTotal)}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                        <tfoot className="bg-gray-100 font-black border-t-2 border-gray-800">
                                                            <tr>
                                                                <td colSpan={2} className="p-3 border-r text-right uppercase tracking-wider sticky left-0 bg-gray-100 z-10">Tổng đợt thu:</td>
                                                                {selectedIncomesData.map(col => (
                                                                    <td key={col.id} className="p-3 border-r text-right text-green-700">
                                                                        {formatCurrency(col.total)}
                                                                    </td>
                                                                ))}
                                                                <td className="p-3 text-right text-[14px] text-green-700 bg-green-50 sticky right-0 z-10">
                                                                    {formatCurrency(reportTotalIn)}
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>

                                                {/* EXPENSES SUMMARY SECTION */}
                                                {selectedExpensesData.length > 0 && (
                                                    <div className="space-y-4">
                                                        <h4 className="font-black text-gray-800 uppercase tracking-[0.2em] border-b-2 border-red-100 pb-2 flex items-center gap-2">
                                                            <TrendingDown size={20} className="text-red-500"/> Chi tiết các khoản chi đã chọn
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {selectedExpensesData.map(exp => (
                                                                <div key={exp.name} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                                                    <span className="font-bold text-gray-700">{exp.name}</span>
                                                                    <span className="font-black text-red-600">{formatCurrency(exp.total)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="p-4 bg-gray-900 rounded-xl text-white flex justify-between items-center shadow-lg">
                                                            <span className="font-bold uppercase tracking-widest text-xs opacity-60">Tổng cộng chi:</span>
                                                            <span className="text-2xl font-black text-red-400">{formatCurrency(reportTotalOut)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Transaction Log Mode - Grouped Table */
                                            <div className="space-y-8">
                                                <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                                                    <table className="w-full text-left text-sm border-collapse">
                                                        <thead className="bg-gray-800 text-white font-bold uppercase tracking-wider text-[10px]">
                                                            <tr>
                                                                <th className="p-3 w-32">Ngày cuối</th>
                                                                <th className="p-3 w-20">Loại</th>
                                                                <th className="p-3">Khoản mục / Đợt thu</th>
                                                                <th className="p-3 text-right">Tổng số tiền</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {groupedReportTransactions.map((t, idx) => (
                                                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="p-3 text-gray-500 font-mono text-xs">{new Date(t.date).toLocaleDateString('vi-VN')}</td>
                                                                    <td className="p-3">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                            {t.type === 'IN' ? 'Thu' : 'Chi'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <div className="font-bold text-gray-800">{t.category}</div>
                                                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                                                            <span className="italic">{t.description}</span>
                                                                            {t.type === 'IN' && t.count > 0 && (
                                                                                <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px] font-black border border-indigo-100 uppercase tracking-tighter">
                                                                                    {t.count} HS đã đóng
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className={`p-3 text-right font-black text-base ${t.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {t.type === 'IN' ? '+' : '-'}{formatCurrency(t.amount)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot className="bg-gray-100 font-black border-t-2 border-gray-800">
                                                            <tr>
                                                                <td colSpan={3} className="p-3 text-right uppercase tracking-wider">Hiệu số Thu - Chi:</td>
                                                                <td className={`p-3 text-right text-xl ${reportTotalIn - reportTotalOut >= 0 ? 'text-indigo-700' : 'text-orange-600'}`}>
                                                                    {formatCurrency(reportTotalIn - reportTotalOut)}
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                                <p className="text-[10px] text-gray-400 italic">* Các giao dịch cùng đợt được hệ thống tự động gộp chung để báo cáo gọn gàng hơn.</p>
                                            </div>
                                        )}

                                        <div className="mt-16 grid grid-cols-2 text-center text-sm">
                                            <div className="flex flex-col items-center">
                                                <p className="font-bold mb-20 uppercase tracking-widest text-gray-400">Thủ Quỹ</p>
                                                <p className="text-gray-800 font-black border-t border-gray-300 pt-2 min-w-[200px]">Xác nhận</p>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <p className="font-bold mb-20 uppercase tracking-widest text-gray-400">Giáo Viên Chủ Nhiệm</p>
                                                <p className="text-gray-800 font-black border-t border-gray-300 pt-2 min-w-[200px]">Xác nhận</p>
                                            </div>
                                        </div>

                                        <div className="mt-12 pt-6 border-t border-gray-100 flex justify-between items-center opacity-40 text-[10px] font-bold text-gray-400 italic">
                                            <span>Mã định danh lớp: {students[0]?.id.split('-')[0] || 'CLASS-ID'}</span>
                                            <span>Phần mềm Quản lý Lớp học Thông minh v4.3 - Sổ Quỹ Chuyên Nghiệp</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-xl border-4 border-dashed border-gray-200">
                                        <FileText size={80} className="mb-4 text-gray-200"/>
                                        <p className="font-bold text-gray-400 text-xl">Vui lòng chọn các khoản thu hoặc chi để hiển thị báo cáo.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FundManager;
