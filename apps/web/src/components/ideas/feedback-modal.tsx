'use client';

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaId: string;
  ideaTitle: string;
  action: 'approve' | 'decline';
  onComplete?: () => void;
}

export function FeedbackModal({
  open,
  onOpenChange,
  ideaId,
  ideaTitle,
  action,
  onComplete,
}: FeedbackModalProps) {
  const [note, setNote] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const isApprove = action === 'approve';

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note: note.trim() || undefined,
        }),
      });
      if (res.ok) {
        onComplete?.();
        onOpenChange(false);
        setNote('');
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {isApprove ? 'Approve Idea' : 'Decline Idea'}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? 'Approve this idea for further development.'
              : 'Decline this idea and provide optional feedback.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {/* Idea title */}
          <div className="mb-4 rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">{ideaTitle}</p>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Note{' '}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isApprove
                  ? 'Add any notes about why this idea was approved...'
                  : 'Add feedback about why this idea was declined...'
              }
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? 'Submitting...'
              : isApprove
              ? 'Approve'
              : 'Decline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
