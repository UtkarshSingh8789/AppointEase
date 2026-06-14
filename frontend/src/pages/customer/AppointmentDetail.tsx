import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, FileText, MessageSquare, Send, Brain, ListChecks } from 'lucide-react';
import { useAppointmentStore } from '@/store/appointmentStore';
import { appointmentService } from '@/services/appointmentService';
import { reviewService } from '@/services/reviewService';
import { aiService } from '@/services/aiService';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextArea } from '@/components/ui/TextArea';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { PageTransition } from '@/components/layout/PageTransition';
import { formatDate, formatTime, getGoogleCalendarUrl } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';
import type { AppointmentComment } from '@/types';
import toast from 'react-hot-toast';

export const AppointmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedAppointment, isLoading, fetchAppointment, updateStatus } =
    useAppointmentStore();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  // Comments state
  const [comments, setComments] = useState<AppointmentComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  // AI states
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [followupSuggestions, setFollowupSuggestions] = useState<string[]>([]);
  const [rescheduleSuggestions, setRescheduleSuggestions] = useState<{ date: string; start_time: string; reason: string; confidence: number }[]>([]);

  useEffect(() => {
    if (id) {
      fetchAppointment(id);
      loadComments(id);
      loadReviewState(id);
    }
  }, [id, fetchAppointment]);

  // Load AI features after appointment is fetched
  useEffect(() => {
    if (!id || !selectedAppointment) return;
    if (selectedAppointment.status === 'completed') {
      aiService.getAppointmentSummary(id).then((d) => d?.summary && setAiSummary(d.summary)).catch(() => {});
      aiService.getFollowupSuggestions(id).then((d) => d?.suggestions?.length && setFollowupSuggestions(d.suggestions)).catch(() => {});
    }
    if (selectedAppointment.status === 'cancelled') {
      aiService.getRescheduleSuggestions(id).then((d) => d?.suggestions?.length && setRescheduleSuggestions(d.suggestions)).catch(() => {});
    }
  }, [id, selectedAppointment]);

  const loadComments = async (appointmentId: string) => {
    try {
      const data = await appointmentService.getComments(appointmentId);
      setComments(data);
    } catch {
      // Comments might not be available
    }
  };

  const loadReviewState = async (appointmentId: string) => {
    try {
      const reviews = await reviewService.getMyReviews({ page: 1, size: 50 });
      setHasReviewed(reviews.reviews.some((review) => review.appointment_id === appointmentId));
    } catch {
      // Reviews might not be available yet
    }
  };

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const comment = await appointmentService.addComment(id, { content: newComment.trim() });
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    await updateStatus(id, {
      status: 'cancelled',
      cancellation_reason: cancelReason || undefined,
    });
    setShowCancelModal(false);
    navigate('/appointments');
  };

  const handleReviewSuccess = () => {
    setHasReviewed(true);
  };

  if (isLoading || !selectedAppointment) {
    return <LoadingSpinner size="lg" text="Loading appointment..." />;
  }

  const appointment = selectedAppointment;
  const canCancel = appointment.status === 'pending' || appointment.status === 'confirmed';
  const canReview = appointment.status === 'completed' && !hasReviewed;
  const googleCalendarUrl = getGoogleCalendarUrl({
    title: `Appointment with ${appointment.provider?.user?.full_name || 'Provider'}`,
    description: `Appointment with ${appointment.provider?.user?.full_name || 'Provider'} for ${appointment.provider?.specialization || 'service'}`,
    startDate: appointment.appointment_date,
    startTime: appointment.start_time,
    endDate: appointment.appointment_date,
    endTime: appointment.end_time,
  });

  return (
    <PageTransition>
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        to="/appointments"
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to appointments
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointment Details</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge status={appointment.status} />
            {/* AI Feature #1: No-show risk badge */}
            {appointment.no_show_risk && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                appointment.no_show_risk === 'high'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : appointment.no_show_risk === 'medium'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              }`}>
                {appointment.no_show_risk} no-show risk
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {canReview && (
            <Button variant="outline" onClick={() => setShowReviewForm(true)}>
              Leave a Review
            </Button>
          )}
          {canCancel && (
            <Link to={`/appointments/${appointment.id}/reschedule`}>
              <Button variant="secondary">
                Reschedule
              </Button>
            </Link>
          )}
          <a href={googleCalendarUrl} target="_blank" rel="noreferrer">
            <Button variant="outline">
              Google Calendar
            </Button>
          </a>
          {canCancel && (
            <Button variant="danger" onClick={() => setShowCancelModal(true)}>
              Cancel Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Provider info */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Provider
        </h2>
        <div className="flex items-center gap-4">
          <Avatar
            name={appointment.provider?.user?.full_name || 'Provider'}
            src={getProviderImage(appointment.provider?.id || '')}
            size="lg"
          />
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {appointment.provider?.user?.full_name || 'Provider'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {appointment.provider?.specialization}
            </p>
            {appointment.provider?.location && (
              <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {appointment.provider.location}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Appointment details */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          Appointment Info
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(appointment.appointment_date, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Time</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes */}
      {appointment.notes && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Notes
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{appointment.notes}</p>
        </Card>
      )}

      {/* Cancellation reason */}
      {appointment.cancellation_reason && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <h2 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Cancellation Reason</h2>
          <p className="text-red-600 dark:text-red-300">{appointment.cancellation_reason}</p>
        </Card>
      )}

      {/* Status timeline */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          Timeline
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Created on {formatDate(appointment.created_at, 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          {appointment.updated_at !== appointment.created_at && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Updated on {formatDate(appointment.updated_at, 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Comments section */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Comments
          </h2>
        </div>

        {comments.length > 0 && (
          <div className="space-y-3 mb-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <Avatar
                  name={comment.user?.full_name || 'User'}
                  src={getProviderImage(comment.user?.id || 'user')}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {comment.user?.full_name || 'User'}
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(comment.created_at, 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add comment input */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextArea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            isLoading={isSubmittingComment}
            size="sm"
            aria-label="Send comment"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* AI #10: Appointment Summary */}
      {appointment.status === 'completed' && aiSummary && (
        <Card className="dark:bg-gray-800 dark:border-gray-700 border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <h2 className="text-sm font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wide">AI Session Summary</h2>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 uppercase tracking-wide">AI</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{aiSummary}</p>
        </Card>
      )}

      {/* AI #26: Follow-up Suggestions */}
      {appointment.status === 'completed' && followupSuggestions.length > 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-green-600 dark:text-green-400" />
            <h2 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Next Steps</h2>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 uppercase tracking-wide">AI</span>
          </div>
          <ul className="space-y-2">
            {followupSuggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-green-500 mt-0.5 font-bold">→</span>{s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* AI #9: Reschedule Suggestions (shown when cancelled) */}
      {appointment.status === 'cancelled' && rescheduleSuggestions.length > 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">AI Reschedule Suggestions</h2>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 uppercase tracking-wide">AI</span>
          </div>
          <div className="space-y-2">
            {rescheduleSuggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.date} at {s.start_time}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.reason}</p>
                </div>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{Math.round(s.confidence * 100)}%</span>
              </div>
            ))}
          </div>
          <Link to={`/appointments/${appointment.id}/reschedule`} className="mt-3 block">
            <button className="w-full text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 py-1 transition-colors">Reschedule now →</button>
          </Link>
        </Card>
      )}

      {/* Cancel modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Appointment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
              Keep Appointment
            </Button>
            <Button variant="danger" onClick={handleCancel}>
              Cancel Appointment
            </Button>
          </>
        }
      >
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Are you sure you want to cancel this appointment? This action cannot be undone.
        </p>
        <TextArea
          label="Reason for cancellation (optional)"
          placeholder="Let the provider know why you're cancelling..."
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </Modal>

      {/* Review form modal */}
      {id && (
        <ReviewForm
          isOpen={showReviewForm}
          onClose={() => setShowReviewForm(false)}
          appointmentId={id}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
    </PageTransition>
  );
};
