import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Judge0 Language IDs to Piston Languages
const getPistonLanguage = (judge0Id: number) => {
  switch (judge0Id) {
    case 63: return "javascript";
    case 71: return "python";
    case 62: return "java";
    case 54: return "cpp";
    default: return "javascript";
  }
};

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

async function runOnce(pistonLang: string, sourceCode: string, stdin: string) {
  const response = await fetch(PISTON_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: pistonLang,
      version: "*",
      files: [{ content: sourceCode }],
      stdin: stdin || "",
    }),
  });

  if (!response.ok) {
    throw new Error(`Piston API error: ${response.statusText}`);
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

    const pistonLang = getPistonLanguage(language_id);

    // ── Test-case mode ───────────────────────────────────────────────
    if (Array.isArray(test_cases) && test_cases.length > 0) {
      const results: { input: string; expected: string; actual: string; passed: boolean; error: string | null }[] = [];

      for (const tc of test_cases) {
        try {
          // Convert literal \n sequences to actual newlines (admin types "5\n3" in input field)
          const tcInput = (tc.input || "").replace(/\\n/g, "\n");
          const tcExpected = (tc.expected_output || "").replace(/\\n/g, "\n").trim();

          const data = await runOnce(pistonLang, source_code, tcInput);
          const stdout = (data.run?.stdout || "").trim();
          const stderr = data.run?.stderr || "";
          const compileErr = data.compile?.stderr || "";
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
            expected: (tc.expected_output || "").trim(),
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
    const data = await runOnce(pistonLang, source_code, stdin || "");

    const mappedResponse = {
      stdout: data.run?.stdout || null,
      stderr: data.run?.stderr || null,
      compile_output: data.compile?.stderr || null,
      status: {
        id: data.run?.code === 0 ? 3 : 11,
        description: data.run?.code === 0 ? "Accepted" : "Runtime Error"
      }
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
