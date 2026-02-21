import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Check, Image, X } from "lucide-react";

const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const SUIT_LABELS: Record<string, string> = { spades: "♠ Spades", hearts: "♥ Hearts", diamonds: "♦ Diamonds", clubs: "♣ Clubs" };
const QUESTION_SLOTS = [1, 2, 3, 4, 5];

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  points: number;
  suit: string;
  round_number: number;
  image_url: string | null;
  question_number: number;
};

type Props = { gameId?: string };

const QuestionManager = ({ gameId }: Props) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeRound, setActiveRound] = useState(1);
  const [activeSuit, setActiveSuit] = useState("spades");
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ question_text: "", correct_answer: "", points: 10, question_type: "text", options: ["", "", "", ""] as string[], image_url: "" as string });
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const fetchQuestions = async () => {
    const { data } = await supabase.from("questions").select("*").eq("round_number", activeRound).eq("suit", activeSuit).order("question_number");
    if (data) setQuestions(data as Question[]);
  };

  useEffect(() => { fetchQuestions(); }, [activeRound, activeSuit]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `r${activeRound}/${activeSuit}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("question-images").upload(path, file);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("question-images").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: publicUrl }));
    setUploading(false);
  };

  const isRound4 = activeRound === 4;

  const getQuestionForSlot = (slot: number) => questions.find(q => q.question_number === slot);

  const saveQuestion = async () => {
    if (editingSlot === null) return;

    if (!isRound4) {
      const opts = form.options.filter(o => o.trim());
      if (opts.length !== 4) {
        toast({ title: "4 options required", description: "Please fill all four options.", variant: "destructive" });
        return;
      }
      if (!opts.includes(form.correct_answer.trim())) {
        toast({ title: "Correct answer must match one option", variant: "destructive" });
        return;
      }
    }

    const opts = isRound4 ? [] : form.options.filter(o => o.trim());
    const payload = {
      question_text: form.question_type === "image" ? (form.question_text || "Image Question") : form.question_text,
      correct_answer: form.correct_answer,
      points: form.points,
      question_type: form.question_type,
      options: opts.length > 0 ? opts : null,
      round_number: activeRound,
      suit: activeSuit,
      image_url: form.question_type === "image" ? (form.image_url || null) : null,
      question_number: editingSlot,
    };

    if (editingId) {
      const { error } = await supabase.from("questions").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Failed to update", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: `Question ${editingSlot} updated` });
    } else {
      const { error } = await supabase.from("questions").insert(payload);
      if (error) {
        toast({ title: "Failed to add", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: `Question ${editingSlot} added` });
    }
    resetForm();
    fetchQuestions();
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("questions").delete().eq("id", id);
    toast({ title: "Question deleted" });
    resetForm();
    fetchQuestions();
  };

  const startEditSlot = (slot: number) => {
    const existing = getQuestionForSlot(slot);
    setEditingSlot(slot);
    if (existing) {
      setEditingId(existing.id);
      const opts = Array.isArray(existing.options) ? (existing.options as string[]) : ["", "", "", ""];
      setForm({
        question_text: existing.question_text,
        correct_answer: existing.correct_answer,
        points: existing.points,
        question_type: existing.question_type,
        options: [opts[0] || "", opts[1] || "", opts[2] || "", opts[3] || ""],
        image_url: existing.image_url || "",
      });
    } else {
      setEditingId(null);
      setForm({ question_text: "", correct_answer: "", points: isRound4 ? 20 : 10, question_type: "text", options: ["", "", "", ""], image_url: "" });
    }
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  const resetForm = () => {
    setEditingSlot(null);
    setEditingId(null);
    setForm({ question_text: "", correct_answer: "", points: isRound4 ? 20 : 10, question_type: "text", options: ["", "", "", ""], image_url: "" });
  };

  const filledCount = questions.length;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display text-lg text-primary tracking-wider">QUESTION MANAGER</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Round tabs */}
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4].map(r => (
            <Button key={r} size="sm" variant={activeRound === r ? "default" : "outline"}
              onClick={() => { setActiveRound(r); resetForm(); }}
              className={activeRound === r ? "bg-primary" : "border-primary/20"}>
              Round {r}
            </Button>
          ))}
        </div>
        {/* Suit tabs */}
        <div className="flex gap-2 flex-wrap">
          {SUITS.map(s => (
            <Button key={s} size="sm" variant={activeSuit === s ? "default" : "outline"}
              onClick={() => { setActiveSuit(s); resetForm(); }}
              className={activeSuit === s ? "bg-primary" : "border-primary/20"}>
              {SUIT_LABELS[s]}
            </Button>
          ))}
        </div>

        {/* Progress */}
        <p className="text-xs text-muted-foreground font-body">{filledCount}/5 questions filled for Round {activeRound} · {SUIT_LABELS[activeSuit]}</p>

        {/* 5 Question Slots */}
        <div className="space-y-2">
          {QUESTION_SLOTS.map(slot => {
            const q = getQuestionForSlot(slot);
            const isActive = editingSlot === slot;
            return (
              <div key={slot} className={`flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors ${isActive ? "bg-primary/10 border border-primary/40" : q ? "bg-secondary/50 hover:bg-secondary/70" : "bg-secondary/20 border border-dashed border-primary/10 hover:border-primary/30"}`}
                onClick={() => !isActive && startEditSlot(slot)}>
                <span className={`font-display text-xs mt-1 ${q ? "text-primary" : "text-muted-foreground"}`}>Q{slot}</span>
                {q ? (
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-foreground truncate">{q.question_text}</p>
                    <p className="text-xs text-muted-foreground">Answer: {q.correct_answer} | {q.points}pts | {q.question_type}</p>
                    {q.image_url && <img src={q.image_url} alt="" className="h-10 mt-1 rounded" />}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic flex-1">Empty — click to add</p>
                )}
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" onClick={() => startEditSlot(slot)}><Pencil className="h-3 w-3" /></Button>
                  {q && <Button size="icon" variant="ghost" onClick={() => deleteQuestion(q.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit form - shown when a slot is selected */}
        {editingSlot !== null && (
          <div ref={formRef} className="space-y-3 border-t border-border pt-4">
            <p className="font-display text-sm text-primary">{editingId ? `EDIT QUESTION ${editingSlot}` : `ADD QUESTION ${editingSlot}`}</p>

            {/* Question type selector */}
            <div className="grid grid-cols-2 gap-3">
              <select value={form.question_type} onChange={e => setForm(f => ({ ...f, question_type: e.target.value }))}
                className="bg-secondary border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground">
                <option value="text">Text Question</option>
                <option value="image">Image Question</option>
              </select>
              <Input type="number" placeholder="Points" value={form.points} onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))}
                className="bg-secondary border-primary/20" />
            </div>

            {/* Text question input */}
            {form.question_type === "text" && (
              <Textarea placeholder="Question text..." value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                className="bg-secondary border-primary/20" />
            )}

            {/* Image question upload */}
            {form.question_type === "image" && (
              <div className="space-y-2">
                <Input placeholder="Optional caption..." value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                  className="bg-secondary border-primary/20" />
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md bg-secondary border border-primary/20 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Image className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Image"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  </label>
                  {form.image_url && (
                    <div className="flex items-center gap-2">
                      <img src={form.image_url} alt="" className="h-10 rounded" />
                      <Button size="icon" variant="ghost" onClick={() => setForm(f => ({ ...f, image_url: "" }))}><X className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Options - only for rounds 1-3 */}
            {!isRound4 && (
              <>
                <p className="text-xs text-muted-foreground font-body">4 Options (one must be the correct answer)</p>
                <div className="grid grid-cols-1 gap-2">
                  {[0, 1, 2, 3].map(i => (
                    <Input key={i} placeholder={`Option ${i + 1}`} value={form.options[i]}
                      onChange={e => {
                        const newOpts = [...form.options];
                        newOpts[i] = e.target.value;
                        setForm(f => ({ ...f, options: newOpts }));
                      }}
                      className="bg-secondary border-primary/20" />
                  ))}
                </div>
              </>
            )}

            {isRound4 && (
              <p className="text-xs text-primary font-body">⚡ Round 4: Hard mode — players must type the exact answer (no multiple choice)</p>
            )}

            <Input placeholder={isRound4 ? "Correct answer" : "Correct answer (must match one option)"} value={form.correct_answer} onChange={e => setForm(f => ({ ...f, correct_answer: e.target.value }))}
              className="bg-secondary border-primary/20" />

            <div className="flex gap-2">
              <Button onClick={saveQuestion} disabled={form.question_type === "text" ? !form.question_text || !form.correct_answer : !form.image_url || !form.correct_answer} className="bg-primary hover:bg-primary/80 font-display">
                <Check className="mr-2 h-4 w-4" /> {editingId ? "UPDATE" : "SAVE"}
              </Button>
              <Button variant="outline" onClick={resetForm} className="border-primary/20">Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuestionManager;
