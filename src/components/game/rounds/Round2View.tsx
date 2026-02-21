import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Assuming Textarea exists or using basic HTML
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Code } from "lucide-react";

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

const Round2View = ({ currentQuestion, currentQ, totalQuestions, answer, setAnswer, submitAnswer, isSubmitting, selectedSuit }: RoundViewProps) => {
    if (!currentQuestion) return null;

    return (
        <Card className="glass-card w-full animate-fade-in border-t-2 border-primary/50">
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4 mb-4 border-b border-dashed border-white/10 pb-4">
                    <div className={`p-3 rounded-md bg-secondary border border-secondary/50`}>
                        <Code className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-display text-xl tracking-wider text-white">
                            REVERSE_ENGINEERING.MOD
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono">
                            DECRYPTING: {selectedSuit?.name}
                        </p>
                    </div>
                    <div className="ml-auto font-mono text-primary text-xl font-bold">
                        {currentQuestion.points} <span className="text-xs font-normal opacity-70">PTS</span>
                    </div>
                </div>

                {currentQuestion.image_url && (
                    <img src={currentQuestion.image_url} alt="Snippet" className="w-full rounded border border-white/10 opacity-90" />
                )}

                <div className="bg-gradient-to-r from-black/60 to-black/40 p-5 rounded-sm border-l-4 border-primary font-mono text-sm leading-6 text-green-400">
                    {/* Simulate code view */}
                    <p className="whitespace-pre-wrap">{currentQuestion.question_text}</p>
                </div>

                <div className="space-y-2">
                    <h4 className="font-display text-sm text-muted-foreground">DECRYPTED_OUTPUT</h4>
                    <textarea
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="// Write the reverse engineered logic here..."
                        className="w-full h-32 bg-black/80 border border-primary/20 rounded p-4 font-mono text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors resize-none"
                        onKeyDown={e => e.key === "Enter" && e.ctrlKey && submitAnswer(answer)}
                    />
                    <p className="text-xs text-muted-foreground text-right">CTRL + ENTER to submit</p>
                </div>

                <Button
                    onClick={() => submitAnswer(answer)}
                    disabled={!answer.trim() || isSubmitting}
                    className="w-full font-display tracking-widest bg-primary hover:bg-primary/80 text-black h-12"
                >
                    <CheckCircle className="mr-2 h-4 w-4" /> COMPILE & SUBMIT
                </Button>
            </CardContent>
        </Card>
    );
};

export default Round2View;
