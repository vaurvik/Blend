/** Metadados declarativos. A execução de plugins externos não faz parte deste contrato. */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  type: "payment-provider" | "ui" | "template";
  platform: { apiVersion: string };
}

export interface PaymentProviderDescriptor extends PluginManifest {
  type: "payment-provider";
  methods: readonly ("pix" | "credit_card")[];
  source: "builtin" | "external";
}

/** Descrição de campos para um futuro instalador; não executa código de terceiros. */
export interface PluginConfigurationField {
  key: string;
  label: string;
  type: "string" | "boolean" | "number";
  required: boolean;
  secret?: boolean;
}

export interface ProjectPluginBinding {
  projectId: string;
  pluginId: string;
  version: string;
  enabled: boolean;
}

export interface PaymentPlugin {
  manifest: PaymentProviderDescriptor;
  configuration: readonly PluginConfigurationField[];
  createGateway(
    config: Readonly<Record<string, string | boolean | number>>,
  ): import("@/src/payments/gateway").PaymentGateway<string>;
}
