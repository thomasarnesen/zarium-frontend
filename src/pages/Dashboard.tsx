import React, { useEffect, useState, useRef, MouseEvent, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Download, Sparkles, Upload, Lock, HelpCircle, ArrowRight, Palette, Check, History } from 'lucide-react';
import { SpreadsheetViewer } from '../components/SpreadsheetViewer';
import { SessionSelector } from '../components/SessionSelector';
import { useAuthStore } from '../store/authStore';
import { config } from '../config';
import { Switch } from '../components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import api from '../utils/api';

// Define types for global window
declare global {
  interface Window {
    tokenRefreshInterval?: NodeJS.Timeout;
  }
}

type DocumentType = 'excel';
type ModelMode = 'Creative' | 'Normal' | 'Concise' | 'Formal';

interface LocationState {
  selectedType?: DocumentType;
}

interface FormattingInfo {
  hasChart: boolean;
  downloadUrl: string;
  requestAnalysis?: string;
  resultSummary?: string;
  sessionId?: number;
  sessionName?: string;
}

interface SelectedFileInfo {
  file: File;
  id: string;
  name: string;
}

interface Session {
  id: number;
  name: string;
  preview?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

type MessageType = 'user' | 'assistant';
type ChatMessage = {
  id: string;
  type: MessageType;
  text: string;
  timestamp: Date;
  isTyping?: boolean;
  fullText?: string;
  messageNumber?: number;
  macroVersion?: number;
};

type MacroHistoryItem = {
  index: number;
  main_macro: string;
  user_message: string;
};

const TOKENS_PER_GENERATION = 1000;
const TOKENS_PER_UPLOAD = 500;

const SpinningZLogo = ({ 
  isTyping, 
  size = 16, 
  inlineWithText = false
}: { 
  isTyping: boolean; 
  size?: number; 
  inlineWithText?: boolean;
}) => {
  return (
    <div 
      className={`${inlineWithText ? 'ml-1 relative' : ''}`}
      style={{ 
        height: size, 
        width: size,
        display: inlineWithText ? 'inline-flex' : 'flex',
        verticalAlign: inlineWithText ? 'middle' : 'initial'
      }}
    >
      <div 
        className={`inline-flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold ${
          isTyping ? 'animate-spin-slow animate-pulse' : ''
        }`}
        style={{ 
          fontSize: size * 0.8,
          height: size,
          width: size,
          transformOrigin: 'center center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        Z
      </div>
    </div>
  );
};
const StatusPostIt = () => {
  const statusMessage = "Filopplasting er for øyeblikket utilgjengelig ettersom denne funksjonen ikke er blitt tilpasset endringene i systemet enda :)";
  
  const [rotation, setRotation] = useState(Math.random() * 15 - 7.5);
  
  useEffect(() => {
    let direction = 1;
    let lastTime = performance.now();
    let animationId: number;
    
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;
      
      setRotation(prev => {
        const newRotation = prev + direction * 3.5 * deltaTime;
        
        // Change direction when reaching rotation limits
        if (newRotation > 7.5) direction = -1;
        if (newRotation < -7.5) direction = 1;
        
        return prev + direction * 3.5 * deltaTime;
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, []);
  
  return (
    <div 
      className="absolute left-8 top-32 max-w-xs transform transition-all duration-500 hover:scale-105"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="bg-yellow-200 dark:bg-yellow-300 dark:text-gray-800 p-6 rounded-lg shadow-lg">
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-blue-400 rounded-sm opacity-70" />
        <p className="text-gray-800 font-handwriting text-lg leading-relaxed">
          {statusMessage}
        </p>
        <div className="mt-4 flex justify-between items-center text-xs text-gray-600">
          <span>Zarium Status</span>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedType } = (location.state as LocationState) || {};
  const { user, planType, tokens, useTokens, refreshUserData, enhancedMode, toggleEnhancedMode } = useAuthStore();
  const token = user?.token;
  const isAuthenticated = !!user;
  const isBasicPlan = planType === 'Basic';  
  const isDemoPlan = planType === 'Demo';
  const isPro = planType === 'Pro';
  const canUseEnhancedMode = !isBasicPlan && !isDemoPlan;
  const [greeting, setGreeting] = useState('');
  const [firstMessageSent, setFirstMessageSent] = useState(false);
  
  const [editPrevious, setEditPrevious] = useState(false);
  const [hasPreviousMacro, setHasPreviousMacro] = useState(false);

  const [macroHistory, setMacroHistory] = useState<MacroHistoryItem[]>([]);
  const [isReverting, setIsReverting] = useState(false);

  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('excel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formatting, setFormatting] = useState<FormattingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileInfo[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [typingSpeed, setTypingSpeed] = useState(130);
  
  const [assistantMessageCount, setAssistantMessageCount] = useState(0);

  const [botDetected, setBotDetected] = useState(false);
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [mouseMovements, setMouseMovements] = useState(0);
  const [honeypotField, setHoneypotField] = useState('');
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [typingStats, setTypingStats] = useState({ charCount: 0, startTime: Date.now() });

  const [isManuallyScrolling, setIsManuallyScrolling] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const [allTypingComplete, setAllTypingComplete] = useState(true);

  const loadSessions = async () => {
    if (!isPro) return;
    
    try {
      setLoadingSessions(true);
      const response = await api.fetch('/api/sessions');
      
      if (response.ok) {
        const data = await response.json();
        console.log("Available sessions:", data.sessions);
        setSessions(data.sessions || []);
        
        if (data.activeSession) {
          console.log(`Currently active session: ${data.activeSession}`);
          setActiveSessionId(data.activeSession);
        }
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSessionSelect = async (session: Session) => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const response = await api.fetch(`/api/sessions/${session.id}/activate`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load session');
      }
      
      const result = await response.json();
      console.log("Session load result:", result);
      
      setActiveSessionId(session.id);
      
      if (result.processingResult && result.processingResult.previewImage) {
        setPreviewImage(result.processingResult.previewImage);
        
        if (result.processingResult.formatting) {
          setFormatting(result.processingResult.formatting);
        }
        
        setChatHistory([
          {
            id: Math.random().toString(36).substr(2, 9),
            type: 'user',
            text: result.userMessage || "Session request",
            timestamp: new Date(session.created_at)
          },
          {
            id: Math.random().toString(36).substr(2, 9),
            type: 'assistant',
            text: `I've loaded your previous session: "${session.name}"`,
            timestamp: new Date()
          }
        ]);
      } 
      else if (result.message === "Session activated but no macro found") {
        setPreviewImage(null);
        setFormatting(null);
        
        setChatHistory([
          {
            id: Math.random().toString(36).substr(2, 9),
            type: 'assistant',
            text: `I've loaded your session "${session.name}". This session doesn't have any spreadsheet yet. Enter a prompt to create one.`,
            timestamp: new Date()
          }
        ]);
      }
      else if (result.macroCode && result.mainMacro) {
        setPreviewImage(null);
        
        setFormatting({
          hasChart: false,
          downloadUrl: '',
          resultSummary: `Loaded session "${session.name}"`
        });
        
        setChatHistory([
          {
            id: Math.random().toString(36).substr(2, 9),
            type: 'user',
            text: result.userMessage || "Session request",
            timestamp: new Date(session.created_at)
          },
          {
            id: Math.random().toString(36).substr(2, 9),
            type: 'assistant',
            text: `I've loaded your previous session: "${session.name}". There was an issue processing the preview, but your session data is available.`,
            timestamp: new Date()
          }
        ]);
      }
      else {
        setChatHistory([
          {
            id: Math.random().toString(36).substr(2, 9),
            type: 'assistant',
            text: `I've loaded your session "${session.name}".`,
            timestamp: new Date()
          }
        ]);
      }
      
      setShowSessionSelector(false);
      setFirstMessageSent(true);
      
    } catch (error: any) {
      console.error('Error loading session:', error);
      setError(error.message || 'Failed to load session');
      
      addChatMessage('assistant', `I'm sorry, I couldn't load your session. ${error.message || 'An error occurred.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadMacroHistory = async () => {
    if (planType !== 'Pro') return;
    
    try {
      const response = await api.fetch('/api/macro-history');
      if (response.ok) {
        const data = await response.json();
        if (data.history && Array.isArray(data.history)) {
          setMacroHistory(data.history);
          
          setChatHistory(prev => prev.map(msg => {
            if (msg.type === 'user') {
              const matchingMacro = data.history.find((item: MacroHistoryItem) => 
                item.index > 0 && item.user_message === msg.text
              );
              
              if (matchingMacro) {
                return { ...msg, macroVersion: matchingMacro.index };
              }
            }
            return msg;
          }));
        }
      }
    } catch (error) {
      console.error('Error loading macro history:', error);
    }
  };

  const revertToMacro = async (index: number, messageId: string) => {
    if (planType !== 'Pro' || isReverting) return;
    
    try {
      setIsReverting(true);
      setError(null);
      
      const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) {
        throw new Error('Message not found');
      }
      
      let assistantResponseIndex = -1;
      for (let i = messageIndex + 1; i < chatHistory.length; i++) {
        if (chatHistory[i].type === 'assistant') {
          assistantResponseIndex = i;
          break;
        }
      }
      
      const response = await api.fetch(`/api/revert-macro/${index}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revert to previous spreadsheet');
      }
      
      const result = await response.json();
      
      if (result.previewImage) {
        setPreviewImage(result.previewImage);
      }
      
      if (result.formatting) {
        setFormatting(result.formatting);
      }
      
      setChatHistory(prev => {
        const keepCount = assistantResponseIndex !== -1 ? 
                         assistantResponseIndex + 1 : 
                         messageIndex + 1;
        
        return prev.slice(0, keepCount);
      });
      
      await loadMacroHistory();
      
      try {
        const macroResponse = await api.fetch('/api/check-previous-macro');
        if (macroResponse.ok) {
          const macroData = await macroResponse.json();
          setHasPreviousMacro(macroData.hasPreviousMacro);
        }
      } catch (error) {
        console.error('Error checking previous macro after revert:', error);
      }
      
    } catch (error: any) {
      console.error('Error reverting to previous macro:', error);
      setError(error.message || 'Failed to revert to previous spreadsheet');
      
      addChatMessage('assistant', `I'm sorry, I couldn't revert to your previous spreadsheet: ${error.message || 'Unknown error'}`);
    } finally {
      setIsReverting(false);
    }
  };

  const RevertButton = ({ messageId, macroVersion }: { messageId: string, macroVersion: number }) => {
    if (!isPro || !macroVersion || macroVersion < 1) return null;
    
    return (
      <button
        onClick={() => revertToMacro(macroVersion, messageId)}
        disabled={isReverting || isGenerating}
        className={`ml-2 flex items-center text-xs px-2 py-1 rounded-md ${
          isReverting || isGenerating 
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700'
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40'
        }`}
        title={`Revert to this version`}
      >
        <History className="h-3 w-3 mr-1" />
        <span>Revert</span>
      </button>
    );
  };

  const isAnyMessageTyping = () => {
    return chatHistory.some(msg => msg.isTyping);
  };

  useEffect(() => {
    setAllTypingComplete(!isAnyMessageTyping());
  }, [chatHistory]);

  useEffect(() => {
    if (isAuthenticated && isPro) {
      loadSessions();
      loadMacroHistory();
    }
  }, [isAuthenticated, isPro]);

  useEffect(() => {
    const checkActiveSession = async () => {
      if (!isAuthenticated || !isPro) return;
      
      try {
        const response = await api.fetch('/api/sessions');
        if (response.ok) {
          const data = await response.json();
          
          if (data.activeSession > 0) {
            console.log(`Currently active session: ${data.activeSession}`);
            setActiveSessionId(data.activeSession);
          }
        }
      } catch (error) {
        console.error('Error checking active session:', error);
      }
    };
    
    checkActiveSession();
  }, [isAuthenticated, isPro]);

  useEffect(() => {
    if (!isGenerating && previewImage && isPro) {
      const timer = setTimeout(() => {
        loadSessions();
        loadMacroHistory();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isGenerating, previewImage, isPro]);

  useEffect(() => {
    if (activeSessionId) {
      console.log(`Active session ID: ${activeSessionId}`);
    }
  }, [activeSessionId]);

  useEffect(() => {
    const checkPreviousMacro = async () => {
      if (planType === 'Pro') {
        try {
          const response = await api.fetch('/api/check-previous-macro');
          if (response.ok) {
            const data = await response.json();
            setHasPreviousMacro(data.hasPreviousMacro);
            
            if (!data.hasPreviousMacro) {
              setEditPrevious(false);
            }
          }
        } catch (error) {
          console.error('Error checking previous macro:', error);
        }
      }
    };
    
    checkPreviousMacro();
  }, [planType]);

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      @keyframes spin-slow {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .animate-spin-slow {
        animation: spin-slow 2s linear infinite;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
      .animate-pulse {
        animation: pulse 1.5s ease-in-out infinite;
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }
      .float-animation {
        animation: float 3s ease-in-out infinite;
      }
      
      .font-handwriting {
        font-family: 'Comic Sans MS', 'Segoe Print', cursive;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    const startTime = Date.now();
    
    const handleMouseMove = () => {
      setMouseMovements(prev => prev + 1);
      setLastActivityTime(Date.now());
    };
    
    const handleKeyDown = () => {
      setLastActivityTime(Date.now());
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    
    const timeInterval = setInterval(() => {
      setTimeOnPage(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(timeInterval);
    };
  }, []);

  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const generateButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setFirstMessageSent(false);
    setChatHistory([]);
  }, []);

  const handleHoneypotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHoneypotField(e.target.value);
    
    if (e.target.value) {
      setBotDetected(true);
      reportHoneypotTrigger('hidden_field');
    }
  };

  const handleSecretLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setBotDetected(true);
    reportHoneypotTrigger('hidden_link');
  };

  const reportHoneypotTrigger = async (honeypotType: string) => {
    try {
      await fetch(`${api.apiUrl}/api/honeypot-trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          honeypotType,
          page: 'dashboard_page',
          details: { 
            fieldContent: honeypotType === 'hidden_field' ? honeypotField : undefined,
            timeOnPage,
            mouseMovements
          }
        })
      });
    } catch (err) {
      console.error("Error reporting honeypot trigger:", err);
    }
  };

  const reportBotBehavior = async () => {
    try {
      await fetch(`${api.apiUrl}/api/behavior-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timeOnPage,
          mouseMovements,
          interactionCount: 1,
          typingSpeed: typingStats.charCount / Math.max(1, (Date.now() - typingStats.startTime) / 1000),
          inactivityTime: Date.now() - lastActivityTime
        })
      });
    } catch (err) {
      console.error("Error reporting bot:", err);
    }
  };
  
  useEffect(() => {
    const generateGreeting = () => {
      const hour = new Date().getHours();
      const day = new Date().getDay();
      const date = new Date().getDate();
      const month = new Date().getMonth();
      
      const displayName = user?.displayName 
        ? user.displayName.replace(/_/g, ' ') 
        : '';
      
      const morningGreetings = [
        `Good morning, ${displayName}! Ready to create something amazing?`,
        `Rise and shine, ${displayName}! What are we building today?`,
        `Morning, ${displayName}! How are you feeling today?`,
        `Ready for a productive day, ${displayName}?`,
        `Coffee and Zarium to start your day, ${displayName}?`,
        `Top of the morning to you, ${displayName}! What's first on your agenda?`,
        `Morning glory, ${displayName}! What Excel challenge can I help with?`
      ];
      
      const afternoonGreetings = [
        `Good afternoon, ${displayName}! How's your day going so far?`,
        `Having a good day, ${displayName}? What can I help with next?`,
        `Afternoon inspiration for you, ${displayName}! What shall we create?`,
        `Mid-day boost for you, ${displayName}! Need any spreadsheet help?`,
        `Afternoon slump? Let's energize your work, ${displayName}!`,
        `The day is still young, ${displayName}! What would you like to accomplish?`
      ];
      
      const eveningGreetings = [
        `Good evening, ${displayName}! Wrapping up your day with some spreadsheet work?`,
        `Evening, ${displayName}! How was your day? Ready for some Excel magic?`,
        `Winding down? Or just getting started, ${displayName}?`,
        `Evening productivity boost for you, ${displayName}! What's on your mind?`,
        `Still working? Your dedication is impressive, ${displayName}!`
      ];
      
      const nightGreetings = [
        `Night owl mode activated, ${displayName}? I'm here with you!`,
        `Burning the midnight oil, ${displayName}? Let's make it worthwhile!`,
        `Late night inspiration strikes, ${displayName}? I'm ready when you are!`,
        `Peaceful night work session, ${displayName}? What can I help with?`,
        `Stars and spreadsheets - quite the combination, ${displayName}! What's your goal tonight?`
      ];
      
      const fridayGreetings = [
        `Happy Friday, ${displayName}! Ready for the weekend after this?`,
        `TGIF, ${displayName}! One last spreadsheet before freedom?`,
        `Friday feelings! Got weekend plans, ${displayName}?`,
        `Weekend countdown initiated, ${displayName}! Let's finish strong!`
      ];
      
      const mondayGreetings = [
        `Monday motivation coming your way, ${displayName}! What's your focus this week?`,
        `New week, new possibilities, ${displayName}! What's first on your list?`,
        `Monday magic starts now, ${displayName}! Feeling ready for the week?`
      ];
      
      const weekendGreetings = [
        `Working on a weekend, ${displayName}? Your dedication is impressive!`,
        `Weekend warrior mode, ${displayName}? What project are you tackling?`,
        `Relaxed weekend vibes, ${displayName}. Any fun projects or just catching up?`
      ];
      
      const newYearGreetings = [
        `Happy New Year, ${displayName}! What's your first spreadsheet of the year?`
      ];
      
      let timeGreetings;
      if (hour >= 5 && hour < 12) {
        timeGreetings = morningGreetings;
      } else if (hour >= 12 && hour < 17) {
        timeGreetings = afternoonGreetings;
      } else if (hour >= 17 && hour < 21) {
        timeGreetings = eveningGreetings;
      } else {
        timeGreetings = nightGreetings;
      }
      
      let greetingPool = timeGreetings;
      
      if (day === 5) {
        if (Math.random() > 0.5) {
          greetingPool = fridayGreetings;
        }
      } else if (day === 1) {
        if (Math.random() > 0.5) {
          greetingPool = mondayGreetings;
        }
      } else if (day === 0 || day === 6) {
        if (Math.random() > 0.5) {
          greetingPool = weekendGreetings;
        }
      }
      
      if (date === 1 && month === 0) {
        greetingPool = newYearGreetings;
      }
      
      const randomIndex = Math.floor(Math.random() * greetingPool.length);
      setGreeting(greetingPool[randomIndex]);
    };
    
    generateGreeting();
    
    const interval = setInterval(generateGreeting, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (user && (!user.displayName || user.displayName === 'unknown')) {
      navigate('/welcome');
    } else if (user && user.displayName) {
    }
  }, [user, navigate]);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  useEffect(() => {
    if (previewImage || error) {
      setFirstMessageSent(true);
      
      const event = new CustomEvent('firstMessageSentUpdated', { 
        detail: { firstMessageSent: true } 
      });
      window.dispatchEvent(event);
    }
  }, [previewImage, error]);

  useEffect(() => {
    const event = new CustomEvent('firstMessageSentUpdated', { 
      detail: { firstMessageSent } 
    });
    window.dispatchEvent(event);
  }, [firstMessageSent]);

  useEffect(() => {
    if (selectedType) {
      setDocumentType(selectedType);
    }
  }, [selectedType]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let timeouts: NodeJS.Timeout[] = [];
    let isMounted = true;
    
    const messages = [
      'Processing',
      'Analyzing your requirements...',
      'Thinking',
      'Designing spreadsheet structure...',
      'Generating',
      'Generating Excel file...',
      'Finalizing'
    ];
    
    const assistantMessages = [
      'I\'m processing your request...',
      'Analyzing what you need in this spreadsheet...',
      'Thinking about the best way to structure your data...',
      'Designing the layout and formulas for your spreadsheet...',
      'Generating the Excel file with your specifications...',
      'Creating formulas, charts, and formatting...',
      'Finalizing your Excel spreadsheet...'
    ];

    const clearAllTimeouts = () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      timeouts = [];
    };
    
    const scheduleStatusUpdates = () => {
      if (!isGenerating || sessionId) return;
      
      clearAllTimeouts();
      
      messages.forEach((message, index) => {
        const timeout = setTimeout(() => {
          if (!isMounted) return;
          setGenerationStatus(message);
          
          if (index < assistantMessages.length) {
            updateLastAssistantMessage(assistantMessages[index]);
          }
        }, index * 6000);
        
        timeouts.push(timeout);
      });
    };
    
    if (sessionId && isGenerating) {
      pollInterval = setInterval(async () => {
        try {
          const response = await api.fetch(`/generation-status/${sessionId}`);
          const data = await response.json();
          
          if (data.status === "Complete") {
            setIsGenerating(false);
            setSessionId(null);
            if (data.previewImage) setPreviewImage(data.previewImage);
            if (data.formatting) {
              setFormatting(data.formatting);
              
              if (data.formatting.resultSummary) {
                updateLastAssistantMessage(data.formatting.resultSummary);
              } else {
                updateLastAssistantMessage("I've created your Excel spreadsheet based on your request. Check the preview on the right.");
              }
            }
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
    const checkAuth = setTimeout(() => {
      if (!isAuthenticated) {
        navigate('/login');
      }
    }, 100);
    
    return () => clearTimeout(checkAuth);
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (previewImage) {
      setIsGenerating(false);
      setGenerationStatus('');
      setSessionId(null);
      setFirstMessageSent(true);
    }
  }, [previewImage]);
  
  useEffect(() => {
    if (chatHistory.length > 0 && !isManuallyScrolling) {
      setTimeout(() => {
        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    }
  }, [chatHistory, isManuallyScrolling]);

  const handleChatScroll = () => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      const isNearBottom = 
        chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
      setIsManuallyScrolling(!isNearBottom);
    }
  };

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
    if (isBasicPlan || isDemoPlan) {
      e.preventDefault();
      setError('Upgrade to Plus or Pro to paste content');
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

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    
    if (e.target.value.length > typingStats.charCount) {
      setTypingStats({
        charCount: e.target.value.length,
        startTime: typingStats.startTime
      });
    } else if (e.target.value.length === 0) {
      setTypingStats({
        charCount: 0,
        startTime: Date.now()
      });
    }
    
    setLastActivityTime(Date.now());
  };

  const formatNumberedList = (text: string): string => {
    return text.replace(/(\s)([1-9]|10)\.(\s)/g, '$1\n$2.$3');
  };

  const addChatMessage = (type: MessageType, text: string) => {
    if (!text || text.trim() === '') {
      console.warn("Attempted to add chat message with empty text");
      return;
    }
    
    const formattedText = formatNumberedList(text);
    
    if (type === 'user') {
      const newMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        text: formattedText,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, newMessage]);
    } else {
      setAssistantMessageCount(prev => prev + 1);
      
      const newMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        text: '',
        fullText: formattedText,
        isTyping: true,
        timestamp: new Date(),
        messageNumber: assistantMessageCount + 1
      };
      setChatHistory(prev => [...prev, newMessage]);
    }
  };
  
  const updateLastAssistantMessage = (text: string) => {
    if (!text || text.trim() === '') {
      console.warn("Attempted to update assistant message with empty text");
      return;
    }
    
    const formattedText = formatNumberedList(text);
    
    setChatHistory(prev => {
      const lastAssistantIndex = [...prev].reverse().findIndex(msg => msg.type === 'assistant');
      
      if (lastAssistantIndex === -1 || prev.length - 1 - lastAssistantIndex !== prev.length - 1) {
        console.log("No existing assistant message found, adding new one:", formattedText.substring(0, 50) + "...");
        setAssistantMessageCount(prev => prev + 1);
        return [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          type: 'assistant',
          text: '',
          fullText: formattedText,
          isTyping: true,
          timestamp: new Date(),
          messageNumber: assistantMessageCount + 1
        }];
      }
      
      const currentLastMessage = prev[prev.length - 1 - lastAssistantIndex];
      
      const isSimilarContent = 
        currentLastMessage.text.includes("Understanding your request") || 
        currentLastMessage.text.includes("I'm analyzing") ||
        currentLastMessage.text.includes("I'll create") ||
        currentLastMessage.text.includes("I'm processing");
      
      if (isSimilarContent) {
        console.log("Replacing preliminary message with result summary");
        const newHistory = [...prev];
        const updatedMessage = {
          ...currentLastMessage,
          fullText: formattedText,
          isTyping: true,
          text: ''
        };
        
        newHistory[prev.length - 1 - lastAssistantIndex] = updatedMessage;
        return newHistory;
      }
      
      console.log("Appending to existing assistant message");
      const newHistory = [...prev];
      const updatedMessage = {
        ...currentLastMessage,
        fullText: `${currentLastMessage.text}\n\n${formattedText}`,
        isTyping: true,
        text: currentLastMessage.text
      };
      
      newHistory[prev.length - 1 - lastAssistantIndex] = updatedMessage;
      return newHistory;
    });
  };

  useEffect(() => {
    const typingMessages = chatHistory.filter(msg => msg.isTyping && msg.fullText);
    
    if (typingMessages.length === 0) {
      setAllTypingComplete(true);
      return;
    } else {
      setAllTypingComplete(false);
    }
    
    const intervals = typingMessages.map(message => {
      return setInterval(() => {
        setChatHistory(prev => {
          const updatedMessages = prev.map(msg => {
            if (msg.id === message.id && msg.isTyping && msg.fullText) {
              const currentLength = msg.text.length;
              const targetLength = msg.fullText.length;
              
              if (currentLength >= targetLength) {
                return { ...msg, isTyping: false, text: msg.fullText };
              }
              
              const charsToAdd = Math.min(5, targetLength - currentLength);
              const newText = msg.fullText.substring(0, currentLength + charsToAdd);
              
              return { ...msg, text: newText };
            }
            return msg;
          });
          
          const stillTyping = updatedMessages.some(msg => msg.isTyping);
          if (!stillTyping) {
            setAllTypingComplete(true);
          }
          
          return updatedMessages;
        });
      }, 1000 / (typingSpeed / 5));
    });
    
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [chatHistory, typingSpeed]);

  const [modelMode, setModelMode] = useState<ModelMode>('Normal');
  const [stylePopoverOpen, setStylePopoverOpen] = useState(false);

  const StyleSelector = () => {
    return (
      <Popover open={stylePopoverOpen} onOpenChange={setStylePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200"
            title="Select generation style"
          >
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Style</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <div className="p-2">
            <h3 className="font-semibold text-sm mb-2">Generation Style</h3>
            {['Creative', 'Normal', 'Concise', 'Formal'].map((mode) => (
              <button
                key={mode}
                onClick={(e) => {
                  e.preventDefault();
                  setModelMode(mode as ModelMode);
                }}
                className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${
                  modelMode === mode ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {modelMode === mode && <Check className="h-4 w-4" />}
                <span className={modelMode === mode ? '' : 'ml-6'}>
                  {mode}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setFirstMessageSent(true);
    
    const event = new CustomEvent('firstMessageSentUpdated', { 
      detail: { firstMessageSent: true } 
    });
    window.dispatchEvent(event);
    
    setIsGenerating(true);
    setError(null);
    
    const messageId = Math.random().toString(36).substr(2, 9);
    
    addChatMessage('user', prompt);
    
    addChatMessage('assistant', 'Understanding your request...');
    
    const smartMessages = [
      "I'm analyzing your request for a multiplication table...",
      "I'll create a well-formatted Excel spreadsheet with multiplication tables...",
      "Your spreadsheet will include complete multiplication tables with proper formatting..."
    ];
    
    let bestMessage = "I'll create a spreadsheet based on your request.";
    if (prompt.toLowerCase().includes("multiplication") || prompt.toLowerCase().includes("gange")) {
      bestMessage = "I'll create a multiplication table with proper formatting and headers.";
    } else if (prompt.toLowerCase().includes("budget") || prompt.toLowerCase().includes("budsjett")) {
      bestMessage = "I'll create a budget spreadsheet with income, expenses, and calculations.";
    } else if (prompt.toLowerCase().includes("calendar") || prompt.toLowerCase().includes("kalender")) {
      bestMessage = "I'll create a calendar spreadsheet with dates, events, and proper formatting.";
    } else if (prompt.toLowerCase().includes("inventory") || prompt.toLowerCase().includes("lager")) {
      bestMessage = "I'll create an inventory tracking spreadsheet with items, quantities, and calculations.";
    } else if (prompt.toLowerCase().includes("schedule") || prompt.toLowerCase().includes("timeplan")) {
      bestMessage = "I'll create a schedule spreadsheet with time slots, activities, and proper formatting.";
    }
    
    setTimeout(() => {
      updateLastAssistantMessage(bestMessage);
    }, 1000);
    
    setFormatting(prev => ({
      ...(prev || {}),
      hasChart: false,
      downloadUrl: '',
      requestAnalysis: 'Analyzing your request...'
    }));
    
    if (timeOnPage < 5 || mouseMovements < 3) {
      setBotDetected(true);
      reportBotBehavior();
    }
    
    const typingSpeed = typingStats.charCount / Math.max(1, (Date.now() - typingStats.startTime) / 1000);
    
    if (typingSpeed > 10 && typingStats.charCount > 130) {
      setBotDetected(true);
      reportBotBehavior();
    }
  
    try {
      const tokenResponse = await api.fetch('/refresh-token', {
        method: 'POST',
        credentials: 'include'
      });
  
      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh session');
      }
  
      const endpoint = selectedFiles.length > 0 ? '/api/generate-api-with-file-and-assistant' : '/api/generate-api-with-assistant';
      
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
        formData.append('modelMode', modelMode);
        
        if (isPro) {
          formData.append('editPrevious', editPrevious.toString());
        }
        
        requestOptions.body = formData;
      } else {
        requestOptions.headers = {
          'Content-Type': 'application/json',
        };
        
        const requestBody: any = {
          prompt,
          format: 'xlsx',
          enhancedMode,
          modelMode
        };
        
        if (isPro) {
          requestBody.editPrevious = editPrevious;
        }
        
        requestOptions.body = JSON.stringify(requestBody);
      }
  
      if (botDetected) {
        try {
          fetch(`${api.apiUrl}/api/report-bot`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              userId: user?.id,
              detectionSource: 'dashboard_page',
              detectionMethod: 'generation_behavior',
              indicators: {
                timeOnPage,
                mouseMovements,
                typingSpeed,
                promptLength: prompt.length,
                honeypotField: honeypotField || undefined
              }
            })
          });
        } catch (err) {
          console.error("Error reporting bot:", err);
        }
      }
  
      const response = await api.fetch(endpoint, requestOptions);
      const result = await response.json();
      
      console.log("API response received");
      
      if (result.error) {
        throw new Error(result.error);
      }
  
      if (result.previewImage) {
        setPreviewImage(result.previewImage);
        
        if (isPro) {
          try {
            await api.fetch('/api/associate-message-with-macro', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messageText: prompt,
              }),
            });
          } catch (error) {
            console.error('Error associating message with macro:', error);
          }
        }
      }
      
      if (result.sessionId) {
        console.log(`Generation saved to session ${result.sessionId}: ${result.sessionName || 'Unnamed'}`);
        setActiveSessionId(result.sessionId);
      }
      
      if (result.resultSummary) {
        updateLastAssistantMessage(result.resultSummary);
        console.log("Updated chat with result summary:", result.resultSummary);
      } else if (result.formatting && result.formatting.resultSummary) {
        updateLastAssistantMessage(result.formatting.resultSummary);
        console.log("Updated chat with formatting result summary:", result.formatting.resultSummary);
      } else {
        updateLastAssistantMessage("I've created your Excel spreadsheet based on your request. Check the preview on the right.");
      }
      
      if (result.formatting) {
        setFormatting(result.formatting);
      } else {
        setFormatting({
          hasChart: false,
          downloadUrl: result.downloadUrl || '',
          requestAnalysis: result.requestAnalysis || 'Request analyzed successfully.',
          resultSummary: result.resultSummary || 'Spreadsheet created successfully.'
        });
      }
  
      await refreshUserData();
      
      if (isPro) {
        loadSessions();
        
        try {
          const macroResponse = await api.fetch('/api/check-previous-macro');
          if (macroResponse.ok) {
            const macroData = await macroResponse.json();
            setHasPreviousMacro(macroData.hasPreviousMacro);
          }
          
          await loadMacroHistory();
        } catch (error) {
          console.error('Error checking previous macro after generation:', error);
        }
      }
  
    } catch (error: any) {
      console.error('Generation error:', error);
      setError(error.message || 'Failed to generate document. Please try again.');
      setIsGenerating(false);
      setGenerationStatus('');
      setSessionId(null);
      
      addChatMessage('assistant', `I'm sorry, I encountered an error: ${error.message || 'Failed to generate document. Please try again.'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <a 
        href="/internal-access" 
        onClick={handleSecretLinkClick}
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
        aria-hidden="true"
        tabIndex={-1}
      >
        Internal System Access
      </a>

      <div className={`transition-all duration-500 ${firstMessageSent ? 'pt-2' : 'pt-8'}`}>
        {!firstMessageSent ? (
          <div className="flex flex-col items-center justify-start min-h-screen px-4 pt-16">
            <div className="text-center mb-16 flex items-center justify-center">
              <div 
                className="inline-flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold"
                style={{ 
                  fontSize: 48,
                  height: 60,
                  width: 60,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Z
              </div>
              <h1 className="text-4xl font-light text-emerald-800 dark:text-emerald-200 ml-4">
                {greeting}
              </h1>
            </div>
            
            <StatusPostIt />
            
            {isPro && (
              <div className="mb-8 w-full max-w-2xl">
                <button
                  onClick={() => setShowSessionSelector(!showSessionSelector)}
                  className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200"
                >
                  <History className="h-5 w-5" />
                  <span>Previous Sessions {showSessionSelector ? '(Hide)' : '(Show)'}</span>
                </button>
                
                {showSessionSelector && (
                  <div className="mt-4">
                    <SessionSelector 
                      onSessionSelect={handleSessionSelect}
                      className="border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800"
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="w-full max-w-2xl">
              <div className="relative w-full bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-sm overflow-hidden">
                <div 
                  style={{
                    position: 'absolute',
                    left: '-9999px',
                    height: 0,
                    width: 0,
                    overflow: 'hidden'
                  }}
                  aria-hidden="true"
                >
                  <input 
                    type="text"
                    name="message_backup"
                    value={honeypotField}
                    onChange={handleHoneypotChange}
                    placeholder="Please don't fill this"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                
                <div className="flex flex-col">
                  <textarea
                    value={prompt}
                    onChange={handlePromptChange}
                    onKeyPress={handleKeyPress}
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    placeholder="How can I help you today?"
                    className="w-full px-4 py-3 bg-transparent border-none text-emerald-800 dark:text-white min-h-[80px] resize-none outline-none"
                    style={{ height: 'auto', minHeight: '80px' }}
                    ref={promptTextareaRef}
                  />
                  
                  <div className="flex items-center justify-between px-4 pb-3">
                    <div className="flex items-center gap-3">
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

                      <div className="flex items-center gap-1">
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
                        <span className="text-xs text-emerald-700 dark:text-emerald-300">
                          Enhanced
                        </span>
                      </div>

                      <StyleSelector />

                      {isPro && (
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={editPrevious}
                            onCheckedChange={setEditPrevious}
                            disabled={!hasPreviousMacro}
                            className={`data-[state=checked]:bg-emerald-600 h-4 w-7 ${!hasPreviousMacro ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <span className={`text-xs ${hasPreviousMacro ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-400 dark:text-gray-500'}`}>
                            Edit
                          </span>
                        </div>
                      )}
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
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-1">
                  {selectedFiles.map((fileInfo) => (
                    <div 
                      key={fileInfo.id}
                      className="flex items-center justify-between py-1 px-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-sm"
                    >
                      <span className="text-emerald-800 dark:text-emerald-200 truncate text-xs">
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
              
              <div className="text-center text-emerald-700 dark:text-emerald-300 text-xs mt-2">
                Available Tokens: <span className="font-semibold">{tokens.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-screen w-full">
            <div className="w-2/5 lg:w-1/3 h-screen overflow-y-auto pb-40" ref={chatContainerRef} onScroll={handleChatScroll}>
              <div className="p-4">
                {!allTypingComplete && (
                  <div className="sticky top-0 z-10 flex justify-center py-2">
                    <SpinningZLogo isTyping={true} size={24} />
                  </div>
                )}
                
                {chatHistory.map((message, index) => (
                  <div key={message.id} className="mb-4">
                    {message.type === 'user' ? (
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <p className="text-gray-800 dark:text-gray-200 text-sm flex-grow">
                            <span className="font-semibold">You:</span> {message.text}
                          </p>
                          {isPro && message.macroVersion && message.macroVersion > 0 && (
                            <RevertButton 
                              messageId={message.id}
                              macroVersion={message.macroVersion}
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 mt-2">
                        <div className="relative">
                          <p className="text-emerald-800 dark:text-emerald-200 text-sm whitespace-pre-line">
                            <span className="font-semibold">Zarium:</span> {message.text}
                            {message.isTyping && (
                              <SpinningZLogo 
                                isTyping={true} 
                                size={32} 
                                inlineWithText={true}
                              />
                            )}
                          </p>
                          
                          {!message.isTyping && message.text && index === chatHistory.length - 1 && (
                            <div className="flex justify-end mt-2">
                              <SpinningZLogo 
                                isTyping={false} 
                                size={14}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {chatHistory.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 text-center">
                      Ask me to create an Excel spreadsheet for you.<br/>
                      I'll explain what I'm creating in real-time.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="w-3/5 lg:w-2/3 fixed right-0 top-0 h-screen overflow-hidden">
              {error && (
                <div className="m-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg text-center">
                  {error}
                </div>
              )}

              <div className="h-[calc(100vh-20px)] m-4 flex">
                <SpreadsheetViewer 
                  previewImage={previewImage} 
                  isGenerating={isGenerating} 
                  generationStatus={generationStatus} 
                  formatting={formatting}
                  planType={user?.planType}
                  fullHeight={true}
                  stickyBottom={true}
                  preventAutoScroll={isManuallyScrolling}
                  showControls={true}
                />
              </div>
            </div>
            
            <div className="fixed bottom-0 left-0 w-[calc(2/5*100%-16px)] lg:w-[calc(1/3*100%-16px)] p-4 z-50 bg-gradient-to-t from-emerald-50 to-transparent dark:from-gray-900 dark:to-transparent pt-8">
              <div className="relative w-full">
                <div 
                  style={{
                    position: 'absolute',
                    left: '-9999px',
                    height: 0,
                    width: 0,
                    overflow: 'hidden'
                  }}
                  aria-hidden="true"
                >
                  <input 
                    type="text"
                    name="message_backup"
                    value={honeypotField}
                    onChange={handleHoneypotChange}
                    placeholder="Please don't fill this"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                
                <textarea
                  value={prompt}
                  onChange={handlePromptChange}
                  onKeyPress={handleKeyPress}
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  placeholder="How can I help you today?"
                  className="w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-white min-h-[80px] resize-none outline-none shadow-sm"
                  style={{ height: 'auto', minHeight: '80px' }}
                  ref={promptTextareaRef}
                />
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
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

                    <div className="flex items-center gap-1">
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
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">
                        Enhanced
                      </span>
                    </div>

                    <StyleSelector />

                    {isPro && (
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={editPrevious}
                          onCheckedChange={setEditPrevious}
                          disabled={!hasPreviousMacro}
                          className={`data-[state=checked]:bg-emerald-600 h-4 w-7 ${!hasPreviousMacro ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                        <span className={`text-xs ${hasPreviousMacro ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-400 dark:text-gray-500'}`}>
                          Edit
                        </span>
                      </div>
                    )}
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
                <div className="mt-3 space-y-1">
                  {selectedFiles.map((fileInfo) => (
                    <div 
                      key={fileInfo.id}
                      className="flex items-center justify-between py-1 px-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-sm"
                    >
                      <span className="text-emerald-800 dark:text-emerald-200 truncate text-xs">
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
              
              <div className="text-center text-emerald-700 dark:text-emerald-300 text-xs mt-2">
                Available Tokens: <span className="font-semibold">{tokens.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}