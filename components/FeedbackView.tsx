import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Transcript } from '../types';

interface FeedbackViewProps {
  experience: string;
  jobDescription: string;
  transcripts: Transcript[];
  onRestart: () => void;
}

interface Scorecard {
  [key: string]: {
    score: number;
    justification: string;
  };
}

interface FeedbackData {
  summary: string;
  strengths: string;
  improvements: string;
  scorecard: Scorecard;
}

const ScoreBar: React.FC<{ score: number; label: string }> = ({ score, label }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-base font-medium text-slate-300">{label}</span>
      <span className="text-sm font-medium text-cyan-300">{score} / 10</span>
    </div>
    <div className="w-full bg-slate-700 rounded-full h-2.5">
      <div
        className="bg-gradient-to-r from-sky-500 to-cyan-400 h-2.5 rounded-full"
        style={{ width: `${score * 10}%` }}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={`${label} score`}
      ></div>
    </div>
  </div>
);


const FeedbackView: React.FC<FeedbackViewProps> = ({ experience, jobDescription, transcripts, onRestart }) => {
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'feedback' | 'transcript'>('feedback');

  useEffect(() => {
    const generateFeedback = async () => {
      if (!process.env.API_KEY) {
        setError("API_KEY environment variable not set.");
        setIsLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const fullTranscript = transcripts
        .map(t => `${t.speaker}: ${t.text}`)
        .join('\n');

      const prompt = `You are a world-class hiring manager and interview coach providing feedback on a mock interview.
      
      Analyze the provided interview transcript in the context of the candidate's resume and the job description they were interviewing for. Provide clear, constructive, and actionable feedback. 
      
      You MUST provide your response as a JSON object that adheres to the provided schema.
      
      The feedback should include:
      1. An overall summary.
      2. A list of specific strengths, citing examples from the transcript.
      3. A list of specific areas for improvement, citing examples.
      4. A quantitative scorecard with scores from 1 to 10 for the following categories: "Communication", "Relevance to Job Description", and "Technical Proficiency". For each score, provide a brief justification.
      
      **Candidate's Resume/Experience:**
      ---
      ${experience}
      ---
      
      **Job Description:**
      ---
      ${jobDescription}
      ---
      
      **Interview Transcript:**
      ---
      ${fullTranscript}
      ---
      
      Please provide your feedback as a JSON object now.`;

      const feedbackSchema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "Overall summary of the interview performance." },
          strengths: { type: Type.STRING, description: "Key strengths observed, with examples. Formatted as a markdown list." },
          improvements: { type: Type.STRING, description: "Areas for improvement, with examples. Formatted as a markdown list." },
          scorecard: {
            type: Type.OBJECT,
            properties: {
              "Communication": {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER, description: "Score out of 10." },
                  justification: { type: Type.STRING, description: "Brief justification for the score." }
                }
              },
              "Relevance to Job Description": {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER, description: "Score out of 10." },
                  justification: { type: Type.STRING, description: "Brief justification for the score." }
                }
              },
              "Technical Proficiency": {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER, description: "Score out of 10." },
                  justification: { type: Type.STRING, description: "Brief justification for the score." }
                }
              }
            }
          }
        }
      };

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: feedbackSchema,
          },
        });

        const parsedData = JSON.parse(response.text);
        setFeedbackData(parsedData);
        console.log('[ANALYTICS] Feedback Generated Successfully');
      } catch (e) {
        console.error("Error generating feedback:", e);
        setError("Sorry, I couldn't generate feedback at this time. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (transcripts.length > 0) {
      generateFeedback();
    } else {
      setError("No interview was conducted, so no feedback can be provided.");
      setIsLoading(false);
    }
  }, [experience, jobDescription, transcripts]);

  const handleDownload = () => {
    const fullTranscript = transcripts
      .map(t => `${t.speaker}: ${t.text}`)
      .join('\n\n---\n\n');

    let scorecardText = 'No scorecard generated.';
    if (feedbackData?.scorecard) {
      scorecardText = Object.entries(feedbackData.scorecard).map(([category, details]) => {
        return `### ${category}: ${details.score}/10\n${details.justification}`;
      }).join('\n\n');
    }

    const reportContent = `
# AI Interview Coach Session Report

---

## 📝 Your Resume / Experience
${experience}

---

## 🎯 Job Description
${jobDescription}

---

## 🎙️ Interview Transcript
${fullTranscript}

---

## 💡 AI Generated Feedback

### Scorecard
${scorecardText}

### Overall Summary
${feedbackData?.summary || 'N/A'}

### Strengths
${feedbackData?.strengths || 'N/A'}

### Areas for Improvement
${feedbackData?.improvements || 'N/A'}
    `;

    const blob = new Blob([reportContent.trim()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AI-Interview-Report.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[ANALYTICS] Report Downloaded');
  };
  
  const formatMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*?)(\n|$)/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/\n/g, '<br />');
  };

  const renderFeedback = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <i className="fa-solid fa-spinner fa-spin text-4xl mb-4"></i>
          <p className="text-lg">Generating your personalized feedback...</p>
        </div>
      );
    }

    if (error || !feedbackData) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-red-400">
          <i className="fa-solid fa-circle-exclamation text-4xl mb-4"></i>
          <p className="text-lg text-center">{error || "Could not load feedback data."}</p>
        </div>
      );
    }

    return (
      <div className="prose prose-invert max-w-none text-slate-300">
        <h3 className="text-2xl font-bold text-cyan-300 mt-6 mb-3">Scorecard</h3>
        {feedbackData.scorecard && Object.entries(feedbackData.scorecard).map(([category, details]) => (
          <div key={category} className="mb-6">
            <ScoreBar label={category} score={details.score} />
            <p className="text-sm text-slate-400 italic mt-2 ml-1">{details.justification}</p>
          </div>
        ))}

        <h3 className="text-2xl font-bold text-cyan-300 mt-8 mb-3">Overall Summary</h3>
        <p dangerouslySetInnerHTML={{ __html: formatMarkdown(feedbackData.summary) }} />

        <h3 className="text-2xl font-bold text-cyan-300 mt-6 mb-3">Strengths</h3>
        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(feedbackData.strengths) }} />

        <h3 className="text-2xl font-bold text-cyan-300 mt-6 mb-3">Areas for Improvement</h3>
        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(feedbackData.improvements) }} />
      </div>
    );
  };
  
  const renderTranscript = () => (
    <div className="space-y-4">
      {transcripts.map((transcript) => (
        <div key={transcript.id} className={`flex ${transcript.speaker === 'You' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] p-3 rounded-lg ${transcript.speaker === 'You' ? 'bg-sky-800' : 'bg-slate-700'}`}>
            <p className="font-bold text-sm mb-1 text-slate-300">{transcript.speaker}</p>
            <p className="text-slate-200">{transcript.text}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-sm flex flex-col max-h-[80vh]">
      <h2 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
        Interview Feedback
      </h2>
      
      <div className="mb-6 border-b border-slate-700 flex justify-center">
        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-6 py-2 font-semibold transition-colors duration-200 focus:outline-none ${
            activeTab === 'feedback'
              ? 'border-b-2 border-cyan-400 text-cyan-300'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Analysis
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`px-6 py-2 font-semibold transition-colors duration-200 focus:outline-none ${
            activeTab === 'transcript'
              ? 'border-b-2 border-cyan-400 text-cyan-300'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Transcript
        </button>
      </div>

      <div className="flex-grow overflow-y-auto pr-4 mb-6">
        {activeTab === 'feedback' ? renderFeedback() : renderTranscript()}
      </div>

      <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <button
          onClick={onRestart}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transform hover:-translate-y-0.5 transition-all duration-300"
        >
          Try Another Interview
        </button>
        <button
          onClick={handleDownload}
          disabled={isLoading || !!error}
          className="w-full sm:w-auto px-6 py-3 bg-slate-700 text-slate-300 font-semibold rounded-lg shadow-lg hover:bg-slate-600 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fa-solid fa-download mr-2"></i>
          Download Report
        </button>
      </div>
    </div>
  );
};

export default FeedbackView;