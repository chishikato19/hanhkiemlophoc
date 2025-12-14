
import React, { useState, useEffect, useMemo } from 'react';
import { fetchStudentsForPortal, sendStudentReport, fetchBehaviorList, fetchSettings, getPendingReports, sendStudentOrder, getFundCampaigns, saveFundCampaigns, getDutyRoster, saveDutyRoster, fetchConductForPortal } from '../services/dataService';
import { Send, CheckCircle, AlertTriangle, Clock, Search, CheckSquare, Square, Shield, Lock, ArrowLeft, LogOut, Coins, Award, Banknote, User, ShoppingBag, LayoutTemplate, Smile, Backpack, Ticket, Check, Calendar, CalendarCheck, Brush, Plus, X, Trash2, Printer, Star, ThumbsUp, StickyNote, BarChart2 } from 'lucide-react';
import { PendingReport, AttendanceStatus, BehaviorItem, Settings, Student, ClassRole, RewardItem, AvatarItem, FrameItem, FundCampaign, DutyTask, ConductRecord, AcademicRank } from '../types';
import { createPurchaseOrder, useFunctionalItem, equipAvatar, equipFrame } from '../utils/gamification';
import { formatCurrency, formatGroupedList } from '../utils/formatters';

const StudentPortal: React.FC = () => {
    // Data State
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [behaviors, setBehaviors] = useState<BehaviorItem[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [allPendingReports, setAllPendingReports] = useState<PendingReport[]>([]);
    const [campaigns, setCampaigns] = useState<FundCampaign[]>([]);
    const [dutyRoster, setDutyRoster] = useState<DutyTask[]>([]);
    const [allConduct, setAllConduct] = useState<ConductRecord[]>([]); // New State
    const [loading, setLoading] = useState(true);

    // Flow State
    const [view, setView] = useState<'USER_SELECT' | 'AUTH' | 'DASHBOARD' | 'SUCCESS'>('USER_SELECT');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [currentUser, setCurrentUser] = useState<Student | null>(null);
    const [submitted, setSubmitted] = useState(false);

    // Dashboard State
    const [activeTab, setActiveTab] = useState<'REPORT' | 'PERSONAL' | 'SCORES'>('PERSONAL');
    
    // Reporting State
    const [reportType, setReportType] = useState<'ATTENDANCE' | 'VIOLATION' | 'BONUS' | 'FUND' | 'LABOR'>('ATTENDANCE');
    const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
    const [attendanceMarks, setAttendanceMarks] = useState<Record<string, AttendanceStatus | null>>({});
    const [studentSearch, setStudentSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedBehaviorId, setSelectedBehaviorId] = useState('');
    const [bonusAmount, setBonusAmount] = useState(1);
    const [note, setNote] = useState('');

    // Fund Specific State
    const [fundTab, setFundTab] = useState<'COLLECT' | 'CREATE'>('COLLECT');
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [variableAmounts, setVariableAmounts] = useState<Record<string, number>>({});
    
    // New Campaign State
    const [newCampaignName, setNewCampaignName] = useState('');
    const [newCampaignType, setNewCampaignType] = useState<'FIXED' | 'VARIABLE'>('FIXED');
    const [newCampaignAmount, setNewCampaignAmount] = useState('');

    // Labor Specific State
    const [laborTab, setLaborTab] = useState<'EVALUATE' | 'ROSTER'>('EVALUATE');
    const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 2 : new Date().getDay() + 1); // 2-7
    const [draggingStudent, setDraggingStudent] = useState<string | null>(null);

    // Personal/Shop State
    const [shopTab, setShopTab] = useState<'STORE' | 'AVATARS' | 'FRAMES' | 'INVENTORY' | 'BADGES'>('STORE');

    // SCORES / CONDUCT VIEW STATE
    const [viewingWeek, setViewingWeek] = useState(1);
    const [viewingStudentId, setViewingStudentId] = useState<string>('');

    // Derived Logic
    const activeStudents = useMemo(() => allStudents.filter(s => s.isActive !== false), [allStudents]);
    
    const filteredTargetStudents = useMemo(() => {
        if (!studentSearch.trim()) return activeStudents;
        return activeStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
    }, [activeStudents, studentSearch]);

    const toggleTargetStudent = (id: string) => {
        setSelectedTargetIds(prev => 
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const handleSelectAllVisible = () => {
         const ids = filteredTargetStudents.map(s => s.id);
         if (ids.every(id => selectedTargetIds.includes(id))) {
             setSelectedTargetIds(prev => prev.filter(id => !ids.includes(id)));
         } else {
             setSelectedTargetIds(prev => Array.from(new Set([...prev, ...ids])));
         }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [studentData, behaviorData, settingsData, conductData] = await Promise.all([
                    fetchStudentsForPortal(),
                    fetchBehaviorList(),
                    fetchSettings(),
                    fetchConductForPortal()
                ]);
                setAllStudents(studentData);
                setBehaviors(behaviorData);
                setSettings(settingsData);
                setAllConduct(conductData);
                setAllPendingReports(getPendingReports());
                setCampaigns(getFundCampaigns());
                setDutyRoster(getDutyRoster());
                
                // Determine max week
                const maxWeek = conductData.length > 0 ? Math.max(...conductData.map(r => r.week)) : 1;
                setSelectedWeek(maxWeek);
                setViewingWeek(maxWeek);

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
        setVariableAmounts({});
    };

    const getRoleBudget = (): { limit: number, maxPerStudent: number } => {
        if (!settings || !currentUser) return { limit: 0, maxPerStudent: 0 };
        const budgets = settings.gamification.roleBudgets || { monitorWeeklyBudget: 50, viceWeeklyBudget: 30, maxRewardPerStudent: 5 };
        
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

    const getPermissions = (roles: ClassRole[] = []) => {
        const perms = new Set<string>();
        // ALL officers can give BONUS
        if (roles.length > 0 && !roles.includes('NONE')) { perms.add('BONUS'); }

        if (roles.includes('MONITOR')) { perms.add('ATTENDANCE'); perms.add('VIOLATION'); }
        if (roles.includes('VICE_DISCIPLINE')) { perms.add('ATTENDANCE'); perms.add('VIOLATION'); }
        if (roles.includes('VICE_STUDY')) { perms.add('VIOLATION'); }
        if (roles.includes('VICE_LABOR')) { perms.add('LABOR'); perms.add('VIOLATION'); }
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

        const actualPass = student.password || '123';
        if (passwordInput === actualPass) {
            setCurrentUser(student);
            setViewingStudentId(student.id); // Default to viewing self
            
            const perms = getPermissions(student.roles);
            if (perms.size > 0) {
                setActiveTab('REPORT');
                // Default tab logic
                if (perms.has('ATTENDANCE')) setReportType('ATTENDANCE');
                else if (perms.has('FUND')) setReportType('FUND');
                else if (perms.has('LABOR')) setReportType('LABOR');
                else if (perms.has('VIOLATION')) setReportType('VIOLATION');
                else setReportType('BONUS');
            } else {
                setActiveTab('PERSONAL');
            }
            
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

    // --- Fund Logic ---
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

    // --- Labor Logic ---
    const getDutyForDay = (day: number) => dutyRoster.find(d => d.dayOfWeek === day) || { dayOfWeek: day, morning: [], board: [], afternoon: [] };
    
    const updateDuty = (day: number, field: 'morning' | 'board' | 'afternoon', studentId: string, remove: boolean = false) => {
        const current = getDutyForDay(day);
        let updatedTask = { ...current };
        if (remove) {
            updatedTask[field] = updatedTask[field].filter(id => id !== studentId);
        } else {
            if (!updatedTask[field].includes(studentId)) updatedTask[field] = [...updatedTask[field], studentId];
        }
        
        const newRoster = dutyRoster.filter(d => d.dayOfWeek !== day);
        newRoster.push(updatedTask);
        setDutyRoster(newRoster);
        saveDutyRoster(newRoster);
    };

    const handleEvaluateDuty = async (studentId: string, rating: 'GOOD' | 'PASS' | 'FAIL') => {
        const student = allStudents.find(s => s.id === studentId);
        if (!student || !currentUser) return;
        
        let type: 'VIOLATION' | 'BONUS' = 'BONUS';
        let content = '';
        let points = 0;

        if (rating === 'GOOD') {
            content = 'Trực nhật Tốt (+2đ)';
            points = 2;
        } else if (rating === 'PASS') {
            content = 'Trực nhật Đạt (0đ)'; // Just logging
            return; 
        } else {
            type = 'VIOLATION';
            content = 'Trực nhật bẩn/Chưa đạt (-2đ)';
            points = -2;
        }

        const report: PendingReport = {
            id: `REP-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString(),
            targetDate: selectedDate,
            week: selectedWeek,
            reporterName: currentUser.name,
            roleId: (currentUser.roles || []).join(','),
            targetStudentName: student.name,
            type,
            content,
            note: 'Đánh giá từ Lớp phó Lao động'
        };
        
        setLoading(true);
        await sendStudentReport(report);
        setLoading(false);
        alert(`Đã đánh giá ${rating} cho ${student.name}`);
    };

    // --- General Logic ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        
        setLoading(true);
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
            if (bonusAmount > budget.maxPerStudent) { alert(`Vượt quá giới hạn! Tối đa ${budget.maxPerStudent} xu.`); setLoading(false); return; }
            if (used + totalRequested > budget.limit) { alert(`Không đủ ngân sách! Còn lại: ${budget.limit - used} xu.`); setLoading(false); return; }
            promises = selectedTargetIds.map(targetId => {
                const target = allStudents.find(n => n.id === targetId);
                if (!target) return Promise.resolve(false);
                return sendStudentReport(createReport(target, 'BONUS', `Thưởng nóng (+${bonusAmount} xu)`, { rewardAmount: bonusAmount }));
            });
        }
        else if (reportType === 'FUND') {
            if (selectedTargetIds.length === 0) { alert("Chưa chọn học sinh!"); setLoading(false); return; }
            const campaign = campaigns.find(c => c.id === selectedCampaignId);
            if (!campaign) { alert("Vui lòng chọn khoản thu!"); setLoading(false); return; }

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
        setTimeout(() => { setSubmitted(false); resetSelection(); }, 3000);
    };

    // ... (Login Logic same as before) ...
    // Copy/Paste Shop logic from previous version
    const handleRequestBuy = async (item: RewardItem | AvatarItem | FrameItem, type: 'REWARD' | 'AVATAR' | 'FRAME') => {
        if (!currentUser) return;
        if (!window.confirm(`Gửi yêu cầu đổi "${item.label}" với giá ${item.cost} Xu?`)) return;
        const result = createPurchaseOrder(currentUser, item, type);
        if (result.success && result.order) {
            setCurrentUser(result.student);
            setLoading(true);
            await sendStudentOrder(result.order);
            setLoading(false);
            alert("Đã gửi yêu cầu! Xu đã được trừ tạm thời. Vui lòng đợi giáo viên duyệt.");
        } else { alert("Bạn không đủ Xu để đổi món quà này!"); }
    };
    const handleUseItem = (itemId: string) => {
        if (!currentUser || !settings) return;
        const itemConfig = settings.gamification.rewards.find(r => r.id === itemId);
        if (itemConfig?.type === 'IMMUNITY') { alert("Thẻ này chỉ được sử dụng bởi Giáo viên khi duyệt lỗi vi phạm."); return; }
        if (!window.confirm(`Xác nhận sử dụng?`)) return;
        const updatedStudent = useFunctionalItem(currentUser, itemId, settings);
        if (updatedStudent) { setCurrentUser(updatedStudent); alert(`Đã sử dụng thành công!`); }
    };
    const handleEquip = (type: 'AVATAR' | 'FRAME', item: AvatarItem | FrameItem) => {
        if (!currentUser) return;
        let updated;
        if (type === 'AVATAR') updated = equipAvatar(currentUser, item as AvatarItem); else updated = equipFrame(currentUser, item as FrameItem);
        setCurrentUser(updated); alert("Đã thay đổi trang bị!");
    };

    const renderScoresTab = () => {
        if (!settings) return null;
        
        const isMonitor = currentUser?.roles?.includes('MONITOR');
        
        // Find record
        const record = allConduct.find(r => r.studentId === viewingStudentId && r.week === viewingWeek);
        const score = record ? record.score : settings.defaultScore;
        const targetStudent = allStudents.find(s => s.id === viewingStudentId);

        const getRank = (s: number) => {
            if (s >= settings.thresholds.good) return AcademicRank.GOOD;
            if (s >= settings.thresholds.fair) return AcademicRank.FAIR;
            if (s >= settings.thresholds.pass) return AcademicRank.PASS;
            return AcademicRank.FAIL;
        };
        const rank = getRank(score);

        const getRankColor = (r: string) => {
            switch (r) {
                case AcademicRank.GOOD: return 'bg-green-100 text-green-800';
                case AcademicRank.FAIR: return 'bg-blue-100 text-blue-800';
                case AcademicRank.PASS: return 'bg-yellow-100 text-yellow-800';
                default: return 'bg-red-100 text-red-800';
            }
        };

        return (
            <div className="flex flex-col h-full bg-gray-50">
                {/* Header Controls */}
                <div className="bg-white p-3 shadow-sm border-b shrink-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-500">Xem tuần:</label>
                        <select 
                            value={viewingWeek} 
                            onChange={e => setViewingWeek(parseInt(e.target.value))} 
                            className="border p-1.5 rounded text-sm font-bold bg-gray-50 outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            {Array.from({length: 35}).map((_, i) => <option key={i+1} value={i+1}>Tuần {i+1}</option>)}
                        </select>
                    </div>
                    
                    {/* Monitor Search Bar */}
                    {isMonitor && (
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                            <select 
                                value={viewingStudentId}
                                onChange={e => setViewingStudentId(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value={currentUser?.id}>{currentUser?.name} (Tôi)</option>
                                {allStudents.filter(s => s.id !== currentUser?.id && s.isActive).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Report Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Summary Card */}
                    <div className="bg-white rounded-xl shadow-md border p-4 mb-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{targetStudent?.name}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Tuần {viewingWeek}</p>
                            </div>
                            <div className="text-right">
                                <div className={`text-xs font-bold px-2 py-0.5 rounded uppercase inline-block mb-1 ${getRankColor(rank)}`}>{rank}</div>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-center py-2">
                            <div className="text-center">
                                <div className="text-5xl font-black text-indigo-600 tracking-tighter">{score}</div>
                                <div className="text-xs text-gray-400 font-medium uppercase mt-1">Điểm Hạnh Kiểm</div>
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                        <div className="bg-white rounded-xl shadow-sm border p-3">
                            <h4 className="font-bold text-red-600 text-sm flex items-center gap-2 mb-2 uppercase border-b pb-1 border-red-100">
                                <AlertTriangle size={16}/> Vi phạm trừ điểm
                            </h4>
                            {record && record.violations.length > 0 ? (
                                <ul className="space-y-1">
                                    {formatGroupedList(record.violations, settings.behaviorConfig.violations).map((v, i) => (
                                        <li key={i} className="text-sm text-red-800 bg-red-50 px-2 py-1.5 rounded flex items-start gap-2">
                                            <span className="mt-1.5 w-1 h-1 bg-red-400 rounded-full shrink-0"></span>
                                            {v}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-xs text-gray-400 italic text-center py-2">Không có vi phạm. Giỏi lắm!</div>
                            )}
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border p-3">
                            <h4 className="font-bold text-green-600 text-sm flex items-center gap-2 mb-2 uppercase border-b pb-1 border-green-100">
                                <ThumbsUp size={16}/> Điểm cộng / Lời khen
                            </h4>
                            {record && record.positiveBehaviors && record.positiveBehaviors.length > 0 ? (
                                <ul className="space-y-1">
                                    {formatGroupedList(record.positiveBehaviors, settings.behaviorConfig.positives).map((v, i) => (
                                        <li key={i} className="text-sm text-green-800 bg-green-50 px-2 py-1.5 rounded flex items-start gap-2">
                                            <span className="mt-1.5 w-1 h-1 bg-green-400 rounded-full shrink-0"></span>
                                            {v}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-xs text-gray-400 italic text-center py-2">Chưa có điểm cộng tuần này.</div>
                            )}
                        </div>

                        {record && record.note && (
                            <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-3">
                                <h4 className="font-bold text-blue-700 text-sm flex items-center gap-2 mb-1 uppercase">
                                    <StickyNote size={16}/> Nhận xét giáo viên
                                </h4>
                                <p className="text-sm text-blue-900 italic">"{record.note}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading && allStudents.length === 0) return <div className="min-h-screen flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>;
    if (submitted) return <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4 text-center"><CheckCircle size={64} className="text-green-500 mb-4" /><h2 className="text-2xl font-bold text-green-700">Thành công!</h2></div>;

    if (view === 'USER_SELECT' || view === 'AUTH') {
        // Reuse exact same Login UI code from previous version
        const activeStudents = allStudents.filter(s => s.isActive);
        if (view === 'USER_SELECT') return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4 flex items-center justify-center">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 h-[80vh] flex flex-col">
                    <div className="text-center mb-4 flex-shrink-0">
                        <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-white shadow-lg"><User size={32} /></div>
                        <h1 className="text-2xl font-bold text-gray-800">Cổng Thông Tin Lớp</h1>
                        <p className="text-gray-600 text-sm">Chọn tên bạn để đăng nhập</p>
                    </div>
                    <div className="mb-4 relative flex-shrink-0">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/><input type="text" className="w-full border p-2 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-orange-500" placeholder="Tìm tên..." value={userSearch} onChange={e => setUserSearch(e.target.value)}/>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {allStudents.filter(n => n.name.toLowerCase().includes(userSearch.toLowerCase()) && n.isActive).map(s => (
                            <button key={s.id} onClick={() => handleUserSelect(s.id)} className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-colors text-left group">
                                <div className="font-bold text-gray-800 group-hover:text-orange-700">{s.name}</div>
                                {(s.roles && s.roles.length > 0) && (<div className="flex gap-1">{s.roles.map(r => <span key={r} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-200">{r === 'MONITOR' ? 'LT' : r === 'TREASURER' ? 'TQ' : 'LP'}</span>)}</div>)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                    <button onClick={() => setView('USER_SELECT')} className="mb-4 text-gray-400 flex items-center gap-1 text-sm"><ArrowLeft size={14}/> Quay lại</button>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Xin chào, {allStudents.find(s => s.id === selectedStudentId)?.name}</h2>
                    <p className="text-sm text-gray-500 mb-6">Nhập mật khẩu cá nhân</p>
                    <form onSubmit={handleLogin}>
                        <div className="relative mb-4"><Lock className="absolute left-3 top-2.5 text-gray-400" size={18}/><input type="password" autoFocus className="w-full border p-2 pl-10 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-base" placeholder="Mật khẩu..." value={passwordInput} onChange={e => setPasswordInput(e.target.value)}/></div>
                        <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700 shadow-lg">Đăng nhập</button>
                    </form>
                </div>
            </div>
        );
    }

    // 3. Dashboard
    const perms = getPermissions(currentUser?.roles);
    const hasReportPerms = perms.size > 0;

    return (
        <div className="bg-gray-50 flex flex-col font-sans h-[100dvh]">
             {/* Header */}
             <div className="bg-orange-600 text-white p-3 shadow-md shrink-0 z-20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-orange-600 font-bold border-2 border-orange-200">
                        {currentUser?.avatarUrl || currentUser?.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="font-bold text-base flex items-center gap-2">{currentUser?.name}</h1>
                        <div className="text-[10px] text-orange-100 opacity-90 flex gap-1 items-center">
                            <span className="bg-black bg-opacity-20 px-2 rounded-full flex items-center gap-1"><Coins size={10}/> {currentUser?.balance || 0} Xu</span>
                            {currentUser?.roles?.map(r => <span key={r}>{r === 'MONITOR' ? 'Lớp Trưởng' : r === 'TREASURER' ? 'Thủ Quỹ' : 'Cán Bộ'}</span>)}
                        </div>
                    </div>
                </div>
                <button onClick={handleLogout} className="bg-white bg-opacity-20 p-2 rounded-full hover:bg-opacity-30"><LogOut size={16}/></button>
             </div>

             {/* Tab Navigation */}
             <div className="bg-white border-b flex text-sm font-medium shadow-sm shrink-0 overflow-x-auto">
                 {hasReportPerms && (
                     <button onClick={() => setActiveTab('REPORT')} className={`flex-1 py-3 text-center border-b-2 whitespace-nowrap px-4 ${activeTab === 'REPORT' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500'}`}>Nhiệm vụ</button>
                 )}
                 <button onClick={() => setActiveTab('PERSONAL')} className={`flex-1 py-3 text-center border-b-2 whitespace-nowrap px-4 ${activeTab === 'PERSONAL' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500'}`}>Cá nhân & Shop</button>
                 <button onClick={() => setActiveTab('SCORES')} className={`flex-1 py-3 text-center border-b-2 whitespace-nowrap px-4 ${activeTab === 'SCORES' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500'}`}>Kết quả</button>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-hidden flex flex-col">
                 {activeTab === 'SCORES' ? renderScoresTab() : activeTab === 'REPORT' && hasReportPerms ? (
                     // REPORT VIEW
                     <form onSubmit={handleSubmit} className="flex flex-col h-full">
                        <div className="p-2 border-b bg-gray-50 shrink-0">
                             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                 {perms.has('ATTENDANCE') && <button type="button" onClick={() => setReportType('ATTENDANCE')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'ATTENDANCE' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-500 border'}`}><Clock size={14}/> Điểm Danh</button>}
                                 {perms.has('VIOLATION') && <button type="button" onClick={() => setReportType('VIOLATION')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'VIOLATION' ? 'bg-red-600 text-white shadow' : 'bg-white text-gray-500 border'}`}><AlertTriangle size={14}/> Vi Phạm</button>}
                                 {perms.has('BONUS') && <button type="button" onClick={() => setReportType('BONUS')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'BONUS' ? 'bg-yellow-500 text-white shadow' : 'bg-white text-gray-500 border'}`}><Coins size={14}/> Thưởng</button>}
                                 {perms.has('FUND') && <button type="button" onClick={() => setReportType('FUND')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'FUND' ? 'bg-green-600 text-white shadow' : 'bg-white text-gray-500 border'}`}><Banknote size={14}/> Thu Quỹ</button>}
                                 {perms.has('LABOR') && <button type="button" onClick={() => setReportType('LABOR')} className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${reportType === 'LABOR' ? 'bg-indigo-600 text-white shadow' : 'bg-white text-gray-500 border'}`}><Brush size={14}/> Lao Động</button>}
                             </div>
                        </div>

                        {/* LABOR ROSTER & EVALUATION VIEW */}
                        {reportType === 'LABOR' ? (
                            <div className="flex-1 overflow-y-auto p-2 bg-gray-50 flex flex-col">
                                <div className="flex bg-white rounded-lg shadow-sm border p-1 mb-2 shrink-0">
                                    <button type="button" onClick={() => setLaborTab('EVALUATE')} className={`flex-1 py-1.5 text-xs font-bold rounded ${laborTab === 'EVALUATE' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Đánh giá</button>
                                    <button type="button" onClick={() => setLaborTab('ROSTER')} className={`flex-1 py-1.5 text-xs font-bold rounded ${laborTab === 'ROSTER' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Phân công</button>
                                </div>

                                {laborTab === 'EVALUATE' ? (
                                    <div className="space-y-3">
                                        <div className="bg-white p-3 rounded-lg border">
                                            <label className="text-xs font-bold text-gray-500 block mb-2">Chọn ngày đánh giá:</label>
                                            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                                {[2,3,4,5,6,7].map(d => (
                                                    <button key={d} type="button" onClick={() => setSelectedDay(d)} className={`w-8 h-8 rounded-full text-xs font-bold shrink-0 ${selectedDay === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>T{d}</button>
                                                ))}
                                            </div>
                                        </div>
                                        {['morning', 'board', 'afternoon'].map(time => {
                                            const duty = getDutyForDay(selectedDay);
                                            const studentIds = (duty as any)[time] || [];
                                            const label = time === 'morning' ? 'Đầu giờ' : time === 'board' ? 'Lau bảng' : 'Cuối giờ';
                                            return (
                                                <div key={time} className="bg-white p-3 rounded-lg border shadow-sm">
                                                    <h4 className="font-bold text-indigo-800 text-sm mb-2">{label}</h4>
                                                    {studentIds.length === 0 && <span className="text-xs text-gray-400">Chưa phân công</span>}
                                                    {studentIds.map((sid: string) => {
                                                        const s = allStudents.find(st => st.id === sid);
                                                        return (
                                                            <div key={sid} className="flex justify-between items-center py-2 border-b last:border-0">
                                                                <span className="text-sm font-medium">{s?.name}</span>
                                                                <div className="flex gap-1">
                                                                    <button type="button" onClick={() => handleEvaluateDuty(sid, 'GOOD')} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-bold">Tốt</button>
                                                                    <button type="button" onClick={() => handleEvaluateDuty(sid, 'PASS')} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-bold">Đạt</button>
                                                                    <button type="button" onClick={() => handleEvaluateDuty(sid, 'FAIL')} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-bold">Ẩu</button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col h-full">
                                        <div className="flex justify-between mb-2">
                                            <div className="flex gap-1">
                                                {[2,3,4,5,6,7].map(d => (<button key={d} type="button" onClick={() => setSelectedDay(d)} className={`w-8 h-8 rounded text-xs font-bold ${selectedDay === d ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>T{d}</button>))}
                                            </div>
                                            <button type="button" onClick={() => window.print()} className="bg-gray-800 text-white px-3 py-1 rounded text-xs flex items-center gap-1"><Printer size={12}/> In</button>
                                        </div>
                                        <div className="flex-1 bg-white border rounded-lg p-2 overflow-hidden flex flex-col">
                                            <div className="grid grid-cols-3 gap-2 h-1/2 mb-2">
                                                {['morning', 'board', 'afternoon'].map(time => (
                                                    <div key={time} className="border rounded bg-gray-50 p-2 flex flex-col" onDragOver={e => e.preventDefault()} onDrop={() => draggingStudent && updateDuty(selectedDay, time as any, draggingStudent)}>
                                                        <h5 className="font-bold text-xs text-center mb-1 text-gray-500 uppercase">{time === 'morning' ? 'Đầu giờ' : time === 'board' ? 'Lau bảng' : 'Cuối giờ'}</h5>
                                                        <div className="flex-1 overflow-y-auto space-y-1">
                                                            {(getDutyForDay(selectedDay) as any)[time]?.map((sid: string) => (
                                                                <div key={sid} className="bg-white border px-2 py-1 rounded text-xs flex justify-between items-center shadow-sm">
                                                                    <span className="truncate">{allStudents.find(s => s.id === sid)?.name}</span>
                                                                    <button type="button" onClick={() => updateDuty(selectedDay, time as any, sid, true)}><X size={10} className="text-red-400"/></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="border-t pt-2 flex-1 flex flex-col">
                                                <input className="w-full border p-1 rounded text-xs mb-2" placeholder="Tìm học sinh..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)}/>
                                                <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2">
                                                    {filteredTargetStudents.map(s => (
                                                        <div key={s.id} draggable onDragStart={() => setDraggingStudent(s.id)} className="bg-white border p-2 rounded text-xs cursor-grab active:cursor-grabbing hover:bg-indigo-50">
                                                            {s.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : reportType === 'FUND' && fundTab === 'CREATE' ? (
                            // CREATE CAMPAIGN VIEW
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
                            // STANDARD LIST VIEW (Attendance, Violation, Bonus, Fund Collect)
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
                                    {/* Date display for Attendance */}
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
                                                            <button type="button" onClick={() => setAttendanceMarks(prev => ({...prev, [s.id]: AttendanceStatus.LATE}))} className={`flex-1 text-xs px-2 py-2 rounded border font-medium ${status === AttendanceStatus.LATE ? 'bg-yellow-100 border-yellow-300 text-yellow-800 ring-1 ring-yellow-300' : 'bg-gray-50 text-gray-500'}`}>Đi trễ</button>
                                                            <button type="button" onClick={() => setAttendanceMarks(prev => ({...prev, [s.id]: AttendanceStatus.UNEXCUSED}))} className={`flex-1 text-xs px-2 py-2 rounded border font-medium ${status === AttendanceStatus.UNEXCUSED ? 'bg-red-100 border-red-300 text-red-800 ring-1 ring-red-300' : 'bg-gray-50 text-gray-500'}`}>Vắng KP</button>
                                                            <button type="button" onClick={() => setAttendanceMarks(prev => ({...prev, [s.id]: AttendanceStatus.EXCUSED}))} className={`flex-1 text-xs px-2 py-2 rounded border font-medium ${status === AttendanceStatus.EXCUSED ? 'bg-blue-100 border-blue-300 text-blue-800 ring-1 ring-blue-300' : 'bg-gray-50 text-gray-500'}`}>Vắng CP</button>
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
                        {reportType !== 'LABOR' && reportType !== 'FUND' && (
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
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                            <div className="bg-yellow-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (getUsedBudget() / getRoleBudget().limit) * 100)}%` }}></div>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1 text-right">Còn lại: {getRoleBudget().limit - getUsedBudget()} xu</div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <input type="text" placeholder="Ghi chú..." value={note} onChange={e => setNote(e.target.value)} className="flex-1 border p-2 rounded-lg text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                                    <button type="submit" disabled={loading} className={`px-4 py-2 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${loading ? 'bg-gray-400' : reportType === 'BONUS' ? 'bg-yellow-500' : 'bg-orange-600'}`}>
                                        <Send size={20}/>
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* FUND FOOTER */}
                        {reportType === 'FUND' && fundTab === 'COLLECT' && (
                             <div className="p-3 border-t bg-gray-50 shrink-0 space-y-2 z-10 shadow-up">
                                 <div className="bg-green-50 p-2 rounded border border-green-200 text-xs text-green-800">
                                     Đang chọn: <strong>{selectedTargetIds.length}</strong> học sinh.
                                 </div>
                                 <button type="submit" disabled={loading || selectedTargetIds.length === 0} className="w-full py-3 rounded-lg font-bold text-white shadow-md bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2">
                                     <Banknote size={20}/> Xác nhận Thu
                                 </button>
                             </div>
                        )}
                     </form>
                 ) : (
                     // PERSONAL / STORE VIEW
                     <div className="flex flex-col h-full bg-gray-50">
                         {/* Shop Tabs */}
                         <div className="flex bg-white shadow-sm overflow-x-auto p-1 shrink-0">
                             <button onClick={() => setShopTab('STORE')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex flex-col items-center gap-1 ${shopTab === 'STORE' ? 'bg-orange-50 text-orange-600' : 'text-gray-400'}`}><ShoppingBag size={18}/> Quà</button>
                             <button onClick={() => setShopTab('AVATARS')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex flex-col items-center gap-1 ${shopTab === 'AVATARS' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><Smile size={18}/> Avatar</button>
                             <button onClick={() => setShopTab('FRAMES')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex flex-col items-center gap-1 ${shopTab === 'FRAMES' ? 'bg-purple-50 text-purple-600' : 'text-gray-400'}`}><LayoutTemplate size={18}/> Khung</button>
                             <button onClick={() => setShopTab('INVENTORY')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex flex-col items-center gap-1 ${shopTab === 'INVENTORY' ? 'bg-green-50 text-green-600' : 'text-gray-400'}`}><Backpack size={18}/> Túi</button>
                             <button onClick={() => setShopTab('BADGES')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex flex-col items-center gap-1 ${shopTab === 'BADGES' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}><Award size={18}/> Danh hiệu</button>
                         </div>

                         <div className="flex-1 overflow-y-auto p-4">
                             {shopTab === 'STORE' && (
                                 <div className="grid grid-cols-2 gap-3">
                                     {settings?.gamification.rewards.map(item => (
                                         <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm border flex flex-col items-center text-center">
                                             <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2"><ShoppingBag className="text-gray-400"/></div>
                                             <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{item.label}</h4>
                                             <p className="text-xs text-orange-600 font-bold mt-1 flex items-center gap-1"><Coins size={10}/> {item.cost}</p>
                                             <button onClick={() => handleRequestBuy(item, 'REWARD')} className="mt-2 w-full py-1.5 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700">Đổi quà</button>
                                         </div>
                                     ))}
                                 </div>
                             )}
                             
                             {shopTab === 'AVATARS' && (
                                 <div className="grid grid-cols-3 gap-3">
                                     {settings?.gamification.avatars.map(avt => {
                                         const owned = currentUser?.ownedAvatars?.includes(avt.id);
                                         const equipped = currentUser?.avatarUrl === avt.url;
                                         return (
                                             <div key={avt.id} className="bg-white rounded-xl p-2 shadow-sm border flex flex-col items-center">
                                                 <div className="text-3xl mb-1">{avt.url}</div>
                                                 <p className="text-[10px] font-bold text-gray-600">{avt.label}</p>
                                                 {owned ? (
                                                     <button onClick={() => handleEquip('AVATAR', avt)} disabled={equipped} className={`mt-1 w-full py-1 text-[10px] font-bold rounded ${equipped ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'}`}>{equipped ? 'Đang dùng' : 'Dùng'}</button>
                                                 ) : (
                                                     <button onClick={() => handleRequestBuy(avt, 'AVATAR')} className="mt-1 w-full py-1 bg-orange-100 text-orange-600 text-[10px] font-bold rounded flex items-center justify-center gap-1"><Coins size={8}/> {avt.cost}</button>
                                                 )}
                                             </div>
                                         )
                                     })}
                                 </div>
                             )}

                             {shopTab === 'FRAMES' && (
                                 <div className="grid grid-cols-3 gap-3">
                                     {settings?.gamification.frames.map(frm => {
                                         const owned = currentUser?.ownedFrames?.includes(frm.id);
                                         const equipped = currentUser?.frameUrl === frm.image;
                                         return (
                                             <div key={frm.id} className="bg-white rounded-xl p-2 shadow-sm border flex flex-col items-center">
                                                 <div className="w-12 h-12 relative mb-1">
                                                     <img src={frm.image} className="absolute inset-0 w-full h-full" alt=""/>
                                                     <div className="w-full h-full flex items-center justify-center text-xl opacity-30">👤</div>
                                                 </div>
                                                 <p className="text-[10px] font-bold text-gray-600 line-clamp-1">{frm.label}</p>
                                                 {owned ? (
                                                     <button onClick={() => handleEquip('FRAME', frm)} disabled={equipped} className={`mt-1 w-full py-1 text-[10px] font-bold rounded ${equipped ? 'bg-gray-100 text-gray-400' : 'bg-purple-100 text-purple-600'}`}>{equipped ? 'Đang dùng' : 'Dùng'}</button>
                                                 ) : (
                                                     <button onClick={() => handleRequestBuy(frm, 'FRAME')} className="mt-1 w-full py-1 bg-orange-100 text-orange-600 text-[10px] font-bold rounded flex items-center justify-center gap-1"><Coins size={8}/> {frm.cost}</button>
                                                 )}
                                             </div>
                                         )
                                     })}
                                 </div>
                             )}

                             {shopTab === 'INVENTORY' && (
                                 <div className="space-y-2">
                                     {!currentUser?.inventory?.length && <div className="text-center text-gray-400 mt-10">Túi trống rỗng.</div>}
                                     {currentUser?.inventory?.map(inv => {
                                         const item = settings?.gamification.rewards.find(r => r.id === inv.itemId);
                                         return (
                                             <div key={inv.itemId} className="bg-white p-3 rounded-lg border flex items-center justify-between shadow-sm">
                                                 <div className="flex items-center gap-3">
                                                     <div className="w-10 h-10 bg-green-50 rounded flex items-center justify-center text-green-600"><Ticket size={20}/></div>
                                                     <div>
                                                         <div className="font-bold text-sm text-gray-800">{item?.label || 'Vật phẩm'}</div>
                                                         <div className="text-xs text-gray-500">Số lượng: {inv.count}</div>
                                                     </div>
                                                 </div>
                                                 <button onClick={() => handleUseItem(inv.itemId)} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold">Sử dụng</button>
                                             </div>
                                         )
                                     })}
                                 </div>
                             )}

                             {shopTab === 'BADGES' && (
                                 <div className="space-y-2">
                                     {settings?.gamification.badges.map(bg => {
                                         const unlocked = currentUser?.badges?.includes(bg.id);
                                         return (
                                             <div key={bg.id} className={`p-3 rounded-lg border flex items-center gap-3 ${unlocked ? 'bg-white border-indigo-100 shadow-sm' : 'bg-gray-100 opacity-60'}`}>
                                                 <div className="text-3xl">{bg.icon}</div>
                                                 <div>
                                                     <div className="font-bold text-sm text-gray-800">{bg.label}</div>
                                                     <div className="text-xs text-gray-500">{bg.description}</div>
                                                 </div>
                                                 {unlocked && <CheckCircle size={16} className="text-green-500 ml-auto"/>}
                                             </div>
                                         )
                                     })}
                                 </div>
                             )}
                         </div>
                     </div>
                 )}
             </div>
        </div>
    );
};

export default StudentPortal;
