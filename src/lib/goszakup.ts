const GOSZAKUP_API = "https://ows.goszakup.gov.kz/v3/graphql";

export interface GoszakupLot {
  id: number;
  nameRu: string;
  lotNumber: string | null;
  amount: number | null;
  count: number | null;
  unitNameRu: string | null;
  budget: number | null;
  customerBin: string | null;
}

export interface GoszakupTender {
  id: number;
  nameRu: string;
  totalSum: number | null;
  endDate: string | null;
  publishDate: string | null;
  customerBin: string | null;
  customerNameRu: string | null;
  trdBuyStatusId: number;
  refBuyMethodId: number | null;
  Lots: GoszakupLot[];
}

const SEARCH_QUERY = `
query SearchTenders($keyword: String, $limit: Int, $offset: Int) {
  TrdBuy(
    filter: { nameRu: $keyword, trdBuyStatusId: 220 }
    limit: $limit
    offset: $offset
  ) {
    id
    nameRu
    totalSum
    endDate
    publishDate
    customerBin
    customerNameRu
    trdBuyStatusId
    refBuyMethodId
    Lots {
      id
      nameRu
      lotNumber
      amount
      count
      unitNameRu
      budget
      customerBin
    }
  }
}
`;

export async function searchGoszakupTenders(
  keyword: string,
  token: string,
  limit = 50,
  offset = 0
): Promise<GoszakupTender[]> {
  const res = await fetch(GOSZAKUP_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { keyword, limit, offset },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Goszakup API: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.errors?.length) {
    throw new Error(data.errors[0].message ?? "GraphQL error");
  }

  return (data.data?.TrdBuy as GoszakupTender[]) ?? [];
}

export async function verifyGoszakupToken(token: string): Promise<boolean> {
  try {
    await searchGoszakupTenders("тест", token, 1);
    return true;
  } catch {
    return false;
  }
}

// Map goszakup refBuyMethodId to human-readable method name
const METHOD_MAP: Record<number, string> = {
  1: "Открытый конкурс",
  2: "Конкурс с предварительным квалификационным отбором",
  4: "Запрос ценовых предложений",
  5: "Из одного источника",
  6: "Конкурс",
  7: "Электронный магазин",
};

export function mapBuyMethod(id: number | null): string | undefined {
  return id ? METHOD_MAP[id] : undefined;
}
