import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";

export default async function Root() {
  const { profile } = await requireProfile();
  redirect(profile.role === "client" ? "/portal" : "/dashboard");
}
