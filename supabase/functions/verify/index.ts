import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callGroq(
  system: string,
  user: string,
  apiKeys: string[],
  maxTokens = 4096
) {
  const maxRetries = 3;
  let lastError: any;
  let keyIndex = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const apiKey = apiKeys[keyIndex % apiKeys.length];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      console.log(`[callGroq] Attempt ${attempt} | Key #${keyIndex + 1} | maxTokens: ${maxTokens}`);
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: system },
              { role: "user", content: user }
            ],
            max_tokens: maxTokens,
            temperature: 0.1,
            response_format: { type: "json_object" }
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!res.ok) {
        const t = await res.text();
        console.error(`[callGroq] Error ${res.status} (Key #${keyIndex + 1}):`, t.slice(0, 200));
        if (res.status === 429) {
          // Rotate to next key
          keyIndex++;
          console.log(`[callGroq] Rate limited — rotating to Key #${keyIndex + 1}`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        if (attempt < maxRetries && res.status >= 500) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Groq ${res.status}: ${t.slice(0, 200)}`);
      }
      const data = await res.json();
      if (!data.choices?.[0]?.message) {
        console.error("[callGroq] Invalid response structure:", JSON.stringify(data));
        throw new Error("Invalid response structure from Groq");
      }
      return data.choices[0].message.content;
    } catch (e: any) {
      clearTimeout(timeout);
      console.error(`[callGroq] Exception (Attempt ${attempt}):`, e.message);
      lastError = e;
      if (attempt === maxRetries) break;
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

function extractJSON(text: string) {
  console.log("Extracting JSON from AI response (first 200 chars):", text.slice(0, 200));
  const cleaned = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("No JSON found in AI response text:", text);
      throw new Error('No JSON found in AI response');
    }
    try {
      return JSON.parse(match[0]);
    } catch (e: any) {
      console.error("JSON parse failed on extraction match:", match[0]);
      throw new Error(`JSON parse error: ${e.message}`);
    }
  }
}

function classifyAuthority(domain: string): { level: 'authoritative' | 'credible' | 'unverified'; score: number } {
  const d = domain.toLowerCase();
  if (d.endsWith(".gov") || d.endsWith(".edu") || ["reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "nytimes.com", "nature.com"].some(x => d.includes(x))) {
    return { level: "authoritative", score: 95 };
  }
  if (["cnn.com", "theguardian.com", "washingtonpost.com", "forbes.com", "bloomberg.com", "sciencedirect.com", "who.int"].some(x => d.includes(x))) {
    return { level: "credible", score: 80 };
  }
  return { level: "unverified", score: 40 };
}

const respond = (data: unknown) => new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const respondError = (msg: string, status = 500) => new Response(JSON.stringify({ error: msg }), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body;
  try {
    body = await req.json();
  } catch (e: any) {
    console.error("JSON parse error on request:", e.message);
    return respondError(`Request JSON parse error: ${e.message}`, 400);
  }
  const { action } = body;
  console.log("[serve] Action being processed:", action);

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GROQ_API_KEY_2 = Deno.env.get("GROQ_API_KEY_2");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GROQ_API_KEY) return respondError("GROQ_API_KEY not configured.", 500);
    // Build key pool — automatically load-balances & fails over between keys
    const groqKeys = [GROQ_API_KEY, ...(GROQ_API_KEY_2 ? [GROQ_API_KEY_2] : [])];
    console.log(`[serve] Using ${groqKeys.length} Groq key(s)`);

    switch (action) {
      case "extract-claims": {
        try {
          const { text } = body;
          const systemPrompt = `You are a precision claim extractor. Your job is to decompose complex input text into a list of discrete, atomic, independently verifiable factual statements. Extract a maximum of 6 most important verifiable claims only. Return JSON: { "claims": [ { "id": "claim_1", "text": "...", "originalSpan": "..." } ] }`;
          const result = await callGroq(systemPrompt, `Extract verifiable claims from this text:\n\n${text}`, groqKeys);
          return respond(extractJSON(result));
        } catch (e: any) {
          return respondError(`extract-claims failed: ${e.message}`);
        }
      }

      case "generate-queries": {
        try {
          const { claim, isTimeSensitive } = body;
          const systemPrompt = `You are a search query strategist. Given a claim, generate 2-3 search queries. Return JSON: { "queries": ["..."] }`;
          let userMsg = `Claim: "${claim}"`;
          if (isTimeSensitive) userMsg += `\n\nInclude the current year (${new Date().getFullYear()}) in at least one query.`;
          const result = await callGroq(systemPrompt, userMsg, groqKeys, 1024);
          return respond(extractJSON(result));
        } catch (e: any) {
          return respondError(`generate-queries failed: ${e.message}`);
        }
      }

      case "search-evidence": {
        try {
          const { query } = body;
          const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
          let results: any[] = [];
          
          if (TAVILY_API_KEY) {
            try {
              const res = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: TAVILY_API_KEY, query, search_depth: "advanced", max_results: 5 }),
              });
              const data = await res.json();
              results = (data.results || []).map((r: any) => ({
                url: r.url,
                title: r.title,
                snippet: r.content || "",
                domain: new URL(r.url).hostname,
              }));
            } catch { /* fallback to DDG */ }
          }

          if (results.length === 0) {
            try {
              const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
              const data = await res.json();
              if (data.RelatedTopics) {
                results = data.RelatedTopics.slice(0, 5).filter((t: any) => t.FirstURL).map((t: any) => ({
                  url: t.FirstURL,
                  title: t.Text?.slice(0, 80) || "",
                  snippet: t.Text || "",
                  domain: new URL(t.FirstURL).hostname,
                }));
              }
            } catch { /* ignore */ }
          }

          for (const r of results) {
            const auth = classifyAuthority(r.domain);
            r.authorityLevel = auth.level;
            r.authorityScore = auth.score;
          }
          return respond({ results });
        } catch (e: any) {
          return respondError(`search-evidence failed: ${e.message}`);
        }
      }

      case "verify-claim": {
        try {
          const { claim, evidence } = body;
          const systemPrompt = `You are a fact-checker. Respond with ONLY JSON.
{
  "verdict": "true" | "partially_true" | "false" | "unverifiable" | "conflicting",
  "confidence": <number 0-100>,
  "chainOfThought": "<string>",
  "correction": "<string or null>",
  "accuratePart": "<string or null>",
  "misleadingPart": "<string or null>",
  "conflictingSourcesSummary": "<string or null>",
  "usedSourceUrls": ["<string>"]
}`;
          const evidenceText = (evidence || []).map((e: any, i: number) => `[Source ${i + 1}] ${e.domain}\n${e.snippet}`).join("\n\n");
          const result = await callGroq(systemPrompt, `Claim: "${claim}"\nEvidence:\n${evidenceText}`, groqKeys);
          return respond(extractJSON(result));
        } catch (e: any) {
          return respondError(`verify-claim failed: ${e.message}`);
        }
      }

      case "detect-ai": {
        try {
          const { text } = body;
          const systemPrompt = `Analyze this text for AI-generation markers. Return ONLY JSON: { 
            "overallProbability": <number 0-100>, 
            "indicators": { 
              "vocabularyEntropy": <number 0-100>, 
              "sentenceLengthUniformity": <number 0-100>, 
              "hedgingLanguage": <number 0-100>, 
              "structuralRepetition": <number 0-100>, 
              "perplexityEstimate": <number 0-100> 
            }, 
            "explanation": "<string>", 
            "verdict": "likely_ai" | "uncertain" | "likely_human" 
          }`;
          const result = await callGroq(systemPrompt, `Analyze this text for AI markers:\n\n${text.slice(0, 5000)}`, groqKeys, 1024);
          return respond(extractJSON(result));
        } catch (e: any) {
          return respondError(`detect-ai failed: ${e.message}`);
        }
      }

      case "fetch-url": {
        try {
          const { url } = body;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          try {
            const res = await fetch(url, {
              headers: { "User-Agent": "Mozilla/5.0 (compatible; VeritasAI/1.0)" },
              signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
            const html = await res.text();

            const cleaned = html
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<nav[\s\S]*?<\/nav>/gi, "")
              .replace(/<footer[\s\S]*?<\/footer>/gi, "")
              .replace(/<header[\s\S]*?<\/header>/gi, "")
              .replace(/<aside[\s\S]*?<\/aside>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
            const images: string[] = [];
            let match;
            while ((match = imgRegex.exec(html)) !== null) {
              const src = match[1];
              if (src.startsWith("http") && !src.includes("icon") && !src.includes("logo") && !src.includes("avatar")) {
                images.push(src);
              }
            }

            return respond({ text: cleaned.slice(0, 15000), images: images.slice(0, 10) });
          } catch (e) {
            clearTimeout(timeout);
            throw e;
          }
        } catch (e: any) {
          return respondError(`fetch-url failed: ${e.message}`);
        }
      }

      case "analyze-image": {
        try {
          const { imageUrl, imageBase64, mediaType: providedMediaType } = body;
          if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set for vision");

          let base64 = imageBase64 as string;
          let mediaType = (providedMediaType as string) || "image/jpeg";

          if (imageUrl) {
            const imgRes = await fetch(imageUrl);
            if (!imgRes.ok) throw new Error(`Failed to fetch image from URL: ${imgRes.status}`);
            const imgBuf = await imgRes.arrayBuffer();
            base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
            mediaType = imgRes.headers.get("content-type") || "image/jpeg";
          }

          if (!base64) throw new Error("No image data provided for analysis");

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inline_data: { mime_type: mediaType, data: base64 } },
                  { text: "Analyze this image for signs of AI generation, synthetic manipulation, or deepfake markers. Return ONLY JSON: { \"isAiGenerated\": <boolean>, \"confidence\": <number 0-100>, \"indicators\": [\"<string>\"], \"verdict\": \"ai_generated\" | \"appears_authentic\" }" }
                ]
              }],
              generationConfig: { responseMimeType: "application/json" }
            }),
          });
          const data = await res.json();
          if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
             throw new Error("Invalid response from Gemini Vision: " + JSON.stringify(data));
          }
          return respond(extractJSON(data.candidates[0].content.parts[0].text));
        } catch (e: any) {
          return respondError(`analyze-image failed: ${e.message}`);
        }
      }

      case "analyze-cognitive": {
        try {
          const { text } = body;
          const systemPrompt = `Analyze the sentiment and media bias of this text. Respond with ONLY JSON:
{
  "sentiment": { "label": "hostile" | "negative" | "neutral" | "positive" | "optimistic", "score": <number 0-100>, "description": "<string>" },
  "bias": { "label": "left" | "center-left" | "neutral" | "center-right" | "right", "description": "<string>", "certainty": <number 0-100> },
  "narrativeAnalysis": "<string explaining the underlying narrative or framing>"
}`;
          const result = await callGroq(systemPrompt, `Analyze this text:\n\n${text.slice(0, 5000)}`, groqKeys, 1024);
          return respond(extractJSON(result));
        } catch (e: any) {
          return respondError(`analyze-cognitive failed: ${e.message}`);
        }
      }

      case "translate-report": {
        try {
          const { report, targetLang } = body;
          const systemPrompt = `You are a translator. Translate the given fact-checking report into ${targetLang}. Preserve the JSON structure exactly. Translate all descriptive strings, verdicts, and labels. Do NOT translate URLs or IDs. Return ONLY JSON.`;
          const result = await callGroq(systemPrompt, `Translate this JSON report:\n\n${JSON.stringify(report)}`, groqKeys);
          return respond(extractJSON(result));
        } catch (e: any) {
          return respondError(`translate-report failed: ${e.message}`);
        }
      }

      default:
        return respondError("Unknown action: " + action, 400);
    }
  } catch (e: any) {
    return respondError(e.message);
  }
});
