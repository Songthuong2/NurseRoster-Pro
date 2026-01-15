
import React, { useState, useMemo } from 'react';
import { Staff, ShiftAssignment, DAYS_OF_WEEK_VI, Holiday, User } from '../types';
// Import Button component from ui directory
import { Button } from './ui/Button';
import { ChevronLeft, ChevronRight, Settings, UserCheck, GripHorizontal, CalendarDays, Calendar, AlertTriangle, Wand2, Loader2, Save, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, differenceInCalendarDays, parseISO } from 'date-fns';

interface ScheduleManagerProps {
  staffList: Staff[];
  shifts: ShiftAssignment[];
  setShifts: React.Dispatch<React.SetStateAction<ShiftAssignment[]>>;
  holidays: Holiday[];
  settings: { shiftsPerDay: number };
  setSettings: React.Dispatch<React.SetStateAction<{ shiftsPerDay: number }>>;
  currentUser: User;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({ 
  staffList, shifts, setShifts, holidays, settings, setSettings, currentUser
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [editingCell, setEditingCell] = useState<{ date: string, slot: number } | null>(null);
  const [filterText, setFilterText] = useState('');
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [draggedShift, setDraggedShift] = useState<{ date: string, slot: number, staffId: string } | null>(null);

  const daysToDisplay = useMemo(() => {
    const start = viewMode === 'month' ? startOfMonth(currentDate) : startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = viewMode === 'month' ? endOfMonth(currentDate) : endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate, viewMode]);

  const assignStaff = (dateStr: string, slotIndex: number, staffId: string) => {
    if (currentUser.role !== 'admin') return;
    setShifts(prev => {
      const filtered = prev.filter(s => !(s.date === dateStr && s.slotIndex === slotIndex));
      if (!staffId) return filtered;
      return [...filtered, { id: Math.random().toString(36).substr(2, 9), date: dateStr, slotIndex, staffId }];
    });
    setEditingCell(null);
  };

  const handleAutoSchedule = () => {
    if (staffList.length === 0) {
      alert("Cần danh sách nhân viên để xếp lịch.");
      return;
    }

    const allowDoubleShift = settings.shiftsPerDay > staffList.length;
    if (!window.confirm(`Tự động xếp lịch cho các ô trống? ${allowDoubleShift ? '\n(Lưu ý: Do ít nhân sự, hệ thống sẽ xếp trùng người trong ngày)' : ''}`)) return;

    setIsAutoScheduling(true);

    setTimeout(() => {
      try {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Khởi tạo thống kê
        const staffStats: Record<string, { count: number, lastDate: Date | null }> = {};
        staffList.forEach(s => staffStats[s.id] = { count: 0, lastDate: null });

        // Cập nhật thống kê từ lịch hiện tại
        shifts.forEach(s => {
          if (staffStats[s.staffId]) {
            const d = parseISO(s.date);
            if (d >= monthStart && d <= monthEnd) staffStats[s.staffId].count++;
            if (!staffStats[s.staffId].lastDate || d > staffStats[s.staffId].lastDate!) staffStats[s.staffId].lastDate = d;
          }
        });

        const newAssignments: ShiftAssignment[] = [];
        let count = 0;

        for (const day of days) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const workersToday = new Set<string>();
          
          // Lấy danh sách những người đã có lịch ngày này
          shifts.filter(s => s.date === dateStr).forEach(s => workersToday.add(s.staffId));
          newAssignments.filter(s => s.date === dateStr).forEach(s => workersToday.add(s.staffId));

          for (let slot = 0; slot < settings.shiftsPerDay; slot++) {
            const occupied = shifts.some(s => s.date === dateStr && s.slotIndex === slot) || 
                             newAssignments.some(s => s.date === dateStr && s.slotIndex === slot);
            if (occupied) continue;

            const candidates = staffList.map(staff => {
              const stats = staffStats[staff.id];
              const isWorkingToday = workersToday.has(staff.id);
              const daysSinceLast = stats.lastDate ? differenceInCalendarDays(day, stats.lastDate) : 99;
              
              let score = (staff.targetShifts || 20) - stats.count; // Ưu tiên người chưa đủ định mức
              score *= 100;
              score += Math.min(daysSinceLast, 7) * 10; // Ưu tiên người nghỉ lâu nhất
              
              if (isWorkingToday && !allowDoubleShift) score -= 1000000;
              if (isWorkingToday && allowDoubleShift) score -= 5000; // Hạn chế tối đa trùng nếu được
              if (daysSinceLast === 1) score -= 200; // Hạn chế trực 2 ngày liên tiếp

              return { id: staff.id, score: score + Math.random() * 5 };
            }).sort((a,b) => b.score - a.score);

            const best = candidates[0];
            if (best && best.score > -500000) {
              newAssignments.push({
                id: 'auto-' + Math.random().toString(36).substr(2, 5),
                date: dateStr,
                slotIndex: slot,
                staffId: best.id
              });
              staffStats[best.id].count++;
              staffStats[best.id].lastDate = day;
              workersToday.add(best.id);
              count++;
            }
          }
        }

        if (count > 0) {
          setShifts(prev => [...prev, ...newAssignments]);
          alert(`Đã xếp thêm ${count} ca trực.`);
        } else {
          alert("Không tìm thấy vị trí trống phù hợp.");
        }
      } catch (err) {
        console.error(err);
        alert("Có lỗi khi xếp lịch.");
      } finally {
        setIsAutoScheduling(false);
      }
    }, 100);
  };

  const CellEditor = ({ dateStr, slotIndex, currentStaffId }: { dateStr: string, slotIndex: number, currentStaffId?: string }) => {
    const busyOnDay = new Set(shifts.filter(s => s.date === dateStr && s.slotIndex !== slotIndex).map(s => s.staffId));
    const filtered = staffList.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()));

