import { getProfile } from "@/lib/auth/session";

export function initialsOf(name: string | null | undefined, email: string) {
  const source = (name ?? "").trim() || email.split("@")[0] || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

/** Avatar + name of the signed-in user. Reads the session: render inside <Suspense>. */
export async function UserChip() {
  const { user, profile } = await getProfile();
  const name = profile.display_name ?? user.email;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-[13px] font-medium text-primary-fg"
      >
        {initialsOf(profile.display_name, user.email)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-medium">{name}</span>
        <span className="block truncate text-[12px] text-fg-subtle">{user.email}</span>
      </span>
    </div>
  );
}

export function UserChipSkeleton() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="size-9 rounded-full bg-surface-strong" />
      <span className="flex flex-col gap-1.5">
        <span className="h-3 w-24 rounded bg-surface-strong" />
        <span className="h-2.5 w-32 rounded bg-surface" />
      </span>
    </div>
  );
}
