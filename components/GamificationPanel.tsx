
import React, { useState } from 'react';
import { Student, Settings, RewardItem, BadgeConfig } from '../types';
import { ShoppingBag, Award, Coins, AlertCircle } from 'lucide-react';
import { purchaseItem } from '../utils/gamification';
import { addLog } from '../utils/logger';

interface Props {
    student: Student;
    settings: Settings;
    onUpdateStudent: (updatedStudent: Student) => void;
    onClose: () => void;
}

const GamificationPanel: React.FC<Props> = ({ student, settings, onUpdateStudent, onClose }) => {
    const [view, setView] = useState<'store' | 'badges'>('store');

    const handleBuy = (item: RewardItem) => {
        if (!window.confirm(`Bạn muốn đổi "${item.label}" với giá ${item.cost} Xu?`)) return;
        
        const newBalance = purchaseItem(student, item);
        if (newBalance !== -1) {
            const updated = { ...student, balance: newBalance };
            onUpdateStudent(updated);
            addLog('SHOP', `${student.name} đã đổi quà: ${item.label} (-${item.cost} xu)`);
            alert("Đổi quà thành công! Hãy báo với giáo viên để nhận quà.");
        } else {
            alert("Bạn không đủ Xu để đổi món quà này!");
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
                <div className="flex border-b">
                    <button 
                        onClick={() => setView('store')}
                        className={`flex-1 py-4 font-bold text-center flex items-center justify-center gap-2 transition-colors ${view === 'store' ? 'text-orange-600 border-b-4 border-orange-500 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <ShoppingBag size={20} /> Cửa Hàng Đổi Quà
                    </button>
                    <button 
                        onClick={() => setView('badges')}
                        className={`flex-1 py-4 font-bold text-center flex items-center justify-center gap-2 transition-colors ${view === 'badges' ? 'text-indigo-600 border-b-4 border-indigo-500 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Award size={20} /> Bộ Sưu Tập Huy Hiệu
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {view === 'store' ? (
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
                    ) : (
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