    return (
      <div className="absolute z-50 top-0 left-0 w-64 bg-white border border-medical-500 shadow-2xl rounded-lg p-2 animate-in zoom-in duration-150">
        <input autoFocus placeholder="Tìm tên..." className="w-full border-b p-2 mb-2 outline-none font-bold" value={filterText} onChange={e => setFilterText(e.target.value)} />
        <div className="max-h-64 overflow-y-auto">
          <button 
            type="button"
            className="w-full text-left p-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-bold border-b mb-1"
            onClick={(e) => { e.stopPropagation(); assignStaff(dateStr, slotIndex, ''); }}
          >
            <Trash2 size={14} /> Xoá người trực
          </button>
          {filtered.map(s => (
            <div key={s.id} onClick={() => assignStaff(dateStr, slotIndex, s.id)} className={`p-2 hover:bg-medical-50 cursor-pointer rounded flex justify-between items-center ${busyOnDay.has(s.id) ? 'opacity-50 italic' : ''}`}>
              <span>{s.name}</span>
              {busyOnDay.has(s.id) && <AlertTriangle size={12} className="text-orange-500" />}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 bg-slate-50 border-b flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-lg border p-1">
             <button onClick={() => setViewMode('month')} className={`px-3 py-1 rounded-md text-sm font-bold ${viewMode === 'month' ? 'bg-medical-100 text-medical-700' : 'text-slate-500'}`}>Tháng</button>
             <button onClick={() => setViewMode('week')} className={`px-3 py-1 rounded-md text-sm font-bold ${viewMode === 'week' ? 'bg-medical-100 text-medical-700' : 'text-slate-500'}`}>Tuần</button>
          </div>
          <div className="flex items-center bg-white rounded-lg border p-1">
            <button onClick={() => setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft size={18}/></button>
            <span className="px-4 font-bold min-w-[140px] text-center">{viewMode === 'month' ? format(currentDate, 'MM/yyyy') : `Tuần ${format(daysToDisplay[0], 'dd/MM')}`}</span>
            <button onClick={() => setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))} className="p-1 hover:bg-slate-100 rounded"><ChevronRight size={18}/></button>
          </div>
        </div>

        {currentUser.role === 'admin' && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => localStorage.setItem('backup_shifts', JSON.stringify(shifts))} icon={<Save size={16}/>}>Lưu</Button>
            <Button onClick={handleAutoSchedule} isLoading={isAutoScheduling} icon={<Wand2 size={16}/>}>Tự xếp lịch</Button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border text-sm font-bold">
              <Settings size={14}/>
              <select value={settings.shiftsPerDay} onChange={e => setSettings({...settings, shiftsPerDay: parseInt(e.target.value)})}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} người/ca</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-4">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-100 sticky top-0 z-30">
              <th className="p-3 border text-center bg-slate-100 sticky left-0 z-40 w-16">Ngày</th>
              <th className="p-3 border text-center bg-slate-100 sticky left-16 z-40 w-16">Thứ</th>
              {Array.from({length: settings.shiftsPerDay}).map((_, i) => (
                <th key={i} className="p-3 border text-left min-w-[180px]">Vị trí {i+1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daysToDisplay.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dIdx = getDay(day);
              const holiday = holidays.find(h => h.date === dateStr);
              return (
                <tr key={dateStr} className={`${holiday ? 'bg-red-50' : dIdx === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                  <td className={`p-3 border text-center sticky left-0 z-10 font-bold bg-inherit`}>{format(day, 'dd')}</td>
                  <td className={`p-3 border text-center sticky left-16 z-10 bg-inherit ${dIdx === 0 ? 'text-red-500' : ''}`}>{DAYS_OF_WEEK_VI[dIdx]}</td>
                  {Array.from({length: settings.shiftsPerDay}).map((_, slot) => {
                    const shift = shifts.find(s => s.date === dateStr && s.slotIndex === slot);
                    const staff = staffList.find(s => s.id === shift?.staffId);
                    const isEditing = editingCell?.date === dateStr && editingCell?.slot === slot;
                    return (
                      <td key={slot} className="p-0 border relative h-12" onClick={() => currentUser.role === 'admin' && setEditingCell({date: dateStr, slot})}>
                        {isEditing ? <CellEditor dateStr={dateStr} slotIndex={slot} currentStaffId={staff?.id} /> : (
                          <div className="w-full h-full flex items-center px-3 hover:bg-slate-50 cursor-pointer">
                            {staff ? (
                              <span className="font-medium text-slate-700 truncate">{staff.name}</span>
                            ) : (
                              currentUser.role === 'admin' && <span className="text-slate-300 italic text-xs">+ Chọn</span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
