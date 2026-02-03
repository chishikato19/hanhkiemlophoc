
import React, { useState, useEffect } from 'react';
import { Student, Gender, AcademicRank, ClassRole } from '../types';
import { getStudents, saveStudents } from '../services/dataService';
import { Plus, Trash2, FileSpreadsheet, Pencil, X, Save, Lock, Unlock, Shield } from 'lucide-react';
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
  
  // NEW: Password & Roles
  const [newPassword, setNewPassword] = useState('123');
  const [selectedRoles, setSelectedRoles] = useState<ClassRole[]>([]);

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNewName('');
    setNewGender(Gender.MALE);
    setNewRank(AcademicRank.PASS);
    setNewTalkative(false);
    setNewPassword('123');
    setSelectedRoles([]);
  };

  const handleEditClick = (student: Student) => {
    setEditingId(student.id);
    setNewName(student.name);
    setNewGender(student.gender);
    setNewRank(student.rank);
    setNewTalkative(student.isTalkative);
    setNewPassword(student.password || '123');
    setSelectedRoles(student.roles || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa VĨNH VIỄN học sinh này? Nếu học sinh chỉ nghỉ học, hãy dùng nút Khóa.')) {
      const updated = students.filter(s => s.id !== id);
      setStudents(updated);
      saveStudents(updated);
      setHasUnsavedChanges(true);
      addLog('STUDENT', `Đã xóa học sinh ID: ${id}`);
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
      const msg = currentStatus 
        ? "Bạn muốn KHÓA học sinh này (nghỉ học/bảo lưu)? Học sinh sẽ ẩn khỏi báo cáo hạnh kiểm."
        : "Bạn muốn MỞ KHÓA học sinh này?";
        
      if (window.confirm(msg)) {
          const updated = students.map(s => s.id === id ? { ...s, isActive: !currentStatus } : s);
          setStudents(updated);
          saveStudents(updated);
          setHasUnsavedChanges(true);
          addLog('STUDENT', `Đã đổi trạng thái học sinh ID: ${id} sang ${!currentStatus ? 'Active' : 'Inactive'}`);
      }
  };

  const handleSave = () => {
    if (!newName.trim()) return;

    const studentData: Partial<Student> = {
        name: newName,
        gender: newGender,
        rank: newRank,
        isTalkative: newTalkative,
        password: newPassword,
        roles: selectedRoles
    };

    if (editingId) {
      // Update existing
      const updated = students.map(s => 
        s.id === editingId 
        ? { ...s, ...studentData }
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
        isTalkative: newTalkative,
        isActive: true,
        password: newPassword,
        roles: selectedRoles,
        balance: 0,
        badges: [],
        inventory: []
      };
      const updated = [...students, newStudent];
      setStudents(updated);
      saveStudents(updated);
      addLog('STUDENT', `Đã thêm học sinh: ${newStudent.name}`);
    }
    setHasUnsavedChanges(true);
    resetForm();
  };

  const toggleRole = (role: ClassRole) => {
      if (selectedRoles.includes(role)) {
          setSelectedRoles(selectedRoles.filter(r => r !== role));
      } else {
          setSelectedRoles([...selectedRoles, role]);
      }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Danh Sách Học Sinh ({students.length})</h2>
      </div>

      {/* Add/Edit Form */}
      <div className={`p-4 rounded-xl shadow-sm mb-6 transition-colors ${editingId ? 'bg-indigo-50 border border-indigo-200' : 'bg-white'}`}>
        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            {editingId ? <><Pencil size={18}/> Chỉnh sửa thông tin</> : <><Plus size={18}/> Thêm học sinh mới</>}
        </h3>
        <div className="flex flex-wrap gap-4 items-start">
            <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Họ và tên</label>
                <input 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="Nhập tên..." 
                />
            </div>
            <div className="w-24">
                <label className="block text-xs font-medium text-gray-500 mb-1">Giới tính</label>
                <select 
                    value={newGender} 
                    onChange={(e) => setNewGender(e.target.value as Gender)}
                    className="w-full border p-2 rounded"
                >
                    {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>
            <div className="w-24">
                <label className="block text-xs font-medium text-gray-500 mb-1">Học lực</label>
                <select 
                    value={newRank} 
                    onChange={(e) => setNewRank(e.target.value as AcademicRank)}
                    className="w-full border p-2 rounded"
                >
                    {Object.values(AcademicRank).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            <div className="w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">Mật khẩu riêng</label>
                <input 
                    type="text"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full border p-2 rounded bg-yellow-50"
                    placeholder="123"
                />
            </div>
        </div>
        
        {/* Roles & Options */}
        <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-6">
            <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Chức vụ / Vai trò:</label>
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'MONITOR', label: 'Lớp Trưởng' },
                        { id: 'VICE_STUDY', label: 'Lớp Phó HT' },
                        { id: 'VICE_DISCIPLINE', label: 'Lớp Phó Nề Nếp' },
                        { id: 'VICE_LABOR', label: 'Lớp Phó LĐ' },
                        { id: 'TREASURER', label: 'Thủ Quỹ' }
                    ].map(role => (
                        <button
                            key={role.id}
                            onClick={() => toggleRole(role.id as ClassRole)}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${selectedRoles.includes(role.id as ClassRole) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                        >
                            {role.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center">
                <input 
                    type="checkbox" 
                    checked={newTalkative} 
                    onChange={e => setNewTalkative(e.target.checked)}
                    id="talkative" 
                    className="mr-2 h-4 w-4" 
                />
                <label htmlFor="talkative" className="text-sm select-none cursor-pointer text-red-600 font-medium">Hay nói chuyện</label>
            </div>

            <div className="ml-auto flex gap-2">
                {editingId && (
                    <button onClick={resetForm} className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-1">
                        <X size={20} /> Hủy
                    </button>
                )}
                <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded flex items-center gap-1 font-bold shadow-md">
                    {editingId ? <><Save size={20} /> Cập nhật</> : <><Plus size={20} /> Thêm mới</>}
                </button>
            </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
                <tr>
                    <th className="p-4 border-b">Tên</th>
                    <th className="p-4 border-b">Vai trò</th>
                    <th className="p-4 border-b text-center">Pass</th>
                    <th className="p-4 border-b">Học lực</th>
                    <th className="p-4 border-b text-center">Trạng thái</th>
                    <th className="p-4 border-b text-right">Thao tác</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {students.map(s => (
                    <tr key={s.id} className={`hover:bg-gray-50 ${!s.isActive ? 'bg-gray-100 opacity-60' : ''}`}>
                        <td className="p-4 font-medium flex items-center gap-3">
                            <div className="relative w-8 h-8 flex items-center justify-center">
                                 {s.frameUrl && <img src={s.frameUrl} className="absolute inset-0 w-full h-full z-10 scale-125" alt="" />}
                                 <span className="text-2xl leading-none z-0">{s.avatarUrl || '👤'}</span>
                            </div>
                            <div>
                                <div className="font-bold text-gray-800">{s.name}</div>
                                {s.isTalkative && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1 rounded">Hay nói chuyện</span>}
                            </div>
                        </td>
                        <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                                {(s.roles || []).map(r => (
                                    <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                                        {r === 'MONITOR' ? 'Lớp Trưởng' : r === 'VICE_STUDY' ? 'LP Học Tập' : r === 'VICE_DISCIPLINE' ? 'LP Nề Nếp' : r === 'VICE_LABOR' ? 'LP Lao Động' : r === 'TREASURER' ? 'Thủ Quỹ' : r}
                                    </span>
                                ))}
                                {(!s.roles || s.roles.length === 0) && <span className="text-gray-400 text-xs">-</span>}
                            </div>
                        </td>
                        <td className="p-4 text-center font-mono text-xs text-gray-500">
                            {s.password || '123'}
                        </td>
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
                             <button 
                                onClick={() => handleToggleActive(s.id, s.isActive ?? true)}
                                className={`p-1.5 rounded transition-colors ${s.isActive ? 'text-green-600 hover:bg-green-100' : 'text-gray-500 hover:bg-gray-200'}`}
                                title={s.isActive ? "Đang học (Nhấn để khóa)" : "Đã khóa (Nhấn để mở)"}
                             >
                                 {s.isActive ? <Unlock size={18}/> : <Lock size={18}/>}
                             </button>
                        </td>
                        <td className="p-4 text-right">
                             <div className="flex justify-end gap-2">
                                <button onClick={() => handleEditClick(s)} className="text-indigo-400 hover:text-indigo-600" title="Sửa">
                                    <Pencil size={18} />
                                </button>
                                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600" title="Xóa Vĩnh Viễn">
                                    <Trash2 size={18} />
                                </button>
                             </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentManager;
