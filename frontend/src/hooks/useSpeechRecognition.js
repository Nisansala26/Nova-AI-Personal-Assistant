import { useEffect, useRef, useState } from "react";

export default function useSpeechRecognition(onResult, options = {}) {
  const [isListening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);

  const recognitionRef = useRef(null);
  const lastProcessedRef = useRef({ text: "", time: 0 });
  const wakeWordActiveRef = useRef(false);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Play audio chime when wake-word is detected
  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext might be blocked until user gesture
    }
  }

  function handleFinalCommand(transcriptText) {
    const clean = transcriptText.trim();
    if (!clean) return;

    const now = Date.now();
    // Deduplication check: ignore identical transcript received within 2.5 seconds
    if (
      clean.toLowerCase() === lastProcessedRef.current.text.toLowerCase() &&
      now - lastProcessedRef.current.time < 2500
    ) {
      console.log("Duplicate voice command ignored:", clean);
      return;
    }

    lastProcessedRef.current = { text: clean, time: now };
    setInterimTranscript("");
    onResult(clean);
  }

  function start(wakeWordMode = false) {
    if (!supported) {
      setError("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = wakeWordMode || options.continuous || false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setError("");
      setPermissionDenied(false);
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      setInterimTranscript(interim);

      // Check for Wake-Word: "Hey Nova" or "Nova"
      if (options.wakeWordEnabled && !wakeWordActiveRef.current) {
        const fullSoFar = (interim + " " + final).toLowerCase();
        const wakeIdx = fullSoFar.indexOf("hey nova") !== -1
          ? fullSoFar.indexOf("hey nova") + 8
          : fullSoFar.indexOf("nova") !== -1
          ? fullSoFar.indexOf("nova") + 4
          : -1;

        if (wakeIdx !== -1) {
          wakeWordActiveRef.current = true;
          playChime();
          const remainder = fullSoFar.slice(wakeIdx).trim();
          if (remainder.length > 3) {
            handleFinalCommand(remainder);
            wakeWordActiveRef.current = false;
            return;
          }
        }
      }

      if (final.trim()) {
        let commandToProcess = final.trim();
        // If wake word mode was triggered, strip "hey nova" prefix
        const lower = commandToProcess.toLowerCase();
        if (lower.startsWith("hey nova")) {
          commandToProcess = commandToProcess.slice(8).trim();
        } else if (lower.startsWith("nova")) {
          commandToProcess = commandToProcess.slice(4).trim();
        }

        if (commandToProcess) {
          handleFinalCommand(commandToProcess);
        }
        wakeWordActiveRef.current = false;

        if (!recognition.continuous) {
          recognition.stop();
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setPermissionDenied(true);
        setError("Microphone permission was denied. Please allow microphone access in your browser settings.");
      } else if (event.error === "no-speech") {
        setError("No speech was detected. Tap the mic and try again.");
      } else if (event.error === "audio-capture") {
        setError("No microphone detected. Check your audio device.");
      } else {
        setError(`Speech error: ${event.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
      // If wake-word continuous mode is active, restart gracefully
      if (options.wakeWordEnabled && !permissionDenied) {
        try {
          recognition.start();
        } catch {
          // ignore restart errors
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("Speech start error:", err);
      setListening(false);
    }
  }

  function stop() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setListening(false);
    setInterimTranscript("");
  }

  return {
    isListening,
    interimTranscript,
    permissionDenied,
    start,
    stop,
    supported,
    error,
  };
}
