import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { PageTransition } from '@/components/layout/PageTransition';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker';
import { TextArea } from '@/components/ui/TextArea';
import { Avatar } from '@/components/ui/Avatar';
import { availabilityService } from '@/services/availabilityService';
import { appointmentService } from '@/services/appointmentService';
import { useAppointmentStore } from '@/store/appointmentStore';
import { formatDate, formatTime, getGoogleCalendarUrl } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';
import type { Appointment, TimeSlot } from '@/types';
import toast from 'react-hot-toast';

export const RescheduleAppointment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchAppointment } = useAppointmentStore();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    const loadAppointment = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await appointmentService.getAppointment(id);
        setAppointment(data);
        setNotes(data.notes || '');
        setSelectedDate(data.appointment_date);
        setSelectedSlot(data.start_time);
        await fetchAppointment(id);
      } catch {
        toast.error('Failed to load appointment');
      } finally {
        setIsLoading(false);
      }
    };
    loadAppointment();
  }, [fetchAppointment, id]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!appointment?.provider_id || !selectedDate) return;
      setSlotsLoading(true);
      try {
        const response = await availabilityService.getSlots(appointment.provider_id, selectedDate);
        setSlots(response.slots);
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [appointment?.provider_id, selectedDate]);

  const currentSlot = useMemo(
    () => slots.find((slot) => slot.start_time === selectedSlot),
    [selectedSlot, slots]
  );

  const calendarUrl = appointment
    ? getGoogleCalendarUrl({
        title: `Appointment with ${appointment.provider?.user?.full_name || 'Provider'}`,
        description: `Rescheduled appointment with ${appointment.provider?.user?.full_name || 'Provider'}`,
        startDate: selectedDate || appointment.appointment_date,
        startTime: selectedSlot || appointment.start_time,
        endDate: selectedDate || appointment.appointment_date,
        endTime: currentSlot?.end_time || appointment.end_time,
      })
    : '';

  const handleSubmit = async () => {
    if (!id || !selectedDate || !selectedSlot) return;
    setIsSaving(true);
    try {
      await appointmentService.reschedule(id, {
        appointment_date: selectedDate,
        start_time: selectedSlot,
      });
      toast.success('Appointment rescheduled successfully');
      navigate(`/appointments/${id}`);
    } catch {
      toast.error('Failed to reschedule appointment');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !appointment) {
    return <LoadingSpinner size="lg" text="Loading reschedule page..." />;
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          to={`/appointments/${appointment.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to appointment
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reschedule Appointment</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Pick a new date and time. No additional payment is required for rescheduling.
            </p>
          </div>
          <a href={calendarUrl} target="_blank" rel="noreferrer">
            <Button variant="outline">Add to Google Calendar</Button>
          </a>
        </div>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <Avatar
              name={appointment.provider?.user?.full_name || 'Provider'}
              src={appointment.provider?.id ? getProviderImage(appointment.provider.id) : undefined}
              size="lg"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {appointment.provider?.user?.full_name || 'Provider'}
              </h2>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                {appointment.provider?.specialization}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current slot: {formatDate(appointment.appointment_date, 'EEE, MMM d, yyyy')} at {formatTime(appointment.start_time)}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Choose a new date</h3>
            </div>
            <DatePicker
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null);
              }}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            <TextArea
              label="Reschedule Notes"
              placeholder="Optional note for the provider"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Choose a new time</h3>
            </div>
            <TimeSlotPicker
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              isLoading={slotsLoading}
            />
          </Card>
        </div>

        <Card className="dark:bg-gray-800 dark:border-gray-700 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Review reschedule</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">New date</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {selectedDate ? formatDate(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">New time</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {selectedSlot ? formatTime(selectedSlot) : 'Select a time'}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(`/appointments/${appointment.id}`)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSaving} disabled={!selectedDate || !selectedSlot}>
              Confirm Reschedule
            </Button>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
};
