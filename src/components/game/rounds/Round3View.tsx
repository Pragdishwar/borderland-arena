import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Terminal } from "lucide-react";
import Editor from "@monaco-editor/react";
import { executeCode } from "@/lib/executeCode";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const Round3View = ({ currentQuestion, currentQ, totalQuestions, answer, setAnswer, submitAnswer, isSubmitting, selectedSuit }: RoundViewProps) => {
    const [languageId, setLanguageId] = useState<string>("63"); // Default to JS

    if (!currentQuestion) return null;

    const getEditorLanguage = (id: string) => {
        switch (id) {
            case "63": return "javascript";
            case "71": return "python";
            case "62": return "java";
            case "54": return "cpp";
            default: return "javascript";
        }
    };

    return (
        <Card className="glass-card w-full animate-fade-in bg-[#1e1e1e] border-none shadow-2xl">
            <CardContent className="p-0 flex flex-col h-[600px]">
                {/* Editor Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-primary" />
                            <span className="text-sm font-mono text-white/80">sandbox.{getEditorLanguage(languageId) === "javascript" ? "js" : getEditorLanguage(languageId) === "python" ? "py" : getEditorLanguage(languageId) === "java" ? "java" : "cpp"}</span>
                        </div>
                        <Select value={languageId} onValueChange={setLanguageId}>
                            <SelectTrigger className="w-[140px] h-7 bg-black/50 border-primary/30 text-xs font-mono text-primary outline-none focus:ring-1 focus:ring-primary shadow-none">
                                <SelectValue placeholder="Language" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e1e1e] border-[#333] text-white font-mono min-w-[140px]">
                                <SelectItem value="63" className="text-xs hover:bg-primary/20 hover:text-primary focus:bg-primary/20 focus:text-primary transition-colors cursor-pointer py-1.5 focus:outline-none">JavaScript</SelectItem>
                                <SelectItem value="71" className="text-xs hover:bg-primary/20 hover:text-primary focus:bg-primary/20 focus:text-primary transition-colors cursor-pointer py-1.5 focus:outline-none">Python</SelectItem>
                                <SelectItem value="62" className="text-xs hover:bg-primary/20 hover:text-primary focus:bg-primary/20 focus:text-primary transition-colors cursor-pointer py-1.5 focus:outline-none">Java</SelectItem>
                                <SelectItem value="54" className="text-xs hover:bg-primary/20 hover:text-primary focus:bg-primary/20 focus:text-primary transition-colors cursor-pointer py-1.5 focus:outline-none">C++</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                        {selectedSuit?.name} - Challenge {currentQ + 1}
                    </div>
                </div>

                {/* Layout: Split Question and Editor */}
                <div className="flex-1 flex flex-col md:flex-row">
                    {/* Left Box: Problem Description */}
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-[#333] bg-[#1e1e1e] p-6 overflow-y-auto">
                        <h3 className="font-display text-lg text-primary mb-4">Challenge Specs</h3>
                        <div className="prose prose-invert prose-sm max-w-none">
                            <p className="text-gray-300">{currentQuestion.question_text}</p>
                            {currentQuestion.image_url && (
                                <img src={currentQuestion.image_url} className="mt-4 rounded border border-[#444]" />
                            )}
                            <div className="mt-6 bg-[#2d2d2d] p-3 rounded text-xs font-mono text-green-400 border border-[#3e3e3e]">
                                Points: {currentQuestion.points}
                            </div>
                        </div>
                    </div>

                    {/* Right Box: Code Editor (Monaco) */}
                    <div className="flex-1 bg-[#1e1e1e] flex flex-col relative w-full h-full min-h-[400px]">
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            language={getEditorLanguage(languageId)}
                            theme="vs-dark"
                            value={answer}
                            onChange={(value) => setAnswer(value || "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "monospace",
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                            }}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-[#007acc] p-2 flex justify-end items-center">
                    <Button
                        onClick={async () => {
                            try {
                                const result = await executeCode(answer, parseInt(languageId, 10));
                                console.log("Piston Execution Result:", result);
                                toast({ title: "Compilation Attempted", description: "Piston execution logged to console." });
                            } catch (err: unknown) {
                                console.error(err);
                                const e = err as Error;
                                toast({ title: "Compilation Failed", description: e.message, variant: "destructive" });
                            }
                            submitAnswer(answer);
                        }}
                        disabled={!answer.trim() || isSubmitting}
                        variant="ghost"
                        className="text-white hover:bg-white/10 font-mono text-xs h-8"
                    >
                        <CheckCircle className="mr-2 h-3 w-3" /> COMPILE & SUBMIT
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default Round3View;
