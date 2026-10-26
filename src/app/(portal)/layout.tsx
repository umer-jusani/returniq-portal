import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth";
import { getTenant, isDemoTenant } from "@/lib/tenant";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenant = await getTenant(session.tenantId);

  return (
    <AppShell user={session} tenantName={tenant.name} demo={isDemoTenant(tenant)}>
      {children}
    </AppShell>
  );
}
