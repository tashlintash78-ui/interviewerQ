import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please check your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface Feedback {
  content_score: number;
  structure_score: number;
  communication_score: number;
  strengths: string[];
  improvements: { issue: string; suggestion: string }[];
  model_answer: string;
  filler_words: string[];
  interviewer_comment: string;
}

export interface SessionSummary {
  overall_score: number;
  top_patterns: string[];
  top_strengths: string[];
  focus_areas: string[];
  encouraging_message: string;
  professional_presence: {
    appearance: string;
    conduct: string;
  };
}

export interface CVFeedback {
  strengths: string[];
  improvements: { section: string; suggestion: string }[];
  summary: string;
}

export const geminiService = {
  async analyzeCV(cvText: string): Promise<CVFeedback> {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following CV and provide constructive feedback for improvement. CV Text: ${cvText}`,
      config: {
        systemInstruction: `You are a professional resume reviewer and hiring manager. Provide detailed, actionable feedback on the CV. Always return valid JSON only.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  section: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                },
                required: ["section", "suggestion"],
              },
            },
            summary: { type: Type.STRING },
          },
          required: ["strengths", "improvements", "summary"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  },

  async generateFeedback(
    interviewType: string,
    targetRole: string,
    questionText: string,
    transcript: string,
    cvContext?: string
  ): Promise<Feedback> {
    const ai = getAI();
    const contextPrompt = cvContext ? `\nCandidate Background (from CV): ${cvContext}` : "";
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Interview Type: ${interviewType} Role: ${targetRole} Question: ${questionText} Candidate Answer (transcribed): ${transcript}${contextPrompt}`,
      config: {
        systemInstruction: `You are an expert career coach and interview assessor. You evaluate job interview answers against professional hiring standards. 
        Provide a "counselling output" in the improvements section: instead of just pointing out flaws, provide supportive, actionable coaching on how to specifically rephrase or restructure their answer for maximum impact.
        If CV context is provided, use it to personalize the feedback (e.g., mention how their experience relates to the answer). Always return valid JSON only.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content_score: { type: Type.NUMBER },
            structure_score: { type: Type.NUMBER },
            communication_score: { type: Type.NUMBER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  issue: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                },
                required: ["issue", "suggestion"],
              },
            },
            model_answer: { type: Type.STRING },
            filler_words: { type: Type.ARRAY, items: { type: Type.STRING } },
            interviewer_comment: { type: Type.STRING, description: "A short, conversational comment (1-2 sentences) the interviewer says in response to the candidate's answer before moving to the next question." },
          },
          required: [
            "content_score",
            "structure_score",
            "communication_score",
            "strengths",
            "improvements",
            "model_answer",
            "filler_words",
            "interviewer_comment",
          ],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  },

  async generateSummary(
    interviewType: string,
    targetRole: string,
    allFeedback: Feedback[],
    cvContext?: string
  ): Promise<SessionSummary> {
    const ai = getAI();
    const contextPrompt = cvContext ? `\nCandidate Background (from CV): ${cvContext}` : "";
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The following are scores from a ${allFeedback.length}-question ${interviewType} mock interview for a ${targetRole} role. ${contextPrompt}\nPer-question data: ${JSON.stringify(allFeedback)}`,
      config: {
        systemInstruction: `You are an expert career coach. Summarize the overall performance of the candidate. Also provide specific advice on "Professional Presence" for this specific role: how they should dress (appearance) and how they should carry themselves (conduct/body language). Always return valid JSON only.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overall_score: { type: Type.NUMBER },
            top_patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            top_strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            focus_areas: { type: Type.ARRAY, items: { type: Type.STRING } },
            encouraging_message: { type: Type.STRING },
            professional_presence: {
              type: Type.OBJECT,
              properties: {
                appearance: { type: Type.STRING, description: "Advice on dress code and physical appearance for the role." },
                conduct: { type: Type.STRING, description: "Advice on body language, etiquette, and how to carry oneself." },
              },
              required: ["appearance", "conduct"],
            },
          },
          required: ["overall_score", "top_patterns", "top_strengths", "focus_areas", "encouraging_message", "professional_presence"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  },
};
