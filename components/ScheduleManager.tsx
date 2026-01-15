import React, { useState, useMemo } from 'react';
import { Staff, ShiftAssignment, DAYS_OF_WEEK_VI, Holiday, User } from '../types';
import { Button } from './ui/Button';
import { ChevronLeft, ChevronRight, Settings, Lock, UserCheck, GripHorizontal, CalendarDays, Calendar, AlertTriangle, Wand2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, differenceInDays, parseISO } from 'date-fns';

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
  
  // Drag and Drop State
  const [draggedShift, setDraggedShift] = useState<{ date: string, slot: number, staffId: string } | null>(null);

  const daysToDisplay = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    } else {
      // Week view: Monday start
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const getShiftStaff = (dateStr: string, slotIndex: number) => {
    const shift = shifts.find(s => s.date === dateStr && s.slotIndex === slotIndex);
    if (!shift) return null;
    return staffList.find(s => s.id === shift.staffId);
  };

  const assignStaff = (dateStr: string, slotIndex: number, staffId: string) => {
    if (currentUser.role !== 'admin') return;
    setShifts(prev => {
      const filtered = prev.filter(s => !(s.date === dateStr && s.slotIndex === slotIndex));
      if (!staffId) return filtered;
      return [...filtered, { id: Math.random().toString(36), date: dateStr, slotIndex, staffId }];
    });
    setEditingCell(null);
    setFilterText('');
  };

  const isHoliday = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.find(h => h.date === dateStr);
  };

  // --- Auto Schedule Logic ---
  const handleAutoSchedule = () => {
    if (staffList.length === 0) {
      alert("Chưa có danh sách nhân viên. Vui lòng thêm nhân viên trước khi xếp lịch.");
      return;
    }

    if (!window.confirm(`Hệ thống sẽ tự động phân bổ lịch cho tháng ${format(currentDate, 'MM/yyyy')}. 
    
Quy tắc:
- Ưu tiên nhân viên thiếu chỉ tiêu số ca.
- Tối ưu khoảng nghỉ giữa 2 ca trực xa nhất có thể.
- Tránh xếp trùng lịch trong ngày.

Lịch cũ trong tháng này (nếu có) sẽ được giữ nguyên, chỉ điền vào ô trống. Bạn có muốn tiếp tục?`)) {
      return;
    }

    // --- PREPARATION PHASE ---
    const startOfMonthStr = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const endOfMonthStr = format(endOfMonth(currentDate), 'yyyy-MM-dd');

    // Trackers
    const staffLastShiftDate: Record<string, string | null> = {}; // staffId -> dateStr
    const staffMonthShiftCount: Record<string, number> = {}; // staffId -> count

    // Initialize trackers
    staffList.forEach(s => {
      staffLastShiftDate[s.id] = null;
      staffMonthShiftCount[s.id] = 0;
    });

    // 1. Initialize Last Shift Date with shifts strictly BEFORE this month
    shifts.forEach(s => {
      if (s.date < startOfMonthStr) {
        if (!staffLastShiftDate[s.staffId] || s.date > staffLastShiftDate[s.staffId]!) {
          staffLastShiftDate[s.staffId] = s.date;
        }
      }
    });

    // 2. Initialize Month Shift Count with ALL EXISTING shifts in this month
    shifts.forEach(s => {
      if (s.date >= startOfMonthStr && s.date <= endOfMonthStr) {
        staffMonthShiftCount[s.staffId] = (staffMonthShiftCount[s.staffId] || 0) + 1;
      }
    });

    // Helper: Existing shifts lookup for fast access
    const existingShiftsMap: Record<string, ShiftAssignment[]> = {}; // dateStr -> shifts
    shifts.forEach(s => {
       if (s.date >= startOfMonthStr && s.date <= endOfMonthStr) {
         if (!existingShiftsMap[s.date]) existingShiftsMap[s.date] = [];
         existingShiftsMap[s.date].push(s);
       }
    });

    const newShifts: ShiftAssignment[] = [];
    const days = daysToDisplay; 
    let filledCount = 0;

    // --- SCHEDULING LOOP ---
    for (const day of days) {
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // A. Update staffLastShiftDate based on EXISTING shifts for this day
      // This is crucial: If a user manually placed a shift today, it counts as the "last shift" for tomorrow.
      // But it shouldn't affect TODAY's distance calculation (handled by strict same-day check).
      if (existingShiftsMap[dateStr]) {
        existingShiftsMap[dateStr].forEach(s => {
           staffLastShiftDate[s.staffId] = dateStr;
        });
      }

      // Who is working today? (Includes existing + newly assigned in previous slots of loop)
      const staffWorkingToday = new Set<string>();
      if (existingShiftsMap[dateStr]) {
        existingShiftsMap[dateStr].forEach(s => staffWorkingToday.add(s.staffId));
      }

      for (let slot = 0; slot < settings.shiftsPerDay; slot++) {
        // Skip if occupied by existing shift
        const isOccupiedExisting = existingShiftsMap[dateStr]?.some(s => s.slotIndex === slot);
        // Skip if occupied by new shift (just added in loop)
        const isOccupiedNew = newShifts.some(s => s.date === dateStr && s.slotIndex === slot);
        
        if (isOccupiedExisting || isOccupiedNew) continue;

        // Score Candidates
        const candidates = staffList.map(staff => {
           // HARD CONSTRAINT: Cannot work twice in same day
           if (staffWorkingToday.has(staff.id)) {
             return { staff, score: -Number.MAX_SAFE_INTEGER };
           }

           // Metrics
           const lastDate = staffLastShiftDate[staff.id];
           let daysSince = 30; // Default buffer (fresh start)
           if (lastDate) {
              // Note: parseISO parses as local time if no TZ info, dateStr is YYYY-MM-DD
              daysSince = differenceInDays(parseISO(dateStr), parseISO(lastDate));
           }

           // If daysSince < 0, it means lastShiftDate is in future relative to dateStr (shouldn't happen with correct logic)
           // If daysSince == 0, it means they worked today (caught by staffWorkingToday check, but safe to penalize)
           if (daysSince <= 0) return { staff, score: -Number.MAX_SAFE_INTEGER };

           const currentCount = staffMonthShiftCount[staff.id];
           const target = staff.targetShifts || 0; 

           // --- SCORING WEIGHTS ---
           
           // 1. TARGET: Primary Driver
           // High weight to ensure targets are met.
           const targetScore = (target - currentCount) * 100;
           
           // 2. SPACING: Secondary Driver
           // Reward longer breaks. Cap at 7 days to not overshadow target needs.
           const spacingScore = Math.min(daysSince, 7) * 10; 

           // 3. BALANCE: Fallback
           // If targets met, distribute evenly.
           const balanceScore = -currentCount * 5; 

           // 4. PENALTY: Back-to-back
           // If worked yesterday (1 day gap), penalize.
           // However, if we really need them (target deficit is huge), targetScore might override this.
           let penalty = 0;
           if (daysSince === 1) {
              penalty = -5000; 
           }

           const totalScore = targetScore + spacingScore + balanceScore + penalty;
           
           return { staff, score: totalScore };
        });

        // Pick Best Candidate
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];
        
        // Threshold:
        // We allow back-to-back (-5000 penalty) if other scores push it up, or if it's the least bad option.
        // -10000 ensures we don't pick "Same Day" (-MAX_INT) but allow back-to-back if needed.
        if (best && best.score > -100000) {
           const assignment: ShiftAssignment = {
             id: Math.random().toString(36).substring(2, 11),
             date: dateStr,
             slotIndex: slot,
             staffId: best.staff.id
           };
           
           newShifts.push(assignment);
           
           // Update Trackers immediately
           staffLastShiftDate[best.staff.id] = dateStr;
           staffMonthShiftCount[best.staff.id]++;
           staffWorkingToday.add(best.staff.id);
           filledCount++;
        }
      }
    }

    if (filledCount > 0) {
      setShifts(prev => [...prev, ...newShifts]);
      alert(`Đã xếp thành công ${filledCount} ca trực mới!`);
    } else {
      alert('Không có ô trống nào cần điền hoặc không tìm được nhân viên phù hợp.');
    }
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, date: string, slot: number, staffId: string) => {
    if (currentUser.role !== 'admin') {
      e.preventDefault();
      return;
    }
    setDraggedShift({ date, slot, staffId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (currentUser.role !== 'admin' || !draggedShift) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: string, targetSlot: number) => {
    e.preventDefault();
    if (currentUser.role !== 'admin' || !draggedShift) return;

    if (draggedShift.date === targetDate && draggedShift.slot === targetSlot) {
      setDraggedShift(null);
      return;
    }

    setShifts(prev => {
      const sourceShift = prev.find(s => s.date === draggedShift.date && s.slotIndex === draggedShift.slot);
      const targetShift = prev.find(s => s.date === targetDate && s.slotIndex === targetSlot);

      if (!sourceShift) return prev;

      let nextShifts = prev.filter(s => s.id !== sourceShift.id);
      if (targetShift) {
        nextShifts = nextShifts.filter(s => s.id !== targetShift.id);
      }
      nextShifts.push({ ...sourceShift, date: targetDate, slotIndex: targetSlot });
      if (targetShift) {
        nextShifts.push({ ...targetShift, date: draggedShift.date, slotIndex: draggedShift.slot });
      }
      return nextShifts;
    });
    setDraggedShift(null);
  };

  const CellEditor = ({ dateStr, slotIndex, currentStaffId }: { dateStr: string, slotIndex: number, currentStaffId?: string }) => {
    const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()));

    // Identify staff already working on this day (excluding current slot if checking self)
    const busyStaffIds = new Set(
        shifts
            .filter(s => s.date === dateStr && s.slotIndex !== slotIndex)
            .map(s => s.staffId)
    );

    // Helper to calculate days since last shift for suggestions
    const getSuggestionInfo = (staffId: string) => {
      // Check conflict
      if (busyStaffIds.has(staffId)) {
          return { text: 'Đang trực ca khác', days: 0, isConflict: true };
      }

      // Find shifts before this date (Optimization: iterate once to find max date)
      let maxDate: string | null = null;
      for (const s of shifts) {
         if (s.staffId === staffId && s.date < dateStr) {
            if (!maxDate || s.date > maxDate) {
               maxDate = s.date;
            }
         }
      }
      
      if (!maxDate) return { text: '(Chưa trực)', days: 999, isConflict: false };
      const days = differenceInDays(parseISO(dateStr), parseISO(maxDate));
      return { text: `(Cách ${days} ngày)`, days, isConflict: false };
    };

    return (
      <div className="absolute z-50 top-0 left-0 w-full min-w-[240px] bg-white border border-medical-500 shadow-xl rounded-md p-1 animate-in fade-in zoom-in duration-200">
        <input 
          autoFocus
          className="w-full border-b border-slate-200 p-2 text-sm outline-none mb-1 font-semibold"
          placeholder="Nhập tên để tìm..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <div className="max-h-60 overflow-y-auto scrollbar-thin">
          <div 
            className="p-2 hover:bg-red-50 text-red-600 cursor-pointer text-sm font-medium border-b border-slate-100"
            onClick={() => assignStaff(dateStr, slotIndex, '')}
          >
            [Xoá người trực hiện tại]
          </div>
          {filteredStaff.map(s => {
            const info = getSuggestionInfo(s.id);
            
            let suggestionColor = 'text-slate-400';
            let bgColor = '';
            
            if (info.isConflict) {
                suggestionColor = 'text-red-500 font-bold';
                bgColor = 'bg-red-50';
            } else if (info.days > 2) {
                suggestionColor = 'text-green-600';
            } else if (info.days <= 1) {
                suggestionColor = 'text-orange-500 font-bold';
            }
            
            return (
              <div 
                key={s.id}
                className={`p-2 hover:bg-medical-50 cursor-pointer text-sm flex items-center justify-between group ${currentStaffId === s.id ? 'bg-medical-50 text-medical-700 font-bold' : bgColor}`}
                onClick={() => assignStaff(dateStr, slotIndex, s.id)}
              >
                <div className="flex flex-col">
                  <span>{s.name}</span>
                  {s.targetShifts && s.targetShifts > 0 && <span className="text-[10px] text-slate-400">Định mức: {s.targetShifts}</span>}
                </div>
                <div className="flex items-center">
                    {info.isConflict && <AlertTriangle size={12} className="text-red-500 mr-1" />}
                    <span className={`text-[10px] ${suggestionColor}`}>{info.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MM/yyyy');
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      if (start.getMonth() === end.getMonth()) {
        return `Tuần ${format(start, 'dd')} - ${format(end, 'dd/MM/yyyy')}`;
      }
      return `Tuần ${format(start, 'dd/MM')} - ${format(end, 'dd/MM/yyyy')}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-center bg-slate-50 rounded-t-lg gap-4">
        
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
           {/* View Toggle */}
          <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 p-1">
             <button 
               onClick={() => setViewMode('month')}
               className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${viewMode === 'month' ? 'bg-medical-100 text-medical-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               <CalendarDays size={16} className="mr-2 hidden sm:block"/> Tháng
             </button>
             <button 
               onClick={() => setViewMode('week')}
               className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${viewMode === 'week' ? 'bg-medical-100 text-medical-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               <Calendar size={16} className="mr-2 hidden sm:block"/> Tuần
             </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-2 bg-white rounded-md shadow-sm border border-slate-300 p-1">
               <button onClick={handlePrev} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft size={20}/></button>
               <span className="font-bold text-sm sm:text-lg w-32 sm:w-48 text-center text-slate-800 truncate px-2 select-none">
                 {getHeaderTitle()}
               </span>
               <button onClick={handleNext} className="p-1 hover:bg-slate-100 rounded"><ChevronRight size={20}/></button>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          {currentUser.role === 'admin' ? (
            <div className="flex items-center gap-2">
              {viewMode === 'month' && (
                 <button 
                   onClick={handleAutoSchedule}
                   className="flex items-center text-sm bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded shadow-sm transition-colors animate-in fade-in"
                   title="Tự động điền lịch vào các ô trống dựa trên định mức và khoảng nghỉ"
                 >
                   <Wand2 size={16} className="mr-2" />
                   Tự động xếp
                 </button>
              )}
              <div className="flex items-center text-sm text-slate-600 bg-white px-3 py-1 rounded border border-slate-300">
                 <Settings size={16} className="mr-2" />
                 <span className="mr-2 hidden sm:inline">Số người/ca:</span>
                 <select 
                   className="font-bold outline-none border-b border-slate-300 focus:border-medical-500"
                   value={settings.shiftsPerDay}
                   onChange={(e) => setSettings({...settings, shiftsPerDay: parseInt(e.target.value)})}
                 >
                   {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                 </select>
              </div>
            </div>
          ) : (
            <div className="text-sm text-medical-700 bg-medical-50 border border-medical-200 px-3 py-1 rounded flex items-center font-medium shadow-sm">
              <UserCheck size={16} className="mr-2" />
              Chỉ hiển thị lịch của bạn
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto flex-1 p-0 md:p-4 scrollbar-thin">
        <div className="min-w-max border md:rounded-lg overflow-hidden relative">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-100 px-2 py-3 w-12 text-center border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Ngày</th>
                <th className="sticky left-12 z-20 bg-slate-100 px-2 py-3 w-12 text-center border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Thứ</th>
                {Array.from({ length: settings.shiftsPerDay }).map((_, i) => (
                  <th key={i} className="px-6 py-3 border-r min-w-[160px] md:min-w-[200px]">
                    Điều dưỡng {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {daysToDisplay.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const dayIndex = getDay(date);
                const isWeekend = dayIndex === 0 || dayIndex === 6;
                const holiday = isHoliday(date);
                
                // Duplicate Detection Logic
                const staffCounts: Record<string, number> = {};
                const dayShifts = shifts.filter(s => s.date === dateStr);
                dayShifts.forEach(s => {
                  staffCounts[s.staffId] = (staffCounts[s.staffId] || 0) + 1;
                });

                return (
                  <tr key={dateStr} className={`group hover:bg-slate-50 transition-colors ${holiday ? 'bg-red-50 hover:bg-red-100' : isWeekend ? 'bg-slate-50' : 'bg-white'}`}>
                    {/* Sticky Date Column */}
                    <td className={`sticky left-0 z-10 px-2 py-3 text-center font-medium border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${holiday ? 'bg-red-50 group-hover:bg-red-100' : isWeekend ? 'bg-slate-50 group-hover:bg-slate-100' : 'bg-white group-hover:bg-slate-50'}`}>
                       <div className="text-base text-slate-700">{format(date, 'dd')}</div>
                       {holiday && <div className="text-[10px] text-red-600 font-bold leading-tight mt-1 max-w-[50px] mx-auto truncate" title={holiday.name}>{holiday.name}</div>}
                    </td>
                    
                    {/* Sticky Day Column */}
                    <td className={`sticky left-12 z-10 px-2 py-3 text-center border-r font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${dayIndex === 0 ? 'text-red-500' : 'text-slate-600'} ${holiday ? 'bg-red-50 group-hover:bg-red-100' : isWeekend ? 'bg-slate-50 group-hover:bg-slate-100' : 'bg-white group-hover:bg-slate-50'}`}>
                      {DAYS_OF_WEEK_VI[dayIndex]}
                    </td>

                    {/* Shift Slots */}
                    {Array.from({ length: settings.shiftsPerDay }).map((_, slotIndex) => {
                      const staff = getShiftStaff(dateStr, slotIndex);
                      const isEditing = editingCell?.date === dateStr && editingCell?.slot === slotIndex;
                      const isMyShift = currentUser.staffId === staff?.id;
                      const isDuplicate = staff && staffCounts[staff.id] > 1;
                      
                      // Filter Logic:
                      // Admin: Sees everyone
                      // Staff: Sees ONLY themselves. Others are hidden or masked.
                      const isVisible = currentUser.role === 'admin' || isMyShift;
                      const canDrag = currentUser.role === 'admin' && !!staff;
                      const isBeingDragged = draggedShift?.date === dateStr && draggedShift?.slot === slotIndex;
                      const isDragOver = draggedShift && !isBeingDragged; // Potential drop target

                      return (
                        <td 
                          key={`${dateStr}-${slotIndex}`} 
                          className={`p-0 relative h-12 transition-all duration-200 
                            ${isMyShift ? 'bg-yellow-50 ring-inset ring-2 ring-yellow-300' : ''}
                            ${isBeingDragged ? 'opacity-40 bg-slate-100' : ''}
                            ${isDuplicate && isVisible ? 'bg-red-50 ring-2 ring-red-500 z-10' : 'border-r'} 
                          `}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, dateStr, slotIndex)}
                        >
                          {isEditing && currentUser.role === 'admin' ? (
                            <CellEditor dateStr={dateStr} slotIndex={slotIndex} currentStaffId={staff?.id} />
                          ) : (
                            <div 
                              className={`w-full h-full flex items-center px-4 transition-colors 
                                ${currentUser.role === 'admin' ? 'cursor-grab active:cursor-grabbing hover:bg-black/5' : ''}
                              `}
                              draggable={canDrag}
                              title={isDuplicate ? 'Cảnh báo: Nhân viên này đang trực ca khác trong cùng ngày' : ''}
                              onDragStart={(e) => staff && handleDragStart(e, dateStr, slotIndex, staff.id)}
                              onClick={() => {
                                if (currentUser.role === 'admin') {
                                  setFilterText('');
                                  setEditingCell({ date: dateStr, slot: slotIndex });
                                }
                              }}
                            >
                              {staff ? (
                                isVisible ? (
                                    <div className="flex items-center w-full min-w-0">
                                       {currentUser.role === 'admin' && (
                                          <div className="mr-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0">
                                            <GripHorizontal size={14} />
                                          </div>
                                       )}
                                       {isDuplicate && currentUser.role === 'admin' ? (
                                           <div className="text-red-600 mr-2 flex-shrink-0">
                                             <AlertTriangle size={14} />
                                           </div>
                                       ) : (
                                           <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${holiday ? 'bg-red-500' : 'bg-medical-500'}`}></div>
                                       )}
                                       <span className={`font-medium truncate ${isMyShift ? 'text-medical-800 font-bold' : 'text-slate-800'} ${isDuplicate ? 'text-red-700' : ''}`}>
                                          {staff.name}
                                       </span>
                                    </div>
                                ) : (
                                    <span className="text-slate-200 select-none text-xs">● ● ●</span>
                                )
                              ) : (
                                currentUser.role === 'admin' && (
                                  <span className="text-slate-300 text-xs italic opacity-0 group-hover:opacity-100 flex items-center">
                                    <PlusCircleIcon /> Chọn
                                  </span>
                                )
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
      
      <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex flex-wrap gap-4">
         <div className="flex items-center"><div className="w-3 h-3 bg-red-100 border border-red-200 mr-1"></div> Ngày lễ</div>
         <div className="flex items-center"><div className="w-3 h-3 bg-slate-50 border border-slate-200 mr-1"></div> Cuối tuần</div>
         <div className="flex items-center"><div className="w-3 h-3 bg-yellow-50 border border-yellow-200 mr-1"></div> Ca trực của bạn</div>
         <div className="flex items-center text-red-600"><AlertTriangle size={12} className="mr-1" /> Trùng lịch trực</div>
         {currentUser.role === 'staff' && (
             <div className="flex items-center text-slate-400"><div className="mr-1">● ● ●</div> Lịch đồng nghiệp (đã ẩn)</div>
         )}
         {currentUser.role === 'admin' && (
            <div className="flex items-center text-slate-500 italic">
               <GripHorizontal size={12} className="mr-1" /> Kéo thả để thay đổi lịch trực
            </div>
         )}
      </div>
    </div>
  );
};

const PlusCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
);