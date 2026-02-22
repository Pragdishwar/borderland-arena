import { supabase } from "@/integrations/supabase/client";

/**
 * Utility to execute code via Piston via a Supabase Edge Function.
 * Connects securely without exposing API keys.
 */
export const executeCode = async (sourceCode: string, languageId: number, stdin?: string) => {
    const payload = {
        source_code: sourceCode,
        language_id: languageId,
        stdin: stdin || ""
    };

    const { data, error } = await supabase.functions.invoke('piston-execute', {
        body: payload
    });

    if (error) {
        console.error("Piston Execution Error:", error);
        throw new Error(error.message || "Failed to execute code");
    }

    return data;
};
