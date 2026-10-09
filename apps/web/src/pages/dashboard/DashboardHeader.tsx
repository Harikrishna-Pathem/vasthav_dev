interface DashboardHeaderProps {
  title: string;
  welcome: string;
}

export function DashboardHeader({ title, welcome }: DashboardHeaderProps) {
  return (
    <header className="mb-8">
      <p className="mb-2 text-sm font-semibold text-vasthav-700">Overview</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">{welcome}</p>
    </header>
  );
}
