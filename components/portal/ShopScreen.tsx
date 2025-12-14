
import React, { useState } from 'react';
import { Student, Settings, RewardItem, AvatarItem, FrameItem } from '../../types';
import { ShoppingBag, Smile, LayoutTemplate, Backpack, Award, Coins, Ticket, Check, CheckCircle, AlertCircle } from 'lucide-react';
import { createPurchaseOrder, useFunctionalItem, equipAvatar, equipFrame } from '../../utils/gamification';
import { getPendingOrders, savePendingOrders } from '../../services/dataService';

interface Props {
    currentUser: Student;
    settings: Settings;
    onUpdateUser: (s: Student) => void;
    onLoading: (l: boolean) => void;
}

const ShopScreen: React.FC<Props> = ({ currentUser, settings, onUpdateUser, onLoading }) => {
    const [shopTab, setShopTab] = useState<'STORE' | 'AVATARS' | 'FRAMES' | 'INVENTORY' | 'BADGES'>('STORE');

    const handleRequestBuy = async (item: RewardItem | AvatarItem | FrameItem, type: 'REWARD' | 'AVATAR' | 'FRAME') => {
        if (!window.confirm(`Gửi yêu cầu đổi "${item.label}" với giá ${item.cost} Xu?`)) return;
        const result = createPurchaseOrder(currentUser, item, type);
        if (result.success && result.order) {
            onUpdateUser(result.student);
            
            // Sync order
            const currentOrders = getPendingOrders();
            savePendingOrders([...currentOrders, result.order]);
            
            // Try to sync with cloud if possible (handled by parent usually, but simple local save here is OK for now)
            alert("Đã gửi yêu cầu! Xu đã được trừ tạm thời. Vui lòng đợi giáo viên duyệt.");
        } else { alert("Bạn không đủ Xu để đổi món quà này!"); }
    };

    const handleUseItem = (itemId: string) => {
        const itemConfig = settings.gamification.rewards.find(r => r.id === itemId);
        if (itemConfig?.type === 'IMMUNITY') { alert("Thẻ này chỉ được sử dụng bởi Giáo viên khi duyệt lỗi vi phạm."); return; }
        if (!window.confirm(`Xác nhận sử dụng?`)) return;
        const updatedStudent = useFunctionalItem(currentUser, itemId, settings);
        if (updatedStudent) { onUpdateUser(updatedStudent); alert(`Đã sử dụng thành công!`); }
    };

    const handleEquip = (type: 'AVATAR' | 'FRAME', item: AvatarItem | FrameItem) => {
        let updated;
        if (type === 'AVATAR') updated = equipAvatar(currentUser, item as AvatarItem); else updated = equipFrame(currentUser, item as FrameItem);
        onUpdateUser(updated); alert("Đã thay đổi trang bị!");
    };

    return (
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
                             const owned = currentUser.ownedAvatars?.includes(avt.id);
                             const equipped = currentUser.avatarUrl === avt.url;
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
                             const owned = currentUser.ownedFrames?.includes(frm.id);
                             const equipped = currentUser.frameUrl === frm.image;
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
                         {!currentUser.inventory?.length && <div className="text-center text-gray-400 mt-10">Túi trống rỗng.</div>}
                         {currentUser.inventory?.map(inv => {
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
                             const unlocked = currentUser.badges?.includes(bg.id);
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
    );
};

export default ShopScreen;
