import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useSocketContext } from "../../SocketContext";
import { useUserAudio } from "../../hooks/useUserAudio";
import { ClientVisualizer } from "../AudioVisualizer/ClientVisualizer";
import { type ThemeType } from "../../hooks/useSystemTheme";

type UserAudioProps = {
  theme: ThemeType;
  onUserText?: (text: string) => void;
};
export const UserAudio: FC<UserAudioProps> = ({ theme, onUserText }) => {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const { sendMessage, socketStatus } = useSocketContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldRunSpeechRecognitionRef = useRef(false);
  const onRecordingStart = useCallback(() => {
    console.log("Recording started");
  }, []);

  const onRecordingStop = useCallback(() => {
    console.log("Recording stopped");
  }, []);

  const onRecordingChunk = useCallback(
    (chunk: Uint8Array) => {
      if (socketStatus !== "connected") {
        return;
      }
      sendMessage({
        type: "audio",
        data: chunk,
      });
    },
    [sendMessage, socketStatus],
  );

  const { startRecordingUser, stopRecording } = useUserAudio({
    constraints: {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    },
    onDataChunk: onRecordingChunk,
    onRecordingStart,
    onRecordingStop,
  });

  useEffect(() => {
    let res: Awaited<ReturnType<typeof startRecordingUser>>;
    if (socketStatus === "connected") {
      startRecordingUser().then(result => {
        if (result) {
          res = result;
          setAnalyser(result.analyser);
        }
      });
    }
    return () => {
      console.log("Stop recording called from somewhere else.");
      stopRecording();
      res?.source?.disconnect();
    };
  }, [startRecordingUser, stopRecording, socketStatus]);

  useEffect(() => {
    const RecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      return;
    }

    if (socketStatus !== "connected") {
      shouldRunSpeechRecognitionRef.current = false;
      speechRecognitionRef.current?.stop();
      speechRecognitionRef.current = null;
      return;
    }

    const recognition = new RecognitionCtor();
    speechRecognitionRef.current = recognition;
    shouldRunSpeechRecognitionRef.current = true;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const lines: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          if (transcript.length > 0) {
            lines.push(transcript);
          }
        }
      }
      if (lines.length > 0 && onUserText) {
        onUserText(lines.join(" "));
      }
    };

    recognition.onerror = (event) => {
      console.log("Speech recognition error", event.type);
    };

    recognition.onend = () => {
      if (shouldRunSpeechRecognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // Browser may throw if restart is too fast; next onend cycle retries.
        }
      }
    };

    try {
      recognition.start();
    } catch {
      // Ignore startup failures on unsupported/locked browser environments.
    }

    return () => {
      shouldRunSpeechRecognitionRef.current = false;
      recognition.stop();
      if (speechRecognitionRef.current === recognition) {
        speechRecognitionRef.current = null;
      }
    };
  }, [socketStatus, onUserText]);

  return (
    <div className="user-audio h-5/6 aspect-square" ref={containerRef}>
      <ClientVisualizer theme={theme} analyser={analyser} parent={containerRef}/>
    </div>
  );
};
