import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Download, Sparkles, Upload, Lock, HelpCircle, ArrowRight } from 'lucide-react';
import { SpreadsheetViewer } from '../components/SpreadsheetViewer';
import { useAuthStore } from '../store/authStore';
import { config } from '../config';
import { Switch } from '../components/ui/switch';
import api from '../utils/api';

// Define types for global window
declare global {
  interface Window {
    tokenRefreshInterval?: NodeJS.Timeout;
  }
}

type DocumentType = 'excel';

interface LocationState {
  selectedType?: DocumentType;
}

interface FormattingInfo {
  hasChart: boolean;
  downloadUrl: string;
}

interface SelectedFileInfo {
  file: File;
  id: string;
  name: string;
}

const TOKENS_PER_GENERATION = 1000;
const TOKENS_PER_UPLOAD = 500;

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedType } = (location.state as LocationState) || {};
  const { user, planType, tokens, useTokens, refreshUserData, enhancedMode, toggleEnhancedMode } = useAuthStore();
  const token = user?.token;
  const isAuthenticated = !!user;
  const isBasicPlan = planType === 'Basic';  
  const canUseEnhancedMode = !isBasicPlan;
  const [greeting, setGreeting] = useState('');

  const [prompt, setPrompt] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('excel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formatting, setFormatting] = useState<FormattingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileInfo[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Admin automation state and refs
  const [adminText, setAdminText] = useState('');
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationStep, setAutomationStep] = useState('idle');
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const downloadSignalRef = useRef<{resolve: () => void} | null>(null);
  
  // Screen recording state and refs
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  
  // Generate time-based greeting
  useEffect(() => {
    const generateGreeting = () => {
      const hour = new Date().getHours();
      let timeGreeting = '';
      
      if (hour >= 5 && hour < 12) {
        timeGreeting = 'Good morning';
      } else if (hour >= 12 && hour < 17) {
        timeGreeting = 'Good afternoon';
      } else if (hour >= 17 && hour < 21) {
        timeGreeting = 'Good evening';
      } else {
        timeGreeting = 'Good night';
      }
      
      // No fallback - if missing displayName, redirect to welcome page in a separate effect
      setGreeting(`${timeGreeting}, ${user?.displayName || ''}`);
    };
    
    generateGreeting();
    
    // Update greeting every minute
    const interval = setInterval(generateGreeting, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Add this effect to redirect to welcome page if no display name
  useEffect(() => {
    if (user && (!user.displayName || user.displayName === 'unknown')) {
      navigate('/welcome');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Refresh user data on component mount
    refreshUserData();
  }, [refreshUserData]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const success = queryParams.get('success');
    const sessionId = queryParams.get('session_id');
    
    if (success === 'true' && sessionId && user?.token) {
      console.log("Dashboard detected successful payment redirect, refreshing user data...");
      
      refreshUserData()
        .then(() => {
          console.log("User data refreshed after successful payment");
          window.history.replaceState({}, document.title, location.pathname);
        })
        .catch(err => {
          console.error("Failed to refresh user data", err);
        });
    }
  }, [location, user, refreshUserData]);

  useEffect(() => {
    if (selectedType) {
      setDocumentType(selectedType);
    }
  }, [selectedType]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let timeouts: NodeJS.Timeout[] = [];
    let isMounted = true;
    
    // Define all the messages we want to show in sequence
    const messages = [
      'Processing',
      'Analyzing your requirements...',
      'Thinking',
      'Designing spreadsheet structure...',
      'Generating',
      'Generating Excel file...',
      'Finalizing'
    ];

    // Clear all timeouts on unmount or when dependencies change
    const clearAllTimeouts = () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      timeouts = [];
    };
    
    // Create a fixed schedule for status updates to ensure all messages are seen
    const scheduleStatusUpdates = () => {
      if (!isGenerating || sessionId) return;
      
      clearAllTimeouts(); // Clear any existing timeouts
      
      // Display each message for a specific duration
      messages.forEach((message, index) => {
        const timeout = setTimeout(() => {
          if (!isMounted) return;
          setGenerationStatus(message);
        }, index * 6000); // Show each message for ~6 seconds
        
        timeouts.push(timeout);
      });
    };

    if (isGenerating && !sessionId) {
      scheduleStatusUpdates();
    }
    
    if (sessionId && isGenerating) {
      // Existing polling code
      pollInterval = setInterval(async () => {
        try {
          const response = await api.fetch(`/generation-status/${sessionId}`);
          const data = await response.json();
          
          if (data.status === "Complete") {
            setIsGenerating(false);
            setSessionId(null);
            if (data.previewImage) setPreviewImage(data.previewImage);
            if (data.formatting) setFormatting(data.formatting);
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 1000);
    }

    return () => {
      isMounted = false;
      clearAllTimeouts();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isGenerating, sessionId, token]);

  useEffect(() => {
    // Short delay to ensure authentication status is updated
    const checkAuth = setTimeout(() => {
      if (!isAuthenticated) {
        navigate('/login');
      }
    }, 100);
    
    return () => clearTimeout(checkAuth);
  }, [isAuthenticated, navigate]);

  // Add an effect to automatically stop loading when the preview image arrives
  useEffect(() => {
    if (previewImage) {
      // Stop the loading state and all status indicators when preview image is received
      setIsGenerating(false);
      setGenerationStatus('');
      setSessionId(null);
    }
  }, [previewImage]);

  // Add CSS for cursor and button effects
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      
      .cursor-element.pulse-effect {
        animation: pulse 0.3s ease-in-out;
      }
      
      .download-button:hover {
        background-color: #f0fdf4 !important;
        color: #047857 !important;
      }
      
      .dark .download-button:hover {
        background-color: rgba(6, 78, 59, 0.2) !important;
        color: #34d399 !important;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const currentPlanType = user?.planType;
    
   
    if (currentPlanType === 'Plus' || currentPlanType === 'Pro') {
        const files = event.target.files;
        if (files) {
            const totalCost = files.length * TOKENS_PER_UPLOAD;
            if (!useTokens(totalCost)) {
                setError('Insufficient tokens for file upload');
                return;
            }

            const newFiles = Array.from(files).map(file => ({
                file,
                id: Math.random().toString(36).substr(2, 9),
                name: file.name
            }));
            setSelectedFiles(prev => [...prev, ...newFiles]);
        }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isBasicPlan) {
      setError('Upgrade to Plus or Pro to paste images');
      return;
    }
    
    const items = e.clipboardData.items;
    let imageCount = 0;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        imageCount++;
      }
    }

    if (imageCount > 0) {
      const totalCost = imageCount * TOKENS_PER_UPLOAD;
      if (!useTokens(totalCost)) {
        setError('Insufficient tokens for image paste');
        return;
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const newFile = {
              file,
              id: Math.random().toString(36).substr(2, 9),
              name: `Pasted Image ${new Date().toLocaleTimeString()}`
            };
            setSelectedFiles(prev => [...prev, newFile]);
            setPrompt(prev => prev + `\n[Image "${newFile.name}" added]`);
          }
        }
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (isBasicPlan) {
      setError('Upgrade to Plus or Pro to drop files');
      return;
    }
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      const totalCost = imageFiles.length * TOKENS_PER_UPLOAD;
      if (!useTokens(totalCost)) {
        setError('Insufficient tokens for file upload');
        return;
      }
    }

    const newFiles = imageFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name
    }));
    
    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setPrompt(prev => prev + `\n[${newFiles.length} images added]`);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  // Admin automation helper functions
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const animateCursor = async (cursor: HTMLDivElement, toX: number, toY: number) => {
    const fromX = parseInt(cursor.style.left);
    const fromY = parseInt(cursor.style.top);
    const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
    const duration = Math.min(800, distance * 1); // Faster for longer distances
    const steps = 60; // Increased from 30 to 60 for smoother animation
    
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      // Use easeOutQuad for smoother start/stop
      const easeRatio = ratio < 0.5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2;
      
      const x = fromX + (toX - fromX) * easeRatio;
      const y = fromY + (toY - fromY) * easeRatio;
      
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      
      await sleep(duration / steps);
    }
  };

  // Function to go directly to download
  const goToDownload = useCallback(async () => {
    if (downloadSignalRef.current) {
      downloadSignalRef.current.resolve();
    }
  }, []);

  // Function to toggle screen recording
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
      return;
    }

    try {
      // Start recording
      const displayMediaOptions = {
        video: {
          width: 1920,
          height: 1080,
          frameRate: 30
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      const recorder = new MediaRecorder(stream);
      
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        
        // Create video file from recording
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `excel-generator-recording-${new Date().toISOString()}.webm`;
        a.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting screen recording:", error);
      setIsRecording(false);
    }
  };

  // Admin automation main function
  const runAutomation = useCallback(async () => {
    if (!adminText || !promptTextareaRef.current || !generateButtonRef.current || !cursorRef.current) return;
    
    setIsAutomating(true);
    setAutomationStep('starting');
    
    // Create animated cursor element
    const cursor = cursorRef.current;
    cursor.style.display = 'block';
    
    // Set initial position (top of the screen)
    cursor.style.top = '100px';
    cursor.style.left = '50%';
    
    try {
      console.log("Starting automation sequence");
      
      // First part - typing the text and generating
      setAutomationStep('typing');
      
      // Move cursor to the textarea - position it better in the center
      const textareaRect = promptTextareaRef.current.getBoundingClientRect();
      // Calculate center of textarea with a slight offset toward the middle
      const textareaCenterX = textareaRect.left + textareaRect.width * 0.3;
      const textareaCenterY = textareaRect.top + textareaRect.height * 0.5; // Changed from 0.3 to 0.5
      await animateCursor(cursor, textareaCenterX, textareaCenterY);
      
      // Click on the textarea
      promptTextareaRef.current.focus();
      console.log("Focused on textarea");
      await sleep(500);
      
      // Type text character by character
      setPrompt(''); // Clear existing prompt
      const typingDelay = Math.min(20, 2000 / adminText.length); // Adjust typing speed based on text length
      
      console.log("Starting to type text");
      for (let i = 0; i < adminText.length; i++) {
        setPrompt(prev => prev + adminText[i]);
        await sleep(typingDelay);
      }
      console.log("Finished typing text");
      
      await sleep(500);
      
      // Move cursor to generate button
      const buttonRect = generateButtonRef.current.getBoundingClientRect();
      await animateCursor(cursor, buttonRect.left + buttonRect.width/2, buttonRect.top + buttonRect.height/2);
      
      // Click on generate button
      await sleep(300);
      console.log("Clicking generate button");
      generateButtonRef.current.click();
      
      // Wait for the download signal button to be clicked
      setAutomationStep('waitingForDownloadSignal');
      console.log("Waiting for 'Go to Download' button to be clicked");
      
      // Create a promise that will resolve when the Go to Download button is clicked
      await new Promise<void>((resolve) => {
        downloadSignalRef.current = { resolve };
      });
      
      // Once we get here, the download button was clicked
      setAutomationStep('downloading');
      console.log("Going to download button");
      
      // Now, find the download button
      console.log("Looking for download button");
      const downloadButton = document.querySelector('.download-button') as HTMLButtonElement;
      if (downloadButton) {
        console.log("Found download button, disabled:", downloadButton.disabled);
        const downloadRect = downloadButton.getBoundingClientRect();
        
        // Move to the download button
        await animateCursor(
          cursor, 
          downloadRect.left + downloadRect.width/2, 
          downloadRect.top + downloadRect.height/2
        );
        
        // Manually change background color and color to show hover effect
        const isDarkMode = document.documentElement.classList.contains('dark');
        downloadButton.style.backgroundColor = isDarkMode ? 'rgba(6, 78, 59, 0.2)' : '#f0fdf4';
        downloadButton.style.color = isDarkMode ? '#34d399' : '#047857';
        await sleep(300);
        
        // Click effect
        if (!downloadButton.disabled) {
          console.log("Clicking download button");
          
          cursor.classList.add('pulse-effect');
          downloadButton.style.transform = 'scale(0.95)'; // Small click effect
          await sleep(200);
          
          downloadButton.click();
          
          await sleep(200);
          downloadButton.style.transform = '';
          cursor.classList.remove('pulse-effect');
          
          // Reset styles after click
          await sleep(300);
          downloadButton.style.backgroundColor = '';
          downloadButton.style.color = '';
          
          // Wait for the download dialog to appear
          await sleep(1500);
        } else {
          console.log("Download button is disabled, cannot click");
        }
      } else {
        console.log("Download button not found");
        
        // Try a more generic selector as fallback
        const downloadIconButton = document.querySelector('button:has(.lucide-download)');
        if (downloadIconButton) {
          console.log("Found download button by icon");
          const buttonRect = (downloadIconButton as HTMLElement).getBoundingClientRect();
          
          await animateCursor(
            cursor,
            buttonRect.left + buttonRect.width/2,
            buttonRect.top + buttonRect.height/2
          );
          
          // Simulate hover
          const mouseoverEvent = new MouseEvent('mouseover', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          downloadIconButton.dispatchEvent(mouseoverEvent);
          await sleep(300);
          
          // Add pulse effect
          cursor.classList.add('pulse-effect');
          (downloadIconButton as HTMLElement).style.transform = 'scale(0.95)';
          await sleep(200);
          
          console.log("Clicking download button (by icon)");
          (downloadIconButton as HTMLElement).click();
          
          await sleep(200);
          (downloadIconButton as HTMLElement).style.transform = '';
          cursor.classList.remove('pulse-effect');
          
          await sleep(1500);
        }
      }
      
      // Complete automation
      console.log("Automation sequence complete");
      
    } catch (error) {
      console.error("Automation error:", error);
    } finally {
      // Clean up regardless of success or error
      await sleep(1000);
      cursor.style.display = 'none';
      setIsAutomating(false);
      setAutomationStep('idle');
      downloadSignalRef.current = null;
    }
    
  }, [adminText]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
  
    setIsGenerating(true);
    setError(null);
    setFormatting(null);
  
    try {
      // Refresh token before generation
      const tokenResponse = await api.fetch('/refresh-token', {
        method: 'POST',
        credentials: 'include'
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh session');
      }

      const endpoint = selectedFiles.length > 0 ? '/generate-macro-with-file' : '/generate-macro';
      
      const requestOptions: RequestInit = {
        method: 'POST',
        credentials: 'include'
      };

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((fileInfo, index) => {
          formData.append(`file${index}`, fileInfo.file);
        });
        formData.append('prompt', prompt);
        formData.append('format', 'xlsx');
        formData.append('fileCount', selectedFiles.length.toString());
        formData.append('enhancedMode', enhancedMode.toString());
        requestOptions.body = formData;
      } else {
        requestOptions.headers = {
          'Content-Type': 'application/json',
        };
        requestOptions.body = JSON.stringify({
          prompt,
          format: 'xlsx',
          enhancedMode
        });
      }

      const response = await api.fetch(endpoint, requestOptions);
      const result = await response.json();
      await handleGenerationResult(result);

    } catch (error: any) {
      console.error('Generation error:', error);
      setError(error.message || 'Failed to generate document. Please try again.');
      setIsGenerating(false);
      setGenerationStatus('');
      setSessionId(null);
    }
  };

  const handleGenerationResult = async (result: any) => {
    try {
      if (result.error) {
        throw new Error(result.error);
      }

      if (result.previewImage) {
        setPreviewImage(result.previewImage);
      }
      
      if (result.formatting) {
        setFormatting(result.formatting);
      }

      // Refresh user data after successful generation
      await refreshUserData();

    } catch (error) {
      console.error('Error handling generation result:', error);
      throw error;
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
      setSessionId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Admin cursor element */}
      {user?.isAdmin && (
        <div 
          ref={cursorRef}
          style={{
            position: 'fixed',
            width: '32px',
            height: '32px',
            // White fill cursor
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Cpath d=\'M8.5,2 L8.5,25 L13,20 L19,24 L19,19 L13,15 L8.5,20 Z\' fill=\'white\' stroke=\'black\' stroke-width=\'1\'/%3E%3C/svg%3E")',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            zIndex: 10000,
            pointerEvents: 'none',
            display: 'none',
            filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))'
          }}
          className="cursor-element"
        />
      )}
      
      <div className="container mx-auto px-4 pt-8 pb-6">
        <h1 className="text-3xl font-bold text-emerald-800 dark:text-emerald-200 mb-8">
          {greeting}
        </h1>
      </div>
      
      <div className="py-16">
        {/* Admin panel */}
        {user?.isAdmin && (
          <div className="container mx-auto px-4 py-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg mb-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-4">
                Admin Automation 
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs font-medium">
                  Admin Only
                </span>
              </h2>
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={adminText}
                    onChange={(e) => setAdminText(e.target.value)}
                    placeholder="Enter text to automate..."
                    className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-white"
                    disabled={isAutomating}
                  />
                  <button
                    onClick={runAutomation}
                    disabled={isAutomating || !adminText.trim()}
                    className={`px-4 py-2 rounded-lg ${
                      isAutomating || !adminText.trim() 
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isAutomating ? 'Running...' : 'Run Automation'}
                  </button>
                  {isAutomating && (
                    <button
                      onClick={goToDownload}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                    >
                      Go to Download
                    </button>
                  )}
                  <button
                    onClick={toggleRecording}
                    className={`px-4 py-2 rounded-lg ${
                      isRecording 
                        ? 'bg-red-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isRecording ? 'Stop Recording' : 'Record Screen (1080p)'}
                  </button>
                </div>
                {automationStep !== 'idle' && (
                  <div className="text-sm px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-md">
                    Current step: <span className="font-medium">{automationStep}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center px-4 py-2 mb-8 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">AI-Powered Generation</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-6 text-emerald-800 dark:text-emerald-200">
              Excel Generator
            </h1>
            <p className="text-lg text-emerald-800 dark:text-emerald-300">
              Create professional spreadsheets with AI.<br />
              Just describe what you need.
            </p>
            <div className="mt-4 text-emerald-600 dark:text-emerald-400">
              Available Tokens: {tokens.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-3xl mx-auto mb-12">
          <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-4 text-center">
            Describe Your Spreadsheet
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="relative w-full">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              placeholder="E.g., Create a monthly budget tracker with income and expense categories..."
              className="w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-white min-h-[120px] pb-14 resize-none outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
              style={{ height: 'auto', minHeight: '120px' }}
              ref={promptTextareaRef}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {user?.planType !== 'Demo' && user?.planType !== 'Basic' ? (
                  <label className="cursor-pointer">
                    <Upload 
                      className="h-4 w-4 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv,.ods,image/*" 
                      onChange={handleFileChange}
                      multiple
                      aria-label="Upload files"
                    />
                  </label>
                ) : (
                  <div
                    className="cursor-not-allowed"
                    title="Upgrade to Plus or Pro to upload files"
                  >
                    <Upload className="h-4 w-4 text-gray-400" />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {canUseEnhancedMode ? (
                    <Switch
                      checked={enhancedMode}
                      onCheckedChange={toggleEnhancedMode}
                      className="data-[state=checked]:bg-emerald-600 h-4 w-7"
                    />
                  ) : (
                    <div
                      className="cursor-not-allowed"
                      title="Upgrade to Plus or Pro to use enhanced mode"
                    >
                      <Switch
                        checked={false}
                        disabled
                        className="opacity-50 h-4 w-7"
                      />
                    </div>
                  )}
                  <span className="text-sm text-emerald-700 dark:text-emerald-300">
                    Enhanced
                  </span>
                  <div 
                    className="relative group"
                    title="Enhanced mode information"
                  >
                    <HelpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-emerald-100 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
                      {isBasicPlan 
                        ? "Enhanced Mode delivers more reliable and complex spreadsheets, exclusive to Plus and Pro plans."
                        : "Enhanced Mode delivers more reliable and complex spreadsheets, exclusive to Plus and Pro plans. Uses more tokens per generation. Ideal for important projects where quality matters most."}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className={`p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors ${
                  isGenerating || !prompt.trim() 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
                aria-label="Generate Excel"
                ref={generateButtonRef}
              >
                <ArrowRight className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-1">
              {selectedFiles.map((fileInfo) => (
                <div 
                  key={fileInfo.id}
                  className="flex items-center justify-between py-1 px-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-sm"
                >
                  <span className="text-emerald-800 dark:text-emerald-200 truncate">
                    {fileInfo.name}
                  </span>
                  <button
                    onClick={() => setSelectedFiles(prev => 
                      prev.filter(f => f.id !== fileInfo.id)
                    )}
                    className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {isBasicPlan && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg text-center">
              <Lock className="h-4 w-4 inline-block mr-2" />
              File upload is available in Plus and Pro plans. 
              <a href="/subscription" className="underline ml-1">Upgrade now</a>
            </div>
          )}
        </div>

        <div className="max-w-6xl mx-auto px-4">
          <SpreadsheetViewer 
            previewImage={previewImage} 
            isGenerating={isGenerating} 
            generationStatus={generationStatus} 
            formatting={formatting}
            planType={user?.planType}
          />
        </div>
      </div>
    </div>
  );
}