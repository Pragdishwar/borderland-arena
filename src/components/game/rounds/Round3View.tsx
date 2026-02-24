import React, { useCallback, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Terminal, Play, Loader2 } from "lucide-react";
import ReverseEditor from "@/components/game/ReverseEditor";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TestResult = {
  input: string;
  expected: string;
  actual?: string;
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
};

const languageExtensions: Record<string, any> = {
  javascript: javascript(),
  python: python(),
  java: java(),
  cpp: cpp(),
};

const Round3View: React.FC<RoundViewProps> = ({
  currentQuestion,
  currentQ,
  totalQuestions,
  answer,
  setAnswer,
  submitAnswer,
  isSubmitting,
  selectedSuit,
}) => {
  const [languageId, setLanguageId] = useState<string>("63");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [testsPassed, setTestsPassed] = useState(0);
  const [testsTotal, setTestsTotal] = useState(0);

  const resetTestState = useCallback(() => {
    setTestResults(null);
    setTestsPassed(0);
    setTestsTotal(0);
    setIsRunning(false);
  }, []);

  const reverseMode = true;
  const editorRef = useRef<any>(null);

  if (!currentQuestion) return null;

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

  const getTestCases = (): { input: string; expected_output: string }[] => {
    try {
      const parsed = JSON.parse(currentQuestion.correct_answer);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  };

  const testCases = getTestCases();
  const hasTestCases = testCases.length > 0;

  useEffect(() => {
    // Clear the previous question's results when moving to a new question.
    resetTestState();
  }, [currentQ, currentQuestion?.id, resetTestState]);

  const runTests = async () => {
    if (!answer.trim() || isRunning) return;
    setIsRunning(true);
    setTestResults(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "piston-execute",
        {
          body: {
            // Round 3 compiles exactly what's in the editor. The editor itself reverses typing.
            source_code: answer,
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
        toast({
          title: "ALL TESTS PASSED",
          description: `${data.passed}/${data.total} test cases passed.`,
        });
      } else {
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
        title: "COMPILATION FAILED",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = () => {
    if (hasTestCases && testResults) {
      const proportionalScore =
        testsTotal > 0
          ? Math.round(currentQuestion.points * (testsPassed / testsTotal))
          : 0;
      const payload = JSON.stringify({
        testCasePipeline: true,
        passed: testsPassed,
        total: testsTotal,
        score: proportionalScore,
      });
      submitAnswer(payload);
    } else {
      submitAnswer(answer);
    }
  };

  const allTestsPassed =
    testResults && testsPassed === testsTotal && testsTotal > 0;

  return (
    <Card className="glass-card w-full animate-fade-in bg-[#1e1e1e] border-none shadow-2xl">
      <CardContent className="p-0 flex flex-col h-[700px]">
        <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="text-sm font-mono text-white/80">
                sandbox.
                {getEditorLanguage(languageId) === "javascript"
                  ? "js"
                  : getEditorLanguage(languageId) === "python"
                    ? "py"
                    : getEditorLanguage(languageId) === "java"
                      ? "java"
                      : "cpp"}
              </span>
            </div>
            <Select value={languageId} onValueChange={setLanguageId}>
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
          </div>
          <div className="flex items-center gap-3">
            {hasTestCases && (
              <span className="text-xs font-mono text-muted-foreground">
                {testCases.length} test{testCases.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className="text-xs font-mono text-muted-foreground">
              {selectedSuit?.name} - Challenge {currentQ + 1}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-[#333] bg-[#1e1e1e] p-6 overflow-y-auto">
            <h3 className="font-display text-lg text-primary mb-4">
              Challenge Specs
            </h3>
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-gray-300">{currentQuestion.question_text}</p>
              {currentQuestion.image_url && (
                <img
                  src={currentQuestion.image_url}
                  className="mt-4 rounded border border-[#444]"
                />
              )}
              <div className="mt-6 bg-[#2d2d2d] p-3 rounded text-xs font-mono text-green-400 border border-[#3e3e3e]">
                Points: {currentQuestion.points}
              </div>

              {testResults && (
                <div className="mt-4 space-y-2">
                  <div
                    className={`flex items-center gap-2 text-sm font-mono ${allTestsPassed ? "text-green-400" : "text-red-400"}`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {testsPassed}/{testsTotal} Tests Passed
                  </div>
                  {testResults.map((r, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded text-xs font-mono border ${r.passed ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span
                          className={
                            r.passed ? "text-green-400" : "text-red-400"
                          }
                        >
                          {r.passed ? "✓" : "✗"}
                        </span>
                        <span>Test {i + 1}</span>
                      </div>
                      {r.input && (
                        <p className="text-[10px] text-white/50">
                          Input: {r.input}
                        </p>
                      )}
                      <p className="text-[10px] text-white/50">
                        Expected: {r.expected}
                      </p>
                      <p className="text-[10px] text-white/50">
                        Got: {r.actual || "(empty)"}
                      </p>
                      {r.error && (
                        <p className="text-[10px] text-red-400 mt-1">
                          {r.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 bg-[#1e1e1e] flex flex-col relative w-full h-full min-h-[400px]">
            <ReverseEditor
              value={answer}
              onChange={setAnswer}
              reverseMode={true}
              extensions={
                languageExtensions[getEditorLanguage(languageId)]
                  ? [languageExtensions[getEditorLanguage(languageId)]]
                  : []
              }
            />
          </div>
        </div>

        <div className="bg-[#252526] border-t border-[#333] p-2 flex justify-between items-center gap-2">
          {hasTestCases ? (
            <>
              <Button
                onClick={runTests}
                disabled={!answer.trim() || isRunning}
                variant="ghost"
                className="text-green-400 hover:bg-green-500/10 font-mono text-xs h-8"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />{" "}
                    COMPILING...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-3 w-3" /> RUN TESTS
                  </>
                )}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!testResults || isSubmitting}
                className="bg-[#007acc] hover:bg-[#006bb3] text-white font-mono text-xs h-8"
              >
                <CheckCircle className="mr-2 h-3 w-3" /> SUBMIT ({testsPassed}/
                {testsTotal})
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!answer.trim() || isSubmitting}
              className="ml-auto bg-[#007acc] hover:bg-[#006bb3] text-white font-mono text-xs h-8"
            >
              <CheckCircle className="mr-2 h-3 w-3" /> COMPILE & SUBMIT
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Round3View;
