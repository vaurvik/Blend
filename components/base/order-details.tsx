import { getOrderDetails } from "@/src/payments/orders";

export function OrderDetails({ id }: { id: string }) {
  const d = getOrderDetails(id);
  if (!d) return null;
  return (
    <details>
      <summary>Dados de entrega</summary>
      <p>
        {d.name} · {d.phone}
        <br />
        {d.email} · CPF {d.document}
        <br />
        {d.street}, {d.house_number}
        {d.complement ? `, ${d.complement}` : ""}
        <br />
        {d.neighborhood} · {d.city}/{d.state} · CEP {d.cep}
      </p>
    </details>
  );
}
