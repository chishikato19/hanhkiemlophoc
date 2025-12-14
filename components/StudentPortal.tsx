
import React, { useState, useEffect, useMemo } from 'react';
import { fetchStudentsForPortal, fetchBehaviorList, fetchSettings, getPendingReports, getFundCampaigns, getDutyRoster, fetchConductForPortal } from '../services/dataService';
import { CheckCircle, LogOut, Coins } from 'lucide-react';
import { BehaviorItem, Settings, Student, ClassRole, ConductRecord } from '../types';

// Import sub-components
import LoginView from './portal/LoginView';
import ReportScreen from './portal/ReportScreen';
import ShopScreen from './portal/ShopScreen';
import ScoresScreen from './portal/ScoresScreen';

const StudentPortal: React.FC = () => {
    // Data State
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [behaviors, setBehaviors] = useState<BehaviorItem[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [allConduct, setAllConduct] = useState<ConductRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Flow State
    const [currentUser, setCurrentUser] = useState<Student | null>(null);
    const [submitted, setSubmitted] = useState(false);

    // Dashboard State
    const [activeTab, setActiveTab] = useState<'REPORT' | 'PERSONAL' | 'SCORES'>('PERSONAL');
    
    // Shared State for Report Screen (Lifted up to keep persistence when switching tabs if needed, or kept here for structure)
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

    // Derived Logic
    const activeStudents = useMemo(() => allStudents.filter(s => s.isActive !== false), [allStudents]);
    
    const filteredTargetStudents = useMemo(() => {
        if (!studentSearch.trim()) return activeStudents;
        return activeStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
    }, [activeStudents, studentSearch]);

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
                // Pre-fetch other data
                getPendingReports();
                getFundCampaigns();
                getDutyRoster();
            } catch (error) {
                console.error("Failed to load portal data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

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

    const handleLogin = (student: Student) => {
        setCurrentUser(student);
        const perms = getPermissions(student.roles);
        if (perms.size > 0) {
            setActiveTab('REPORT');
        } else {
            setActiveTab('PERSONAL');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setSelectedTargetIds([]);
        setStudentSearch('');
    };

    const handleSubmitted = () => {
        setSubmitted(true);
        setTimeout(() => { setSubmitted(false); setSelectedTargetIds([]); }, 2000);
    };

    const handleUpdateUser = (updated: Student) => {
        setCurrentUser(updated);
        // Also update in allStudents list to keep consistency
        setAllStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
    };

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

    if (loading && allStudents.length === 0) return <div className="min-h-screen flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>;
    
    if (!currentUser) {
        return <LoginView students={allStudents} onLogin={handleLogin} />;
    }

    if (submitted) return <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4 text-center"><CheckCircle size={64} className="text-green-500 mb-4" /><h2 className="text-2xl font-bold text-green-700">Thành công!</h2></div>;

    const perms = getPermissions(currentUser.roles);
    const hasReportPerms = perms.size > 0;

    return (
        <div className="bg-gray-50 flex flex-col font-sans h-[100dvh]">
             {/* Header */}
             <div className="bg-orange-600 text-white p-3 shadow-md shrink-0 z-20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-orange-600 font-bold border-2 border-orange-200">
                        {currentUser.avatarUrl || currentUser.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="font-bold text-base flex items-center gap-2">{currentUser.name}</h1>
                        <div className="text-[10px] text-orange-100 opacity-90 flex gap-1 items-center">
                            <span className="bg-black bg-opacity-20 px-2 rounded-full flex items-center gap-1"><Coins size={10}/> {currentUser.balance || 0} Xu</span>
                            {currentUser.roles?.map(r => <span key={r}>{r === 'MONITOR' ? 'Lớp Trưởng' : r === 'TREASURER' ? 'Thủ Quỹ' : 'Cán Bộ'}</span>)}
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
                 {activeTab === 'REPORT' && hasReportPerms && settings && (
                     <ReportScreen 
                        currentUser={currentUser}
                        allStudents={allStudents}
                        settings={settings}
                        behaviors={behaviors}
                        permissions={perms}
                        onLoading={setLoading}
                        onSubmitted={handleSubmitted}
                        studentSearch={studentSearch}
                        setStudentSearch={setStudentSearch}
                        filteredTargetStudents={filteredTargetStudents}
                        selectedTargetIds={selectedTargetIds}
                        setSelectedTargetIds={setSelectedTargetIds}
                        handleSelectAllVisible={handleSelectAllVisible}
                        toggleTargetStudent={toggleTargetStudent}
                     />
                 )}

                 {activeTab === 'PERSONAL' && settings && (
                     <ShopScreen 
                        currentUser={currentUser}
                        settings={settings}
                        onUpdateUser={handleUpdateUser}
                        onLoading={setLoading}
                     />
                 )}

                 {activeTab === 'SCORES' && settings && (
                     <ScoresScreen 
                        currentUser={currentUser}
                        allStudents={allStudents}
                        settings={settings}
                        allConduct={allConduct}
                     />
                 )}
             </div>
        </div>
    );
};

export default StudentPortal;
