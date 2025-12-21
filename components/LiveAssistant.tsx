
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decodeAudioData, decodeBase64, encode } from '../utils/audioUtils';

interface LiveAssistantProps {
  onClose: () => void;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<{ role: string; text: string }[]>([]);
  const [status, setStatus] = useState('Initializing...');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentTurnRef = useRef({ user: '', model: '' });

  const stopAllAudio = () => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const startSession = useCallback(async () => {
    try {
      setStatus('Connecting...');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are an empathetic and professional medical assistant. Listen to the user describe their symptoms, ask clarifying questions, and provide helpful summaries. Remind them you are an AI and not a doctor.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setStatus('Listening...');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Transcriptions
            if (message.serverContent?.inputTranscription) {
              currentTurnRef.current.user += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              currentTurnRef.current.model += message.serverContent.outputTranscription.text;
            }
            
            if (message.serverContent?.turnComplete) {
              const userText = currentTurnRef.current.user;
              const modelText = currentTurnRef.current.model;
              setTranscription(prev => [
                ...prev, 
                { role: 'You', text: userText },
                { role: 'Assistant', text: modelText }
              ]);
              currentTurnRef.current = { user: '', model: '' };
            }

            if (message.serverContent?.interrupted) {
              stopAllAudio();
            }
          },
          onerror: (e) => {
            console.error("Live Error:", e);
            setStatus('Error occurred');
          },
          onclose: () => {
            setIsActive(false);
            setStatus('Session Closed');
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setStatus('Failed to start');
    }
  }, []);

  useEffect(() => {
    startSession();
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      stopAllAudio();
    };
  }, [startSession]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-300'}`}></div>
            <h3 className="font-bold">Live Consultation</h3>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50">
          {transcription.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="flex space-x-2 mb-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-2 bg-blue-400 rounded-full animate-bounce" style={{ height: `${20 + Math.random() * 40}px`, animationDelay: `${i * 0.1}s` }}></div>
                ))}
              </div>
              <p className="text-sm">{status}</p>
              <p className="text-xs mt-2">Speak clearly to describe your symptoms</p>
            </div>
          )}
          
          {transcription.map((t, i) => (
            <div key={i} className={`flex flex-col ${t.role === 'You' ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-2">{t.role}</span>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                t.role === 'You' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none'
              }`}>
                {t.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex flex-col items-center space-y-4">
          <div className="flex space-x-4">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-full hover:bg-slate-200 transition-colors"
            >
              End Consultation
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center px-8">
            This voice assistant is an AI and not a doctor. In case of emergency, contact local authorities immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiveAssistant;
