
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import FileSelector from './components/FileSelector';
import AudioRecorder from './components/AudioRecorder';
import LiveAssistant from './components/LiveAssistant';
import { analyzeSymptoms, generateSpeech } from './services/geminiService';
import { AnalysisResult, FileData } from './types';
import { UrgencyMeter, SentimentBar } from './components/Visuals';
import { playRawPcm } from './utils/audioUtils';

const App: React.FC = () => {
  const [symptomText, setSymptomText] = useState('');
  const [imageFile, setImageFile] = useState<FileData | null>(null);
  const [audioFile, setAudioFile] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [playingSpeech, setPlayingSpeech] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showLive, setShowLive] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomText && !imageFile && !audioFile) {
      setError('Please provide at least one form of input (text, image, or audio).');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeSymptoms(symptomText, imageFile || undefined, audioFile || undefined);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError('An error occurred while analyzing your symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async (dataToSpeak?: AnalysisResult) => {
    const targetResult = dataToSpeak || result;
    if (!targetResult || playingSpeech) return;
    setPlayingSpeech(true);
    try {
      const speechText = `${targetResult.summary}. Primary recommendations: ${targetResult.recommendations.slice(0, 3).join('. ')}`;
      const base64Audio = await generateSpeech(speechText);
      await playRawPcm(base64Audio);
    } catch (err) {
      console.error("Speech error:", err);
    } finally {
      setPlayingSpeech(false);
    }
  };

  // Auto-play when results arrive
  useEffect(() => {
    if (result && autoPlay) {
      handleSpeak(result);
    }
  }, [result, autoPlay]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {showLive && <LiveAssistant onClose={() => setShowLive(false)} />}
        
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Symptom Analysis Hub
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Multi-modal diagnostics powered by Gemini AI.
          </p>
          
          <button 
            onClick={() => setShowLive(true)}
            className="mt-8 inline-flex items-center space-x-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform hover:scale-105"
          >
            <div className="flex space-x-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-1.5 h-4 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
              ))}
            </div>
            <span>Start Live Voice Consultation</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-800">Analyze Symptoms</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Auto-Voice</span>
                  <button 
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${autoPlay ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoPlay ? 'left-6' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <textarea
                  rows={4}
                  className="w-full rounded-xl border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm transition-all"
                  placeholder="Describe how you feel..."
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                />

                <AudioRecorder onRecordingComplete={setAudioFile} />

                <div className="grid grid-cols-2 gap-4">
                  <FileSelector
                    label="Photo"
                    accept="image/*"
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    onFileSelect={setImageFile}
                    selectedFile={imageFile}
                  />
                  <FileSelector
                    label="Audio File"
                    accept="audio/*"
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                    onFileSelect={setAudioFile}
                    selectedFile={audioFile}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Analyzing Data...' : 'Run Analysis'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 bg-white rounded-2xl border border-slate-200 min-h-[400px]">
                <div className="relative">
                   <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                   <div className="absolute inset-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-600 font-medium">Scanning multi-modal indicators...</p>
              </div>
            ) : result ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Analysis Summary</span>
                    <button 
                      onClick={() => handleSpeak()}
                      disabled={playingSpeech}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all ${
                        playingSpeech ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {playingSpeech ? (
                        <div className="flex space-x-0.5 items-end h-3">
                          <div className="w-1 bg-white animate-bounce h-full" />
                          <div className="w-1 bg-white animate-bounce h-1/2" style={{animationDelay: '0.1s'}} />
                          <div className="w-1 bg-white animate-bounce h-3/4" style={{animationDelay: '0.2s'}} />
                        </div>
                      ) : (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" /></svg>
                      )}
                      <span className="text-[10px] font-bold">{playingSpeech ? 'Speaking' : 'Play Voice'}</span>
                    </button>
                  </div>
                  <div className="p-6">
                    <p className="text-slate-800 leading-relaxed font-medium">
                      {result.summary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Detected Indicators</h3>
                    <div className="space-y-3">
                      {result.detectedIndicators.map((ind, i) => (
                        <div key={i} className="flex items-start space-x-3 p-2 bg-slate-50 rounded-lg">
                          <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${ind.category === 'Symptom' ? 'bg-amber-400' : 'bg-blue-400'}`}></div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{ind.term}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">{ind.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 self-start">Visual Metrics</h3>
                    <UrgencyMeter score={result.urgencyScore} />
                    <SentimentBar sentiment={result.sentiment} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">AI Recommendations</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {result.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-sm text-blue-800 font-medium">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 min-h-[400px]">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-lg font-medium">Ready for Intake</p>
                <p className="text-sm text-center">Provide symptoms via text, image, or audio recording to begin the analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
