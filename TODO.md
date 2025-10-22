# TODO.md — Real-Time AI Mock Interview Platform

---

## MVP Scope

- [x] Define user stories and platform requirements
- [x] Choose tech stack (frontend, backend, AI, TTS)
- [x] Design wireframes for all core screens

---

## Intake & Data Flow

- [x] Build forms for resume/job description upload
- [x] Implement resume/job validation and parsing
- [x] Store user inputs securely

---

## Interview Script Generation

- [x] Connect to AI provider (e.g., OpenAI, Gemini, Claude) for script creation
- [x] Generate interview questions dynamically using candidate data + job description
- [x] Store and manage script for session state

---

## Mock Interview Engine

- [x] Implement chatbot or chat interface for candidate/AI interaction
- [x] Enforce question progression logic (advance only on answer)
- [x] Build moderation checks for:
    - [x] Off-topic (trigger friendly reminder to refocus)
    - [x] Offensive/rude (terminate interview gracefully)

---

## Audio & Visualization

- [x] Integrate Text-to-Speech (TTS) API for AI speech output
- [x] Return and play audio with each AI question/response
- [x] Add soundwave visualization:
    - [x] Select library (Wavesurfer.js, Tone.js for web; platform alternatives for mobile)
    - [x] Synchronize soundwave with audio playback
    - [x] Position widget appropriately in UI

---

## Scoring & Feedback

- [x] Define scorecard metrics (communication, relevance, etc.)
- [x] Enable automated answer scoring using AI or backend logic
- [x] Display scorecard and interview transcript at end

---

## Data & Security

- [x] Store interview sessions, transcripts, and audio securely
- [x] Enable data export/review for user and admins

---

## Moderation & Edge Handling

- [x] Detect off-topic/irrelevant responses and prompt candidate to refocus
- [x] End interview if candidate is offensive/rude
- [x] Handle any audio/TTS errors with user-friendly screens

---

## User Controls & Accessibility

- [x] Add audio controls (play/pause/replay/volume)
- [x] Show transcript alongside soundwave
- [x] Make interface responsive for mobile and desktop

---

## Analytics & Logging

- [x] Log key metrics: interview completion, question performance, moderation triggers

---

## Testing

- [ ] Write unit and integration tests (resume intake, TTS sync, moderation, scorecard)
- [ ] Perform user testing across device/browser variants

---

## Launch & Improvements

- [ ] Prepare MVP for pilot launch
- [ ] Collect feedback and iterate (script quality, interaction flow, audio sync)
- [x] Enhance AI model prompts and UI/UX based on user feedback