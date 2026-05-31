export const Session = {
  cookieName: "kimi_sid",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "UNAUTHENTICATED",
  insufficientRole: "INSUFFICIENT_ROLE",
  notFound: "NOT_FOUND",
  doubleBooking: "DOUBLE_BOOKING",
  slotTaken: "SLOT_TAKEN",
  machineOutOfService: "MACHINE_OUT_OF_SERVICE",
  pendingApproval: "PENDING_APPROVAL",
  rejected: "REJECTED",
  suspended: "SUSPENDED",
  masterAdminQuorum: "MASTER_ADMIN_QUORUM",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
} as const;

// Error code to translation key mapping (for frontend)
export const ErrorCodeToKey: Record<string, string> = {
  UNAUTHENTICATED: "errors.unauthorized",
  INSUFFICIENT_ROLE: "errors.unauthorized",
  NOT_FOUND: "errors.notFound",
  DOUBLE_BOOKING: "errors.doubleBooking",
  SLOT_TAKEN: "errors.slotTaken",
  MACHINE_OUT_OF_SERVICE: "errors.machineOutOfService",
  PENDING_APPROVAL: "errors.pendingApproval",
  REJECTED: "errors.rejected",
  SUSPENDED: "errors.suspended",
  MASTER_ADMIN_QUORUM: "errors.masterAdminQuorum",
};
