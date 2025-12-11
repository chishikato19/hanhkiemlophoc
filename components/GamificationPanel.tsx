
import React, { useState } from 'react';
import { Student, Settings, RewardItem, BadgeConfig } from '../types';
import { ShoppingBag, Award, Coins, AlertCircle, Backpack, Check, Ticket } from 'lucide-react';
import { purchaseItem, useItem } from '../utils/gamification';
import { addLog } from '../utils/logger';

interface Props {
    student: Student;
    settings: Settings;
    onUpdateStudent: (updatedStudent: Student) => void;
    onClose: () => void;
}

const GamificationPanel: React.FC<Props> = ({ student, settings, onUpdateStudent, onClose }) => {
    const [view, setView] = useState<'store' | 'badges' | 'inventory'>('store');

    const handleBuy = (item: RewardItem) => {
        if (!window.confirm(`Bạn muốn đổi "${item.label}" với giá ${item.cost} Xu?`)) return;
        
        const updatedStudent = purchaseItem(student, item);
        if (updatedStudent) {
            onUpdateStudent(updatedStudent);
            addLog('SHOP', `${student.name} đã đổi quà: ${item.label} (-${item.cost} xu)`);
            alert("Đổi quà thành công! Món quà đã được thêm vào Túi đồ.");
        } else {
            alert("Bạn không đủ Xu để đổi món quà này!");
        }
    };

    const handleUseItem = (itemId: string) => {
        const itemConfig = settings.gamification.rewards.find(r => r.id === itemId);
        const itemName = itemConfig ? itemConfig.label : 'Món quà';

        if (!window.confirm(`Xác nhận sử dụng "${itemName}" cho học sinh ${student.name}?`)) return;

        const updatedStudent = useItem(student, itemId);
        if (updatedStudent) {
            onUpdateStudent(updatedStudent);
            addLog('SHOP', `${student.name} đã sử dụng vật phẩm: ${itemName}`);
            alert(`Đã sử dụng "${itemName}" thành công!`);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-6 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-white text-orange-600 w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg border-4 border-orange-300">
                            {student.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{student.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-black bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                                    <Coins size={16} className="text-yellow-300" /> 
                                    Số dư: <span className="text-yellow-300 font-bold text-lg">{student.balance || 0}</span> Xu
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-full transition-colors">
                        ✕ Đóng
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b overflow-x-auto">
                    <button 
                        onClick={() => setView('store')}
                        className={`flex-1 py-4 font-bold text-center flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${view === 'store' ? 'text-orange-600 border-b-4 border-orange-500 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <ShoppingBag size={20} /> Cửa Hàng
                    </button>
                    <button 
                        onClick={() => setView('inventory')}
                        className={`flex-1 py-4 font-bold text-center flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${view === 'inventory' ? 'text-green-600 border-b-4 border-green-500 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Backpack size={20} /> Túi Đồ ({student.inventory ? student.inventory.length : 0})
                    </button>
                    <button 
                        onClick={() => setView('badges')}
                        className={`flex-1 py-4 font-bold text-center flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${view === 'badges' ? 'text-indigo-600 border-b-4 border-indigo-500 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Award size={20} /> Bộ Sưu Tập
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {view === 'store' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {settings.gamification.rewards.map(item => (
                                <div key={item.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow flex flex-col overflow-hidden">
                                    <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                        <ShoppingBag size={40} className="text-gray-400 opacity-50"/>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <h3 className="font-bold text-gray-800 text-lg">{item.label}</h3>
                                        <p className="text-sm text-gray-500 mt-1 flex-1">{item.description || 'Không có mô tả'}</p>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="font-bold text-orange-600 flex items-center gap-1">
                                                <Coins size={16}/> {item.cost}
                                            </span>
                                            <button 
                                                onClick={() => handleBuy(item)}
                                                disabled={(student.balance || 0) < item.cost}
                                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                                    (student.balance || 0) >= item.cost 
                                                    ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200 shadow-lg' 
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                            >
                                                {(student.balance || 0) >= item.cost ? 'Đổi ngay' : 'Không đủ xu'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {view === 'inventory' && (
                        <div>
                             {(!student.inventory || student.inventory.length === 0) ? (
                                 <div className="text-center py-20 opacity-50">
                                     <Backpack size={64} className="mx-auto mb-4 text-gray-300"/>
                                     <h3 className="text-xl font-bold text-gray-400">Túi đồ trống rỗng</h3>
                                     <p className="text-gray-400">Hãy vào Cửa hàng để đổi quà nhé!</p>
                                 </div>
                             ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {student.inventory.map((invItem) => {
                                        const itemConfig = settings.gamification.rewards.find(r => r.id === invItem.itemId);
                                        return (
                                            <div key={invItem.itemId} className="bg-white p-4 rounded-xl border border-green-200 shadow-sm flex items-center gap-4">
                                                <div className="w-16 h-16 bg-green-50 rounded-lg flex items-center justify-center text-green-600 shrink-0 relative">
                                                    <Ticket size={32} />
                                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                                                        x{invItem.count}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-800">{itemConfig ? itemConfig.label : 'Vật phẩm cũ'}</h3>
                                                    <p className="text-xs text-gray-500 line-clamp-2">{itemConfig ? itemConfig.description : ''}</p>
                                                    <button 
                                                        onClick={() => handleUseItem(invItem.itemId)}
                                                        className="mt-2 bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 flex items-center gap-1 font-medium"
                                                    >
                                                        <Check size={12} /> Sử dụng
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                             )}
                        </div>
                    )}

                    {view === 'badges' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {settings.gamification.badges.map(badge => {
                                const isUnlocked = (student.badges || []).includes(badge.id);
                                return (
                                    <div key={badge.id} className={`flex items-center p-4 rounded-xl border-2 transition-all ${isUnlocked ? 'bg-white border-indigo-100 shadow-sm' : 'bg-gray-100 border-gray-200 opacity-70 grayscale'}`}>
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl mr-4 ${isUnlocked ? 'bg-indigo-50' : 'bg-gray-200'}`}>
                                            {badge.icon}
                                        </div>
                                        <div>
                                            <h3 className={`font-bold ${isUnlocked ? 'text-indigo-900' : 'text-gray-500'}`}>{badge.label}</h3>
                                            <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                                            {isUnlocked ? (
                                                <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Đã đạt được</span>
                                            ) : (
                                                <span className="inline-block mt-2 text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                    <AlertCircle size={10}/> Chưa mở khóa
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GamificationPanel;