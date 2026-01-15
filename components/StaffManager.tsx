import React, { useState, useRef, useMemo } from 'react';
import { Staff, User } from '../types';
import { Button } from './ui/Button';
import { Plus, Trash2, Edit2, Upload, Search, Download, Lock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface StaffManagerProps {
  staffList: Staff[];
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  currentUser: User;
}

export const StaffManager: React.FC<StaffManagerProps> = ({ staffList, setStaffList, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof Staff; direction: 'asc' | 'desc' } | null>(null);
  const [formData, setFormData] = useState<Partial<Staff>>({});

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staffList, searchTerm]);

  const sortedStaff = useMemo(() => {
    let sortableItems = [...filteredStaff];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredStaff, sortConfig]);

  const requestSort = (key: keyof Staff) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Staff) => {
    if (sortConfig?.key === key) {
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 inline" /> : <ArrowDown size={14} className="ml-1 inline" />;
    }
    return <ArrowUpDown size={14} className="ml-1 inline opacity-20" />;
  };

  const canEdit = (staffId: string) => {
    return currentUser.role === 'admin' || (currentUser.role === 'staff' && currentUser.staffId === staffId);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // Ngăn chặn sự kiện lan ra hàng (row)
    
    if (currentUser.role !== 'admin') return;
    
    if (window.confirm('Bạn có chắc chắn muốn xoá nhân viên này? Mọi dữ liệu liên quan sẽ bị loại bỏ.')) {
      setStaffList(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleEdit = (e: React.MouseEvent, staff: Staff) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canEdit(staff.id)) return;
    setEditingStaff(staff);
    setFormData(staff);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingStaff) {
      setStaffList(prev => prev.map(s => s.id === editingStaff.id ? { ...s, ...formData } as Staff : s));
    } else {
      const newStaff: Staff = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name!,
        position: formData.position || 'Điều dưỡng viên',
        department: formData.department || 'Chung',
        email: formData.email,
        phone: formData.phone,
        targetShifts: formData.targetShifts || 0
      };
      setStaffList(prev => [...prev, newStaff]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-slate-800">Danh sách nhân viên</h2>
        {currentUser.role === 'admin' && (
          <div className="flex gap-2">
             <Button variant="secondary" onClick={() => fileInputRef.current?.click()} icon={<Upload size={16}/>}>Nhập Excel</Button>
             <Button onClick={() => { setEditingStaff(null); setFormData({targetShifts: 20}); setIsModalOpen(true); }} icon={<Plus size={16}/>}>Thêm mới</Button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={() => {}} />
          </div>
        )}
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm kiếm nhân viên..."
          className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['name', 'position', 'department', 'targetShifts'].map((key) => (
                <th key={key} onClick={() => requestSort(key as keyof Staff)} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                  {key === 'name' ? 'Họ và tên' : key === 'position' ? 'Chức vụ' : key === 'department' ? 'Khoa/Phòng' : 'Định mức'} {getSortIcon(key as keyof Staff)}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {sortedStaff.map((staff) => (
              <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{staff.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{staff.position}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{staff.department}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-bold">{staff.targetShifts || 0}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canEdit(staff.id) ? (
                    <div className="flex justify-end gap-2">
                      <button 
                        type="button"
                        onClick={(e) => handleEdit(e, staff)} 
                        className="p-2 text-medical-600 hover:bg-medical-50 rounded-full transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      {currentUser.role === 'admin' && (
                        <button 
                          type="button" 
                          onClick={(e) => handleDelete(e, staff.id)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ) : <Lock size={16} className="ml-auto text-slate-300" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">{editingStaff ? 'Chỉnh sửa' : 'Thêm mới'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input required placeholder="Họ và tên" className="w-full border p-2 rounded" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input placeholder="Chức vụ" className="w-full border p-2 rounded" value={formData.position || ''} onChange={e => setFormData({...formData, position: e.target.value})} />
              <input placeholder="Khoa/Phòng" className="w-full border p-2 rounded" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} />
              <input type="number" placeholder="Định mức ca trực" className="w-full border p-2 rounded" value={formData.targetShifts || ''} onChange={e => setFormData({...formData, targetShifts: parseInt(e.target.value) || 0})} />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                <Button type="submit">Lưu</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};