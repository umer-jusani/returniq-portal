import { RequestsWorkspace } from "@/components/requests/requests-workspace";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RequestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <RequestsWorkspace role={session.role} />;
}
