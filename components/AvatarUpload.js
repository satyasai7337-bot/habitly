"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Read a File, center-crop to a square and resize to `size`px, return a JPEG data URL.
function fileToSquareDataUrl(file, size = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Clickable avatar that lets the user upload a profile picture.
export default function AvatarUpload({ name, avatar, className = "h-9 w-9" }) {
  const [src, setSrc] = useState(avatar || null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();
  const initial = (name || "U").charAt(0).toUpperCase();

  async function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToSquareDataUrl(file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: dataUrl }),
      });
      if (res.ok) {
        setSrc(dataUrl);
        router.refresh();
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={busy}
      title="Change profile photo"
      className="group relative shrink-0 rounded-full"
    >
      {src ? (
        <img src={src} alt="" className={`${className} rounded-full object-cover`} />
      ) : (
        <span className={`${className} flex items-center justify-center rounded-full bg-accent text-sm font-bold text-white`}>
          {initial}
        </span>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] shadow-soft ring-1 ring-line">
        {busy ? "…" : "📷"}
      </span>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </button>
  );
}
