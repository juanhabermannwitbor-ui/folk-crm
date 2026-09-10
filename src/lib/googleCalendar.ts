// Builds a Google Calendar "quick add" link — opens Calendar pre-filled with
// the event so the user just has to click Save. No OAuth, no stored tokens:
// a real inline "create event without leaving the CRM" integration would
// need a Google Cloud OAuth app (consent screen, encrypted refresh-token
// storage, and — outside of a short-lived testing mode — a verification
// review from Google), which is a much bigger lift than this.
const BUENOS_AIRES_UTC_OFFSET = "-03:00";

function toGoogleDateTime(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildGoogleCalendarUrl({
  title,
  details,
  date,
  time,
  durationMinutes = 30,
}: {
  title: string;
  details?: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  durationMinutes?: number;
}) {
  const start = new Date(`${date}T${time}:00${BUENOS_AIRES_UTC_OFFSET}`);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGoogleDateTime(start)}/${toGoogleDateTime(end)}`,
  });
  if (details) params.set("details", details);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
