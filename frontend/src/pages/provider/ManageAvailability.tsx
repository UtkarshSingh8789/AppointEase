import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Clock, CalendarX } from 'lucide-react';
import { providerService } from '@/services/providerService';
import { availabilityService } from '@/services/availabilityService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTransition } from '@/components/layout/PageTransition';
import { DAY_LABELS, formatDate } from '@/utils';
import type { Availability, AvailabilityException, CreateAvailabilityPayload } from '@/types';
import toast from 'react-hot-toast';

export const ManageAvailability: React.FC = () => {
  const [providerId, setProviderId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [deleteExceptionId, setDeleteExceptionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateAvailabilityPayload>({
    day_of_week: 0,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
  });
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        // Fetch provider profile to get the provider ID
        const profile = await providerService.getMyProfile();
        setProviderId(profile.id);
        await fetchAvailability(profile.id);
        await fetchExceptions(profile.id);
      } catch {
        // Provider might not be registered yet
        setAvailability([]);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const fetchAvailability = async (id: string) => {
    try {
      const data = await availabilityService.getAvailability(id);
      setAvailability(data);
    } catch {
      setAvailability([]);
    }
  };

  const fetchExceptions = async (id: string) => {
    try {
      const data = await availabilityService.getExceptions(id);
      setExceptions(data);
    } catch {
      setExceptions([]);
    }
  };

  const handleAdd = async () => {
    try {
      await availabilityService.create(formData);
      toast.success('Availability slot added');
      setShowAddModal(false);
      if (providerId) await fetchAvailability(providerId);
    } catch {
      toast.error('Failed to add availability slot');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await availabilityService.delete(id);
      toast.success('Availability slot removed');
      setAvailability((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('Failed to remove availability slot');
    } finally {
      setDeleteSlotId(null);
    }
  };

  const handleBlockDate = async () => {
    if (!blockDate) {
      toast.error('Please select a date');
      return;
    }
    try {
      await availabilityService.createException({
        date: blockDate,
        reason: blockReason || undefined,
        is_blocked: true,
      });
      toast.success('Date blocked successfully');
      setShowBlockModal(false);
      setBlockDate('');
      setBlockReason('');
      if (providerId) await fetchExceptions(providerId);
    } catch {
      toast.error('Failed to block date');
    }
  };

  const handleDeleteException = async (id: string) => {
    try {
      await availabilityService.deleteException(id);
      toast.success('Blocked date removed');
      setExceptions((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error('Failed to remove blocked date');
    } finally {
      setDeleteExceptionId(null);
    }
  };

  const dayOptions = DAY_LABELS.map((label, index) => ({
    value: String(index),
    label,
  }));

  const durationOptions = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
  ];

  // Group availability by day
  const groupedByDay = DAY_LABELS.map((day, index) => ({
    day,
    dayIndex: index,
    slots: availability.filter((a) => a.day_of_week === index),
  }));

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading availability..." />;
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Availability</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Set your weekly schedule and slot duration</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
          Add Slot
        </Button>
      </div>

      {/* Weekly schedule */}
      <div className="space-y-4">
        {groupedByDay.map(({ day, slots }) => (
          <Card key={day} className="dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{day}</h3>
              {slots.length === 0 && (
                <span className="text-sm text-gray-400 dark:text-gray-500">No availability set</span>
              )}
            </div>
            {slots.length > 0 && (
              <div className="mt-3 space-y-2">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                        {slot.slot_duration_minutes} min slots
                      </span>
                      {!slot.is_active && (
                        <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setDeleteSlotId(slot.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      aria-label="Delete slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {availability.length === 0 && (
        <EmptyState
          icon={<Clock className="w-8 h-8 text-gray-400" />}
          title="No availability set"
          description="Add your available hours so customers can book appointments"
          action={
            <Button onClick={() => setShowAddModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Add Your First Slot
            </Button>
          }
        />
      )}

      {/* Blocked Dates Section */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Blocked Dates</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Days you are unavailable for appointments</p>
          </div>
          <Button
            variant="secondary"
            leftIcon={<CalendarX className="w-4 h-4" />}
            onClick={() => setShowBlockModal(true)}
          >
            Block Date
          </Button>
        </div>

        {exceptions.length === 0 ? (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No blocked dates
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {exceptions.map((exception) => (
              <Card key={exception.id} className="dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarX className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(exception.date, 'EEEE, MMMM d, yyyy')}
                      </p>
                      {exception.reason && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{exception.reason}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteExceptionId(exception.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Remove blocked date"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add availability modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Availability Slot"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Slot</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Day of Week"
            options={dayOptions}
            value={String(formData.day_of_week)}
            onChange={(e) =>
              setFormData({ ...formData, day_of_week: parseInt(e.target.value) })
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>
          <Select
            label="Slot Duration"
            options={durationOptions}
            value={String(formData.slot_duration_minutes)}
            onChange={(e) =>
              setFormData({ ...formData, slot_duration_minutes: parseInt(e.target.value) })
            }
          />
        </div>
      </Modal>

      {/* Block date modal */}
      <Modal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        title="Block a Date"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBlockModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBlockDate}>Block Date</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
          />
          <Input
            label="Reason (optional)"
            placeholder="e.g., Personal day, Holiday"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Confirm delete availability slot */}
      <ConfirmDialog
        isOpen={!!deleteSlotId}
        onClose={() => setDeleteSlotId(null)}
        onConfirm={() => deleteSlotId && handleDelete(deleteSlotId)}
        title="Delete Availability Slot"
        message="Are you sure you want to remove this availability slot? Customers will no longer be able to book during this time."
        confirmLabel="Delete Slot"
        variant="warning"
      />

      {/* Confirm delete blocked date */}
      <ConfirmDialog
        isOpen={!!deleteExceptionId}
        onClose={() => setDeleteExceptionId(null)}
        onConfirm={() => deleteExceptionId && handleDeleteException(deleteExceptionId)}
        title="Remove Blocked Date"
        message="Are you sure you want to unblock this date? Customers will be able to book appointments on this date again."
        confirmLabel="Unblock"
        variant="warning"
      />
    </div>
    </PageTransition>
  );
};
