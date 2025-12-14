
import React, { useState } from 'react';
import { Student, Settings, BehaviorItem, PendingReport, AttendanceStatus, FundCampaign } from '../../types';
import { Send, Clock, AlertTriangle, Coins, Banknote, Brush, Plus, CheckSquare, Square, Search } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import LaborView from './LaborView';
import { getFundCampaigns, saveFundCampaigns, sendStudentReport } from '../../services/dataService';

interface Props {
    currentUser: Student;
    allStudents: Student[];
    settings: Settings;
    behaviors: BehaviorItem[];
    permissions: Set<string>;
    onLoading: (isLoading: boolean) => void;
    onSubmitted: () => void;
    studentSearch: string;
    setStudentSearch: (s: string) => void;
    filteredTargetStudents: Student[];
    selectedTargetIds: string[];
    setSelectedTargetIds: React.Dispatch<React.SetStateAction<string[]>>;
    handleSelectAllVisible: () => void;
    toggleTargetStudent: (id: string) => void;
}

const ReportScreen: React.FC<Props> = ({ 
    currentUser, allStudents, settings, behaviors, permissions, onLoading, onSubmitted,
    studentSearch, setStudentSearch, filteredTargetStudents, selectedTargetIds, setSelectedTargetIds,
    handleSelectAllVisible, toggleTargetStudent
}) => {
    const [reportType, setReportType] = useState<'ATTENDANCE' | 'VIOLATION' | 'BONUS' | 'FUND' | 'LABOR'>(
        permissions.has('ATTENDANCE') ? 'ATTENDANCE' : permissions.has('FUND') ? 'FUND' : permissions.has('LABOR') ? 'LABOR' : 'BONUS'
    );
    
    // Internal state specific to reporting
    const [attendanceMarks, setAttendanceMarks] = useState<Record<string, AttendanceStatus | null>>({});
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [selectedBehaviorId, setSelectedBehaviorId] = useState('');
    const [bonusAmount, setBonusAmount] = useState(1);
    const [note, setNote] = useState('');

    // Fund State
    const [fundTab, setFundTab] = useState<'COLLECT' | 'CREATE'>('COLLECT');
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [campaigns, setCampaigns] = useState<FundCampaign[]>(getFundCampaigns());
    const [variableAmounts, setVariableAmounts] = useState<Record<string, number>>({});
    const [newCampaignName, setNewCampaignName] = useState('');
    const [newCampaignType, setNewCampaignType] = useState<'FIXED' | 'VARIABLE'>('FIXED');
    const [newCampaignAmount, setNewCampaignAmount] = useState('');

    // Logic for budgets
    const getRoleBudget = () => {
        if (!settings) return { limit: 0, maxPerStudent: 0 };
        const budgets = settings.gamification.roleBudgets || { monitorWeeklyBudget: 50, viceWeeklyBudget: 30, maxRewardPerStudent: 5 };
        if (currentUser.roles?.includes('MONITOR')) return { limit: budgets.monitorWeeklyBudget, maxPerStudent: budgets.maxRewardPerStudent };
        return { limit: budgets.viceWeeklyBudget, maxPerStudent: budgets.maxRewardPerStudent };
    };

    // Attendance Toggle Logic (Fixed: Click again to unselect)
    const toggleAttendanceMark = (id: string, status: AttendanceStatus) => {
        setAttendanceMarks(prev => {
            const current = prev[id];
            // If already selected same status, toggle OFF (remove)
            if (current === status) {
                const next = { ...prev };
                delete next[id];
                return next;
            }
            // Else set/switch to new status
            return { ...prev, [id]: status };
        });
    };

    const handleCreateCampaign = () => {
        if (!newCampaignName) { alert("Nhập tên khoản thu"); return; }
        if (newCampaignType === 'FIXED' && !newCampaignAmount) { alert("Nhập số tiền cố định"); return; }
        
        const newCampaign: FundCampaign = {
            id: `CAMP-${Date.now()}`,
            name: newCampaignName,
            amountType: newCampaignType,
            amountPerStudent: newCampaignType === 'FIXED' ? parseInt(newCampaignAmount) : undefined,
            startDate: new Date().toISOString(),
            isClosed: false
        };
        const updated = [newCampaign, ...campaigns];
        setCampaigns(updated);
        saveFundCampaigns(updated);
        alert("Đã tạo khoản thu mới!");
        setNewCampaignName(''); setNewCampaignAmount(''); setFundTab('COLLECT');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        onLoading(true);
        let promises: Promise<boolean>[] = [];

        const createReport = (target: Student, type: 'ATTENDANCE' | 'VIOLATION' | 'BONUS' | 'FUND', content: string, extra: any = {}): PendingReport => ({
            id: `REP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toISOString(),
            targetDate: selectedDate,
            week: selectedWeek,
            reporterName: currentUser.name,
            roleId: (currentUser.roles || []).join(','),
            targetStudentName: target.name,
            type,
            content,
            note,
            ...extra
        });

        if (reportType === 'ATTENDANCE') {
            const markedIds = Object.keys(attendanceMarks);
            if (markedIds.length === 0) { alert("Chưa chọn học sinh nào!"); onLoading(false); return; }
            promises = markedIds.map(targetId => {
                const target = allStudents.find(n => n.id === targetId);
                const status = attendanceMarks[targetId];
                if (!target || !status) return Promise.resolve(false);
                return sendStudentReport(createReport(target, 'ATTENDANCE', status));
            });
        } 
        else if (reportType === 'BONUS') {
            if (selectedTargetIds.length === 0) { alert("Chưa chọn học sinh!"); onLoading(false); return; }
            const budget = getRoleBudget();
            // Simplify budget check for this snippet
            if (bonusAmount > budget.maxPerStudent) { alert(`Vượt quá giới hạn! Tối đa ${budget.maxPerStudent} xu.`); onLoading(false); return; }
            promises = selectedTargetIds.map(targetId => {
                const target = allStudents.find(n => n.id === targetId);
                if (!target) return Promise.resolve(false);
                return sendStudentReport(createReport(target, 'BONUS', `Thưởng nóng (+${bonusAmount} xu)`, { rewardAmount: bonusAmount }));
            });
        }
        else if (reportType === 'FUND') {
            if (selectedTargetIds.length === 0) { alert("Chưa chọn học sinh!"); onLoading(false); return; }
            const campaign = campaigns.find(c => c.id === selectedCampaignId);
            if (!campaign) { alert("Vui lòng chọn khoản thu!"); onLoading(false); return; }

            promises = selectedTargetIds.map(targetId => {
                const target = allStudents.find(n => n.id === targetId);
                if (!target) return Promise.resolve(false);
                let amount = 0;
                if (campaign.amountType === 'FIXED') amount = campaign.amountPerStudent || 0;
                else amount = variableAmounts[targetId] || 0;
                if (amount <= 0) return Promise.resolve(false);
                return sendStudentReport(createReport(target, 'FUND', `Đã thu ${formatCurrency(amount)} (${campaign.name})`, { fundAmount: amount }));
            });
        }
        else if (reportType === 'VIOLATION') {
            if (selectedTargetIds.length === 0) { alert("Chưa chọn học sinh!"); onLoading(false); return; }
            if (!selectedBehaviorId) { alert("Chưa chọn lỗi!"); onLoading(false); return; }
            const behavior = behaviors.find(b => b.id === selectedBehaviorId);
            const content = behavior ? behavior.label : 'Lỗi';
            promises = selectedTargetIds.map(targetId => {
                const target = allStudents.find(n => n.id === targetId);
                if (!target) return Promise.resolve(false);
                return sendStudentReport(createReport(target, 'VIOLATION', content));
            });
        }

        await Promise.all(promises);
        onLoading(false);
        onSubmitted();
        // Reset local selection state
        setSelectedTargetIds([]);
        setAttendanceMarks({});
        setNote('');
        setSelectedBehaviorId('');
        setBonusAmount(1);
        setVariableAmounts({});
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Tab Selector */}
            <div className="p-2 border-b bg-gray-50 shrink-0">
                 <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                     {permissions.has('ATTENDANCE') && <button type="button" onClick={() => setReportType('ATTENDANCE')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'ATTENDANCE' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-500 border'}`}><Clock size={14}/> Điểm Danh</button>}
                     {permissions.has('VIOLATION') && <button type="button" onClick={() => setReportType('VIOLATION')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'VIOLATION' ? 'bg-red-600 text-white shadow' : 'bg-white text-gray-500 border'}`}><AlertTriangle size={14}/> Vi Phạm</button>}
                     {permissions.has('BONUS') && <button type="button" onClick={() => setReportType('BONUS')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'BONUS' ? 'bg-yellow-500 text-white shadow' : 'bg-white text-gray-500 border'}`}><Coins size={14}/> Thưởng</button>}
                     {permissions.has('FUND') && <button type="button" onClick={() => setReportType('FUND')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'FUND' ? 'bg-green-600 text-white shadow' : 'bg-white text-gray-500 border'}`}><Banknote size={14}/> Thu Quỹ</button>}
                     {permissions.has('LABOR') && <button type="button" onClick={() => setReportType('LABOR')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'LABOR' ? 'bg-indigo-600 text-white shadow' : 'bg-white text-gray-500 border'}`}><Brush size={14}/> Lao Động</button>}
                 </div>
            </div>

            {/* Content Area */}
            {reportType === 'LABOR' ? (
                <LaborView 
                    students={allStudents} 
                    currentUser={currentUser} 
                    onLoading={onLoading}
                    filteredStudents={filteredTargetStudents}
                    studentSearch={studentSearch}
                    setStudentSearch={setStudentSearch}
                    selectedDate={selectedDate}
                    selectedWeek={selectedWeek}
                />
            ) : reportType === 'FUND' && fundTab === 'CREATE' ? (
                <div className="p-4 bg-gray-50 h-full">
                    <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
                        <h3 className="font-bold text-gray-800">Tạo khoản thu mới</h3>
                        <div>
                            <label className="text-xs font-bold text-gray-500">Tên khoản thu</label>
                            <input className="w-full border p-2 rounded" placeholder="VD: Kế hoạch nhỏ đợt 1" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)}/>
                        </div>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={newCampaignType === 'FIXED'} onChange={() => setNewCampaignType('FIXED')}/> Cố định</label>
                            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={newCampaignType === 'VARIABLE'} onChange={() => setNewCampaignType('VARIABLE')}/> Tùy chọn (Nhập tay)</label>
                        </div>
                        {newCampaignType === 'FIXED' && (
                            <div>
                                <label className="text-xs font-bold text-gray-500">Số tiền mỗi bạn</label>
                                <input type="number" className="w-full border p-2 rounded font-bold text-green-700" placeholder="VD: 20000" value={newCampaignAmount} onChange={e => setNewCampaignAmount(e.target.value)}/>
                            </div>
                        )}
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setFundTab('COLLECT')} className="flex-1 py-2 border rounded text-gray-600">Hủy</button>
                            <button type="button" onClick={handleCreateCampaign} className="flex-1 py-2 bg-green-600 text-white rounded font-bold shadow">Tạo mới</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {reportType === 'FUND' && (
                        <div className="p-2 border-b bg-gray-50 flex gap-2">
                            <select value={selectedCampaignId} onChange={e => setSelectedCampaignId(e.target.value)} className="flex-1 border p-1.5 rounded text-sm outline-none">
                                <option value="">-- Chọn khoản thu --</option>
                                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="button" onClick={() => setFundTab('CREATE')} className="bg-green-100 text-green-700 px-3 py-1.5 rounded font-bold text-xs whitespace-nowrap"><Plus size={14}/></button>
                        </div>
                    )}

                    <div className="p-2 border-b flex items-center gap-2 shrink-0">
                        <Search size={16} className="text-gray-400"/>
                        <input className="flex-1 outline-none text-base" placeholder="Tìm tên học sinh..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                        {reportType !== 'ATTENDANCE' && <button type="button" onClick={handleSelectAllVisible} className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded font-bold">Chọn hết</button>}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
                        {reportType === 'ATTENDANCE' && (
                            <div className="mb-2 flex justify-center bg-blue-50 p-1 rounded border border-blue-100">
                                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent text-blue-800 font-bold outline-none text-sm"/>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-2 pb-20"> 
                            {filteredTargetStudents.map(s => {
                                if (reportType === 'ATTENDANCE') {
                                    const status = attendanceMarks[s.id];
                                    return (
                                        <div key={s.id} className="p-3 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white shadow-sm">
                                            <span className="font-medium text-base text-gray-800">{s.name}</span>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => toggleAttendanceMark(s.id, AttendanceStatus.LATE)} className={`flex-1 text-xs px-2 py-2 rounded border font-medium transition-all active:scale-95 ${status === AttendanceStatus.LATE ? 'bg-yellow-100 border-yellow-300 text-yellow-800 ring-1 ring-yellow-300 shadow-inner' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Đi trễ</button>
                                                <button type="button" onClick={() => toggleAttendanceMark(s.id, AttendanceStatus.UNEXCUSED)} className={`flex-1 text-xs px-2 py-2 rounded border font-medium transition-all active:scale-95 ${status === AttendanceStatus.UNEXCUSED ? 'bg-red-100 border-red-300 text-red-800 ring-1 ring-red-300 shadow-inner' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Vắng KP</button>
                                                <button type="button" onClick={() => toggleAttendanceMark(s.id, AttendanceStatus.EXCUSED)} className={`flex-1 text-xs px-2 py-2 rounded border font-medium transition-all active:scale-95 ${status === AttendanceStatus.EXCUSED ? 'bg-blue-100 border-blue-300 text-blue-800 ring-1 ring-blue-300 shadow-inner' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Vắng CP</button>
                                            </div>
                                        </div>
                                    )
                                } else {
                                    const isSel = selectedTargetIds.includes(s.id);
                                    const isFund = reportType === 'FUND';
                                    const currentCampaign = campaigns.find(c => c.id === selectedCampaignId);
                                    const isVariable = isFund && currentCampaign?.amountType === 'VARIABLE';

                                    let activeClass = 'bg-white border-gray-200';
                                    if (isSel) {
                                        if (reportType === 'BONUS') activeClass = 'bg-yellow-50 border-yellow-400 ring-1 ring-yellow-400 shadow-md';
                                        else if (isFund) activeClass = 'bg-green-50 border-green-400 ring-1 ring-green-400 shadow-md';
                                        else activeClass = 'bg-red-50 border-red-400 ring-1 ring-red-400 shadow-md';
                                    }

                                    return (
                                        <div key={s.id} onClick={() => !isVariable && toggleTargetStudent(s.id)} className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${activeClass}`}>
                                            <div className="flex items-center gap-2">
                                                {isVariable && (
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSel} 
                                                        onChange={() => toggleTargetStudent(s.id)} 
                                                        className="w-5 h-5 rounded accent-green-600"
                                                    />
                                                )}
                                                <span className={`font-medium text-base ${isSel ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>{s.name}</span>
                                            </div>
                                            
                                            {isVariable ? (
                                                <input 
                                                    type="number" 
                                                    placeholder="Số tiền..." 
                                                    className="w-24 border p-1 rounded text-right font-bold text-green-700 outline-none"
                                                    onClick={(e) => e.stopPropagation()}
                                                    value={variableAmounts[s.id] || ''}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        setVariableAmounts(prev => ({...prev, [s.id]: val}));
                                                        if (val > 0 && !selectedTargetIds.includes(s.id)) toggleTargetStudent(s.id);
                                                    }}
                                                />
                                            ) : (
                                                isSel ? <CheckSquare size={24} className={reportType === 'BONUS' ? 'text-yellow-600' : isFund ? 'text-green-600' : 'text-red-600'}/> : <Square size={24} className="text-gray-300"/>
                                            )}
                                        </div>
                                    )
                                }
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Input */}
            {reportType !== 'LABOR' && !(reportType === 'FUND' && fundTab === 'CREATE') && (
                <div className="p-3 border-t bg-gray-50 shrink-0 space-y-2 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    {reportType === 'VIOLATION' && (
                        <select value={selectedBehaviorId} onChange={e => setSelectedBehaviorId(e.target.value)} className="w-full border p-2.5 rounded-lg text-base bg-white font-medium text-red-600 shadow-sm focus:ring-2 focus:ring-red-500 outline-none">
                            <option value="">-- Chọn lỗi vi phạm --</option>
                            {behaviors.map(b => <option key={b.id} value={b.id}>{b.label} ({b.points}đ)</option>)}
                        </select>
                    )}
                    
                    {reportType === 'BONUS' && (
                        <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200 text-sm">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-yellow-800">Số xu thưởng:</span>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setBonusAmount(Math.max(1, bonusAmount - 1))} className="w-8 h-8 bg-white border rounded font-bold text-lg flex items-center justify-center text-gray-600 shadow-sm">-</button>
                                    <span className="font-bold text-lg w-6 text-center">{bonusAmount}</span>
                                    <button type="button" onClick={() => setBonusAmount(Math.min(getRoleBudget().maxPerStudent, bonusAmount + 1))} className="w-8 h-8 bg-white border rounded font-bold text-lg flex items-center justify-center text-gray-600 shadow-sm">+</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {reportType === 'FUND' && fundTab === 'COLLECT' ? (
                         <button type="submit" disabled={selectedTargetIds.length === 0} className="w-full py-3 rounded-lg font-bold text-white shadow-md bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2">
                             <Banknote size={20}/> Xác nhận Thu
                         </button>
                    ) : (
                        <div className="flex gap-2">
                            <input type="text" placeholder="Ghi chú..." value={note} onChange={e => setNote(e.target.value)} className="flex-1 border p-2 rounded-lg text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                            <button type="submit" className={`px-4 py-2 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${reportType === 'BONUS' ? 'bg-yellow-500' : 'bg-orange-600'}`}>
                                <Send size={20}/>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </form>
    );
};

export default ReportScreen;
