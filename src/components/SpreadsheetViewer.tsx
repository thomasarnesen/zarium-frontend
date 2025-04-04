import React, { useEffect, useState, useRef, MouseEvent } from 'react';
import { Download, Maximize, Minimize } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/overlay.css';

interface SpreadsheetViewerProps {
  previewImage: string | null;
  isGenerating: boolean;
  generationStatus: string;
  formatting?: {
    hasChart: boolean;
    downloadUrl: string;
    requestAnalysis?: string;
    resultSummary?: string;
  } | null;
  planType?: string;
  visible?: boolean;
  fullHeight?: boolean;
  stickyBottom?: boolean;
  preventAutoScroll?: boolean;
  showControls?: boolean;
  newGenerationStarted?: boolean;
}

const BASE_WIDTH = 2400;  // Increased from 1900
const BASE_HEIGHT = 1200; // Increased from 1000

const CELL_HEIGHT = 6;
const CELL_WIDTH = 24;
const HEADER_HEIGHT = 8;
const TRIPLE_WIDTH = CELL_WIDTH * 3;
const ROW_COUNT = 100;
const A_Z_COUNT = 26;
const AA_BA_COUNT = 27;
const TOTAL_COLUMNS = A_Z_COUNT + AA_BA_COUNT;

export function SpreadsheetViewer({ 
  previewImage, 
  isGenerating, 
  generationStatus,
  formatting,
  planType,
  visible = true,
  fullHeight = false,
  stickyBottom = false,
  preventAutoScroll = false,
  showControls = true,
  newGenerationStarted = false
}: SpreadsheetViewerProps) {
  if (!visible && !previewImage && !isGenerating) {
    return null;
  }
  const { user } = useAuthStore();
  const token = user?.token;
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.65);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();

  const [shadowOverlay, setShadowOverlay] = useState(false);
  const [imageAnimating, setImageAnimating] = useState(false);
  const [prevPreviewImage, setPrevPreviewImage] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [fadeState, setFadeState] = useState<'fade-in' | 'fade-out'>('fade-out');


  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .slider-thumb::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #059669;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .slider-thumb::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #059669;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .slider-thumb::-webkit-slider-runnable-track {
        width: 100%;
        height: 4px;
        background: transparent;
      }
      
      .slider-thumb::-moz-range-track {
        width: 100%;
        height: 4px;
        background: transparent;
      }
      
      :fullscreen, ::backdrop {
        background-color: white;
      }
      
      .dark :fullscreen, .dark ::backdrop {
        background-color: #1f2937;
      }
      
      .fullscreen-container {
        transition: all 2s ease-out;
      }
      
      :fullscreen .fullscreen-container {
        max-width: 100vw !important;
        max-height: 100vh !important;
        width: 100vw !important;
        height: 100vh !important;
        padding: 1rem;
        display: flex;
        flex-direction: column;
      }

      @keyframes shadowSweep {
        0% { 
          background: linear-gradient(to bottom, rgba(10, 124, 104, 0.2) 0%, transparent 5%, transparent 100%);
        }
        50% {
          background: linear-gradient(to bottom, transparent 0%, rgba(10, 124, 104, 0.2) 50%, transparent 55%, transparent 100%);
        }
        100% {
          background: linear-gradient(to bottom, transparent 0%, transparent 95%, rgba(10, 124, 104, 0.2) 100%);
          opacity: 0;
        }
      }
      
      .shadow-sweep-animation {
        animation: shadowSweep 1.8s ease-in-out infinite;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 10;
      }
      
      /* Replace the old imageReveal animation with our new curtain-style animation */
      @keyframes imageReveal {
        0% {
          transform: translateY(-100%);
          opacity: 0.7;
        }
        100% {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .image-reveal-animation {
        animation: imageReveal 0.8s cubic-bezier(0.33, 1, 0.68, 1) forwards;
        animation-iteration-count: 1;
        animation-fill-mode: forwards;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    if (previewImage) {
      console.log("Preview image received, length:", previewImage.length);
      setImageError(false);
    } else {
      console.log("No preview available");
    }
  }, [previewImage]);

  useEffect(() => {
    if (preventAutoScroll && containerRef.current) {
      const currentScrollLeft = containerRef.current.scrollLeft;
      const currentScrollTop = containerRef.current.scrollTop;
      
      return () => {
        if (containerRef.current) {
          containerRef.current.scrollLeft = currentScrollLeft;
          containerRef.current.scrollTop = currentScrollTop;
        }
      };
    }
  }, [preventAutoScroll, previewImage, isGenerating, generationStatus]);

  useEffect(() => {
    if (previewImage && previewImage !== prevPreviewImage) {
      setImageAnimating(true);
      setPrevPreviewImage(previewImage);
      
      const timer = setTimeout(() => {
        setImageAnimating(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [previewImage, prevPreviewImage]);

  useEffect(() => {
    // When generating or a new generation started, fade in the overlay
    if (isGenerating || newGenerationStarted) {
      setFadeState('fade-in');
    } 
    // When a preview image is available and we're not generating, fade out
    else if (previewImage && !isGenerating) {
      // Add a small delay before fade out to ensure smooth transition
      const timer = setTimeout(() => {
        setFadeState('fade-out');
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [previewImage, isGenerating, newGenerationStarted]);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseFloat(e.target.value);
    
    if (!previewImage && !imageError && sliderValue < 80) {
      setScale(0.8);
      return;
    }
    
    const actualScale = 0.3 + (sliderValue - 50) * 0.012;
    setScale(actualScale);
    console.log("Slider value:", sliderValue, "Actual scale:", actualScale);
  };

  const handleZoomClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  const handleDownload = async () => {
    if (planType === 'Demo') {
      navigate('/subscription');
      return;
    }

    if (!formatting?.downloadUrl) {
      console.error("No download URL available");
      return;
    }
   
    try {
      console.log("Downloading from:", formatting.downloadUrl);
      const response = await api.fetch(formatting.downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed with status:', response.status, errorText);
        throw new Error('Download failed');
      }
     
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'generated-excel.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      console.log("Download completed successfully");
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'Processing':
        return "Processing your request...\nGeneration time depends on complexity";
      case 'Thinking':
        return "Charts and graphs may appear over data in the preview...\nThis can be adjustet when downloading xlsx file";
      case 'Generating':
        return "Tip: Don't miss the Quick Start Guide in your downloaded Excel file \nit contains important setup instructions for optimal use."; 
      case 'Finalizing':
        return "Finalizing your document...\nAlmost there!";
      case 'Analyzing your requirements...':
        return "Tip: Don't miss the Quick Start Guide in your downloaded Excel file\nit contains important setup instructions for optimal use.";
      case 'Designing spreadsheet structure...':
        return "Designing spreadsheet structure...";
      case 'Generating Excel file...':
        return "Charts and graphs may appear over data in the preview \nCharts and graphs may appear over data in the preview";
      case 'Complete':
        return "Generation complete!";
      default:
        return status || "Processing your request...";
    }
  };
  useEffect(() => {
    if (previewImage) {
      console.log("Preview image received, length:", previewImage.length);
      setImageError(false);
    } else {
      console.log("No preview available");
    }
  }, [previewImage]);

  useEffect(() => {
    if (preventAutoScroll && containerRef.current) {
      const currentScrollLeft = containerRef.current.scrollLeft;
      const currentScrollTop = containerRef.current.scrollTop;
      
      return () => {
        if (containerRef.current) {
          containerRef.current.scrollLeft = currentScrollLeft;
          containerRef.current.scrollTop = currentScrollTop;
        }
      };
    }
  }, [preventAutoScroll, previewImage, isGenerating, generationStatus]);

  useEffect(() => {
    if (isGenerating) {
      setShadowOverlay(false);
    } else {
      const timer = setTimeout(() => {
        setShadowOverlay(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isGenerating]);

  useEffect(() => {
    if (previewImage && previewImage !== prevPreviewImage) {
      setImageAnimating(true);
      setPrevPreviewImage(previewImage);
      
      const timer = setTimeout(() => {
        setImageAnimating(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [previewImage, prevPreviewImage]);

  useEffect(() => {
    // Simplified effect with debouncing to prevent flickering
    let timeoutId: number | null = null;
    
    // When generating, immediately show overlay
    if (isGenerating || newGenerationStarted) {
      setOverlayVisible(true);
      // Clear any pending timeout
      if (timeoutId) window.clearTimeout(timeoutId);
    } 
    // When preview image appears, hide overlay after a short delay
    else if (previewImage) {
      // Use timeout to ensure smooth transition
      timeoutId = window.setTimeout(() => {
        setOverlayVisible(false);
      }, 200);
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [previewImage, isGenerating, newGenerationStarted]);
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current!.offsetLeft);
    setStartY(e.pageY - containerRef.current!.offsetTop);
    setScrollLeft(containerRef.current!.scrollLeft);
    setScrollTop(containerRef.current!.scrollTop);
    e.preventDefault();
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const x = e.pageX - containerRef.current!.offsetLeft;
    const y = e.pageY - containerRef.current!.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    containerRef.current!.scrollLeft = scrollLeft - walkX;
    containerRef.current!.scrollTop = scrollTop - walkY;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  const getMinZoomValue = () => {
    if (!previewImage && !imageError) {
      return 60;
    }
    return 50;
  };

  const toggleFullscreen = () => {
    if (!viewerRef.current) return;
    
    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        if (containerRef.current) {
          containerRef.current.scrollLeft = 0;
          containerRef.current.scrollTop = 0;
        }
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className={`flex flex-col h-full fullscreen-container ${isFullscreen ? 'fullscreen-active' : ''}`} ref={viewerRef}>
      <div className="flex flex-grow relative">
        <div className="relative flex-grow">
          {/* Updated glass overlay with fade classes */}
          <div className="glass-overlay-container">
            <div className={`glass-overlay ${fadeState}`}></div>
          </div>
          <div 
            className="overflow-hidden rounded-lg h-full w-full flex flex-col relative"
            style={{ 
              width: `${BASE_WIDTH}px`, 
              maxWidth: '100%'
            }}
          >
            {shadowOverlay && (
              <div className="shadow-sweep-animation"></div>
            )}
           
            {previewImage && formatting?.hasChart && !isGenerating && (
              <div className="absolute top-4 right-4 z-20 max-w-xs">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    <span className="font-medium">Note:</span> Charts may overlap with data in the preview. 
                    Download the Excel file to reposition elements as needed.
                  </p>
                </div>
              </div>
            )}

            <div
              ref={containerRef}
              className="flex-grow overflow-auto" 
              style={{ 
                pointerEvents: isGenerating ? 'none' : 'auto',
                cursor: isDragging ? 'grabbing' : 'grab',
                overscrollBehavior: preventAutoScroll ? 'none' : 'auto'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className="min-w-full min-h-full relative">
                {previewImage ? (
                  <div 
                    style={{
                      transform: `scale(${scale})`,
                      transition: 'transform 2s ease-out',
                      cursor: 'grab',
                      transformOrigin: 'top left',
                      width: `${Math.min(3000, Math.max(BASE_WIDTH, BASE_WIDTH / scale))}px`, // Increased maxWidth
                      height: `${Math.min(1800, Math.max(BASE_HEIGHT, BASE_HEIGHT / scale))}px`, // Increased maxHeight
                      maxWidth: '3000px', // Increased from 2400px
                      maxHeight: '1800px', // Increased from 1200px
                      minHeight: `${BASE_HEIGHT}px`,
                      minWidth: `${BASE_WIDTH}px`
                    }}
                  >
                    <img
                      src={previewImage || ''}
                      alt="Excel preview"
                      className="max-w-none"
                      style={{
                        imageRendering: '-webkit-optimize-contrast',
                        display: 'block'
                      }}
                      onError={() => {
                        console.error("Image failed to load");
                        setImageError(true);
                      }}
                    />
                  </div>
                ) : (
                  imageError ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400">Failed to load preview</p>
                    </div>
                  ) : (
                    <div 
                      className="h-full w-full"
                      style={{
                        width: '100%',
                        height: '100%'
                      }}
                    >
                      <div 
                        style={{
                          transform: `scale(${scale})`,
                          transition: 'transform 0.1s ease-out',
                          transformOrigin: 'top left',
                          width: `${Math.min(2800, Math.max(BASE_WIDTH, BASE_WIDTH / scale))}px`, // Increased from 2700px
                          height: `${Math.min(1800, Math.max(BASE_HEIGHT, BASE_HEIGHT / scale))}px` // Increased from 1500px
                        }}
                      >
                        <div className="h-full w-full bg-white" style={{ 
                          minWidth: `calc(12px + ${TRIPLE_WIDTH * TOTAL_COLUMNS}px)`
                        }}>
                          <div className="flex border-b border-gray-200 sticky top-0 z-10">
                            <div className="w-12 h-8 bg-gray-100 border-r border-gray-200 flex items-center justify-center sticky left-0 z-20"></div>
                            
                            {[
                              ...Array.from({ length: A_Z_COUNT }, (_, i) => String.fromCharCode(65 + i)),
                              ...Array.from({ length: AA_BA_COUNT }, (_, i) => {
                                const firstChar = 'A';
                                const secondChar = String.fromCharCode(65 + i);
                                return firstChar + secondChar;
                              })
                            ].map((column, index) => (
                              <div 
                                key={column}
                                className={`h-${HEADER_HEIGHT} bg-gray-100 border-r border-gray-200 flex items-center justify-center text-sm text-gray-600 font-medium`}
                                style={{ width: `${TRIPLE_WIDTH}px` }}
                              >
                                {column}
                              </div>
                            ))}
                          </div>
                          
                          {Array.from({ length: ROW_COUNT }, (_, i) => i + 1).map(rowNum => (
                            <div key={rowNum} className="flex border-b border-gray-200">
                              <div className="w-12 h-6 bg-gray-100 border-r border-gray-200 flex items-center justify-center text-sm text-gray-600 font-medium sticky left-0">
                                {rowNum}
                              </div>
                              
                              {Array.from({ length: TOTAL_COLUMNS }, (_, i) => i).map(cellIndex => (
                                <div 
                                  key={cellIndex}
                                  className={`h-${CELL_HEIGHT} border-r border-gray-200`}
                                  style={{ width: `${TRIPLE_WIDTH}px` }}
                                ></div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
          
          {/* Fixed control bar that doesn't move with zoom */}
          {showControls && (
            <div 
              className="fixed left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-800 rounded-lg p-3 shadow-md flex items-center z-50"
              style={{ 
                bottom: '20px', 
                width: 'auto',
                maxWidth: '90%'
              }}
            >
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-800 dark:text-emerald-300">Zoom</span>
                  <input 
                    type="range" 
                    min={getMinZoomValue()}
                    max="150" 
                    value={Math.max(getMinZoomValue(), Math.round(scale * 100))}
                    onChange={handleZoomChange}
                    onClick={handleZoomClick}
                    className="w-28 h-2 appearance-none bg-transparent slider-thumb"
                    aria-label="Zoom level"
                  />
                  <span className="text-xs text-emerald-800 dark:text-emerald-300">
                    {Math.round(scale * 100)}%
                  </span>
                </div>
                
                <button
                  onClick={handleDownload}
                  disabled={!formatting?.downloadUrl}
                  className={`px-3 py-1.5 rounded flex items-center gap-1.5 text-sm
                    ${formatting?.downloadUrl 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}
                  `}
                  title={!formatting?.downloadUrl
                    ? 'Generate a spreadsheet first'
                    : planType === 'Demo'
                      ? 'Upgrade to download this file'
                      : 'Download Excel file'
                  }
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
                
                <button
                  onClick={toggleFullscreen}
                  className="px-3 py-1.5 rounded flex items-center gap-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                  title={isFullscreen ? 'Exit fullscreen' : 'View in fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                  <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}