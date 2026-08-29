"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const { signIn } = useAuthActions();

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.62fr)]">
      <section className="technical-grid relative hidden overflow-hidden border-r bg-workspace p-12 lg:flex lg:flex-col lg:justify-between">
        <BrandMark />
        <div className="relative z-10 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em]">Acceso al estudio</p>
          <h1 className="mt-6 text-7xl font-medium leading-[0.88] tracking-[-0.07em]">
            Toda escena comienza con una decisión.
          </h1>
        </div>
        <div className="grid grid-cols-3 border-t pt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Profundidad</span>
          <span>Perspectiva</span>
          <span>Composición</span>
        </div>
        <div className="absolute -right-20 top-1/2 size-96 -translate-y-1/2 rotate-12 border border-foreground/20">
          <div className="absolute inset-12 border border-foreground/30" />
          <div className="absolute inset-24 bg-foreground" />
        </div>
      </section>
      <section className="flex min-h-svh flex-col p-6 md:p-10 lg:p-12">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <Button variant="ghost" render={<Link href="/" />}>
            <ArrowLeft aria-hidden="true" /> Inicio
          </Button>
        </div>
        <div className="my-auto w-full max-w-md self-center py-16">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            The Next Craft / Cuenta
          </p>
          <AuthLoading>
            <div className="mt-8 border-y py-8">
              <p className="text-sm text-muted-foreground">Preparando tu espacio de trabajo…</p>
            </div>
          </AuthLoading>
          <Unauthenticated>
            <h2 className="mt-5 text-5xl font-medium tracking-[-0.055em]">Vuelve al estudio.</h2>
            <p className="mt-5 max-w-sm leading-7 text-muted-foreground">
              Accede con tu cuenta de Google para continuar tus composiciones y resultados.
            </p>
            <Button
              size="lg"
              className="mt-10 w-full justify-between"
              onClick={() => void signIn("google")}
            >
              Continuar con Google <ArrowRight aria-hidden="true" />
            </Button>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              Al continuar aceptas el acceso seguro necesario para mantener tus proyectos privados.
            </p>
          </Unauthenticated>
          <Authenticated>
            <h2 className="mt-5 text-5xl font-medium tracking-[-0.055em]">
              Tu estudio está listo.
            </h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              Ya existe una sesión activa. Puedes continuar directamente a tus proyectos.
            </p>
            <Button
              size="lg"
              className="mt-10 w-full justify-between"
              render={<Link href="/app" />}
            >
              Abrir el estudio <ArrowRight aria-hidden="true" />
            </Button>
          </Authenticated>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Sesión cifrada · Infraestructura self-hosted
        </p>
      </section>
    </main>
  );
}
