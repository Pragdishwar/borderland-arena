import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Figma, Terminal as TerminalIcon } from "lucide-react";

type RoundViewProps = {
    currentQuestion: any;
    currentQ: number;
    totalQuestions: number;
    answer: string;
    setAnswer: (a: string) => void;
    submitAnswer: (a: string) => void;
    isSubmitting: boolean;
    selectedSuit: any;
    isRound4?: boolean;
};

const Round4View = ({ currentQuestion, currentQ, totalQuestions, answer, setAnswer, submitAnswer, isSubmitting, isRound4 }: RoundViewProps) => {
    if (!currentQuestion) return null;

    // Distinguish between Terminal Task (Bug Hunt) vs Design Task (Figma)
    // Assuming checking 'suit' or question type. For now, if "design" in text, we show Figma view.
    const isDesignTask = currentQuestion.question_text.toLowerCase().includes("design") || currentQuestion.question_text.toLowerCase().includes("figma");

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

                    {isDesignTask ? (
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
                                onKeyDown={e => e.key === "Enter" && submitAnswer(answer)}
                            />
                        </div>
                    )}
                </div>

                <Button
                    onClick={() => submitAnswer(answer)}
                    disabled={!answer.trim() || isSubmitting}
                    className="w-full font-mono font-bold bg-primary hover:bg-primary/80 text-black h-12 uppercase tracking-widest"
                >
                    {isDesignTask ? "TRANSMIT DESIGN" : "DEPLOY FIX"}
                </Button>

            </CardContent>
        </Card>
    );
};

export default Round4View;
