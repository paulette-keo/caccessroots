export const EVENT_TYPES = [
  { value: "family_gathering", label: "Family gathering" },
  { value: "holiday", label: "Holiday gathering" },
  { value: "wedding", label: "Wedding" },
  { value: "shower", label: "Baby or wedding shower" },
  { value: "bachelorette_party", label: "Bachelorette party" },
  { value: "recreation_sports", label: "Recreational or sports event" },
  { value: "community_activity", label: "Community activity" },
  { value: "funeral_memorial", label: "Funeral or memorial (review required)" },
  { value: "other", label: "Other (review required)" },
] as const;

export const ALLOWED_EVENT_TYPES = new Set<string>(
  EVENT_TYPES.map((eventType) => eventType.value)
);

export const REVIEW_EVENT_TYPES = new Set<string>([
  "funeral_memorial",
  "other",
]);

export const COVERAGE_RESPONSES = [
  {
    value: "personal",
    label: "No — this is a personal or community event.",
  },
  {
    value: "not_sure",
    label: "I’m not sure. Please review it before matching.",
  },
  {
    value: "organization_responsible",
    label:
      "Yes — an employer, school, medical provider, government office, business, or other organization may be responsible.",
  },
] as const;

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Under review",
  open: "Coordinator building team",
  proposed: "Coordinator building team",
  pending_acceptance: "Confirming team availability",
  assigned: "Student and mentor confirmed",
  completed: "Completed",
  cancelled: "Closed",
};

export function requestStatusLabel(status: string): string {
  return REQUEST_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export function eventTypeLabel(eventType: string): string {
  return (
    EVENT_TYPES.find((option) => option.value === eventType)?.label ??
    eventType.replaceAll("_", " ")
  );
}
