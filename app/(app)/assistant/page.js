'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen, History, Plus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useKeyboard } from '@/context/KeyboardContext';
import { getPendingCameraPhoto } from '@/lib/cameraBridge';
import Icon3D from '@/components/ui/Icon3D';
import { ErrorState } from '@/components/ui/States';
import ChatSidebar from '@/components/assistant/ChatSidebar';
import WelcomeScreen from '@/components/assistant/WelcomeScreen';
import ThinkingIndicator from '@/components/assistant/ThinkingIndicator';
import MessageItem from '@/components/assistant/MessageItem';
import Composer from '@/components/assistant/Composer';
import { replaceChartsWithText, stripChartsForSpeech } from '@/components/assistant/chartSpec';

const AVAILABLE_MODELS = [
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
  { id: 'gemma-4-26b', name: 'Gemma 4 26B' },
  { id: 'gemma-4-31b', name: 'Gemma 4 31B' },
];

const RECEIPT_PROMPT_ONE = 'Please scan this receipt/bill image, extract all purchased items with prices, and ask for my approval before creating transactions.';
const receiptPromptMany = (n) => `Please scan these ${n} receipt/bill images, extract and consolidate all purchased items with prices across all receipts, and ask for my approval before creating transactions.`;

/** Turn a thrown error / failed response into the text shown under the message. */
function friendlyError(err) {
  if (err?.name === 'TypeError') return 'Network error. Check your connection and retry.';
  return err?.message || "Couldn't get a reply.";
}

