import { GoogleAuth } from "google-auth-library";

export const HEADERS = [
  "ID do pedido",
  "Criado em (UTC)",
  "Rota",
  "Produto",
  "Valor (R$)",
  "Pagamento",
  "Gateway",
  "Status do pagamento",
  "ID da transação",
  "Nome",
  "E-mail",
  "CPF",
  "Telefone",
  "CEP",
  "Endereço",
  "Número",
  "Complemento",
  "Bairro",
  "Cidade",
  "UF",
];
export const MANUAL_HEADERS = [
  "Status de envio",
  "Compra Shopee",
  "Rastreamento",
  "Observações",
];
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
/** A dedicated tab is required. Columns A:T belong to the integration; use U onward for manual work. */
export class GoogleSheetsWriter {
  constructor({ spreadsheetId, tab, client }) {
    this.spreadsheetId = spreadsheetId;
    this.tab = tab;
    this.client = client;
    this.metadata = null;
  }
  static async connect({ spreadsheetId, tab }) {
    const auth = new GoogleAuth({ scopes: [SCOPE] });
    return new GoogleSheetsWriter({
      spreadsheetId,
      tab,
      client: await auth.getClient(),
    });
  }
  get base() {
    return `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.spreadsheetId)}`;
  }
  range(cells) {
    return `'${this.tab.replaceAll("'", "''")}'!${cells}`;
  }
  async values(cells) {
    const res = await this.client.request({
      url: `${this.base}/values/${encodeURIComponent(this.range(cells))}`,
      method: "GET",
      timeout: 10000,
    });
    return res.data.values ?? [];
  }
  async put(cells, values) {
    await this.client.request({
      url: `${this.base}/values/${encodeURIComponent(this.range(cells))}`,
      method: "PUT",
      params: { valueInputOption: "RAW" },
      data: { majorDimension: "ROWS", values },
      timeout: 10000,
    });
  }
  async ensureGrid(row) {
    if (!this.metadata || row > this.metadata.rows) {
      const res = await this.client.request({
        url: this.base,
        method: "GET",
        params: {
          fields:
            "sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))",
        },
        timeout: 10000,
      });
      const item = res.data.sheets?.find(
        (s) => s.properties?.title === this.tab,
      )?.properties;
      if (
        !item ||
        !Number.isInteger(item.sheetId) ||
        !Number.isInteger(item.gridProperties?.rowCount) ||
        !Number.isInteger(item.gridProperties?.columnCount)
      )
        throw new Error("Aba não encontrada");
      this.metadata = {
        id: item.sheetId,
        rows: item.gridProperties.rowCount,
        columns: item.gridProperties.columnCount,
      };
    }
    if (this.metadata.columns < 24) {
      const extra = 24 - this.metadata.columns;
      await this.client.request({
        url: `${this.base}:batchUpdate`,
        method: "POST",
        data: {
          requests: [
            {
              appendDimension: {
                sheetId: this.metadata.id,
                dimension: "COLUMNS",
                length: extra,
              },
            },
          ],
        },
        timeout: 10000,
      });
      this.metadata.columns += extra;
    }
    if (row > this.metadata.rows) {
      const extra = Math.max(100, row - this.metadata.rows);
      await this.client.request({
        url: `${this.base}:batchUpdate`,
        method: "POST",
        data: {
          requests: [
            {
              appendDimension: {
                sheetId: this.metadata.id,
                dimension: "ROWS",
                length: extra,
              },
            },
          ],
        },
        timeout: 10000,
      });
      this.metadata.rows += extra;
    }
  }
  async writeOrder(row, values) {
    await this.ensureGrid(row);
    const existing = (await this.values("A1:T1"))[0] ?? [];
    if (existing.length === 0) await this.put("A1:T1", [HEADERS]);
    else if (HEADERS.some((heading, i) => existing[i] !== heading))
      throw new Error("Cabeçalho incompatível");
    const manual = (await this.values("U1:X1"))[0] ?? [];
    if (manual.length === 0) await this.put("U1:X1", [MANUAL_HEADERS]);
    const ids = await this.values(`A2:A${Math.max(row, this.metadata.rows)}`);
    for (let i = 0; i < ids.length; i++) {
      if (ids[i]?.[0] === values[0] && i + 2 !== row)
        throw new Error("Pedido encontrado em outra linha");
    }
    const current = (await this.values(`A${row}:T${row}`))[0] ?? [];
    if (current[0] && current[0] !== values[0])
      throw new Error("Linha pertence a outro pedido");
    if (!current[0] && current.some((value) => value !== "" && value != null))
      throw new Error("Linha ocupada sem identificador");
    await this.put(`A${row}:T${row}`, [values]);
  }
}
