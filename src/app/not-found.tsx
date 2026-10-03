import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <Logo />
      <h1 className="mt-8 text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="mt-6 rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white hover:bg-orange-700">Go home</Link>
    </div>
  );
}