export default function Assistant() {
  const { user, loading } = useAuth();
  const { isKeyboardOpen } = useKeyboard();
  const router = useRouter();

  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window === 'undefined') return AVAILABLE_MODELS[0].id;
    try {
      return localStorage.getItem('assistant_model') || AVAILABLE_MODELS[0].id;
    } catch {
      return AVAILABLE_MODELS[0].id;
    }
  });

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    try { localStorage.setItem('assistant_model', modelId); } catch { /* storage unavailable */ }
  };

  // Chat sessions
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // desktop panel
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Conversation
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  // Non-send problems (history load, mic, file type…) with an optional retry.
  // setError(msg) always clears the retry; setErrorRetry(() => fn) attaches one.
  const [errorState, setErrorState] = useState({ message: '', retry: null });
  const error = errorState.message;
  const errorRetry = errorState.retry;
  const setError = (message) => setErrorState({ message, retry: null });
  const setErrorRetry = (factory) => setErrorState(s => ({ ...s, retry: typeof factory === 'function' ? factory() : null }));
  const [thinkingStep, setThinkingStep] = useState(0);

  const isThinking = isGenerating && (
    messages.length === 0 ||
    messages[messages.length - 1]?.role === 'user' ||
    (messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content)
  );

  useEffect(() => {
    if (!isThinking) return undefined;
    const interval = setInterval(() => setThinkingStep(prev => prev + 1), 2200);
    return () => clearInterval(interval);
  }, [isThinking]);

  // Voice
  const [isListening, setIsListening] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);
  const [audioLoadingMsgIdx, setAudioLoadingMsgIdx] = useState(null);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const activeAudioPlayerRef = useRef(null);

  // Receipt images (up to 10)
  const [attachedImages, setAttachedImages] = useState([]); // { id, file, previewUrl, name, sizeStr, url, key, status, errorMessage }
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);


  // Fetch all chat sessions for the user
  const loadSessions = async (selectLatest = false) => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (selectLatest && data.length > 0 && !activeSessionId) {
          setActiveSessionId(data[0].id);
        }
        return data;
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
    return [];
  };

  // Initial load
  useEffect(() => {
    if (user) {
      loadSessions(true).then(async (loadedSessions) => {
        const pendingFile = await getPendingCameraPhoto();
        if (pendingFile) {
          attachCapturedPhoto(pendingFile, loadedSessions);
        }
      });
    }
  }, [user]);

  // Load a session's messages (empty list = welcome screen)
  const loadMessages = async (sessionId) => {
    setError('');
    setErrorRetry(null);
    if (!sessionId) {
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed to load chat history.');
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      console.error(err);
      setError("Couldn't load this chat.");
      setErrorRetry(() => () => loadMessages(sessionId));
    } finally {
      setIsLoadingMessages(false);
    }
  };


  useEffect(() => {
    if (user) {
      loadMessages(activeSessionId);
    }
  }, [activeSessionId, user]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Keep the welcome screen at the top; only follow the thread once it exists.
    if (messages.length === 0 && !isGenerating) return;
    scrollToBottom();
  }, [messages, isGenerating, isLoadingMessages, attachedImages]);

  // Scroll to bottom when mobile virtual keyboard opens
  useEffect(() => {
    if (isKeyboardOpen) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isKeyboardOpen]);

  // Helper to format file sizes
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Upload image file directly to Cloudflare R2 bucket via /api/upload
  const uploadFileToR2 = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errMsg = 'Failed to upload image to Cloudflare R2.';
      try {
        const errData = await res.json();
        errMsg = errData.error || errMsg;
      } catch (e) { }
      throw new Error(errMsg);
    }

    const data = await res.json();
    return data;
  };

  // Process and upload selected or pasted images to Cloudflare R2 (Max 10 images)
  const handleFilesProcess = async (files, customName = null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.isArray(files) ? files : Array.from(files);
    const validFiles = fileList.filter((f) => {
      const isImg = (f.type && f.type.startsWith('image/')) || /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(f.name || '');
      return isImg;
    });

    if (validFiles.length === 0) {
      setError('Please select valid image files (PNG, JPG, WEBP, HEIC).');
      return;
    }

    const currentCount = attachedImages.length;
    const availableSlots = 10 - currentCount;

    if (availableSlots <= 0) {
      setError('Maximum 10 images limit reached. Please remove some images before adding more.');
      return;
    }

    const filesToProcess = validFiles.slice(0, availableSlots);
    if (validFiles.length > availableSlots) {
      setError(`Only ${availableSlots} more image(s) could be added (max 10 limit reached).`);
    } else {
      setError('');
    }

    const newItems = filesToProcess.map((file, idx) => {
      const id = `img_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
      const fileName = customName ? `${customName} ${currentCount + idx + 1}` : (file.name || `receipt_${currentCount + idx + 1}.jpg`);
      let previewUrl = '';
      try {
        previewUrl = URL.createObjectURL(file);
      } catch (e) {
        console.warn('ObjectURL error:', e);
      }

      return {
        id,
        file,
        previewUrl,
        name: fileName,
        sizeStr: formatFileSize(file.size),
        url: null,
        key: null,
        status: 'uploading',
      };
    });

    setAttachedImages(prev => [...prev, ...newItems]);
    setIsProcessingImage(true);

    // Upload files in parallel to Cloudflare R2
    await Promise.all(
      newItems.map(async (item) => {
        try {
          const uploadResult = await uploadFileToR2(item.file);
          setAttachedImages(prev =>
            prev.map(img =>
              img.id === item.id
                ? { ...img, url: uploadResult.url, key: uploadResult.key, status: 'ready' }
                : img
            )
          );
        } catch (err) {
          console.error(`Error uploading ${item.name}:`, err);
          setAttachedImages(prev =>
            prev.map(img =>
              img.id === item.id
                ? { ...img, status: 'error', errorMessage: err.message }
                : img
            )
          );
        }
      })
    );

    setIsProcessingImage(false);
  };

  // Handle Image File Selection (Camera / Multi-File Picker)
  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await handleFilesProcess(files);
    e.target.value = '';
  };

  // Attach captured photo from mobile top navbar to the first session
  const attachCapturedPhoto = async (file, targetSessions = null) => {
    if (!file) return;

    const currentSessions = targetSessions || sessions;
    if (currentSessions && currentSessions.length > 0) {
      if (activeSessionId !== currentSessions[0].id) {
        setActiveSessionId(currentSessions[0].id);
      }
    }

    await handleFilesProcess([file], 'Camera Receipt Photo');
    setTimeout(() => {
      scrollToBottom();
    }, 150);
  };

  // Listen for camera photos captured from top navbar while on assistant page
  useEffect(() => {
    const handleCameraCapturedEvent = (e) => {
      const capturedFile = e.detail?.file;
      if (capturedFile) {
        attachCapturedPhoto(capturedFile, sessions);
      }
    };

    window.addEventListener('assistant-attach-camera-photo', handleCameraCapturedEvent);
    return () => window.removeEventListener('assistant-attach-camera-photo', handleCameraCapturedEvent);
  }, [sessions, activeSessionId]);

  // Check if a camera photo was captured before navigating to assistant
  useEffect(() => {
    let isMounted = true;
    const checkPendingPhoto = async () => {
      const pendingFile = await getPendingCameraPhoto();
      if (pendingFile && isMounted) {
        attachCapturedPhoto(pendingFile, sessions);
      }
    };
    checkPendingPhoto();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Paste Event from Clipboard (Ctrl+V / Cmd+V with multiple images support)
  const handlePaste = async (e) => {
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    const pastedFiles = [];
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.type && item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }

    if (pastedFiles.length > 0) {
      await handleFilesProcess(pastedFiles, 'Pasted Receipt Image');
    }
  };

  // Retry failed upload for specific image
  const handleRetryUpload = async (id) => {
    const target = attachedImages.find(img => img.id === id);
    if (!target || !target.file) return;

    setAttachedImages(prev =>
      prev.map(img => (img.id === id ? { ...img, status: 'uploading', errorMessage: '' } : img))
    );

    try {
      const uploadResult = await uploadFileToR2(target.file);
      setAttachedImages(prev =>
        prev.map(img =>
          img.id === id
            ? { ...img, url: uploadResult.url, key: uploadResult.key, status: 'ready' }
            : img
        )
      );
    } catch (err) {
      setAttachedImages(prev =>
        prev.map(img =>
          img.id === id
            ? { ...img, status: 'error', errorMessage: err.message }
            : img
        )
      );
    }
  };

  // Remove individual attached image
  const handleRemoveAttachedImage = (id) => {
    setAttachedImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(target.previewUrl); } catch (e) { }
      }
      return prev.filter(img => img.id !== id);
    });
  };

  // Clear all attached images
  const handleClearAllImages = () => {
    attachedImages.forEach(img => {
      if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(img.previewUrl); } catch (e) { }
      }
    });
    setAttachedImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectSession = (id) => {
    setActiveSessionId(id);
    setMobileHistoryOpen(false);
  };

  // Create a blank chat session
  const handleCreateSession = async () => {
    setError('');
    setErrorRetry(null);
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      if (!res.ok) throw new Error('Failed to create new session.');
      const newSession = await res.json();
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMobileHistoryOpen(false);
    } catch (err) {
      console.error(err);
      setError("Couldn't start a new chat.");
      setErrorRetry(() => handleCreateSession);
    }
  };

  // Delete a chat session
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    setError('');
    setErrorRetry(null);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete session.');
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      if (activeSessionId === sessionId) {
        setActiveSessionId(updatedSessions[0]?.id ?? null);
        if (!updatedSessions.length) setMessages([]);
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't delete that chat.");
      setErrorRetry(() => () => handleDeleteSession({ stopPropagation() {} }, sessionId));
    }
  };

  /**
   * Send a message. `retryIndex` re-sends a failed user message in place
   * (same text + already-uploaded images) without adding a new bubble.
   */
  const sendMessage = async (textToSend, customImages = null, retryIndex = null) => {
    if (isGenerating) return;
    const isRetry = retryIndex !== null;
    const failedMsg = isRetry ? messages[retryIndex] : null;
    const imagesToSend = isRetry ? [] : (customImages || attachedImages);
    const prompt = isRetry ? '' : (textToSend !== undefined ? textToSend : input);

    if (!isRetry && !prompt.trim() && imagesToSend.length === 0) return;

    setIsGenerating(true);
    setError('');
    setErrorRetry(null);

    // Make sure every attachment is in R2 (skip ones that still fail)
    let resolvedUrls = isRetry ? (failedMsg?.imageUrls || []) : [];
    if (!isRetry) {
      for (const img of imagesToSend) {
        if (img.url) {
          resolvedUrls.push(img.url);
        } else if (img.file) {
          try {
            const upRes = await uploadFileToR2(img.file);
            resolvedUrls.push(upRes.url);
          } catch (upErr) {
            console.error('Upload failed before message dispatch:', upErr);
          }
        }
      }
      setInput('');
      setAttachedImages([]);
    }

    let currentSessionId = activeSessionId;

    // Auto-create a session for the first message
    if (!currentSessionId) {
      try {
        const sessionTitle = (prompt.trim() || failedMsg?.content || '').slice(0, 60)
          || (resolvedUrls.length > 1 ? `${resolvedUrls.length} Receipts Scan` : resolvedUrls.length ? 'Receipt Scan' : 'New Chat');
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: sessionTitle }),
        });
        if (!res.ok) throw new Error('Failed to create new session.');
        const newSession = await res.json();
        currentSessionId = newSession.id;
        setActiveSessionId(currentSessionId);
        setSessions(prev => [newSession, ...prev]);
      } catch (err) {
        console.error(err);
        setIsGenerating(false);
        if (!isRetry) {
          setInput(prompt);
          setAttachedImages(imagesToSend);
        }
        setError("Couldn't start a chat. Check your connection.");
        setErrorRetry(() => () => sendMessage(isRetry ? undefined : prompt, isRetry ? null : imagesToSend, retryIndex));
        return;
      }
    }

    // Build the thread to send
    let thread;
    if (isRetry) {
      thread = messages.slice(0, retryIndex + 1).map((m, i) => (i === retryIndex ? { ...m, status: 'sending', error: null } : m));
    } else {
      const content = imagesToSend.length > 0 && !prompt.trim()
        ? (imagesToSend.length > 1 ? receiptPromptMany(imagesToSend.length) : RECEIPT_PROMPT_ONE)
        : prompt.trim();
      thread = [...messages, {
        role: 'user',
        content,
        imageUrls: resolvedUrls,
        imagePreviews: resolvedUrls.length ? resolvedUrls : imagesToSend.map(img => img.previewUrl).filter(Boolean),
        status: 'sending',
      }];
    }
    const userIdx = thread.length - 1;
    setMessages(thread);

    let streamStarted = false;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: thread.map(m => ({ role: m.role, content: m.content })),
          sessionId: currentSessionId,
          model: selectedModel,
          imageUrls: resolvedUrls,
        }),
      });

      if (!res.ok) {
        let message = "Couldn't get a reply.";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch { /* non-JSON error body */ }
        throw new Error(message);
      }

      // Accepted: mark the user message sent and stream the reply in
      setMessages(prev => [
        ...prev.map((m, i) => (i === userIdx ? { ...m, status: 'sent', error: null } : m)),
        { role: 'assistant', content: '' },
      ]);
      streamStarted = true;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let currentResponse = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        currentResponse += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: currentResponse };
          return next;
        });
      }

      loadSessions(false); // pick up auto-generated titles / ordering
    } catch (err) {
      console.error('Chat error:', err);
      if (streamStarted) {
        // The full reply is already saved server-side; offer a reload.
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], interrupted: true };
          return next;
        });
      } else {
        setMessages(prev => prev.map((m, i) => (i === userIdx ? { ...m, status: 'failed', error: friendlyError(err) } : m)));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const retryMessage = (idx) => sendMessage(undefined, null, idx);

  // Put a failed message back into the composer for editing
  const editFailedMessage = (idx) => {
    const failed = messages[idx];
    if (!failed) return;
    setMessages(prev => prev.filter((_, i) => i !== idx));
    const isAutoPrompt = failed.content === RECEIPT_PROMPT_ONE || /^Please scan these \d+ receipt/.test(failed.content || '');
    setInput(isAutoPrompt ? '' : failed.content || '');
    if (failed.imageUrls?.length) {
      setAttachedImages(failed.imageUrls.map((url, i) => ({
        id: `retry_${Date.now()}_${i}`,
        previewUrl: url,
        url,
        name: `Receipt ${i + 1}`,
        sizeStr: '',
        status: 'ready',
      })));
    }
  };


  // Toggle Live Speech-to-Text (Sarvam AI Saaras v3 + Web Speech Fallback)
  const toggleSpeechRecognition = async () => {
    if (typeof window === 'undefined') return;

    if (isListening) {
      // User is stopping recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) { }
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
      setIsListening(false);
      return;
    }

    // Try Sarvam AI Audio Recording via MediaRecorder
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];

        // Pick supported mime type with safe fallbacks
        let mediaRecorder;
        try {
          let mimeType = '';
          if (typeof MediaRecorder.isTypeSupported === 'function') {
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
              mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
              mimeType = 'audio/webm';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
              mimeType = 'audio/mp4';
            }
          }
          mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        } catch (recErr) {
          mediaRecorder = new MediaRecorder(stream);
        }

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Stop all mic tracks
          stream.getTracks().forEach(track => {
            try { track.stop(); } catch (e) { }
          });

          if (audioChunksRef.current.length === 0) return;

          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
          setIsTranscribingAudio(true);
          setError('');

          try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'speech.webm');

            const res = await fetch('/api/audio/transcribe', {
              method: 'POST',
              body: formData,
            });

            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data.transcript) {
                setInput(prev => prev ? `${prev} ${data.transcript}` : data.transcript);
              }
            } else {
              const errData = await res.json().catch(() => ({}));
              console.warn('Sarvam transcription fallback:', errData?.error);
            }
          } catch (sttErr) {
            console.error('Sarvam STT Error:', sttErr);
          } finally {
            setIsTranscribingAudio(false);
          }
        };

        mediaRecorder.start(200);
        setIsListening(true);
        setError('');
        return;
      } catch (micErr) {
        console.warn('MediaRecorder mic access error, falling back to Web Speech API:', micErr);
      }
    }

    // Fallback: Web Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Microphone access is not supported in this browser. Please enable microphone permissions or use Chrome/Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      try {
        recognition.lang = 'hi-IN'; // Multi-lingual (Hindi & Indian English)
      } catch (e) {
        try { recognition.lang = 'en-US'; } catch (e2) { }
      }
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setError('');
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setInput(currentTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setError(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech init error:', err);
      setIsListening(false);
    }
  };

  // Sarvam AI Text-to-Speech (Bulbul v3 / Web Speech Synthesis fallback)
  const handleSpeak = async (rawText, idx) => {
    if (typeof window === 'undefined') return;
    // Never read chart JSON aloud
    const text = stripChartsForSpeech(rawText);

    // If already speaking this message, stop it
    if (speakingMsgIdx === idx) {
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
        activeAudioPlayerRef.current = null;
      }
      window.speechSynthesis?.cancel();
      setSpeakingMsgIdx(null);
      return;
    }

    // Stop any active playing audio
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      activeAudioPlayerRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setAudioLoadingMsgIdx(idx);
    setError('');

    try {
      // 1. Attempt high-fidelity Sarvam AI Bulbul v3 Text-to-Speech
      const res = await fetch('/api/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          language_code: 'hi-IN',
          speaker: 'shubh',
          pace: 1.05,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio) {
          const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
          activeAudioPlayerRef.current = audio;

          audio.onended = () => {
            setSpeakingMsgIdx(null);
            activeAudioPlayerRef.current = null;
          };

          audio.onerror = () => {
            setSpeakingMsgIdx(null);
            activeAudioPlayerRef.current = null;
          };

          setSpeakingMsgIdx(idx);
          await audio.play();
          setAudioLoadingMsgIdx(null);
          return;
        }
      }
    } catch (sarvamErr) {
      console.warn('Sarvam TTS unavailable, falling back to browser Web Speech:', sarvamErr);
    } finally {
      setAudioLoadingMsgIdx(null);
    }

    // 2. Fallback to Browser Speech Synthesis
    if (window.speechSynthesis) {
      const cleanText = text
        .replace(/```json:transaction_proposal[\s\S]*?```/g, 'I have prepared a transaction approval list below for your review.')
        .replace(/[*_#`]/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeakingMsgIdx(null);
      utterance.onerror = () => setSpeakingMsgIdx(null);

      setSpeakingMsgIdx(idx);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Copy transcript to clipboard
  const handleCopyTranscript = (text, idx) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(replaceChartsWithText(text, user?.currency));
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 2000);
    }
  };

  // Cleanup speech synthesis & audio player on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis?.cancel();
        if (activeAudioPlayerRef.current) {
          activeAudioPlayerRef.current.pause();
        }
        recognitionRef.current?.stop();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }
    };
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    sendMessage();
  };

  const pickSuggestion = (s) => {
    if (s.isImagePrompt) {
      fileInputRef.current?.click();
      return;
    }
    sendMessage(s.text);
  };

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center bg-canvas">
        <Icon3D name="assistant" size={64} className="animate-pulse" />
      </div>
    );
  }

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const firstName = (user?.displayName || user?.name || '').split(' ')[0];
  const sidebarProps = {
    sessions,
    activeSessionId,
    isLoading: isLoadingSessions,
    onSelect: selectSession,
    onCreate: handleCreateSession,
    onDelete: handleDeleteSession,
  };

  return (
    <div className="relative flex h-[calc(100dvh-var(--app-header-h))] flex-col overflow-hidden bg-canvas text-ink">

      <div data-ui="v2" className="flex min-h-0 flex-1">
        {/* Desktop history panel */}
        <aside
          className={`hidden md:block shrink-0 overflow-hidden border-line bg-card/70 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isSidebarOpen ? 'w-72 border-r' : 'w-0'
          }`}
          aria-hidden={!isSidebarOpen}
        >
          <div className="h-full w-72">
            <ChatSidebar {...sidebarProps} />
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {/* Chat header */}
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-canvas/80 px-3 backdrop-blur-xl md:px-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(o => !o)}
              className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 hover:bg-card-2 hover:text-ink cursor-pointer"
              aria-label={isSidebarOpen ? 'Hide chat history' : 'Show chat history'}
              title={isSidebarOpen ? 'Hide history' : 'Show history'}
            >
              {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileHistoryOpen(true)}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 hover:bg-card-2 cursor-pointer"
              aria-label="Open chat history"
            >
              <History className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{activeSession?.title || 'New chat'}</p>
              <p className="text-[11px] text-ink-3">Money assistant</p>
            </div>

            <label htmlFor="model-select" className="sr-only">AI model</label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={isGenerating}
              className="h-9 max-w-[128px] md:max-w-[180px] truncate rounded-xl border border-line bg-card px-2 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              {AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button
              type="button"
              onClick={handleCreateSession}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-ink hover:brightness-95 dark:hover:brightness-125 cursor-pointer"
              aria-label="New chat"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Thread */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-5 md:py-8">
              {isLoadingMessages ? (
                <div className="space-y-5" aria-busy="true">
                  {[0.6, 0.85, 0.45].map((w, i) => (
                    <div key={i} className={`flex ${i % 2 ? 'justify-start' : 'justify-end'}`}>
                      <span className="block h-12 rounded-2xl bg-card-3 animate-pulse" style={{ width: `${w * 100}%` }} />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 && !isGenerating ? (
                <WelcomeScreen name={firstName} onPick={pickSuggestion} />
              ) : (
                messages.map((msg, idx) => {
                  const isStreamingCurrent = msg.role === 'assistant' && isGenerating && idx === messages.length - 1;
                  if (msg.role === 'assistant' && !msg.content && isStreamingCurrent) return null;
                  return (
                    <MessageItem
                      key={msg.id || `m-${idx}`}
                      msg={msg}
                      isStreaming={isStreamingCurrent}
                      currency={user?.currency}
                      onRetry={() => retryMessage(idx)}
                      onEdit={() => editFailedMessage(idx)}
                      onReload={() => loadMessages(activeSessionId)}
                      onSpeak={() => handleSpeak(msg.content, idx)}
                      speaking={speakingMsgIdx === idx}
                      audioLoading={audioLoadingMsgIdx === idx}
                      onCopy={() => handleCopyTranscript(msg.content, idx)}
                      copied={copiedMsgIdx === idx}
                      onImageClick={setLightboxImage}
                      onProposalCreated={() => loadSessions(false)}
                    />
                  );
                })
              )}
              {isThinking && <ThinkingIndicator step={thinkingStep} />}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Composer (clears the mobile dock unless the keyboard is open) */}
          <div className={`shrink-0 px-3 pt-2 md:px-4 ${isKeyboardOpen ? 'pb-2' : 'pb-[calc(92px+env(safe-area-inset-bottom))] md:pb-4'}`}>
            <div className="mx-auto w-full max-w-3xl space-y-2">
              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-line bg-card p-2.5 pl-3 shadow-card">
                  <ErrorState compact title={error} onRetry={errorRetry ? () => errorRetry() : undefined} className="flex-1" />
                  <button
                    type="button"
                    onClick={() => { setError(''); setErrorRetry(null); }}
                    className="rounded-lg p-1.5 text-ink-3 hover:bg-card-2 hover:text-ink cursor-pointer"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <Composer
                input={input}
                setInput={setInput}
                onSubmit={handleFormSubmit}
                onPaste={handlePaste}
                attachedImages={attachedImages}
                onRemoveImage={handleRemoveAttachedImage}
                onRetryUpload={handleRetryUpload}
                onClearImages={handleClearAllImages}
                onOpenImage={setLightboxImage}
                fileInputRef={fileInputRef}
                onImageSelect={handleImageSelect}
                isProcessingImage={isProcessingImage}
                isListening={isListening}
                isTranscribing={isTranscribingAudio}
                onToggleMic={toggleSpeechRecognition}
                isGenerating={isGenerating}
                disabled={isGenerating || isLoadingMessages}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Mobile history drawer */}
      <AnimatePresence>
        {mobileHistoryOpen && isMobile && (
          <div data-ui="v2" className="fixed inset-0 z-[90] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileHistoryOpen(false)}
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Chat history"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[340px] flex-col bg-card shadow-pop"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="flex h-14 items-center justify-between border-b border-line px-4">
                <span className="inline-flex items-center gap-2 font-display text-base font-bold text-ink">
                  <Icon3D name="chat" size={22} /> Chats
                </span>
                <button type="button" onClick={() => setMobileHistoryOpen(false)} className="rounded-lg p-2 text-ink-2 hover:bg-card-2 cursor-pointer" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <ChatSidebar {...sidebarProps} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            data-ui="v2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
            onClick={() => setLightboxImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Receipt preview"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxImage} alt="Receipt preview" className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-pop" />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute right-4 top-4 rounded-full bg-card p-2 text-ink shadow-pop cursor-pointer"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
