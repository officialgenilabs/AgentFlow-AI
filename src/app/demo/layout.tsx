import { DemoProvider } from "@/lib/demo/provider";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      {children}
    </DemoProvider>
  );
}
