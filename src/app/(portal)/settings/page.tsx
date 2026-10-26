import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <SettingsWorkspace role={session.role} />;
}
