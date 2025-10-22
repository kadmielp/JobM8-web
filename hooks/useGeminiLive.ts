import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Blob, FunctionDeclaration, Type } from '@google/genai';
import type { Transcript, InterviewStatus } from '../types';

// --- Audio Helper Functions ---

// From Base64 to bytes
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// From bytes to Base64
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decodes raw PCM audio into an AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const moderationFunctionDeclaration: FunctionDeclaration = {
  name: 'flagUnproductiveResponse',
  description: 'Flags a candidate\'s response that is off-topic, evasive, offensive, or otherwise unproductive for the interview. This should be used to moderate the conversation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: {
        type: Type.STRING,
        description: 'The specific reason for flagging the response. Must be one of: "OFF_TOPIC", "OFFENSIVE", "UNPROFESSIONAL", "EVASIVE".',
      },
    },
    required: ['reason'],
  },
};


export const useGeminiLive = (onEnd: (transcripts: Transcript[]) => void) => {
  const [status, setStatus] = useState<InterviewStatus>('connecting');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [audioIO, setAudioIO] = useState<{
    outputAudioContext: AudioContext | null;
    outputNode: GainNode | null;
  }>({ outputAudioContext: null, outputNode: null });
  const [isMuted, setIsMuted] = useState(false);
  
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  const transcriptsRef = useRef<Transcript[]>([]);
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const audioPlaybackQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextAudioStartTimeRef = useRef(0);
  const isTerminatingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMutedState = !prev;
      if (outputNodeRef.current && outputAudioContextRef.current) {
        // Smoothly ramp the gain to avoid clicks
        outputNodeRef.current.gain.setTargetAtTime(newMutedState ? 0 : 1, outputAudioContextRef.current.currentTime, 0.01);
      }
      return newMutedState;
    });
  }, []);

  const stopSession = useCallback(() => {
    if (startTimeRef.current) {
      const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
      console.log(`[ANALYTICS] Interview Session Ended. Duration: ${durationSeconds.toFixed(2)} seconds.`);
      startTimeRef.current = null; // Reset
    }

    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }
    
    audioPlaybackQueueRef.current.forEach(source => source.stop());
    audioPlaybackQueueRef.current = [];
    setAudioIO({ outputAudioContext: null, outputNode: null });
    setStatus('ended');
  }, []);


  const startSession = useCallback(async (experience: string, jobDescription: string) => {
    startTimeRef.current = Date.now();
    console.log('[ANALYTICS] Interview Session Started');

    setStatus('connecting');
    setTranscripts([]);
    transcriptsRef.current = [];
    isTerminatingRef.current = false;
    setIsMuted(false); // Ensure not muted on start

    if (!process.env.API_KEY) {
      console.error("API_KEY environment variable not set.");
      setStatus('error');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outputAudioContext;

      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);
      outputNodeRef.current = outputNode;

      setAudioIO({ outputAudioContext, outputNode });


      const systemInstruction = `You are a world-class hiring manager conducting a job interview. Your goal is to rigorously assess the candidate's suitability for a specific role based on their experience.

      Here is the candidate's experience/resume:
      ---
      ${experience}
      ---
      
      Here is the job description for the role they are interviewing for:
      ---
      ${jobDescription}
      ---
      
      Your task:
      1. Start the interview by briefly introducing yourself and the role. Keep it short.
      2. Ask a series of relevant behavioral and technical questions that probe the candidate's skills and experience as they relate to the job description.
      3. Listen carefully to the candidate's responses and ask relevant follow-up questions. Maintain a natural conversational flow.
      4. **Rigorous Follow-Up & Moderation**: Your primary role is to assess the candidate thoroughly.
         - **Detect Evasion**: If a candidate gives a very short, non-substantive, or evasive answer (e.g., "Yes," "I have experience with that," or "Absolutely") that does not provide a specific example or detail, you MUST flag it. Use the \`flagUnproductiveResponse\` tool with the \`EVASIVE\` reason. After flagging, you must verbally follow up on the same question, asking for more detail. For example: "Could you please elaborate on that?" or "Can you give me a specific example of a project where you used that skill?" Do not move to a new topic.
         - **Handle Off-Topic Responses**: If the candidate's response is completely unrelated to the question, use the \`flagUnproductiveResponse\` tool with the \`OFF_TOPIC\` reason, then verbally and politely redirect the conversation back to the question.
         - **Handle Unprofessionalism**: If the response is unprofessional or offensive, use the tool with the \`UNPROFESSIONAL\` or \`OFFENSIVE\` reason. After flagging, you MUST verbally state that the interview is being terminated due to unprofessional conduct. This will be your final spoken response.
      5. Maintain a professional and engaging tone.
      6. Keep your spoken responses concise. Do not ramble.
      7. Do not provide feedback or say if an answer is good or bad during the interview. Act solely as an interviewer.
      8. Conclude the interview gracefully when the candidate indicates they are finished or after a reasonable number of questions have been asked.`;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          tools: [{ functionDeclarations: [moderationFunctionDeclaration] }],
        },
        callbacks: {
          onopen: () => {
            setStatus('listening');
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }

            if (message.toolCall) {
              setStatus('moderating');
              for (const fc of message.toolCall.functionCalls) {
                const reason = fc.args.reason as string;
                console.log('[ANALYTICS] Moderation Triggered:', { reason });
                if (reason === 'OFFENSIVE' || reason === 'UNPROFESSIONAL') {
                  isTerminatingRef.current = true;
                }
                sessionPromiseRef.current?.then((session) => {
                  session.sendToolResponse({
                    functionResponses: [{
                      id: fc.id,
                      name: fc.name,
                      response: { result: "ok, redirecting conversation" },
                    }],
                  });
                });
              }
            }

            if (message.serverContent?.turnComplete) {
              const finalUserInput = currentInputTranscriptionRef.current.trim();
              const finalAIOutput = currentOutputTranscriptionRef.current.trim();

              setTranscripts(prev => {
                const newTranscripts = [...prev];
                if (finalUserInput) {
                  newTranscripts.push({ id: Date.now() + Math.random(), speaker: 'You', text: finalUserInput });
                }
                if (finalAIOutput) {
                   newTranscripts.push({ id: Date.now() + Math.random(), speaker: 'AI', text: finalAIOutput });
                }
                transcriptsRef.current = newTranscripts;
                return newTranscripts;
              });

              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
              setStatus('speaking');
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
              
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              
              const currentTime = outputAudioContextRef.current.currentTime;
              const startTime = Math.max(currentTime, nextAudioStartTimeRef.current);
              source.start(startTime);
              
              nextAudioStartTimeRef.current = startTime + audioBuffer.duration;
              audioPlaybackQueueRef.current.push(source);
              
              source.onended = () => {
                  audioPlaybackQueueRef.current = audioPlaybackQueueRef.current.filter(s => s !== source);
                  if (audioPlaybackQueueRef.current.length === 0) {
                    if (isTerminatingRef.current) {
                      onEndRef.current(transcriptsRef.current);
                    } else {
                      setStatus('listening');
                    }
                  }
              };
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Gemini Live API Error:', e);
            setStatus('error');
            stopSession();
          },
          onclose: (e: CloseEvent) => {
            stopSession();
          },
        },
      });
    } catch (err) {
      console.error('Error starting interview session:', err);
      setStatus('error');
    }
  }, [stopSession]);

  return { status, transcripts, startSession, stopSession, ...audioIO, isMuted, toggleMute };
};