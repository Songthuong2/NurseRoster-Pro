import React, { useState } from 'react';
import { Holiday, Staff, ShiftAssignment, User } from '../types';
import { Button } from './ui/Button';
import { Plus, Calendar, AlertCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

interface HolidayManagerProps {
  holidays: Holiday[];
  setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
  shifts: ShiftAssignment[];
  staffList: Staff[];
  currentUser: User;
}

export const HolidayManager: React.FC<HolidayManagerProps> = ({ holidays, setHolidays, shifts, staffList, currentUser }) => {
  const [newHoliday, setNewHoliday] = useState<Partial<Holiday>>({ name: '', date: '', note: '' });

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHoliday.name && newHoliday.date) {
      setHolidays([...holidays, { 
        id: Math.random().toString(36).substr(2, 9),
        name: newHoliday.name,
        date: newHoliday.date,
        isLunar: false,
        note: newHoliday.note
      }]);
      setNewHoliday({ name: '', date: '', note: '' });
    }
  };

  const handleDelete = (id: string) => {
    setHolidays(prev => prev.filter(h => h.id !== id));
  };

  const getStaffOnDuty = (date: string) => {
    const assignments = shifts.filter(s => s.date === date);
    if (assignments.length === 0) return null;
    return assignments.map(a => {
      const staff = staffList.find(s => s.id === a.staffId);
      return staff ? staff.name : 'Unknown';
    }).join(', ');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
          <Calendar className="mr-2" /> Danh sách ngày nghỉ lễ
        </h2>
        
        {currentUser.role === 'admin' && (
          <form onSubmit={handleAddHoliday} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-500 mb-1">Tên ngày lễ</label>
              <input type="text" required placeholder="Ví dụ: Giỗ tổ Hùng Vương" className="w-full border border-slate-300 rounded-md p-2 text-sm"
                value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} />
            </div>
            <div className="w-full md:w-40">
              <label className="block text-xs font-medium text-slate-500 mb-1">Ngày (Dương lịch)</label>
              <input type="date" required className="w-full border border-slate-300 rounded-md p-2 text-sm"
                value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} />
            </div>
            <div className="flex-1 w-full">
               <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú</label>
               <input type="text" placeholder="Ghi chú thêm..." className="w-full border border-slate-300 rounded-md p-2 text-sm"
                 value={newHoliday.note || ''} onChange={e => setNewHoliday({...newHoliday, note: e.target.value})} />
            </div>
            <Button type="submit" icon={<Plus size={16}/>}>Thêm</Button>
          </form>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ngày</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tên ngày lễ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Loại lịch</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nhân viên trực</th>
                {currentUser.role === 'admin' && <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {holidays
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((holiday) => {
                  const staffOnDuty = getStaffOnDuty(holiday.date);
                  return (
                    <tr key={holiday.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {isValid(parseISO(holiday.date)) ? format(parseISO(holiday.date), 'dd/MM/yyyy') : holiday.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{holiday.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {holiday.isLunar ? <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">Âm lịch</span> : <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Dương lịch</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {staffOnDuty ? (
                          <div className="flex items-center text-medical-700 font-medium">
                            {staffOnDuty}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa xếp lịch</span>
                        )}
                      </td>
                      {currentUser.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button onClick={() => handleDelete(holiday.id)} className="text-red-500 hover:text-red-700 font-medium">Xoá</button>
                        </td>
                      )}
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};