"use client";

// Tiny client wrapper around Hero3D so the server-rendered welcome page can
// import a SSR-disabled dynamic component (next/dynamic ssr:false is only
// allowed inside a client component).
import dynamic from "next/dynamic";

const Hero3D = dynamic(() => import("@/components/Hero3D"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto h-[320px] w-full animate-pulse rounded-3xl bg-white/30 sm:h-[420px]" />
  ),
});

export default function Hero3DClient() {
  return <Hero3D />;
}
