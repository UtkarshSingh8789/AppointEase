import React, { useEffect, useState } from 'react';
import {
  Check,
  X,
  MapPin,
  Phone,
  Mail,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Send,
  Sparkles,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';
import { adminService, type ProviderDocumentAIResponse } from '@/services/adminService';
import api from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTransition } from '@/components/layout/PageTransition';
import { Badge } from '@/components/ui/Badge';
import type { ProviderApproval } from '@/types';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const DOCUMENT_AI_PROMPTS = [
  'Summarize this provider application and uploaded documents.',
  'Does the document evidence match the claimed specialization?',
  'What experience, dates, license numbers, or issuing institutions are visible?',
  'Find mismatches between the profile and uploaded documents.',
  'What documents or evidence are missing?',
  'What should I manually verify before approving?',
];

export const ProviderApprovals: React.FC = () => {
  const [providers, setProviders] = useState<ProviderApproval[]>([]);
  const [actionStatus, setActionStatus] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const [docQuestionById, setDocQuestionById] = useState<Record<string, string>>({});
  const [docAnswerById, setDocAnswerById] = useState<Record<string, ProviderDocumentAIResponse>>({});
  const [docAiLoadingId, setDocAiLoadingId] = useState<string | null>(null);
  const [docIndexingId, setDocIndexingId] = useState<string | null>(null);
  // AI Feature #8: auto-verify state
  const [autoVerifyById, setAutoVerifyById] = useState<Record<string, { checks: Array<{ id: string; question: string; answer: string; result: string }>; overall: { verdict: string; label: string }; risk_flags: string[] }>>({});
  const [autoVerifyLoadingId, setAutoVerifyLoadingId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const canUseDocumentAI = Boolean(user?.is_super_admin);

  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getPendingProviders();
      setProviders(data.providers);
      // Seed actionStatus from server-side review_status so approved/rejected persist after reload
      const serverStatuses: Record<string, 'approved' | 'rejected'> = {};
      for (const item of (data.providers as ProviderApproval[])) {
        const rs = (item as unknown as { review_status?: string }).review_status;
        if (rs === 'approved') serverStatuses[item.provider.id] = 'approved';
        if (rs === 'rejected') serverStatuses[item.provider.id] = 'rejected';
      }
      setActionStatus(serverStatuses);
    } catch {
      // Error handled by interceptor
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleAction = async (providerId: string, action: 'approve' | 'reject') => {
    setProcessingId(providerId);
    try {
      await adminService.updateProviderApproval(providerId, {
        action,
        reason: reasonById[providerId]?.trim() || undefined,
      });
      toast.success(action === 'approve' ? 'Provider approved' : 'Provider rejected');
      setActionStatus((prev) => ({ ...prev, [providerId]: action === 'approve' ? 'approved' : 'rejected' }));
    } catch {
      toast.error('Could not update provider approval');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReindexDocuments = async (providerId: string) => {
    setDocIndexingId(providerId);
    try {
      const result = await adminService.reindexProviderDocuments(providerId);
      toast.success(`Indexed ${result.indexed_chunks} document chunks`);
    } catch {
      toast.error('Could not index provider documents');
    } finally {
      setDocIndexingId(null);
    }
  };

  const handleAskDocuments = async (providerId: string, question?: string) => {
    const finalQuestion = (question || docQuestionById[providerId] || '').trim();
    if (!finalQuestion) {
      toast.error('Ask a question about the uploaded documents');
      return;
    }
    setDocAiLoadingId(providerId);
    setDocQuestionById((prev) => ({ ...prev, [providerId]: finalQuestion }));
    try {
      const answer = await adminService.askProviderDocuments(providerId, finalQuestion);
      setDocAnswerById((prev) => ({ ...prev, [providerId]: answer }));
    } catch {
      toast.error('Document AI could not answer this question');
    } finally {
      setDocAiLoadingId(null);
    }
  };

  // AI Feature #8: Auto-verify documents
  const handleAutoVerify = async (providerId: string) => {
    setAutoVerifyLoadingId(providerId);
    try {
      const res = await api.post(`/admin/providers/${providerId}/document-ai/auto-verify`);
      setAutoVerifyById((prev) => ({ ...prev, [providerId]: res.data }));
      toast.success('Auto-verification complete');
    } catch {
      toast.error('Auto-verification failed');
    } finally {
      setAutoVerifyLoadingId(null);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Provider Approvals</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Review provider onboarding submissions and approve or reject access to the provider panel.
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner size="lg" />
        ) : providers.length === 0 ? (
          <EmptyState
            icon={<BadgeCheck className="w-8 h-8 text-gray-400" />}
            title="No provider applications"
            description="No provider onboarding applications in the last 30 days."
          />
        ) : (
          <div className="grid gap-6">
            {providers.map((item) => {
              const provider = item.provider;
              const application = (item.application || {}) as Record<string, unknown>;
              const isExpanded = expandedById[provider.id];
              const status = actionStatus[provider.id];

              return (
                <Card
                  key={provider.id}
                  className={`dark:bg-gray-800 dark:border-gray-700 overflow-hidden transition-all ${
                    status === 'approved' ? 'border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-900/10' :
                    status === 'rejected' ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10' : ''
                  }`}
                  padding={false}
                >
                  {/* ── Card header ───────────────────────────── */}
                  <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar placeholder */}
                      {item.avatar ? (
                        <img
                          src={item.avatar.path}
                          alt={provider.user?.full_name || 'Provider'}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {provider.user?.full_name || 'Provider'}
                          </h2>
                          {status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                              <Check className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                              <X className="w-3 h-3" /> Rejected
                            </span>
                          )}
                          {!status && <Badge status="pending" />}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{provider.user?.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={isExpanded ? 'Minimize application details' : 'Expand application details'}
                      onClick={() => setExpandedById((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors shrink-0"
                    >
                      {isExpanded ? (
                        <><ChevronUp className="w-3.5 h-3.5" />Minimize</>
                      ) : (
                        <><ChevronDown className="w-3.5 h-3.5" />View Details</>
                      )}
                    </button>
                  </div>

                  {/* ── Expanded body ─────────────────────────── */}
                  {isExpanded && (
                    <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">

                      {/* Left column — all provider details */}
                      <div className="lg:col-span-2 space-y-5">

                        {/* Application summary */}
                        {item.summary && (
                          <section>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                              Application Summary
                            </p>
                            <div className="rounded-lg border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 px-4 py-3">
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                                {item.summary}
                              </p>
                            </div>
                          </section>
                        )}

                        {/* Core details */}
                        <section>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                            Provider Details
                          </p>
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700">
                              {[
                                { label: 'Category', value: provider.category?.name || 'N/A' },
                                { label: 'Specialization', value: (application['specialization'] as string) || provider.specialization || 'N/A' },
                                { label: 'Experience', value: `${(application['experience_years'] as number | undefined) ?? provider.experience_years} years` },
                                { label: 'Hourly Rate', value: `₹${(application['hourly_rate'] as number | undefined) ?? provider.hourly_rate ?? 0}/hr` },
                              ].map(({ label, value }) => (
                                <div key={label} className="px-4 py-3">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                                  <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>

                        {/* Contact & location */}
                        <section>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                            Contact & Location
                          </p>
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                              <MapPin className="w-4 h-4 shrink-0" />
                              <span>{[provider.area, provider.location, provider.pincode].filter(Boolean).join(', ') || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                              <Phone className="w-4 h-4 shrink-0" />
                              <span>{provider.user?.phone_number || 'No phone provided'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 sm:col-span-2">
                              <Mail className="w-4 h-4 shrink-0" />
                              <span>{provider.user?.email}</span>
                            </div>
                          </div>
                        </section>

                        {/* Profile description */}
                        {((application['profile_description'] as string) || provider.profile_description) && (
                          <section>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                              Profile Description
                            </p>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {(application['profile_description'] as string) || provider.profile_description}
                              </p>
                            </div>
                          </section>
                        )}

                        {/* Submitted documents */}
                        {item.documents.length > 0 && (
                          <section>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                              Submitted Documents ({item.documents.length})
                            </p>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
                              {item.documents.map((doc) => (
                                <div key={doc.path} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-4 h-4 shrink-0 text-gray-400" />
                                    <a
                                      href={doc.path}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline truncate"
                                    >
                                      {doc.name}
                                    </a>
                                  </div>
                                  <a
                                    href={doc.path}
                                    download
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:underline shrink-0"
                                  >
                                    Download
                                  </a>
                                </div>
                              ))}
                            </div>
                          </section>
                        )}

                        {/* Document AI — RAG assistant (super admin only) */}
                        {canUseDocumentAI && (
                          <section>
                            {/* AI Feature #8: Auto-verify button */}
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                AI Document Analysis
                              </p>
                              <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                                isLoading={autoVerifyLoadingId === provider.id}
                                onClick={() => handleAutoVerify(provider.id)}
                              >
                                Auto-Verify Docs
                              </Button>
                            </div>
                            {/* Auto-verify results */}
                            {autoVerifyById[provider.id] && (
                              <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className={`px-4 py-2.5 flex items-center justify-between ${
                                  autoVerifyById[provider.id].overall.verdict === 'approved_recommendation'
                                    ? 'bg-green-50 dark:bg-green-900/20'
                                    : autoVerifyById[provider.id].overall.verdict === 'reject_recommendation'
                                    ? 'bg-red-50 dark:bg-red-900/20'
                                    : 'bg-amber-50 dark:bg-amber-900/20'
                                }`}>
                                  <span className={`text-sm font-semibold ${
                                    autoVerifyById[provider.id].overall.verdict === 'approved_recommendation'
                                      ? 'text-green-700 dark:text-green-400'
                                      : autoVerifyById[provider.id].overall.verdict === 'reject_recommendation'
                                      ? 'text-red-700 dark:text-red-400'
                                      : 'text-amber-700 dark:text-amber-400'
                                  }`}>
                                    {autoVerifyById[provider.id].overall.label}
                                  </span>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                                  {autoVerifyById[provider.id].checks.map((check) => (
                                    <div key={check.id} className="flex items-start gap-3 px-4 py-2.5">
                                      <span className={`mt-0.5 text-sm ${
                                        check.result === 'pass' ? 'text-green-500' :
                                        check.result === 'fail' ? 'text-red-500' : 'text-amber-500'
                                      }`}>
                                        {check.result === 'pass' ? '✓' : check.result === 'fail' ? '✗' : '?'}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{check.question}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{check.answer}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {autoVerifyById[provider.id].risk_flags.length > 0 && (
                                  <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-200 dark:border-amber-800">
                                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">⚠️ Risk flags</p>
                                    <ul className="list-disc pl-4 text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                                      {autoVerifyById[provider.id].risk_flags.map((flag) => (
                                        <li key={flag}>{flag}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="rounded-xl border-2 border-indigo-200 dark:border-indigo-800 overflow-hidden">
                              {/* RAG header */}
                              <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 dark:bg-indigo-700">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-white" />
                                  <span className="text-sm font-bold text-white">Document AI — RAG Assistant</span>
                                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                                    Super Admin
                                  </span>
                                </div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                                  isLoading={docIndexingId === provider.id}
                                  onClick={() => handleReindexDocuments(provider.id)}
                                >
                                  Re-index docs
                                </Button>
                              </div>

                              <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Ask anything about this provider's uploaded documents. Answers are grounded in indexed chunks only — no hallucination.
                                </p>

                                {/* Quick prompts */}
                                <div className="flex flex-wrap gap-2">
                                  {DOCUMENT_AI_PROMPTS.map((prompt) => (
                                    <button
                                      key={prompt}
                                      type="button"
                                      disabled={docAiLoadingId === provider.id}
                                      onClick={() => handleAskDocuments(provider.id, prompt)}
                                      className="rounded-full border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/60 disabled:opacity-50 transition-colors"
                                    >
                                      {prompt}
                                    </button>
                                  ))}
                                </div>

                                {/* Question input */}
                                <div className="space-y-2">
                                  <label
                                    htmlFor={`doc-question-${provider.id}`}
                                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide"
                                  >
                                    Your question
                                  </label>
                                  <textarea
                                    id={`doc-question-${provider.id}`}
                                    rows={3}
                                    value={docQuestionById[provider.id] || ''}
                                    onChange={(e) =>
                                      setDocQuestionById((prev) => ({ ...prev, [provider.id]: e.target.value }))
                                    }
                                    placeholder="e.g. Does the certificate match the claimed specialization?"
                                    className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-colors"
                                  />
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                      {(docQuestionById[provider.id] || '').length > 0
                                        ? `${(docQuestionById[provider.id] || '').length} chars`
                                        : 'Type a question or click a prompt above'}
                                    </span>
                                    <Button
                                      size="sm"
                                      leftIcon={<Send className="w-3.5 h-3.5" />}
                                      isLoading={docAiLoadingId === provider.id}
                                      disabled={!(docQuestionById[provider.id] || '').trim()}
                                      onClick={() => handleAskDocuments(provider.id)}
                                    >
                                      Ask AI
                                    </Button>
                                  </div>
                                </div>

                                {/* Loading indicator */}
                                {docAiLoadingId === provider.id && (
                                  <div className="flex items-center gap-3 rounded-lg border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 px-4 py-3">
                                    <div className="flex gap-1">
                                      {[0, 150, 300].map((delay) => (
                                        <span
                                          key={delay}
                                          className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                                          style={{ animationDelay: `${delay}ms` }}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-sm text-indigo-700 dark:text-indigo-300">
                                      Searching document chunks and generating answer...
                                    </span>
                                  </div>
                                )}

                                {/* AI answer */}
                                {docAnswerById[provider.id] && (
                                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                      <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Answer</span>
                                      </div>
                                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                        docAnswerById[provider.id].confidence === 'high'
                                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                                          : docAnswerById[provider.id].confidence === 'medium'
                                          ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                                          : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                                      }`}>
                                        {docAnswerById[provider.id].confidence} confidence
                                      </span>
                                    </div>
                                    <div className="px-4 py-3 bg-white dark:bg-gray-900">
                                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                                        {docAnswerById[provider.id].answer}
                                      </p>
                                    </div>
                                    {docAnswerById[provider.id].risk_flags.length > 0 && (
                                      <div className="mx-4 mb-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
                                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">⚠️ Risk flags</p>
                                        <ul className="list-disc pl-4 text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                                          {docAnswerById[provider.id].risk_flags.map((flag) => (
                                            <li key={flag}>{flag}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {docAnswerById[provider.id].citations.length > 0 && (
                                      <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-white dark:bg-gray-900 space-y-2">
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                          Source citations
                                        </p>
                                        {docAnswerById[provider.id].citations.map((citation) => (
                                          <div
                                            key={`${citation.document}-${citation.chunk_index}`}
                                            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
                                          >
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                              <a
                                                href={citation.path}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                                              >
                                                📄 {citation.document} · chunk {citation.chunk_index}
                                              </a>
                                              <span className="shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                                {Math.round(citation.similarity * 100)}% match
                                              </span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                                              {citation.excerpt}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </section>
                        )}
                      </div>

                      {/* Right column — approve / reject panel */}
                      <div className="space-y-4">
                        <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden sticky top-4">
                          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Review Decision</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Optionally add a reason before approving or rejecting.
                            </p>
                          </div>
                          <div className="p-4 space-y-3">
                            <TextArea
                              id={`rejection-reason-${provider.id}`}
                              label="Note / Rejection reason (optional)"
                              placeholder="Reason to share with the provider..."
                              value={reasonById[provider.id] || ''}
                              onChange={(e) =>
                                setReasonById((prev) => ({ ...prev, [provider.id]: e.target.value }))
                              }
                              rows={3}
                            />
                            <Button
                              fullWidth
                              leftIcon={<Check className="w-4 h-4" />}
                              isLoading={processingId === provider.id}
                              disabled={!!status}
                              onClick={() => handleAction(provider.id, 'approve')}
                            >
                              {status === 'approved' ? 'Approved ✓' : 'Approve Provider'}
                            </Button>
                            <Button
                              fullWidth
                              variant="danger"
                              leftIcon={<X className="w-4 h-4" />}
                              isLoading={processingId === provider.id}
                              disabled={!!status}
                              onClick={() => handleAction(provider.id, 'reject')}
                            >
                              {status === 'rejected' ? 'Rejected ✗' : 'Reject Provider'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Collapsed quick-action strip */}
                  {!isExpanded && (
                    <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {provider.category?.name || 'Uncategorised'}
                        </span>
                        {' · '}
                        {provider.specialization}
                        {' · '}
                        {provider.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                          isLoading={processingId === provider.id}
                          disabled={!!status}
                          onClick={() => handleAction(provider.id, 'approve')}
                        >
                          {status === 'approved' ? 'Approved' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<X className="w-3.5 h-3.5" />}
                          isLoading={processingId === provider.id}
                          disabled={!!status}
                          onClick={() => handleAction(provider.id, 'reject')}
                        >
                          {status === 'rejected' ? 'Rejected' : 'Reject'}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
};
