/**
 * Safely parse JSON from OpenAI responses.
 * If parsing fails, returns { response: raw content, actions: [] }.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeParseAgent(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    // Strip markdown code fences if present (```json ... ```)
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return { response: raw, actions: [] };
    }
  }
}
