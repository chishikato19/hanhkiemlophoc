
import React, { useState, useEffect } from 'react';
import { fetchStudentNamesOnly, sendStudentReport, fetchBehaviorList, fetchRolesFromCloud, fetchSettings, getPendingReports } from '../services/dataService';
import { Send, CheckCircle, AlertTriangle, Clock, UserCheck, Search, CheckSquare, Square, Shield, Lock, ArrowLeft, LogOut, Coins, Award, Banknote } from 'lucide-react';
import { PendingReport, AttendanceStatus, BehaviorItem, StudentRole, Settings, RoleBudgetConfig } from '../types';

interface SimpleStudent { id: string; name: string; }

const StudentPortal: React.FC = () => {
    // Data State
    const [names, setNames] = useState<SimpleStudent[]>([]);
    const [behaviors, setBehaviors] = useState<BehaviorItem[]>([]);
    const [roles, setRoles] = useState<StudentRole[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [allPendingReports, setAllPendingReports] = useState<PendingReport[]>([]);
    const [loading, setLoading] = useState(true);

    // Flow State
    const [view, setView] = useState<'ROLE_SELECT' | 'AUTH' | 'USER_SELECT' | 'DASHBOARD' | 'SUCCESS'>('ROLE_SELECT');
    const [selectedRole, setSelectedRole] = useState<StudentRole | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [currentUser, setCurrentUser] = useState<SimpleStudent | null>(null);
    const [submitted, setSubmitted] = useState(false);

    // Dashboard State
    const [reportType, setReportType] = useState<'ATTENDANCE' | 'VIOLATION' | 'BONUS' | 'FUND'>('ATTENDANCE');
    const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
    const [attendanceMarks, setAttendanceMarks] = useState<Record<string, AttendanceStatus | null>>({});
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedBehaviorId, setSelectedBehaviorId] = useState('');
    const [bonusAmount, setBonusAmount] = useState(1);
    const [fundAmount, setFundAmount] = useState<string>('');
    const [note, setNote] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const [nameData, behaviorData, roleData, settingsData] = await Promise.all([
                fetchStudentNamesOnly(),
                fetchBehaviorList(),
                fetchRolesFromCloud(),
                fetchSettings()
            ]);
            setNames(nameData);
            setBehaviors(behaviorData);
            setRoles(roleData || []);
            setSettings(settingsData);
            setAllPendingReports(getPendingReports()); 
            setLoading(false);
        };
        loadData();
    }, []);

    const resetSelection = () => {
        setSelectedTargetIds([]);
        setAttendanceMarks({});
        setNote('');
        setSelectedBehaviorId('');
        setBonusAmount(1);
        setFundAmount('');
    };

    const getRoleBudget = (): { limit: number, maxPerStudent: number } => {
        if (!settings || !selectedRole) return { limit: 0, maxPerStudent: 0 };
        const budgets = settings.gamification.roleBudgets || { monitorWeeklyBudget: 50, viceWeeklyBudget: 30, maxRewardPerStudent: 5 };
        if (selectedRole.name.toLowerCase().includes('trưởng')) {
            return { limit: budgets.monitorWeeklyBudget, maxPerStudent: budgets.maxRewardPerStudent };
        }
        return { limit: budgets.viceWeeklyBudget, maxPerStudent: budgets.maxRewardPerStudent };
    };

    const getUsedBudget = (): number => {
        if (!currentUser) return 0;
        return allPendingReports
            .filter(r => r.reporterName === currentUser.name && r.week === selectedWeek && r.type === 'BONUS' && r.status !== 'REJECTED')
            .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);
    };

    const handleRoleSelect = (role: StudentRole) => {
        setSelectedRole(role);
        setPasswordInput('');
        setView('AUTH');
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedRole && passwordInput === selectedRole.password) {
            if (selectedRole.assignedStudentIds.length === 1) {
                const s = names.find(n => n.id === selectedRole.assignedStudentIds[0]);
                if (s) {
                    setCurrentUser(s);
                    if (selectedRole.permissions.includes('ATTENDANCE')) setReportType('ATTENDANCE');
                    else if (selectedRole.permissions.includes('FUND')) setReportType('FUND');
                    else if (selectedRole.permissions.includes('BONUS')) setReportType('BONUS');
                    else setReportType('VIOLATION');
                    setView('DASHBOARD');
                } else {
                    setView('USER_SELECT');
                }
            } else {
                setView('USER_SELECT');
            }
        } else {
            alert("Mật khẩu không đúng!");
        }
    };

    const handleUserSelect = (studentId: string) => {
        const s = names.find(n => n.id === studentId);
        if (s && selectedRole) {
            setCurrentUser(s);
            if (selectedRole.permissions.includes('ATTENDANCE')) setReportType('ATTENDANCE');
            else if (selectedRole.permissions.includes('FUND')) setReportType('FUND');
            else if (selectedRole.permissions.includes('BONUS')) setReportType('BONUS');
            else setReportType('VIOLATION');
            setView('DASHBOARD');
        }
    };

    const handleLogout = () => {
        setSelectedRole(null);
        setCurrentUser(null);
        resetSelection();
        setView('ROLE_SELECT');
    };

    const filteredStudents = names.filter(n => n.name.toLowerCase().includes(studentSearch.toLowerCase()));

    const toggleTargetStudent = (id: string) => {
        if (selectedTargetIds.includes(id)) {
            setSelectedTargetIds(selectedTargetIds.filter(tid => tid !== id));
        } else {
            setSelectedTargetIds([...selectedTargetIds, id]);
        }
    };

    const handleSelectAllVisible = () => {
        const allVisibleSelected = filteredStudents.every(s => selectedTargetIds.includes(s.id));
        if (allVisibleSelected) {
            const visibleIds = filteredStudents.map(s => s.id);
            setSelectedTargetIds(selectedTargetIds.filter(id => !visibleIds.includes(id)));
        } else {
            const newIds = [...selectedTargetIds];
            filteredStudents.forEach(s => { if (!newIds.includes(s.id)) newIds.push(s.id); });
            setSelectedTargetIds(newIds);
        }
    };

    const setStudentAttendance = (id: string, status: AttendanceStatus) => {
        setAttendanceMarks(prev => {
            const current = prev[id];
            if (current === status) { const next = { ...prev }; delete next[id]; return next; }
            return { ...prev, [id]: status };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !selectedRole) return;
        
        setLoading(true);
        let promises: Promise<boolean>[] = [];

        if (reportType === 'ATTENDANCE') {
            const markedIds = Object.keys(attendanceMarks);
            if (markedIds.length === 0) { alert("Chưa chọn học sinh nào!"); setLoading(false); return; }
            promises = markedIds.map(targetId => {
                const target = names.find(n => n.id === targetId);
                const status = attendanceMarks[targetId];
                if (!target || !status) return Promise.resolve(false);
                const report: PendingReport = {
                    id: `REP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    timestamp: new Date().toISOString(),
                    targetDate: selectedDate,
                    week: selectedWeek,
                    reporterName: currentUser.name,
                    roleId: selectedRole.id,
                    targetStudentName: target.name,
                    type: 'ATTENDANCE',
                    content: status,
                    note: note
                };
                return sendStudentReport(report);
            });
        } 
        else if (reportType === 'BONUS') {
            if (selectedTargetIds.length === 0) { alert("Chưa chọn học sinh!"); setLoading(false); return; }
            
            const budget = getRoleBudget();
            const used = getUsedBudget();
            const totalRequested = selectedTargetIds.length * bonusAmount;

            if (bonusAmount > budget.maxPerStudent) {
                alert(`Vượt quá giới hạn! Bạn chỉ được thưởng tối đa ${budget.maxPerStudent} xu mỗi bạn.`);
                setLoading(false);
                return;
            }
            if (used + totalRequested > budget.limit) {
                alert(`Không đủ ngân sách tuần! Còn lại: ${budget.limit - used} xu.`);
                setLoading(false);
                return;
            }

            promises = selectedTargetIds.map(targetId => {
                const target = names.find(n => n.id === targetId);
                if (!target) return Promise.resolve(false);
                const report: PendingReport = {
                    id: `REP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    timestamp: new Date().toISOString(),
                    targetDate: selectedDate,
                    week: selectedWeek,
                    reporterName: currentUser.name,
                    roleId: selectedRole.id,
                    targetStudentName: target.name,
                    type: 'BONUS',
                    content: `Thưởng nóng (+${bonusAmount} xu)`,
                    note: note,
                    rewardAmount: bonusAmount
                };
                return sendStudentReport(report);
            });
        }
        else if (reportType === 'FUND') {
            if (selectedTargetIds.length === 0) { alert("Chưa chọn học sinh!"); setLoading(false); return; }
            const amount = parseInt(fundAmount.replace(/\D/g, ''));
            if (!amount || amount <= 0) { alert("Số tiền không hợp lệ!"); setLoading(false); return; }
            if (!note) { alert("Vui lòng ghi rõ khoản thu (VD: Tiền nước, Tiền Photo)"); setLoading(false); return; }

            promises = selectedTargetIds.map(targetId => {
                const target = names.find(n => n.id === targetId);
                if (!target) return Promise.resolve(false);
                const report: PendingReport = {
                    id: `REP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    timestamp: new Date().toISOString(),
                    targetDate: selectedDate,
                    week: selectedWeek,
                    reporterName: currentUser.name,
                    roleId: selectedRole.id,
                    targetStudentName: target.name,
                    type: 'FUND',
                    content: `Đã thu ${new Intl.NumberFormat('vi-VN').format(amount)}đ`,
                    note: note, 
                    fundAmount: amount
                };
                return sendStudentReport(report);
            });
        }
        else {
            if (selectedTargetIds.length === 0) { alert("Chưa chọn học sinh!"); setLoading(false); return; }
            if (!selectedBehaviorId) { alert("Chưa chọn lỗi!"); setLoading(false); return; }
            const behavior = behaviors.find(b => b.id === selectedBehaviorId);
            const content = behavior ? behavior.label : 'Lỗi';
            promises = selectedTargetIds.map(targetId => {
                const target = names.find(n => n.id === targetId);
                if (!target) return Promise.resolve(false);
                const report: PendingReport = {
                    id: `REP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    timestamp: new Date().toISOString(),
                    targetDate: selectedDate,
                    week: selectedWeek,
                    reporterName: currentUser.name,
                    roleId: selectedRole.id,
                    targetStudentName: target.name,
                    type: 'VIOLATION',
                    content: content,
                    note: note
                };
                return sendStudentReport(report);
            });
        }

        await Promise.all(promises);
        
        setAllPendingReports(getPendingReports());
        
        setLoading(false);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            resetSelection();
        }, 3000);
    };

    if (loading && names.length === 0) return <div className="min-h-screen flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>;

    if (submitted) return (
        <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4 text-center">
            <CheckCircle size={64} className="text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-700">Gửi báo cáo thành công!</h2>
            <button onClick={() => setSubmitted(false)} className="mt-8 bg-white border border-green-200 text-green-700 px-6 py-2 rounded-full font-medium hover:bg-green-100">Tiếp tục báo cáo</button>
        </div>
    );

    // 1. Role Selection
    if (view === 'ROLE_SELECT') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4 flex items-center justify-center">
                <div className="w-full max-w-2xl">
                    <div className="text-center mb-8">
                        <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                            <Shield size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Cổng Thông Tin Lớp Học</h1>
                        <p className="text-gray-600">Chọn vai trò của bạn để bắt đầu</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles.length === 0 && <div className="col-span-2 text-center text-gray-400 bg-white p-6 rounded-xl">Chưa có vai trò nào được cấu hình.</div>}
                        {roles.map(role => (
                            <button 
                                key={role.id}
                                onClick={() => handleRoleSelect(role)}
                                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md hover:border-orange-500 border-2 border-transparent transition-all text-left group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-orange-600">{role.name}</h3>
                                    <ArrowLeft size={20} className="text-gray-300 rotate-180 group-hover:text-orange-500 transform transition-transform group-hover:translate-x-1"/>
                                </div>
                                <div className="text-sm text-gray-500">
                                    Quyền hạn: {role.permissions.map(p => p === 'ATTENDANCE' ? 'Điểm danh' : p === 'VIOLATION' ? 'Báo lỗi' : p === 'BONUS' ? 'Thưởng xu' : 'Thu quỹ').join(', ')}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 2. Authentication
    if (view === 'AUTH') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                    <button onClick={() => setView('ROLE_SELECT')} className="mb-4 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"><ArrowLeft size={14}/> Quay lại</button>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Đăng nhập: {selectedRole?.name}</h2>
                    <p className="text-sm text-gray-500 mb-6">Nhập mật khẩu dành cho vai trò này</p>
                    <form onSubmit={handleLogin}>
                        <div className="relative mb-4">
                            <Lock className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                            <input 
                                type="password" 
                                autoFocus
                                className="w-full border p-2 pl-10 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-base" 
                                placeholder="Mật khẩu..."
                                value={passwordInput}
                                onChange={e => setPasswordInput(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700 shadow-lg">Tiếp tục</button>
                    </form>
                </div>
            </div>
        );
    }

    // 3. User Selection
    if (view === 'USER_SELECT') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Bạn là ai?</h2>
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                        {selectedRole?.assignedStudentIds.map(sid => {
                            const s = names.find(n => n.id === sid);
                            if (!s) return null;
                            return (
                                <button key={s.id} onClick={() => handleUserSelect(s.id)} className="p-3 border rounded-lg hover:bg-orange-50 hover:border-orange-300 font-medium text-gray-700 text-left">
                                    {s.name}
                                </button>
                            );
                        })}
                    </div>
                     <button onClick={() => setView('ROLE_SELECT')} className="mt-6 text-gray-400 text-sm underline">Quay lại chọn vai trò</button>
                </div>
            </div>
        );
    }

    // 4. Dashboard (Reporting Form)
    const budget = getRoleBudget();
    const usedBudget = getUsedBudget();
    const remainingBudget = budget.limit - usedBudget;

    return (
        <div className="bg-gray-50 flex flex-col font-sans h-[100dvh]">
             {/* Header */}
             <div className="bg-orange-600 text-white p-3 shadow-md shrink-0 z-20 flex justify-between items-center">
                <div>
                    <h1 className="font-bold text-base flex items-center gap-2"><Shield size={18}/> {selectedRole?.name}</h1>
                    <div className="text-[10px] text-orange-100 opacity-90">Người báo: {currentUser?.name}</div>
                </div>
                <button onClick={handleLogout} className="bg-white bg-opacity-20 p-2 rounded-full hover:bg-opacity-30"><LogOut size={16}/></button>
             </div>

             <div className="flex-1 max-w-3xl mx-auto w-full p-2 sm:p-4 flex flex-col min-h-0">
                 <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg flex flex-col h-full overflow-hidden border">
                    {/* Controls */}
                    <div className="p-3 border-b bg-gray-50 shrink-0 space-y-2">
                         <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                             {selectedRole?.permissions.includes('ATTENDANCE') && (
                                 <button type="button" onClick={() => setReportType('ATTENDANCE')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'ATTENDANCE' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-500 border'}`}>
                                     <Clock size={14}/> Điểm Danh
                                 </button>
                             )}
                             {selectedRole?.permissions.includes('VIOLATION') && (
                                 <button type="button" onClick={() => setReportType('VIOLATION')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'VIOLATION' ? 'bg-red-600 text-white shadow' : 'bg-white text-gray-500 border'}`}>
                                     <AlertTriangle size={14}/> Vi Phạm
                                 </button>
                             )}
                             {selectedRole?.permissions.includes('BONUS') && (
                                 <button type="button" onClick={() => setReportType('BONUS')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'BONUS' ? 'bg-yellow-500 text-white shadow' : 'bg-white text-gray-500 border'}`}>
                                     <Coins size={14}/> Thưởng Xu
                                 </button>
                             )}
                             {selectedRole?.permissions.includes('FUND') && (
                                 <button type="button" onClick={() => setReportType('FUND')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'FUND' ? 'bg-green-600 text-white shadow' : 'bg-white text-gray-500 border'}`}>
                                     <Banknote size={14}/> Thu Quỹ
                                 </button>
                             )}
                         </div>
                         <div className="flex gap-2">
                             <div className="flex-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Tuần</label>
                                <select value={selectedWeek} onChange={(e) => setSelectedWeek(parseInt(e.target.value))} className="w-full border p-1.5 rounded text-sm font-medium bg-white text-base"><option value={1}>Tuần 1</option>{Array.from({length:34}).map((_,i)=><option key={i+2} value={i+2}>Tuần {i+2}</option>)}</select>
                             </div>
                             <div className="flex-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Ngày</label>
                                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full border p-1.5 rounded text-sm font-medium bg-white text-base"/>
                             </div>
                         </div>
                    </div>

                    {/* Student List */}
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <div className="p-2 border-b flex items-center gap-2 shrink-0">
                            <Search size={16} className="text-gray-400"/>
                            <input className="flex-1 outline-none text-base" placeholder="Tìm tên..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                            {reportType !== 'ATTENDANCE' && <button type="button" onClick={handleSelectAllVisible} className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded font-bold">Chọn hết</button>}
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
                            <div className="grid grid-cols-1 gap-2 pb-20"> {/* Added padding bottom to ensure last item visible over keyboard if needed */}
                                {filteredStudents.map(s => {
                                    if (reportType === 'ATTENDANCE') {
                                        const status = attendanceMarks[s.id];
                                        return (
                                            <div key={s.id} className="p-3 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white shadow-sm">
                                                <span className="font-medium text-base text-gray-800">{s.name}</span>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => setStudentAttendance(s.id, AttendanceStatus.LATE)} className={`flex-1 text-xs px-3 py-2 rounded border font-medium ${status === AttendanceStatus.LATE ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-gray-50'}`}>Trễ</button>
                                                    <button type="button" onClick={() => setStudentAttendance(s.id, AttendanceStatus.UNEXCUSED)} className={`flex-1 text-xs px-3 py-2 rounded border font-medium ${status === AttendanceStatus.UNEXCUSED ? 'bg-red-100 border-red-300 text-red-800' : 'bg-gray-50'}`}>KP</button>
                                                    <button type="button" onClick={() => setStudentAttendance(s.id, AttendanceStatus.EXCUSED)} className={`flex-1 text-xs px-3 py-2 rounded border font-medium ${status === AttendanceStatus.EXCUSED ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50'}`}>CP</button>
                                                </div>
                                            </div>
                                        )
                                    } else {
                                        const isSel = selectedTargetIds.includes(s.id);
                                        const isBonus = reportType === 'BONUS';
                                        const isFund = reportType === 'FUND';
                                        
                                        let activeClass = 'bg-white border-gray-200';
                                        if (isSel) {
                                            if (isBonus) activeClass = 'bg-yellow-50 border-yellow-400 ring-1 ring-yellow-400 shadow-md';
                                            else if (isFund) activeClass = 'bg-green-50 border-green-400 ring-1 ring-green-400 shadow-md';
                                            else activeClass = 'bg-red-50 border-red-400 ring-1 ring-red-400 shadow-md';
                                        }

                                        return (
                                            <div key={s.id} onClick={() => toggleTargetStudent(s.id)} className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${activeClass}`}>
                                                <span className={`font-medium text-base ${isSel ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>{s.name}</span>
                                                {isSel ? <CheckSquare size={24} className={isBonus ? 'text-yellow-600' : isFund ? 'text-green-600' : 'text-red-600'}/> : <Square size={24} className="text-gray-300"/>}
                                            </div>
                                        )
                                    }
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer Input */}
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
                                         <button type="button" onClick={() => setBonusAmount(Math.min(budget.maxPerStudent, bonusAmount + 1))} className="w-8 h-8 bg-white border rounded font-bold text-lg flex items-center justify-center text-gray-600 shadow-sm">+</button>
                                     </div>
                                 </div>
                                 <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                     <div className="bg-yellow-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (usedBudget / budget.limit) * 100)}%` }}></div>
                                 </div>
                                 <div className="text-[10px] text-gray-500 mt-1 text-right">Còn lại: {remainingBudget} xu</div>
                             </div>
                         )}

                         {reportType === 'FUND' && (
                             <div className="bg-green-50 p-2 rounded border border-green-200">
                                 <div className="flex items-center gap-2">
                                     <span className="text-xs font-bold text-green-800 shrink-0">Số tiền:</span>
                                     <input 
                                        type="tel" 
                                        value={fundAmount} 
                                        onChange={e => setFundAmount(e.target.value)} 
                                        className="flex-1 border p-2 rounded font-bold text-green-700 text-base outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="50000"
                                     />
                                 </div>
                             </div>
                         )}

                         <div className="flex gap-2">
                             <input type="text" placeholder={reportType === 'FUND' ? "Khoản thu..." : "Ghi chú..."} value={note} onChange={e => setNote(e.target.value)} className="flex-1 border p-2 rounded-lg text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                             <button type="submit" disabled={loading || (reportType === 'BONUS' && remainingBudget <= 0)} className={`px-4 py-2 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${loading || (reportType === 'BONUS' && remainingBudget <= 0) ? 'bg-gray-400' : reportType === 'BONUS' ? 'bg-yellow-500' : reportType === 'FUND' ? 'bg-green-600' : 'bg-orange-600'}`}>
                                 <Send size={20}/>
                             </button>
                         </div>
                    </div>
                 </form>
             </div>
        </div>
    );
};

export default StudentPortal;
