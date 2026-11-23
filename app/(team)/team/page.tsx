import { redirect } from "next/navigation";

// Team management now lives on the Admin page.
export default function TeamPage() {
  redirect("/admin");
}
