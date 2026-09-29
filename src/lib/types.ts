// Shared types matching the Supabase schema in supabase/migrations/0001_initial_schema.sql
// Keep in sync with the SQL enums.

export const INTERPRETER_ROLES = [
  "student_interpreter",
  "mentor_interpreter",
] as const;

export type InterpreterUserRole =
  (typeof INTERPRETER_ROLES)[number];

export type UserRole =
  | "requestor"
  | InterpreterUserRole
  | "interpreter"
  | "coordinator"
  | "admin";

export function isInterpreterRole(
  role: string
): role is InterpreterUserRole | "interpreter" {
  return (
    role === "interpreter" ||
    INTERPRETER_ROLES.includes(
      role as InterpreterUserRole
    )
  );
}

export function userRoleLabel(role: UserRole): string {
  switch (role) {
    case "student_interpreter":
      return "Student Interpreter";
    case "mentor_interpreter":
      return "Mentor Interpreter";
    case "interpreter":
      return "Interpreter";
    case "requestor":
      return "Requestor";
    case "coordinator":
      return "Coordinator";
    case "admin":
      return "Admin";
  }
}

export type UserStatus = "pending" | "active" | "suspended" | "archived";

export type RequestStatus =
  | "draft"
  | "pending_review"
  | "open"
  | "proposed"
  | "pending_acceptance"
  | "assigned"
  | "completed"
  | "cancelled";

export type RequestSensitivity = "standard" | "sensitive";

export type AssignmentStatus =
  | "proposed"
  | "pending_admin_release"
  | "released"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled";
export type AssignmentRole = "student" | "mentor";

export type ApprovalKind =
  | "interpreter_onboarding"
  | "community_onboarding"
  | "request_review"
  | "sensitive_assignment"
  | "role_escalation"
  | "reinstatement"
  | "blocklist_edit";

export type ApprovalDecision = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  role: UserRole;
  status: UserStatus;
  full_name: string;
  preferred_name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Community {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  region: string | null;
  status: UserStatus;
  created_by: string | null;
  created_at: string;
}

export interface InterpreterProfile {
  profile_id: string;
  home_address: string | null;
  home_location: unknown | null; // PostGIS geography — we use the lat/lng helpers below in app code
  service_radius_miles: number;
  languages: string[];
  modalities: string[];
  accepting_requests: boolean;
  available_days: string[];
  preferred_time_blocks: string[];
  unavailable_until: string | null;
  credentials: string | null;
  is_certified: boolean | null;
  certifications: string[];
  licenses: string[];
  specialties: string[];
  experience_band: string | null;
  profile_photo_url: string | null;
  profile_photo_path: string | null;
  intro_video_url: string | null;
  intro_video_path: string | null;
  professional_profile_url: string | null;
  willing_to_mentor: boolean;
  willing_to_work_with_students: boolean;
  is_advanced_itp_student: boolean;
  college_name: string | null;
  pro_bono_commitment: string | null;
  pro_bono_signed_at: string | null;
  notes: string | null;
  total_completed: number;
}

export interface RequestorProfile {
  profile_id: string;
  primary_community_id: string | null;
  contact_preference: string | null;
  notes: string | null;
  community_commitment_signed_at: string | null;
  community_commitment_version: string | null;
}

export interface InterpreterRecommendation {
  interpreter_id: string;
  full_name: string;
  distance_miles: number;
  within_service_radius: boolean;
  service_radius_miles: number;
  languages: string[];
  modalities: string[];
  total_completed: number;
  active_workload: number;
  fit_score: number;
  // Optionally enriched client-side with travel time
  travel_minutes?: number | null;
}

export interface RequestRecord {
  id: string;
  requestor_id: string;
  community_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  sensitivity: RequestSensitivity;
  event_address: string;
  event_location: unknown;
  event_start: string;
  event_end: string;
  languages_needed: string[];
  modality: string;
  status: RequestStatus;
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  request_id: string;
  interpreter_id: string;
  team_role: AssignmentRole;
  status: AssignmentStatus;
  proposed_by: string;
  released_by: string | null;
  released_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  kind: ApprovalKind;
  target_table: string;
  target_id: string;
  requested_by: string | null;
  context: Record<string, unknown> | null;
  requires_two_keys: boolean;
  first_decision: ApprovalDecision;
  first_decided_by: string | null;
  first_decided_at: string | null;
  first_reason: string | null;
  second_decision: ApprovalDecision;
  second_decided_by: string | null;
  second_decided_at: string | null;
  second_reason: string | null;
  final_decision: ApprovalDecision;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  actor_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  before_json: unknown;
  after_json: unknown;
  reason: string | null;
  created_at: string;
}

// Convert a {longitude, latitude} pair to a PostGIS WKT POINT for inserts.
export function toPointWKT(longitude: number, latitude: number): string {
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}
