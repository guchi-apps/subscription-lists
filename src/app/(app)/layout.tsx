import { Navigation } from "@/components/Navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pb-[74px] md:pb-0">
      <Navigation />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
