import Link from "next/link";
import Image from "next/image";

export function Brand({ href = "/admin/dashboard" }: { href?: string }) {
  return (
    <Link className="app-brand" href={href} aria-label="Blend — início">
      <Image
        className="app-brand__mark"
        src="/branding/logo.png"
        width={32}
        height={41}
        alt=""
        priority
      />
      <span>Blend</span>
    </Link>
  );
}
