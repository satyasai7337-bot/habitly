"use client";

import { useEffect, useState } from "react";
import { thoughtForDate } from "@/lib/thoughts";

export default function ThoughtOfDay() {
  // Compute after mount (using the browser's local date) to avoid any
  // server/client hydration mismatch around midnight.
  const [thought, setThought] = useState(null);
  const [date, setDate] = useState("");

  useEffect(() => {
    const now = new Date();
    setThought(thoughtForDate(now));
    setDate(now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  if (!thought) return null;

  return (
    <div className="card mb-6 overflow-hidden">
      <div className="flex items-start gap-3 bg-good-soft/60 p-5">
        <span className="text-2xl">💭</span>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-good">
            Thought of the day · {date}
          </div>
          <p className="mt-1 font-display text-lg font-bold leading-snug text-ink">
            &ldquo;{thought}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
