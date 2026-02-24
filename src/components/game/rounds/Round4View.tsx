import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Figma, Terminal as TerminalIcon, Play, Loader2 } from "lucide-react";
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { githubDark } from '@uiw/codemirror-theme-github';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type TestResult = {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    error: string | null;
};

type QuestionType = {
    id?: string;
    question_text: string;
    question_type: string;
    options: string[] | null;
    correct_answer: string;
    points: number;
    image_url?: string | null;
    question_number: number;
};

type RoundViewProps = {
    currentQuestion: QuestionType | null;
    currentQ: number;
    totalQuestions: number;
    answer: string;
    setAnswer: (a: string) => void;
    submitAnswer: (a: string) => void;
    isSubmitting: boolean;
    selectedSuit: { name: string; symbol: string; color?: string } | null;
    isRound4?: boolean;
};

const Round4View = ({ currentQuestion, currentQ, totalQuestions, answer, setAnswer, submitAnswer, isSubmitting, isRound4 }: RoundViewProps) => {
    const editorRef = useRef<any>(null);

    // Retrieve original failing code setup in the Admin dashboard via options array
    const originalFailingCode = (currentQuestion?.options && currentQuestion.options.length > 0) ? currentQuestion.options[0] : "// No initial code provided.";

    // ALL hooks MUST be called before any conditional returns (React rules of hooks)
    const [localCode, setLocalCode] = useState<string>(answer && answer.trim().length > 0 ? answer : originalFailingCode);
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<TestResult[] | null>(null);
    const [testsPassed, setTestsPassed] = useState(0);
    const [testsTotal, setTestsTotal] = useState(0);

    if (!currentQuestion) return null;

    // Distinguish between Terminal Task (Bug Hunt) vs Design Task (Figma) vs Code Autopsy
    const isDesignTask = currentQuestion.question_text.toLowerCase().includes("design") || currentQuestion.question_text.toLowerCase().includes("figma");
    const isCodeAutopsy = currentQuestion.question_text.toLowerCase().includes("autopsy") || isRound4; // Default to Autopsy for Round 4

    // Parse test cases from correct_answer JSON
    const getTestCases = (): { input: string; expected_output: string }[] => {
        try {
            const parsed = JSON.parse(currentQuestion.correct_answer);
            if (Array.isArray(parsed)) return parsed;
        } catch { }
        return [];
    };

    const testCases = getTestCases();
    const hasTestCases = testCases.length > 0;

    const runTests = async () => {
        if (isRunning) return;

        // Use localCode (what the user is editing) as the source for tests
        let codeToTest = localCode;

        if (!codeToTest?.trim()) return;

        setIsRunning(true);
        setTestResults(null);

        try {
            const { data, error } = await supabase.functions.invoke('piston-execute', {
                body: {
                    source_code: codeToTest,
                    language_id: 63, // Default to JavaScript for Round 4
                    test_cases: testCases,
                }
            });

            if (error) throw error;

            setTestResults(data.results || []);
            setTestsPassed(data.passed || 0);
            setTestsTotal(data.total || 0);

            if (data.passed === data.total) {
                toast({ title: "ALL TESTS PASSED", description: `${data.passed}/${data.total} test cases passed.` });
            } else {
                toast({ title: "SOME TESTS FAILED", description: `${data.passed}/${data.total} test cases passed.`, variant: "destructive" });
            }
        } catch (err: unknown) {
            console.error(err);
            const e = err as Error;
            toast({ title: "CRITICAL FAULT", description: e.message, variant: "destructive" });
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = () => {
        if (isCodeAutopsy && !isDesignTask && hasTestCases) {
            // Calculate lines changed for surgical scoring using a simple line-by-line diff
            const originalLines = originalFailingCode.split('\n');
            const modifiedLines = (answer || originalFailingCode).split('\n');
            let linesChanged = 0;
            const maxLen = Math.max(originalLines.length, modifiedLines.length);
            for (let i = 0; i < maxLen; i++) {
                const o = originalLines[i] || "";
                const m = modifiedLines[i] || "";
                if (o !== m) linesChanged += 1;
            }

            // Surgical scoring: 1000 base - 50 per line changed, proportional to tests passed
            const baseScore = 1000;
            const penaltyPerLine = 50;
            const surgicalScore = Math.max(0, baseScore - (linesChanged * penaltyPerLine));
            const proportionalScore = testsTotal > 0 ? Math.round(surgicalScore * (testsPassed / testsTotal)) : 0;

            const payload = JSON.stringify({
                testCasePipeline: true,
                isAutopsyPipeline: true,
                passed: testsPassed,
                total: testsTotal,
                score: proportionalScore,
                success: testsPassed === testsTotal && testsTotal > 0,
            });
            submitAnswer(payload);
        } else if (isDesignTask) {
            submitAnswer(answer);
        } else {
            submitAnswer(answer);
        }
    };

    return (
        <Card className="glass-card w-full animate-fade-in bg-black border border-primary">
            <CardContent className="p-6 space-y-6">

                {/* Terminal Header */}
                <div className="flex items-center gap-2 font-mono text-sm text-primary mb-4 pb-2 border-b border-primary/20">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-4 opacity-50">root@borderland-arena:~</span>
                </div>

                <div className="font-mono text-green-500 text-sm mb-4">
                    <p className="typing-effect">
                        $ init_sequence <br />
                        $ loading_module: {isDesignTask ? "CREATIVE_OVERRIDE" : "SYSTEM_DEBUG"}... OK
                    </p>
                </div>

                <div className="bg-black border border-primary/30 p-6 rounded relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-20">
                        {isDesignTask ? <Figma className="w-24 h-24" /> : <TerminalIcon className="w-24 h-24" />}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 relative z-10">MISSION DIRECTIVE</h3>
                    <p className="text-white/80 font-mono relative z-10 mb-6">{currentQuestion.question_text}</p>

                    {currentQuestion.image_url && (
                        <div className="mb-6 relative z-10">
                            <img src={currentQuestion.image_url} className="max-h-60 border border-primary/50" />
                        </div>
                    )}

                    {isCodeAutopsy && !isDesignTask ? (
                        <div className="relative z-10 h-[400px] border border-primary/30 rounded overflow-hidden">
                            <div className="h-full w-full flex">
                                <div className="w-1/2 h-full border-r border-primary/20">
                                    <CodeMirror
                                        value={originalFailingCode}
                                        extensions={[javascript()]}
                                        theme={githubDark}
                                        basicSetup={{ lineNumbers: true, foldGutter: false }}
                                        editable={false}
                                        className="h-full"
                                    />
                                </div>
                                <div className="w-1/2 h-full">
                                    <CodeMirror
                                        ref={editorRef}
                                        value={localCode}
                                        extensions={[javascript()]}
                                        theme={githubDark}
                                        basicSetup={{ lineNumbers: true }}
                                        onChange={(v) => { setLocalCode(v || ""); setAnswer(v || ""); }}
                                        className="h-full"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : isDesignTask ? (
                        <div className="space-y-4 relative z-10">
                            <div className="border-2 border-dashed border-primary/40 rounded-xl p-8 text-center hover:bg-primary/5 transition-colors cursor-pointer group">
                                <Figma className="w-10 h-10 mx-auto text-primary mb-3 group-hover:scale-110 transition-transform" />
                                <h4 className="font-display text-white">UPLOAD DESIGN LINK</h4>
                                <p className="text-xs text-muted-foreground mt-1">Paste your Figma/Image URL below</p>
                            </div>
                            <Input
                                placeholder="https://figma.com/..."
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                className="bg-black border-primary text-primary font-mono"
                            />
                        </div>
                    ) : (
                        <div className="relative z-10">
                            <p className="text-xs text-primary/70 mb-2">DEBUG_CONSOLE</p>
                            <Input
                                placeholder="Enter bug ID or fix..."
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                className="bg-black/80 border-primary text-green-500 font-mono"
                                onKeyDown={e => e.key === "Enter" && !hasTestCases && submitAnswer(answer)}
                            />
                        </div>
                    )}

                    {/* Test Results Panel */}
                    {testResults && (
                        <div className="relative z-10 mt-4 space-y-2 border-t border-primary/20 pt-4">
                            <div className={`flex items-center gap-2 text-sm font-mono ${testsPassed === testsTotal ? 'text-green-400' : 'text-red-400'}`}>
                                <CheckCircle className="w-4 h-4" />
                                {testsPassed}/{testsTotal} Tests Passed
                            </div>
                            {testResults.map((r, i) => (
                                <div key={i} className={`p-2 rounded text-xs font-mono border ${r.passed ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                                    <div className="flex items-center gap-1 mb-1">
                                        <span className={r.passed ? 'text-green-400' : 'text-red-400'}>{r.passed ? '✓' : '✗'}</span>
                                        <span>Test {i + 1}</span>
                                    </div>
                                    {r.input && <p className="text-[10px] text-white/50">Input: {r.input}</p>}
                                    <p className="text-[10px] text-white/50">Expected: {r.expected}</p>
                                    <p className="text-[10px] text-white/50">Got: {r.actual || '(empty)'}</p>
                                    {r.error && <p className="text-[10px] text-red-400 mt-1">{r.error}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {isCodeAutopsy && !isDesignTask && hasTestCases ? (
                    <div className="flex gap-3">
                        <Button
                            onClick={runTests}
                            disabled={isRunning}
                            className="flex-1 font-mono font-bold bg-green-700 hover:bg-green-600 text-white h-12 uppercase tracking-widest"
                        >
                            {isRunning ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> COMPILING PATCH...</>
                            ) : (
                                <><Play className="mr-2 h-4 w-4" /> RUN TESTS</>
                            )}
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!testResults || isSubmitting}
                            className="flex-1 font-mono font-bold bg-primary hover:bg-primary/80 text-black h-12 uppercase tracking-widest"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" /> DEPLOY FIX ({testsPassed}/{testsTotal})
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={(!answer.trim() && !isCodeAutopsy) || isSubmitting}
                        className="w-full font-mono font-bold bg-primary hover:bg-primary/80 text-black h-12 uppercase tracking-widest"
                    >
                        {isDesignTask ? "TRANSMIT DESIGN" : isCodeAutopsy ? "COMPILE & DEPLOY FIX" : "DEPLOY FIX"}
                    </Button>
                )}

            </CardContent>
        </Card>
    );
};

export default Round4View;
