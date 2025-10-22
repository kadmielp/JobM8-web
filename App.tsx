import React, { useState, useCallback } from 'react';
import SetupView from './components/SetupView';
import InterviewView from './components/InterviewView';
import FeedbackView from './components/FeedbackView';
import type { Transcript } from './types';

export type AppState = 'setup' | 'interviewing' | 'feedback';

export default function App() {
  const [appState, setAppState] = useState<AppState>('setup');
  const [experience, setExperience] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [finalTranscripts, setFinalTranscripts] = useState<Transcript[]>([]);

  const handleStartInterview = useCallback((userExperience: string, userJobDescription: string) => {
    setExperience(userExperience);
    setJobDescription(userJobDescription);
    setAppState('interviewing');
  }, []);

  const handleEndInterview = useCallback((transcripts: Transcript[]) => {
    setFinalTranscripts(transcripts);
    setAppState('feedback');
  }, []);
  
  const handleRestart = useCallback(() => {
    setAppState('setup');
    setExperience('');
    setJobDescription('');
    setFinalTranscripts([]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
          AI Interview Coach
        </h1>
        <p className="text-slate-400 mt-2">Practice your interview skills with a realistic AI-powered mock interview.</p>
      </header>
      <main className="w-full max-w-4xl flex-grow">
        {appState === 'setup' && <SetupView onStart={handleStartInterview} />}
        {appState === 'interviewing' && (
          <InterviewView
            experience={experience}
            jobDescription={jobDescription}
            onEnd={handleEndInterview}
          />
        )}
        {appState === 'feedback' && (
          <FeedbackView
            experience={experience}
            jobDescription={jobDescription}
            transcripts={finalTranscripts}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  );
}