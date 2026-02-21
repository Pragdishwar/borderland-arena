import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Terminal } from "lucide-react";

type RoundViewProps = {
    currentQuestion: any;
    currentQ: number;
    totalQuestions: number;
    answer: string;
    setAnswer: (a: string) => void;
    submitAnswer: (a: string) => void;
    isSubmitting: boolean;
    selectedSuit: any;
};

const Round3View = ({ currentQuestion, currentQ, totalQuestions, answer, setAnswer, submitAnswer, isSubmitting, selectedSuit }: RoundViewProps) => {
    if (!currentQuestion) return null;

    return (
        <Card className="glass-card w-full animate-fade-in bg-[#1e1e1e] border-none shadow-2xl">
            <CardContent className="p-0 flex flex-col h-[600px]">
                {/* Editor Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-primary" />
                        <span className="text-sm font-mono text-white/80">sandbox.ts</span>
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

                    {/* Right Box: Code Editor (Simulated) */}
                    <div className="flex-1 bg-[#1e1e1e] flex flex-col relative">
                        <div className="absolute top-0 bottom-0 left-0 w-12 bg-[#1e1e1e] border-r border-[#333] flex flex-col items-end py-4 px-2 select-none">
                            {/* Line numbers */}
                            {Array.from({ length: 20 }).map((_, i) => (
                                <span key={i} className="text-[#6e7681] font-mono text-xs leading-6">{i + 1}</span>
                            ))}
                        </div>

                        <textarea
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            placeholder="// Write your solution here..."
                            className="flex-1 bg-transparent text-white font-mono text-sm leading-6 p-4 pl-4 ml-12 border-none resize-none focus:ring-0 focus:outline-none"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-[#007acc] p-2 flex justify-end items-center">
                    <Button
                        onClick={() => submitAnswer(answer)}
                        disabled={!answer.trim() || isSubmitting}
                        variant="ghost"
                        className="text-white hover:bg-white/10 font-mono text-xs h-8"
                    >
                        <CheckCircle className="mr-2 h-3 w-3" /> COMMIT CHANGES
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default Round3View;
