import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, CheckCircle, FileText, Star, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useProviderStore } from '@/store/providerStore';
import { useAppointmentStore } from '@/store/appointmentStore';
import { availabilityService } from '@/services/availabilityService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker';
import { TextArea } from '@/components/ui/TextArea';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { PageTransition } from '@/components/layout/PageTransition';
import { formatCurrency, formatTime, getGoogleCalendarUrl } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';
import type { TimeSlot } from '@/types';
import api from '@/services/api';
import { loyaltyService } from '@/services/loyaltyService';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

// Bug #43 fix: typed Razorpay window accessor instead of (window as any).Razorpay
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (resp: { error?: { description?: string } }) => void) => void;
    };
  }
}
const getWindowRazorpay = () => window.Razorpay;

const STEPS = ['Date', 'Time', 'Details', 'Confirm'];

const getDurationMinutes = (startTime: string | null, endTime?: string | null) => {
  if (!startTime || !endTime) return 60;

  const [startHour = '0', startMinute = '0'] = startTime.split(':');
  const [endHour = '0', endMinute = '0'] = endTime.split(':');
  const startTotal = Number(startHour) * 60 + Number(startMinute);
  const endTotal = Number(endHour) * 60 + Number(endMinute);

  return Math.max(endTotal - startTotal, 0) || 60;
};

