
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, FileData } from "../types";

export async function analyzeSymptoms(
  text: string,
  image?: FileData,
  audio?: FileData
): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const parts: any[] = [];
  
  if (text) {
    parts.push({ text: `User Description: ${text}` });
  }
  
  if (image) {
    parts.push({
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType
      }
    });
  }
  
  if (audio) {
    parts.push({
      inlineData: {
        data: audio.base64,
        mimeType: audio.mimeType
      }
    });
  }

  const prompt = `
    You are a professional medical assistant AI. Analyze the provided inputs (text, image, and/or audio) to detect potential symptoms or health issues.
    
    1. If audio is provided, transcribe it accurately.
    2. Identify medical terms (symptoms, conditions, body parts).
    3. Analyze the urgency on a scale of 1-10 (1=Low, 10=Emergency).
    4. Determine the emotional sentiment of the user.
    5. Provide a summary of findings and general recommendations.
    
    Important: Do not provide a definitive diagnosis. Always state that this is for informational purposes and the user must consult a healthcare professional.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [...parts, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcription: { type: Type.STRING },
          detectedIndicators: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                category: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ['term', 'category', 'description']
            }
          },
          summary: { type: Type.STRING },
          urgencyScore: { type: Type.NUMBER },
          sentiment: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          imageAnalysis: { type: Type.STRING }
        },
        required: ['detectedIndicators', 'summary', 'urgencyScore', 'sentiment', 'recommendations']
      }
    }
  });

  return JSON.parse(response.text) as AnalysisResult;
}

export async function generateSpeech(text: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this medical summary clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Zephyr' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Failed to generate speech data");
  return base64Audio;
}
