
import React, { useState } from 'react';
import { Settings as SettingsIcon, ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2, Key, Lock } from 'lucide-react';
import { Settings, BehaviorItem, RewardItem } from '../../types';

interface Props {
    settings: Settings;
    updateSettings: (partialSettings: any) => void;
    onClose: () => void;
    recalculateAllScores: (newSettings: Settings) => void;
    migrateBehaviorName: (oldName: string, newName: string, isPositive: boolean) => void;
}

const SettingsModal: React.FC<Props> = ({ settings, updateSettings, onClose, recalculateAllScores, migrateBehaviorName }) => {
    const [settingTab, setSettingTab] = useState<'general' | 'behaviors' | 'gamification'>('general');
    
    // Behavior Edit State
    const [newBehaviorLabel, setNewBehaviorLabel] = useState('');
    const [newBehaviorPoints, setNewBehaviorPoints] = useState(0);
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
            const newList = list.map(i => i.id === editingBehaviorId ? { ...i, label: newName, points } : i);
            if (isPositive) config.positives = newList; else config.violations = newList;
            const newSettings = { ...settings, behaviorConfig: config };
            
            // 2. Trigger Migrations & Recalc in Parent
            if (oldName !== newName) { migrateBehaviorName(oldName, newName, isPositive); }
            recalculateAllScores(newSettings);
            
            updateSettings(newSettings); 
        } else {
            const newItem: BehaviorItem = { id: Date.now().toString(), label: newBehaviorLabel, points };
            if (isPositive) config.positives = [...config.positives, newItem]; else config.violations = [...config.violations, newItem];
            updateSettings({ behaviorConfig: config });
        }
        setNewBehaviorLabel(''); setNewBehaviorPoints(isPositive ? 1 : -1); setEditingBehaviorId(null);
    };
    
    const editBehavior = (item: BehaviorItem) => { setNewBehaviorLabel(item.label); setNewBehaviorPoints(item.points); setEditingBehaviorId(item.id); };
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[700px] shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2"><SettingsIcon size={20}/> Cấu hình hệ thống</h3>
                    <div className="flex gap-2 text-sm font-medium">
                        <button onClick={() => setSettingTab('general')} className={`px-3 py-1 rounded ${settingTab === 'general' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>Chung</button>
                        <button onClick={() => setSettingTab('behaviors')} className={`px-3 py-1 rounded ${settingTab === 'behaviors' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>Lỗi / Điểm cộng</button>
                        <button onClick={() => setSettingTab('gamification')} className={`px-3 py-1 rounded ${settingTab === 'gamification' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}>Hệ thống Quà</button>
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
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Mã lớp (Cho học sinh)</label>
                                        <div className="flex items-center gap-2">
                                            <SettingsIcon size={16} className="text-gray-400" />
                                            <input type="text" value={settings.studentCode} onChange={e => updateSettings({ studentCode: e.target.value })} className="w-full border p-2 rounded text-sm"/>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-blue-600 mt-2">Dùng Mã lớp để học sinh đăng nhập vào Cổng thông tin báo cáo.</p>
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
                                        <input placeholder="Tên lỗi vi phạm" className="flex-1 border p-2 rounded text-sm" value={!editingBehaviorId || newBehaviorPoints > 0 ? newBehaviorLabel : ''} onChange={e => setNewBehaviorLabel(e.target.value)} disabled={!!editingBehaviorId && newBehaviorPoints > 0} />
                                        <input type="number" placeholder="Điểm trừ" className="w-24 border p-2 rounded text-sm" value={!editingBehaviorId || newBehaviorPoints > 0 ? (newBehaviorPoints === 0 ? '' : Math.abs(newBehaviorPoints)) : ''} onChange={e => setNewBehaviorPoints(-Math.abs(parseInt(e.target.value)))} disabled={!!editingBehaviorId && newBehaviorPoints > 0}/>
                                        {!editingBehaviorId && <button onClick={() => handleUpdateBehavior(false)} className="bg-red-600 text-white px-4 rounded hover:bg-red-700 text-sm font-medium">Thêm</button>}
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-2">{getSortedBehaviors(settings.behaviorConfig.violations).map(item => (<div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm"><span className="text-sm font-medium">{item.label}</span><div className="flex items-center gap-2"><span className="text-sm font-bold text-red-600">{item.points}đ</span><button onClick={() => editBehavior(item)} className="text-gray-400 hover:text-indigo-500 p-1"><Pencil size={14}/></button><button onClick={() => deleteBehavior(item.id, false)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14}/></button></div></div>))}</div>
                                </div>
                             </section>
                             <section>
                                <h4 className="font-bold text-green-700 text-sm mb-2 uppercase">Danh mục Hành Vi Tốt</h4>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                    <div className="flex gap-2 mb-4">
                                        <input placeholder="Tên hành vi tốt" className="flex-1 border p-2 rounded text-sm" value={!editingBehaviorId || newBehaviorPoints <= 0 ? newBehaviorLabel : ''} onChange={e => setNewBehaviorLabel(e.target.value)} disabled={!!editingBehaviorId && newBehaviorPoints <= 0}/>
                                        <input type="number" placeholder="Điểm cộng" className="w-24 border p-2 rounded text-sm" value={!editingBehaviorId || newBehaviorPoints <= 0 ? (newBehaviorPoints === 0 ? '' : newBehaviorPoints) : ''} onChange={e => setNewBehaviorPoints(Math.abs(parseInt(e.target.value)))} disabled={!!editingBehaviorId && newBehaviorPoints <= 0}/>
                                        {!editingBehaviorId && <button onClick={() => handleUpdateBehavior(true)} className="bg-green-600 text-white px-4 rounded hover:bg-green-700 text-sm font-medium">Thêm</button>}
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-2">{getSortedBehaviors(settings.behaviorConfig.positives).map(item => (<div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm"><span className="text-sm font-medium">{item.label}</span><div className="flex items-center gap-2"><span className="text-sm font-bold text-green-600">+{item.points}đ</span><button onClick={() => editBehavior(item)} className="text-gray-400 hover:text-indigo-500 p-1"><Pencil size={14}/></button><button onClick={() => deleteBehavior(item.id, true)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14}/></button></div></div>))}</div>
                                </div>
                             </section>
                        </div>
                    )}
                    {settingTab === 'gamification' && (
                        <div className="space-y-6">
                            <section>
                                <h4 className="font-bold text-orange-700 text-sm mb-2">Quy tắc cộng Xu (Tự động)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs text-gray-600">Đạt Hạnh kiểm Tốt</label><input type="number" value={settings.gamification.coinRules.weeklyGood} onChange={e => updateSettings({ gamification: { ...settings.gamification, coinRules: { ...settings.gamification.coinRules, weeklyGood: parseInt(e.target.value) } } })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600">Mỗi hành vi tốt</label><input type="number" value={settings.gamification.coinRules.behaviorBonus} onChange={e => updateSettings({ gamification: { ...settings.gamification, coinRules: { ...settings.gamification.coinRules, behaviorBonus: parseInt(e.target.value) } } })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600">Tiến bộ (tăng 10đ)</label><input type="number" value={settings.gamification.coinRules.improvement} onChange={e => updateSettings({ gamification: { ...settings.gamification, coinRules: { ...settings.gamification.coinRules, improvement: parseInt(e.target.value) } } })} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-xs text-gray-600">Không vi phạm</label><input type="number" value={settings.gamification.coinRules.cleanSheet} onChange={e => updateSettings({ gamification: { ...settings.gamification, coinRules: { ...settings.gamification.coinRules, cleanSheet: parseInt(e.target.value) } } })} className="w-full border p-2 rounded"/></div>
                                </div>
                            </section>
                            <section>
                                <h4 className="font-bold text-indigo-700 text-sm mb-2">Cấu hình Danh hiệu (Badges)</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {settings.gamification.badges.map((badge, idx) => (
                                        <div key={badge.id} className="border p-2 rounded flex justify-between items-center bg-gray-50">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{badge.icon}</span>
                                                <div>
                                                    <div className="font-bold text-sm">{badge.label}</div>
                                                    <div className="text-xs text-gray-500">{badge.description}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs bg-gray-200 px-2 rounded">Ngưỡng: {badge.threshold}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-1 italic">Liên hệ lập trình viên để thêm loại danh hiệu mới.</p>
                            </section>
                            <section>
                                <h4 className="font-bold text-green-700 text-sm mb-2">Cấu hình Cửa hàng (Rewards)</h4>
                                <div className="space-y-2">
                                    {settings.gamification.rewards.map((reward, idx) => (
                                        <div key={reward.id} className="flex gap-2 items-center">
                                            <input value={reward.label} onChange={e => {
                                                const newRewards = [...settings.gamification.rewards];
                                                newRewards[idx] = { ...reward, label: e.target.value };
                                                updateSettings({ gamification: { ...settings.gamification, rewards: newRewards } });
                                            }} className="flex-1 border p-1 rounded text-sm" />
                                            <input type="number" value={reward.cost} onChange={e => {
                                                const newRewards = [...settings.gamification.rewards];
                                                newRewards[idx] = { ...reward, cost: parseInt(e.target.value) };
                                                updateSettings({ gamification: { ...settings.gamification, rewards: newRewards } });
                                            }} className="w-20 border p-1 rounded text-sm text-right" />
                                            <span className="text-xs font-bold text-orange-500">Xu</span>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const newReward: RewardItem = { id: Date.now().toString(), label: 'Món quà mới', cost: 100, description: 'Mô tả quà', stock: -1 };
                                        updateSettings({ gamification: { ...settings.gamification, rewards: [...settings.gamification.rewards, newReward] } });
                                    }} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">+ Thêm quà</button>
                                </div>
                            </section>
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
