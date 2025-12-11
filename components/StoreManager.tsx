
import React, { useState, useEffect } from 'react';
import { Student, Settings } from '../types';
import { getStudents, getSettings, saveStudents, getConductRecords, saveSettings, saveConductRecords } from '../services/dataService';
import { Coins, Search, ShoppingBag, Gift, Settings as SettingsIcon } from 'lucide-react';
import GamificationPanel from './GamificationPanel';
import { checkBadges } from '../utils/gamification';
import SettingsModal from './conduct/SettingsModal';

const StoreManager: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const [records, setRecords] = useState(getConductRecords());

  useEffect(() => {
    setStudents(getStudents());
    setSettings(getSettings());
    setRecords(getConductRecords());
  }, []);

  const activeStudents = students.filter(s => s.isActive !== false);
  const filteredStudents = activeStudents.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleUpdateStudent = (updatedStudent: Student) => {
      const newStudents = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      setStudents(newStudents);
      saveStudents(newStudents);
      
      // Update the selected student reference if needed
      if (selectedStudent?.id === updatedStudent.id) {
          setSelectedStudent(updatedStudent);
      }
  };
  
  const handleUpdateSettings = (partialSettings: any) => {
      const newSettings = { ...settings, ...partialSettings };
      setSettings(newSettings);
      saveSettings(newSettings);
  };
  
  const recalculateAllScores = (newSettings: Settings) => {
      const currentRecords = records;
      const finalRecs = currentRecords.map(rec => {
          let score = newSettings.defaultScore;
          rec.violations.forEach(v => {
              const item = newSettings.behaviorConfig.violations.find(i => i.label === v);
              if (item) score += item.points;
              else { const match = v.match(/\(([+-]?\d+)đ\)/); if (match && match[1]) score += parseInt(match[1]); }
          });
          (rec.positiveBehaviors || []).forEach(p => {
               const item = newSettings.behaviorConfig.positives.find(i => i.label === p);
               if (item) score += item.points;
               else { const match = p.match(/\(([+-]?\d+)đ\)/); if (match && match[1]) score += parseInt(match[1]); }
          });
          return { ...rec, score: Math.max(0, Math.min(100, score)) };
      });
      setRecords(finalRecs);
      saveConductRecords(finalRecs);
  };
  
  const migrateBehaviorName = (oldName: string, newName: string, isPositive: boolean) => {
      // Mock implementation for Store usage, mainly passed to satisfy type check if SettingsModal is reused
  };

  const handleOpenShop = (student: Student) => {
      // Refresh badges when opening shop
      const currentStudentData = students.find(s => s.id === student.id) || student;
      const unlocked = checkBadges(currentStudentData, records, settings);
      
      let updatedStudent = { ...currentStudentData };
      
      // If new badges found, update student immediately
      if (unlocked.some(b => !(currentStudentData.badges || []).includes(b))) {
          const newBadges = Array.from(new Set([...(currentStudentData.badges || []), ...unlocked]));
          updatedStudent = { ...currentStudentData, badges: newBadges };
          
          const newAll = students.map(s => s.id === student.id ? updatedStudent : s);
          setStudents(newAll);
          saveStudents(newAll);
      }

      setSelectedStudent(updatedStudent);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
       {showSettings && (
           <SettingsModal 
                settings={settings} 
                updateSettings={handleUpdateSettings} 
                onClose={() => setShowSettings(false)}
                recalculateAllScores={recalculateAllScores}
                migrateBehaviorName={migrateBehaviorName}
            />
       )}
       
       <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
                 <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ShoppingBag className="text-orange-600"/> Cửa Hàng & Đổi Quà</h2>
                 <p className="text-gray-500 text-sm">Chọn học sinh để vào xem kho đồ, đổi quà hoặc mua Avatar.</p>
            </div>
            <div className="flex gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm học sinh..." 
                        className="pl-10 pr-4 py-2 border rounded-full w-64 focus:ring-2 focus:ring-orange-500 outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button onClick={() => setShowSettings(true)} className="bg-white border text-gray-700 px-3 py-2 rounded-full hover:bg-gray-100 flex items-center gap-2 shadow-sm font-medium">
                    <SettingsIcon size={18}/> Cấu hình Shop
                </button>
            </div>
       </div>

       {/* Student Grid */}
       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredStudents.map(student => (
                <div 
                    key={student.id} 
                    onClick={() => handleOpenShop(student)}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all group flex flex-col items-center text-center relative overflow-hidden"
                >
                    {/* Coin Badge */}
                    <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm z-10">
                        <Coins size={12}/> {student.balance || 0}
                    </div>

                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-5xl mb-3 group-hover:scale-110 transition-transform bg-gray-50 border-2 border-transparent group-hover:border-orange-200">
                        {student.avatarUrl ? (
                            <span>{student.avatarUrl}</span>
                        ) : (
                            <span className="text-2xl font-bold text-gray-600">{student.name.charAt(0)}</span>
                        )}
                    </div>
                    
                    <h3 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-orange-700 line-clamp-1">{student.name}</h3>
                    
                    {/* Badges Preview */}
                    <div className="flex gap-1 h-5 justify-center mb-2">
                         {student.badges?.slice(0, 3).map(bid => {
                             const badge = settings.gamification.badges.find(b => b.id === bid);
                             return badge ? <span key={bid} title={badge.label} className="text-xs">{badge.icon}</span> : null;
                         })}
                    </div>

                    <button className="mt-auto text-xs bg-white border border-orange-200 text-orange-600 px-3 py-1 rounded-full group-hover:bg-orange-600 group-hover:text-white transition-colors flex items-center gap-1">
                        <Gift size={12} /> Vào cửa hàng
                    </button>
                </div>
            ))}
       </div>

       {/* Shop Modal */}
       {selectedStudent && (
          <GamificationPanel 
            student={selectedStudent} 
            settings={settings} 
            onUpdateStudent={handleUpdateStudent} 
            onClose={() => setSelectedStudent(null)}
          />
      )}
    </div>
  );
};

export default StoreManager;
