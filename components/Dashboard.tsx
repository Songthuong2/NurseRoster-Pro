import React, { useMemo, useState } from 'react';
import { Staff, ShiftAssignment, Holiday, ManualNotification, User } from '../types';
import { parseISO, format, getMonth, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { Search, Calendar, Award, Megaphone, Users, TrendingUp, Activity, BarChart3, AlertCircle } from 'lucide-react';

interface DashboardProps {
  staffList: Staff[];
  shifts: ShiftAssignment[];
  holidays: Holiday[];
  manualNotifications?: ManualNotification[];
  currentUser: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ staffList, shifts, holidays, manualNotifications = [], currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Generate years from 2023 to 2030
  const availableYears = Array.from({ length: 8 }, (_, i) => 2023 + i);

  const monthsInYear = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfYear(new Date(selectedYear, 0, 1)),
      end: endOfYear(new Date(selectedYear, 0, 1))
    });
  }, [selectedYear]);

  // --- ANALYTICS LOGIC ---

  // 1. Filter shifts for selected year
  const yearShifts = useMemo(() => {
    return shifts.filter(s => new Date(s.date).getFullYear() === selectedYear);
  }, [shifts, selectedYear]);

  // 2. Calculate KPI Metrics
  const kpi = useMemo(() => {
    const totalShifts = yearShifts.length;
    const avgShiftsPerStaff = staffList.length > 0 ? Math.round(totalShifts / staffList.length) : 0;
    
    // Find busiest month
    const monthCounts = new Array(12).fill(0);
    yearShifts.forEach(s => {
      const m = new Date(s.date).getMonth();
      monthCounts[m]++;
    });
    const maxMonthVal = Math.max(...monthCounts);
    const busiestMonthIndex = monthCounts.indexOf(maxMonthVal);
    
    return {
      totalStaff: staffList.length,
      totalShifts,
      avgShiftsPerStaff,
      busiestMonth: `Tháng ${busiestMonthIndex + 1}`,
      monthCounts, // For chart
      maxMonthVal
    };
  }, [yearShifts, staffList]);

  // 3. Detailed Staff Stats (Existing logic refined)
  const detailedStats = useMemo(() => {
    return staffList.map(staff => {
      const myShifts = shifts.filter(s => s.staffId === staff.id); // All time shifts for total record? Or year? Let's use year for the grid
      const myYearShifts = yearShifts.filter(s => s.staffId === staff.id);
      
      const monthlyStats = monthsInYear.map(monthDate => {
        const monthIndex = getMonth(monthDate);
        const shiftsInMonth = myYearShifts.filter(s => getMonth(parseISO(s.date)) === monthIndex);
        const days = shiftsInMonth.map(s => format(parseISO(s.date), 'dd')).sort();
        
        return {
          month: monthIndex + 1,
          count: shiftsInMonth.length,
          days: days.join(', ')
        };
      });

      const holidayShifts = myYearShifts.filter(s => holidays.some(h => h.date === s.date));

      return {
        ...staff,
        totalYearShifts: myYearShifts.length,
        holidayShiftsCount: holidayShifts.length,
        monthlyStats
      };
    }).filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staffList, shifts, yearShifts, holidays, monthsInYear, searchTerm]);

  // Filter relevant notifications
  const myNotifications = useMemo(() => {
    return manualNotifications.filter(n => 
      n.recipientId === 'all' || 
      (currentUser.role === 'staff' && n.recipientId === currentUser.staffId) ||
      (currentUser.role === 'admin')
    ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [manualNotifications, currentUser]);

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 flex items-center">
             <Activity className="mr-2 text-medical-600" /> 
             Dashboard Tổng Hợp
           </h1>
           <p className="text-slate-500 text-sm mt-1">Tổng quan hiệu suất và phân bổ nhân sự năm {selectedYear}</p>
        </div>
        <div className="flex items-center space-x-3 bg-slate-50 p-1 rounded-lg border border-slate-200">
           <div className="flex items-center px-3 py-1.5 bg-white rounded shadow-sm border border-slate-100">
              <Calendar size={16} className="text-slate-500 mr-2" />
              <select 
                className="bg-transparent font-semibold text-slate-700 outline-none text-sm cursor-pointer"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>Năm {year}</option>
                ))}
              </select>
           </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Tổng nhân sự" 
          value={kpi.totalStaff} 
          sub="Nhân viên đang hoạt động" 
          icon={<Users size={24} className="text-blue-600" />}
          color="bg-blue-50"
          borderColor="border-blue-200"
        />
        <KpiCard 
          title="Tổng ca trực" 
          value={kpi.totalShifts} 
          sub={`Trong năm ${selectedYear}`} 
          icon={<Award size={24} className="text-indigo-600" />}
          color="bg-indigo-50"
          borderColor="border-indigo-200"
        />
        <KpiCard 
          title="Trung bình / Người" 
          value={kpi.avgShiftsPerStaff} 
          sub="Ca trực mỗi năm" 
          icon={<BarChart3 size={24} className="text-emerald-600" />}
          color="bg-emerald-50"
          borderColor="border-emerald-200"
        />
         <KpiCard 
          title="Tháng cao điểm" 
          value={kpi.busiestMonth} 
          sub="Mật độ trực cao nhất" 
          icon={<TrendingUp size={24} className="text-orange-600" />}
          color="bg-orange-50"
          borderColor="border-orange-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART SECTION: MONTHLY TREND */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center">
            <BarChart3 size={18} className="mr-2 text-slate-400" />
            Biểu đồ phân bổ ca trực theo tháng
          </h3>
          <div className="flex-1 flex items-end justify-between gap-2 h-48 px-2">
            {kpi.monthCounts.map((count, idx) => {
              const heightPercentage = kpi.maxMonthVal > 0 ? (count / kpi.maxMonthVal) * 100 : 0;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group relative">
                   <div 
                      className="w-full bg-medical-500 rounded-t-sm hover:bg-medical-600 transition-all relative"
                      style={{ height: `${heightPercentage}%`, minHeight: '4px' }}
                   >
                     {/* Tooltip */}
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {count} ca
                     </div>
                   </div>
                   <span className="text-xs text-slate-500 mt-2 font-medium">T{idx + 1}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* NOTIFICATIONS & ALERTS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full max-h-[340px]">
           <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center">
                <Megaphone size={18} className="mr-2 text-orange-500" /> Thông báo
              </h3>
              {myNotifications.length > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{myNotifications.length}</span>}
           </div>
           <div className="overflow-y-auto p-0 scrollbar-thin flex-1">
             {myNotifications.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
                 <AlertCircle size={32} className="mb-2 opacity-50" />
                 <span className="text-sm">Không có thông báo mới</span>
               </div>
             ) : (
               <div className="divide-y divide-slate-100">
                 {myNotifications.map(notif => (
                    <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors">
                       <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-medical-700 bg-medical-50 px-2 py-0.5 rounded">{notif.senderName}</span>
                          <span className="text-[10px] text-slate-400">{format(parseISO(notif.createdAt), 'dd/MM')}</span>
                       </div>
                       <h4 className="font-bold text-sm text-slate-800 mb-1 line-clamp-1">{notif.title}</h4>
                       <p className="text-xs text-slate-500 line-clamp-2">{notif.content}</p>
                    </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      </div>

      {/* DETAILED TABLE */}
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
             <h3 className="font-bold text-xl text-slate-800">Chi tiết công tác nhân viên</h3>
             <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm nhân viên..."
                  className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-medical-500 focus:border-medical-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
          
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 px-6 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    Nhân viên
                  </th>
                  {monthsInYear.map(m => (
                    <th key={m.toString()} className="px-3 py-4 text-center text-sm font-bold text-slate-600 uppercase tracking-wider min-w-[50px] border-r">
                      T{getMonth(m) + 1}
                    </th>
                  ))}
                  <th className="px-4 py-4 text-center text-sm font-bold text-red-600 uppercase tracking-wider w-24 border-r bg-red-50/50">Lễ</th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-medical-700 uppercase tracking-wider w-24 bg-medical-50/50">Tổng</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-base">
                {detailedStats.map((staff, idx) => (
                  <tr key={staff.id} className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30`}>
                    <td className="sticky left-0 z-10 bg-inherit group-hover:bg-blue-50/30 px-6 py-4 whitespace-nowrap border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white mr-4 shadow-sm ${['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500'][idx % 4]}`}>
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-lg font-bold text-slate-800">{staff.name}</div>
                          <div className="text-sm text-slate-500">{staff.department}</div>
                        </div>
                      </div>
                    </td>
                    {staff.monthlyStats.map((stat) => (
                      <td 
                        key={stat.month} 
                        className="px-3 py-4 whitespace-nowrap text-center border-r relative"
                      >
                         {stat.count > 0 ? (
                           <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-slate-200 text-lg font-bold text-slate-700 group-hover:border-medical-200 group-hover:text-medical-700 shadow-sm transition-all" title={`Ngày trực: ${stat.days}`}>
                             {stat.count}
                           </span>
                         ) : (
                           <span className="text-slate-300 text-base">-</span>
                         )}
                      </td>
                    ))}
                    <td className="px-4 py-4 whitespace-nowrap text-center border-r bg-red-50/20">
                      <span className={`text-lg font-bold ${staff.holidayShiftsCount > 0 ? 'text-red-600 bg-red-100 px-3 py-1 rounded-full' : 'text-slate-300'}`}>
                        {staff.holidayShiftsCount > 0 ? staff.holidayShiftsCount : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center bg-medical-50/20">
                       <span className="inline-block px-4 py-2 rounded-lg bg-medical-100 text-medical-800 text-lg font-bold shadow-sm">
                         {staff.totalYearShifts}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Component for KPI Cards
const KpiCard = ({ title, value, sub, icon, color, borderColor }: { title: string, value: string | number, sub: string, icon: React.ReactNode, color: string, borderColor: string }) => (
  <div className={`bg-white rounded-xl p-5 border-l-4 shadow-sm flex items-start justify-between ${borderColor}`}>
     <div>
       <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
       <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
       <p className="text-xs text-slate-400 mt-1">{sub}</p>
     </div>
     <div className={`p-3 rounded-lg ${color}`}>
       {icon}
     </div>
  </div>
);