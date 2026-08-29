"use client";

import { useAuthActions } from "@convex-dev/auth/react";

import { Button } from "@/components/ui/button";

export function SignInButton() {
  const { signIn } = useAuthActions();
  return <Button onClick={() => void signIn("google")}>Sign in with Google</Button>;
}
