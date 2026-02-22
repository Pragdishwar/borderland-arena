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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { source_code, language_id, stdin } = await req.json();

    if (!source_code || !language_id) {
      return new Response(JSON.stringify({ error: "Missing payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const pistonLang = getPistonLanguage(language_id);

    // Piston API URL (change this if you self-host Piston!)
    const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

    // Optional: If you got a Piston API key, get it from Supabase secrets
    // const apiKey = Deno.env.get("PISTON_API_KEY");

    const response = await fetch(PISTON_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // "Authorization": `apiKey ${apiKey}` // Uncomment if using auth
      },
      body: JSON.stringify({
        language: pistonLang,
        version: "*", // Automatically use the latest version available
        files: [
          {
            content: source_code
          }
        ],
        stdin: stdin || "",
      }),
    });

    if (!response.ok) {
      throw new Error(`Piston API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Map Piston's response format back to what our frontend expects
    // Piston returns { run: { stdout: "...", stderr: "...", code: 0 } }
    const mappedResponse = {
      stdout: data.run?.stdout || null,
      stderr: data.run?.stderr || null,
      compile_output: data.compile?.stderr || null,
      status: {
        id: data.run?.code === 0 ? 3 : 11, // 3 = Accepted, 11 = Error in Judge0 terms
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
