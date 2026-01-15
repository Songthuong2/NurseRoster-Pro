import React, { useState } from 'react';
import { ManualNotification, NotificationLog, Staff, User } from '../types';
import { Bell, CheckCircle, Clock, Send, Lock, Shield, Eye, EyeOff, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from './ui/Button';

interface NotificationPanelProps {
  logs: NotificationLog[];
  settings: { enabled: boolean; notify24h: boolean; notify1h: boolean };
  onUpdateSettings: (s: any) => void;
  staffList?: Staff[];
  manualNotifications?: ManualNotification[];
  setManualNotifications?: React.Dispatch<React.SetStateAction<ManualNotification[]>>;
  currentUser?: User;
  adminPassword?: string;
  setAdminPassword?: (pwd: string) => void;
  onClearLogs?: () => void;
  onDeleteManualNotification?: (id: string) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  logs, 
  settings, 
  onUpdateSettings,
  staffList = [],
  manualNotifications = [],
  setManualNotifications,
  currentUser,
  adminPassword,
  setAdminPassword,
  onClearLogs,
  onDeleteManualNotification
}) => {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual' | 'security'>('auto');
  
  // Manual Notification State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [recipient, setRecipient] = useState('all');

  // Security State
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Visibility Toggles
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setManualNotifications || !currentUser) return;

    const newNotif: ManualNotification = {
      id: Math.random().toString(36),
      createdAt: new Date().toISOString(),
      title: notifTitle,
      content: notifContent,
      recipientId: recipient,
      senderName: currentUser.name
    };

    setManualNotifications(prev => [newNotif, ...prev]);
    setNotifTitle('');
    setNotifContent('');
    alert('Đã gửi thông báo thành công!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setAdminPassword || !adminPassword) return;

    if (currentPwd !== adminPassword) {
      setPwdMsg({ type: 'error', text: 'Mật khẩu hiện tại không đúng.' });
      return;
    }
    if (newPwd.length < 4) {
      setPwdMsg({ type: 'error', text: 'Mật khẩu mới quá ngắn.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setAdminPassword(newPwd);
    setPwdMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
  };

  const PasswordInput = ({ 
    label, 
    value, 
    onChange, 
    show, 
    onToggle 
  }: { 
    label: string, 
    value: string, 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
    show: boolean, 
    onToggle: () => void 
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <input 
          required 
          type={show ? "text" : "password"} 
          className="w-full border border-slate-300 rounded-md p-2 pr-10"
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
          onClick={onToggle}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 flex items-center mb-2">
          <Bell className="mr-2 text-medical-600" /> Trung tâm thông báo & Cài đặt
        </h2>
        
        <div className="flex space-x-2 mt-4">
          <button 
            onClick={() => setActiveTab('auto')}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === 'auto' ? 'bg-medical-100 text-medical-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Tự động & Nhật ký
          </button>
          {currentUser?.role === 'admin' && (
            <>
              <button 
                onClick={() => setActiveTab('manual')}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === 'manual' ? 'bg-medical-100 text-medical-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Gửi thông báo
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === 'security' ? 'bg-medical-100 text-medical-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Bảo mật
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50">
        
        {/* TAB 1: AUTO NOTIFICATIONS & LOGS */}
        {activeTab === 'auto' && (
          <>
            <div className="p-6 bg-white border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">Cấu hình tự động</h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.enabled}
                    onChange={(e) => onUpdateSettings({...settings, enabled: e.target.checked})}
                    className="h-5 w-5 text-medical-600 focus:ring-medical-500 border-gray-300 rounded"
                  />
                  <span className="text-slate-700 font-medium">Bật hệ thống thông báo</span>
                </label>
                
                <div className={`ml-8 space-y-2 ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                   <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={settings.notify24h}
                        onChange={(e) => onUpdateSettings({...settings, notify24h: e.target.checked})}
                        className="rounded text-medical-600 focus:ring-medical-500" 
                      />
                      <span className="text-sm text-slate-600">Gửi nhắc nhở trước 24 giờ</span>
                   </label>
                   <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={settings.notify1h}
                        onChange={(e) => onUpdateSettings({...settings, notify1h: e.target.checked})}
                        className="rounded text-medical-600 focus:ring-medical-500" 
                      />
                      <span className="text-sm text-slate-600">Gửi nhắc nhở trước 1 giờ</span>
                   </label>
                </div>
              </div>
            </div>

            <div className="p-6">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center">
                   Lịch sử thông báo tự động
                   <span className="ml-2 text-xs bg-slate-100 text-slate-500 py-1 px-2 rounded-full normal-case font-normal">{logs.length} tin nhắn</span>
                 </h3>
                 {logs.length > 0 && onClearLogs && (
                   <button 
                     type="button"
                     onClick={onClearLogs}
                     className="flex items-center text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors"
                     title="Xóa toàn bộ lịch sử thông báo"
                   >
                     <Trash2 size={12} className="mr-1.5" />
                     Xóa lịch sử
                   </button>
                 )}
               </div>
               
               {logs.length === 0 ? (
                 <div className="text-center py-10 text-slate-400 italic">Chưa có thông báo nào được gửi.</div>
               ) : (
                 <div className="space-y-3">
                   {logs.slice().reverse().map(log => (
                     <div key={log.id} className="flex items-start bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`mt-1 p-2 rounded-full mr-3 ${log.type === '24h' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                          <Clock size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-800 text-sm">{log.recipientName}</h4>
                            <span className="text-xs text-slate-400">{format(parseISO(log.sentAt), 'HH:mm dd/MM')}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Lịch trực: {format(parseISO(log.shiftDate), 'dd/MM/yyyy')}</p>
                          <p className="text-sm text-slate-600 mt-1">{log.message}</p>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </>
        )}

        {/* TAB 2: MANUAL NOTIFICATIONS (ADMIN ONLY) */}
        {activeTab === 'manual' && currentUser?.role === 'admin' && (
          <div className="p-6 space-y-8">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <Send className="mr-2 text-medical-600" size={20} /> Gửi thông báo mới
              </h3>
              <form onSubmit={handleSendNotification} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full border border-slate-300 rounded-md p-2"
                    placeholder="Ví dụ: Thay đổi quy trình trực..."
                    value={notifTitle}
                    onChange={e => setNotifTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Người nhận</label>
                  <select 
                    className="w-full border border-slate-300 rounded-md p-2"
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                  >
                    <option value="all">-- Toàn bộ nhân viên --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {s.department}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung</label>
                  <textarea 
                    required 
                    rows={4} 
                    className="w-full border border-slate-300 rounded-md p-2"
                    placeholder="Nhập nội dung thông báo..."
                    value={notifContent}
                    onChange={e => setNotifContent(e.target.value)}
                  />
                </div>
                <div className="pt-2 flex justify-end">
                   <Button type="submit" icon={<Send size={16} />}>Gửi thông báo</Button>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
               <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  Danh sách thông báo đã gửi ({manualNotifications.length})
               </h3>
               {manualNotifications.length === 0 ? (
                  <div className="text-center text-slate-400 italic py-4">Chưa có thông báo thủ công nào.</div>
               ) : (
                  <div className="space-y-3">
                     {manualNotifications.slice().reverse().map(notif => (
                        <div key={notif.id} className="border border-slate-100 rounded-lg p-3 hover:shadow-sm transition-shadow">
                           <div className="flex justify-between items-start mb-2">
                              <div>
                                 <h4 className="font-bold text-slate-800 text-sm">{notif.title}</h4>
                                 <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                    <span>Gửi tới: {notif.recipientId === 'all' ? 'Tất cả' : staffList.find(s => s.id === notif.recipientId)?.name || 'Unknown'}</span>
                                    <span>•</span>
                                    <span>{format(parseISO(notif.createdAt), 'HH:mm dd/MM/yyyy')}</span>
                                 </div>
                              </div>
                              {onDeleteManualNotification && (
                                <button 
                                  type="button"
                                  onClick={() => onDeleteManualNotification(notif.id)}
                                  className="text-slate-400 hover:text-red-600 transition-colors"
                                  title="Xóa thông báo này"
                                >
                                   <X size={16} />
                                </button>
                              )}
                           </div>
                           <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{notif.content}</p>
                        </div>
                     ))}
                  </div>
               )}
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY (ADMIN ONLY) */}
        {activeTab === 'security' && currentUser?.role === 'admin' && (
           <div className="p-6">
             <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm max-w-md mx-auto">
               <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                 <Shield className="mr-2 text-red-600" size={20} /> Đổi mật khẩu quản trị
               </h3>
               
               {pwdMsg && (
                 <div className={`mb-4 p-3 rounded-md text-sm ${pwdMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                   {pwdMsg.text}
                 </div>
               )}

               <form onSubmit={handleChangePassword} className="space-y-4">
                 <PasswordInput 
                   label="Mật khẩu hiện tại" 
                   value={currentPwd} 
                   onChange={e => setCurrentPwd(e.target.value)}
                   show={showCurrentPwd}
                   onToggle={() => setShowCurrentPwd(!showCurrentPwd)}
                 />
                 <PasswordInput 
                   label="Mật khẩu mới" 
                   value={newPwd} 
                   onChange={e => setNewPwd(e.target.value)}
                   show={showNewPwd}
                   onToggle={() => setShowNewPwd(!showNewPwd)}
                 />
                 <PasswordInput 
                   label="Xác nhận mật khẩu mới" 
                   value={confirmPwd} 
                   onChange={e => setConfirmPwd(e.target.value)}
                   show={showConfirmPwd}
                   onToggle={() => setShowConfirmPwd(!showConfirmPwd)}
                 />
                 <div className="pt-2">
                    <Button type="submit" variant="secondary" className="w-full" icon={<Lock size={16} />}>Cập nhật mật khẩu</Button>
                 </div>
               </form>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};