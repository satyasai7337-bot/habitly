"use client";

export default function PrintButton({ className }) {
  return (
    <button onClick={() => window.print()} className={className || "btn-primary px-5 py-2.5"}>
      🖨️ Print / Save as PDF
    </button>
  );
}
