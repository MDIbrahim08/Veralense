import { useState, useCallback, useRef } from 'react';
import type {
  ExtractedClaim, ClaimVerification, AIDetectionResult,
  ImageAnalysis, PipelineStep, LogEntry, VerificationReport
} from '@/types/verification';

type PipelineState = 'idle' | 'running' | 'complete' | 'error';

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'ingest', label: 'Content Ingestion', description: 'Fetching and parsing content...', status: 'pending' },
  { id: 'extract', label: 'Claim Extraction', description: 'Identifying verifiable statements...', status: 'pending' },
  { id: 'queries', label: 'Query Generation', description: 'Formulating search strategies...', status: 'pending' },
  { id: 'search', label: 'Evidence Retrieval', description: 'Searching for evidence...', status: 'pending' },
  { id: 'verify', label: 'Cross-Referencing', description: 'Verifying claims against evidence...', status: 'pending' },
  { id: 'cognitive', label: 'Cognitive Analysis', description: 'Detecting bias and sentiment...', status: 'pending' },
  { id: 'report', label: 'Report Assembly', description: 'Compiling final report...', status: 'pending' },
];

export function useVerificationPipeline() {
  const [state, setState] = useState<PipelineState>('idle');
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [claims, setClaims] = useState<ExtractedClaim[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: Date.now(), message, type }]);
  }, []);

  const updateStep = useCallback((stepId: string, status: PipelineStep['status'], detail?: string) => {
    setSteps(prev => prev.map(s => s.id !== stepId ? s : {
      ...s, status, detail: detail || s.detail,
      startTime: status === 'active' ? Date.now() : s.startTime,
      endTime: status === 'complete' || status === 'error' ? Date.now() : s.endTime,
    }));
  }, []);

  // Throttle: wait between API calls to stay under Groq's 30 RPM rate limit
  const throttle = useCallback(() => new Promise(r => setTimeout(r, 600)), []);

  const callAPI = useCallback(async (action: string, params: Record<string, unknown>) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error('Backend configuration missing. Check environment variables.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45s - generous for Groq under load

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action, ...params }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        
        // On 429 Or 500 (since we're hitting rate limits often), retry aggressively
        if (res.status === 429 || res.status === 500) {
          const waitTime = res.status === 429 ? 12000 : 3000;
          addLog(`Server busy (status ${res.status}) — Retrying in ${waitTime/1000}s...`, 'warning');
          await new Promise(r => setTimeout(r, waitTime));
          return callAPI(action, params);
        }
        throw new Error(err.error || `API error ${res.status}`);
      }
      return res.json();
    } catch (e: any) {
      clearTimeout(timeout);
      
      // CRITICAL FALLBACK: If Supabase Edge Function is failing (e.g. Docker/Deploy issues),
      // we can try to hit the API providers (Groq/Tavily) DIRECTLY if keys are available locally.
      const GROQ_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY;
      const GEMINI_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      
      if ((GROQ_KEY || GEMINI_KEY) && (action === 'extract-claims' || action === 'verify-claim' || action === 'generate-queries' || action === 'analyze-cognitive')) {
        addLog(`Backend unreachable — Engaging Agentic Fallback Control...`, 'info');
        try {
          const SYSTEM_PROMPTS: Record<string, string> = {
            'extract-claims': 'You are a precision claim extractor. Decompose text into atomic factual statements. Max 6 claims. Return JSON: { "claims": [...] }',
            'generate-queries': 'Generate 2-3 search queries for this claim. Return JSON: { "queries": [...] }',
            'verify-claim': 'Fact-check this claim using the provided evidence. Be assertive but fair. Return JSON with verdict, confidence, chainOfThought, etc.',
            'analyze-cognitive': 'Analyze sentiment and bias. Return JSON: { "sentiment": {...}, "bias": {...}, "narrativeAnalysis": "..." }'
          };
          
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: SYSTEM_PROMPTS[action] || "Respond with ONLY JSON." },
                { role: "user", content: JSON.stringify(params) }
              ],
              response_format: { type: "json_object" }
            })
          });
          if (groqRes.ok) {
            const data = await groqRes.json();
            const content = data.choices[0].message.content;
            try { return JSON.parse(content); } catch { }
          }
        } catch (err) {
          console.error("Fallback failed", err);
        }
      }

      if (e.name === 'AbortError') throw new Error('Process timed out — possibly due to high traffic.');
      throw e;
    }
  }, [addLog]);

  const fetchUrl = useCallback(async (url: string): Promise<{ text: string; images: string[] }> => {
    return callAPI('fetch-url', { url }) as Promise<{ text: string; images: string[] }>;
  }, [callAPI]);

  const translateReport = useCallback(async (report: VerificationReport, targetLang: string) => {
    addLog(`Translating report to ${targetLang}...`);
    try {
      const translated = await callAPI('translate-report', { report, targetLang });
      setReport(translated);
      addLog('Report translated successfully', 'success');
      return translated;
    } catch (e: any) {
      addLog(`Translation failed: ${e.message}`, 'error');
      throw e;
    }
  }, [addLog, callAPI]);

  const run = useCallback(async (text: string, inputUrl?: string, images?: string[]) => {
    setState('running');
    startTimeRef.current = Date.now();
    setLogs([]);
    setSteps(INITIAL_STEPS.map(s => ({ ...s })));
    setReport(null);
    setClaims([]);
    setElapsedMs(0);

    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 100);

    try {
      // Stage 1: Ingest
      updateStep('ingest', 'active');
      addLog(`Parsing input content (${text.length} chars)...`);
      await new Promise(r => setTimeout(r, 300));
      updateStep('ingest', 'complete', `${text.length} characters`);

      // Stage 2: Extract claims
      updateStep('extract', 'active');
      addLog('Extracting verifiable claims via AI...');
      const extractResult = await callAPI('extract-claims', { text });
      const extractedClaims: ExtractedClaim[] = extractResult.claims || [];
      setClaims(extractedClaims);
      updateStep('extract', 'complete', `Found ${extractedClaims.length} claims`);
      addLog(`Extracted ${extractedClaims.length} atomic claims`, 'success');

      // Stage 3: Generate queries
      updateStep('queries', 'active');
      const claimQueries: Record<string, string[]> = {};
      for (const claim of extractedClaims) {
        addLog(`Generating search queries for claim: "${claim.text.slice(0, 50)}..."`);
        try {
          await throttle(); // stay under 30 RPM
          const qr = await callAPI('generate-queries', { claim: claim.text, isTimeSensitive: claim.isTimeSensitive });
          claimQueries[claim.id] = qr.queries || [];
        } catch (e: any) {
          addLog(`Query generation failed: ${e.message}`, 'warning');
          claimQueries[claim.id] = [claim.text];
        }
      }
      updateStep('queries', 'complete', `Generated queries for ${extractedClaims.length} claims`);

      // Stage 4: Search evidence
      updateStep('search', 'active');
      const claimEvidence: Record<string, any[]> = {};
      for (const claim of extractedClaims) {
        claimEvidence[claim.id] = [];
        const queries = claimQueries[claim.id] || [];
        for (const query of queries) {
          addLog(`Searching: "${query}"`);
          try {
            await throttle(); // pace requests
            let sr = await callAPI('search-evidence', { query });
            if (sr.usedFallback) addLog('Tavily rate-limited → fell back to DuckDuckGo', 'warning');
            if ((sr.results || []).length === 0) {
              addLog('No results. Rephrasing query...', 'warning');
              try {
                const rephrased = await callAPI('rephrase-query', { query });
                sr = await callAPI('search-evidence', { query: rephrased.query });
                addLog(`Retried: "${rephrased.query}"`, 'info');
              } catch { /* ignore rephrase failure */ }
            }
            for (const r of (sr.results || [])) {
              claimEvidence[claim.id].push(r);
              addLog(`Fetched: ${r.domain}`, 'success');
            }
          } catch (e: any) {
            addLog(`Search failed: ${e.message}`, 'error');
          }
        }
      }
      updateStep('search', 'complete');

      // Stage 5: Verify
      updateStep('verify', 'active');
      const verifications: ClaimVerification[] = [];
      for (let i = 0; i < extractedClaims.length; i++) {
        const claim = extractedClaims[i];
        addLog(`Verifying claim ${i + 1} of ${extractedClaims.length}...`);
        const evidence = claimEvidence[claim.id] || [];

        try {
          await throttle(); // pace verify calls
          const v = await callAPI('verify-claim', { claim: claim.text, evidence });
          const wasReviewed = false;
          const initialVerdict = v.verdict;
          const initialConfidence = v.confidence;
          // Self-reflection skipped to conserve API quota — re-enable when quota is higher

          verifications.push({
            claimId: claim.id, claim, ...v,
            searchQueries: claimQueries[claim.id] || [],
            evidenceSources: evidence,
            totalSourcesRetrieved: evidence.length,
            totalSourcesUsed: (v.usedSourceUrls || []).length,
            wasReviewed,
            initialVerdict: wasReviewed ? initialVerdict : undefined,
            initialConfidence: wasReviewed ? initialConfidence : undefined,
          });
          addLog(`Claim ${i + 1}: ${v.verdict} (${v.confidence}%)`, 'success');
        } catch (e: any) {
          addLog(`Verification failed for claim ${i + 1}: ${e.message}`, 'error');
          verifications.push({
            claimId: claim.id, claim,
            verdict: 'unverifiable', confidence: 0,
            chainOfThought: 'Verification failed — network error.',
            usedSourceUrls: [], searchQueries: claimQueries[claim.id] || [],
            evidenceSources: evidence,
            totalSourcesRetrieved: evidence.length, totalSourcesUsed: 0,
            wasReviewed: false,
          });
        }
      }
      updateStep('verify', 'complete');

      // Stage 6: Report assembly + AI detection + Cognitive
      updateStep('cognitive', 'active');
      addLog('Running AI content analysis...');
      let aiDetection: AIDetectionResult | undefined;
      try {
        aiDetection = await callAPI('detect-ai', { text });
        addLog(`AI detection: ${aiDetection?.verdict} (${aiDetection?.overallProbability}%)`, 'success');
      } catch (e: any) {
        addLog(`AI detection failed: ${e.message}`, 'warning');
      }

      addLog('Analyzing narrative bias and sentiment...');
      let cognitiveAnalysis: any;
      try {
        cognitiveAnalysis = await callAPI('analyze-cognitive', { text });
        addLog(`Cognitive analysis complete: ${cognitiveAnalysis?.bias?.label} bias detected`, 'success');
      } catch (e: any) {
        addLog(`Cognitive analysis failed: ${e.message}`, 'warning');
      }
      updateStep('cognitive', 'complete');

      updateStep('report', 'active');

      let imageAnalyses: ImageAnalysis[] | undefined;
      if (images && images.length > 0) {
        addLog(`Analyzing ${images.length} media assets...`);
        imageAnalyses = [];
        for (const imgUrl of images.slice(0, 5)) {
          try {
            const isBase64 = imgUrl.startsWith('base64:');
            const analysis = await callAPI('analyze-image', isBase64 
              ? { imageBase64: imgUrl.replace('base64:', ''), mediaType: 'image/jpeg' }
              : { imageUrl: imgUrl }
            );
            imageAnalyses.push({ imageUrl: isBase64 ? 'Local Upload' : imgUrl, ...analysis });
            addLog(`Media analysis complete: ${isBase64 ? 'Uploaded Image' : new URL(imgUrl).hostname}`, 'success');
          } catch (e: any) {
            addLog(`Media analysis failed: ${e.message}`, 'warning');
          }
        }
      }

      const finalReport: VerificationReport = {
        inputText: text, inputUrl, claims: extractedClaims, verifications,
        aiDetection, imageAnalyses, cognitiveAnalysis,
        timestamp: new Date().toISOString(),
        totalElapsedMs: Date.now() - startTimeRef.current,
      };

      setReport(finalReport);
      updateStep('report', 'complete');
      addLog('Report assembled!', 'success');
      setState('complete');
    } catch (e: any) {
      addLog(`Pipeline error: ${e.message}`, 'error');
      setState('error');
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedMs(Date.now() - startTimeRef.current);
    }
  }, [addLog, updateStep, callAPI]);

  const reset = useCallback(() => {
    setState('idle');
    setSteps(INITIAL_STEPS.map(s => ({ ...s })));
    setLogs([]);
    setReport(null);
    setClaims([]);
    setElapsedMs(0);
  }, []);

  return { state, steps, logs, report, claims, elapsedMs, run, reset, fetchUrl, translateReport };
}
