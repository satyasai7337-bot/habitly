export default function Brand({ size = "md" }) {
  const text = size === "lg" ? "text-2xl" : "text-xl";
  return (
    <span className={`font-display font-extrabold tracking-tight text-ink ${text}`}>
      Habit<span className="text-good">ly</span>
    </span>
  );
}
