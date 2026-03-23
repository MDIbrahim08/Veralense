# VeraLens: Cognitive Proofing & Fact-Verification Engine

**VeraLens** is an advanced, multi-agent AI framework designed to automate the process of fact-checking dense text, news articles, and digital media in real-time. Built for the **Grand Finale Hackathon**, it solves the critical problem of misinformation and "LLM hallucinations" in the digital age.

## 🚀 Key Features

-   **Claim Extraction**: Decomposes complex input into atomic, verifiable Statements (Agentic LLM Extraction).
-   **Autonomous Evidence Retrieval**: Formulates search strategies using **Tavily API** and fetches real-world data from authoritative sources (.gov, .edu, reputable journals).
-   **Multi-Model Verification**: Uses **Groq (Llama-3)** for rapid cross-referencing and **Google Gemini** for final reasoning and "Self-Reflection" reviews.
-   **Cognitive Analysis**: A first-of-its-kind feature that detects **Media Bias** (ideological spectrum) and **Emotional Sentiment** (hostility/neutrality).
-   **Bonus Points (Included)**:
    -   **AI Text Detection**: Linguistic marker analysis to calculate a "Probability Score" for LLM-generated text.
    -   **AI Media (Deepfake) Detection**: Vision-AI integration to detect synthetic manipulation in uploaded images.

## 🛠️ Tech Stack

-   **Frontend**: React (Vite) + Tailwind CSS + Framer Motion (for premium aesthetics).
-   **Backend**: Supabase Edge Functions (Deno) with an **Agentic Fallback Controller** for 100% uptime.
-   **Intelligence Layer**:
    -   **Groq API**: High-speed reasoning (Llama-3.3-70B).
    -   **Google Gemini 2.0**: Vision-AI and deep cognitive evaluation.
-   **Search Infrastructure**: Tavily AI + DuckDuckGo fallback.

## 🏛️ Architecture & Innovation

1.  **Agentic Fallback System**: To maintain 100% reliability during the demo, VeraLens features a local "Neural Fallback" should the cloud backend hit rate limits or downtime.
2.  **Self-Reflection Loop**: After an initial verdict is reached, a secondary agent audits the reasoning to ensure no "internal hallucinations" occurred, justifying every claim against retrieved URLs.
3.  **Source Authority Meter**: Not just links, but a calculated "Trust Score" (0-100) for every cited source based on domain reputation.

## 🏃 Getting Started

1.  **Clone the Repo**
2.  **Set Environment Variables** in `.env.local`:
    ```bash
    VITE_SUPABASE_URL=...
    VITE_SUPABASE_PUBLISHABLE_KEY=...
    VITE_GROQ_API_KEY=...
    VITE_GEMINI_API_KEY=...
    ```
3.  **Run Locally**:
    ```bash
    npm install
    npm run dev
    ```

---
**Developed for the Chanakya University Grand Finale Hackathon.**
*Solving Trust and Reliability in the Age of AI.*
