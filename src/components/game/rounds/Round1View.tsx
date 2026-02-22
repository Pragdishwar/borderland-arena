import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
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

const Round1View = ({ currentQuestion, currentQ, totalQuestions, answer, setAnswer, submitAnswer, isSubmitting, selectedSuit }: RoundViewProps) => {
    const [timeLeft, setTimeLeft] = useState(10); // 10 seconds visual timer

    useEffect(() => {
        setTimeLeft(10);
    }, [currentQ]);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 0.1);
        }, 100);
        return () => clearInterval(timer);
    }, [timeLeft]);

    if (!currentQuestion) return null;

    return (
        <Card className="glass-card w-full animate-fade-in border-l-4 border-l-primary">
            <CardContent className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-4 border-b border-white/10 pb-4">
                    <div className={`p-3 rounded-full bg-primary/10 border border-primary/20 ${selectedSuit?.color}`}>
                        <span className="text-2xl">{selectedSuit?.symbol}</span>
                    </div>
                    <div>
                        <h3 className="font-display text-xl tracking-wider text-white">
                            {selectedSuit?.name.toUpperCase()}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                            <span>PROTOCOL: LEVEL_1</span>
                            <span>•</span>
                            <span>FRAGMENT: {currentQ + 1}/{totalQuestions}</span>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="flex flex-col items-end mr-4">
                            <div className="text-xs text-muted-foreground font-mono mb-1">TIME REMAINING</div>
                            <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-100 ease-linear ${timeLeft < 3 ? 'bg-destructive' : 'bg-primary'}`}
                                    style={{ width: `${Math.max(0, (timeLeft / 10) * 100)}%` }}
                                />
                            </div>
                        </div>
                        <span className="bg-primary/20 text-primary px-3 py-1 rounded text-sm font-bold border border-primary/30">
                            {currentQuestion.points} PTS
                        </span>
                    </div>
                </div>

                {/* Image */}
                {currentQuestion.image_url && (
                    <div className="relative group overflow-hidden rounded-lg border border-primary/20 bg-black/50">
                        <img
                            src={currentQuestion.image_url}
                            alt="Puzzle Artifact"
                            className="w-full max-h-64 object-contain transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors duration-300 pointer-events-none" />
                    </div>
                )}

                {/* Question Text */}
                <div className="bg-black/40 p-5 rounded-lg border-l-2 border-primary/50">
                    <p className="font-body text-lg text-foreground leading-relaxed">
                        {currentQuestion.question_text}
                    </p>
                </div>

                {/* Interactions */}
                <div className="space-y-4 pt-2">
                    {currentQuestion.options && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {currentQuestion.options.map((opt: string, i: number) => (
                                <Button key={i} variant={answer === opt ? "default" : "outline"}
                                    onClick={() => setAnswer(opt)}
                                    className={`justify-start text-left font-body h-auto py-4 px-5 text-sm md:text-base whitespace-normal
                     ${answer === opt ? "bg-primary text-black font-bold shadow-[0_0_15px_rgba(var(--primary),0.4)]" : "border-primary/20 hover:bg-primary/10 text-muted-foreground hover:text-foreground"}
                   `}
                                >
                                    <span className="mr-3 opacity-50 font-mono">0{i + 1}</span>
                                    {opt}
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-primary/50 font-mono">{">"}</span>
                            <Input
                                placeholder="Input logic sequence..."
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                className="bg-black/60 border-primary/30 font-mono text-lg h-12 pl-10 focus-visible:ring-primary/50 focus-visible:border-primary"
                                onKeyDown={e => e.key === "Enter" && submitAnswer(answer)}
                            />
                        </div>
                    )}

                    <Button
                        onClick={() => submitAnswer(answer)}
                        disabled={!answer.trim() || isSubmitting}
                        className="w-full font-display tracking-widest bg-primary hover:bg-primary/80 text-black h-14 text-lg mt-4 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all"
                    >
                        <CheckCircle className="mr-2 h-5 w-5" /> VERIFY SOLUTION
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default Round1View;
