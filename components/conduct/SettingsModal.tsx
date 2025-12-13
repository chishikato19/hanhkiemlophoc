
import React, { useState } from 'react';
import { Settings as SettingsIcon, ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2, Key, Lock, Users, Shield, Plus, Check, X, Wallet } from 'lucide-react';
import { Settings, BehaviorItem, RewardItem, AvatarItem, StudentRole, Student, BehaviorCategory } from '../../types';

interface Props {
    settings: Settings;
    updateSettings: (partialSettings: any) => void;
    onClose: () => void;
    recalculateAllScores: (newSettings: Settings) => void;
    migrateBehaviorName: (oldName: string, newName: string, isPositive: boolean) => void;
}

const SettingsModal: React.FC<Props> = ({ settings, updateSettings, onClose, recalculateAllScores, migrateBehaviorName }) => {
    const [settingTab, setSettingTab] = useState<'general' | 'behaviors' | 'gamification' | 'permissions'>('general');
    
    // Behavior Edit State
    const [newBehaviorLabel, setNewBehaviorLabel] = useState('');
    const [newBehaviorPoints, setNewBehaviorPoints] = useState(0);
    const [newBehaviorCategory, setNewBehaviorCategory] = useState<BehaviorCategory>('OTHER');
    const [editingBehaviorId, setEditingBehaviorId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'points_desc' | 'points_asc' | 'alpha'>('points_asc');

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
            
            // 2. Trigger Migrations & Recalc in Parent
            if (oldName !== newName) { migrateBehaviorName(oldName, newName, isPositive); }
            recalculateAllScores(newSettings);
            
            updateSettings(newSettings); 
        } else {
            const newItem: BehaviorItem = { id: Date.now().toString(), label: newBehaviorLabel, points, category: newBehaviorCategory };
            if (isPositive) config.positives = [...config.positives, newItem]; else config.violations = [...config.violations, newItem];
            updateSettings({ behaviorConfig: config });
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
        updateSettings({ behaviorConfig: config });
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[700px] shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2"><SettingsIcon size={20}/> Cấu hình hệ thống</h3>
                    <div className="flex gap-2 text-sm font-medium">
                        <button onClick={() => setSettingTab('general')} className={`px-3 py-1 rounded ${settingTab === 'general' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>Chung</button>
                        <button onClick={() => setSettingTab('behaviors')} className={`px-3 py-1 rounded ${settingTab === 'behaviors' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>Lỗi / Điểm cộng</button>
                        <button onClick={() => setSettingTab('gamification')} className={`px-3 py-1 rounded ${settingTab === 'gamification' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}>Shop & Quà</button>
                        <button onClick={() => setSettingTab('permissions')} className={`px-3 py-1 rounded ${settingTab === 'permissions' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:bg-gray-100'}`}>Quyền & Ngân sách</button>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 p-6">
                    {settingTab === 'general' && (
                        <div className="space-y-6">
                           <section className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2"><Lock size={16}/> Bảo mật & Truy cập</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Mật khẩu Giáo viên</label>
                                        <div className="flex items-center gap-2">
                                            <Key size={16} className="text-gray-400" />
                                            <input type="text" value={settings.teacherPassword} onChange={e => updateSettings({ teacherPassword: e.target.value })} className="w-full border p-2 rounded text-sm"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Mã lớp (Đăng nhập chung)</label>
                                        <div className="flex items-center gap-2">
                                            <SettingsIcon size={16} className="text-gray-400" />
                                            <input type="text" value={settings.studentCode} onChange={e => updateSettings({ studentCode: e.target.value })} className="w-full border p-2 rounded text-sm"/>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-blue-600 mt-2">Gần đây đã hỗ trợ mật khẩu riêng cho từng học sinh (Vào phần quản lý Học sinh để cài đặt).</p>
                           </section>
                           
                           <section>
                                <h4 className="font-bold text-indigo-700 text-sm mb-2">Thông số học kỳ</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs text-gray-600 mb-1">Ngày bắt đầu HK1</label><input type="date" value={settings.semesterStartDate} onChange={e => updateSettings({ semesterStartDate: e.target.value })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600 mb-1">Tuần bắt đầu HK2</label><input type="number" value={settings.semesterTwoStartWeek} onChange={e => updateSettings({ semesterTwoStartWeek: parseInt(e.target.value) })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600 mb-1">Điểm mặc định tuần</label><input type="number" value={settings.defaultScore} onChange={e => updateSettings({ defaultScore: parseInt(e.target.value) })} className="w-full border p-2 rounded"/></div>
                                </div>
                            </section>
                        </div>
                    )}
                    {settingTab === 'behaviors' && (
                        <div className="space-y-8">
                             <div className="flex gap-2 justify-end">
                                 <button onClick={() => setSortOrder('points_desc')} className={`p-1 rounded ${sortOrder === 'points_desc' ? 'bg-gray-200' : 'hover:bg-gray-100'}`} title="Điểm cao -> thấp"><ArrowDown size={16}/></button>
                                 <button onClick={() => setSortOrder('points_asc')} className={`p-1 rounded ${sortOrder === 'points_asc' ? 'bg-gray-200' : 'hover:bg-gray-100'}`} title="Điểm thấp -> cao"><ArrowUp size={16}/></button>
                                 <button onClick={() => setSortOrder('alpha')} className={`p-1 rounded ${sortOrder === 'alpha' ? 'bg-gray-200' : 'hover:bg-gray-100'}`} title="Tên A-Z"><ArrowUpDown size={16}/></button>
                             </div>
                             <section>
                                <h4 className="font-bold text-red-700 text-sm mb-2 uppercase">Danh mục Lỗi Vi Phạm</h4>
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                    <div className="flex gap-2 mb-4">
                                        <input placeholder="Tên lỗi..." className="flex-1 border p-2 rounded text-sm" value={!editingBehaviorId || newBehaviorPoints > 0 ? newBehaviorLabel : ''} onChange={e => setNewBehaviorLabel(e.target.value)} disabled={!!editingBehaviorId && newBehaviorPoints > 0} />
                                        <input type="number" placeholder="Điểm" className="w-16 border p-2 rounded text-sm" value={!editingBehaviorId || newBehaviorPoints > 0 ? (newBehaviorPoints === 0 ? '' : Math.abs(newBehaviorPoints)) : ''} onChange={e => setNewBehaviorPoints(-Math.abs(parseInt(e.target.value)))} disabled={!!editingBehaviorId && newBehaviorPoints > 0}/>
                                        <select 
                                            value={newBehaviorCategory} 
                                            onChange={e => setNewBehaviorCategory(e.target.value as BehaviorCategory)}
                                            className="border p-2 rounded text-sm w-28"
                                            disabled={!!editingBehaviorId && newBehaviorPoints > 0}
                                        >
                                            <option value="DISCIPLINE">Nề nếp</option>
                                            <option value="STUDY">Học tập</option>
                                            <option value="LABOR">Lao động</option>
                                            <option value="OTHER">Khác</option>
                                        </select>
                                        {!editingBehaviorId && <button onClick={() => handleUpdateBehavior(false)} className="bg-red-600 text-white px-3 rounded hover:bg-red-700 text-sm font-bold">+</button>}
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-2">{getSortedBehaviors(settings.behaviorConfig.violations).map(item => (<div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm"><div className="flex flex-col"><span className="text-sm font-medium">{item.label}</span><span className="text-[10px] text-gray-400 uppercase">{getCategoryLabel(item.category)}</span></div><div className="flex items-center gap-2"><span className="text-sm font-bold text-red-600">{item.points}đ</span><button onClick={() => editBehavior(item)} className="text-gray-400 hover:text-indigo-500 p-1"><Pencil size={14}/></button><button onClick={() => deleteBehavior(item.id, false)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14}/></button></div></div>))}</div>
                                </div>
                             </section>
                             <section>
                                <h4 className="font-bold text-green-700 text-sm mb-2 uppercase">Danh mục Hành Vi Tốt</h4>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                    <div className="flex gap-2 mb-4">
                                        <input placeholder="Tên hành vi..." className="flex-1 border p-2 rounded text-sm" value={!editingBehaviorId || newBehaviorPoints <= 0 ? newBehaviorLabel : ''} onChange={e => setNewBehaviorLabel(e.target.value)} disabled={!!editingBehaviorId && newBehaviorPoints <= 0}/>
                                        <input type="number" placeholder="Điểm" className="w-16 border p-2 rounded text-sm" value={!editingBehaviorId || newBehaviorPoints <= 0 ? (newBehaviorPoints === 0 ? '' : newBehaviorPoints) : ''} onChange={e => setNewBehaviorPoints(Math.abs(parseInt(e.target.value)))} disabled={!!editingBehaviorId && newBehaviorPoints <= 0}/>
                                        <select 
                                            value={newBehaviorCategory} 
                                            onChange={e => setNewBehaviorCategory(e.target.value as BehaviorCategory)}
                                            className="border p-2 rounded text-sm w-28"
                                            disabled={!!editingBehaviorId && newBehaviorPoints <= 0}
                                        >
                                            <option value="DISCIPLINE">Nề nếp</option>
                                            <option value="STUDY">Học tập</option>
                                            <option value="LABOR">Lao động</option>
                                            <option value="OTHER">Khác</option>
                                        </select>
                                        {!editingBehaviorId && <button onClick={() => handleUpdateBehavior(true)} className="bg-green-600 text-white px-3 rounded hover:bg-green-700 text-sm font-bold">+</button>}
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-2">{getSortedBehaviors(settings.behaviorConfig.positives).map(item => (<div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm"><div className="flex flex-col"><span className="text-sm font-medium">{item.label}</span><span className="text-[10px] text-gray-400 uppercase">{getCategoryLabel(item.category)}</span></div><div className="flex items-center gap-2"><span className="text-sm font-bold text-green-600">+{item.points}đ</span><button onClick={() => editBehavior(item)} className="text-gray-400 hover:text-indigo-500 p-1"><Pencil size={14}/></button><button onClick={() => deleteBehavior(item.id, true)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14}/></button></div></div>))}</div>
                                </div>
                             </section>
                        </div>
                    )}
                    {settingTab === 'gamification' && (
                        <div className="space-y-6">
                            {/* Standard Gamification Settings (Coins, Avatars, etc.) - Kept same as before */}
                            <section>
                                <h4 className="font-bold text-orange-700 text-sm mb-2">Quy tắc cộng Xu (Tự động)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs text-gray-600">Đạt Hạnh kiểm Tốt</label><input type="number" value={settings.gamification.coinRules.weeklyGood} onChange={e => updateSettings({ gamification: { ...settings.gamification, coinRules: { ...settings.gamification.coinRules, weeklyGood: parseInt(e.target.value) } } })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600">Mỗi hành vi tốt</label><input type="number" value={settings.gamification.coinRules.behaviorBonus} onChange={e => updateSettings({ gamification: { ...settings.gamification, coinRules: { ...settings.gamification.coinRules, behaviorBonus: parseInt(e.target.value) } } })} className="w-full border p-2 rounded"/></div>
                                </div>
                            </section>
                            <div className="text-center text-gray-400 text-sm p-4 border border-dashed rounded">
                                (Phần cấu hình Cửa Hàng và Avatar đã được ẩn để gọn giao diện)
                            </div>
                        </div>
                    )}
                    {settingTab === 'permissions' && (
                        <div className="space-y-6">
                            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                <h4 className="font-bold text-red-800 flex items-center gap-2 mb-3"><Wallet size={18}/> Ngân sách thưởng Xu (Mỗi tuần)</h4>
                                <p className="text-xs text-red-600 mb-4">Giới hạn số xu tối đa mà ban cán sự lớp có thể "thưởng nóng" cho các bạn khác.</p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Ngân sách của Lớp Trưởng</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                className="border p-2 rounded w-24 text-center font-bold" 
                                                value={settings.gamification.roleBudgets?.monitorWeeklyBudget || 50}
                                                onChange={e => updateSettings({ gamification: { ...settings.gamification, roleBudgets: { ...settings.gamification.roleBudgets, monitorWeeklyBudget: parseInt(e.target.value) } } })}
                                            />
                                            <span className="text-sm text-gray-500">xu / tuần</span>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Ngân sách của Lớp Phó (Học tập/Lao động...)</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                className="border p-2 rounded w-24 text-center font-bold"
                                                value={settings.gamification.roleBudgets?.viceWeeklyBudget || 30}
                                                onChange={e => updateSettings({ gamification: { ...settings.gamification, roleBudgets: { ...settings.gamification.roleBudgets, viceWeeklyBudget: parseInt(e.target.value) } } })}
                                            />
                                            <span className="text-sm text-gray-500">xu / tuần</span>
                                        </div>
                                    </div>

                                    <div className="border-t pt-3">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Mức thưởng tối đa 1 lần</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                className="border p-2 rounded w-24 text-center font-bold"
                                                value={settings.gamification.roleBudgets?.maxRewardPerStudent || 5}
                                                onChange={e => updateSettings({ gamification: { ...settings.gamification, roleBudgets: { ...settings.gamification.roleBudgets, maxRewardPerStudent: parseInt(e.target.value) } } })}
                                            />
                                            <span className="text-sm text-gray-500">xu / học sinh</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Tránh việc cộng quá nhiều xu cho 1 bạn trong 1 lần thưởng.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 flex justify-end border-t bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-gray-900 shadow">Đóng & Lưu</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
