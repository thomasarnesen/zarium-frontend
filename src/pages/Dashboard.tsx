import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileSpreadsheet, Download, Sparkles, Upload, Lock, HelpCircle, ArrowRight } from 'lucide-react';
import { SpreadsheetViewer } from '../components/SpreadsheetViewer';
import { useAuthStore } from '../store/authStore';
import { config } from '../config';
import { Switch } from '../components/ui/switch';
import api from '../utils/api';

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
  const { selectedType } = (location.state as LocationState) || {};
  const { user, planType, tokens, useTokens, refreshUserData, enhancedMode, toggleEnhancedMode } = useAuthStore();
  const token = user?.token;
  const isBasicPlan = planType === 'Basic';  
  const canUseEnhancedMode = !isBasicPlan;

  const [prompt, setPrompt] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('excel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formatting, setFormatting] = useState<FormattingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileInfo[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);

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
    const fetchEmptyPreview = async () => {
      try {
        console.log("Fetching empty preview...");
        const response = await api.fetch('/get-empty-excel');
        const data = await response.json();
        
        if (data.previewImage) {
          console.log("Received preview image, setting state");
          setPreviewImage(data.previewImage);
        } else {
          console.error("No preview image in response");
          setError('No preview image available');
        }
      } catch (error) {
        console.error("Error fetching preview:", error);
        setError('Failed to load preview template');
      }
    };

    fetchEmptyPreview();
  }, []); // Kjør bare én gang ved oppstart

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let currentPhase = 0;
    const phases = [
      { name: 'Processing', minDuration: 7000, maxDuration: 10000 },
      { name: 'Thinking', minDuration: 8000, maxDuration: 13000 },
      { name: 'Generating', minDuration: 7000, maxDuration: 12000 },
      { name: 'Finalizing', minDuration: 3000, maxDuration: 6000 }
    ];

    const getRandomDuration = (min: number, max: number) => {
      return Math.floor(Math.random() * (max - min + 1) + min);
    };

    const updateStatus = () => {
      if (currentPhase < phases.length) {
        const phase = phases[currentPhase];
        setGenerationStatus(phase.name);
        currentPhase++;
        
        if (currentPhase < phases.length) {
          setTimeout(updateStatus, getRandomDuration(phase.minDuration, phase.maxDuration));
        }
      }
    };

    if (isGenerating && !sessionId) {
      currentPhase = 0;
      updateStatus();
    }

    
    if (sessionId && isGenerating) {
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
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isGenerating, sessionId, token]);

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

  const getRandomDuration = () => {
    return Math.floor(Math.random() * (11000 - 5000 + 1) + 5000); 
  };

  const getRandomThinkingDuration = () => {
    return Math.floor(Math.random() * (4000 - 1000 + 1) + 1000); 
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
  
    setIsGenerating(true);
    setError(null);
    setFormatting(null);
  
    try {
      // Forny token før generering
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

      // Refresh user data etter vellykket generering
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
      <div className="py-16">
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
                        ? "Enhanced mode is available in Plus and Pro plans. Upgrade to access more advanced and detailed spreadsheets."
                        : "Generates more advanced and detailed spreadsheets. Better for complex tasks and business logic. Takes longer to generate and uses more tokens."}
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
              <a href="/pricing" className="underline ml-1">Upgrade now</a>
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



