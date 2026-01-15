import React, { useState, useRef } from 'react';
import { Staff, User } from '../types';
import { Button } from './ui/Button';
import { Plus, Trash2, Edit2, Upload, Search, Download, Lock } from 'lucide-react';
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

  // Form State
  const [formData, setFormData] = useState<Partial<Staff>>({});

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEdit = (staffId: string) => {
    return currentUser.role === 'admin' || (currentUser.role === 'staff' && currentUser.staffId === staffId);
  };

  const handleDelete = (id: string) => {
    if (currentUser.role !== 'admin') return;
    if (window.confirm('Bạn có chắc chắn muốn xoá nhân viên này?')) {
      setStaffList(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleEdit = (staff: Staff) => {
    if (!canEdit(staff.id)) return;
    setEditingStaff(staff);
    setFormData(staff);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingStaff(null);
    setFormData({ name: '', position: 'Điều dưỡng viên', department: '', targetShifts: 20 });
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

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json<any>(ws);

      const newStaffList: Staff[] = data.map((row: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: row['Họ và tên'] || row['Name'] || 'Không tên',
        position: row['Chức vụ'] || row['Position'] || 'Điều dưỡng viên',
        department: row['Khoa/Phòng'] || row['Department'] || 'Chung',
        phone: row['SĐT'] || row['Phone'],
        email: row['Email'],
        targetShifts: row['Số ca dự kiến'] || row['Target'] || 0
      }));

      setStaffList(prev => [...prev, ...newStaffList]);
      alert(`Đã nhập ${newStaffList.length} nhân viên thành công!`);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Họ và tên": "Nguyễn Văn A", "Chức vụ": "Điều dưỡng", "Khoa/Phòng": "Nội khoa", "SĐT": "0912345678", "Email": "a@example.com", "Số ca dự kiến": 20 }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau_Danh_Sach");
    XLSX.writeFile(wb, "mau_danh_sach_nhan_vien.xlsx");
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-slate-800">Danh sách nhân viên</h2>
        {currentUser.role === 'admin' && (
          <div className="flex gap-2">
             <input 
               type="file" 
               ref={fileInputRef}
               className="hidden" 
               accept=".xlsx, .xls"
               onChange={handleExcelImport}
             />
             <Button variant="secondary" onClick={downloadTemplate} icon={<Download size={16}/>}>Tải mẫu</Button>
             <Button variant="secondary" onClick={() => fileInputRef.current?.click()} icon={<Upload size={16}/>}>Nhập Excel</Button>
             <Button onClick={handleAddNew} icon={<Plus size={16}/>}>Thêm mới</Button>
          </div>
        )}
      </div>

      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc khoa phòng..."
          className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Họ và tên</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Chức vụ</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Khoa/Phòng</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Định mức ca/tháng</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredStaff.map((staff) => (
              <tr key={staff.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{staff.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{staff.position}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{staff.department}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
                  <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                    {staff.targetShifts || 0}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canEdit(staff.id) ? (
                    <>
                      <button onClick={() => handleEdit(staff)} className="text-medical-600 hover:text-medical-900 mr-3" title="Chỉnh sửa">
                        <Edit2 size={16} />
                      </button>
                      {currentUser.role === 'admin' && (
                        <button onClick={() => handleDelete(staff.id)} className="text-red-600 hover:text-red-900" title="Xoá">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-300 flex justify-end"><Lock size={16} /></span>
                  )}
                </td>
              </tr>
            ))}
            {filteredStaff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Không tìm thấy nhân viên nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editingStaff ? 'Chỉnh sửa thông tin' : 'Thêm nhân viên mới'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Họ và tên</label>
                <input required type="text" className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2 focus:ring-medical-500 focus:border-medical-500" 
                  value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Chức vụ</label>
                  <input type="text" className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2 focus:ring-medical-500 focus:border-medical-500" 
                    value={formData.position || ''} onChange={e => setFormData({...formData, position: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Khoa/Phòng</label>
                  <input type="text" className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2 focus:ring-medical-500 focus:border-medical-500" 
                    value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700">Định mức số ca trực / tháng</label>
                 <input type="number" min="0" className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2 focus:ring-medical-500 focus:border-medical-500" 
                  value={formData.targetShifts || ''} onChange={e => setFormData({...formData, targetShifts: parseInt(e.target.value) || 0})} />
                  <p className="text-xs text-slate-400 mt-1">Dùng để tính toán tự động xếp lịch</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Số điện thoại</label>
                  <input type="text" className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2 focus:ring-medical-500 focus:border-medical-500" 
                    value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <input type="email" className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2 focus:ring-medical-500 focus:border-medical-500" 
                    value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
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