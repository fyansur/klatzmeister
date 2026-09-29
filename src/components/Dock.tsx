'use client';

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence
} from 'motion/react';
import React, { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
};

export type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
  orientation?: 'horizontal' | 'vertical';
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
  label?: React.ReactNode;
  vertical: boolean;
};

function DockItem({
  children,
  className = '',
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  label,
  vertical
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, val => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, y: 0 };
    return val - (vertical ? rect.y : rect.x) - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-center justify-center rounded-2xl bg-[#120F17] border-neutral-700 border cursor-pointer ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
      aria-label={typeof label === 'string' ? label : undefined}
    >
      {Children.map(children, child =>
        React.isValidElement(child)
          ? cloneElement(child as React.ReactElement<{ isHovered?: MotionValue<number> }>, { isHovered })
          : child
      )}
    </motion.div>
  );
}

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
  vertical?: boolean;
};

function DockLabel({ children, className = '', isHovered, vertical }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on('change', latest => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, ...(vertical ? { x: 0 } : { y: 0 }) }}
          animate={{ opacity: 1, ...(vertical ? { x: -10 } : { y: -10 }) }}
          exit={{ opacity: 0, ...(vertical ? { x: 0 } : { y: 0 }) }}
          transition={{ duration: 0.2 }}
          className={`${className} absolute w-fit whitespace-pre rounded-md border border-neutral-700 bg-[#120F17] px-2 py-0.5 text-xs text-white ${vertical ? 'right-full top-1/2' : '-top-6 left-1/2'}`}
          role="tooltip"
          style={vertical ? { y: '-50%' } : { x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockIcon({ children, className = '' }: DockIconProps) {
  return <div className={`flex items-center justify-center ${className}`}>{children}</div>;
}

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 50,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  orientation = 'horizontal'
}: DockProps) {
  const vertical = orientation === 'vertical';
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(() => Math.max(dockHeight, magnification + magnification / 2 + 4), [magnification]);
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  const panel = (
    <motion.div
      onMouseMove={({ clientX, clientY }) => {
        isHovered.set(1);
        mouseX.set(vertical ? clientY : clientX);
      }}
      onMouseLeave={() => {
        isHovered.set(0);
        mouseX.set(Infinity);
      }}
      className={
        vertical
          ? `${className} flex h-fit flex-col items-center gap-4 rounded-2xl border-neutral-700 border px-4 py-4`
          : `${className} absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-end w-fit gap-4 rounded-2xl border-neutral-700 `
      }
      style={vertical ? { width: 74 } : { height: panelHeight }}
      role="toolbar"
      aria-label="Application dock"
    >
      {items.map((item, index) => (
        <DockItem
          key={index}
          onClick={item.onClick}
          className={item.className}
          mouseX={mouseX}
          spring={spring}
          distance={distance}
          magnification={50}
          baseItemSize={50}
          label={item.label}
          vertical={vertical}
        >
          <DockIcon>{item.icon}</DockIcon>
          <DockLabel vertical={vertical}>{item.label}</DockLabel>
        </DockItem>
      ))}
    </motion.div>
  );

  // vertical: item gede ke kiri (overflow panel), nggak butuh wrapper yang ikut melar
  if (vertical) return panel;

  return (
    <motion.div style={{ height, scrollbarWidth: 'none' }} className="mx-2 flex max-w-full items-center">
      {panel}
    </motion.div>
  );
}
