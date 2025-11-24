import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Users, 
  LayoutGrid, 
  BarChart3, 
  Settings as SettingsIcon, 
  Save, 
  Download, 
  Upload, 
  Plus, 
  Trash2,
  FileSpreadsheet,
  Search,
  PieChart as PieChartIcon,
  CalendarRange,
  Camera,
  Eye,
  EyeOff,
  Filter,
  AlertTriangle,
  CheckCircle,
  FileJson,
  RefreshCw
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import html2canvas from 'html2canvas';
import { 
  Student, 
  AcademicPerformance, 
  Gender, 
  StudentRecord, 
  WeeklyConduct, 
  AppSettings,
  GRID_COLS,
  GRID_ROWS
} from './types';
import { generateSeatingChart } from './utils/seatingAlgo';

// --- Constants & Defaults ---
const DEFAULT_SETTINGS: AppSettings = {
  goodThreshold: 8.0,
  fairThreshold: 6.5,
  passThreshold: 5.0
};

const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444']; // Good, Pass, Fair, Poor colors

const MOCK_DATA_KEY = 'student_manager_data_v1';

// --- Components ---

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'list' | 'conduct' | 'stats' | 'seating' | 'settings'>('list');
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  
  // Stats State
  const [selectedStatsStudentId, setSelectedStatsStudentId] = useState<string>('');
  const [statsStartWeek, setStatsStartWeek] = useState<number>(1);
  const [statsEndWeek, setStatsEndWeek] = useState<number>(1);
  const [statsFilter, setStatsFilter] = useState<string>('ALL');

  // Seating State
  const [seatingChart, setSeatingChart] = useState<{r: number, c: number, student: Student | null}[]>([]);
  const [draggedSeatIndex, setDraggedSeatIndex] = useState<number | null>(null);
  const [isExportMode, setIsExportMode] = useState<boolean>(false);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // File Input Ref for Restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Forms
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<Gender>(Gender.MALE);
  const [newStudentAcademic, setNewStudentAcademic] = useState<AcademicPerformance>(AcademicPerformance.PASS);
  const [newStudentTalkative, setNewStudentTalkative] = useState(false);
  const [importText, setImportText] = useState('');

  // --- Effects ---

  // Load Data
  useEffect(() => {
    const savedData = localStorage.getItem(MOCK_DATA_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setStudents(parsed.students || []);
        setRecords(parsed.records || []);
        setSettings(parsed.settings || DEFAULT_SETTINGS);
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  // Update Stats End Week when currentWeek changes (if not manually set)
  useEffect(() => {
    setStatsEndWeek(currentWeek);
  }, [currentWeek]);

  // Save Data Helper
  const saveData = useCallback((newStudents: Student[], newRecords: StudentRecord[], newSettings: AppSettings) => {
    const data = { students: newStudents, records: newRecords, settings: newSettings };
    localStorage.setItem(MOCK_DATA_KEY, JSON.stringify(data));
  }, []);

  // Persist when state changes
  useEffect(() => {
    saveData(students, records, settings);
  }, [students, records, settings, saveData]);

  // --- Logic Helpers ---

  const addStudent = () => {
    if (!newStudentName.trim()) return;
    const newStudent: Student = {
      id: crypto.randomUUID(),
      name: newStudentName,
      gender: newStudentGender,
      academic: newStudentAcademic,
      isTalkative: newStudentTalkative
    };
    setStudents([...students, newStudent]);
    setNewStudentName('');
    setIsAddModalOpen(false);
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const processImport = () => {
    const lines = importText.split('\n');
    const newStudents: Student[] = [];
    
    lines.forEach(line => {
      if (!line.trim()) return;

      // Handle both Tab (Excel) and Comma delimiters
      let parts = line.includes('\t') ? line.split('\t') : line.split(',');
      parts = parts.map(s => s.trim());
      
      // Expected format: Name, Gender(Nam/Nu), Academic(Tot/Dat/Chua), Talkative(Yes/No)
      if (parts.length >= 1) {
        const name = parts[0];
        if (!name) return;

        let gender = Gender.MALE;
        if (parts[1] && (parts[1].toLowerCase() === 'nữ' || parts[1].toLowerCase() === 'nu')) gender = Gender.FEMALE;
        
        let academic = AcademicPerformance.PASS;
        if (parts[2]) {
          const ac = parts[2].toLowerCase();
          if (ac.includes('tốt') || ac.includes('giỏi')) academic = AcademicPerformance.GOOD;
          else if (ac.includes('chưa') || ac.includes('yếu') || ac.includes('kém')) academic = AcademicPerformance.POOR;
        }

        let talkative = false;
        if (parts[3]) {
          const t = parts[3].toLowerCase();
          if (t.includes('có') || t === 'y' || t === 'yes' || t === 'x') talkative = true;
        }

        newStudents.push({
          id: crypto.randomUUID(),
          name,
          gender,
          academic,
          isTalkative: talkative
        });
      }
    });

    setStudents([...students, ...newStudents]);
    setImportText('');
    setIsImportModalOpen(false);
  };

  const updateConduct = (studentId: string, week: number, field: 'score' | 'violations', value: any) => {
    setRecords(prev => {
      const existingRecordIndex = prev.findIndex(r => r.studentId === studentId);
      let newRecords = [...prev];
      
      if (existingRecordIndex === -1) {
        // Create new student record
        newRecords.push({
          studentId,
          conducts: [{ week, score: field === 'score' ? Number(value) : 10, violations: field === 'violations' ? value : '' }]
        });
      } else {
        const studentRecord = { ...newRecords[existingRecordIndex] };
        const weekIndex = studentRecord.conducts.findIndex(c => c.week === week);
        
        if (weekIndex === -1) {
          studentRecord.conducts.push({
            week,
            score: field === 'score' ? Number(value) : 10,
            violations: field === 'violations' ? value : ''
          });
        } else {
          const updatedWeek = { ...studentRecord.conducts[weekIndex] };
          if (field === 'score') updatedWeek.score = Number(value);
          else updatedWeek.violations = value;
          studentRecord.conducts[weekIndex] = updatedWeek;
        }
        newRecords[existingRecordIndex] = studentRecord;
      }
      return newRecords;
    });
  };

  // Helper to check if data exists for warning system
  const isConductEntered = (studentId: string, week: number) => {
    const record = records.find(r => r.studentId === studentId);
    return record?.conducts.some(c => c.week === week);
  };

  const getConduct = (studentId: string, week: number): WeeklyConduct => {
    const record = records.find(r => r.studentId === studentId);
    const w = record?.conducts.find(c => c.week === week);
    return w || { week, score: 10, violations: '' };
  };

  const fillMissingConducts = () => {
    if (!confirm(`Bạn có chắc muốn tự động điền điểm 10 cho tất cả học sinh chưa nhập điểm tuần ${currentWeek}?`)) return;
    
    const updates: {studentId: string, week: number, score: number, violations: string}[] = [];
    students.forEach(s => {
      if (!isConductEntered(s.id, currentWeek)) {
        updates.push({ studentId: s.id, week: currentWeek, score: 10, violations: '' });
      }
    });

    setRecords(prev => {
      let newRecords = [...prev];
      updates.forEach(u => {
         const idx = newRecords.findIndex(r => r.studentId === u.studentId);
         if (idx === -1) {
            newRecords.push({ studentId: u.studentId, conducts: [{ week: u.week, score: u.score, violations: u.violations }] });
         } else {
            const sRec = { ...newRecords[idx] };
            sRec.conducts = [...sRec.conducts, { week: u.week, score: u.score, violations: u.violations }];
            newRecords[idx] = sRec;
         }
      });
      return newRecords;
    });
  };

  // Calculate average for a specific range of weeks
  const calculateRangeAverage = (studentId: string, start: number, end: number) => {
    const record = records.find(r => r.studentId === studentId);
    if (!record || record.conducts.length === 0) return 10;
    
    // Filter conducts within range
    const rangeConducts = record.conducts.filter(c => c.week >= start && c.week <= end);
    
    // If no data in range, check if there's any data at all? 
    // If no data in range, we return 10 as default good behavior unless recorded otherwise.
    if (rangeConducts.length === 0) return 10;

    const sum = rangeConducts.reduce((acc, curr) => acc + curr.score, 0);
    return sum / rangeConducts.length;
  };

  const calculateTotalAverage = (studentId: string) => {
    const record = records.find(r => r.studentId === studentId);
    if (!record || record.conducts.length === 0) return 10;
    const sum = record.conducts.reduce((acc, curr) => acc + curr.score, 0);
    return sum / record.conducts.length;
  };

  const getClassification = (score: number) => {
    if (score >= settings.goodThreshold) return 'Tốt';
    if (score >= settings.fairThreshold) return 'Khá';
    if (score >= settings.passThreshold) return 'Đạt';
    return 'Chưa đạt';
  };

  const exportData = () => {
    const dataStr = JSON.stringify({ students, records, settings }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_manager_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  };

  const exportToCSV = () => {
    // BOM for Excel
    const BOM = "\uFEFF"; 
    let csv = BOM + "ID,Họ Tên,Giới Tính,Học Lực,Hay Nói Chuyện,Điểm TB Hạnh Kiểm\n";
    students.forEach(s => {
      const avg = calculateTotalAverage(s.id).toFixed(2);
      // Clean data for CSV
      const name = s.name.replace(/"/g, '""');
      csv += `"${s.id}","${name}","${s.gender}","${s.academic}","${s.isTalkative ? 'Có' : ''}","${avg}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh_sach_lop_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed.students || !Array.isArray(parsed.students)) {
           alert("File dữ liệu không hợp lệ (thiếu danh sách học sinh).");
           return;
        }

        const incomingStudents: Student[] = parsed.students;
        const incomingRecords: StudentRecord[] = parsed.records || [];
        const incomingSettings: AppSettings = parsed.settings || DEFAULT_SETTINGS;

        const confirmMsg = `Tìm thấy ${incomingStudents.length} học sinh trong file backup.\n\n` +
                           `Chọn hành động:\n` + 
                           `- OK: GỘP dữ liệu (Thêm học sinh mới, cập nhật điểm cũ)\n` +
                           `- Cancel: THAY THẾ (Xóa dữ liệu hiện tại, dùng dữ liệu backup)`;

        if (window.confirm(confirmMsg)) {
             // --- MERGE LOGIC ---
             const studentMap = new Map(students.map(s => [s.id, s]));
             incomingStudents.forEach(s => studentMap.set(s.id, s));
             const mergedStudents = Array.from(studentMap.values());
             
             const recordMap = new Map(records.map(r => [r.studentId, r]));
             incomingRecords.forEach(incRec => {
                 const existingRec = recordMap.get(incRec.studentId);
                 if (existingRec) {
                     const conductMap = new Map(existingRec.conducts.map(c => [c.week, c]));
                     incRec.conducts.forEach(c => conductMap.set(c.week, c));
                     const sortedConducts = Array.from(conductMap.values()).sort((a,b) => a.week - b.week);
                     recordMap.set(incRec.studentId, { ...existingRec, conducts: sortedConducts });
                 } else {
                     recordMap.set(incRec.studentId, incRec);
                 }
             });
             const mergedRecords = Array.from(recordMap.values());

             setStudents(mergedStudents);
             setRecords(mergedRecords);
             
             alert(`Đã gộp dữ liệu! Tổng số học sinh: ${mergedStudents.length}`);
        } else {
             // --- REPLACE LOGIC ---
             if (window.confirm("CẢNH BÁO: Bạn chắc chắn muốn XÓA TOÀN BỘ dữ liệu hiện tại để thay thế bằng file backup không?")) {
                setStudents(incomingStudents);
                setRecords(incomingRecords);
                setSettings(incomingSettings);
                alert("Đã khôi phục dữ liệu thành công!");
             }
        }
      } catch (err) {
        console.error(err);
        alert("Lỗi đọc file. Vui lòng kiểm tra file JSON.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const runSeating = () => {
    const chart = generateSeatingChart(students);
    setSeatingChart(chart);
  };

  const exportSeatingImage = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        useCORS: true
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `so_do_lop_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSeatIndex(index);
    // Needed for Firefox
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedSeatIndex === null) return;

    // Swap logic
    const newChart = [...seatingChart];
    const temp = newChart[targetIndex].student;
    newChart[targetIndex].student = newChart[draggedSeatIndex].student;
    newChart[draggedSeatIndex].student = temp;

    setSeatingChart(newChart);
    setDraggedSeatIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
     e.preventDefault();
     e.dataTransfer.dropEffect = 'move';
  };

  // --- Views ---

  const renderStudentList = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Danh Sách Học Sinh ({students.length})</h2>
        <div className="space-x-2 flex">
          <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
            <Upload size={18} /> Nhập Excel/CSV
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
            <Plus size={18} /> Thêm Mới
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 uppercase text-sm leading-normal">
              <th className="py-3 px-4">Họ Tên</th>
              <th className="py-3 px-4">Giới Tính</th>
              <th className="py-3 px-4">Học Lực</th>
              <th className="py-3 px-4 text-center">Hay Nói Chuyện</th>
              <th className="py-3 px-4 text-center">Hành Động</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 text-sm">
            {students.map((student) => (
              <tr key={student.id} className="border-b hover:bg-slate-50">
                <td className="py-3 px-4 font-medium">{student.name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${student.gender === Gender.MALE ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                    {student.gender}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <select 
                    value={student.academic}
                    onChange={(e) => updateStudent(student.id, { academic: e.target.value as AcademicPerformance })}
                    className={`font-semibold bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 outline-none pb-1 cursor-pointer transition-colors ${
                      student.academic === AcademicPerformance.GOOD ? 'text-green-600' :
                      student.academic === AcademicPerformance.POOR ? 'text-red-600' : 'text-yellow-600'
                    }`}
                  >
                    <option value={AcademicPerformance.GOOD} className="text-green-600">Tốt</option>
                    <option value={AcademicPerformance.PASS} className="text-yellow-600">Đạt</option>
                    <option value={AcademicPerformance.POOR} className="text-red-600">Chưa đạt</option>
                  </select>
                </td>
                <td className="py-3 px-4 text-center">
                   <div className="flex justify-center items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={student.isTalkative} 
                        onChange={(e) => updateStudent(student.id, { isTalkative: e.target.checked })}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer accent-red-500"
                      />
                      {student.isTalkative && <span className="text-xs text-red-500 font-bold">⚠️</span>}
                   </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <button 
                    onClick={() => {
                       if(confirm("Bạn có chắc muốn xóa học sinh này?")) {
                          setStudents(students.filter(s => s.id !== student.id));
                       }
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">Chưa có dữ liệu học sinh</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderConduct = () => {
    const missingStudents = students.filter(s => !isConductEntered(s.id, currentWeek));
    const missingCount = missingStudents.length;

    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Sổ Hạnh Kiểm</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Tuần:</label>
            <select 
              value={currentWeek} 
              onChange={(e) => setCurrentWeek(Number(e.target.value))}
              className="border rounded p-1"
            >
              {[...Array(35)].map((_, i) => (
                <option key={i} value={i + 1}>Tuần {i + 1}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Warnings & Actions */}
        {missingCount > 0 ? (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle size={20} />
              <span className="font-medium">Cảnh báo: Có {missingCount} học sinh chưa nhập điểm tuần này!</span>
            </div>
            <button 
              onClick={fillMissingConducts}
              className="text-sm px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 font-bold"
            >
              Nạp điểm mặc định (10)
            </button>
          </div>
        ) : (
          <div className="mb-4 bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2 text-green-800">
            <CheckCircle size={20} />
            <span className="font-medium">Tất cả học sinh đã được nhập điểm.</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm">
                <th className="py-3 px-4 w-1/4">Họ Tên</th>
                <th className="py-3 px-4 w-32 text-center">Điểm Tuần {currentWeek}</th>
                <th className="py-3 px-4 w-32 text-center">Xếp loại</th>
                <th className="py-3 px-4 w-1/3">Vi Phạm Tuần {currentWeek}</th>
                <th className="py-3 px-4 w-24 text-center">TB Chung</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const current = getConduct(student.id, currentWeek);
                const isEntered = isConductEntered(student.id, currentWeek);
                const avg = calculateTotalAverage(student.id);
                const currentClass = getClassification(current.score);
                return (
                  <tr key={student.id} className={`border-b hover:bg-slate-50 transition-colors ${!isEntered ? 'bg-amber-50' : ''}`}>
                    <td className="py-2 px-4 font-medium">
                      {student.name}
                      {!isEntered && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1 rounded">Chưa nhập</span>}
                    </td>
                    <td className="py-2 px-4 text-center relative">
                      <input 
                        type="number" 
                        min="0" max="10" step="0.5"
                        value={current.score}
                        onChange={(e) => updateConduct(student.id, currentWeek, 'score', e.target.value)}
                        className={`w-16 p-1 border rounded text-center font-bold text-slate-700 focus:ring-2 ring-blue-500 outline-none ${!isEntered ? 'border-amber-400' : ''}`}
                      />
                    </td>
                    <td className="py-2 px-4 text-center">
                      {isEntered && (
                        <span className={`px-2 py-1 rounded text-xs font-bold
                           ${currentClass === 'Tốt' ? 'bg-green-100 text-green-700' : 
                             currentClass === 'Khá' ? 'bg-blue-100 text-blue-700' :
                             currentClass === 'Đạt' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}
                        `}>
                          {currentClass}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <input 
                        type="text" 
                        placeholder="Nhập vi phạm..."
                        value={current.violations}
                        onChange={(e) => updateConduct(student.id, currentWeek, 'violations', e.target.value)}
                        className="w-full p-1 border rounded focus:ring-2 ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-700">{avg.toFixed(1)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    // 1. Class Overview Stats with Range
    const rangeStatsList = students.map(s => {
       const avg = calculateRangeAverage(s.id, statsStartWeek, statsEndWeek);
       return {
         ...s,
         rangeAvg: avg,
         classification: getClassification(avg)
       };
    });

    const stats = rangeStatsList.reduce((acc, curr) => {
      acc[curr.classification] = (acc[curr.classification] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pieData = [
      { name: 'Tốt', value: stats['Tốt'] || 0 },
      { name: 'Khá', value: stats['Khá'] || 0 },
      { name: 'Đạt', value: stats['Đạt'] || 0 },
      { name: 'Chưa đạt', value: stats['Chưa đạt'] || 0 },
    ];
    
    const pieDataFiltered = pieData.filter(d => d.value > 0);

    // 2. Individual Student Stats
    const selectedStudent = students.find(s => s.id === selectedStatsStudentId);
    let studentHistoryData: any[] = [];
    if (selectedStudent) {
      const record = records.find(r => r.studentId === selectedStudent.id);
      const maxWeek = record ? Math.max(...record.conducts.map(c => c.week), currentWeek) : currentWeek;
      
      for(let w = 1; w <= maxWeek; w++) {
         const c = record?.conducts.find(rc => rc.week === w);
         studentHistoryData.push({
           week: `T${w}`,
           score: c ? c.score : 10,
           violations: c ? c.violations : ''
         });
      }
    }

    // 3. Collect Violations in Range
    const violationsInRange: { week: number; studentName: string; note: string }[] = [];
    for(let w = statsStartWeek; w <= statsEndWeek; w++) {
       students.forEach(s => {
          const c = getConduct(s.id, w);
          if(c.violations) {
             violationsInRange.push({ week: w, studentName: s.name, note: c.violations });
          }
       });
    }

    return (
      <div className="space-y-8">
        {/* SECTION A: General Class Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <PieChartIcon size={24} className="text-blue-600"/> Thống Kê Chung
                </h2>
                
                {/* Week Range Filter */}
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                    <CalendarRange size={16} className="text-gray-500"/>
                    <div className="flex items-center gap-2">
                        <select 
                            value={statsStartWeek} 
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                setStatsStartWeek(v);
                                if(v > statsEndWeek) setStatsEndWeek(v);
                            }}
                            className="bg-white border rounded text-sm p-1"
                        >
                            {[...Array(35)].map((_, i) => <option key={i} value={i+1}>Tuần {i+1}</option>)}
                        </select>
                        <span className="text-gray-400">➝</span>
                        <select 
                             value={statsEndWeek} 
                             onChange={(e) => {
                                 const v = Number(e.target.value);
                                 setStatsEndWeek(v);
                                 if(v < statsStartWeek) setStatsStartWeek(v);
                             }}
                             className="bg-white border rounded text-sm p-1"
                        >
                            {[...Array(35)].map((_, i) => <option key={i} value={i+1}>Tuần {i+1}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row h-72 w-full">
              <div className="flex-1 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDataFiltered}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieDataFiltered.map((entry, index) => {
                        let color = COLORS[1];
                        if(entry.name === 'Tốt') color = COLORS[0];
                        if(entry.name === 'Khá') color = COLORS[2];
                        if(entry.name === 'Đạt') color = COLORS[1]; 
                        if(entry.name === 'Chưa đạt') color = COLORS[3];
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 flex flex-col justify-center pl-0 md:pl-8 mt-4 md:mt-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Xếp loại</th>
                        <th className="text-right py-2">Số lượng</th>
                        <th className="text-right py-2">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pieData.map((d, i) => (
                        <tr key={i} className="border-b last:border-0">
                           <td className="py-2 font-medium">{d.name}</td>
                           <td className="text-right py-2">{d.value}</td>
                           <td className="text-right py-2">{students.length > 0 ? ((d.value/students.length)*100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold">
                        <td className="py-2">Tổng số</td>
                        <td className="text-right py-2">{students.length}</td>
                        <td className="text-right py-2">100%</td>
                      </tr>
                    </tbody>
                  </table>
              </div>
            </div>
          </div>

          {/* Violations Scroll List */}
          <div className="bg-white shadow rounded-lg p-6 flex flex-col">
             <h2 className="text-xl font-bold text-slate-800 mb-4">Các Vi Phạm (Tuần {statsStartWeek} - {statsEndWeek})</h2>
             <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-4">
               {violationsInRange.length === 0 ? (
                 <p className="text-gray-500 italic text-center py-8">Không có vi phạm nào.</p>
               ) : (
                 Array.from(new Set(violationsInRange.map(v => v.week))).sort((a,b) => a-b).map(week => (
                   <div key={week}>
                     <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b sticky top-0 bg-white pt-2">Tuần {week}</h4>
                     <ul className="space-y-2">
                       {violationsInRange.filter(v => v.week === week).map((v, i) => (
                         <li key={i} className="p-2 bg-red-50 text-red-800 rounded border border-red-100 text-sm">
                           <span className="font-bold">{v.studentName}:</span> {v.note}
                         </li>
                       ))}
                     </ul>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>

        {/* SECTION A.2: Range Summary Table */}
        <div className="bg-white shadow rounded-lg p-6">
           <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
               <h3 className="font-bold text-lg text-slate-700">Bảng Tổng Hợp Hạnh Kiểm (Tuần {statsStartWeek} - {statsEndWeek})</h3>
               
               {/* Filter Dropdown */}
               <div className="flex items-center gap-2">
                 <Filter size={18} className="text-gray-500"/>
                 <select 
                    value={statsFilter}
                    onChange={(e) => setStatsFilter(e.target.value)}
                    className="border rounded p-1 text-sm bg-white"
                 >
                   <option value="ALL">Tất cả hạnh kiểm</option>
                   <option value="Tốt">Tốt</option>
                   <option value="Khá">Khá</option>
                   <option value="Đạt">Đạt</option>
                   <option value="Chưa đạt">Chưa đạt</option>
                 </select>
               </div>
           </div>
           <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-sm border-collapse">
                 <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr>
                       <th className="p-3 border-b w-12">STT</th>
                       <th className="p-3 border-b">Họ Tên</th>
                       <th className="p-3 border-b text-center">Điểm TB</th>
                       <th className="p-3 border-b text-center">Xếp Loại</th>
                    </tr>
                 </thead>
                 <tbody>
                    {rangeStatsList
                      .filter(s => statsFilter === 'ALL' || s.classification === statsFilter)
                      .map((s, idx) => (
                       <tr key={s.id} className="border-b hover:bg-slate-50">
                          <td className="p-3 text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-medium">{s.name}</td>
                          <td className="p-3 text-center font-bold">{s.rangeAvg.toFixed(2)}</td>
                          <td className="p-3 text-center">
                             <span className={`px-2 py-1 rounded text-xs
                                ${s.classification === 'Tốt' ? 'bg-green-100 text-green-700' : 
                                  s.classification === 'Khá' ? 'bg-blue-100 text-blue-700' :
                                  s.classification === 'Đạt' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}
                             `}>
                               {s.classification}
                             </span>
                          </td>
                       </tr>
                    ))}
                    {rangeStatsList.filter(s => statsFilter === 'ALL' || s.classification === statsFilter).length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500">Không tìm thấy học sinh nào.</td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* SECTION B: Individual Student Stats */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <Users size={24} className="text-indigo-600"/> Lịch Sử Hạnh Kiểm Cá Nhân
             </h2>
             <div className="flex items-center gap-2 w-full md:w-auto">
               <Search size={18} className="text-gray-400"/>
               <select 
                  className="border p-2 rounded w-full md:w-64"
                  value={selectedStatsStudentId}
                  onChange={(e) => setSelectedStatsStudentId(e.target.value)}
               >
                 <option value="">-- Chọn học sinh --</option>
                 {students.map(s => (
                   <option key={s.id} value={s.id}>{s.name}</option>
                 ))}
               </select>
             </div>
          </div>

          {selectedStudent ? (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Line Chart */}
                <div className="h-64">
                   <h3 className="text-sm font-semibold text-gray-500 mb-2 text-center">Biểu đồ điểm qua các tuần</h3>
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={studentHistoryData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis domain={[0, 10]} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="score" stroke="#3b82f6" activeDot={{ r: 8 }} name="Điểm" strokeWidth={2}/>
                      </LineChart>
                   </ResponsiveContainer>
                </div>

                {/* Detailed Table */}
                <div className="overflow-y-auto max-h-64 border rounded">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-gray-100 sticky top-0">
                       <tr>
                         <th className="p-2 border-b">Tuần</th>
                         <th className="p-2 border-b text-center">Điểm</th>
                         <th className="p-2 border-b">Ghi chú / Vi phạm</th>
                       </tr>
                     </thead>
                     <tbody>
                       {studentHistoryData.map((d, i) => (
                         <tr key={i} className="border-b hover:bg-gray-50">
                           <td className="p-2 font-medium">{d.week}</td>
                           <td className={`p-2 text-center font-bold ${d.score < settings.passThreshold ? 'text-red-600' : 'text-blue-600'}`}>
                             {d.score}
                           </td>
                           <td className="p-2 text-gray-600">
                             {d.violations || <span className="text-gray-300 italic">-</span>}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
                
                {/* Summary Box */}
                <div className="lg:col-span-2 bg-indigo-50 p-4 rounded-lg flex justify-around text-center">
                    <div>
                      <div className="text-sm text-gray-500">Điểm Trung Bình (Toàn bộ)</div>
                      <div className="text-2xl font-bold text-indigo-700">{calculateTotalAverage(selectedStudent.id).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Xếp Loại Tổng</div>
                      <div className="text-2xl font-bold text-indigo-700">{getClassification(calculateTotalAverage(selectedStudent.id))}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Số tuần vi phạm</div>
                      <div className="text-2xl font-bold text-indigo-700">
                        {studentHistoryData.filter(d => d.violations).length}
                      </div>
                    </div>
                </div>
             </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 border border-dashed rounded text-gray-400">
               Vui lòng chọn một học sinh để xem chi tiết lịch sử.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSeating = () => {
    // Generate empty grid if no chart yet
    const displayChart = seatingChart.length > 0 
      ? seatingChart 
      : Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, i) => ({ r: Math.floor(i / GRID_COLS), c: i % GRID_COLS, student: null }));

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <LayoutGrid size={24} className="text-purple-600"/> Sơ Đồ Chỗ Ngồi
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Kéo thả để điều chỉnh. Nhấn "Tự Động Xếp" để tạo mới.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsExportMode(!isExportMode)}
              className={`px-4 py-2 rounded border flex items-center gap-2 transition-colors ${isExportMode ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {isExportMode ? <Eye size={18}/> : <EyeOff size={18}/>}
              {isExportMode ? 'Chế độ Xem' : 'Chế độ Sửa'}
            </button>
            <button 
              onClick={exportSeatingImage}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
            >
              <Camera size={18} /> Chụp Ảnh
            </button>
            <button 
              onClick={runSeating}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2 shadow-sm font-bold"
            >
              <LayoutGrid size={18} /> Tự Động Xếp
            </button>
          </div>
        </div>

        <div className="flex justify-center overflow-auto pb-4">
          <div 
             ref={chartRef}
             className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 min-w-[800px]"
          >
             <div className="mb-8 text-center border-b pb-4">
               <h3 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Bục Giảng</h3>
               <div className="w-64 h-2 bg-slate-800 mx-auto mt-2 rounded-full"></div>
             </div>

             {/* Better Grid Rendering: Standard Grid with Gaps */}
             <div 
               className="grid gap-4"
               style={{ 
                 gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` // Fixed 1fr to force equality
               }}
             >
               {displayChart.map((seat, index) => {
                 // Logic to differentiate "walkways" if strictly following 8 cols
                 const isWalkway = (index % GRID_COLS) === 4; 
                 
                 return (
                   <React.Fragment key={index}>
                     <div
                        draggable={!isExportMode}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragOver={handleDragOver}
                        className={`
                           relative rounded-lg flex flex-col items-center justify-center text-center transition-all h-32 w-full
                           ${(index % GRID_COLS) === 4 ? 'ml-8' : ''} /* Visual gap for walkway */
                           ${seat.student 
                             ? 'bg-white border-2 border-slate-200 shadow-sm hover:border-blue-400 cursor-grab active:cursor-grabbing' 
                             : 'bg-slate-100 border border-dashed border-slate-300'
                           }
                           ${isExportMode ? 'p-1' : 'p-2'}
                           ${draggedSeatIndex === index ? 'opacity-50' : 'opacity-100'}
                        `}
                     >
                       {seat.student ? (
                         <>
                           {!isExportMode && (
                             <div className={`
                               w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 text-white shrink-0
                               ${seat.student.gender === Gender.MALE ? 'bg-blue-500' : 'bg-pink-500'}
                             `}>
                               {seat.student.name.charAt(0)}
                             </div>
                           )}
                           <span className={`
                             font-bold text-slate-800 block w-full
                             ${isExportMode 
                               ? 'text-sm whitespace-normal break-words leading-tight' // Ensure wrapping
                               : 'text-xs truncate leading-tight'}
                           `}>
                             {seat.student.name}
                           </span>
                           {!isExportMode && (
                             <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                               {seat.student.academic === AcademicPerformance.GOOD && <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Học tốt"></span>}
                               {seat.student.academic === AcademicPerformance.POOR && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Học yếu"></span>}
                               {seat.student.isTalkative && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" title="Hay nói"></span>}
                             </div>
                           )}
                         </>
                       ) : (
                         <span className="text-slate-300 text-xs">{index + 1}</span>
                       )}
                     </div>
                   </React.Fragment>
                 );
               })}
             </div>
             
             {!isExportMode && (
               <div className="mt-8 flex justify-center gap-6 text-sm text-gray-500">
                 <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Nam</div>
                 <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-500"></span> Nữ</div>
                 <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Học Tốt</div>
                 <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Học Yếu</div>
                 <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Hay nói</div>
               </div>
             )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Cài Đặt Hệ Thống</h2>
      
      <div className="space-y-6">
        {/* Backup & Restore Section */}
        <div>
          <h3 className="font-semibold text-lg mb-2">Sao Lưu & Khôi Phục</h3>
          <p className="text-sm text-gray-600 mb-4">
            Dữ liệu được lưu trong trình duyệt. Hãy tải file dự phòng về máy tính thường xuyên để tránh mất dữ liệu.
          </p>
          <div className="flex gap-4 flex-wrap">
            <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-medium">
               <Download size={18} /> Tải Xuống (Backup JSON)
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportFile} 
              accept=".json" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 font-medium"
            >
               <Upload size={18} /> Nhập / Khôi Phục Dữ Liệu
            </button>
          </div>
        </div>

        <div className="border-t pt-6">
           <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
             <FileSpreadsheet className="text-green-600"/> Đồng Bộ Google Sheets (Thủ Công)
           </h3>
            <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded border border-gray-200">
               <strong>Lưu ý:</strong> Tính năng tự động đồng bộ (Auto Sync) không khả dụng do hạn chế về bảo mật trên trình duyệt. 
               Vui lòng sử dụng tính năng <strong>Xuất CSV</strong> dưới đây để đưa dữ liệu lên Google Sheets, và tính năng <strong>Nhập Excel/CSV</strong> ở màn hình "Học Sinh" để cập nhật lại.
            </p>
            <div className="flex gap-4">
              <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200 font-medium">
                 <FileSpreadsheet size={18} /> Xuất ra Excel/CSV
              </button>
              <button onClick={() => window.open('https://docs.google.com/spreadsheets/create', '_blank')} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">
                 Mở Google Sheets Mới ↗
              </button>
            </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">Cấu Hình Điểm Hạnh Kiểm</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Mức Tốt ({'>='})</label>
               <input 
                 type="number" step="0.1"
                 value={settings.goodThreshold}
                 onChange={(e) => setSettings({...settings, goodThreshold: Number(e.target.value)})}
                 className="w-full p-2 border rounded"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Mức Khá ({'>='})</label>
               <input 
                 type="number" step="0.1"
                 value={settings.fairThreshold}
                 onChange={(e) => setSettings({...settings, fairThreshold: Number(e.target.value)})}
                 className="w-full p-2 border rounded"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Mức Đạt ({'>='})</label>
               <input 
                 type="number" step="0.1"
                 value={settings.passThreshold}
                 onChange={(e) => setSettings({...settings, passThreshold: Number(e.target.value)})}
                 className="w-full p-2 border rounded"
               />
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-800 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutGrid className="text-blue-400" />
            Lớp Học 4.0
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('list')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${activeTab === 'list' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
          >
            <Users size={20} /> Học Sinh
          </button>
          <button 
            onClick={() => setActiveTab('conduct')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${activeTab === 'conduct' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
          >
            <Save size={20} /> Hạnh Kiểm
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${activeTab === 'stats' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
          >
            <BarChart3 size={20} /> Thống Kê
          </button>
          <button 
            onClick={() => setActiveTab('seating')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${activeTab === 'seating' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
          >
            <LayoutGrid size={20} /> Sơ Đồ Chỗ Ngồi
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
          >
            <SettingsIcon size={20} /> Cài Đặt
          </button>
        </nav>
        <div className="p-4 border-t border-slate-700 text-xs text-slate-400">
           &copy; 2024 School Manager App
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'list' && renderStudentList()}
          {activeTab === 'conduct' && renderConduct()}
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'seating' && renderSeating()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>

      {/* Add Student Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Thêm Học Sinh Mới">
         <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Họ và Tên</label>
              <input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="w-full p-2 border rounded" placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Giới Tính</label>
              <select value={newStudentGender} onChange={(e) => setNewStudentGender(e.target.value as Gender)} className="w-full p-2 border rounded">
                <option value={Gender.MALE}>Nam</option>
                <option value={Gender.FEMALE}>Nữ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Học Lực</label>
              <select value={newStudentAcademic} onChange={(e) => setNewStudentAcademic(e.target.value as AcademicPerformance)} className="w-full p-2 border rounded">
                <option value={AcademicPerformance.GOOD}>Tốt</option>
                <option value={AcademicPerformance.PASS}>Đạt</option>
                <option value={AcademicPerformance.POOR}>Chưa đạt</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2">
               <input type="checkbox" id="talkative" checked={newStudentTalkative} onChange={(e) => setNewStudentTalkative(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
               <label htmlFor="talkative" className="text-sm font-medium">Hay nói chuyện</label>
            </div>
            <button onClick={addStudent} className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold">Lưu Học Sinh</button>
         </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Nhập Danh Sách Nhanh">
         <div className="space-y-4">
           <div className="text-sm text-gray-600">
             <p className="mb-2"><strong>Cách 1: Copy trực tiếp từ Excel (Ctrl+C & Ctrl+V)</strong></p>
             <p className="mb-2"><strong>Cách 2: Nhập thủ công cách nhau bởi dấu phẩy</strong></p>
             <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                Cột 1: Tên học sinh<br/>
                Cột 2: Giới tính (Nam/Nữ)<br/>
                Cột 3: Học lực (Tốt/Đạt/Chưa)<br/>
                Cột 4: Hay nói chuyện (Có/Không/x)
             </div>
             <p className="mt-2 text-xs italic">Ví dụ Excel: <br/>Nguyễn Văn A [Tab] Nam [Tab] Tốt [Tab] Có</p>
           </div>
           <textarea 
             value={importText} 
             onChange={(e) => setImportText(e.target.value)} 
             className="w-full h-40 p-2 border rounded font-mono text-sm" 
             placeholder="Dán dữ liệu Excel hoặc nhập văn bản tại đây..."
           ></textarea>
           <button onClick={processImport} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold">Xử Lý & Nhập</button>
         </div>
      </Modal>
    </div>
  );
}