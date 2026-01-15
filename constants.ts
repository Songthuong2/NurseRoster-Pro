import { Staff, Holiday, ShiftAssignment } from './types';

export const INITIAL_STAFF: Staff[] = [
  { id: '1', name: 'Nguyễn Văn A', position: 'Điều dưỡng trưởng', department: 'Hồi sức' },
  { id: '2', name: 'Trần Thị B', position: 'Điều dưỡng viên', department: 'Cấp cứu' },
  { id: '3', name: 'Lê Văn C', position: 'Điều dưỡng viên', department: 'Nội khoa' },
  { id: '4', name: 'Phạm Thị D', position: 'Điều dưỡng viên', department: 'Ngoại khoa' },
  { id: '5', name: 'Hoàng Văn E', position: 'Kỹ thuật viên', department: 'Xét nghiệm' },
];

export const INITIAL_HOLIDAYS: Holiday[] = [
  { id: 'h1', date: '2024-01-01', name: 'Tết Dương Lịch', isLunar: false },
  { id: 'h2', date: '2024-02-10', name: 'Mùng 1 Tết Nguyên Đán', isLunar: true },
  { id: 'h3', date: '2024-02-11', name: 'Mùng 2 Tết Nguyên Đán', isLunar: true },
  { id: 'h4', date: '2024-02-12', name: 'Mùng 3 Tết Nguyên Đán', isLunar: true },
  { id: 'h5', date: '2024-04-18', name: 'Giỗ Tổ Hùng Vương', isLunar: true }, // 10/3 Lunar
  { id: 'h6', date: '2024-04-30', name: 'Giải phóng miền Nam', isLunar: false },
  { id: 'h7', date: '2024-05-01', name: 'Quốc tế Lao động', isLunar: false },
  { id: 'h8', date: '2024-09-02', name: 'Quốc khánh', isLunar: false },
];

export const INITIAL_SHIFTS: ShiftAssignment[] = [];
