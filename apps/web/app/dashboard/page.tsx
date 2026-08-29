"use client";

import { api } from "backend/convex/_generated/api.js";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default function DashboardPage() {
  const user = useQuery(api.users.current);

  return (
    <div className="flex min-h-svh flex-col gap-4 p-6">
      <AuthLoading>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AuthLoading>
      <Unauthenticated>
        <p className="text-sm text-muted-foreground">Not authenticated. Redirecting to sign in…</p>
      </Unauthenticated>
      <Authenticated>
        <h1 className="text-xl font-medium">Dashboard</h1>
        {user ? (
          <div className="text-sm">
            <p>Signed in as {user.email ?? user.name ?? user._id}</p>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name ?? "avatar"}
                className="mt-2 size-10 rounded-full"
              />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        )}
        <SignOutButton />
      </Authenticated>
    </div>
  );
}
