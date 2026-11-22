import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileForm } from "@/components/settings/profile-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormSkeleton } from "@/components/auth/auth-shell";
import { getProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Ajustes" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="animate-rise">
        <h1 className="text-[34px] leading-tight font-medium tracking-[-0.03em] sm:text-[44px]">
          Ajustes
        </h1>
        <p className="mt-1 text-[15px] text-fg-muted">
          Tu perfil, la apariencia y la seguridad de tu cuenta.
        </p>
      </header>

      <Section title="Perfil" description="Así te saluda TRACKY y así calcula tus días.">
        <Suspense fallback={<FormSkeleton fields={2} />}>
          <Profile />
        </Suspense>
      </Section>

      <Section title="Apariencia" description="Se guarda en este dispositivo.">
        <ThemeToggle />
      </Section>

      <Section title="Seguridad" description="Gestiona el acceso a tu cuenta.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Suspense fallback={<div className="h-5 w-48 rounded bg-surface-strong" />}>
            <AccountEmail />
          </Suspense>
          <Link href={ROUTES.updatePassword} className={buttonClasses({ variant: "glass" })}>
            <KeyRound className="size-4" aria-hidden />
            Cambiar contraseña
          </Link>
        </div>
      </Section>

      <Section title="Sesión" description="Cierra la sesión en este dispositivo.">
        <SignOutButton variant="danger" />
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="animate-rise p-6 sm:p-7">
      <div className="mb-5">
        <h2 className="text-[18px] font-medium tracking-[-0.015em]">{title}</h2>
        <p className="mt-0.5 text-[14px] text-fg-muted">{description}</p>
      </div>
      {children}
    </Card>
  );
}

function timezoneList(current: string) {
  const zones = Intl.supportedValuesOf("timeZone");
  const all = new Set(["UTC", ...zones]);
  all.add(current);
  return [...all];
}

async function Profile() {
  const { user, profile } = await getProfile();
  return (
    <ProfileForm
      displayName={profile.display_name ?? user.email.split("@")[0]}
      timezone={profile.timezone}
      timezones={timezoneList(profile.timezone)}
    />
  );
}

async function AccountEmail() {
  const { user } = await getProfile();
  return (
    <p className="text-[14px] text-fg-muted">
      Email de acceso: <span className="font-medium text-fg">{user.email}</span>
    </p>
  );
}
