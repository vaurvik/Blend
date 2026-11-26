"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LuArrowLeft, LuArrowRight, LuCheck } from "react-icons/lu";
import { createFirstProject } from "@/app/admin/actions";
import { Brand } from "./brand";
import { Button } from "./button";
import { Field, Input, Textarea } from "./fields";
import { MediaUpload } from "./media-upload";

const steps = ["Projeto", "Presença online", "Revisão"];
function makeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/, "");
}

export function FirstProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [domain, setDomain] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [uploading, setUploading] = useState(false);
  const mediaId = useRef("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function next() {
    if (
      step === 0 &&
      (!name.trim() ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
        ["admin", "api", "_next", "checkout", "media"].includes(slug))
    ) {
      setError(
        "Informe o nome e uma rota válida, com letras minúsculas, números e hífens.",
      );
      return;
    }
    if (
      step === 1 &&
      domain &&
      !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
        domain.trim().toLowerCase(),
      )
    ) {
      setError("Informe apenas o domínio, por exemplo loja.com.br.");
      return;
    }
    setError("");
    setStep((value) => value + 1);
  }
  function create() {
    setError("");
    startTransition(async () => {
      try {
        const result = await createFirstProject({
          name,
          slug,
          domain,
          seoTitle,
          seoDescription,
          logo,
          mediaId: logo ? mediaId.current : "",
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        router.push("/admin");
        router.refresh();
      } catch {
        setError("Não foi possível criar o projeto. Tente novamente.");
      }
    });
  }
  return (
    <main className="first-project">
      <div className="first-project__top">
        <Brand href="/admin/dashboard" />
        <span>PRIMEIROS PASSOS</span>
      </div>
      <div className="first-project__layout">
        <aside className="first-project__intro">
          <span className="eyebrow-label">SEU PRIMEIRO PROJETO</span>
          <h1>
            Uma ideia.
            <br />
            Seu espaço.
          </h1>
          <p>
            Comece com o essencial. Você poderá ajustar os detalhes do seu
            projeto quando quiser.
          </p>
        </aside>
        <section
          className="first-project__card"
          aria-labelledby="first-project-title"
        >
          <ol className="first-project__steps" aria-label="Etapas de criação">
            {steps.map((label, index) => (
              <li
                key={label}
                className={
                  index === step
                    ? "is-current"
                    : index < step
                      ? "is-complete"
                      : ""
                }
                aria-current={index === step ? "step" : undefined}
              >
                <span>
                  {index < step ? <LuCheck aria-hidden="true" /> : index + 1}
                </span>
                <small>{label}</small>
              </li>
            ))}
          </ol>
          <div className="first-project__content">
            {step === 0 && (
              <>
                <span className="eyebrow-label">ETAPA 01 / 03</span>
                <h2 id="first-project-title">Dê um nome à sua ideia.</h2>
                <p>
                  Escolha como identificar seu projeto e o endereço inicial
                  dele.
                </p>
                <Field label="Nome do projeto">
                  <Input
                    value={name}
                    maxLength={120}
                    autoFocus
                    placeholder="Ex.: Minha loja"
                    onChange={(event) => {
                      setName(event.target.value);
                      if (!slugEdited) setSlug(makeSlug(event.target.value));
                    }}
                  />
                </Field>
                <Field
                  label="Rota do projeto"
                  hint="Usada no endereço da página. Você pode alterá-la depois."
                >
                  <Input
                    value={slug}
                    maxLength={80}
                    placeholder="minha-loja"
                    onChange={(event) => {
                      setSlugEdited(true);
                      setSlug(event.target.value);
                    }}
                  />
                </Field>
                <small className="first-project__path">
                  blend / {slug || "sua-rota"}
                </small>
                <div className="first-project__logo">
                  <span>
                    Logo do projeto <small>Opcional</small>
                  </span>
                  <MediaUpload
                    accept="image/png,image/jpeg,image/webp"
                    getSiteId={() => {
                      if (!mediaId.current)
                        mediaId.current = crypto.randomUUID();
                      return mediaId.current;
                    }}
                    onBusyChange={setUploading}
                    onUploaded={setLogo}
                  />
                  {logo && <p>Logo enviada. Você pode alterá-la depois.</p>}
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <span className="eyebrow-label">ETAPA 02 / 03</span>
                <h2 id="first-project-title">Sua presença online.</h2>
                <p>
                  Esses campos são opcionais. Você pode configurá-los mais tarde
                  no painel.
                </p>
                <Field
                  label="Domínio personalizado"
                  hint="Sem https://. A conexão do domínio pode ser feita depois."
                >
                  <Input
                    value={domain}
                    maxLength={253}
                    placeholder="sualoja.com.br"
                    onChange={(event) => setDomain(event.target.value)}
                  />
                </Field>
                <Field label="Título para buscadores">
                  <Input
                    value={seoTitle}
                    maxLength={150}
                    placeholder="Nome exibido nos resultados de busca"
                    onChange={(event) => setSeoTitle(event.target.value)}
                  />
                </Field>
                <Field label="Descrição para buscadores">
                  <Textarea
                    value={seoDescription}
                    maxLength={300}
                    rows={3}
                    placeholder="Conte um pouco sobre sua loja"
                    onChange={(event) => setSeoDescription(event.target.value)}
                  />
                </Field>
              </>
            )}
            {step === 2 && (
              <>
                <span className="eyebrow-label">ETAPA 03 / 03</span>
                <h2 id="first-project-title">Tudo pronto para começar.</h2>
                <p>Confira os dados. Você poderá mudar tudo depois.</p>
                <div className="first-project__review">
                  <div>
                    <span>Projeto</span>
                    <strong>{name}</strong>
                  </div>
                  <div>
                    <span>Rota</span>
                    <strong>/{slug}</strong>
                  </div>
                  <div>
                    <span>Domínio</span>
                    <strong>{domain || "Configurar depois"}</strong>
                  </div>
                </div>
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="first-project__actions">
            {step > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  setError("");
                  setStep(step - 1);
                }}
                disabled={pending}
              >
                <LuArrowLeft aria-hidden="true" /> Voltar
              </Button>
            )}
            <Button
              onClick={step === 2 ? create : next}
              disabled={pending || uploading}
            >
              {pending
                ? "Criando projeto..."
                : step === 2
                  ? "Criar projeto"
                  : "Continuar"}
              <LuArrowRight aria-hidden="true" />
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
