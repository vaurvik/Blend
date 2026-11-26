"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProjectTheme } from "@/app/admin/theme-actions";
import { Button } from "./button";

export function ThemeCreateButton({ slug }: { slug: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div>
      <Button
        className="admin-button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await createProjectTheme(slug);
            if (result.id)
              router.push(
                `/admin/projetos/${encodeURIComponent(slug)}/temas/${result.id}`,
              );
            else setError(result.error || "Não foi possível criar o tema.");
          })
        }
      >
        {pending ? "Criando..." : "+ Criar tema"}
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
