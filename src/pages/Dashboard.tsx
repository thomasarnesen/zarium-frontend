import React, { useState, useEffect, useRef } from 'react';
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
  const isDemoPlan = planType === 'Demo';
  const canUseEnhancedMode = !isBasicPlan && !isDemoPlan;
  const [greeting, setGreeting] = useState('');
  const [firstMessageSent, setFirstMessageSent] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('excel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formatting, setFormatting] = useState<FormattingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileInfo[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs for the textarea and buttons
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  
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
        timeGreeting = 'Happy late night';
      }
      
      // Use displayName with underscores converted to spaces
      const displayName = user?.displayName 
        ? user.displayName.replace(/_/g, ' ') 
        : '';
      
      setGreeting(`${timeGreeting}, ${displayName}`);
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
    } else if (user && user.displayName) {
  
    }
  }, [user, navigate]);

  useEffect(() => {
    // Refresh user data on component mount
    refreshUserData();
  }, [refreshUserData]);

  // Update spacing based on UI state
  useEffect(() => {
    if (previewImage || error) {
      setFirstMessageSent(true);
    }
  }, [previewImage, error]);

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
      setFirstMessageSent(true);
    }
  }, [previewImage]);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setFirstMessageSent(true);
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

    } catch (error: any) {
      console.error('Generation error:', error);
      setError(error.message || 'Failed to generate document. Please try again.');
      setIsGenerating(false);
      setGenerationStatus('');
      setSessionId(null);
    }
  };

  // Add function to fetch recent spreadsheets

  


  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className={`container mx-auto px-4 transition-all duration-500 ${firstMessageSent ? 'pt-6' : 'pt-24'}`}>
        {/* Header with greeting - visible before first message */}
        <div className={`text-center mb-12 transition-opacity duration-500 ${firstMessageSent ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
          <h1 className="text-4xl font-light text-emerald-800 dark:text-emerald-200">
            {greeting}
          </h1>
        </div>
        
        {/* Input Form */}
        <div className="max-w-3xl mx-auto mb-6">
          <div className="relative w-full">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              placeholder="How can I help you today?"
              className="w-full px-5 py-4 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-white min-h-[120px] pb-14 resize-none outline-none shadow-sm"
              style={{ height: 'auto', minHeight: '120px' }}
              ref={promptTextareaRef}
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
                      title={isDemoPlan ? "Demo users can't use enhanced mode. Upgrade to Plus or Pro." : "Upgrade to Plus or Pro to use enhanced mode"}
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
                      {isBasicPlan || isDemoPlan
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

          {/* Selected files display */}
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
          
          {/* Tokens display - centered */}
          <div className="text-center text-emerald-700 dark:text-emerald-300 mt-4">
            Available Tokens: <span className="font-semibold">{tokens.toLocaleString()}</span>
          </div>
        </div>
        

        {/* Error display */}
        {error && (
          <div className="max-w-3xl mx-auto mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Spreadsheet Viewer - smaller gap here */}
        <div className="max-w-6xl mx-auto mt-4">
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
