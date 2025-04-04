import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Download, Sparkles, Upload, Lock, HelpCircle, ArrowRight, Palette, Check } from 'lucide-react';
import { SpreadsheetViewer } from '../components/SpreadsheetViewer';
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
}

interface SelectedFileInfo {
  file: File;
  id: string;
  name: string;
}

const TOKENS_PER_GENERATION = 1000;
const TOKENS_PER_UPLOAD = 500;

// Add these new types and interfaces
type MessageType = 'user' | 'assistant';
type ChatMessage = {
  id: string;
  type: MessageType;
  text: string;
  timestamp: Date;
  isTyping?: boolean; // Flag to indicate if the message is still "typing"
  fullText?: string; // Store the full text while typing animation is in progress
  messageNumber?: number; // Added to track which assistant message number this is
};

// Update the SpinningZLogo component to follow text and continue animation when needed
const SpinningZLogo = ({ 
  isTyping, 
  size = 16, 
  inlineWithText = false,
  continueAnimation = false
}: { 
  isTyping: boolean; 
  size?: number; 
  inlineWithText?: boolean;
  continueAnimation?: boolean 
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
          isTyping || continueAnimation ? 'animate-spin-slow animate-pulse' : ''
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

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedType } = (location.state as LocationState) || {};
  const { user, planType, tokens, useTokens, refreshUserData, enhancedMode, toggleEnhancedMode } = useAuthStore();
  const token = user?.token;
  const isAuthenticated = !!user;
  const isBasicPlan = planType === 'Basic';  
  const isDemoPlan = planType === 'Demo';
  const isPro = planType === 'Pro';  // Check if user is on Pro plan
  const canUseEnhancedMode = !isBasicPlan && !isDemoPlan;
  const [greeting, setGreeting] = useState('');
  const [firstMessageSent, setFirstMessageSent] = useState(false);
  
  // State for Edit Previous feature
  const [editPrevious, setEditPrevious] = useState(false);
  const [hasPreviousMacro, setHasPreviousMacro] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('excel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formatting, setFormatting] = useState<FormattingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileInfo[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Chat history to store conversation
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [typingSpeed, setTypingSpeed] = useState(130); // Characters per second, adjust as needed
  
  // Add state to track which assistant message we're on
  const [assistantMessageCount, setAssistantMessageCount] = useState(0);

  // Bot detection states
  const [botDetected, setBotDetected] = useState(false);
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [mouseMovements, setMouseMovements] = useState(0);
  const [honeypotField, setHoneypotField] = useState('');
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [typingStats, setTypingStats] = useState({ charCount: 0, startTime: Date.now() });

  // Add this state to track if user is manually scrolling the chat
  const [isManuallyScrolling, setIsManuallyScrolling] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Keep track of when all typing has finished for logo animation
  const [allTypingComplete, setAllTypingComplete] = useState(true);

  // Add a function to check if any message is still typing
  const isAnyMessageTyping = () => {
    return chatHistory.some(msg => msg.isTyping);
  };

  // Update the effect to track typing state for the spinning logo
  useEffect(() => {
    // Set the tracking state based on whether any messages are typing
    setAllTypingComplete(!isAnyMessageTyping());
  }, [chatHistory]);

  // Add this effect for custom animation - enhance the animation for spinning logo
  useEffect(() => {
    // Add custom animation to the CSS
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
      
      /* Add floating animation for the Z logo */
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }
      .float-animation {
        animation: float 3s ease-in-out infinite;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Track time on page and mouse movements for bot detection
  useEffect(() => {
    const startTime = Date.now();
    
    // Track mouse movements
    const handleMouseMove = () => {
      setMouseMovements(prev => prev + 1);
      setLastActivityTime(Date.now());
    };
    
    // Track keyboard activity
    const handleKeyDown = () => {
      setLastActivityTime(Date.now());
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    
    // Update time on page every second
    const timeInterval = setInterval(() => {
      setTimeOnPage(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(timeInterval);
    };
  }, []);

  // Check for previous macro availability
  useEffect(() => {
    const checkPreviousMacro = async () => {
      if (planType === 'Pro') {
        try {
          const response = await api.fetch('/api/check-previous-macro');
          if (response.ok) {
            const data = await response.json();
            setHasPreviousMacro(data.hasPreviousMacro);
            
            // If no previous macro is available, disable the edit previous switch
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

  // Refs for the textarea and buttons
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const generateButtonRef = useRef<HTMLButtonElement>(null);

  // Reset firstMessageSent when page loads
  useEffect(() => {
    setFirstMessageSent(false);
    setChatHistory([]);
  }, []);

  // Handler for honeypot field changes
  const handleHoneypotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHoneypotField(e.target.value);
    
    // If honeypot field is filled, mark as bot
    if (e.target.value) {
      setBotDetected(true);
      reportHoneypotTrigger('hidden_field');
    }
  };

  // Handle honeypot link click
  const handleSecretLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setBotDetected(true);
    reportHoneypotTrigger('hidden_link');
    // Continue normally to avoid alerting bot
  };

  // Function to report honeypot triggers
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
      // Silent fail - don't alert the bot
      console.error("Error reporting honeypot trigger:", err);
    }
  };

  // Function to report bot behavioral patterns
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
      // Silent fail
      console.error("Error reporting bot:", err);
    }
  };
  
  // Generate time-based greeting with more personal creative variations
  useEffect(() => {
    const generateGreeting = () => {
      const hour = new Date().getHours();
      const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
      const date = new Date().getDate();
      const month = new Date().getMonth();
      
      // Display name with underscores converted to spaces
      const displayName = user?.displayName 
        ? user.displayName.replace(/_/g, ' ') 
        : '';
      
      // Base time greetings with variations - more personal
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
      
      // Special day greetings - more personal
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
      
      // Special occasion greetings
      const newYearGreetings = [
        `Happy New Year, ${displayName}! What's your first spreadsheet of the year?`
      ];
      
      // Default to time-based greetings
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
      
      // Select the base greeting pool
      let greetingPool = timeGreetings;
      
      // Check for special days
      if (day === 5) { // Friday
        // 50% chance to use Friday greeting
        if (Math.random() > 0.5) {
          greetingPool = fridayGreetings;
        }
      } else if (day === 1) { // Monday
        // 50% chance to use Monday greeting
        if (Math.random() > 0.5) {
          greetingPool = mondayGreetings;
        }
      } else if (day === 0 || day === 6) { // Weekend (Saturday or Sunday)
        // 50% chance to use weekend greeting
        if (Math.random() > 0.5) {
          greetingPool = weekendGreetings;
        }
      }
      
      // New Year's Day
      if (date === 1 && month === 0) { // January 1
        greetingPool = newYearGreetings;
      }
      
      // Pick a random greeting from the selected pool
      const randomIndex = Math.floor(Math.random() * greetingPool.length);
      setGreeting(greetingPool[randomIndex]);
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
      // User has a display name, continue
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
      
      // Dispatch custom event to notify Layout component
      const event = new CustomEvent('firstMessageSentUpdated', { 
        detail: { firstMessageSent: true } 
      });
      window.dispatchEvent(event);
    }
  }, [previewImage, error]);

  // Add another effect to dispatch the event when firstMessageSent changes directly
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
    
    // Also update assistant messages in chat
    const assistantMessages = [
      'I\'m processing your request...',
      'Analyzing what you need in this spreadsheet...',
      'Thinking about the best way to structure your data...',
      'Designing the layout and formulas for your spreadsheet...',
      'Generating the Excel file with your specifications...',
      'Creating formulas, charts, and formatting...',
      'Finalizing your Excel spreadsheet...'
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
          
          // Also update the assistant message in chat
          if (index < assistantMessages.length) {
            updateLastAssistantMessage(assistantMessages[index]);
          }
        }, index * 6000); // Show each message for ~6 seconds
        
        timeouts.push(timeout);
      });
    };

    // Keep status updates disabled - we'll only show the actual analysis
    // if (isGenerating && !sessionId) {
    //   scheduleStatusUpdates();
    // }
    
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
            if (data.formatting) {
              setFormatting(data.formatting);
              
              // Update the assistant message with the result summary
              if (data.formatting.resultSummary) {
                updateLastAssistantMessage(data.formatting.resultSummary);
              } else {
                updateLastAssistantMessage("I've created your Excel spreadsheet based on your request. Check the preview on the right.");
              }
            }
          }
        } catch (error) {
          // Handle error silently
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
  
  // Modify the chat scrolling logic to be more specific
  useEffect(() => {
    if (chatHistory.length > 0 && !isManuallyScrolling) {
      // Only scroll to bottom if we're not manually scrolling
      setTimeout(() => {
        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    }
  }, [chatHistory, isManuallyScrolling]);

  // Add handlers for chat container scrolling
  const handleChatScroll = () => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      // Check if we're close to bottom (within 100px)
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

  // Track typing for bot detection
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Track current prompt value
    setPrompt(e.target.value);
    
    // Update typing stats
    if (e.target.value.length > typingStats.charCount) {
      // Only track when typing, not deleting
      setTypingStats({
        charCount: e.target.value.length,
        startTime: typingStats.startTime
      });
    } else if (e.target.value.length === 0) {
      // Reset typing stats when clearing the field
      setTypingStats({
        charCount: 0,
        startTime: Date.now()
      });
    }
    
    // Reset the lastActivityTime
    setLastActivityTime(Date.now());
  };

  // Format numbered lists by adding line breaks before numbers (1. 2. 3. etc.)
  const formatNumberedList = (text: string): string => {
    // Add a new line before any numbered list items (1. 2. 3. etc.)
    return text.replace(/(\s)([1-9]|10)\.(\s)/g, '$1\n$2.$3');
  };

  // Updated function to add a message to the chat history with typing effect
  const addChatMessage = (type: MessageType, text: string) => {
    const formattedText = formatNumberedList(text);
    
    if (type === 'user') {
      // User messages appear instantly
      const newMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        text: formattedText,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, newMessage]);
    } else {
      // Track assistant message count
      setAssistantMessageCount(prev => prev + 1);
      
      // Assistant messages have typing animation
      const newMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        text: '', // Start empty, will be filled by typing animation
        fullText: formattedText, // Store the full text
        isTyping: true,
        timestamp: new Date(),
        messageNumber: assistantMessageCount + 1 // Store which assistant message this is
      };
      setChatHistory(prev => [...prev, newMessage]);
    }
  };
  
  // Updated function to update the last assistant message or add a new one
  const updateLastAssistantMessage = (text: string) => {
    const formattedText = formatNumberedList(text);
    
    setChatHistory(prev => {
      const lastAssistantIndex = [...prev].reverse().findIndex(msg => msg.type === 'assistant');
      
      if (lastAssistantIndex === -1 || prev.length - 1 - lastAssistantIndex !== prev.length - 1) {
        // No assistant message found or it's not the last one, add new message with typing
        setAssistantMessageCount(prev => prev + 1);
        return [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          type: 'assistant',
          text: '', // Start empty for typing effect
          fullText: formattedText, // Store the full text
          isTyping: true, // Restart typing animation
          timestamp: new Date(),
          messageNumber: assistantMessageCount + 1
        }];
      }
      
      // Get the current last message
      const currentLastMessage = prev[prev.length - 1 - lastAssistantIndex];
      
      // Instead of replacing, append to the fullText and reset typing
      const newHistory = [...prev];
      const updatedMessage = {
        ...currentLastMessage,
        fullText: `${currentLastMessage.text}\n\n${formattedText}`, // Append with spacing
        isTyping: true, // Restart typing animation
        text: currentLastMessage.text // Keep current visible text
      };
      
      newHistory[prev.length - 1 - lastAssistantIndex] = updatedMessage;
      return newHistory;
    });
  };

  // Add this effect to handle the typing animation - modified to track overall typing state
  useEffect(() => {
    // Find messages that are currently typing
    const typingMessages = chatHistory.filter(msg => msg.isTyping && msg.fullText);
    
    if (typingMessages.length === 0) {
      // If no messages are typing, ensure our tracking state is updated
      setAllTypingComplete(true);
      return;
    } else {
      // If any messages are typing, update our tracking state
      setAllTypingComplete(false);
    }
    
    // For each typing message, create an interval to update it
    const intervals = typingMessages.map(message => {
      return setInterval(() => {
        setChatHistory(prev => {
          const updatedMessages = prev.map(msg => {
            if (msg.id === message.id && msg.isTyping && msg.fullText) {
              const currentLength = msg.text.length;
              const targetLength = msg.fullText.length;
              
              // If we've typed the full message, stop typing
              if (currentLength >= targetLength) {
                return { ...msg, isTyping: false, text: msg.fullText };
              }
              
              // Otherwise, show more text
              const charsToAdd = Math.min(5, targetLength - currentLength); // Add up to 5 chars at a time
              const newText = msg.fullText.substring(0, currentLength + charsToAdd);
              
              return { ...msg, text: newText };
            }
            return msg;
          });
          
          // After updating all messages, check if any are still typing
          const stillTyping = updatedMessages.some(msg => msg.isTyping);
          if (!stillTyping) {
            setAllTypingComplete(true);
          }
          
          return updatedMessages;
        });
      }, 1000 / (typingSpeed / 5)); // Adjust timing based on typing speed and chars per update
    });
    
    // Clean up intervals
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [chatHistory, typingSpeed]);

  const [modelMode, setModelMode] = useState<ModelMode>('Normal');
  // Add state to control popover open/close
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
                  // Prevent the default behavior which closes the popover
                  e.preventDefault();
                  // Set the selected mode but don't close popover
                  setModelMode(mode as ModelMode);
                  // Important: Don't set stylePopoverOpen to false here
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
    
    // Dispatch custom event when first message is sent
    const event = new CustomEvent('firstMessageSentUpdated', { 
      detail: { firstMessageSent: true } 
    });
    window.dispatchEvent(event);
    
    setIsGenerating(true);
    setError(null);
    
    // Add user message to chat
    addChatMessage('user', prompt);
    
    // Initial "thinking" message 
    addChatMessage('assistant', 'Understanding your request...');
    
    // Since the backend doesn't send request analysis, let's manually update the message
    // Simulate multiple smart-looking messages
    const smartMessages = [
      "I'm analyzing your request for a multiplication table...",
      "I'll create a well-formatted Excel spreadsheet with multiplication tables...",
      "Your spreadsheet will include complete multiplication tables with proper formatting..."
    ];
    
    // Pick a message based on prompt keywords
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
    
    // Update the message after a short delay - this now appends instead of replacing
    setTimeout(() => {
      updateLastAssistantMessage(bestMessage);
    }, 1000);
    
    // Initialize formatting with a default requestAnalysis
    setFormatting(prev => ({
      ...(prev || {}),
      hasChart: false,
      downloadUrl: '',
      requestAnalysis: 'Analyzing your request...'
    }));
    
    // Check for bot behavior - generating too quickly or suspiciously
    if (timeOnPage < 5 || mouseMovements < 3) {
      setBotDetected(true);
      reportBotBehavior();
    }
    
    // Calculate typing speed (chars per second)
    const typingSpeed = typingStats.charCount / Math.max(1, (Date.now() - typingStats.startTime) / 1000);
    
    // Extremely fast typing is suspicious
    if (typingSpeed > 10 && typingStats.charCount > 130) {
      setBotDetected(true);
      reportBotBehavior();
    }
  
    try {
      // Refresh token before generation
      const tokenResponse = await api.fetch('/refresh-token', {
        method: 'POST',
        credentials: 'include'
      });
  
      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh session');
      }
  
      // Use the standard endpoints, but we'll analyze the prompt separately
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
        formData.append('modelMode', modelMode); // Add model mode
        
        // Include editPrevious flag for Pro users
        if (isPro) {
          formData.append('editPrevious', editPrevious.toString());
        }
        
        requestOptions.body = formData;
      } else {
        requestOptions.headers = {
          'Content-Type': 'application/json',
        };
        
        // Include editPrevious in JSON request for Pro users
        const requestBody: any = {
          prompt,
          format: 'xlsx',
          enhancedMode,
          modelMode // Add model mode
        };
        
        if (isPro) {
          requestBody.editPrevious = editPrevious;
        }
        
        requestOptions.body = JSON.stringify(requestBody);
      }
  
      // If bot detected, report to separate endpoint
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
          // Silent fail - don't alert the bot
          console.error("Error reporting bot:", err);
        }
      }
  
      const response = await api.fetch(endpoint, requestOptions);
      const result = await response.json();
      
      // Simple log for debugging only
      console.log("API response received");
      
      if (result.error) {
        throw new Error(result.error);
      }
  
      if (result.previewImage) {
        setPreviewImage(result.previewImage);
      }
      
      // We're now using front-end generated messages instead
      // of waiting for requestAnalysis from backend
      
      if (result.formatting) {
        setFormatting(result.formatting);
        
        // Later, the result summary will be used to replace the analysis when it's complete
        if (result.previewImage && result.formatting.resultSummary) {
          updateLastAssistantMessage(result.formatting.resultSummary);
        }
      } else if (result.resultSummary) {
        // Handle the case where resultSummary might be at the top level
        updateLastAssistantMessage(result.resultSummary);
      }
  
      // Refresh user data after successful generation
      await refreshUserData();
      
      // Update hasPreviousMacro after a successful generation for Pro users
      if (isPro) {
        try {
          const macroResponse = await api.fetch('/api/check-previous-macro');
          if (macroResponse.ok) {
            const macroData = await macroResponse.json();
            setHasPreviousMacro(macroData.hasPreviousMacro);
          }
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
      
      // Add error message to chat
      addChatMessage('assistant', `I'm sorry, I encountered an error: ${error.message || 'Failed to generate document. Please try again.'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Honeypot Link - Hidden from normal users */}
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
          // Claude-like centered greeting and chat box before first message is sent
          <div className="flex flex-col items-center justify-start min-h-screen px-4 pt-16">
            {/* Z logo with greeting, larger text, positioned higher */}
            <div className="text-center mb-32 flex items-center justify-center">
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
            
            {/* Just the input box with integrated controls */}
            <div className="w-full max-w-2xl">
              {/* Integrated input area with controls */}
              <div className="relative w-full bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-sm overflow-hidden">
                {/* Hidden honeypot field */}
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
                  {/* Textarea with padding for controls */}
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
                  
                  {/* Controls inside the same container */}
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

                      {/* Enhanced Mode Switch */}
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

                      {/* Add style selector here */}
                      <StyleSelector />

                      {/* Add Edit Previous switch only for Pro users */}
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

              {/* Selected files display */}
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
              
              {/* Tokens display */}
              <div className="text-center text-emerald-700 dark:text-emerald-300 text-xs mt-2">
                Available Tokens: <span className="font-semibold">{tokens.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          // Full interface after first message is sent - Modified layout with fixed spreadsheet viewer
          <div className="flex h-screen w-full">
            {/* Chat and Request Log Area on the left - Scrollable */}
            <div className="w-2/5 lg:w-1/3 h-screen overflow-y-auto pb-40" ref={chatContainerRef} onScroll={handleChatScroll}>
              <div className="p-4">
                {/* Single persistent spinning logo that only appears while typing is happening */}
                {!allTypingComplete && (
                  <div className="sticky top-0 z-10 flex justify-center py-2">
                    <SpinningZLogo isTyping={true} size={24} />
                  </div>
                )}
                
                {/* Modified chat history content with Z logo that follows text */}
                {chatHistory.map((message, index) => (
                  <div key={message.id} className="mb-4">
                    {message.type === 'user' ? (
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-800 dark:text-gray-200 text-sm">
                          <span className="font-semibold">You:</span> {message.text}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 mt-2">
                        <div className="relative">
                          <p className="text-emerald-800 dark:text-emerald-200 text-sm whitespace-pre-line">
                            <span className="font-semibold">Zarium:</span> {message.text}
                            {/* Show the Z logo inline with text while typing or if it's the first assistant message and we haven't reached message 2 yet */}
                            {(message.isTyping || (message.messageNumber === 1 && assistantMessageCount < 2)) && (
                              <SpinningZLogo 
                                isTyping={message.isTyping ?? false} 
                                size={32} 
                                inlineWithText={true}
                                continueAnimation={message.messageNumber === 1 && assistantMessageCount < 2}
                              />
                            )}
                          </p>
                          
                          {/* Only show the Z logo after the message when typing is complete */}
                          {!message.isTyping && message.text && index === chatHistory.length - 1 && (
                            <div className="flex justify-end mt-2">
                              <SpinningZLogo 
                                isTyping={false} 
                                size={14}
                                continueAnimation={message.messageNumber === 1 && assistantMessageCount < 2}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Empty state message */}
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
            
            {/* Spreadsheet Viewer on the right - Fixed position */}
            <div className="w-3/5 lg:w-2/3 fixed right-0 top-0 h-screen overflow-hidden">
              {/* Error display */}
              {error && (
                <div className="m-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg text-center">
                  {error}
                </div>
              )}

              {/* Main spreadsheet container - takes all available height */}
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
            
            {/* Input area fixed at the bottom of the page for the sidebar */}
            <div className="fixed bottom-0 left-0 w-[calc(2/5*100%-16px)] lg:w-[calc(1/3*100%-16px)] p-4 z-50 bg-gradient-to-t from-emerald-50 to-transparent dark:from-gray-900 dark:to-transparent pt-8">
              <div className="relative w-full">
                {/* Hidden honeypot field */}
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

                    {/* Enhanced Mode Switch */}
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

                    {/* Add style selector here */}
                    <StyleSelector />

                    {/* Add Edit Previous switch only for Pro users */}
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

              {/* Selected files display */}
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
              
              {/* Tokens display */}
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