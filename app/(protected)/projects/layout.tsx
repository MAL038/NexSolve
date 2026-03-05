import { requireModuleEnabled } from "@/lib/requireModule";

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleEnabled("projects");

  return <>{children}</>;
}