import { Platform } from "react-native";

export interface GeoPoint {
  lat: number;
  lon: number;
  city?: string;
}

export interface AiUserProfileInput {
  id: string;
  name: string;
  age?: number;
  bio?: string;
  interests?: string[];
  image?: string;
  location?: GeoPoint;
  faceVector?: number[];
  faceScoreFromVerification?: number;
}

export interface AiProfileScore {
  id: string;
  score: number;
  reason: string;
}

export interface AiBatchResponse {
  scores: AiProfileScore[];
}

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function jaccard(arrA: string[] = [], arrB: string[] = []): number {
  const setA = new Set(arrA.map((s) => s.toLowerCase()));
  const setB = new Set(arrB.map((s) => s.toLowerCase()));
  const inter = new Set([...setA].filter((x) => setB.has(x))).size;
  const uni = new Set([...setA, ...setB]).size || 1;
  return inter / uni;
}

function cosine(a?: number[], b?: number[]): number | null {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) return null;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i] as number;
    const vb = b[i] as number;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  if (na === 0 || nb === 0) return null;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function computeLocalScores(user: AiUserProfileInput, candidates: AiUserProfileInput[]): AiBatchResponse {
  const res: AiProfileScore[] = candidates.map((c) => {
    const interestSim = jaccard(user.interests ?? [], c.interests ?? []); // 0..1
    const ageGap = user.age && c.age ? Math.abs(user.age - c.age) : null;
    const ageScore = ageGap == null ? 0.5 : clamp01(1 - Math.min(ageGap, 20) / 20);
    let distanceScore = 0.5;
    if (user.location && c.location) {
      const km = haversineKm(user.location, c.location);
      // 0km->1, 5km->0.9, 25km->0.7, 100km->0.4, 500km->0.1
      const mapped = km <= 5 ? 0.9 : km <= 25 ? 0.7 : km <= 100 ? 0.4 : km <= 500 ? 0.15 : 0.05;
      distanceScore = clamp01(mapped);
    }
    let faceScore = 0.5;
    const cos = cosine(user.faceVector, c.faceVector);
    if (typeof c.faceScoreFromVerification === "number") {
      faceScore = clamp01(c.faceScoreFromVerification);
    } else if (cos != null) {
      faceScore = clamp01((cos + 1) / 2);
    }

    const wInterests = 0.45;
    const wAge = 0.2;
    const wDistance = 0.2;
    const wFace = 0.15;

    const blended = wInterests * interestSim + wAge * ageScore + wDistance * distanceScore + wFace * faceScore;
    const percent = Math.round(clamp01(blended) * 100);

    const reasonParts: string[] = [];
    if (interestSim >= 0.4) reasonParts.push("shared interests");
    if (ageGap != null && ageScore >= 0.6) reasonParts.push("close age");
    if (user.location?.city && c.location?.city) reasonParts.push(`near ${c.location.city}`);
    if (faceScore >= 0.6) reasonParts.push("facial similarity ok");
    if (!reasonParts.length) reasonParts.push("baseline compatibility");

    return { id: c.id, score: percent, reason: reasonParts.join(", ") };
  });

  res.sort((a, b) => b.score - a.score);
  return { scores: res };
}

export async function scoreProfilesAgainstUser(
  user: AiUserProfileInput,
  candidates: AiUserProfileInput[],
): Promise<AiBatchResponse> {
  try {
    const system = "You are a strict JSON generator. Output only valid JSON with fields: scores:[{id,score,reason}]. Score 0-100. Consider: shared interests (heavy), age proximity, geographic proximity, and any provided face scores/vectors. Keep reason concise (<=160 chars).";

    const userText = `User\\nname:${user.name}\\nage:${user.age ?? ""}\\nbio:${user.bio ?? ""}\\ninterests:${(user.interests ?? []).join(", ")}\\nlocation:${user.location ? `${user.location.city ?? ''} (${user.location.lat},${user.location.lon})` : ""}`;

    const candidatesText = candidates
      .map((c) => {
        const base = {
          id: c.id,
          name: c.name,
          age: c.age ?? null,
          bio: c.bio ?? "",
          interests: c.interests ?? [],
          location: c.location ? { city: c.location.city, lat: c.location.lat, lon: c.location.lon } : null,
          faceScoreFromVerification: typeof c.faceScoreFromVerification === "number" ? c.faceScoreFromVerification : null,
        };
        return JSON.stringify(base);
      })
      .join(",\\n");

    const prompt = `Given the user and candidate profiles, return JSON {\"scores\":[{\"id\":\"id\",\"score\":0-100,\"reason\":\"short\"}]} sorted by score desc.\n${userText}\nCandidates:[\n${candidatesText}\n]`;

    const res = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.log("[aiMatch] HTTP error", res.status, text);
      // fall back to local scoring
      return computeLocalScores(user, candidates);
    }

    const data = (await res.json()) as { completion?: string };
    const completion = data?.completion ?? "";
    let parsed: AiBatchResponse | null = null;
    try {
      parsed = JSON.parse(completion) as AiBatchResponse;
    } catch (e) {
      console.log("[aiMatch] JSON parse fallback on completion", completion.slice(0, 200));
      const match = completion.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]) as AiBatchResponse;
      }
    }

    if (!parsed?.scores || !Array.isArray(parsed.scores)) {
      return computeLocalScores(user, candidates);
    }

    const safeScores = parsed.scores
      .filter((s) => typeof s.id === "string" && typeof s.score === "number")
      .map((s) => ({ ...s, score: Math.max(0, Math.min(100, s.score)) }));

    if (!safeScores.length) {
      return computeLocalScores(user, candidates);
    }

    return { scores: safeScores };
  } catch (error) {
    console.log("[aiMatch] error", error);
    return computeLocalScores(user, candidates);
  }
}
