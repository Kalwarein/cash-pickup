import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

interface TradeOverlay {
  id: string;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
}

interface CandlestickChartProps {
  data: CandleData[];
  height?: number;
  trades?: TradeOverlay[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** When true, chart auto-follows latest candle */
  autoScroll?: boolean;
  onAutoScrollChange?: (value: boolean) => void;
}

export const CandlestickChart = ({ 
  data, 
  height = 300, 
  trades = [],
  isFullscreen = false,
  onToggleFullscreen,
  autoScroll = true,
  onAutoScrollChange
}: CandlestickChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // Resize tracking so "jump to latest" uses the correct viewport width
  const [viewportWidth, setViewportWidth] = useState(0);

  // Full-screen mode: use entire viewport minus bottom nav (~80px)
  const effectiveHeight = isFullscreen ? window.innerHeight - 120 : height;

  // Calculate visible candles based on zoom
  const candleWidth = 8 * zoomLevel;
  const candleGap = 2 * zoomLevel;
  const totalWidth = data.length * (candleWidth + candleGap);

  const getMaxScroll = useCallback(() => {
    const w = containerRef.current?.clientWidth || viewportWidth || 0;
    return Math.max(0, totalWidth - w + 60);
  }, [totalWidth, viewportWidth]);

  const isAtLatest = useCallback(() => {
    const max = getMaxScroll();
    return max === 0 || scrollPosition >= max - 20;
  }, [getMaxScroll, scrollPosition]);

  const jumpToLatest = useCallback(() => {
    const max = getMaxScroll();
    setScrollPosition(max);
  }, [getMaxScroll]);

  // Track container width changes (prevents "random" scroll jumps after tab switching / returning)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setViewportWidth(el.clientWidth);
    });
    ro.observe(el);
    setViewportWidth(el.clientWidth);

    return () => ro.disconnect();
  }, []);

  // Find price range for scaling (include trade lines in range)
  const { minPrice, maxPrice } = useMemo(() => {
    if (data.length === 0) return { minPrice: 0, maxPrice: 100 };
    let min = Infinity;
    let max = -Infinity;
    data.forEach(candle => {
      min = Math.min(min, candle.low);
      max = Math.max(max, candle.high);
    });
    // Include trade overlay prices in range
    trades.forEach(trade => {
      min = Math.min(min, trade.stopLoss);
      max = Math.max(max, trade.takeProfit);
    });
    const padding = (max - min) * 0.1;
    return { minPrice: min - padding, maxPrice: max + padding };
  }, [data, trades]);

  const priceRange = maxPrice - minPrice;

  // Scale price to Y coordinate
  const scaleY = useCallback((price: number) => {
    const chartHeight = effectiveHeight - 40;
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight + 10;
  }, [effectiveHeight, minPrice, priceRange]);

  // Handle zoom
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 4));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
  const handleReset = () => {
    setZoomLevel(1);
    setScrollPosition(0);
  };

  // Handle drag scrolling
  const handleMouseDown = (e: React.MouseEvent) => {
    // Disable auto-scroll when user drags
    if (autoScroll && onAutoScrollChange) {
      onAutoScrollChange(false);
    }
    setIsDragging(true);
    setDragStart(e.clientX + scrollPosition);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newScroll = dragStart - e.clientX;
      const maxScroll = getMaxScroll();
      const next = Math.max(0, Math.min(newScroll, maxScroll));
      setScrollPosition(next);
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredCandle(null);
  };

  // Handle wheel zoom and scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoomLevel(prev => Math.max(0.5, Math.min(4, prev * delta)));
    } else {
      // Disable auto-scroll when user scrolls manually
      if (autoScroll && onAutoScrollChange) {
        onAutoScrollChange(false);
      }
      const maxScroll = getMaxScroll();
      setScrollPosition(prev => {
        const next = Math.max(0, Math.min(maxScroll, prev + e.deltaX + e.deltaY));
        return next;
      });
    }
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Disable auto-scroll when user touches
      if (autoScroll && onAutoScrollChange) {
        onAutoScrollChange(false);
      }
      setIsDragging(true);
      setDragStart(e.touches[0].clientX + scrollPosition);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const newScroll = dragStart - e.touches[0].clientX;
      const maxScroll = getMaxScroll();
      const next = Math.max(0, Math.min(newScroll, maxScroll));
      setScrollPosition(next);
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Auto-scroll behavior controlled by autoScroll prop
  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const max = getMaxScroll();

    // Always clamp (prevents going out of bounds after resize)
    setScrollPosition(prev => Math.max(0, Math.min(prev, max)));

    // If autoScroll is enabled, follow latest candle deterministically.
    if (autoScroll) {
      // rAF ensures we use the post-layout width so we don't "jump".
      requestAnimationFrame(() => {
        const nextMax = getMaxScroll();
        setScrollPosition(nextMax);
      });
    }
  }, [data.length, getMaxScroll, autoScroll, viewportWidth, zoomLevel]);

  // Handle candle hover
  const handleCandleHover = (candle: CandleData, x: number, y: number) => {
    setHoveredCandle(candle);
    setHoverPosition({ x, y });
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No market data available
      </div>
    );
  }

  // Generate Y-axis labels
  const yAxisLabels = [];
  const labelCount = 5;
  for (let i = 0; i <= labelCount; i++) {
    const price = minPrice + (priceRange * i) / labelCount;
    yAxisLabels.push({ price, y: scaleY(price) });
  }

  return (
    <div className={cn("relative", isFullscreen && "fixed inset-0 z-50 bg-background p-4")}>
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border border-border">
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-muted rounded-md transition-colors"
          title="Zoom In (Ctrl+Scroll)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-muted rounded-md transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-muted rounded-md transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Auto-scroll toggle */}
        {onAutoScrollChange && (
          <button
            onClick={() => onAutoScrollChange(!autoScroll)}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              autoScroll ? "bg-primary/20 text-primary" : "hover:bg-muted"
            )}
            title={autoScroll ? "Auto-scroll ON (click to pause)" : "Auto-scroll OFF (click to resume)"}
          >
            {autoScroll ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        )}

        {/* Jump to latest */}
        {!autoScroll && !isAtLatest() && (
          <button
            onClick={() => {
              jumpToLatest();
              if (onAutoScrollChange) onAutoScrollChange(true);
            }}
            className="px-2 py-1.5 hover:bg-muted rounded-md transition-colors text-xs font-medium text-primary"
            title="Jump to latest candle and resume auto-scroll"
          >
            Latest
          </button>
        )}

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 hover:bg-muted rounded-md transition-colors"
            title={isFullscreen ? "Minimize" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
        <span className="px-2 text-xs text-muted-foreground border-l border-border ml-1">
          {Math.round(zoomLevel * 100)}%
        </span>
      </div>

      {/* Tooltip */}
      {hoveredCandle && (
        <div
          className="absolute z-20 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg pointer-events-none"
          style={{
            left: Math.min(hoverPosition.x + 10, (containerRef.current?.clientWidth || 200) - 150),
            top: hoverPosition.y - 100,
          }}
        >
          <p className="text-xs text-muted-foreground mb-2">{hoveredCandle.time}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Open:</span>
            <span className="font-mono text-right">{sle(hoveredCandle.open)}</span>
            <span className="text-muted-foreground">High:</span>
            <span className="font-mono text-right text-success">{sle(hoveredCandle.high)}</span>
            <span className="text-muted-foreground">Low:</span>
            <span className="font-mono text-right text-destructive">{sle(hoveredCandle.low)}</span>
            <span className="text-muted-foreground">Close:</span>
            <span className={cn(
              "font-mono text-right font-semibold",
              hoveredCandle.close >= hoveredCandle.open ? "text-success" : "text-destructive"
            )}>
              {sle(hoveredCandle.close)}
            </span>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Y-Axis */}
        <div className="w-14 flex-shrink-0 relative" style={{ height: effectiveHeight }}>
          {yAxisLabels.map((label, i) => (
            <div
              key={i}
              className="absolute right-2 text-xs text-muted-foreground font-mono"
              style={{ top: label.y - 6 }}
            >
              ${label.price.toFixed(0)}
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div
          ref={containerRef}
          className={cn(
            "flex-1 overflow-hidden relative",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{ height: effectiveHeight }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {yAxisLabels.map((label, i) => (
              <line
                key={i}
                x1="0"
                y1={label.y}
                x2="100%"
                y2={label.y}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="4,4"
              />
            ))}
          </svg>

          {/* Trade overlay lines (Entry, TP, SL) */}
          {trades.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {trades.map((trade) => (
                <g key={trade.id}>
                  {/* Entry Price Line */}
                  <line
                    x1="0"
                    y1={scaleY(trade.entryPrice)}
                    x2="100%"
                    y2={scaleY(trade.entryPrice)}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeDasharray="8,4"
                  />
                  <text
                    x="4"
                    y={scaleY(trade.entryPrice) - 4}
                    fill="hsl(var(--primary))"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    Entry ${trade.entryPrice.toFixed(2)}
                  </text>

                  {/* Take Profit Line */}
                  <line
                    x1="0"
                    y1={scaleY(trade.takeProfit)}
                    x2="100%"
                    y2={scaleY(trade.takeProfit)}
                    stroke="hsl(var(--success))"
                    strokeWidth="2"
                    strokeDasharray="8,4"
                  />
                  <text
                    x="4"
                    y={scaleY(trade.takeProfit) - 4}
                    fill="hsl(var(--success))"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    TP ${trade.takeProfit.toFixed(2)}
                  </text>

                  {/* Stop Loss Line */}
                  <line
                    x1="0"
                    y1={scaleY(trade.stopLoss)}
                    x2="100%"
                    y2={scaleY(trade.stopLoss)}
                    stroke="hsl(var(--destructive))"
                    strokeWidth="2"
                    strokeDasharray="8,4"
                  />
                  <text
                    x="4"
                    y={scaleY(trade.stopLoss) - 4}
                    fill="hsl(var(--destructive))"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    SL ${trade.stopLoss.toFixed(2)}
                  </text>
                </g>
              ))}
            </svg>
          )}

          {/* Candles */}
          <svg
            width={totalWidth}
            height={effectiveHeight}
            style={{ transform: `translateX(-${scrollPosition}px)` }}
          >
            {data.map((candle, i) => {
              const x = i * (candleWidth + candleGap) + candleGap / 2;
              const isGreen = candle.close >= candle.open;
              const bodyTop = scaleY(Math.max(candle.open, candle.close));
              const bodyBottom = scaleY(Math.min(candle.open, candle.close));
              const bodyHeight = Math.max(1, bodyBottom - bodyTop);
              const wickTop = scaleY(candle.high);
              const wickBottom = scaleY(candle.low);

              return (
                <g
                  key={candle.timestamp}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      handleCandleHover(candle, x - scrollPosition + rect.left, e.clientY - rect.top);
                    }
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      handleCandleHover(candle, x - scrollPosition, e.clientY - rect.top + 50);
                    }
                  }}
                  className={cn(
                    "cursor-pointer",
                    isGreen ? "text-success" : "text-destructive",
                  )}
                >
                  {/* Wick */}
                  <line
                    x1={x + candleWidth / 2}
                    y1={wickTop}
                    x2={x + candleWidth / 2}
                    y2={wickBottom}
                    stroke="currentColor"
                    strokeWidth={1}
                  />
                  {/* Body */}
                  <rect
                    x={x}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill="currentColor"
                    rx={1}
                  />
                  {/* Hover area (invisible) */}
                  <rect
                    x={x - candleGap / 2}
                    y={0}
                    width={candleWidth + candleGap}
                    height={effectiveHeight}
                    fill="transparent"
                  />
                </g>
              );
            })}
          </svg>

          {/* Scroll indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/50 rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((containerRef.current?.clientWidth || 0) / totalWidth) * 100)}%`,
                marginLeft: `${(scrollPosition / totalWidth) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-2 text-xs text-muted-foreground text-center">
        Drag to scroll • Ctrl+Scroll to zoom • Hover for details
      </div>
    </div>
  );
};
