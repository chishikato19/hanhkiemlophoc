
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2, Key, Lock, Wallet, Save, RefreshCw, AlertTriangle, Plus, Calendar } from 'lucide-react';
import { Settings, BehaviorItem, BehaviorCategory } from '../types';
import { getSettings, saveSettings, getConductRecords, saveConductRecords } from '../services/dataService';
import { addLog } from '../utils/logger';

const SettingsManager: React.FC = () => {
    const [settings, setSettings] = useState<Settings>(getSettings());
    const [settingTab, setSettingTab] = useState<'general' | 'behaviors' | 'gamification' | 'permissions'>('general');
    
    // Behavior Edit State
    const [newBehaviorLabel, setNewBehaviorLabel] = useState('');
    const [newBehaviorPoints, setNewBehaviorPoints] = useState(0);
    const [newBehaviorCategory, setNewBehaviorCategory] = useState<BehaviorCategory>('OTHER');
    const [editingBehaviorId, setEditingBehaviorId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'points_desc' | 'points_asc' | 'alpha'>('points_asc');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setSettings(getSettings());
    }, []);

    const handleSaveSettings = (newSettings: Settings) => {
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const updateSettingsState = (partial: Partial<Settings>) => {
        const updated = { ...settings, ...partial };
        handleSaveSettings(updated);
    };

    const handleWeekDateChange = (index: number, newDate: string) => {
        if (!newDate) return;
        
        const newDates = [...(settings.weekStartDates || [])];
        newDates[index] = newDate;

        // Rippling effect: Update all subsequent weeks
        for (let i = index + 1; i < 35; i++) {
            const prev = new Date(newDates[i - 1]);
            const next = new Date(prev);
            next.setDate(prev.getDate() + 7);
            newDates[i] = next.toISOString().split('T')[0];
        }

        const updated = { ...settings, weekStartDates: newDates };
        // If it's the first week, also update semesterStartDate
        if (index === 0) {
            updated.semesterStartDate = newDate;
        }

        handleSaveSettings(updated);
        addLog('CONFIG', `Đã cập nhật lịch học bắt đầu từ Tuần ${index + 1}.`);
    };

    // Helper to strip points suffix like " (-2đ)" or " (+5đ)" from stored records
    const cleanLabel = (label: string) => {
        return label.replace(/\s*\([+-]?\d+đ\)/g, '').replace(/\s*\(x\d+\)/g, '').trim();
    };

    // --- Logic di chuyển từ ConductManager sang ---
    const recalculateAllScores = (newSettings: Settings) => {
        const currentRecords = getConductRecords();
        const finalRecs = currentRecords.map(rec => {
            let score = newSettings.defaultScore;
            
            // Recalc Violations
            rec.violations.forEach(v => {
                const rawName = cleanLabel(v);
                // Try finding by exact name first
                const item = newSettings.behaviorConfig.violations.find(i => i.label === rawName);
                
                if (item) {
                    score += item.points; // Use NEW points from config
                } else { 
                    // Fallback to the hardcoded points in the string if config not found
                    const match = v.match(/\(([+-]?\d+)đ\)/); 
                    if (match && match[1]) score += parseInt(match[1]); 
                }
            });

            // Recalc Positives
            (rec.positiveBehaviors || []).forEach(p => {
                 const rawName = cleanLabel(p);
                 const item = newSettings.behaviorConfig.positives.find(i => i.label === rawName);
                 
                 if (item) {
                     score += item.points; // Use NEW points from config
                 } else { 
                     const match = p.match(/\(([+-]?\d+)đ\)/); 
                     if (match && match[1]) score += parseInt(match[1]); 
                 }
            });

            return { ...rec, score: Math.max(0, Math.min(100, score)) };
        });
        saveConductRecords(finalRecs);
        addLog('CONFIG', 'Đã tính toán lại toàn bộ điểm hạnh kiểm theo cấu hình mới.');
    };

    const migrateBehaviorName = (oldName: string, newName: string, isPositive: boolean) => {
        const records = getConductRecords();
        const finalRecs = records.map(rec => {
            let hasChange = false;
            let newViolations = [...rec.violations];
            let newPositives = [...(rec.positiveBehaviors || [])];
            
            if (!isPositive) { 
                // Migrate Violations
                newViolations = newViolations.map(v => {
                    if (cleanLabel(v) === oldName) {
                        hasChange = true;
                        // Replace the name part but keep the points part if strictly needed, 
                        // or just replace the substring. Replacing substring is safer for "Name (-2đ)" format.
                        return v.replace(oldName, newName);
                    }
                    return v;
                });
            } else { 
                // Migrate Positives
                newPositives = newPositives.map(p => {
                    if (cleanLabel(p) === oldName) {
                        hasChange = true;
                        return p.replace(oldName, newName);
                    }
                    return p;
                });
            }
            return hasChange ? { ...rec, violations: newViolations, positiveBehaviors: newPositives } : rec;
        });
        saveConductRecords(finalRecs);
        addLog('CONFIG', `Đã cập nhật tên hành vi trong lịch sử: "${oldName}" -> "${newName}"`);
    };
    // ---------------------------------------------

    const handleUpdateBehavior = (isPositive: boolean) => {
        if (!newBehaviorLabel.trim()) return;
        const points = parseInt(newBehaviorPoints.toString());
        const config = { ...settings.behaviorConfig };
        const list = isPositive ? config.positives : config.violations;

        if (editingBehaviorId) {
            const existingItem = list.find(i => i.id === editingBehaviorId);
            if (!existingItem) return;
            const oldName = existingItem.label;
            const newName = newBehaviorLabel;
            
            // 1. Update Config
            const newList = list.map(i => i.id === editingBehaviorId ? { ...i, label: newName, points, category: newBehaviorCategory } : i);
            if (isPositive) config.positives = newList; else config.violations = newList;
            const newSettings = { ...settings, behaviorConfig: config };
            
            // 2. Trigger Migrations & Recalc
            // Note: recalculateAllScores calls getConductRecords(), so if migrate saves first, it uses updated names.
            if (oldName !== newName) { 
                migrateBehaviorName(oldName, newName, isPositive); 
            }
            
            // Important: We must pass the newSettings to recalculate so it uses the NEW points
            recalculateAllScores(newSettings);
            
            handleSaveSettings(newSettings); 
        } else {
            const newItem: BehaviorItem = { id: Date.now().toString(), label: newBehaviorLabel, points, category: newBehaviorCategory };
            if (isPositive) config.positives = [...config.positives, newItem]; else config.violations = [...config.violations, newItem];
            handleSaveSettings({ ...settings, behaviorConfig: config });
        }
        setNewBehaviorLabel(''); setNewBehaviorPoints(isPositive ? 1 : -1); setNewBehaviorCategory('OTHER'); setEditingBehaviorId(null);
    };
    
    const editBehavior = (item: BehaviorItem) => { 
        setNewBehaviorLabel(item.label); 
        setNewBehaviorPoints(item.points); 
        setNewBehaviorCategory(item.category || 'OTHER');
        setEditingBehaviorId(item.id); 
    };

    const deleteBehavior = (id: string, isPositive: boolean) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa?")) return;
        const config = { ...settings.behaviorConfig };
        if (isPositive) { config.positives = config.positives.filter(i => i.id !== id); } else { config.violations = config.violations.filter(i => i.id !== id); }
        handleSaveSettings({ ...settings, behaviorConfig: config });
    };

    const getSortedBehaviors = (items: BehaviorItem[]) => {
        return [...items].sort((a, b) => {
            if (sortOrder === 'alpha') return a.label.localeCompare(b.label);
            if (sortOrder === 'points_desc') return Math.abs(b.points) - Math.abs(a.points);
            return Math.abs(a.points) - Math.abs(b.points);
        });
    };

    const getCategoryLabel = (cat?: BehaviorCategory) => {
        switch(cat) {
            case 'STUDY': return 'Học tập';
            case 'DISCIPLINE': return 'Nề nếp';
            case 'LABOR': return 'Lao động';
            default: return 'Khác';
        }
    };

    const manualRecalculate = () => {
        if(window.confirm("Hệ thống sẽ quét toàn bộ dữ liệu cũ và tính lại điểm dựa trên cấu hình hiện tại. Bạn có chắc không?")) {
            setIsSaving(true);
            setTimeout(() => {
                recalculateAllScores(settings);
                setIsSaving(false);
                alert("Đã tính toán lại dữ liệu thành công!");
            }, 500);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><SettingsIcon className="text-gray-600"/> Cấu Hình Hệ Thống</h2>
                    <p className="text-gray-500 text-sm">Thiết lập mật khẩu, quy tắc điểm số, danh mục vi phạm và cửa hàng.</p>
                </div>
                <button 
                    onClick={manualRecalculate} 
                    className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-50 shadow-sm flex items-center gap-2 text-sm font-medium"
                    disabled={isSaving}
                >
                    <RefreshCw size={16} className={isSaving ? "animate-spin" : ""}/> 
                    {isSaving ? "Đang xử lý..." : "Cập nhật lại điểm số"}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-h-[600px] flex flex-col md:flex-row">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-2 flex flex-row md:flex-col gap-1 overflow-x-auto">
                    <button onClick={() => setSettingTab('general')} className={`p-3 rounded-lg text-left text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${settingTab === 'general' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <SettingsIcon size={18}/> <span>Cài đặt chung</span>
                    </button>
                    <button onClick={() => setSettingTab('behaviors')} className={`p-3 rounded-lg text-left text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${settingTab === 'behaviors' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <AlertTriangle size={18}/> <span>Lỗi & Thưởng</span>
                    </button>
                    <button onClick={() => setSettingTab('permissions')} className={`p-3 rounded-lg text-left text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${settingTab === 'permissions' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <Key size={18}/> <span>Quyền & Ngân sách</span>
                    </button>
                    <button onClick={() => setSettingTab('gamification')} className={`p-3 rounded-lg text-left text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${settingTab === 'gamification' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <Wallet size={18}/> <span>Gamification</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-200px)]">
                    {settingTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                           <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                <h4 className="font-bold text-blue-800 text-base mb-4 flex items-center gap-2"><Lock size={20}/> Bảo mật & Truy cập</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Mật khẩu Giáo viên (Quản trị)</label>
                                        <div className="flex items-center gap-2 bg-white p-2 rounded border">
                                            <Key size={18} className="text-gray-400" />
                                            <input type="text" value={settings.teacherPassword} onChange={e => updateSettingsState({ teacherPassword: e.target.value })} className="w-full outline-none text-gray-800 font-mono"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Mã lớp (Học sinh đăng nhập)</label>
                                        <div className="flex items-center gap-2 bg-white p-2 rounded border">
                                            <SettingsIcon size={18} className="text-gray-400" />
                                            <input type="text" value={settings.studentCode} onChange={e => updateSettingsState({ studentCode: e.target.value })} className="w-full outline-none text-gray-800 font-mono"/>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-blue-600 mt-3 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Lưu ý: Mật khẩu riêng cho từng học sinh có thể cài đặt trong tab "Học Sinh".</p>
                           </section>
                           
                           <section>
                                <h4 className="font-bold text-gray-800 text-base mb-4 border-b pb-2">Thông số học kỳ</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Ngày bắt đầu HK1</label>
                                        <input type="date" value={settings.semesterStartDate} onChange={e => handleWeekDateChange(0, e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Tuần bắt đầu HK2</label>
                                        <input type="number" value={settings.semesterTwoStartWeek} onChange={e => updateSettingsState({ semesterTwoStartWeek: parseInt(e.target.value) })} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Điểm mặc định tuần</label>
                                        <input type="number" value={settings.defaultScore} onChange={e => updateSettingsState({ defaultScore: parseInt(e.target.value) })} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500"/>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2"><Calendar size={20}/> Quản lý Lịch học (Tuần)</h4>
                                <p className="text-sm text-gray-500 mb-4 italic">Thay đổi ngày bắt đầu của một tuần cụ thể nếu có khoảng nghỉ (như nghỉ Tết). Các tuần sau sẽ tự động cập nhật theo quy tắc +7 ngày.</p>
                                
                                <div className="max-h-[300px] overflow-y-auto border rounded-lg bg-white">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className="bg-gray-100 sticky top-0">
                                            <tr>
                                                <th className="p-2 border-b">Tuần</th>
                                                <th className="p-2 border-b">Ngày bắt đầu (Thứ 2)</th>
                                                <th className="p-2 border-b">Kết thúc (Chủ nhật)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {(settings.weekStartDates || []).map((startDate, idx) => {
                                                const d = new Date(startDate);
                                                const end = new Date(d);
                                                end.setDate(d.getDate() + 6);
                                                
                                                return (
                                                    <tr key={idx} className="hover:bg-indigo-50">
                                                        <td className="p-2 font-bold text-gray-700">Tuần {idx + 1}</td>
                                                        <td className="p-2">
                                                            <input 
                                                                type="date" 
                                                                value={startDate} 
                                                                onChange={(e) => handleWeekDateChange(idx, e.target.value)}
                                                                className="border rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-400"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-gray-500">{end.toLocaleDateString('vi-VN')}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    )}

                    {settingTab === 'behaviors' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                             <div className="flex gap-2 justify-end">
                                 <button onClick={() => setSortOrder('points_desc')} className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 ${sortOrder === 'points_desc' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="Điểm cao -> thấp"><ArrowDown size={14}/> Điểm giảm</button>
                                 <button onClick={() => setSortOrder('points_asc')} className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 ${sortOrder === 'points_asc' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="Điểm thấp -> cao"><ArrowUp size={14}/> Điểm tăng</button>
                                 <button onClick={() => setSortOrder('alpha')} className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 ${sortOrder === 'alpha' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="Tên A-Z"><ArrowUpDown size={14}/> Tên A-Z</button>
                             </div>
                             
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                 <section>
                                    <h4 className="font-bold text-red-700 text-base mb-3 uppercase flex items-center justify-between">
                                        <span>Danh mục Vi Phạm</span>
                                        <span className="text-xs bg-red-100 px-2 py-1 rounded-full">{settings.behaviorConfig.violations.length} lỗi</span>
                                    </h4>
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                        <div className="flex gap-2 mb-4 bg-white p-2 rounded-lg shadow-sm border border-red-100">
                                            <div className="flex-1 space-y-1">
                                                <input placeholder="Tên lỗi..." className="w-full border-b p-1 text-sm outline-none focus:border-red-500" value={!editingBehaviorId || newBehaviorPoints > 0 ? newBehaviorLabel : ''} onChange={e => setNewBehaviorLabel(e.target.value)} disabled={!!editingBehaviorId && newBehaviorPoints > 0} />
                                                <div className="flex gap-2">
                                                    <input type="number" placeholder="Điểm trừ" className="w-20 border p-1 rounded text-sm text-red-600 font-bold" value={!editingBehaviorId || newBehaviorPoints > 0 ? (newBehaviorPoints === 0 ? '' : Math.abs(newBehaviorPoints)) : ''} onChange={e => setNewBehaviorPoints(-Math.abs(parseInt(e.target.value)))} disabled={!!editingBehaviorId && newBehaviorPoints > 0}/>
                                                    <select 
                                                        value={newBehaviorCategory} 
                                                        onChange={e => setNewBehaviorCategory(e.target.value as BehaviorCategory)}
                                                        className="border p-1 rounded text-xs flex-1"
                                                        disabled={!!editingBehaviorId && newBehaviorPoints > 0}
                                                    >
                                                        <option value="DISCIPLINE">Nề nếp</option>
                                                        <option value="STUDY">Học tập</option>
                                                        <option value="LABOR">Lao động</option>
                                                        <option value="OTHER">Khác</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {!editingBehaviorId && <button onClick={() => handleUpdateBehavior(false)} className="bg-red-600 text-white w-10 rounded-lg hover:bg-red-700 flex items-center justify-center shadow"><Plus size={24}/></button>}
                                            {editingBehaviorId && newBehaviorPoints < 0 && <button onClick={() => handleUpdateBehavior(false)} className="bg-green-600 text-white w-10 rounded-lg hover:bg-green-700 flex items-center justify-center shadow"><Save size={20}/></button>}
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                                            {getSortedBehaviors(settings.behaviorConfig.violations).map(item => (
                                                <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-red-50 shadow-sm hover:shadow-md transition-shadow group">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-800">{item.label}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">{getCategoryLabel(item.category)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded">{item.points}đ</span>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => editBehavior(item)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50"><Pencil size={14}/></button>
                                                            <button onClick={() => deleteBehavior(item.id, false)} className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50"><Trash2 size={14}/></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                 </section>

                                 <section>
                                    <h4 className="font-bold text-green-700 text-base mb-3 uppercase flex items-center justify-between">
                                        <span>Danh mục Khen Thưởng</span>
                                        <span className="text-xs bg-green-100 px-2 py-1 rounded-full">{settings.behaviorConfig.positives.length} mục</span>
                                    </h4>
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                        <div className="flex gap-2 mb-4 bg-white p-2 rounded-lg shadow-sm border border-green-100">
                                            <div className="flex-1 space-y-1">
                                                <input placeholder="Tên hành vi..." className="w-full border-b p-1 text-sm outline-none focus:border-green-500" value={!editingBehaviorId || newBehaviorPoints <= 0 ? newBehaviorLabel : ''} onChange={e => setNewBehaviorLabel(e.target.value)} disabled={!!editingBehaviorId && newBehaviorPoints <= 0}/>
                                                <div className="flex gap-2">
                                                    <input type="number" placeholder="Điểm cộng" className="w-20 border p-1 rounded text-sm text-green-600 font-bold" value={!editingBehaviorId || newBehaviorPoints <= 0 ? (newBehaviorPoints === 0 ? '' : newBehaviorPoints) : ''} onChange={e => setNewBehaviorPoints(Math.abs(parseInt(e.target.value)))} disabled={!!editingBehaviorId && newBehaviorPoints <= 0}/>
                                                    <select 
                                                        value={newBehaviorCategory} 
                                                        onChange={e => setNewBehaviorCategory(e.target.value as BehaviorCategory)}
                                                        className="border p-1 rounded text-xs flex-1"
                                                        disabled={!!editingBehaviorId && newBehaviorPoints <= 0}
                                                    >
                                                        <option value="DISCIPLINE">Nề nếp</option>
                                                        <option value="STUDY">Học tập</option>
                                                        <option value="LABOR">Lao động</option>
                                                        <option value="OTHER">Khác</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {!editingBehaviorId && <button onClick={() => handleUpdateBehavior(true)} className="bg-green-600 text-white w-10 rounded-lg hover:bg-green-700 flex items-center justify-center shadow"><Plus size={24}/></button>}
                                            {editingBehaviorId && newBehaviorPoints > 0 && <button onClick={() => handleUpdateBehavior(true)} className="bg-green-600 text-white w-10 rounded-lg hover:bg-green-700 flex items-center justify-center shadow"><Save size={20}/></button>}
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                                            {getSortedBehaviors(settings.behaviorConfig.positives).map(item => (
                                                <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-green-50 shadow-sm hover:shadow-md transition-shadow group">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-800">{item.label}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">{getCategoryLabel(item.category)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+{item.points}đ</span>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => editBehavior(item)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50"><Pencil size={14}/></button>
                                                            <button onClick={() => deleteBehavior(item.id, true)} className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50"><Trash2 size={14}/></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                 </section>
                             </div>
                        </div>
                    )}

                    {settingTab === 'gamification' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <section>
                                <h4 className="font-bold text-orange-700 text-base mb-4 flex items-center gap-2"><Wallet size={20}/> Quy tắc cộng Xu (Tự động)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                                        <label className="block text-sm text-gray-600 mb-2 font-medium">Đạt Hạnh kiểm Tốt (Tuần)</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" value={settings.gamification.coinRules.weeklyGood} onChange={e => updateSettingsState({ gamification: { ...settings.gamification, coinRules: { ...settings.gamification.coinRules, weeklyGood: parseInt(e.target.value) } } })} className="w-full border p-2 rounded focus:ring-2 focus:ring-orange-500 font-bold text-orange-600"/>
                                            <span className="text-sm text-gray-500">xu</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                                        <label className="block text-sm text-gray-600 mb-2 font-medium">Mỗi hành vi tốt (Cộng điểm)</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" value={settings.gamification.coinRules.behaviorBonus} onChange={e => updateSettingsState({ gamification: { ...settings.gamification, coinRules: { ...settings.gamification.coinRules, behaviorBonus: parseInt(e.target.value) } } })} className="w-full border p-2 rounded focus:ring-2 focus:ring-orange-500 font-bold text-orange-600"/>
                                            <span className="text-sm text-gray-500">xu</span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                            <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 text-center">
                                <p className="text-gray-500">
                                    Quản lý Cửa Hàng, Vật Phẩm và Danh Hiệu hiện được thực hiện trực tiếp trong code hoặc thông qua file cấu hình nâng cao. 
                                    Tính năng chỉnh sửa giao diện cho phần này đang được phát triển.
                                </p>
                            </div>
                        </div>
                    )}

                    {settingTab === 'permissions' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                                <h4 className="font-bold text-red-800 flex items-center gap-2 mb-3"><Key size={20}/> Ngân sách thưởng Xu (Mỗi tuần)</h4>
                                <p className="text-sm text-red-600 mb-6">Giới hạn số xu tối đa mà ban cán sự lớp có thể "thưởng nóng" cho các bạn khác thông qua App Mobile.</p>
                                
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Ngân sách Lớp Trưởng</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    className="border p-2 rounded w-full text-center font-bold text-lg text-red-700 focus:ring-2 focus:ring-red-500 outline-none" 
                                                    value={settings.gamification.roleBudgets?.monitorWeeklyBudget || 50}
                                                    onChange={e => updateSettingsState({ gamification: { ...settings.gamification, roleBudgets: { ...settings.gamification.roleBudgets, monitorWeeklyBudget: parseInt(e.target.value) } } })}
                                                />
                                                <span className="text-sm text-gray-500 whitespace-nowrap">xu / tuần</span>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Ngân sách Lớp Phó</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    className="border p-2 rounded w-full text-center font-bold text-lg text-red-700 focus:ring-2 focus:ring-red-500 outline-none"
                                                    value={settings.gamification.roleBudgets?.viceWeeklyBudget || 30}
                                                    onChange={e => updateSettingsState({ gamification: { ...settings.gamification, roleBudgets: { ...settings.gamification.roleBudgets, viceWeeklyBudget: parseInt(e.target.value) } } })}
                                                />
                                                <span className="text-sm text-gray-500 whitespace-nowrap">xu / tuần</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Mức thưởng tối đa 1 lần</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                className="border p-2 rounded w-24 text-center font-bold text-lg text-red-700 focus:ring-2 focus:ring-red-500 outline-none"
                                                value={settings.gamification.roleBudgets?.maxRewardPerStudent || 5}
                                                onChange={e => updateSettingsState({ gamification: { ...settings.gamification, roleBudgets: { ...settings.gamification.roleBudgets, maxRewardPerStudent: parseInt(e.target.value) } } })}
                                            />
                                            <span className="text-sm text-gray-500">xu / học sinh</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">Tránh việc cộng quá nhiều xu cho 1 bạn trong 1 lần thưởng.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsManager;
