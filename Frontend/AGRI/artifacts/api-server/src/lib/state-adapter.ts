import { db } from "@workspace/db";
import { stateAdapterCache, udlrnMaster } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface StateLandRecord {
  udlrn: string;
  stateCode: string;
  ownerName: string;
  areaHa: number;
  landUse: string;
  cropType: string;
  sowingDate: string;
  lastMutationDate: string;
  mutationNumber: string;
  confidence: number;
  source: string;
  freshness: "LIVE" | "CACHED";
}

export interface StateAdapterResponse {
  success: boolean;
  data?: StateLandRecord;
  error?: string;
  cached: boolean;
  cacheExpiresAt?: Date;
}

export interface StateAdapter {
  stateCode: string;
  adapterName: string;
  baseUrl?: string;
  fetchLandRecord(udlrn: string): Promise<StateAdapterResponse>;
}

const CACHE_TTL_DAYS = 90;

function hashUdlrn(udlrn: string): number {
  let hash = 0;
  for (let i = 0; i < udlrn.length; i++) {
    const char = udlrn.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function deterministicMockData(udlrn: string, stateCode: string): StateLandRecord {
  const hash = hashUdlrn(udlrn);
  const areas = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  const landUses = ["Irrigated", "Rainfed", "Mixed"];
  const crops = ["Paddy", "Wheat", "Cotton", "Sugarcane", "Groundnut", "Maize"];
  
  const areaHa = areas[hash % areas.length];
  const landUse = landUses[hash % landUses.length];
  const cropType = crops[hash % crops.length];
  
  const baseDate = new Date("2024-01-01");
  const sowingDate = new Date(baseDate.getTime() + (hash % 180) * 86400000);
  const mutationDate = new Date(baseDate.getTime() + ((hash + 30) % 365) * 86400000);
  
  return {
    udlrn,
    stateCode,
    ownerName: `Farmer ${hash % 1000}`,
    areaHa,
    landUse,
    cropType,
    sowingDate: sowingDate.toISOString().split("T")[0],
    lastMutationDate: mutationDate.toISOString().split("T")[0],
    mutationNumber: `MUT-${(hash % 10000).toString().padStart(6, "0")}`,
    confidence: 0.85 + (hash % 15) / 100,
    source: `${stateCode}_LAND_RECORDS`,
    freshness: "LIVE",
  };
}

async function getCachedRecord(udlrn: string, adapterName: string): Promise<StateLandRecord | null> {
  const cacheKey = `${adapterName}:${udlrn}`;
  const now = new Date();
  
  const cached = await db
    .select()
    .from(stateAdapterCache)
    .where(
      and(
        eq(stateAdapterCache.cacheKey, cacheKey),
        gt(stateAdapterCache.expiresAt, now)
      )
    )
    .limit(1);
  
  if (cached.length > 0 && cached[0].responseData) {
    const data = cached[0].responseData as StateLandRecord;
    data.freshness = "CACHED";
    return data;
  }
  
  return null;
}

async function setCachedRecord(
  udlrn: string,
  adapterName: string,
  data: StateLandRecord,
  confidence: number
): Promise<void> {
  const cacheKey = `${adapterName}:${udlrn}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);
  
  await db.insert(stateAdapterCache).values({
    id: randomUUID(),
    udlrn,
    stateCode: data.stateCode,
    adapterName,
    cacheKey,
    responseData: data as any,
    confidence,
    fetchedAt: new Date(),
    expiresAt,
    freshness: "LIVE",
    adapterStatus: "OK",
  }).onConflictDoNothing();
}

class MaharashtraAdapter implements StateAdapter {
  stateCode = "MH";
  adapterName = "MaharashtraLandRecords";
  baseUrl = "https://mahabhulekh.maharashtra.gov.in/api";

  async fetchLandRecord(udlrn: string): Promise<StateAdapterResponse> {
    const cached = await getCachedRecord(udlrn, this.adapterName);
    if (cached) {
      return {
        success: true,
        data: cached,
        cached: true,
        freshness: "CACHED",
      };
    }

    const data = deterministicMockData(udlrn, this.stateCode);
    await setCachedRecord(udlrn, this.adapterName, data, data.confidence);

    return {
      success: true,
      data,
      cached: false,
      cacheExpiresAt: new Date(Date.now() + CACHE_TTL_DAYS * 86400000),
    };
  }
}

class KarnatakaAdapter implements StateAdapter {
  stateCode = "KA";
  adapterName = "KarnatakaBhoomi";
  baseUrl = "https://bhoomi.karnataka.gov.in/api";

  async fetchLandRecord(udlrn: string): Promise<StateAdapterResponse> {
    const cached = await getCachedRecord(udlrn, this.adapterName);
    if (cached) {
      return {
        success: true,
        data: cached,
        cached: true,
        freshness: "CACHED",
      };
    }

    const data = deterministicMockData(udlrn, this.stateCode);
    await setCachedRecord(udlrn, this.adapterName, data, data.confidence);

    return {
      success: true,
      data,
      cached: false,
      cacheExpiresAt: new Date(Date.now() + CACHE_TTL_DAYS * 86400000),
    };
  }
}

class RajasthanAdapter implements StateAdapter {
  stateCode = "RJ";
  adapterName = "RajasthanApnaKhata";
  baseUrl = "https://apnakhata.rajasthan.gov.in/api";

  async fetchLandRecord(udlrn: string): Promise<StateAdapterResponse> {
    const cached = await getCachedRecord(udlrn, this.adapterName);
    if (cached) {
      return {
        success: true,
        data: cached,
        cached: true,
        freshness: "CACHED",
      };
    }

    const data = deterministicMockData(udlrn, this.stateCode);
    await setCachedRecord(udlrn, this.adapterName, data, data.confidence);

    return {
      success: true,
      data,
      cached: false,
      cacheExpiresAt: new Date(Date.now() + CACHE_TTL_DAYS * 86400000),
    };
  }
}

class TelanganaAdapter implements StateAdapter {
  stateCode = "TG";
  adapterName = "TelanganaDharani";
  baseUrl = "https://dharani.telangana.gov.in/api";

  async fetchLandRecord(udlrn: string): Promise<StateAdapterResponse> {
    const cached = await getCachedRecord(udlrn, this.adapterName);
    if (cached) {
      return {
        success: true,
        data: cached,
        cached: true,
        freshness: "CACHED",
      };
    }

    const data = deterministicMockData(udlrn, this.stateCode);
    await setCachedRecord(udlrn, this.adapterName, data, data.confidence);

    return {
      success: true,
      data,
      cached: false,
      cacheExpiresAt: new Date(Date.now() + CACHE_TTL_DAYS * 86400000),
    };
  }
}

class PunjabAdapter implements StateAdapter {
  stateCode = "PB";
  adapterName = "PunjabJamabandi";
  baseUrl = "https://jamabandi.punjab.gov.in/api";

  async fetchLandRecord(udlrn: string): Promise<StateAdapterResponse> {
    const cached = await getCachedRecord(udlrn, this.adapterName);
    if (cached) {
      return {
        success: true,
        data: cached,
        cached: true,
        freshness: "CACHED",
      };
    }

    const data = deterministicMockData(udlrn, this.stateCode);
    await setCachedRecord(udlrn, this.adapterName, data, data.confidence);

    return {
      success: true,
      data,
      cached: false,
      cacheExpiresAt: new Date(Date.now() + CACHE_TTL_DAYS * 86400000),
    };
  }
}

class UttarPradeshAdapter implements StateAdapter {
  stateCode = "UP";
  adapterName = "UttarPradeshBhulekh";
  baseUrl = "https://bhulekh.up.gov.in/api";

  async fetchLandRecord(udlrn: string): Promise<StateAdapterResponse> {
    const cached = await getCachedRecord(udlrn, this.adapterName);
    if (cached) {
      return {
        success: true,
        data: cached,
        cached: true,
        freshness: "CACHED",
      };
    }

    const data = deterministicMockData(udlrn, this.stateCode);
    await setCachedRecord(udlrn, this.adapterName, data, data.confidence);

    return {
      success: true,
      data,
      cached: false,
      cacheExpiresAt: new Date(Date.now() + CACHE_TTL_DAYS * 86400000),
    };
  }
}

const adapters: Record<string, StateAdapter> = {
  MH: new MaharashtraAdapter(),
  KA: new KarnatakaAdapter(),
  RJ: new RajasthanAdapter(),
  TG: new TelanganaAdapter(),
  PB: new PunjabAdapter(),
  UP: new UttarPradeshAdapter(),
};

export function getStateAdapter(stateCode: string): StateAdapter | null {
  return adapters[stateCode] || null;
}

export async function fetchLandRecord(udlrn: string): Promise<StateAdapterResponse> {
  const udlrnRecord = await db
    .select({ stateCode: udlrnMaster.stateCode })
    .from(udlrnMaster)
    .where(eq(udlrnMaster.udlrn, udlrn))
    .limit(1);

  if (udlrnRecord.length === 0 || !udlrnRecord[0].stateCode) {
    return {
      success: false,
      error: "UDLRN not found or state code missing",
      cached: false,
    };
  }

  const adapter = getStateAdapter(udlrnRecord[0].stateCode);
  if (!adapter) {
    return {
      success: false,
      error: `No adapter available for state: ${udlrnRecord[0].stateCode}`,
      cached: false,
    };
  }

  return adapter.fetchLandRecord(udlrn);
}

export {
  MaharashtraAdapter,
  KarnatakaAdapter,
  RajasthanAdapter,
  TelanganaAdapter,
  PunjabAdapter,
  UttarPradeshAdapter,
};
