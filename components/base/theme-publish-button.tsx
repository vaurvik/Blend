"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishProjectTheme } from "@/app/admin/theme-actions";
import { Button } from "./button";

export function ThemePublishButton({
  slug,
  themeId,
  active,
}: {
  slug: string;
  themeId: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            const result = await publishProjectTheme(slug, themeId);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Publicando…" : active ? "Republicar" : "Publicar"}
      </Button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
