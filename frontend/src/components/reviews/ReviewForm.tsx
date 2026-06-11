import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { StarRating } from '@/components/ui/StarRating';
import { reviewService } from '@/services/reviewService';
import toast from 'react-hot-toast';

interface ReviewFormProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  onSuccess?: () => void;
}

/** Modal form for submitting a review with star rating and comment */
export const ReviewForm: React.FC<ReviewFormProps> = ({
  isOpen,
  onClose,
  appointmentId,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await reviewService.createReview({
        appointment_id: appointmentId,
        rating,
        comment: comment.trim() || undefined,
      });
      toast.success('Review submitted successfully!');
      onSuccess?.();
      onClose();
      setRating(0);
      setComment('');
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Leave a Review"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Submit Review
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rating
          </label>
          <StarRating value={rating} onChange={setRating} size="lg" />
          {error && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        <TextArea
          label="Comment (optional)"
          placeholder="Share your experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
        />
      </div>
    </Modal>
  );
};
