import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { player_id, challenge_id, modified_code, lines_changed } = await req.json();

        if (!modified_code || typeof lines_changed !== 'number') {
            throw new Error("Invalid payload. Required: modified_code (string), lines_changed (number).");
        }

        // Hardcoded test suite for validation
        // System evaluation metrics for isolation execution
        const tests = [
            { input: [1, 2], expected: 3 },
            { input: [5, 5], expected: 10 },
            { input: [-1, 1], expected: 0 },
            { input: [100, 200], expected: 300 },
            { input: [0, 0], expected: 0 }
        ];

        let passed = true;
        let message = "SYSTEM ALIGNMENT: SUCCESS. ALL TESTS PASSED.";

        try {
            // Secure context isolation wrapper
            // Expecting the player to provide a block of code defining 'solve' or 'solution'
            const executionWrapper = new Function(`
        ${modified_code};
        if (typeof solve === 'function') return solve;
        if (typeof solution === 'function') return solution;
        throw new Error("No target function 'solve' or 'solution' found. Execution aborted.");
      `);

            const targetFunction = executionWrapper();

            for (let i = 0; i < tests.length; i++) {
                const { input, expected } = tests[i];
                const result = targetFunction(...input);

                if (result !== expected) {
                    passed = false;
                    message = `SYSTEM INTEGRITY COMPROMISED: Test ${i + 1} failed. Expected ${expected}, got ${result}.`;
                    break;
                }
            }
        } catch (err: any) {
            passed = false;
            message = `CRITICAL FAULT: Execution aborted. ${err.message}`;
        }

        // Surgical Scoring Formula
        const baseScore = 110;
        const penaltyPerLine = 10;

        // Only calculate score on success
        const finalScore = passed ? Math.max(0, baseScore - (lines_changed * penaltyPerLine)) : 0;

        return new Response(
            JSON.stringify({
                success: passed,
                score: finalScore,
                message: message
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
