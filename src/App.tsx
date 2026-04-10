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
  Shirt,
  LayoutGrid,
  MessageSquare,
  Target,
  Zap,
  ArrowLeft,
  History,
  Calendar,
  Trash2,
  Clock
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
import { storageService } from '@/lib/storage';
import { InterviewSession, InterviewConfig } from '@/types';

type AppState = 'landing' | 'setup' | 'interview' | 'summary' | 'history';

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
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [pastSessions, setPastSessions] = useState<InterviewSession[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<Feedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    setPastSessions(storageService.getSessions());
    if (!process.env.GEMINI_API_KEY) {
      setApiKeyMissing(true);
    }
  }, []);

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
      setCurrentFeedback(feedback);
      setShowFeedback(true);
      speak(feedback.interviewer_comment);
      setTranscript('');
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const proceedToNext = async () => {
    setShowFeedback(false);
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      speak(questions[nextIndex]);
    } else {
      setIsAnalyzing(true);
      try {
        const finalSummary = await geminiService.generateSummary(
          config.type,
          config.role,
          feedbacks,
          cvText || undefined
        );
        setSummary(finalSummary);

        // Save session
        const session: InterviewSession = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          config: config as InterviewConfig,
          questions,
          feedbacks: feedbacks,
          summary: finalSummary,
          cvText: cvText || undefined
        };
        storageService.saveSession(session);
        setPastSessions(storageService.getSessions());

        setState('summary');
      } catch (error) {
        console.error("Summary generation failed", error);
      } finally {
        setIsAnalyzing(false);
      }
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

  const loadSession = (session: InterviewSession) => {
    setConfig(session.config);
    setQuestions(session.questions);
    setFeedbacks(session.feedbacks);
    setSummary(session.summary);
    setCvText(session.cvText || '');
    setState('summary');
  };

  const deleteSession = (e: any, id: string) => {
    e.stopPropagation();
    storageService.deleteSession(id);
    setPastSessions(storageService.getSessions());
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

  if (apiKeyMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full border-2 border-destructive/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-destructive/5 border-b text-center p-8">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">API Key Missing</CardTitle>
            <CardDescription className="mt-2">
              The Gemini API key is not configured. This is required for the AI features to work.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you are seeing this on Vercel, please add <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">GEMINI_API_KEY</code> to your project's Environment Variables.
            </p>
            <div className="p-4 bg-muted/50 rounded-2xl border border-dashed text-xs space-y-2">
              <p className="font-bold">How to fix:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Go to Vercel Project Settings</li>
                <li>Select "Environment Variables"</li>
                <li>Add key: <code className="font-mono">GEMINI_API_KEY</code></li>
                <li>Add value: (Your key from Google AI Studio)</li>
                <li>Redeploy your application</li>
              </ol>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6">
            <Button onClick={() => window.location.reload()} className="w-full rounded-xl">
              I've added it, reload page
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <AnimatePresence mode="wait">
        {state === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col"
          >
            {/* Hero Section */}
            <section className="flex flex-col items-center justify-center pt-20 pb-16 px-6 text-center max-w-5xl mx-auto">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8 p-4 bg-primary/10 rounded-3xl"
              >
                <BrainCircuit className="w-16 h-16 text-primary" />
              </motion.div>
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent"
              >
                InterviewIQ
              </motion.h1>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-10 leading-relaxed"
              >
                Master your next career move with our AI-powered simulator. 
                Get personalized coaching, CV analysis, and real-time performance metrics.
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button size="lg" onClick={() => setState('setup')} className="h-16 px-10 text-xl rounded-full shadow-2xl shadow-primary/20 hover:scale-105 transition-transform">
                  Start Practicing Now <ChevronRight className="ml-2 w-6 h-6" />
                </Button>
                {pastSessions.length > 0 && (
                  <Button size="lg" variant="outline" onClick={() => setState('history')} className="h-16 px-10 text-xl rounded-full border-2 hover:bg-muted/50 transition-all">
                    <History className="ml-2 w-6 h-6 mr-2" /> View History
                  </Button>
                )}
              </motion.div>
            </section>

            {/* Features Grid */}
            <section className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-8 rounded-3xl border-2 border-muted bg-card hover:border-primary/50 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Tailored Mock Interviews</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Practice with questions specific to your target role and difficulty level. From Behavioral to Technical and Case studies.
                </p>
              </div>

              <div className="p-8 rounded-3xl border-2 border-muted bg-card hover:border-primary/50 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">CV Analysis & Brief</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Upload your CV to give the AI interviewer context about your background and receive actionable tips for resume improvement.
                </p>
              </div>

              <div className="p-8 rounded-3xl border-2 border-muted bg-card hover:border-primary/50 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Dual Input Mode</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Respond using high-accuracy voice-to-text or type your answers directly. Perfect for practicing in any environment.
                </p>
              </div>

              <div className="p-8 rounded-3xl border-2 border-muted bg-card hover:border-primary/50 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Professional Presence</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Receive expert advice on how to carry yourself, body language, and the ideal dress code for your specific industry.
                </p>
              </div>

              <div className="p-8 rounded-3xl border-2 border-muted bg-card hover:border-primary/50 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Interactive AI Avatar</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Engage with a reactive AI interviewer that blinks, speaks, and listens, creating a realistic face-to-face experience.
                </p>
              </div>

              <div className="p-8 rounded-3xl border-2 border-muted bg-card hover:border-primary/50 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">STAR Method Feedback</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Get detailed analysis of your answers based on the STAR method, with specific suggestions for structure and content.
                </p>
              </div>
            </section>

            {/* Recent History (if any) */}
            {pastSessions.length > 0 && (
              <section className="max-w-6xl mx-auto px-6 pb-24 w-full">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold tracking-tight">Recent Sessions</h2>
                  <Button variant="ghost" onClick={() => setState('history')} className="rounded-full">
                    View All History <ChevronRight className="ml-1 w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastSessions.slice(0, 3).map((session) => (
                    <Card 
                      key={session.id} 
                      onClick={() => loadSession(session)}
                      className="group cursor-pointer border-2 hover:border-primary/50 transition-all rounded-3xl overflow-hidden"
                    >
                      <CardHeader className="bg-muted/30 p-6">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="secondary" className="rounded-full capitalize">
                            {session.config.type}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => deleteSession(e, session.id)}
                            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardTitle className="text-lg line-clamp-1">{session.config.role}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(session.date).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {session.summary.overall_score}
                            </div>
                            <span className="text-sm font-medium">Overall Score</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {session.questions.length} Qs
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Footer */}
            <footer className="mt-auto py-12 border-t bg-muted/30">
              <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2 font-bold text-xl">
                  <BrainCircuit className="w-6 h-6 text-primary" />
                  <span>InterviewIQ</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  © 2026 InterviewIQ. Empowering your professional journey.
                </p>
              </div>
            </footer>
          </motion.div>
        )}

        {state === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col p-6 max-w-5xl mx-auto w-full"
          >
            <div className="flex items-center gap-4 mb-12">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setState('landing')}
                className="rounded-full"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Interview History</h1>
                <p className="text-muted-foreground">Review your past performance and growth</p>
              </div>
            </div>

            {pastSessions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="p-6 bg-muted rounded-full">
                  <History className="w-12 h-12 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">No sessions yet</h3>
                  <p className="text-muted-foreground">Complete an interview to see your history here.</p>
                </div>
                <Button onClick={() => setState('setup')} className="rounded-full px-8">
                  Start Your First Session
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pastSessions.map((session) => (
                  <Card 
                    key={session.id} 
                    onClick={() => loadSession(session)}
                    className="group cursor-pointer border-2 hover:border-primary/50 transition-all rounded-3xl overflow-hidden"
                  >
                    <CardHeader className="bg-muted/30 p-6">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="rounded-full capitalize">
                            {session.config.type}
                          </Badge>
                          <Badge variant="outline" className="rounded-full capitalize">
                            {session.config.difficulty}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => deleteSession(e, session.id)}
                          className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardTitle className="text-xl">{session.config.role}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.date).toLocaleDateString()} at {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Score</p>
                          <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold text-primary">{session.summary.overall_score}</div>
                            <div className="text-xs text-muted-foreground">/ 100</div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Questions</p>
                          <div className="text-2xl font-bold">{session.questions.length}</div>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {session.summary.top_strengths.slice(0, 2).map((s, i) => (
                          <Badge key={i} variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] uppercase tracking-wider">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
              <CardHeader className="bg-primary/5 border-b relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setState('landing')}
                  className="absolute left-4 top-4 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3 mb-2 justify-center">
                  <Settings2 className="w-5 h-5 text-primary" />
                  <CardTitle>Session Configuration</CardTitle>
                </div>
                <CardDescription className="text-center">Customize your mock interview experience</CardDescription>
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      if (confirm("Are you sure you want to exit the interview? Your progress will be lost.")) {
                        setState('setup');
                      }
                    }}
                    className="rounded-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Exit
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
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
                  <AnimatePresence mode="wait">
                    {showFeedback && currentFeedback ? (
                      <motion.div
                        key="feedback"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full space-y-6"
                      >
                        <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-3xl relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                          <Quote className="w-8 h-8 text-primary/20 absolute -right-2 -top-2" />
                          <p className="text-lg font-medium leading-relaxed">
                            {currentFeedback.interviewer_comment}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-muted/50 rounded-2xl text-center">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Content</p>
                            <p className="text-xl font-bold">{currentFeedback.content_score}%</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-2xl text-center">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Structure</p>
                            <p className="text-xl font-bold">{currentFeedback.structure_score}%</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-2xl text-center">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Comm.</p>
                            <p className="text-xl font-bold">{currentFeedback.communication_score}%</p>
                          </div>
                        </div>

                        {currentFeedback.improvements.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                              <Sparkles className="w-3 h-3" /> Coaching Advice
                            </div>
                            <div className="space-y-2">
                              {currentFeedback.improvements.map((imp, idx) => (
                                <div key={idx} className="p-4 bg-muted/30 rounded-2xl border border-muted text-sm">
                                  <p className="font-bold text-foreground mb-1">{imp.issue}</p>
                                  <p className="text-muted-foreground leading-relaxed">{imp.suggestion}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button 
                          size="lg" 
                          onClick={proceedToNext}
                          className="w-full h-16 rounded-full shadow-xl text-lg"
                        >
                          {currentQuestionIndex === questions.length - 1 ? "See Final Results" : "Next Question"} <ChevronRight className="ml-2 w-5 h-5" />
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="controls"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full space-y-4"
                      >
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
                            {isAnalyzing ? "Analyzing..." : "Submit Answer"}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
              <Button size="lg" variant="outline" onClick={() => setState('landing')} className="rounded-full px-8">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
              </Button>
              <Button size="lg" onClick={() => setState('setup')} className="rounded-full px-8">
                Practice Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
