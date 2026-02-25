import Logo from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0A6645 0%, #0d7a52 50%, #69B296 100%)" }}>
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white">
        <Logo variant="main" className="brightness-0 invert" />
        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Projecten beheren.<br />Teams versterken.
          </h2>
          <p className="text-brand-100 text-lg opacity-90">
            Het alles-in-een platform om te plannen, samen te werken en te leveren.
          </p>
        </div>
        <p className="text-sm opacity-60">© {new Date().getFullYear()} NEXSOLVE. Alle rechten voorbehouden.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-white lg:rounded-l-3xl">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex justify-center">
            <Logo variant="main" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
