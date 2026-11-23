import { LogOut } from "lucide-react";
import { buttonClasses, type ButtonProps } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

/**
 * Native form POST to /auth/sign-out → full page load, so no hidden
 * (Activity-preserved) signed-in page survives. Works without JavaScript.
 */
export function SignOutButton({
  variant = "secondary",
  size = "md",
  className,
}: Pick<ButtonProps, "variant" | "size" | "className">) {
  return (
    <form action={ROUTES.signOut} method="post">
      <button type="submit" className={buttonClasses({ variant, size, className })}>
        <LogOut className="size-4" aria-hidden />
        Cerrar sesión
      </button>
    </form>
  );
}
