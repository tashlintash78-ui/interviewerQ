import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  ChevronRight, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Settings2,
  BrainCircuit,
  Quote,
  FileText,
  Upload,
  Sparkles,
  UserCheck,
  Shirt
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';

import { Avatar } from '@/components/Avatar';
import { useVoice } from '@/hooks/useVoice';
import { geminiService, Feedback, SessionSummary, CVFeedback } from '@/lib/gemini';
import { INTERVIEW_TYPES, ROLES, DIFFICULTIES, QUESTION_BANK } from '@/constants';

type AppState = 'landing' | 'setup' | 'interview' | 'summary';

export default function App() {
  const [state, setState] = useState<AppState>('landing');
  const [config, setConfig] = useState({
    type: 'behavioural',
    role: ROLES[0],
    difficulty: 'entry',
    questionCount: 3,
    character: 'professional' as 'professional' | 'tech' | 'creative'
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');

  // CV State
  const [cvText, setCvText] = useState('');
  const [cvFeedback, setCvFeedback] = useState<CVFeedback | null>(null);
  const [isAnalyzingCV, setIsAnalyzingCV] = useState(false);

  const { 
    isListening, 
    transcript, 
    isSpeaking, 
    startListening, 
    stopListening, 
    speak, 
    setTranscript 
  } = useVoice();

  const currentQuestion = questions[currentQuestionIndex];

  // Initialize questions when starting
  const startInterview = () => {
    const bank = QUESTION_BANK[config.type] || [];
    const shuffled = [...bank].sort(() => 0.5 - Math.random());
    setQuestions(shuffled.slice(0, config.questionCount));
    setCurrentQuestionIndex(0);
    setFeedbacks([]);
    setState('interview');
  };

  // Speak the first question when interview starts
  useEffect(() => {
    if (state === 'interview' && questions.length > 0 && currentQuestionIndex === 0 && !isSpeaking && feedbacks.length === 0) {
      speak(questions[0]);
    }
  }, [state, questions]);

  const handleNextQuestion = async () => {
    if (!transcript.trim()) return;

    setIsAnalyzing(true);
    try {
      const feedback = await geminiService.generateFeedback(
        config.type,
        config.role,
        currentQuestion,
        transcript,
        cvText || undefined
      );
      setFeedbacks([...feedbacks, feedback]);
      setTranscript('');

      if (currentQuestionIndex < questions.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        speak(questions[nextIndex]);
      } else {
        const finalSummary = await geminiService.generateSummary(
          config.type,
          config.role,
          [...feedbacks, feedback],
          cvText || undefined
        );
        setSummary(finalSummary);
        setState('summary');
      }
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingCV(true);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(' ') + '\n';
        }
        text = fullText;
      } else {
        text = await file.text();
      }

      setCvText(text);
      const feedback = await geminiService.analyzeCV(text);
      setCvFeedback(feedback);
    } catch (error) {
      console.error("CV Analysis failed", error);
    } finally {
      setIsAnalyzingCV(false);
    }
  };

  const radarData = useMemo(() => {
    if (!summary) return [];
    const avgContent = feedbacks.reduce((acc, f) => acc + f.content_score, 0) / feedbacks.length;
    const avgStructure = feedbacks.reduce((acc, f) => acc + f.structure_score, 0) / feedbacks.length;
    const avgComm = feedbacks.reduce((acc, f) => acc + f.communication_score, 0) / feedbacks.length;
    
    return [
      { subject: 'Content', A: avgContent, fullMark: 100 },
      { subject: 'Structure', A: avgStructure, fullMark: 100 },
      { subject: 'Communication', A: avgComm, fullMark: 100 },
      { subject: 'Confidence', A: 85, fullMark: 100 }, // Mock confidence for now
    ];
  }, [summary, feedbacks]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <AnimatePresence mode="wait">
        {state === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
          >
            <div className="mb-8 p-4 bg-primary/10 rounded-2xl">
              <BrainCircuit className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              InterviewIQ
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mb-12">
              Master your next job interview with our AI-powered simulator. 
              Get real-time feedback on your answers, structure, and communication.
            </p>
            <div className="flex gap-4">
              <Button size="lg" onClick={() => setState('setup')} className="h-14 px-8 text-lg rounded-full">
                Start Practice Session <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {state === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex items-center justify-center min-h-screen p-6"
          >
            <Card className="w-full max-w-xl border-2 shadow-2xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  <CardTitle>Session Configuration</CardTitle>
                </div>
                <CardDescription>Customize your mock interview experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                <div className="space-y-2">
                  <Label>Interview Type</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {INTERVIEW_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setConfig({ ...config, type: type.id })}
                        className={`p-4 text-left rounded-xl border-2 transition-all ${
                          config.type === type.id 
                            ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                            : 'border-muted hover:border-primary/40'
                        }`}
                      >
                        <div className="font-bold mb-1">{type.name}</div>
                        <div className="text-xs text-muted-foreground leading-tight">{type.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Role</Label>
                    <Select value={config.role} onValueChange={(v) => setConfig({ ...config, role: v })}>
                      <SelectTrigger className="rounded-xl h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={config.difficulty} onValueChange={(v) => setConfig({ ...config, difficulty: v })}>
                      <SelectTrigger className="rounded-xl h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Interviewer Style</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['professional', 'tech', 'creative'] as const).map((char) => (
                      <button
                        key={char}
                        onClick={() => setConfig({ ...config, character: char })}
                        className={`p-3 rounded-xl border-2 transition-all text-xs font-bold capitalize ${
                          config.character === char 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-muted hover:border-primary/20'
                        }`}
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Interviewer Style</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['professional', 'tech', 'creative'] as const).map((char) => (
                      <button
                        key={char}
                        onClick={() => setConfig({ ...config, character: char })}
                        className={`p-3 rounded-xl border-2 transition-all text-xs font-bold capitalize ${
                          config.character === char 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-muted hover:border-primary/20'
                        }`}
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Question Count</Label>
                    <span className="text-sm font-bold text-primary">{config.questionCount} Questions</span>
                  </div>
                  <Progress value={(config.questionCount / 5) * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <button onClick={() => setConfig({ ...config, questionCount: 3 })} className="hover:text-primary">Short (3)</button>
                    <button onClick={() => setConfig({ ...config, questionCount: 5 })} className="hover:text-primary">Standard (5)</button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Upload CV (Optional)
                    </Label>
                    {cvText && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> CV Loaded
                      </Badge>
                    )}
                  </div>
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
                      cvText ? 'bg-primary/5 border-primary/40' : 'hover:border-primary/40'
                    }`}>
                      <Upload className={`w-8 h-8 ${cvText ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-center">
                        <p className="text-sm font-bold">{cvText ? "CV Uploaded Successfully" : "Click or drag to upload CV"}</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF or TXT supported</p>
                      </div>
                    </div>
                  </div>
                  {isAnalyzingCV && (
                    <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                      <Sparkles className="w-3 h-3" /> Analyzing your CV for improvements...
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-6">
                <Button onClick={startInterview} className="w-full h-14 text-lg rounded-2xl">
                  Begin Interview
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {state === 'interview' && (
          <motion.div
            key="interview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col min-h-screen"
          >
            {/* Header */}
            <div className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-10">
              <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {config.type.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground font-medium">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                </div>
                <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-32 h-2" />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-6 gap-8">
              {/* Left Side: Avatar & Question */}
              <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                <Avatar isSpeaking={isSpeaking} isListening={isListening} character={config.character} />
                
                <div className="text-center max-w-lg space-y-4">
                  <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                    {currentQuestion}
                  </h2>
                  <div className="flex justify-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => speak(currentQuestion)}
                      disabled={isSpeaking}
                      className="rounded-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" /> Replay Question
                    </Button>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center gap-4 w-full max-w-md">
                  <div className="flex w-full justify-center mb-2">
                    <div className="bg-muted/50 p-1 rounded-xl flex gap-1">
                      <button
                        onClick={() => setInputMode('voice')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          inputMode === 'voice' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Voice
                      </button>
                      <button
                        onClick={() => setInputMode('text')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          inputMode === 'text' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Text
                      </button>
                    </div>
                  </div>

                  <div className="relative w-full">
                    {inputMode === 'voice' ? (
                      <div className="relative w-full h-32 bg-muted/30 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden">
                        {transcript ? (
                          <p className="p-4 text-center text-sm italic text-muted-foreground line-clamp-4">
                            "{transcript}"
                          </p>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {isListening ? "Listening to your response..." : "Click record to start answering"}
                          </p>
                        )}
                        {isListening && (
                          <motion.div 
                            className="absolute bottom-0 left-0 h-1 bg-primary"
                            animate={{ width: ['0%', '100%'] }}
                            transition={{ duration: 180, ease: "linear" }} // 3 min limit
                          />
                        )}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Type your response here..."
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        className="min-h-[128px] rounded-2xl border-2 focus-visible:ring-primary resize-none p-4 text-sm leading-relaxed"
                      />
                    )}
                  </div>

                  <div className="flex gap-4 w-full">
                    {inputMode === 'voice' && (
                      <div className="flex gap-4">
                        {!isListening ? (
                          <Button 
                            size="lg" 
                            onClick={startListening} 
                            className="h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-transform"
                          >
                            <Mic className="w-8 h-8" />
                          </Button>
                        ) : (
                          <Button 
                            size="lg" 
                            variant="destructive" 
                            onClick={stopListening} 
                            className="h-16 w-16 rounded-full shadow-xl animate-pulse"
                          >
                            <Square className="w-8 h-8" />
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <Button 
                      size="lg" 
                      disabled={!transcript.trim() || isListening || isAnalyzing} 
                      onClick={handleNextQuestion}
                      className={`h-16 rounded-full shadow-xl flex-1 ${inputMode === 'text' ? 'w-full' : ''}`}
                    >
                      {isAnalyzing ? "Analyzing..." : (currentQuestionIndex === questions.length - 1 ? "Finish Interview" : "Submit Answer")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Side: Feedback (if available) */}
              <div className="w-full md:w-80 shrink-0">
                <Card className="h-full border-2 rounded-3xl overflow-hidden">
                  <CardHeader className="bg-muted/50 border-b py-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Live Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px] p-4">
                      {feedbacks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
                          <AlertCircle className="w-12 h-12 mb-4" />
                          <p className="text-sm font-medium">Feedback will appear here after your first answer.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {feedbacks.map((f, i) => (
                            <div key={i} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Q{i+1} Result</span>
                                <Badge variant="secondary">{Math.round((f.content_score + f.structure_score + f.communication_score) / 3)}%</Badge>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] uppercase font-bold opacity-60">
                                  <span>Content</span>
                                  <span>{f.content_score}%</span>
                                </div>
                                <Progress value={f.content_score} className="h-1" />
                              </div>
                              <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                                <p className="text-xs font-medium leading-relaxed italic">
                                  "{f.strengths[0]}"
                                </p>
                              </div>
                              <Separator />
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {state === 'summary' && summary && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto p-6 py-12 space-y-8"
          >
            <div className="text-center space-y-4 mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-4">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Interview Complete!</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {summary.encouraging_message}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Performance Chart */}
              <Card className="md:col-span-2 border-2 rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle>Performance Breakdown</CardTitle>
                  <CardDescription>Average scores across all questions</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid strokeOpacity={0.1} />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Performance"
                        dataKey="A"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Overall Score */}
              <Card className="border-2 rounded-3xl overflow-hidden bg-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle className="text-primary-foreground/80">Overall Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-full pb-12">
                  <span className="text-8xl font-black">{summary.overall_score}</span>
                  <span className="text-xl font-bold opacity-80">out of 100</span>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-2 rounded-3xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" /> Key Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {summary.top_strengths.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm font-medium leading-relaxed">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 rounded-3xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" /> Focus Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {summary.focus_areas.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm font-medium leading-relaxed">
                        <span className="flex-shrink-0 w-6 h-6 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="answers" className="w-full">
              <TabsList className="grid w-full grid-cols-4 rounded-2xl h-12">
                <TabsTrigger value="answers" className="rounded-xl">Detailed Feedback</TabsTrigger>
                <TabsTrigger value="patterns" className="rounded-xl">Observed Patterns</TabsTrigger>
                <TabsTrigger value="cv" className="rounded-xl">CV Improvement</TabsTrigger>
                <TabsTrigger value="presence" className="rounded-xl">Professional Presence</TabsTrigger>
              </TabsList>
              <TabsContent value="answers" className="mt-6 space-y-6">
                {feedbacks.map((f, i) => (
                  <Card key={i} className="border-2 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-primary uppercase tracking-widest">Question {i+1}</span>
                          <CardTitle className="text-lg">{questions[i]}</CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-lg px-4 py-1">
                          {Math.round((f.content_score + f.structure_score + f.communication_score) / 3)}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h4 className="font-bold flex items-center gap-2 text-amber-600">
                            <RotateCcw className="w-4 h-4" /> Improvements
                          </h4>
                          <div className="space-y-3">
                            {f.improvements.map((imp, j) => (
                              <div key={j} className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-2">
                                <p className="text-sm font-bold text-amber-700">{imp.issue}</p>
                                <p className="text-xs text-amber-600 italic">Suggestion: {imp.suggestion}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h4 className="font-bold flex items-center gap-2 text-primary">
                            <Quote className="w-4 h-4" /> Model Answer
                          </h4>
                          <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                            <p className="text-sm leading-relaxed italic text-muted-foreground">
                              {f.model_answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="patterns" className="mt-6">
                <Card className="border-2 rounded-3xl">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {summary.top_patterns.map((p, i) => (
                        <div key={i} className="p-4 bg-muted/50 rounded-2xl border flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold shrink-0">
                            {i+1}
                          </div>
                          <p className="text-sm font-medium">{p}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="cv" className="mt-6">
                <Card className="border-2 rounded-3xl overflow-hidden">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" /> CV Analysis & Improvements
                    </CardTitle>
                    <CardDescription>AI-generated suggestions based on your uploaded resume</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    {cvFeedback ? (
                      <>
                        <div className="space-y-4">
                          <h4 className="font-bold text-green-600 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> CV Strengths
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {cvFeedback.strengths.map((s, i) => (
                              <div key={i} className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl text-sm leading-relaxed">
                                {s}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h4 className="font-bold text-amber-600 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Recommended Improvements
                          </h4>
                          <div className="space-y-3">
                            {cvFeedback.improvements.map((imp, i) => (
                              <div key={i} className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-1">
                                <p className="text-sm font-bold text-amber-700">{imp.section}</p>
                                <p className="text-xs text-amber-600">{imp.suggestion}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="font-bold text-sm uppercase tracking-widest opacity-60">Overall CV Summary</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed italic">
                            {cvFeedback.summary}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No CV was uploaded for this session.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="presence" className="mt-6">
                <Card className="border-2 rounded-3xl overflow-hidden">
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-primary" /> Professional Presence Advice
                    </CardTitle>
                    <CardDescription>How to present yourself for a {config.role} role</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Shirt className="w-5 h-5 text-primary" />
                          </div>
                          <h4 className="font-bold text-lg">Appearance & Dress Code</h4>
                        </div>
                        <div className="p-6 bg-muted/30 rounded-2xl border border-dashed">
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {summary.professional_presence.appearance}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <UserCheck className="w-5 h-5 text-primary" />
                          </div>
                          <h4 className="font-bold text-lg">Conduct & Body Language</h4>
                        </div>
                        <div className="p-6 bg-muted/30 rounded-2xl border border-dashed">
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {summary.professional_presence.conduct}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>



            <div className="flex justify-center gap-4 pt-8">
              <Button size="lg" variant="outline" onClick={() => setState('setup')} className="rounded-full px-8">
                Practice Again
              </Button>
              <Button size="lg" onClick={() => window.location.reload()} className="rounded-full px-8">
                Back to Home
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
