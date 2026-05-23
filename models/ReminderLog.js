import mongoose from "mongoose";

// Records each reminder email sent for a good habit (used for the
// "reminders sent" count on the dashboard). One per habit+slot+day.
const ReminderLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    habitKey: { type: String, required: true },
    slot: { type: String, required: true }, // "HH:MM"
    date: { type: String, required: true }, // "YYYY-MM-DD"
    channel: { type: String, default: "email" },
    status: { type: String, default: "sent" }, // "sent" | "failed" | "skipped"
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ReminderLogSchema.index({ user: 1, habitKey: 1, slot: 1, date: 1 }, { unique: true });

export default mongoose.models.ReminderLog || mongoose.model("ReminderLog", ReminderLogSchema);
