export interface User {
  id: number;
  name: string;
  role: "President" | "Vice President" | "Secretary" | "Treasurer" | "Member" | "Guest";
  passcode?: string;
  is_active?: number;
}

export interface Member {
  id: number;
  name: string;
  student_id: string;
  contact_info: string;
  status: "Active" | "Inactive";
}

export interface Contribution {
  id: number;
  title: string;
  purpose: string;
  amount_per_person: number;
  due_date: string;
  created_by: number;
  created_at: string;
}

export interface Payment {
  id: number;
  contribution_id: number;
  member_id: number;
  amount_paid: number;
  received_by: number;
  date_paid: string;
  member_name?: string;
  contribution_title?: string;
  admin_name?: string;
}

export interface Expense {
  id: number;
  item_name: string;
  category: string;
  specification: string;
  quantity: number;
  price_per_unit: number;
  total_cost: number;
  purchased_by: number;
  date_purchased: string;
  admin_name?: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
}
