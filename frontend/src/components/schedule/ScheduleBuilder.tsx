import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { availabilityService } from '@/services/availabilityService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import type { Availability, CreateAvailabilityPayload } from '@/types';
import toast from 'react-hot-toast';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const SLOT_HEIGHT = 48; // px per hour

interface TimeBlock {
  id: string;
  day: number; // 0-6 (Mon-Sun)
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  slotDuration: number;
  isNew?: boolean;
}

function generateId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatHour(hour: number, minute: number = 0): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const m = minute > 0 ? `:${minute.toString().padStart(2, '0')}` : '';
  return `${h}${m} ${ampm}`;
}

function timeToString(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function parseTimeString(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m || 0 };
}

/** Visual drag-and-drop schedule builder for providers */
export const ScheduleBuilder: React.FC<{ providerId: string }> = ({ providerId }) => {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [originalBlocks, setOriginalBlocks] = useState<TimeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [dragState, setDragState] = useState<{
    blockId: string;
    type: 'move' | 'resize-top' | 'resize-bottom';
    startY: number;
    originalBlock: TimeBlock;
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  // Load existing availability
  useEffect(() => {
    const loadAvailability = async () => {
      if (!providerId) return;
      try {
        const data = await availabilityService.getAvailability(providerId);
        const loadedBlocks: TimeBlock[] = data.map((avail: Availability) => {
          const start = parseTimeString(avail.start_time);
          const end = parseTimeString(avail.end_time);
          return {
            id: avail.id,
            day: avail.day_of_week,
            startHour: start.hour,
            startMinute: start.minute,
            endHour: end.hour,
            endMinute: end.minute,
            slotDuration: avail.slot_duration_minutes,
          };
        });
        setBlocks(loadedBlocks);
        setOriginalBlocks(loadedBlocks);
      } catch {
        // Error handled
      } finally {
        setIsLoading(false);
      }
    };
    loadAvailability();
  }, [providerId]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(blocks) !== JSON.stringify(originalBlocks);
  }, [blocks, originalBlocks]);

  const dayBlocks = useMemo(() => {
    return blocks.filter((b) => b.day === selectedDay);
  }, [blocks, selectedDay]);

  // Add a new time block
  const handleAddBlock = () => {
    const newBlock: TimeBlock = {
      id: generateId(),
      day: selectedDay,
      startHour: 9,
      startMinute: 0,
      endHour: 17,
      endMinute: 0,
      slotDuration: 30,
      isNew: true,
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  // Delete a block
  const handleDeleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  // Copy day schedule to another day
  const handleCopyToDay = (targetDay: number) => {
    const sourceDayBlocks = blocks.filter((b) => b.day === selectedDay);
    const newBlocks = sourceDayBlocks.map((b) => ({
      ...b,
      id: generateId(),
      day: targetDay,
      isNew: true,
    }));
    // Remove existing blocks for target day and add copied ones
    setBlocks((prev) => [...prev.filter((b) => b.day !== targetDay), ...newBlocks]);
    toast.success(`Schedule copied to ${DAYS_OF_WEEK[targetDay]}`);
  };

  // Reset to original
  const handleReset = () => {
    setBlocks(originalBlocks);
    toast.success('Schedule reset to last saved state');
  };

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete removed blocks
      const removedBlocks = originalBlocks.filter(
        (ob) => !blocks.find((b) => b.id === ob.id)
      );
      for (const block of removedBlocks) {
        await availabilityService.delete(block.id);
      }

      // Create new blocks
      const newBlocks = blocks.filter((b) => b.isNew);
      for (const block of newBlocks) {
        const payload: CreateAvailabilityPayload = {
          day_of_week: block.day,
          start_time: timeToString(block.startHour, block.startMinute),
          end_time: timeToString(block.endHour, block.endMinute),
          slot_duration_minutes: block.slotDuration,
        };
        await availabilityService.create(payload);
      }

      // Update modified blocks (not new, but changed)
      const modifiedBlocks = blocks.filter((b) => {
        if (b.isNew) return false;
        const original = originalBlocks.find((ob) => ob.id === b.id);
        return original && JSON.stringify(original) !== JSON.stringify(b);
      });
      for (const block of modifiedBlocks) {
        await availabilityService.update(block.id, {
          day_of_week: block.day,
          start_time: timeToString(block.startHour, block.startMinute),
          end_time: timeToString(block.endHour, block.endMinute),
          slot_duration_minutes: block.slotDuration,
        });
      }

      // Reload
      const data = await availabilityService.getAvailability(providerId);
      const reloadedBlocks: TimeBlock[] = data.map((avail: Availability) => {
        const start = parseTimeString(avail.start_time);
        const end = parseTimeString(avail.end_time);
        return {
          id: avail.id,
          day: avail.day_of_week,
          startHour: start.hour,
          startMinute: start.minute,
          endHour: end.hour,
          endMinute: end.minute,
          slotDuration: avail.slot_duration_minutes,
        };
      });
      setBlocks(reloadedBlocks);
      setOriginalBlocks(reloadedBlocks);
      toast.success('Schedule saved successfully!');
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  // Mouse drag handlers for resizing blocks
  const handleMouseDown = (
    e: React.MouseEvent,
    blockId: string,
    type: 'move' | 'resize-top' | 'resize-bottom'
  ) => {
    e.preventDefault();
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    setDragState({
      blockId,
      type,
      startY: e.clientY,
      originalBlock: { ...block },
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState || !gridRef.current) return;

      const deltaY = e.clientY - dragState.startY;
      const hourDelta = Math.round(deltaY / SLOT_HEIGHT);

      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== dragState.blockId) return b;
          const orig = dragState.originalBlock;

          if (dragState.type === 'resize-bottom') {
            const newEndHour = Math.max(orig.startHour + 1, Math.min(24, orig.endHour + hourDelta));
            return { ...b, endHour: newEndHour };
          }
          if (dragState.type === 'resize-top') {
            const newStartHour = Math.max(0, Math.min(orig.endHour - 1, orig.startHour + hourDelta));
            return { ...b, startHour: newStartHour };
          }
          // Move
          const duration = orig.endHour - orig.startHour;
          const newStart = Math.max(0, Math.min(24 - duration, orig.startHour + hourDelta));
          return { ...b, startHour: newStart, endHour: newStart + duration };
        })
      );
    },
    [dragState]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-800 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Schedule Builder
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drag to adjust time blocks. Click + to add availability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="secondary" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Day selector */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {DAYS_OF_WEEK.map((day, index) => {
          const dayBlockCount = blocks.filter((b) => b.day === index).length;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(index)}
              className={cn(
                'flex flex-col items-center px-4 py-2 rounded-lg text-sm font-medium transition-all min-w-[80px]',
                selectedDay === index
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200 dark:ring-primary-800'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <span>{day.slice(0, 3)}</span>
              {dayBlockCount > 0 && (
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule grid */}
      <Card className="dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {DAYS_OF_WEEK[selectedDay]}
          </h3>
          <div className="flex items-center gap-2">
            {/* Copy to day dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                <Copy className="w-3.5 h-3.5" />
                Copy to...
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-20 hidden group-hover:block min-w-[120px]">
                {DAYS_OF_WEEK.map((day, index) => {
                  if (index === selectedDay) return null;
                  return (
                    <button
                      key={day}
                      onClick={() => handleCopyToDay(index)}
                      className="w-full px-3 py-1.5 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={handleAddBlock}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Block
            </button>
          </div>
        </div>

        {/* Time grid */}
        <div
          ref={gridRef}
          className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden select-none"
          style={{ height: `${12 * SLOT_HEIGHT}px` }} // Show 12 hours (6AM-6PM)
        >
          {/* Hour lines */}
          {Array.from({ length: 13 }, (_, i) => i + 6).map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-700/50 flex items-start"
              style={{ top: `${(hour - 6) * SLOT_HEIGHT}px` }}
            >
              <span className="text-[10px] text-gray-400 dark:text-gray-500 px-2 -mt-2 bg-white dark:bg-gray-800">
                {formatHour(hour)}
              </span>
            </div>
          ))}

          {/* Time blocks */}
          <AnimatePresence>
            {dayBlocks.map((block) => {
              const top = (block.startHour - 6) * SLOT_HEIGHT;
              const height = (block.endHour - block.startHour) * SLOT_HEIGHT;

              return (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    'absolute left-12 right-4 rounded-lg border-2 cursor-grab active:cursor-grabbing',
                    'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700',
                    'hover:shadow-md transition-shadow',
                    dragState?.blockId === block.id && 'ring-2 ring-primary-500 shadow-lg'
                  )}
                  style={{ top: `${top}px`, height: `${height}px`, minHeight: SLOT_HEIGHT }}
                >
                  {/* Resize handle top */}
                  <div
                    className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-primary-300/50 rounded-t-lg"
                    onMouseDown={(e) => handleMouseDown(e, block.id, 'resize-top')}
                  />

                  {/* Block content */}
                  <div
                    className="flex items-center justify-between h-full px-3 py-2"
                    onMouseDown={(e) => handleMouseDown(e, block.id, 'move')}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="w-4 h-4 text-primary-400 dark:text-primary-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-primary-800 dark:text-primary-200 truncate">
                          {formatHour(block.startHour, block.startMinute)} – {formatHour(block.endHour, block.endMinute)}
                        </p>
                        <p className="text-[10px] text-primary-600 dark:text-primary-400">
                          {block.slotDuration}min slots
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBlock(block.id);
                      }}
                      className="p-1 rounded text-primary-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                      aria-label="Delete time block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Resize handle bottom */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-primary-300/50 rounded-b-lg"
                    onMouseDown={(e) => handleMouseDown(e, block.id, 'resize-bottom')}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty state for day */}
          {dayBlocks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No availability set for {DAYS_OF_WEEK[selectedDay]}
                </p>
                <button
                  onClick={handleAddBlock}
                  className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
                >
                  + Add time block
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700" />
          <span>Available</span>
        </div>
        <span>•</span>
        <span>Drag edges to resize • Drag center to move • Click + to add</span>
      </div>
    </div>
  );
};
