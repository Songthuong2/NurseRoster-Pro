import React, { useState, useEffect } from 'react';
import { Staff, User, UserRole } from '../types';
import { Button } from './ui/Button';
import { ShieldCheck, User as UserIcon, LogIn, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  staffList: Staff[];
  onLogin: (user: User) => void;
  adminPassword?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ staffList, onLogin, adminPassword = '123' }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // Auto-select first staff member when switching to staff role
  useEffect(() => {
    if (selectedRole === 'staff' && staffList.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staffList[0].id);
    }
  }, [selectedRole, staffList]);

  const triggerError = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedRole === 'admin') {
      if (!passwordInput.trim()) {
        triggerError('Vui lòng nhập mật khẩu quản trị');
        return;
      }
      if (passwordInput !== adminPassword) {
        triggerError('Mật khẩu quản trị không chính xác');
        return;
      }
      onLogin({
        id: 'admin-1',
        name: 'Quản trị viên',
        role: 'admin'
      });
    } else {
      if (staffList.length === 0) {
        triggerError('Chưa có dữ liệu nhân viên. Vui lòng liên hệ Quản lý.');
        return;
      }
      
      const staff = staffList.find(s => s.id === selectedStaffId);
      if (!staff) {
        triggerError('Vui lòng chọn nhân viên để đăng nhập');
        return;
      }
      
      onLogin({
        id: `user-${staff.id}`,
        name: staff.name,
        role: 'staff',
        staffId: staff.id
      });
    }
  };

  return (
    <div className="min-h-screen bg-medical-50 flex flex-col justify-center items-center p-4">
      {/* Inline styles for the shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      <div className={`bg-white rounded-xl shadow-xl w-full max-w-md p-8 border border-slate-200 transition-all ${isShaking ? 'animate-shake border-red-300 shadow-red-100' : ''}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-medical-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-medical-500/30">
            <span className="text-2xl font-bold">NR</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">NurseRoster Pro</h1>
          <p className="text-slate-500 mt-2">Hệ thống quản lý lịch trực y tế</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            {/* Role Selection Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-medical-200 ${selectedRole === 'admin' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setSelectedRole('admin'); setError(''); }}
              >
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck size={16} /> Quản lý
                </div>
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-medical-200 ${selectedRole === 'staff' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { 
                  setSelectedRole('staff'); 
                  setError('');
                }}
              >
                 <div className="flex items-center justify-center gap-2">
                  <UserIcon size={16} /> Điều dưỡng
                </div>
              </button>
            </div>

            {/* Staff Dropdown */}
            {selectedRole === 'staff' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-slate-700 mb-1">Chọn nhân viên</label>
                {staffList.length > 0 ? (
                  <div className="relative">
                    <select
                      className={`block w-full rounded-md shadow-sm p-2 border focus:ring-2 focus:ring-medical-500 focus:outline-none transition-colors ${error ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-slate-300 focus:border-medical-500'}`}
                      value={selectedStaffId}
                      onChange={(e) => { setSelectedStaffId(e.target.value); setError(''); }}
                      required
                    >
                      {staffList.map(staff => (
                        <option key={staff.id} value={staff.id}>{staff.name} - {staff.department}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100 rounded border border-slate-200 text-sm text-slate-500 italic text-center">
                    Chưa có nhân viên nào trong hệ thống.
                  </div>
                )}
              </div>
            )}
            
            {/* Admin Password Input */}
            {selectedRole === 'admin' && (
               <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} className={error ? "text-red-400" : ""} />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu..."
                      className={`pl-10 pr-10 block w-full rounded-md shadow-sm p-2 border focus:ring-2 focus:outline-none transition-colors ${error ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-medical-500 focus:ring-medical-200'}`}
                      value={passwordInput}
                      onChange={(e) => { setPasswordInput(e.target.value); setError(''); }}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
               </div>
            )}

            {/* Error Message Display */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100 animate-in fade-in duration-200">
                <AlertCircle size={16} className="shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full py-3 text-base shadow-md hover:shadow-lg transition-shadow" icon={<LogIn size={18}/>}>
            Đăng nhập hệ thống
          </Button>
        </form>
      </div>
      <p className="mt-8 text-center text-xs text-slate-400">
        &copy; 2024 NurseRoster Pro. Phiên bản demo.
      </p>
    </div>
  );
};