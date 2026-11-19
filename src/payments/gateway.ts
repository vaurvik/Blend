export type GatewayId = string;
export type PaymentMethod = "pix" | "credit_card";
export interface PaymentCustomer {
  name: string;
  email: string;
  document: string;
  phone?: string;
}
export interface PaymentRequest {
  orderId: string;
  amountCents: number;
  description: string;
  customer: PaymentCustomer;
  shopUrl: string;
  checkoutUrl: string;
  postbackUrl: string;
  ip: string;
  method: PaymentMethod;
  cardToken?: string;
  installments?: number;
}
export interface PaymentResult {
  transactionId: string;
  status: string;
  copyPaste?: string;
  amountCents: number;
  externalRef: string;
}
export interface PaymentGateway<TId extends string = GatewayId> {
  readonly id: TId;
  readonly supportedMethods: readonly PaymentMethod[];
  createPayment(request: PaymentRequest): Promise<PaymentResult>;
  getPayment(transactionId: string): Promise<PaymentResult>;
}
