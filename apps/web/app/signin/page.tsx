"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const { signIn } = useAuthActions();

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-sm flex-col gap-4 text-center">
        <AuthLoading>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </AuthLoading>
        <Unauthenticated>
          <h1 className="text-xl font-medium">Sign in</h1>
          <p className="text-sm text-muted-foreground">Continue with Google to access your dashboard.</p>
          <Button onClick={() => void signIn("google")} className="mt-2">
            Sign in with Google
          </Button>
        </Unauthenticated>
        <Authenticated>
          <h1 className="text-xl font-medium">Already signed in</h1>
          <p className="text-sm text-muted-foreground">You are authenticated. Redirecting…</p>
          <Button variant="outline" onClick={() => void signIn("google")}>
            Switch account
          </Button>
        </Authenticated>
      </div>
    </div>
  );
}
