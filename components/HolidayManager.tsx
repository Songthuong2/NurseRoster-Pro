import React, { useState } from 'react';
import { Holiday, Staff, ShiftAssignment, User } from '../types';
import { Button } from './ui/Button';
import { Plus, Calendar, Trash2 } from 'lucide-react';
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
      setHolidays(prev => [...prev, { 
        id: Math.random().toString(36).substr(2, 9),
        name: newHoliday.name!,
        date: newHoliday.date!,
        isLunar: false,
        note: newHoliday.note
      }]);
      setNewHoliday({ name: '', date: '', note: '' });
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Xoá ngày lễ này khỏi danh sách?')) {
      setHolidays(prev => prev.filter(h => h.id !== id));
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
        <Calendar className="mr-2 text-medical-600" /> Danh sách ngày nghỉ lễ
      </h2>
      
      {currentUser.role === 'admin' && (
        <form onSubmit={handleAddHoliday} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg mb-6 border">
          <input required placeholder="Tên ngày lễ" className="border rounded p-2 text-sm" value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} />
          <input type="date" required className="border rounded p-2 text-sm" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} />
          <input placeholder="Ghi chú" className="border rounded p-2 text-sm" value={newHoliday.note || ''} onChange={e => setNewHoliday({...newHoliday, note: e.target.value})} />
          <Button type="submit" icon={<Plus size={16}/>}>Thêm</Button>
        </form>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Ngày</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tên lễ</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y">
            {holidays.sort((a,b) => a.date.localeCompare(b.date)).map((h) => (
              <tr key={h.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">{isValid(parseISO(h.date)) ? format(parseISO(h.date), 'dd/MM/yyyy') : h.date}</td>
                <td className="px-6 py-4 text-sm font-medium">{h.name}</td>
                <td className="px-6 py-4 text-right">
                  {currentUser.role === 'admin' && (
                    <button type="button" onClick={(e) => handleDelete(e, h.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};