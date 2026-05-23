import mongoose from "mongoose";

// One entry = one logged amount/usage. Multiple entries per day are summed.
const HabitLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    habitKey: { type: String, required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD" (local day)
    value: { type: Number, required: true, default: 0 },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

HabitLogSchema.index({ user: 1, habitKey: 1, date: 1 });

export default mongoose.models.HabitLog || mongoose.model("HabitLog", HabitLogSchema);
