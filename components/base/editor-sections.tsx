import type { ReactNode } from "react";

export const editorSections = [
  {
    id: "site-config",
    label: "Site e SEO",
    description: "Domínio, identificação e aparência nos buscadores.",
  },
  {
    id: "page-content",
    label: "Identidade",
    description: "Textos, marca e cores da página.",
  },
  {
    id: "site-media",
    label: "Mídia e destaques",
    description: "Imagens, vídeo e destaques do produto.",
  },
  {
    id: "site-navigation",
    label: "Navegação",
    description: "Textos dos links exibidos na loja.",
  },
  {
    id: "site-products",
    label: "Produtos e preços",
    description: "Ofertas, valores e contagem regressiva.",
  },
  {
    id: "site-trust",
    label: "Informações de compra",
    description: "Informações de apoio exibidas ao cliente.",
  },
  {
    id: "site-routine",
    label: "Como funciona",
    description: "Apresente os benefícios do produto.",
  },
  {
    id: "site-faq",
    label: "Perguntas frequentes",
    description: "Respostas para as dúvidas dos clientes.",
  },
  {
    id: "site-reviews",
    label: "Avaliações",
    description: "Opiniões e imagens dos clientes.",
  },
  {
    id: "site-footer",
    label: "Rodapé",
    description: "Texto exibido no rodapé da loja.",
  },
] as const;

export function EditorSection({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="editor-section" hidden={!active}>
      {children}
    </section>
  );
}