export const BookAppointment: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const location = useLocation();
  const { selectedProvider, fetchProvider, isLoading: providerLoading } = useProviderStore();
  const { createAppointment, isLoading: bookingLoading } = useAppointmentStore();
  const { user } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  // AI Feature #2: smart slot suggestions
  const [smartSlots, setSmartSlots] = useState<Array<{ start_time: string; ai_reason: string }>>([]);
  const timeSlotRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const calendarOpenedRef = useRef(false);
  const prefilledSlotRef = useRef<string | null>(null);

  useEffect(() => {
    if (providerId) {
      fetchProvider(providerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefilledDate = params.get('date');
    const prefilledSlot = params.get('time');
    const prefilledStep = params.get('step');
    prefilledSlotRef.current = prefilledSlot;
    if (prefilledDate) {
      setSelectedDate(prefilledDate);
    }
    if (prefilledSlot) {
      setSelectedSlot(prefilledSlot);
    }
    if (prefilledDate && prefilledSlot && prefilledStep === 'confirm') {
      setCurrentStep(3);
    }
  }, [location.search]);

  useEffect(() => {
    const loadLoyaltyAccount = async () => {
      try {
        const account = await loyaltyService.getAccount();
        setLoyaltyPoints(account.points || 0);
      } catch {
        setLoyaltyPoints(0);
      }
    };
    loadLoyaltyAccount();
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!providerId || !selectedDate) return;
      setSlotsLoading(true);
      try {
        const response = await availabilityService.getSlots(providerId, selectedDate);
        setSlots(response.slots);
        // AI Feature #2: fetch smart slot recommendations in parallel (non-blocking)
        availabilityService.getSmartSlots(providerId, selectedDate)
          .then((res) => setSmartSlots(res.suggestions || []))
          .catch(() => setSmartSlots([]));
        const currentPrefilledSlot = prefilledSlotRef.current;
        setSelectedSlot((current) => {
          if (currentPrefilledSlot && response.slots.some((slot) => slot.start_time === currentPrefilledSlot)) {
            return currentPrefilledSlot;
          }
          if (current && response.slots.some((slot) => slot.start_time === current)) {
            return current;
          }
          return null;
        });
      } catch {
        setSlots([]);
        setSelectedSlot(null);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [providerId, selectedDate]);

  // Advance step when date is selected — then scroll to time slot picker
  useEffect(() => {
    if (selectedDate && currentStep === 0) {
      setCurrentStep(1);
      setTimeout(() => timeSlotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, [selectedDate, currentStep]);

  // Advance step when time slot is selected — then scroll to details
  useEffect(() => {
    if (selectedSlot && currentStep === 1) {
      setCurrentStep(2);
      setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, [selectedSlot, currentStep]);

  const selectedSlotDetails = slots.find((slot) => slot.start_time === selectedSlot);
  const appointmentDurationMinutes = getDurationMinutes(
    selectedSlot,
    selectedSlotDetails?.end_time
  );
  const hourlyRate = selectedProvider?.hourly_rate || 500;
  const appointmentCharge = Number(
    ((hourlyRate * appointmentDurationMinutes) / 60).toFixed(2)
  );
  const gst = Math.round(appointmentCharge * 0.18);
  const grossTotal = appointmentCharge + gst;
  const maxRedeemable = Math.max(Math.floor(grossTotal), 0);
  const appliedDiscount = Math.min(pointsToRedeem, loyaltyPoints, maxRedeemable);
  const payableTotal = Math.max(grossTotal - appliedDiscount, 0);

  useEffect(() => {
    setPointsToRedeem((current) =>
      Math.max(0, Math.min(current, loyaltyPoints, Math.floor(grossTotal)))
    );
  }, [grossTotal, loyaltyPoints]);

  const handleBook = async () => {
    if (
      !providerId ||
      !selectedDate ||
      !selectedSlot ||
      !selectedSlotDetails ||
      slotsLoading ||
      isSubmittingBooking
    ) {
      toast.error('Please wait for the selected slot to finish loading.');
      return;
    }

    setIsSubmittingBooking(true);

    // Check if Razorpay is available
    const RazorpayClass = getWindowRazorpay();

    const completeBooking = async () => {
      await createAppointment({
        provider_id: providerId,
        appointment_date: selectedDate,
        start_time: selectedSlot,
        notes: notes || undefined,
        discount_amount: appliedDiscount,
      });
      if (appliedDiscount > 0) {
        try {
          await loyaltyService.redeem(appliedDiscount);
        } catch {
          // Loyalty redemption should not block booking confirmation.
        }
      }
      setBookingSuccess(true);
    };

    const finishWithLocalBooking = async (message?: string) => {
      try {
        await completeBooking();
        if (message) {
          toast.success(message);
        }
      } catch {
        // Store already handles the visible error state.
      }
    };

    if (payableTotal <= 0) {
      try {
        await completeBooking();
        toast.success('Appointment booked using wallet points.');
      } catch {
        // Store already handles the visible error state.
      } finally {
        setIsSubmittingBooking(false);
      }
      return;
    }

    const verifyPaymentAndComplete = async (paymentResponse: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      try {
        const verifyRes = await api.post('/payments/verify', {
          ...paymentResponse,
          appointment_id: providerId,
        });

        if (!verifyRes.data?.verified) {
          toast.error('Payment verification failed. Please try again.');
          return;
        }

        await completeBooking();
      } catch (error) {
        console.error('Razorpay verification failed:', error);
        toast.error('Payment verification failed. Please try again.');
      }
    };

    const openRazorpay = (orderData: {
      key_id: string;
      amount: number;
      currency: string;
      order_id: string;
    }) => {
      if (!RazorpayClass) return false;
      if (!orderData.key_id || !orderData.order_id) return false;
      if (
        orderData.key_id === 'rzp_test_mock' ||
        orderData.key_id.startsWith('mock_') ||
        orderData.order_id.startsWith('mock_')
      ) {
        return false;
      }

      const rzp = new RazorpayClass({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'AppointEase',
        description: `Appointment with ${selectedProvider?.user?.full_name || 'Provider'}`,
        order_id: orderData.order_id,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await verifyPaymentAndComplete(response);
        },
        modal: {
          ondismiss: () => {
            toast('Payment window closed. Your appointment was not booked.');
            setIsSubmittingBooking(false);
          },
        },
        prefill: {
          name: user?.full_name || selectedProvider?.user?.full_name || '',
          email: user?.email || '',
          contact: user?.phone_number || '',
        },
        theme: { color: '#000000' },
      });

      rzp.on('payment.failed', (response: { error?: { description?: string } }) => {
        console.error('Razorpay payment failed:', response);
        toast.error(response.error?.description || 'Payment failed. Please try again.');
        setIsSubmittingBooking(false);
      });

      rzp.open();
      return true;
    };

    if (RazorpayClass) {
      // Payment flow with Razorpay
      try {
        const orderRes = await api.post('/payments/create-order', {
          amount: payableTotal,
          appointment_id: providerId,
        });

        const { order_id, key_id, amount: amountPaise, mock_mode } = orderRes.data;

        if (
          mock_mode ||
          !key_id ||
          !order_id ||
          key_id === 'rzp_test_mock' ||
          order_id.startsWith('mock_')
        ) {
          await finishWithLocalBooking('Appointment booked. Razorpay is unavailable right now.');
          return;
        }

        const opened = openRazorpay({ key_id, amount: amountPaise, currency: 'INR', order_id });
        if (!opened) {
          await finishWithLocalBooking('Appointment booked. Payment checkout is unavailable right now.');
        }
        return;
      } catch (err) {
        console.error('Razorpay order failed:', err);
        await finishWithLocalBooking('Appointment booked. Unable to start Razorpay right now.');
        return;
      } finally {
        setIsSubmittingBooking(false);
      }
    }

    // Fallback: Book without payment (if Razorpay unavailable or no hourly rate)
    try {
      await completeBooking();
    } catch {
      // Error handled in store
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleConfirmStep = () => {
    setCurrentStep(3);
    setTimeout(() => confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  const minDate = format(new Date(), 'yyyy-MM-dd');
  const calendarUrl = selectedProvider
    ? getGoogleCalendarUrl({
        title: `Appointment with ${selectedProvider.user?.full_name || 'Provider'}`,
        description: `Appointment with ${selectedProvider.user?.full_name || 'Provider'} for ${selectedProvider.specialization}`,
        startDate: selectedDate,
        startTime: selectedSlot || '09:00:00',
        endDate: selectedDate,
        endTime:
          slots.find((slot) => slot.start_time === selectedSlot)?.end_time || '09:30:00',
      })
    : '';

  useEffect(() => {
    if (bookingSuccess && calendarUrl && !calendarOpenedRef.current) {
      calendarOpenedRef.current = true;
      window.open(calendarUrl, '_blank', 'noopener,noreferrer');
    }
  }, [bookingSuccess, calendarUrl]);

  if (providerLoading || !selectedProvider) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  // Detailed booking confirmation page
  if (bookingSuccess) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success header */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Booking Confirmed</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Your appointment has been booked successfully</p>
          </motion.div>

          {/* Appointment details card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Appointment Details</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                <Avatar
                  name={selectedProvider?.user?.full_name || 'Provider'}
                  src={getProviderImage(selectedProvider.id)}
                  size="lg"
                />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedProvider?.user?.full_name}</p>
                    <p className="text-sm text-primary-600 dark:text-primary-400">{selectedProvider?.specialization}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />{selectedProvider?.location}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Time</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedSlot ? formatTime(selectedSlot) : ''}</p>
                    </div>
                  </div>
                </div>

                {notes && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{notes}</p>
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Payment Summary</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Appointment charge ({appointmentDurationMinutes} min)
                      </span>
                      <span className="text-gray-900 dark:text-gray-100">{formatCurrency(appointmentCharge)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">GST (18%)</span>
                      <span className="text-gray-900 dark:text-gray-100">{formatCurrency(gst)}</span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Loyalty points applied</span>
                        <span className="text-green-600 dark:text-green-400">- {formatCurrency(appliedDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700 font-semibold">
                      <span className="text-gray-900 dark:text-gray-100">Total</span>
                      <span className="text-gray-900 dark:text-gray-100">{formatCurrency(payableTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-gray-600 dark:text-gray-400">Status: <span className="font-medium text-green-600 dark:text-green-400">Confirmed / Upcoming</span></span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your appointment is confirmed and will appear in Upcoming.</p>
                  </div>
              </div>
            </Card>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-3 justify-center"
          >
            <Link to="/appointments">
              <Button>View My Appointments</Button>
            </Link>
            {calendarUrl && (
              <a href={calendarUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary">Add to Google Calendar</Button>
              </a>
            )}
            <Link to="/providers">
              <Button variant="secondary">Book Another</Button>
            </Link>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <Link
          to={`/providers/${providerId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to provider
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Book Appointment</h1>

        {/* Progress Steps */}
        <ProgressSteps steps={STEPS} currentStep={currentStep} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Date selection */}
            <AnimatePresence mode="wait">
              <motion.div
                key="date-step"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Select Date</h3>
                    </div>
                    <DatePicker
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={minDate}
                    />
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Bug #35 fix: locked placeholder shown until date is selected */}
            {!selectedDate && (
              <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-400 dark:text-gray-500">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Select a date above to see available time slots
              </div>
            )}

            {/* Time slot selection */}
            {selectedDate && (
              <motion.div
                ref={timeSlotRef}
                initial={{ opacity: 0, y: 8 }}                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Select Time</h3>
                    </div>
                    {/* AI Feature #2: Smart slot recommendation badges */}
                    {smartSlots.length > 0 && (
                      <div className="rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-3 py-2">
                        <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 mb-1.5">
                          ✨ AI Recommended for you
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {smartSlots.map((s) => (
                            <button
                              key={s.start_time}
                              type="button"
                              onClick={() => setSelectedSlot(s.start_time)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                selectedSlot === s.start_time
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'bg-white dark:bg-gray-800 text-primary-700 dark:text-primary-400 border-primary-300 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-900/40'
                              }`}
                              title={s.ai_reason}
                            >
                              <Clock className="w-3 h-3" />
                              {s.start_time}
                              {s.ai_reason && <span className="opacity-70">· {s.ai_reason.split(';')[0]}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <TimeSlotPicker
                      slots={slots}
                      selectedSlot={selectedSlot}
                      onSelect={setSelectedSlot}
                      isLoading={slotsLoading}
                    />
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Bug #35 fix: locked placeholder for details step */}
            {selectedDate && !selectedSlot && (
              <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-400 dark:text-gray-500">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Select a time slot above to add appointment details
              </div>
            )}

            {/* Notes */}
            {selectedSlot && currentStep >= 2 && (
              <motion.div
                ref={detailsRef}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Additional Details</h3>
                    </div>
                    <TextArea
                      label="Notes (optional)"
                      placeholder="Any special requests or information for the provider..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    {loyaltyPoints > 0 && (
                      <Input
                        label={`Redeem loyalty points (available: ${loyaltyPoints})`}
                        type="number"
                        min={0}
                        max={Math.floor(maxRedeemable)}
                        placeholder={`Max ${Math.min(loyaltyPoints, Math.floor(maxRedeemable))}`}
                        value={pointsToRedeem === 0 ? '' : pointsToRedeem}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') { setPointsToRedeem(0); return; }
                          setPointsToRedeem(
                            Math.max(0, Math.min(Number(raw), loyaltyPoints, Math.floor(maxRedeemable)))
                          );
                        }}
                        helperText="Each point = ₹1 discount. Applied to your total at checkout."
                      />
                    )}
                    {currentStep === 2 && (
                      <div className="flex justify-end">
                        <Button onClick={handleConfirmStep}>
                          Continue to Confirmation
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Confirmation step */}
            {currentStep === 3 && (
              <motion.div
                ref={confirmRef}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Confirm Booking</h3>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Provider</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedProvider.user?.full_name}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Service</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedProvider.specialization}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Date</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedDate}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Time</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedSlot ? formatTime(selectedSlot) : ''}
                        </span>
                      </div>
                      {notes && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Notes</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-right max-w-[200px] truncate">
                            {notes}
                          </span>
                        </div>
                      )}
                      {selectedProvider.hourly_rate && (
                        <div className="flex justify-between text-sm pt-3 border-t border-gray-200 dark:border-gray-600">
                          <span className="text-gray-500 dark:text-gray-400">Hourly rate</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(hourlyRate)}/hr
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          Appointment charge ({appointmentDurationMinutes} min)
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(appointmentCharge)}
                        </span>
                      </div>
                      {appliedDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Redeem points</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            -{formatCurrency(appliedDiscount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">GST (18%)</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(gst)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Payable total</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(payableTotal)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                        Go Back
                      </Button>
                      <Button
                        variant="gradient"
                        size="lg"
                        onClick={handleBook}
                        isLoading={bookingLoading || isSubmittingBooking}
                        disabled={slotsLoading || !selectedSlotDetails}
                      >
                        Pay & Confirm Booking
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Provider summary (sticky) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <div className="text-center">
                <Avatar
                  name={selectedProvider.user?.full_name || 'Provider'}
                  src={getProviderImage(selectedProvider.id)}
                  size="lg"
                />
                  <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
                    {selectedProvider.user?.full_name}
                  </h3>
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    {selectedProvider.specialization}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{selectedProvider.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                    <span>
                      {selectedProvider.rating.toFixed(1)} ({selectedProvider.total_reviews} reviews)
                    </span>
                  </div>
                  {selectedProvider.hourly_rate && (
                    <div className="text-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(selectedProvider.hourly_rate)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">per hour</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
