import React, { useEffect, useRef, useMemo } from 'react';
import type { Transcript, InterviewStatus } from '../types';
import { useGeminiLive } from '../hooks/useGeminiLive';
import AudioVisualizer from './AudioVisualizer';

interface InterviewViewProps {
  experience: string;
  jobDescription: string;
  onEnd: (transcripts: Transcript[]) => void;
}

const StatusIndicator: React.FC<{ status: InterviewStatus }> = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'connecting':
        return { icon: 'fa-solid fa-spinner fa-spin', text: 'Connecting...', color: 'text-yellow-400' };
      case 'listening':
        return { icon: 'fa-solid fa-microphone', text: 'Listening...', color: 'text-green-400 animate-pulse' };
      case 'processing':
        return { icon: 'fa-solid fa-brain fa-fade', text: 'Thinking...', color: 'text-cyan-400' };
      case 'speaking':
        return { icon: 'fa-solid fa-volume-high', text: 'AI Speaking...', color: 'text-sky-400' };
      case 'moderating':
        return { icon: 'fa-solid fa-arrows-to-circle', text: 'Redirecting...', color: 'text-orange-400' };
      case 'ended':
        return { icon: 'fa-solid fa-circle-check', text: 'Interview Ended', color: 'text-slate-400' };
      case 'error':
        return { icon: 'fa-solid fa-circle-exclamation', text: 'An error occurred', color: 'text-red-500' };
      default:
        return { icon: 'fa-solid fa-spinner fa-spin', text: 'Initializing...', color: 'text-slate-400' };
    }
  };

  const { icon, text, color } = getStatusInfo();

  return (
    <div className={`flex items-center justify-center space-x-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700 ${color}`}>
      <i className={icon}></i>
      <span className="font-medium">{text}</span>
    </div>
  );
};

const InterviewView: React.FC<InterviewViewProps> = ({ experience, jobDescription, onEnd }) => {
  const { status, transcripts, startSession, stopSession, outputAudioContext, outputNode, isMuted, toggleMute } = useGeminiLive(onEnd);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  
  const isSpeaking = useMemo(() => status === 'speaking', [status]);

  useEffect(() => {
    startSession(experience, jobDescription);
    return () => {
      stopSession();
    };
  }, [experience, jobDescription, startSession, stopSession]);

  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const handleEndClick = () => {
    stopSession();
    onEnd(transcripts);
  };

  return (
    <div className="bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-sm flex flex-col h-[70vh] max-h-[800px]">
      <div className="relative h-40 mb-4 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          {outputAudioContext && outputNode && (
            <AudioVisualizer 
              audioContext={outputAudioContext} 
              audioNode={outputNode} 
              isSpeaking={isSpeaking}
            />
          )}
        </div>
        <StatusIndicator status={status} />
      </div>

      <div className="flex-grow overflow-y-auto pr-4 space-y-4">
        {transcripts.map((transcript) => (
          <div key={transcript.id} className={`flex ${transcript.speaker === 'You' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${transcript.speaker === 'You' ? 'bg-sky-800' : 'bg-slate-700'}`}>
              <p className="font-bold text-sm mb-1">{transcript.speaker}</p>
              <p className="text-slate-200">{transcript.text}</p>
            </div>
          </div>
        ))}
        <div ref={transcriptsEndRef} />
      </div>

      <div className="mt-6 flex justify-center items-center space-x-4">
        <button
          onClick={toggleMute}
          className="w-14 h-12 flex items-center justify-center bg-slate-700 text-slate-300 font-semibold rounded-lg shadow-lg hover:bg-slate-600 transform hover:-translate-y-0.5 transition-all duration-300"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'} text-lg`}></i>
        </button>
        <button
          onClick={handleEndClick}
          disabled={status === 'ended' || status === 'connecting'}
          className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-red-500/50 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          End Interview
        </button>
      </div>
    </div>
  );
};

export default InterviewView;