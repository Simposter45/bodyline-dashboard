// ============================================================
// Bodyline Gym Dashboard — TypeScript Types
// Mirrors exact Supabase schema
// ============================================================

// ------------------------------------------------------------------
// SaaS / Multi-Tenancy Types
// ------------------------------------------------------------------

export interface Gym {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  is_active: boolean;
  created_at: string;
}

export interface GymSettings {
  id: string;
  gym_id: string;
  gym_display_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  primary_color: string;
  city: string | null;
  branches: string[];
  upi_id: string | null;
  whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------
// Enums
// ------------------------------------------------------------------

export type PaymentStatus = "paid" | "pending" | "overdue";

export type PaymentMethod = "cash" | "upi" | "card" | "other";

export type SessionType = "group" | "personal_training" | "open_gym";

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "no_show";

export type NotificationType =
  | "payment_due"
  | "payment_overdue"
  | "new_booking"
  | "cancellation"
  | "new_member"
  | "membership_expiring";

// ------------------------------------------------------------------
// Core DB Table Types
// ------------------------------------------------------------------

export interface MembershipPlan {
  id: string;
  gym_id: string;
  name: string;
  duration_days: number;
  price: number;
  description: string | null;
  is_active: boolean;
}

export interface Member {
  id: string;
  gym_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null; // ISO date string
  joined_date: string; // ISO date string, default current_date
  profile_photo_url: string | null;
  id_proof_url: string | null;
  branch: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MemberMembership {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  amount_paid: number | null;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  gym_id: string;
  member_id: string;
  check_in: string; // ISO timestamp
  check_out: string | null; // ISO timestamp
  notes: string | null;
}

export interface Trainer {
  id: string;
  gym_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  branch: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TrainerAssignment {
  id: string;
  gym_id: string;
  member_id: string;
  trainer_id: string;
  assigned_date: string; // ISO date string
  is_current: boolean;
}

// ------------------------------------------------------------------
// Joined / Enriched Types
// (returned from Supabase queries with select joins)
// ------------------------------------------------------------------

export interface MemberWithMembership extends Member {
  current_membership: (MemberMembership & { plan: MembershipPlan }) | null;
}

export interface MemberWithTrainer extends Member {
  trainer: Pick<Trainer, "id" | "full_name" | "specialization"> | null;
}

export interface MemberFull extends Member {
  current_membership: (MemberMembership & { plan: MembershipPlan }) | null;
  trainer: Pick<Trainer, "id" | "full_name" | "specialization"> | null;
}

export interface AttendanceWithMember extends Attendance {
  member: Pick<Member, "id" | "full_name" | "phone" | "profile_photo_url">;
}

export interface TrainerWithMembers extends Trainer {
  assigned_members: Pick<Member, "id" | "full_name" | "phone">[];
}

// ------------------------------------------------------------------
// Dashboard / Analytics Types
// ------------------------------------------------------------------

export interface RevenueSummary {
  total_collected: number;
  total_pending: number;
  total_overdue: number;
  this_month: number;
  last_month: number;
  growth_percent: number | null;
}

export interface MemberSummary {
  total_active: number;
  total_inactive: number;
  new_this_month: number;
  expiring_this_week: number; // memberships ending within 7 days
}

export interface TodayAttendance {
  date: string;
  total_checkins: number;
  currently_in_gym: number; // checked in but no check_out yet
  members: AttendanceWithMember[];
}

export interface OwnerDashboardData {
  revenue: RevenueSummary;
  members: MemberSummary;
  today: TodayAttendance;
  overdue_members: MemberWithMembership[];
}

// ------------------------------------------------------------------
// Form / Input Types
// ------------------------------------------------------------------

export type CreateMemberInput = {
  full_name: string;
  phone: string;
  email?: string;
  date_of_birth?: string;
  joined_date?: string;
};

export type UpdateMemberInput = Partial<Omit<Member, "id" | "created_at">>;

export type CreateMembershipInput = {
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  amount_paid?: number;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
};

export type CreateTrainerInput = {
  full_name: string;
  phone?: string;
  email?: string;
  specialization?: string;
};

export type AssignTrainerInput = {
  member_id: string;
  trainer_id: string;
};

export type RecordAttendanceInput = {
  member_id: string;
  notes?: string;
};

// ------------------------------------------------------------------
// API Response Wrappers
// ------------------------------------------------------------------

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ------------------------------------------------------------------
// UI State Types
// ------------------------------------------------------------------

export interface FilterState {
  status: "all" | "active" | "inactive";
  payment: "all" | PaymentStatus;
  search: string;
}

export interface PaginationState {
  page: number;
  page_size: number;
  total: number;
}

export interface SortState {
  column: string;
  direction: "asc" | "desc";
}
