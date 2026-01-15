export interface Staff {
  id: string;
  name: string;
  position: string;
  department: string;
  phone?: string;
  email?: string;
  targetShifts?: number; // Số ca trực dự kiến trong tháng
}

export interface ShiftAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  slotIndex: number; // 0 for Shift 1, 1 for Shift 2, etc.
  staffId: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  isLunar?: boolean;
  note?: string;
}

export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  staffId?: string; // If role is staff, links to the specific staff member
}

export interface NotificationLog {
  id: string;
  sentAt: string;
  recipientName: string;
  shiftDate: string;
  type: '24h' | '1h';
  message: string;
}

export interface ManualNotification {
  id: string;
  createdAt: string;
  title: string;
  content: string;
  recipientId: string | 'all'; // 'all' or specific staffId
  senderName: string;
}

export interface AppState {
  staff: Staff[];
  shifts: ShiftAssignment[];
  holidays: Holiday[];
  settings: {
    shiftsPerDay: number;
  };
}

export const DAYS_OF_WEEK_VI = ['CN', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];