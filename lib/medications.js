// Pure helpers for the medication feature: input validation and turning a set
// of medications + today's dose logs into an ordered "today's schedule".

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:MM"
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // "YYYY-MM-DD"

// Clean a list of dose times -> unique, valid, sorted.
export function normalizeTimes(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.filter((t) => typeof t === "string" && TIME_RE.test(t)))].sort();
}

// Is the medication scheduled on the given local day?
// Active, started on/before the day, and not past its course end.
export function isActiveOn(med, date) {
  if (!med.active) return false;
  if (med.startDate && date < med.startDate) return false; // YYYY-MM-DD sorts lexically
  if (med.endDate && date > med.endDate) return false;
  return true;
}

// Build today's dose checklist: one entry per (medication, time), each tagged
// with its status from the logs ("taken" | "skipped" | "pending"), ordered by
// time. `logs` is [{ medicationId, slot, status }].
export function buildSchedule(meds, logs, date) {
  const statusByKey = {};
  for (const l of logs) statusByKey[`${l.medicationId}|${l.slot}`] = l.status;

  const doses = [];
  for (const m of meds) {
    if (!isActiveOn(m, date)) continue;
    for (const slot of m.times || []) {
      doses.push({
        medicationId: m.id,
        name: m.name,
        dosage: m.dosage || "",
        slot,
        status: statusByKey[`${m.id}|${slot}`] || "pending",
      });
    }
  }
  doses.sort((a, b) =>
    a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : a.name.localeCompare(b.name)
  );
  return doses;
}

// Adherence over a window of days: for each medication, how many scheduled
// doses were taken vs skipped vs missed. Today's not-yet-due doses are excluded
// from the denominator so the rate isn't unfairly dragged down.
// `logs` is [{ medicationId, date, slot, status }].
export function medicationAdherence(meds, logs, dayKeys, today, curSlot) {
  const taken = new Set();
  const skipped = new Set();
  for (const l of logs) {
    const k = `${l.medicationId}|${l.date}|${l.slot}`;
    if (l.status === "taken") taken.add(k);
    else if (l.status === "skipped") skipped.add(k);
  }

  const perMed = [];
  let totScheduled = 0;
  let totTaken = 0;

  for (const m of meds) {
    let scheduled = 0;
    let takenN = 0;
    let skippedN = 0;
    for (const date of dayKeys) {
      if (!isActiveOn(m, date)) continue;
      for (const slot of m.times || []) {
        if (date === today && slot > curSlot) continue; // not due yet
        scheduled++;
        const k = `${m.id}|${date}|${slot}`;
        if (taken.has(k)) takenN++;
        else if (skipped.has(k)) skippedN++;
      }
    }
    if (scheduled === 0) continue; // no scheduled doses in window (e.g. as-needed / paused)
    perMed.push({
      id: m.id,
      name: m.name,
      dosage: m.dosage || "",
      scheduled,
      taken: takenN,
      skipped: skippedN,
      missed: scheduled - takenN - skippedN,
      rate: Math.round((100 * takenN) / scheduled),
    });
    totScheduled += scheduled;
    totTaken += takenN;
  }

  return {
    perMed,
    scheduled: totScheduled,
    taken: totTaken,
    rate: totScheduled ? Math.round((100 * totTaken) / totScheduled) : null,
  };
}
