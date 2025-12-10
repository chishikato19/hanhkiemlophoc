
import React, { useState } from 'react';
import { Settings } from '../types';
import { GraduationCap, Users, ArrowRight, Lock, Key } from 'lucide-react';

interface Props {
  settings: Settings;
  onLoginSuccess: (role: 'teacher' | 'student') => void;
}

const LoginGate: React.FC<Props> = ({ settings, onLoginSuccess }) => {
  const [role, setRole] = useState<'selection' | 'teacher' | 'student'>('selection');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'teacher') {
      if (input === settings.teacherPassword) {
        onLoginSuccess('teacher');
      } else {
        setError('Mật khẩu không đúng!');
      }
    } else if (role === 'student') {
      if (input === settings.studentCode) {
        onLoginSuccess('student');
      } else {
        setError('Mã lớp không đúng!');
      }
    }
  };

  if (role === 'selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={32} className="text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Lớp Học Thông Minh</h1>
          <p className="text-gray-500 mb-8">Vui lòng chọn vai trò để tiếp tục</p>

          <div className="space-y-4">
            <button 
              onClick={() => setRole('teacher')}
              className="w-full bg-white border-2 border-indigo-100 hover:border-indigo-500 hover:shadow-md p-4 rounded-xl flex items-center transition-all group"
            >
              <div className="bg-indigo-50 p-3 rounded-full mr-4 group-hover:bg-indigo-600 transition-colors">
                <Users size={24} className="text-indigo-600 group-hover:text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-gray-800">Giáo Viên</div>
                <div className="text-xs text-gray-400">Quản lý lớp học, hạnh kiểm</div>
              </div>
              <ArrowRight size={20} className="text-gray-300 group-hover:text-indigo-600" />
            </button>

            <button 
              onClick={() => setRole('student')}
              className="w-full bg-white border-2 border-orange-100 hover:border-orange-500 hover:shadow-md p-4 rounded-xl flex items-center transition-all group"
            >
              <div className="bg-orange-50 p-3 rounded-full mr-4 group-hover:bg-orange-600 transition-colors">
                <GraduationCap size={24} className="text-orange-600 group-hover:text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-gray-800">Học Sinh / Cán bộ lớp</div>
                <div className="text-xs text-gray-400">Báo cáo điểm danh, vi phạm</div>
              </div>
              <ArrowRight size={20} className="text-gray-300 group-hover:text-orange-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
        <button onClick={() => { setRole('selection'); setInput(''); setError(''); }} className="text-gray-400 hover:text-gray-600 text-sm mb-6 flex items-center gap-1">← Quay lại</button>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-1">
          {role === 'teacher' ? 'Đăng nhập Giáo Viên' : 'Đăng nhập Lớp học'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {role === 'teacher' ? 'Nhập mật khẩu quản trị để tiếp tục.' : 'Nhập Mã Lớp do giáo viên cung cấp.'}
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {role === 'teacher' ? <Key size={18} className="text-gray-400"/> : <Lock size={18} className="text-gray-400"/>}
            </div>
            <input
              type={role === 'teacher' ? 'password' : 'text'}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder={role === 'teacher' ? 'Mật khẩu' : 'Mã lớp (ví dụ: 1111)'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
          </div>
          
          {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}

          <button
            type="submit"
            className={`w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${role === 'teacher' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'} focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out`}
          >
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginGate;
