
import React, { useState, useEffect } from 'react';
import { Student, Gender, AcademicRank } from '../types';
import { getStudents, saveStudents } from '../services/dataService';
import { Plus, Trash2, FileSpreadsheet, Pencil, X, Save } from 'lucide-react';
import { addLog } from '../utils/logger';

interface Props {
    setHasUnsavedChanges: (val: boolean) => void;
}

const StudentManager: React.FC<Props> = ({ setHasUnsavedChanges }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>(Gender.MALE);
  const [newRank, setNewRank] = useState<AcademicRank>(AcademicRank.PASS);
  const [newTalkative, setNewTalkative] = useState(false);

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNewName('');
    setNewGender(Gender.MALE);
    setNewRank(AcademicRank.PASS);
    setNewTalkative(false);
  };

  const handleEditClick = (student: Student) => {
    setEditingId(student.id);
    setNewName(student.name);
    setNewGender(student.gender);
    setNewRank(student.rank);
    setNewTalkative(student.isTalkative);
    // Scroll to top or form if needed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học sinh này?')) {
      const updated = students.filter(s => s.id !== id);
      setStudents(updated);
      saveStudents(updated);
      setHasUnsavedChanges(true);
      addLog('STUDENT', `Đã xóa học sinh ID: ${id}`);
    }
  };

  const handleSave = () => {
    if (!newName.trim()) return;

    if (editingId) {
      // Update existing
      const updated = students.map(s => 
        s.id === editingId 
        ? { ...s, name: newName, gender: newGender, rank: newRank, isTalkative: newTalkative }
        : s
      );
      setStudents(updated);
      saveStudents(updated);
      addLog('STUDENT', `Đã cập nhật học sinh: ${newName}`);
    } else {
      // Add new
      const newStudent: Student = {
        id: `STU-${Date.now()}`,
        name: newName,
        gender: newGender,
        rank: newRank,
        isTalkative: newTalkative
      };
      const updated = [...students, newStudent];
      setStudents(updated);
      saveStudents(updated);
      addLog('STUDENT', `Đã thêm học sinh: ${newStudent.name}`);
    }
    setHasUnsavedChanges(true);
    resetForm();
  };

  const handleBulkImport = () => {
    // Basic Excel copy-paste parser (Tab separated)
    const lines = importText.trim().split('\n');
    const newStudents: Student[] = [];
    
    lines.forEach((line) => {
      const parts = line.split('\t');
      // Assume format: Name | Gender | Rank | Talkative
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const genderStr = parts[1]?.trim().toLowerCase();
        const rankStr = parts[2]?.trim().toLowerCase();
        const talkStr = parts[3]?.trim().toLowerCase();

        const gender = genderStr === 'nữ' || genderStr === 'female' ? Gender.FEMALE : Gender.MALE;
        
        let rank = AcademicRank.PASS;
        if (rankStr?.includes('tốt') || rankStr?.includes('giỏi')) rank = AcademicRank.GOOD;
        else if (rankStr?.includes('khá')) rank = AcademicRank.FAIR;
        else if (rankStr?.includes('yếu') || rankStr?.includes('chưa đạt')) rank = AcademicRank.FAIL;

        const isTalkative = talkStr === 'có' || talkStr === 'yes' || talkStr === 'x';

        newStudents.push({
          id: `STU-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
          name,
          gender,
          rank,
          isTalkative
        });
      }
    });

    if (newStudents.length > 0) {
      const updated = [...students, ...newStudents];
      setStudents(updated);
      saveStudents(updated);
      setImportText('');
      setShowImport(false);
      setHasUnsavedChanges(true);
      addLog('STUDENT', `Đã import thành công ${newStudents.length} học sinh.`);
      alert(`Đã thêm ${newStudents.length} học sinh!`);
    } else {
      alert('Không nhận diện được dữ liệu. Vui lòng copy từ Excel với định dạng: Tên | Giới tính | Học lực | Hay nói chuyện');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Danh Sách Học Sinh ({students.length})</h2>
        <div className="space-x-2">
            <button 
                onClick={() => setShowImport(!showImport)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
                <FileSpreadsheet size={18} />
                Import Excel
            </button>
        </div>
      </div>

      {showImport && (
        <div className="bg-white p-4 rounded-xl shadow-md mb-6 border border-green-200">
            <h3 className="font-semibold mb-2">Dán dữ liệu từ Excel</h3>
            <p className="text-sm text-gray-500 mb-2">Định dạng cột: Tên | Giới tính | Học lực | Hay nói chuyện (Có/Không)</p>
            <textarea
                className="w-full h-32 p-2 border rounded-md font-mono text-sm"
                placeholder="Nguyễn Văn A    Nam    Tốt    Không..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
            />
            <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => setShowImport(false)} className="px-3 py-1 text-gray-600">Hủy</button>
                <button onClick={handleBulkImport} className="px-3 py-1 bg-green-600 text-white rounded">Xử lý Import</button>
            </div>
        </div>
      )}

      {/* Add/Edit Form */}
      <div className={`p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-3 items-end transition-colors ${editingId ? 'bg-indigo-50 border border-indigo-200' : 'bg-white'}`}>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Họ và tên</label>
          <input 
            value={newName} 
            onChange={e => setNewName(e.target.value)}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
            placeholder="Nhập tên..." 
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">Giới tính</label>
          <select 
            value={newGender} 
            onChange={(e) => setNewGender(e.target.value as Gender)}
            className="w-full border p-2 rounded"
          >
            {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">Học lực</label>
          <select 
            value={newRank} 
            onChange={(e) => setNewRank(e.target.value as AcademicRank)}
            className="w-full border p-2 rounded"
          >
            {Object.values(AcademicRank).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex items-center pb-3 px-2">
          <input 
            type="checkbox" 
            checked={newTalkative} 
            onChange={e => setNewTalkative(e.target.checked)}
            id="talkative" 
            className="mr-2 h-4 w-4" 
          />
          <label htmlFor="talkative" className="text-sm select-none cursor-pointer">Hay nói chuyện?</label>
        </div>
        <div className="flex gap-2">
            {editingId && (
                <button onClick={resetForm} className="bg-gray-400 hover:bg-gray-500 text-white p-2 rounded flex items-center gap-1">
                    <X size={20} /> Hủy
                </button>
            )}
            <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded flex items-center gap-1 min-w-[90px] justify-center">
                {editingId ? <><Save size={20} /> Lưu</> : <><Plus size={20} /> Thêm</>}
            </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
                <tr>
                    <th className="p-4 border-b">Tên</th>
                    <th className="p-4 border-b">Giới tính</th>
                    <th className="p-4 border-b">Học lực</th>
                    <th className="p-4 border-b text-center">Nói chuyện</th>
                    <th className="p-4 border-b text-right">Thao tác</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {students.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">{s.name}</td>
                        <td className="p-4 text-gray-500">{s.gender}</td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                ${s.rank === AcademicRank.GOOD ? 'bg-green-100 text-green-800' : 
                                  s.rank === AcademicRank.FAIR ? 'bg-blue-100 text-blue-800' :
                                  s.rank === AcademicRank.PASS ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {s.rank}
                            </span>
                        </td>
                        <td className="p-4 text-center">
                            {s.isTalkative ? <span className="text-red-500">⚠</span> : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="p-4 text-right">
                             <div className="flex justify-end gap-2">
                                <button onClick={() => handleEditClick(s)} className="text-indigo-400 hover:text-indigo-600" title="Sửa">
                                    <Pencil size={18} />
                                </button>
                                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600" title="Xóa">
                                    <Trash2 size={18} />
                                </button>
                             </div>
                        </td>
                    </tr>
                ))}
                {students.length === 0 && (
                    <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400">Chưa có dữ liệu học sinh.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentManager;
