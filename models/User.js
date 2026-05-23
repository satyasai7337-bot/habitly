import mongoose from "mongoose";

// Snapshot of a chosen habit, copied from the catalog at signup.
const HabitConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: String,
    type: { type: String, enum: ["good", "bad"], required: true },
    emoji: String,
    unit: String,
    target: Number,
    targetDirection: { type: String, enum: ["atleast", "avoid"] },
    step: Number,
    consequence: String,
    reminderTimes: { type: [String], default: [] }, // "HH:MM", good habits only
    reminderEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    bodyWeight: Number, // kg
    height: Number, // cm
    age: Number,
    sex: { type: String, enum: ["male", "female", "other"] },
    habits: { type: [HabitConfigSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
