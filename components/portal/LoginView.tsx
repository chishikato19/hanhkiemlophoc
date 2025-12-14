
import React, { useState } from 'react';
import { User, Search, Lock, ArrowLeft } from 'lucide-react';
import { Student } from '../../types';

interface Props {
    students: Student[];
    onLogin: (student: Student) => void;
}

const LoginView: React.FC<Props> = ({ students, onLogin }) => {
    const [view, setView] = useState<'USER_SELECT' | 'AUTH'>('USER_SELECT');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [passwordInput, setPasswordInput] = useState('');

    const activeStudents = students.filter(s => s.isActive !== false);
    const filteredStudents = activeStudents.filter(n => n.name.toLowerCase().includes(userSearch.toLowerCase()));

    const handleUserSelect = (id: string) => {
        setSelectedStudentId(id);
        setPasswordInput('');
        setView('AUTH');
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return;

        if (passwordInput === (student.password || '123')) {
            onLogin(student);
        } else {
            alert("Mật khẩu không đúng!");
        }
    };

    if (view === 'USER_SELECT') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4 flex items-center justify-center">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 h-[80vh] flex flex-col">
                    <div className="text-center mb-4 flex-shrink-0">
                        <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-white shadow-lg"><User size={32} /></div>
                        <h1 className="text-2xl font-bold text-gray-800">Cổng Thông Tin Lớp</h1>
                        <p className="text-gray-600 text-sm">Chọn tên bạn để đăng nhập</p>
                    </div>
                    <div className="mb-4 relative flex-shrink-0">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/><input type="text" className="w-full border p-2 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-orange-500" placeholder="Tìm tên..." value={userSearch} onChange={e => setUserSearch(e.target.value)}/>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {filteredStudents.map(s => (
                            <button key={s.id} onClick={() => handleUserSelect(s.id)} className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-colors text-left group">
                                <div className="font-bold text-gray-800 group-hover:text-orange-700">{s.name}</div>
                                {(s.roles && s.roles.length > 0) && (<div className="flex gap-1">{s.roles.map(r => <span key={r} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-200">{r === 'MONITOR' ? 'LT' : r === 'TREASURER' ? 'TQ' : 'LP'}</span>)}</div>)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                <button onClick={() => setView('USER_SELECT')} className="mb-4 text-gray-400 flex items-center gap-1 text-sm"><ArrowLeft size={14}/> Quay lại</button>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Xin chào, {students.find(s => s.id === selectedStudentId)?.name}</h2>
                <p className="text-sm text-gray-500 mb-6">Nhập mật khẩu cá nhân</p>
                <form onSubmit={handleLogin}>
                    <div className="relative mb-4"><Lock className="absolute left-3 top-2.5 text-gray-400" size={18}/><input type="password" autoFocus className="w-full border p-2 pl-10 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-base" placeholder="Mật khẩu..." value={passwordInput} onChange={e => setPasswordInput(e.target.value)}/></div>
                    <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700 shadow-lg">Đăng nhập</button>
                </form>
            </div>
        </div>
    );
};

export default LoginView;
