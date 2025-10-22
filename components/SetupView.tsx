
import React, { useState } from 'react';

interface SetupViewProps {
  onStart: (experience: string, jobDescription: string) => void;
}

const SetupView: React.FC<SetupViewProps> = ({ onStart }) => {
  const [experience, setExperience] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (experience.trim() && jobDescription.trim()) {
      onStart(experience, jobDescription);
    }
  };

  return (
    <div className="bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="experience" className="block text-sm font-medium text-slate-300 mb-2">
            Your Resume / Experience
          </label>
          <textarea
            id="experience"
            rows={10}
            className="w-full p-3 bg-slate-900/70 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-shadow"
            placeholder="Paste your resume or summarize your professional experience here..."
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="job-description" className="block text-sm font-medium text-slate-300 mb-2">
            Job Description
          </label>
          <textarea
            id="job-description"
            rows={10}
            className="w-full p-3 bg-slate-900/70 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-shadow"
            placeholder="Paste the job description for the role you are targeting..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!experience.trim() || !jobDescription.trim()}
            className="px-6 py-3 bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            Start Mock Interview
          </button>
        </div>
      </form>
    </div>
  );
};

export default SetupView;
