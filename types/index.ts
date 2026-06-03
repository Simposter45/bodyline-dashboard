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

export type PaymentStatus = "paid" | "pending" | "overdue" | "superseded";

export type PaymentMethod = "cash" | "upi" | "card" | "other";

export type SessionType = "group" | "personal_training" | "rehab" | "open_gym";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

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
  max_freeze_days: number;
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
  paused_at: string | null; // ISO timestamp
  paused_until: string | null; // ISO date string
  recorded_by_trainer_id: string | null; // NULL = recorded by owner
  /** Set/updated every time a payment is recorded via useRecordPayment.
   *  Null for memberships created before 2026-06-01 migration or with no payment. */
  last_payment_at: string | null; // ISO timestamp
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

export interface Booking {
  id: string;
  gym_id: string;
  member_id: string;
  trainer_id: string;
  session_date: string;   // ISO date string (YYYY-MM-DD)
  session_time: string;   // Time string (HH:MM:SS)
  status: BookingStatus;
  notes: string | null;
  created_at: string;
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
  trainer_auth_user_id: string | null; // Links to Supabase auth.users.id
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
// Member Portal Types (FEAT-009)
// ------------------------------------------------------------------

/**
 * Lean member profile shape used by the Member Portal.
 * Subset of Member — only the fields the portal needs to display.
 */
export interface MemberProfilePortal {
  id: string;
  gym_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  joined_date: string;          // ISO date string
  profile_photo_url: string | null;
}

/**
 * Member's current (latest non-superseded) membership enriched with plan.
 * Returned by useMemberMembership.
 */
export type MemberCurrentMembership = MemberMembership & {
  plan: Pick<MembershipPlan, "id" | "name" | "price" | "duration_days">;
};

/**
 * Booking enriched with the assigned trainer's display info.
 * Returned by useBookings.
 */
export interface BookingWithTrainer extends Booking {
  trainer: Pick<Trainer, "id" | "full_name" | "specialization">;
}

// ------------------------------------------------------------------
// Trainer Portal Types (FEAT-010)
// ------------------------------------------------------------------

/** Mirrors the trainer_attendance table. One row per clock-in event. */
export interface TrainerAttendance {
  id: string;
  gym_id: string;
  trainer_id: string;
  clock_in: string;       // ISO timestamp (UTC, display in IST)
  clock_out: string | null; // NULL while trainer is still clocked in
  date: string;           // ISO date string (IST date)
  notes: string | null;
  created_at: string;
}

/** Mirrors the session_logs table. Immutable once inserted. */
export interface SessionLog {
  id: string;
  gym_id: string;
  trainer_id: string;
  member_id: string;
  session_date: string;   // ISO date string
  session_type: SessionType;
  duration_mins: number | null;
  notes: string | null;
  created_at: string;
}

/**
 * SessionLog enriched with the member's display info.
 * Returned by useSessionLogs hook.
 */
export interface SessionLogWithMember extends SessionLog {
  member: Pick<Member, "id" | "full_name" | "phone" | "profile_photo_url">;
}

/**
 * Enriched assigned member shape used in the trainer's My Members tab.
 * Includes live membership + payment status for dues tracking.
 */
export interface AssignedMemberWithDues {
  assignment_id: string;
  assigned_date: string;  // ISO date string
  member: Member;
  /** Latest non-superseded membership for this member, or null if none. */
  current_membership: (MemberMembership & { plan: MembershipPlan }) | null;
  /** True if member has an open check_in (no check_out) in today's attendance. */
  is_checked_in_today: boolean;
}

/**
 * Summary stats shown on the trainer's Home tab hero row.
 * Derived client-side from the query results — not a DB shape.
 */
export interface TrainerPortalStats {
  assigned_members: number;
  checked_in_today: number;    // Assigned members currently in gym today
  sessions_today: number;      // Session logs logged today by this trainer
  pending_dues: number;        // Assigned members with payment_status != 'paid'
}

// ------------------------------------------------------------------
// Form / Input Types — Trainer Portal
// ------------------------------------------------------------------

export type LogSessionInput = {
  member_id: string;
  session_date: string;   // ISO date string
  session_type: SessionType;
  duration_mins?: number;
  notes?: string;
};

export type ClockInInput = {
  notes?: string;
};

export type ClockOutInput = {
  attendance_id: string; // The open trainer_attendance row to close
  notes?: string;
};

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
