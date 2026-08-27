"use server";

import { redirect } from "next/navigation";
import { createServerClientInstance } from "@hau/db";

export async function signOutAction() {
  const supabase = await createServerClientInstance();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Failed to sign out:", error.message);
  }

  redirect("/login");
}
