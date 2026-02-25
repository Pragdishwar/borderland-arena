import { useRef, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  Terminal as TerminalIcon,
  Play,
  Loader2,
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { githubDark } from "@uiw/codemirror-theme-github";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAudio } from "@/hooks/use-audio";

const languageExtensions: Record<string, any> = {
  javascript: javascript(),
  python: python(),
  java: java(),
  cpp: cpp(),
};

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

// Auto-detect language from question text
const detectLanguage = (text: string): string => {
  const lower = text.toLowerCase();
  if (lower.includes("python")) return "71";
  if (lower.includes("java") && !lower.includes("javascript")) return "62";
  if (lower.includes("c++") || lower.includes("cpp")) return "54";
  return "63"; // Default to JavaScript
};

const getEditorLanguage = (id: string) => {
  switch (id) {
    case "63":
      return "javascript";
    case "71":
      return "python";
    case "62":
      return "java";
    case "54":
      return "cpp";
    default:
      return "javascript";
  }
};

const Round4View = ({
  currentQuestion,
  currentQ,
  totalQuestions,
  answer,
  setAnswer,
  submitAnswer,
  isSubmitting,
  isRound4,
}: RoundViewProps) => {
  const editorRef = useRef<any>(null);

  // Retrieve original failing code setup in the Admin dashboard via options array
  const originalFailingCode =
    currentQuestion?.options && currentQuestion.options.length > 0
      ? currentQuestion.options[0]
      : "// No initial code provided.";

  // ALL hooks MUST be called before any conditional returns (React rules of hooks)
  const [languageId, setLanguageId] = useState<string>(() =>
    detectLanguage(currentQuestion?.question_text || ""),
  );
  const [localCode, setLocalCode] = useState<string>(
    answer && answer.trim().length > 0 ? answer : originalFailingCode,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [testsPassed, setTestsPassed] = useState(0);
  const [testsTotal, setTestsTotal] = useState(0);
  const { play } = useAudio();

  const resetTestState = () => {
    setTestResults(null);
    setTestsPassed(0);
    setTestsTotal(0);
    setIsRunning(false);
  };

  // Reset editor state when the question changes
  useEffect(() => {
    const newCode =
      currentQuestion?.options && currentQuestion.options.length > 0
        ? currentQuestion.options[0]
        : "// No initial code provided.";
    setLocalCode(newCode);
    setAnswer(newCode);
    setLanguageId(detectLanguage(currentQuestion?.question_text || ""));
    resetTestState();
  }, [currentQuestion?.id]);

  if (!currentQuestion) return null;

  // Round 4 is always the debugging (code autopsy) game.
  const isCodeAutopsy = true;

  // Parse test cases from correct_answer JSON (supports hidden flag)
  const getTestCases = (): { input: string; expected_output: string; hidden?: boolean }[] => {
    try {
      const parsed = JSON.parse(currentQuestion.correct_answer);
      if (Array.isArray(parsed)) return parsed;
    } catch { }
    return [];
  };

  const testCases = getTestCases();
  const hasTestCases = testCases.length > 0;
  const visibleTestCases = testCases.filter(tc => !tc.hidden);
  const hiddenCount = testCases.length - visibleTestCases.length;

  const maxPoints = currentQuestion?.points || 0;

  const linesChanged = useMemo(() => {
    const originalLines = originalFailingCode.split("\n");
    const modifiedLines = (localCode || "").split("\n");
    const maxLen = Math.max(originalLines.length, modifiedLines.length);
    let changed = 0;
    for (let i = 0; i < maxLen; i++) {
      const o = originalLines[i] || "";
      const m = modifiedLines[i] || "";
      if (o !== m) changed += 1;
    }
    return changed;
  }, [originalFailingCode, localCode]);

  const runTests = async () => {
    if (isRunning) return;

    if (!hasTestCases) {
      toast({
        title: "NO TESTS CONFIGURED",
        description: "This debugging question is missing test cases.",
        variant: "destructive",
      });
      return;
    }

    // Use localCode (what the user is editing) as the source for tests
    let codeToTest = localCode;

    if (!codeToTest?.trim()) return;

    setIsRunning(true);
    setTestResults(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "piston-execute",
        {
          body: {
            source_code: codeToTest,
            language_id: parseInt(languageId, 10),
            test_cases: testCases,
          },
        },
      );

      if (error) throw error;

      setTestResults(data.results || []);
      setTestsPassed(data.passed || 0);
      setTestsTotal(data.total || 0);

      if (data.passed === data.total) {
        play('success');
        toast({
          title: "ALL TESTS PASSED",
          description: `${data.passed}/${data.total} test cases passed.`,
        });
      } else {
        play('error');
        toast({
          title: "SOME TESTS FAILED",
          description: `${data.passed}/${data.total} test cases passed.`,
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      console.error(err);
      const e = err as Error;
      toast({
        title: "CRITICAL FAULT",
        description: e.message,
        variant: "destructive",
      });
      play('error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = () => {
    if (!hasTestCases) {
      toast({
        title: "NO TESTS CONFIGURED",
        description: "This debugging question is missing test cases.",
        variant: "destructive",
      });
      return;
    }

    if (!testResults || testsTotal <= 0) {
      toast({
        title: "RUN TESTS FIRST",
        description: "Compile your patch and run the test suite before deploying.",
        variant: "destructive",
      });
      return;
    }

    // Score is capped to this question's points.
    // - Primary factor: tests passed ratio
    // - Secondary factor: fewer line changes is better (surgical edits)
    const passRatio = testsTotal > 0 ? testsPassed / testsTotal : 0;
    const editFactor = 1 / (1 + linesChanged * 0.15);
    const score = Math.max(0, Math.min(maxPoints, Math.round(maxPoints * passRatio * editFactor)));

    const payload = JSON.stringify({
      testCasePipeline: true,
      isAutopsyPipeline: true,
      passed: testsPassed,
      total: testsTotal,
      linesChanged,
      score,
      success: testsPassed === testsTotal && testsTotal > 0,
    });
    submitAnswer(payload);
  };

  return (
    <Card className="glass-card w-full animate-fade-in bg-black border border-primary">
      <CardContent className="p-6 space-y-6">
        {/* Terminal Header */}
        <div className="flex items-center justify-between font-mono text-sm text-primary mb-4 pb-2 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-4 opacity-50">root@borderland-arena:~</span>
          </div>
          {isCodeAutopsy && (
            <Select
              value={languageId}
              onValueChange={(v) => {
                setLanguageId(v);
                resetTestState();
              }}
            >
              <SelectTrigger className="w-[140px] h-7 bg-black/50 border-primary/30 text-xs font-mono text-primary outline-none focus:ring-1 focus:ring-primary shadow-none">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e1e] border-[#333] text-white font-mono min-w-[140px]">
                <SelectItem value="63">JavaScript</SelectItem>
                <SelectItem value="71">Python</SelectItem>
                <SelectItem value="62">Java</SelectItem>
                <SelectItem value="54">C++</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="font-mono text-green-500 text-sm mb-4">
          <p className="typing-effect">
            $ init_sequence <br />$ loading_module:{" "}
            SYSTEM_DEBUG... OK
          </p>
        </div>

        <div className="bg-black border border-primary/30 p-6 rounded relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-20">
            <TerminalIcon className="w-24 h-24" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2 relative z-10">
            MISSION DIRECTIVE
          </h3>
          <p className="text-white/80 font-mono relative z-10 mb-6">
            {currentQuestion.question_text}
          </p>

          {currentQuestion.image_url && (
            <div className="mb-6 relative z-10">
              <img
                src={currentQuestion.image_url}
                className="max-h-60 border border-primary/50"
              />
            </div>
          )}

          <div className="relative z-10 h-[400px] border border-primary/30 rounded overflow-hidden">
            <div className="h-full w-full flex">
              <div className="w-1/2 h-full border-r border-primary/20">
                <CodeMirror
                  value={originalFailingCode}
                  extensions={
                    languageExtensions[getEditorLanguage(languageId)]
                      ? [languageExtensions[getEditorLanguage(languageId)]]
                      : []
                  }
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
                  extensions={
                    languageExtensions[getEditorLanguage(languageId)]
                      ? [languageExtensions[getEditorLanguage(languageId)]]
                      : []
                  }
                  theme={githubDark}
                  basicSetup={{ lineNumbers: true }}
                  onChange={(v) => {
                    const next = v || "";
                    setLocalCode(next);
                    setAnswer(next);
                    // Any edit invalidates previous test results.
                    if (testResults) resetTestState();
                  }}
                  className="h-full"
                />
              </div>
            </div>
          </div>

          {/* Test Results Panel */}
          {testResults && (
            <div className="relative z-10 mt-4 space-y-2 border-t border-primary/20 pt-4">
              {(() => {
                const visibleResults = testResults.filter((_, i) => !testCases[i]?.hidden);
                const visiblePassed = visibleResults.filter(r => r.passed).length;
                const visibleTotal = visibleResults.length;
                return (
                  <div>
                    <div className={`flex items-center gap-2 text-sm font-mono ${visiblePassed === visibleTotal && visibleTotal > 0 ? "text-green-400" : "text-red-400"}`}>
                      <CheckCircle className="w-4 h-4" />
                      {visiblePassed}/{visibleTotal} Visible Tests Passed{hiddenCount > 0 ? ` (+${hiddenCount} hidden)` : ''}
                    </div>
                    {visibleResults.map(r => {
                      const origIndex = testResults.indexOf(r);
                      return (
                        <div key={origIndex} className={`p-2 rounded text-xs font-mono border ${r.passed ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
                          <div className="flex items-center gap-1 mb-1">
                            <span className={r.passed ? "text-green-400" : "text-red-400"}>{r.passed ? "✓" : "✗"}</span>
                            <span>Test {origIndex + 1}</span>
                          </div>
                          {r.input && <p className="text-[10px] text-white/50">Input: {r.input}</p>}
                          <p className="text-[10px] text-white/50">Expected: {r.expected}</p>
                          <p className="text-[10px] text-white/50">Got: {r.actual || "(empty)"}</p>
                          {r.error && <p className="text-[10px] text-red-400 mt-1">{r.error}</p>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {isCodeAutopsy && hasTestCases ? (
          <div className="flex gap-3">
            <Button
              onClick={runTests}
              disabled={isRunning}
              className="flex-1 font-mono font-bold bg-green-700 hover:bg-green-600 text-white h-12 uppercase tracking-widest"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> COMPILING
                  PATCH...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" /> RUN TESTS
                </>
              )}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!testResults || isSubmitting}
              className="flex-1 font-mono font-bold bg-primary hover:bg-primary/80 text-black h-12 uppercase tracking-widest"
            >
              <CheckCircle className="mr-2 h-4 w-4" /> DEPLOY FIX ({testsPassed}
              /{testsTotal})
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasTestCases}
            className="w-full font-mono font-bold bg-primary hover:bg-primary/80 text-black h-12 uppercase tracking-widest"
          >
            COMPILE & DEPLOY FIX
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default Round4View;
