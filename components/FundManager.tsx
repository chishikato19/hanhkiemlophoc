
import React, { useState, useEffect, useMemo } from 'react';
import { FundTransaction, Student } from '../types';
import { getFundTransactions, saveFundTransactions, getStudents } from '../services/dataService';
import { TrendingUp, TrendingDown, Plus, Minus, Trash2, Search, CheckSquare, Square, Banknote, History, Wallet, User, Users } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { addLog } from '../utils/logger';

const FundManager: React.FC = () => {
    const [transactions, setTransactions] = useState<FundTransaction[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [view, setView] = useState<'LIST' | 'FORM' | 'BATCH'>('LIST');
    
    // Form State
    const [formType, setFormType] = useState<'IN' | 'OUT'>('IN');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    
    // Batch State
    const [batchSearch, setBatchSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    useEffect(() => {
        setTransactions(getFundTransactions());
        setStudents(getStudents());
    }, []);

    const balance = useMemo(() => {
        return transactions.reduce((acc, curr) => {
            return curr.type === 'IN' ? acc + curr.amount : acc - curr.amount;
        }, 0);
    }, [transactions]);

    const income = useMemo(() => transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0), [transactions]);
    const expense = useMemo(() => transactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0), [transactions]);

    const activeStudents = useMemo(() => students.filter(s => s.isActive !== false), [students]);
    const filteredBatchStudents = useMemo(() => activeStudents.filter(s => s.name.toLowerCase().includes(batchSearch.toLowerCase())), [activeStudents, batchSearch]);

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
        if (!amount || !category || selectedStudentIds.length === 0) { alert("Vui lòng nhập đủ thông tin và chọn học sinh."); return; }
        const numAmount = parseInt(amount.replace(/\D/g, ''));
        if (isNaN(numAmount) || numAmount <= 0) { alert("Số tiền không hợp lệ."); return; }

        // Create individual transactions for each student for better tracking
        const newTransactions: FundTransaction[] = selectedStudentIds.map(sid => {
            const s = students.find(st => st.id === sid);
            return {
                id: `FT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                date: new Date().toISOString(),
                type: 'IN', // Batch is usually for collection
                amount: numAmount,
                category,
                description: `${description} - ${s?.name}`,
                relatedStudentIds: [sid]
            };
        });

        const updated = [...newTransactions, ...transactions];
        setTransactions(updated);
        saveFundTransactions(updated);
        addLog('FUND', `Đã thu tiền theo danh sách (${selectedStudentIds.length} HS). Tổng: ${formatCurrency(numAmount * selectedStudentIds.length)}`);
        
        resetForm();
        setView('LIST');
    };

    const resetForm = () => {
        setAmount('');
        setCategory('');
        setDescription('');
        setSelectedStudentIds([]);
    };

    const toggleStudent = (id: string) => {
        setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAll = () => {
        if (selectedStudentIds.length === filteredBatchStudents.length) setSelectedStudentIds([]);
        else setSelectedStudentIds(filteredBatchStudents.map(s => s.id));
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-5xl mx-auto">
                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Banknote/> Sổ Quỹ Lớp</h2>
                    <div className="flex gap-2">
                        {view === 'LIST' ? (
                            <>
                                <button onClick={() => { setView('FORM'); setFormType('IN'); }} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 shadow-sm"><Plus size={18}/> Thu Tiền</button>
                                <button onClick={() => { setView('FORM'); setFormType('OUT'); }} className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 shadow-sm"><Minus size={18}/> Chi Tiền</button>
                                <button onClick={() => { setView('BATCH'); setFormType('IN'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm"><Users size={18}/> Thu Theo Danh Sách</button>
                            </>
                        ) : (
                            <button onClick={() => { setView('LIST'); resetForm(); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300">Hủy bỏ</button>
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
                                        <th className="p-4">Danh mục</th>
                                        <th className="p-4">Diễn giải</th>
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
                            <h3 className="text-lg font-bold mb-6 text-center">{formType === 'IN' ? 'Tạo Phiếu Thu' : 'Tạo Phiếu Chi'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ)</label>
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg" placeholder="VD: 50000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                                    <input list="categories" value={category} onChange={e => setCategory(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="VD: Quỹ lớp, Photo..." />
                                    <datalist id="categories">
                                        <option value="Quỹ lớp" />
                                        <option value="Photo tài liệu" />
                                        <option value="Liên hoan" />
                                        <option value="Nước uống" />
                                        <option value="Mua đồ dùng" />
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
                        <div className="flex flex-col md:flex-row h-[600px]">
                            {/* Left: Form */}
                            <div className="w-full md:w-1/3 bg-gray-50 p-6 border-r flex flex-col">
                                <h3 className="text-lg font-bold mb-4 text-indigo-800">Thu theo danh sách</h3>
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Số tiền / 1 HS</label>
                                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border p-2 rounded font-bold text-green-700" placeholder="VD: 10000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Khoản thu</label>
                                        <input value={category} onChange={e => setCategory(e.target.value)} className="w-full border p-2 rounded" placeholder="VD: Tiền ghế nhựa" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Ghi chú thêm</label>
                                        <input value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded" placeholder="Đợt 1..." />
                                    </div>
                                    <div className="bg-indigo-100 p-3 rounded text-sm text-indigo-800">
                                        Đang chọn: <strong>{selectedStudentIds.length}</strong> học sinh.<br/>
                                        Tổng thu dự kiến: <strong>{formatCurrency((parseInt(amount)||0) * selectedStudentIds.length)}</strong>
                                    </div>
                                </div>
                                <button onClick={handleBatchSubmit} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow mt-4">
                                    Xác nhận Thu
                                </button>
                            </div>

                            {/* Right: Student Selector */}
                            <div className="flex-1 flex flex-col">
                                <div className="p-3 border-b flex items-center gap-2">
                                    <Search className="text-gray-400" size={18}/>
                                    <input value={batchSearch} onChange={e => setBatchSearch(e.target.value)} placeholder="Tìm tên học sinh..." className="flex-1 outline-none text-sm"/>
                                    <button onClick={selectAll} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded font-medium">Chọn tất cả</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 content-start">
                                    {filteredBatchStudents.map(s => (
                                        <div key={s.id} onClick={() => toggleStudent(s.id)} className={`p-3 rounded border cursor-pointer flex items-center justify-between select-none hover:shadow-sm ${selectedStudentIds.includes(s.id) ? 'bg-green-50 border-green-300' : 'bg-white'}`}>
                                            <span className={`text-sm ${selectedStudentIds.includes(s.id) ? 'font-bold text-green-800' : 'text-gray-700'}`}>{s.name}</span>
                                            {selectedStudentIds.includes(s.id) ? <CheckSquare size={18} className="text-green-600"/> : <Square size={18} className="text-gray-300"/>}
                                        </div>
                                    ))}
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
