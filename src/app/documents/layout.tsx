export default function DocumentsLayout({ children }: LayoutProps<"/documents">) {
  return <div className="min-h-full bg-slate-100 py-8 print:bg-white print:py-0">{children}</div>;
}
