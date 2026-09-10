import { Clock, Phone, Mail, MessageSquare, MessageCircle, Users, type LucideIcon } from "lucide-react";
import type { FollowUpAction } from "@/lib/types";

const ACTION_ICONS: Record<FollowUpAction, LucideIcon> = {
  CALL: Phone,
  EMAIL: Mail,
  LINKEDIN: MessageSquare,
  WHATSAPP: MessageCircle,
  MEETING: Users,
};

export function formatFollowUpDate(dateStr: string | null) {
  if (!dateStr) return null;
  // The date is stored as a bare calendar date (UTC midnight) with no
  // meaningful time-of-day — formatting/comparing in the viewer's local
  // timezone would shift it a day earlier for anyone west of UTC.
  const date = new Date(dateStr);
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const overdue = date < todayUtc;
  const label = date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return { label, overdue };
}

export function FollowUpBadge({
  dueDate,
  actionType,
  size = "sm",
}: {
  dueDate: string | null;
  actionType?: FollowUpAction | null;
  size?: "sm" | "xs";
}) {
  const info = formatFollowUpDate(dueDate);
  if (!info) return null;
  const Icon = actionType ? ACTION_ICONS[actionType] : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        size === "xs" ? "px-2 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
      } ${info.overdue ? "bg-red-50 text-red-600" : "bg-neutral-100 text-neutral-600"}`}
    >
      <Icon size={size === "xs" ? 10 : 11} />
      {info.label}
    </span>
  );
}
