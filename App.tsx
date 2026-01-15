import React, { useState, useEffect, useRef } from 'react';
import { Staff, ShiftAssignment, Holiday, User, NotificationLog, ManualNotification } from './types';
import { INITIAL_STAFF, INITIAL_HOLIDAYS, INITIAL_SHIFTS } from './constants';
import { StaffManager } from './components/StaffManager';
import { ScheduleManager } from './components/ScheduleManager';
import { Dashboard } from './components/Dashboard';
import { HolidayManager } from './components/HolidayManager';
import { NotificationPanel } from './components/NotificationPanel';
import { LoginScreen } from './components/LoginScreen';
import { LayoutDashboard, Users, Calendar, Palmtree, Menu, X, Bell, LogOut } from 'lucide-react';
import { addHours, differenceInMinutes, parseISO, format } from 'date-fns';

enum Tab {
  DASHBOARD = 'dashboard',
  SCHEDULE = 'schedule',
  STAFF = 'staff',
  HOLIDAYS = 'holidays',
  NOTIFICATIONS = 'notifications'
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data State
  const [staffList, setStaffList] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('nr_staff');
    return saved ? JSON.parse(saved) : INITIAL_STAFF;
  });

  const [shifts, setShifts] = useState<ShiftAssignment[]>(() => {
    const saved = localStorage.getItem('nr_shifts');
    return saved ? JSON.parse(saved) : INITIAL_SHIFTS;
  });

  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const saved = localStorage.getItem('nr_holidays');
    return saved ? JSON.parse(saved) : INITIAL_HOLIDAYS;
  });

  // Admin Security State
  const [adminPassword, setAdminPassword] = useState(() => {
    return localStorage.getItem('nr_admin_pwd') || '123456';
  });

  // Settings & Notification State
  const [settings, setSettings] = useState({ shiftsPerDay: 3 });
  const [notifSettings, setNotifSettings] = useState({ enabled: true, notify24h: true, notify1h: true });
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [manualNotifications, setManualNotifications] = useState<ManualNotification[]>(() => {
    const saved = localStorage.getItem('nr_manual_notifs');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence
  useEffect(() => localStorage.setItem('nr_staff', JSON.stringify(staffList)), [staffList]);
  useEffect(() => localStorage.setItem('nr_shifts', JSON.stringify(shifts)), [shifts]);
  useEffect(() => localStorage.setItem('nr_holidays', JSON.stringify(holidays)), [holidays]);
  useEffect(() => localStorage.setItem('nr_admin_pwd', adminPassword), [adminPassword]);
  useEffect(() => localStorage.setItem('nr_manual_notifs', JSON.stringify(manualNotifications)), [manualNotifications]);

  // --- Notification Simulation Logic ---
  // Using a ref to prevent spamming notifications for the same shift in the same session
  const sentNotificationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notifSettings.enabled) return;

    const checkShifts = () => {
      const now = new Date();
      
      shifts.forEach(shift => {
        const shiftDate = parseISO(shift.date);
        const shiftStart = new Date(shiftDate);
        shiftStart.setHours(7, 0, 0, 0);

        const diffMinutes = differenceInMinutes(shiftStart, now);
        
        // Check 24h before (1440 mins) with a 5 min window
        if (notifSettings.notify24h && diffMinutes > 1435 && diffMinutes < 1445) {
          const key = `${shift.id}-24h`;
          if (!sentNotificationsRef.current.has(key)) {
            sendNotification(shift, '24h');
            sentNotificationsRef.current.add(key);
          }
        }

        // Check 1h before (60 mins) with a 5 min window
        if (notifSettings.notify1h && diffMinutes > 55 && diffMinutes < 65) {
          const key = `${shift.id}-1h`;
          if (!sentNotificationsRef.current.has(key)) {
            sendNotification(shift, '1h');
            sentNotificationsRef.current.add(key);
          }
        }
      });
    };

    const sendNotification = (shift: ShiftAssignment, type: '24h' | '1h') => {
      const staff = staffList.find(s => s.id === shift.staffId);
      if (!staff) return;

      const message = type === '24h' 
        ? `Nhắc nhở: Bạn có lịch trực ngày mai ${shift.date}.`
        : `Nhắc nhở: Ca trực của bạn sẽ bắt đầu sau 1 giờ.`;

      const newLog: NotificationLog = {
        id: Math.random().toString(36),
        sentAt: new Date().toISOString(),
        recipientName: staff.name,
        shiftDate: shift.date,
        type,
        message
      };

      setNotificationLogs(prev => [...prev, newLog]);
      
      // Browser Notification
      if (Notification.permission === 'granted') {
        new Notification("NurseRoster Pro", { body: `${staff.name}: ${message}` });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    };

    const interval = setInterval(checkShifts, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [shifts, staffList, notifSettings]);


  const handleLogout = () => {
    setCurrentUser(null);
    setIsSidebarOpen(false);
  };

  if (!currentUser) {
    return (
      <LoginScreen 
        staffList={staffList} 
        onLogin={setCurrentUser} 
        adminPassword={adminPassword} 
      />
    );
  }

  const menuItems = [
    { id: Tab.DASHBOARD, label: 'Tổng hợp', icon: <LayoutDashboard size={20} /> },
    { id: Tab.SCHEDULE, label: 'Lịch trực tuần', icon: <Calendar size={20} /> },
    { id: Tab.STAFF, label: 'Danh sách nhân viên', icon: <Users size={20} /> },
    { id: Tab.HOLIDAYS, label: 'Ngày nghỉ lễ', icon: <Palmtree size={20} /> },
    { id: Tab.NOTIFICATIONS, label: 'Thông báo', icon: <Bell size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 shadow-xl flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 h-16 border-b border-slate-700">
          <div className="flex items-center space-x-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-medical-500 rounded-lg flex items-center justify-center text-white">NR</div>
            <span>NurseRoster</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2 mt-4 flex-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
              className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-medical-600 text-white shadow-lg shadow-medical-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentUser.role === 'admin' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
              {currentUser.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-medium text-sm truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-400">{currentUser.role === 'admin' ? 'Quản trị viên' : 'Điều dưỡng'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 rounded text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <LogOut size={14} className="mr-2" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white shadow-sm h-16 flex items-center justify-between px-4 z-40">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 mr-4">
              <Menu size={24} />
            </button>
            <span className="font-bold text-lg text-slate-800">NurseRoster Pro</span>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${currentUser.role === 'admin' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
            {currentUser.name.charAt(0)}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin">
          {activeTab === Tab.DASHBOARD && (
            <Dashboard 
              staffList={staffList} 
              shifts={shifts} 
              holidays={holidays}
              manualNotifications={manualNotifications}
              currentUser={currentUser}
            />
          )}
          {activeTab === Tab.STAFF && (
            <StaffManager 
              staffList={staffList} 
              setStaffList={setStaffList} 
              currentUser={currentUser}
            />
          )}
          {activeTab === Tab.SCHEDULE && (
            <ScheduleManager 
              staffList={staffList} 
              shifts={shifts} 
              setShifts={setShifts} 
              holidays={holidays}
              settings={settings}
              setSettings={setSettings}
              currentUser={currentUser}
            />
          )}
          {activeTab === Tab.HOLIDAYS && (
            <HolidayManager 
              holidays={holidays} 
              setHolidays={setHolidays} 
              shifts={shifts}
              staffList={staffList}
              currentUser={currentUser}
            />
          )}
          {activeTab === Tab.NOTIFICATIONS && (
            <NotificationPanel 
              logs={notificationLogs} 
              settings={notifSettings} 
              onUpdateSettings={setNotifSettings}
              staffList={staffList}
              manualNotifications={manualNotifications}
              setManualNotifications={setManualNotifications}
              currentUser={currentUser}
              adminPassword={adminPassword}
              setAdminPassword={setAdminPassword}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;