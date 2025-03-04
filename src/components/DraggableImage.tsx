import React, { useState, useRef, MouseEvent } from 'react';

interface DraggableImageProps {
  src: string;
  containerWidth: number;  
  containerHeight: number; 
  zoom?: number;          
}

const DraggableImage: React.FC<DraggableImageProps> = ({
  src,
  containerWidth,
  containerHeight,
  zoom = 1.5,
}) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  };

  const handleMouseUpOrLeave = () => {
    dragging.current = false;
  };

  return (
    <div
      style={{
        width: containerWidth,
        height: containerHeight,
        overflow: 'hidden',
        position: 'relative',
        cursor: dragging.current ? 'grabbing' : 'grab',
        border: '1px solid #ccc',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
    >
      <img
        src={src}
        alt="Forhåndsvisning"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: 'top left',
          userSelect: 'none',
          pointerEvents: 'none', 
        }}
        draggable={false}
      />
    </div>
  );
};

export default DraggableImage;
