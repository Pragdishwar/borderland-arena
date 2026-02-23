import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Judge0 CE language IDs (same as our frontend IDs)
// 63 = JavaScript (Node.js), 71 = Python 3, 62 = Java, 54 = C++
const JUDGE0_URL = "https://ce.judge0.com/submissions?base64_encoded=true&wait=true";

function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return atob(str);
  }
}

async function runOnce(languageId: number, sourceCode: string, stdin: string) {
  const response = await fetch(JUDGE0_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_code: toBase64(sourceCode),
      language_id: languageId,
      stdin: toBase64(stdin),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Judge0 API error (${response.status}): ${text}`);
  }
  return await response.json();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { source_code, language_id, stdin, test_cases } = await req.json();

    if (!source_code || !language_id) {
      return new Response(JSON.stringify({ error: "Missing payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // ── Test-case mode ───────────────────────────────────────────────
    if (Array.isArray(test_cases) && test_cases.length > 0) {
      const results: { input: string; expected: string; actual: string; passed: boolean; error: string | null }[] = [];

      for (const tc of test_cases) {
        try {
          // Convert literal \n sequences to actual newlines (admin types "5\n3" in input field)
          const tcInput = (tc.input || "").replace(/\\n/g, "\n");
          const tcExpected = (tc.expected_output || "").replace(/\\n/g, "\n").trim();

          const data = await runOnce(language_id, source_code, tcInput);
          const stdout = data.stdout ? fromBase64(data.stdout).trim() : "";
          const stderr = data.stderr ? fromBase64(data.stderr) : "";
          const compileErr = data.compile_output ? fromBase64(data.compile_output) : "";
          const passed = stdout === tcExpected;

          results.push({
            input: tc.input || "",
            expected: tcExpected,
            actual: stdout,
            passed,
            error: compileErr || stderr || null,
          });
        } catch (err: unknown) {
          const e = err as Error;
          results.push({
            input: tc.input || "",
            expected: (tc.expected_output || "").replace(/\\n/g, "\n").trim(),
            actual: "",
            passed: false,
            error: e.message,
          });
        }
      }

      const passed = results.filter(r => r.passed).length;

      return new Response(JSON.stringify({ passed, total: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── Legacy single-execution mode ─────────────────────────────────
    const data = await runOnce(language_id, source_code, stdin || "");

    const mappedResponse = {
      stdout: data.stdout ? fromBase64(data.stdout) : null,
      stderr: data.stderr ? fromBase64(data.stderr) : null,
      compile_output: data.compile_output ? fromBase64(data.compile_output) : null,
      status: data.status || { id: 0, description: "Unknown" },
    };

    return new Response(JSON.stringify(mappedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const e = error as Error;
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
