
import React, { useState, useEffect, useMemo } from 'react';
import { fetchStudentsForPortal, sendStudentReport, fetchBehaviorList, fetchSettings, getPendingReports } from '../services/dataService';
import { Send, CheckCircle, AlertTriangle, Clock, Search, CheckSquare, Square, Shield, Lock, ArrowLeft, LogOut, Coins, Award, Banknote, User } from 'lucide-react';
import { PendingReport, AttendanceStatus, BehaviorItem, Settings, Student, ClassRole } from '../types';

const StudentPortal: React.FC = () => {
    // Data State
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [behaviors, setBehaviors] = useState<BehaviorItem[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [allPendingReports, setAllPendingReports] = useState<PendingReport[]>([]);
    const [loading, setLoading] = useState(true);

    // Flow State
    const [view, setView] = useState<'USER_SELECT' | 'AUTH' | 'DASHBOARD' | 'SUCCESS'>('USER_SELECT');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [currentUser, setCurrentUser] = useState<Student | null>(null);
    const [submitted, setSubmitted] = useState(false);

    // Dashboard State
    const [reportType, setReportType] = useState<'ATTENDANCE' | 'VIOLATION' | 'BONUS' | 'FUND'>('ATTENDANCE');
    const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
    const [attendanceMarks, setAttendanceMarks] = useState<Record<string, AttendanceStatus | null>>({});
    const [studentSearch, setStudentSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedBehaviorId, setSelectedBehaviorId] = useState('');
    const [bonusAmount, setBonusAmount] = useState(1);
    const [fundAmount, setFundAmount] = useState<string>('');
    const [note, setNote] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [studentData, behaviorData, settingsData] = await Promise.all([
                    fetchStudentsForPortal(),
                    fetchBehaviorList(),
                    fetchSettings()
                ]);
                setAllStudents(studentData);
                setBehaviors(behaviorData);
                setSettings(settingsData);
                setAllPendingReports(getPendingReports()); 
            } catch (error) {
                console.error("Failed to load portal data", error);
            } finally {
                setLoading(false);
            }
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
        if (!settings || !currentUser) return { limit: 0, maxPerStudent: 0 };
        const budgets = settings.gamification.roleBudgets || { monitorWeeklyBudget: 50, viceWeeklyBudget: 30, maxRewardPerStudent: 5 };
        
        // Prioritize Monitor budget if user has multiple roles
        if (currentUser.roles?.includes('MONITOR')) {
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

    // --- Permissions Logic ---
    const getPermissions = (roles: ClassRole[] = []) => {
        const perms = new Set<string>();
        if (roles.includes('MONITOR')) { perms.add('ATTENDANCE'); perms.add('VIOLATION'); perms.add('BONUS'); }
        if (roles.includes('VICE_DISCIPLINE')) { perms.add('ATTENDANCE'); perms.add('VIOLATION'); }
        if (roles.includes('VICE_STUDY')) { perms.add('VIOLATION'); perms.add('BONUS'); }
        if (roles.includes('VICE_LABOR')) { perms.add('VIOLATION'); }
        if (roles.includes('TREASURER')) { perms.add('FUND'); }
        return perms;
    };

    const handleUserSelect = (id: string) => {
        setSelectedStudentId(id);
        setPasswordInput('');
        setView('AUTH');
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const student = allStudents.find(s => s.id === selectedStudentId);
        if (!student) return;

        // Verify password (default '123' if not set)
        const actualPass = student.password || '123';
        if (passwordInput === actualPass) {
            setCurrentUser(student);
            
            // Set default view based on permissions
            const perms = getPermissions(student.roles);
            if (perms.has('ATTENDANCE')) setReportType('ATTENDANCE');
            else if (perms.has('FUND')) setReportType('FUND');
            else if (perms.has('BONUS')) setReportType('BONUS');
            else if (perms.has('VIOLATION')) setReportType('VIOLATION');
            
            setView('DASHBOARD');
        } else {
            alert("Mật khẩu không đúng!");
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setSelectedStudentId(null);
        resetSelection();
        setView('USER_SELECT');
    };

    const filteredStudentsForSelection = allStudents.filter(n => n.name.toLowerCase().includes(userSearch.toLowerCase()));
    const filteredTargetStudents = allStudents.filter(n => n.name.toLowerCase().includes(studentSearch.toLowerCase()));

    const toggleTargetStudent = (id: string) => {
        if (selectedTargetIds.includes(id)) {
            setSelectedTargetIds(selectedTargetIds.filter(tid => tid !== id));
        } else {
            setSelectedTargetIds([...selectedTargetIds, id]);
        }
    };

    const handleSelectAllVisible = () => {
        const visibleIds = filteredTargetStudents.map(s => s.id);
        const allVisibleSelected = visibleIds.every(id => selectedTargetIds.includes(id));
        
        if (allVisibleSelected) {
            setSelectedTargetIds(selectedTargetIds.filter(id => !visibleIds.includes(id)));
        } else {
            const newIds = [...selectedTargetIds];
            visibleIds.forEach(id => { if (!newIds.includes(id)) newIds.push(id); });
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
        if (!currentUser) return;
        
        setLoading(true);
        let promises: Promise<boolean>[] = [];

        // Common Report Base
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
            if (markedIds.length === 0) { alert("Chưa chọn học sinh nào!"); setLoading(false); return; }
            promises = markedIds.map(targetId => {
                const target = allStudents.find(n => n.id === targetId);
                const status = attendanceMarks[targetId];
                if (!target || !status) return Promise.resolve(false);
                return sendStudentReport(createReport(target, 'ATTENDANCE', status));
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
                const target = allStudents.find(n => n.id === targetId);
                if (!target) return Promise.resolve(false);
                return sendStudentReport(createReport(target, 'BONUS', `Thưởng nóng (+${bonusAmount} xu)`, { rewardAmount: bonusAmount }));
            });
        }
        else if (reportType === 'FUND') {
            if (selectedTargetIds.length === 0) { alert("Chưa chọn học sinh!"); setLoading(false); return; }
            const amount = parseInt(fundAmount.replace(/\D/g, ''));
            if (!amount || amount <= 0) { alert("Số tiền không hợp lệ!"); setLoading(false); return; }
            if (!note) { alert("Vui lòng ghi rõ khoản thu (VD: Tiền nước, Tiền Photo)"); setLoading(false); return; }

            promises = selectedTargetIds.map(targetId => {
                const target = allStudents.find(n => n.id === targetId);
                if (!target) return Promise.resolve(false);
                return sendStudentReport(createReport(target, 'FUND', `Đã thu ${new Intl.NumberFormat('vi-VN').format(amount)}đ`, { fundAmount: amount }));
            });
        }
        else {
            if (selectedTargetIds.length === 0) { alert("Chưa chọn học sinh!"); setLoading(false); return; }
            if (!selectedBehaviorId) { alert("Chưa chọn lỗi!"); setLoading(false); return; }
            const behavior = behaviors.find(b => b.id === selectedBehaviorId);
            const content = behavior ? behavior.label : 'Lỗi';
            promises = selectedTargetIds.map(targetId => {
                const target = allStudents.find(n => n.id === targetId);
                if (!target) return Promise.resolve(false);
                return sendStudentReport(createReport(target, 'VIOLATION', content));
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

    if (loading && allStudents.length === 0) return <div className="min-h-screen flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>;

    if (submitted) return (
        <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4 text-center">
            <CheckCircle size={64} className="text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-700">Gửi báo cáo thành công!</h2>
            <button onClick={() => setSubmitted(false)} className="mt-8 bg-white border border-green-200 text-green-700 px-6 py-2 rounded-full font-medium hover:bg-green-100">Tiếp tục báo cáo</button>
        </div>
    );

    // 1. User Selection (Who are you?)
    if (view === 'USER_SELECT') {
        const studentWithRoles = filteredStudentsForSelection.filter(s => s.roles && s.roles.length > 0 && !s.roles.includes('NONE'));
        
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4 flex items-center justify-center">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
                    <div className="text-center mb-6">
                        <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                            <Shield size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Cổng Cán Bộ Lớp</h1>
                        <p className="text-gray-600 text-sm">Vui lòng chọn tên của bạn để đăng nhập</p>
                    </div>

                    <div className="mb-4 relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                        <input 
                            type="text" 
                            className="w-full border p-2 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-orange-500" 
                            placeholder="Tìm tên bạn..."
                            value={userSearch}
                            onChange={e => setUserSearch(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {studentWithRoles.length === 0 && <div className="text-center text-gray-400 py-4">Không tìm thấy cán bộ lớp.</div>}
                        {studentWithRoles.map(s => (
                            <button 
                                key={s.id}
                                onClick={() => handleUserSelect(s.id)}
                                className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-colors text-left"
                            >
                                <div className="font-bold text-gray-800">{s.name}</div>
                                <div className="flex gap-1">
                                    {(s.roles || []).map(r => (
                                        <span key={r} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium border">
                                            {r === 'MONITOR' ? 'Lớp Trưởng' : r === 'VICE_STUDY' ? 'LP Học Tập' : r === 'VICE_DISCIPLINE' ? 'LP Nề Nếp' : r === 'VICE_LABOR' ? 'LP Lao Động' : 'Thủ Quỹ'}
                                        </span>
                                    ))}
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
        const targetStudent = allStudents.find(s => s.id === selectedStudentId);
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                    <button onClick={() => setView('USER_SELECT')} className="mb-4 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"><ArrowLeft size={14}/> Quay lại</button>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Xin chào, {targetStudent?.name}</h2>
                    <p className="text-sm text-gray-500 mb-6">Nhập mật khẩu cá nhân của bạn</p>
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
                        <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700 shadow-lg">Đăng nhập</button>
                    </form>
                </div>
            </div>
        );
    }

    // 4. Dashboard (Reporting Form)
    const perms = getPermissions(currentUser?.roles);
    const budget = getRoleBudget();
    const usedBudget = getUsedBudget();
    const remainingBudget = budget.limit - usedBudget;

    return (
        <div className="bg-gray-50 flex flex-col font-sans h-[100dvh]">
             {/* Header */}
             <div className="bg-orange-600 text-white p-3 shadow-md shrink-0 z-20 flex justify-between items-center">
                <div>
                    <h1 className="font-bold text-base flex items-center gap-2"><User size={18}/> {currentUser?.name}</h1>
                    <div className="text-[10px] text-orange-100 opacity-90 flex gap-1">
                        {(currentUser?.roles || []).map(r => (
                            <span key={r}>{r === 'MONITOR' ? 'Lớp Trưởng' : r === 'VICE_STUDY' ? 'LP Học Tập' : r === 'VICE_DISCIPLINE' ? 'LP Nề Nếp' : r === 'VICE_LABOR' ? 'LP Lao Động' : 'Thủ Quỹ'}</span>
                        ))}
                    </div>
                </div>
                <button onClick={handleLogout} className="bg-white bg-opacity-20 p-2 rounded-full hover:bg-opacity-30"><LogOut size={16}/></button>
             </div>

             <div className="flex-1 max-w-3xl mx-auto w-full p-2 sm:p-4 flex flex-col min-h-0">
                 <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg flex flex-col h-full overflow-hidden border">
                    {/* Controls */}
                    <div className="p-3 border-b bg-gray-50 shrink-0 space-y-2">
                         <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                             {perms.has('ATTENDANCE') && (
                                 <button type="button" onClick={() => setReportType('ATTENDANCE')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'ATTENDANCE' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-500 border'}`}>
                                     <Clock size={14}/> Điểm Danh
                                 </button>
                             )}
                             {perms.has('VIOLATION') && (
                                 <button type="button" onClick={() => setReportType('VIOLATION')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'VIOLATION' ? 'bg-red-600 text-white shadow' : 'bg-white text-gray-500 border'}`}>
                                     <AlertTriangle size={14}/> Vi Phạm
                                 </button>
                             )}
                             {perms.has('BONUS') && (
                                 <button type="button" onClick={() => setReportType('BONUS')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'BONUS' ? 'bg-yellow-500 text-white shadow' : 'bg-white text-gray-500 border'}`}>
                                     <Coins size={14}/> Thưởng Xu
                                 </button>
                             )}
                             {perms.has('FUND') && (
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
                            <input className="flex-1 outline-none text-base" placeholder="Tìm tên học sinh..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                            {reportType !== 'ATTENDANCE' && <button type="button" onClick={handleSelectAllVisible} className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded font-bold">Chọn hết</button>}
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
                            <div className="grid grid-cols-1 gap-2 pb-20"> 
                                {filteredTargetStudents.map(s => {
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
