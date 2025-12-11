
import React, { useState, useEffect, useMemo } from 'react';
import { Student, ConductRecord, Settings, AcademicRank, BehaviorItem } from '../types';
import { getStudents, getConductRecords, saveConductRecords, getSettings, saveSettings, uploadToCloud, saveStudents } from '../services/dataService';
import { CheckSquare, PieChart as PieChartIcon, Settings as SettingsIcon, CloudUpload, Clock } from 'lucide-react';
import { addLog } from '../utils/logger';
import { generateClassAnalysis } from '../utils/analytics';
import { calculateWeeklyCoins, checkBadges } from '../utils/gamification';
import GamificationPanel from './GamificationPanel';

// Sub Components
import InputView from './conduct/InputView';
import StatsView from './conduct/StatsView';
import SettingsModal from './conduct/SettingsModal';
import StudentDetailModal from './conduct/StudentDetailModal';
import AttendanceReport from './conduct/AttendanceReport';

interface Props {
    setHasUnsavedChanges: (val: boolean) => void;
}

const ConductManager: React.FC<Props> = ({ setHasUnsavedChanges }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<ConductRecord[]>([]);
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [viewMode, setViewMode] = useState<'input' | 'stats' | 'attendance'>('input');
  
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);

  // Gamification State
  const [showGamification, setShowGamification] = useState(false);
  const [selectedStudentForShop, setSelectedStudentForShop] = useState<Student | null>(null);

  const [statsStartWeek, setStatsStartWeek] = useState(1);
  const [statsEndWeek, setStatsEndWeek] = useState(4);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStudents(getStudents());
    setRecords(getConductRecords());
    setSettings(getSettings());
  }, []);

  useEffect(() => {
    if (viewMode === 'stats') {
         const maxWeek = records.length > 0 ? Math.max(...records.map(r => r.week)) : 1;
         setStatsEndWeek(maxWeek);
    }
  }, [viewMode, records.length]);

  const activeStudents = useMemo(() => students.filter(s => s.isActive !== false), [students]);
  const isLocked = useMemo(() => settings.lockedWeeks?.includes(selectedWeek), [settings.lockedWeeks, selectedWeek]);
  
  const classAlerts = useMemo(() => {
      return generateClassAnalysis(students, records, settings, statsEndWeek);
  }, [students, records, settings, statsEndWeek]);
  
  const handleUpdateStudent = (updatedStudent: Student) => {
      const newStudents = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      setStudents(newStudents);
      saveStudents(newStudents);
      // Update the selected student reference if needed so the modal updates
      if (selectedStudentForShop?.id === updatedStudent.id) {
          setSelectedStudentForShop(updatedStudent);
      }
  };

  const calculateAllGamification = () => {
      const updatedStudents = students.map(student => {
          const unlocked = checkBadges(student, records, settings);
          const newBadges = Array.from(new Set([...(student.badges || []), ...unlocked]));
          
          if (newBadges.length !== (student.badges || []).length) {
               return { ...student, badges: newBadges };
          }
          return student;
      });
      setStudents(updatedStudents);
      saveStudents(updatedStudents);
      addLog('GAME', 'Đã cập nhật danh hiệu cho toàn lớp.');
  };

  const handleOpenGamification = (student: Student) => {
      // Always get the latest data from the students array
      const currentStudentData = students.find(s => s.id === student.id) || student;
      
      const unlocked = checkBadges(currentStudentData, records, settings);
      const updatedStudent = { 
          ...currentStudentData, 
          badges: Array.from(new Set([...(currentStudentData.badges || []), ...unlocked])) 
      };

      // If new badges found, save them
      if (unlocked.some(b => !(currentStudentData.badges || []).includes(b))) {
          const newAll = students.map(s => s.id === student.id ? updatedStudent : s);
          setStudents(newAll);
          saveStudents(newAll);
      }
      
      setSelectedStudentForShop(updatedStudent);
      setShowGamification(true);
  };

  const updateSettings = (partialSettings: any) => {
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
      const finalRecs = records.map(rec => {
          let hasChange = false;
          let newViolations = [...rec.violations];
          let newPositives = [...(rec.positiveBehaviors || [])];
          if (!isPositive) { if (newViolations.includes(oldName)) { newViolations = newViolations.map(v => v === oldName ? newName : v); hasChange = true; } } 
          else { if (newPositives.includes(oldName)) { newPositives = newPositives.map(p => p === oldName ? newName : p); hasChange = true; } }
          return hasChange ? { ...rec, violations: newViolations, positiveBehaviors: newPositives } : rec;
      });
      setRecords(finalRecs);
      saveConductRecords(finalRecs);
  };

  const updateRecord = (studentId: string, week: number, updates: Partial<ConductRecord>) => {
    if (isLocked) return;
    const existingIdx = records.findIndex(r => r.studentId === studentId && r.week === week);
    let newRecords = [...records];
    if (existingIdx > -1) { newRecords[existingIdx] = { ...newRecords[existingIdx], ...updates }; } 
    else { newRecords.push({ id: `CON-${studentId}-W${week}`, studentId, week, score: settings.defaultScore, violations: [], positiveBehaviors: [], note: '', ...updates }); }
    setRecords(newRecords);
    saveConductRecords(newRecords);
    setHasUnsavedChanges(true);
  };

  const handleTagChange = (studentId: string, week: number, label: string, points: number, delta: number, isPositive: boolean) => {
      if (isLocked) return;
      const rec = records.find(r => r.studentId === studentId && r.week === week);
      const currentList = isPositive ? (rec?.positiveBehaviors || []) : (rec?.violations || []);
      const currentScore = rec ? rec.score : settings.defaultScore;
      let newList = [...currentList];
      let newScore = currentScore;
      if (delta > 0) { newList.push(label); newScore = currentScore + points; } 
      else { const idx = newList.indexOf(label); if (idx > -1) { newList.splice(idx, 1); newScore = currentScore - points; } }
      newScore = Math.max(0, Math.min(100, newScore));
      updateRecord(studentId, week, { [isPositive ? 'positiveBehaviors' : 'violations']: newList, score: newScore });
  };

  const getRankFromScore = (s: number) => {
    if (s >= settings.thresholds.good) return AcademicRank.GOOD;
    if (s >= settings.thresholds.fair) return AcademicRank.FAIR;
    if (s >= settings.thresholds.pass) return AcademicRank.PASS;
    return AcademicRank.FAIL;
  };
  const getRankColor = (rank: string) => {
    switch (rank) {
        case AcademicRank.GOOD: return 'bg-green-100 text-green-800 border-green-200';
        case AcademicRank.FAIR: return 'bg-blue-100 text-blue-800 border-blue-200';
        case AcademicRank.PASS: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default: return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const handleScoreChange = (studentId: string, week: number, val: string) => { if (isLocked) return; const num = parseInt(val); if (isNaN(num)) return; updateRecord(studentId, week, { score: num }); };
  const handleNoteChange = (studentId: string, week: number, val: string) => { if (isLocked) return; updateRecord(studentId, week, { note: val }); };
  const handleClearStudentData = (studentId: string) => { if (isLocked) return; if(!window.confirm("Xóa dữ liệu tuần này?")) return; updateRecord(studentId, selectedWeek, { score: settings.defaultScore, violations: [], positiveBehaviors: [], note: '' }); };
  
  const handleCalculateCoinsForWeek = () => {
      // 1. Check Locked
      if (!isLocked) {
          alert("Vui lòng KHÓA Tuần này trước khi tính Xu.\n(Để đảm bảo dữ liệu hạnh kiểm không thay đổi trong quá trình tính toán).");
          return;
      }

      // 2. Check Processed
      const weekKey = `coins_week_${selectedWeek}`;
      if (settings.processedWeeks?.includes(weekKey)) {
          alert(`Bạn đã tính xu cho Tuần ${selectedWeek} rồi! Nếu muốn tính lại, hãy dùng nút "Hoàn tác Xu" trước.`);
          return;
      }

      if (!window.confirm(`Bạn muốn tính Xu cho Tuần ${selectedWeek}?\nHệ thống sẽ tính toán dựa trên xếp loại, hành vi tốt và sự tiến bộ.`)) return;
      
      let totalCoins = 0;
      const summary: string[] = [];

      // Create new array reference for students
      const newStudents = students.map(s => {
          if (!s.isActive) return s;

          const rec = records.find(r => r.studentId === s.id && r.week === selectedWeek);
          const prev = records.find(r => r.studentId === s.id && r.week === selectedWeek - 1);
          const earned = calculateWeeklyCoins(s, rec, prev, settings);
          
          if (earned > 0) {
              totalCoins += earned;
              summary.push(`${s.name}: +${earned}`);
          }
          const currentBalance = s.balance || 0;
          return { ...s, balance: currentBalance + earned };
      });

      setStudents(newStudents);
      saveStudents(newStudents);
      
      // Update Processed Weeks
      const newProcessed = [...(settings.processedWeeks || []), weekKey];
      updateSettings({ processedWeeks: newProcessed });

      // Trigger Badge Check immediately
      calculateAllGamification(); 
      
      const summaryText = summary.length > 0 ? summary.slice(0, 10).join('\n') + (summary.length > 10 ? `\n... và ${summary.length - 10} người khác.` : '') : 'Không ai nhận được xu.';
      alert(`Đã hoàn tất tính xu Tuần ${selectedWeek}!\n\nTổng cộng: ${totalCoins} xu phát ra.\n\nChi tiết:\n${summaryText}`);
  };

  const handleUndoCoinsForWeek = () => {
      const weekKey = `coins_week_${selectedWeek}`;
      if (!settings.processedWeeks?.includes(weekKey)) {
          alert(`Tuần ${selectedWeek} chưa được tính xu nên không thể hoàn tác.`);
          return;
      }

      if (!window.confirm(`CẢNH BÁO: Bạn muốn thu hồi Xu đã phát trong Tuần ${selectedWeek}?\n\nHệ thống sẽ tính toán lại số xu đã phát (dựa trên điểm hiện tại) và trừ đi từ tài khoản học sinh.`)) return;

      let totalDeducted = 0;
      const newStudents = students.map(s => {
          if (!s.isActive) return s;

          const rec = records.find(r => r.studentId === s.id && r.week === selectedWeek);
          const prev = records.find(r => r.studentId === s.id && r.week === selectedWeek - 1);
          // Re-calculate exactly what would have been given
          const earned = calculateWeeklyCoins(s, rec, prev, settings);
          
          if (earned > 0) {
              totalDeducted += earned;
          }
          const currentBalance = s.balance || 0;
          return { ...s, balance: Math.max(0, currentBalance - earned) };
      });

      setStudents(newStudents);
      saveStudents(newStudents);

      // Remove from processed weeks
      const newProcessed = (settings.processedWeeks || []).filter(w => w !== weekKey);
      updateSettings({ processedWeeks: newProcessed });

      alert(`Đã hoàn tác! Thu hồi tổng cộng ${totalDeducted} xu từ lớp.`);
  };

  const toggleLockWeek = () => {
    let newLocked = [...settings.lockedWeeks];
    if (isLocked) {
        if (!window.confirm(`Mở khóa Tuần ${selectedWeek}?`)) return;
        newLocked = newLocked.filter(w => w !== selectedWeek);
        addLog('LOCK', `Đã mở khóa Tuần ${selectedWeek}`);
    } else {
        newLocked.push(selectedWeek);
        addLog('LOCK', `Đã khóa Tuần ${selectedWeek}`);
    }
    updateSettings({ lockedWeeks: newLocked });
  };
  
  const handleClassBonus = () => { const reason = prompt("Lý do thưởng cả lớp:"); if (!reason) return; const points = parseInt(prompt("Số điểm cộng:", "2") || "0"); if (!points) return; const newRecords = [...records]; activeStudents.forEach(s => { const idx = newRecords.findIndex(r => r.studentId === s.id && r.week === selectedWeek); const label = `${reason} (+${points}đ)`; if (idx > -1) { const r = newRecords[idx]; newRecords[idx] = { ...r, score: Math.min(100, r.score + points), positiveBehaviors: [...(r.positiveBehaviors || []), label] }; } else { newRecords.push({ id: `CON-${s.id}-W${selectedWeek}`, studentId: s.id, week: selectedWeek, score: settings.defaultScore + points, violations: [], positiveBehaviors: [label], note: '' }); } }); setRecords(newRecords); saveConductRecords(newRecords); setHasUnsavedChanges(true); addLog('BATCH', `Đã cộng ${points}đ cho cả lớp: ${reason}`); };
  const handleClassPenalty = () => { const reason = prompt("Lý do trừ cả lớp:"); if (!reason) return; const points = parseInt(prompt("Số điểm trừ:", "2") || "0"); if (!points) return; const newRecords = [...records]; activeStudents.forEach(s => { const idx = newRecords.findIndex(r => r.studentId === s.id && r.week === selectedWeek); const label = `${reason} (-${points}đ)`; if (idx > -1) { const r = newRecords[idx]; newRecords[idx] = { ...r, score: Math.max(0, r.score - points), violations: [...r.violations, label] }; } else { newRecords.push({ id: `CON-${s.id}-W${selectedWeek}`, studentId: s.id, week: selectedWeek, score: settings.defaultScore - points, violations: [label], positiveBehaviors: [], note: '' }); } }); setRecords(newRecords); saveConductRecords(newRecords); setHasUnsavedChanges(true); addLog('BATCH', `Đã trừ ${points}đ cả lớp: ${reason}`); };
  const handleFillDefault = () => { if (!window.confirm("Tự động điền điểm mặc định?")) return; const newRecords = [...records]; let count = 0; activeStudents.forEach(s => { const exists = newRecords.find(r => r.studentId === s.id && r.week === selectedWeek); if (!exists) { newRecords.push({ id: `CON-${s.id}-W${selectedWeek}`, studentId: s.id, week: selectedWeek, score: settings.defaultScore, violations: [], positiveBehaviors: [] }); count++; } }); if (count > 0) { setRecords(newRecords); saveConductRecords(newRecords); setHasUnsavedChanges(true); addLog('BATCH', `Đã điền mặc định cho ${count} học sinh.`); } };
  const handleClearAllWeekData = () => { if (confirm(`Xóa toàn bộ dữ liệu Tuần ${selectedWeek}?`)) { const newRecords = records.filter(r => r.week !== selectedWeek); setRecords(newRecords); saveConductRecords(newRecords); setHasUnsavedChanges(true); addLog('BATCH', `Đã xóa dữ liệu Tuần ${selectedWeek}`); } };

  const handleCloudSave = async () => { setIsSaving(true); const success = await uploadToCloud(); setIsSaving(false); if (success) { setHasUnsavedChanges(false); alert("Đã lưu và đồng bộ thành công!"); } else { alert("Lưu thất bại."); } };
  
  const getWeekLabel = (weekNum: number) => {
      if (!settings.semesterStartDate) return `Tuần ${weekNum}`;
      const start = new Date(settings.semesterStartDate); start.setDate(start.getDate() + (weekNum - 1) * 7);
      const end = new Date(start); end.setDate(end.getDate() + 6);
      return `Tuần ${weekNum} (${start.getDate()}/${start.getMonth()+1} - ${end.getDate()}/${end.getMonth()+1})`;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {showSettings && (
          <SettingsModal 
            settings={settings}
            updateSettings={updateSettings}
            onClose={() => setShowSettings(false)}
            recalculateAllScores={recalculateAllScores}
            migrateBehaviorName={migrateBehaviorName}
          />
      )}

      {showGamification && selectedStudentForShop && (
          <GamificationPanel 
            student={selectedStudentForShop} 
            settings={settings} 
            onUpdateStudent={handleUpdateStudent} 
            onClose={() => { setShowGamification(false); setSelectedStudentForShop(null); }}
          />
      )}

      <StudentDetailModal 
        student={selectedStudentForDetail} 
        records={records} 
        settings={settings} 
        onClose={() => setSelectedStudentForDetail(null)} 
      />

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Quản Lý Hạnh Kiểm</h2>
            <div className="flex gap-2 mt-2">
                <button onClick={() => setViewMode('input')} className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${viewMode === 'input' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><CheckSquare size={14} className="inline mr-1"/> Nhập liệu</button>
                <button onClick={() => setViewMode('stats')} className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${viewMode === 'stats' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><PieChartIcon size={14} className="inline mr-1"/> Thống kê & Báo cáo</button>
                <button onClick={() => setViewMode('attendance')} className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${viewMode === 'attendance' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}><Clock size={14} className="inline mr-1"/> Báo cáo Điểm danh</button>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleCloudSave} disabled={isSaving} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-bold">{isSaving ? 'Đang lưu...' : <><CloudUpload size={18} /> Lưu & Sync</>}</button>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 text-gray-600 bg-white border px-3 py-2 rounded hover:bg-gray-100 shadow-sm"><SettingsIcon size={18} /> Cấu hình</button>
        </div>
      </div>

      {viewMode === 'input' && (
          <InputView 
             students={students} records={records} settings={settings}
             selectedWeek={selectedWeek} setSelectedWeek={setSelectedWeek}
             isLocked={!!isLocked} toggleLockWeek={toggleLockWeek} getWeekLabel={getWeekLabel}
             handleClassBonus={handleClassBonus} handleClassPenalty={handleClassPenalty}
             handleFillDefault={handleFillDefault} 
             handleCalculateCoinsForWeek={handleCalculateCoinsForWeek}
             handleUndoCoinsForWeek={handleUndoCoinsForWeek}
             handleClearAllWeekData={handleClearAllWeekData} handleScoreChange={handleScoreChange}
             handleTagChange={handleTagChange} handleNoteChange={handleNoteChange} handleClearStudentData={handleClearStudentData}
             handleOpenGamification={handleOpenGamification} setSelectedStudentForDetail={setSelectedStudentForDetail}
             getRankFromScore={getRankFromScore} getRankColor={getRankColor}
          />
      )}

      {viewMode === 'stats' && (
          <StatsView 
             students={students} records={records} settings={settings} classAlerts={classAlerts}
             statsStartWeek={statsStartWeek} statsEndWeek={statsEndWeek}
             setStatsStartWeek={setStatsStartWeek} setStatsEndWeek={setStatsEndWeek}
             getRankFromScore={getRankFromScore} getRankColor={getRankColor} getWeekLabel={getWeekLabel}
             setSelectedStudentForDetail={setSelectedStudentForDetail}
          />
      )}

      {viewMode === 'attendance' && (
          <AttendanceReport students={students} />
      )}
    </div>
  );
};

export default ConductManager;
