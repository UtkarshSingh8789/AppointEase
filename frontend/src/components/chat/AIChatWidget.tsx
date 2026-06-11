import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle,
  Move,
  Maximize2,
  Minimize2,
  History,
  Plus,
  Mic,
  MicOff,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import api from '@/services/api';
import { loyaltyService } from '@/services/loyaltyService';
import type { UserRole } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
}

interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: ChatAction[];
}

interface ChatAction {
  label: string;
  value: string;
  type: 'provider' | 'date' | 'slot' | 'confirm' | 'cancel' | 'suggestion' | 'link';
  data?: Record<string, unknown>;
}

// Booking flow states
type BookingStep =
  | 'idle'
  | 'ask_service'
  | 'show_providers'
  | 'ask_date'
  | 'show_slots'
  | 'confirm'
  | 'booked';

interface BookingState {
  step: BookingStep;
  service?: string;
  location?: string;
  providerId?: string;
  providerName?: string;
  date?: string;
  slot?: string;
  endTime?: string;
}

interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredChatMessage[];
  booking: BookingState;
  suggestions: string[];
}

interface McpStatus {
  connected: boolean;
  bridge: string;
  tool_count: number;
  tools: string[];
  health?: {
    status?: string;
    database?: string;
    user_count?: number;
  };
}

const ROLE_SUGGESTIONS: Record<UserRole, string[]> = {
  customer: [
    'Book an appointment',
    'Show my upcoming appointments',
    'What are my loyalty points?',
    'How do I reschedule?',
    'Find a doctor near me',
  ],
  provider: [
    'Show my dashboard',
    'Pending requests',
    'My upcoming schedule',
    'My revenue summary',
    'My ratings & reviews',
    'Total appointments breakdown',
  ],
  admin: [
    'Platform overview',
    'Pending provider approvals',
    'Platform revenue',
    'Top providers',
    'How many users?',
    'Category breakdown',
  ],
};

export const AIChatWidget: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [booking, setBooking] = useState<BookingState>({ step: 'idle' });
  const [isMaximized, setIsMaximized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState('');
  const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null);
  const [mcpStatusLoaded, setMcpStatusLoaded] = useState(false);
  const [position, setPosition] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(window.innerWidth - 440, 16) : 16,
    y: typeof window !== 'undefined' ? Math.max(window.innerHeight - 620, 16) : 16,
  }));
  const [size, setSize] = useState(() => ({
    width: Math.min(440, typeof window !== 'undefined' ? window.innerWidth - 32 : 440),
    height: 560,
  }));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const resizeStateRef = useRef<{ width: number; height: number; startX: number; startY: number } | null>(null);
  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  const isMaximizedRef = useRef(isMaximized);
  const storageKey = user?.id ? `appointease-chat-threads-${user.id}` : '';

  // AI Feature #10: Voice-to-Booking — Web Speech API
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!speechSupported) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      const transcript = Object.values(event.results)
        .map((r) => (r as { [key: number]: { transcript: string } })[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [speechSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any).stop();
    }
    setIsListening(false);
  }, []);

  if (!isAuthenticated) return null;

  const userRole = user?.role || 'customer';
  const initialSuggestions = ROLE_SUGGESTIONS[userRole] || ROLE_SUGGESTIONS.customer;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    isMaximizedRef.current = isMaximized;
  }, [isMaximized]);

  const serializeMessages = (items: ChatMessage[]): StoredChatMessage[] =>
    items.map((item) => ({
      ...item,
      timestamp: item.timestamp.toISOString(),
    }));

  const hydrateMessages = (items: StoredChatMessage[]): ChatMessage[] =>
    items.map((item) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));

  const deriveThreadTitle = (items: ChatMessage[], currentBooking: BookingState): string => {
    if (currentBooking.service) {
      return `${currentBooking.service} booking`;
    }
    const firstUserMessage = items.find((message) => message.role === 'user');
    if (firstUserMessage?.content) {
      return firstUserMessage.content.slice(0, 28);
    }
    return 'New chat';
  };

  const persistThread = (threadId: string, nextMessages: ChatMessage[], nextBooking: BookingState, nextSuggestions: string[]) => {
    if (!storageKey || !threadId) return;
    const snapshot: ChatThread = {
      id: threadId,
      title: deriveThreadTitle(nextMessages, nextBooking),
      createdAt: threads.find((thread) => thread.id === threadId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: serializeMessages(nextMessages),
      booking: nextBooking,
      suggestions: nextSuggestions,
    };

    setThreads((prev) => {
      const existingIndex = prev.findIndex((thread) => thread.id === threadId);
      const next = existingIndex >= 0
        ? prev.map((thread) => (thread.id === threadId ? snapshot : thread))
        : [snapshot, ...prev];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const resetCurrentChat = () => {
    setMessages([]);
    setBooking({ step: 'idle' });
    setSuggestions(initialSuggestions.slice(0, 3));
    setInput('');
    setIsTyping(false);
    setShowHistory(false);
  };

  const startNewChat = () => {
    const id = crypto.randomUUID();
    const thread: ChatThread = {
      id,
      title: 'New chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      booking: { step: 'idle' },
      suggestions: initialSuggestions.slice(0, 3),
    };
    setThreads((prev) => [thread, ...prev.filter((item) => item.id !== id)]);
    setActiveThreadId(id);
    resetCurrentChat();
  };

  const loadThread = (thread: ChatThread) => {
    setActiveThreadId(thread.id);
    setMessages(hydrateMessages(thread.messages));
    setBooking(thread.booking || { step: 'idle' });
    setSuggestions(thread.suggestions || initialSuggestions.slice(0, 3));
    setInput('');
    setIsTyping(false);
    setShowHistory(false);
  };

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatThread[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThreads(parsed);
          setActiveThreadId(parsed[0].id);
          setMessages(hydrateMessages(parsed[0].messages || []));
          setBooking(parsed[0].booking || { step: 'idle' });
          setSuggestions(parsed[0].suggestions || initialSuggestions.slice(0, 3));
          return;
        }
      }
    } catch {
      // Ignore malformed local cache and fall back to a fresh chat.
    }

    const freshThread: ChatThread = {
      id: crypto.randomUUID(),
      title: 'New chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      booking: { step: 'idle' },
      suggestions: initialSuggestions.slice(0, 3),
    };
    setThreads([freshThread]);
    setActiveThreadId(freshThread.id);
    setMessages([]);
    setBooking({ step: 'idle' });
    setSuggestions(initialSuggestions.slice(0, 3));
  }, [storageKey, initialSuggestions]);

  useEffect(() => {
    if (!activeThreadId || !storageKey) return;
    persistThread(activeThreadId, messages, booking, suggestions);
    // Persisting only the active chat keeps older conversations available and unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, booking, suggestions, activeThreadId, storageKey]);

  useEffect(() => {
    if (!isAuthenticated || !isOpen || mcpStatusLoaded) return;

    let cancelled = false;
    api.get('/mcp-tools/status')
      .then((response) => {
        if (!cancelled) setMcpStatus(response.data);
      })
      .catch(() => {
        if (!cancelled) {
          setMcpStatus({
            connected: false,
            bridge: 'FastAPI -> MCP tools -> PostgreSQL',
            tool_count: 0,
            tools: [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setMcpStatusLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isOpen, mcpStatusLoaded]);

  useEffect(() => {
    if (!isOpen || isMaximized) return;
    const maxX = Math.max(window.innerWidth - size.width - 16, 16);
    const maxY = Math.max(window.innerHeight - size.height - 16, 16);
    setPosition((prev) => ({
      x: Math.min(prev.x, maxX),
      y: Math.min(prev.y, maxY),
    }));
  }, [isOpen, isMaximized, size.width, size.height]);

  const addMessage = (role: 'user' | 'assistant', content: string, actions?: ChatAction[]) => {
    const msg: ChatMessage = {
      id: `${role}-${Date.now()}`,
      role,
      content,
      timestamp: new Date(),
      actions,
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (isMaximizedRef.current) return;
    dragStateRef.current = {
      x: positionRef.current.x,
      y: positionRef.current.y,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onDragMove = (event: PointerEvent) => {
    if (!dragStateRef.current || isMaximizedRef.current) return;
    const dx = event.clientX - dragStateRef.current.startX;
    const dy = event.clientY - dragStateRef.current.startY;
    const currentSize = sizeRef.current;
    const nextX = Math.max(16, Math.min(window.innerWidth - currentSize.width - 16, dragStateRef.current.x + dx));
    const nextY = Math.max(16, Math.min(window.innerHeight - currentSize.height - 16, dragStateRef.current.y + dy));
    setPosition({ x: nextX, y: nextY });
  };

  const stopDrag = () => {
    dragStateRef.current = null;
  };

  const startResize = (event: React.PointerEvent<HTMLElement>) => {
    if (isMaximizedRef.current) return;
    resizeStateRef.current = {
      width: sizeRef.current.width,
      height: sizeRef.current.height,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onResizeMove = (event: PointerEvent) => {
    if (!resizeStateRef.current || isMaximizedRef.current) return;
    const dx = event.clientX - resizeStateRef.current.startX;
    const dy = event.clientY - resizeStateRef.current.startY;
    const nextWidth = Math.max(340, Math.min(window.innerWidth - 32, resizeStateRef.current.width + dx));
    const nextHeight = Math.max(420, Math.min(window.innerHeight - 32, resizeStateRef.current.height + dy));
    setSize({ width: nextWidth, height: nextHeight });
  };

  const stopResize = () => {
    resizeStateRef.current = null;
  };

  useEffect(() => {
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', stopResize);
    return () => {
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointermove', onResizeMove);
      window.removeEventListener('pointerup', stopResize);
    };
  }, []);

  // ─── Provider & Admin MCP flows ───────────────────────────────────────────

  type ProviderDashboard = {
    provider: { name: string; specialization: string; location: string; hourly_rate: number; is_verified: boolean; experience_years: number };
    appointments: { by_status: Record<string, number>; total: number };
    revenue: { invoice_count: number; total_earned: number; avg_per_invoice: number };
    ratings: { review_count: number; average: number; min: number; max: number };
    recent_reviews: { customer: string; rating: number; comment: string; date: string }[];
    upcoming_schedule: { id: string; customer: string; date: string; start_time: string; end_time: string; status: string; amount: number; notes: string }[];
    pending_requests: { id: string; customer: string; customer_email: string; date: string; start_time: string; end_time: string; amount: number; notes: string }[];
  };

  type AdminDashboard = {
    users: { total: number; customers: number; providers: number; verified_providers: number; pending_approvals: number };
    appointments: { total: number; by_status: Record<string, number> };
    revenue: { total: number; invoice_count: number; avg_per_invoice: number };
    reviews: { total: number; average_rating: number };
    top_providers_by_revenue: { name: string; specialization: string; location: string; rating: number; revenue: number }[];
    top_rated_providers: { name: string; specialization: string; category: string; location: string; rating: number; total_reviews: number }[];
    category_breakdown: { category: string; appointments: number; providers: number }[];
    pending_provider_approvals: { id: string; name: string; email: string; specialization: string; category: string; location: string; applied_at: string }[];
    recent_appointments: { customer_name: string; provider_name: string; appointment_date: string; start_time: string; status: string }[];
  };

  // Regex fallback — instant, no network needed
  const detectIntentFallback = (text: string, role: 'provider' | 'admin'): string | null => {
    if (role === 'provider') {
      const patterns: [string, RegExp][] = [
        ['pending',      /(pending|request|awaiting|waiting|naya req|nayi req|accept|reject)/i],
        ['revenue',      /(revenue|earning|income|paise|paisa|kamai|kitna mila|paise aaye|kitna kamaya|rupee|rupay|payment|invoice|how much.*earn|how much.*made)/i],
        ['ratings',      /(rating|review|feedback|star|score|reputation|meri rating|log kya bol|kitne star|average rat)/i],
        ['upcoming',     /(upcoming|schedul|aaj|kal|today|tomorrow|next appoint|mera schedule|mere appoint|aane wale|view schedule)/i],
        ['appointments', /(appoint|booking|completed|cancelled|confirmed|how many|kitne|breakdown|total appoint|saare appoint)/i],
        ['dashboard',    /(dashboard|overview|summary|stats|statistics|sab kuch|meri performance|batao)/i],
      ];
      for (const [intent, rx] of patterns) if (rx.test(text)) return intent;
    } else {
      const patterns: [string, RegExp][] = [
        ['topProviders', /(top provider|best provider|highest rated|most revenue|leaderboard|sabse acha|sabse zyada|number one provider)/i],
        ['revenue',      /(revenue|earning|income|paise|paisa|kamai|kitna kamaya|financial|total revenue|platform.*earn|rupee|rupay|invoic|view report|report)/i],
        ['approvals',    /(approval|approve|pending provider|unapproved|waiting provider|verify|verification|naye provider)/i],
        ['categories',   /(categor|service type|which service|popular service|konsi service|kaunsi)/i],
        ['users',        /(how many user|kitne user|kitne log|total user|new user|registered|users\b|usrs|user count|customer count)/i],
        ['appointments', /(appoint|booking|how many booking|recent appoint|kitne appoint|total booking|saari booking)/i],
        ['ratings',      /(rating|review|feedback|star|platform rating|average rating|kitne star|log kya bol)/i],
        ['providers',    /(how many provider|total provider|verified provider|kitne provider|provider count|provider stat)/i],
        ['overview',     /(overview|overvie|overvew|overv|summary|dashboard|platform overview|platform status|sab kuch|overall|haal batao|sab batao)/i],
      ];
      for (const [intent, rx] of patterns) if (rx.test(text)) return intent;
    }
    return null;
  };

  const classifyIntent = async (text: string, role: 'provider' | 'admin'): Promise<string | null> => {
    // Fire LLM + regex in parallel; LLM wins if it responds in time
    const fallback = detectIntentFallback(text, role);
    try {
      const res = await api.post('/ai-chat/intent', { message: text, role });
      const { intent } = res.data as { intent: string | null };
      return intent ?? fallback;
    } catch {
      return fallback;
    }
  };

  const fetchProviderDashboard = async (): Promise<ProviderDashboard | null> => {
    try {
      const res = await api.get('/mcp-tools/provider-dashboard');
      return res.data as ProviderDashboard;
    } catch {
      return null;
    }
  };

  const fetchAdminDashboard = async (): Promise<AdminDashboard | null> => {
    try {
      const res = await api.get('/mcp-tools/admin-dashboard');
      return res.data as AdminDashboard;
    } catch {
      return null;
    }
  };

  const handleProviderQuery = async (text: string): Promise<boolean> => {
    const intent = await classifyIntent(text, 'provider');
    if (!intent) return false;

    setIsTyping(true);
    const data = await fetchProviderDashboard();
    await new Promise((r) => setTimeout(r, 300));
    setIsTyping(false);

    if (!data) {
      addMessage('assistant', 'Could not load your dashboard right now. Please try again.');
      return true;
    }

    const { provider, appointments, revenue, ratings, recent_reviews, upcoming_schedule, pending_requests } = data;
    const bs = appointments.by_status;

    if (intent === 'pending') {
      if (pending_requests.length === 0) {
        addMessage('assistant', '✅ No pending appointment requests right now. Your schedule is clear!', [
          { label: 'View upcoming schedule', value: 'upcoming schedule', type: 'suggestion' },
          { label: 'My stats overview', value: 'dashboard', type: 'suggestion' },
        ]);
      } else {
        const lines = pending_requests.map((r) =>
          `📋 ${r.customer} on ${r.date} at ${formatTime(r.start_time)}–${formatTime(r.end_time)} • ₹${r.amount}`
        ).join('\n');
        addMessage('assistant',
          `You have ${pending_requests.length} pending request${pending_requests.length > 1 ? 's' : ''}:\n\n${lines}\n\nGo to Appointment Requests to accept or reject.`,
          [
            { label: 'Manage requests', value: '/provider/requests', type: 'link' },
            { label: 'My full schedule', value: 'upcoming schedule', type: 'suggestion' },
          ]
        );
      }
      return true;
    }

    if (intent === 'upcoming') {
      if (upcoming_schedule.length === 0) {
        addMessage('assistant', '📅 No upcoming confirmed appointments. Check your availability settings.', [
          { label: 'Manage availability', value: '/provider/availability', type: 'link' },
          { label: 'Pending requests', value: 'pending requests', type: 'suggestion' },
        ]);
      } else {
        const lines = upcoming_schedule.map((a) =>
          `${a.status === 'pending' ? '⏳' : '✅'} ${a.customer} — ${a.date} ${formatTime(a.start_time)}–${formatTime(a.end_time)} [${a.status}]`
        ).join('\n');
        addMessage('assistant',
          `📅 Your upcoming schedule (${upcoming_schedule.length} appointments):\n\n${lines}`,
          [
            { label: 'View full schedule', value: '/provider/schedule', type: 'link' },
            { label: 'Pending requests', value: 'pending requests', type: 'suggestion' },
          ]
        );
      }
      return true;
    }

    if (intent === 'revenue') {
      addMessage('assistant',
        `💰 Revenue Summary for ${provider.name}:\n\n` +
        `• Total earned: ₹${revenue.total_earned.toLocaleString('en-IN')}\n` +
        `• Invoices generated: ${revenue.invoice_count}\n` +
        `• Average per invoice: ₹${revenue.avg_per_invoice.toLocaleString('en-IN')}\n` +
        `• Completed appointments: ${bs.completed || 0}`,
        [
          { label: 'My full dashboard', value: 'dashboard', type: 'suggestion' },
          { label: 'My ratings', value: 'my ratings', type: 'suggestion' },
        ]
      );
      return true;
    }

    if (intent === 'ratings') {
      const recentLines = recent_reviews.slice(0, 3).map((r) =>
        `${'⭐'.repeat(r.rating)} ${r.customer}: "${r.comment || 'No comment'}" (${r.date})`
      ).join('\n');
      addMessage('assistant',
        `⭐ Ratings & Reviews for ${provider.name}:\n\n` +
        `• Average rating: ${ratings.average}/5 from ${ratings.review_count} reviews\n` +
        `• Best: ${ratings.max}/5 • Lowest: ${ratings.min}/5\n\n` +
        (recentLines ? `Recent reviews:\n${recentLines}` : 'No reviews yet.'),
        [
          { label: 'My revenue', value: 'my revenue', type: 'suggestion' },
          { label: 'My full stats', value: 'dashboard', type: 'suggestion' },
        ]
      );
      return true;
    }

    if (intent === 'appointments') {
      addMessage('assistant',
        `📊 Appointment Breakdown for ${provider.name}:\n\n` +
        `• Total: ${appointments.total}\n` +
        `• Pending: ${bs.pending || 0}\n` +
        `• Confirmed: ${bs.confirmed || 0}\n` +
        `• Completed: ${bs.completed || 0}\n` +
        `• Cancelled: ${bs.cancelled || 0}\n` +
        `• Rejected: ${bs.rejected || 0}`,
        [
          { label: 'Pending requests', value: 'pending requests', type: 'suggestion' },
          { label: 'Upcoming schedule', value: 'upcoming schedule', type: 'suggestion' },
          { label: 'My revenue', value: 'my revenue', type: 'suggestion' },
        ]
      );
      return true;
    }

    // Default: full dashboard
    addMessage('assistant',
      `📊 Dashboard — ${provider.name} (${provider.specialization}, ${provider.location})\n\n` +
      `Appointments: ${appointments.total} total • ${bs.pending || 0} pending • ${bs.confirmed || 0} confirmed • ${bs.completed || 0} completed\n` +
      `Revenue: ₹${revenue.total_earned.toLocaleString('en-IN')} from ${revenue.invoice_count} invoices\n` +
      `Rating: ${ratings.average}/5 from ${ratings.review_count} reviews\n` +
      `${provider.is_verified ? '✅ Verified provider' : '⏳ Pending verification'}`,
      [
        { label: `${bs.pending || 0} pending requests`, value: 'pending requests', type: 'suggestion' },
        { label: 'Upcoming schedule', value: 'upcoming schedule', type: 'suggestion' },
        { label: 'Revenue details', value: 'my revenue', type: 'suggestion' },
        { label: 'Ratings & reviews', value: 'my ratings', type: 'suggestion' },
      ]
    );
    return true;
  };

  const handleAdminQuery = async (text: string): Promise<boolean> => {
    const intent = await classifyIntent(text, 'admin');
    if (!intent) return false;

    setIsTyping(true);
    const data = await fetchAdminDashboard();
    await new Promise((r) => setTimeout(r, 300));
    setIsTyping(false);

    if (!data) {
      addMessage('assistant', 'Could not load admin dashboard right now. Please try again.');
      return true;
    }

    const { users, appointments, revenue, reviews, top_providers_by_revenue, top_rated_providers, category_breakdown, pending_provider_approvals, recent_appointments } = data;
    const bs = appointments.by_status;

    if (intent === 'approvals') {
      if (pending_provider_approvals.length === 0) {
        addMessage('assistant', '✅ No provider approvals pending. All providers are verified!', [
          { label: 'Platform overview', value: 'platform overview', type: 'suggestion' },
          { label: 'Top providers', value: 'top providers', type: 'suggestion' },
        ]);
      } else {
        const lines = pending_provider_approvals.map((p) =>
          `👤 ${p.name} — ${p.specialization} (${p.category}) in ${p.location} · applied ${p.applied_at}`
        ).join('\n');
        addMessage('assistant',
          `⏳ ${pending_provider_approvals.length} provider${pending_provider_approvals.length > 1 ? 's' : ''} awaiting approval:\n\n${lines}`,
          [
            { label: 'Go to approvals', value: '/admin/provider-approvals', type: 'link' },
            { label: 'Platform overview', value: 'platform overview', type: 'suggestion' },
          ]
        );
      }
      return true;
    }

    if (intent === 'revenue') {
      addMessage('assistant',
        `💰 Platform Revenue:\n\n` +
        `• Total revenue: ₹${revenue.total.toLocaleString('en-IN')}\n` +
        `• Total invoices: ${revenue.invoice_count}\n` +
        `• Avg per invoice: ₹${revenue.avg_per_invoice.toLocaleString('en-IN')}\n\n` +
        `Top earners:\n` +
        top_providers_by_revenue.slice(0, 3).map((p, i) =>
          `${i + 1}. ${p.name} (${p.specialization}) — ₹${p.revenue.toLocaleString('en-IN')}`
        ).join('\n'),
        [
          { label: 'Full overview', value: 'platform overview', type: 'suggestion' },
          { label: 'Top providers', value: 'top providers', type: 'suggestion' },
          { label: 'Go to reports', value: '/admin/reports', type: 'link' },
        ]
      );
      return true;
    }

    if (intent === 'users') {
      addMessage('assistant',
        `👥 User Stats:\n\n` +
        `• Total users: ${users.total}\n` +
        `• Customers: ${users.customers}\n` +
        `• Providers: ${users.providers} (${users.verified_providers} verified, ${users.pending_approvals} pending)`,
        [
          { label: 'Pending approvals', value: 'pending approvals', type: 'suggestion' },
          { label: 'Manage users', value: '/admin/users', type: 'link' },
          { label: 'Platform overview', value: 'platform overview', type: 'suggestion' },
        ]
      );
      return true;
    }

    if (intent === 'providers') {
      const lines = top_providers_by_revenue.slice(0, 5).map((p, i) =>
        `${i + 1}. ${p.name} — ${p.specialization} (${p.location}) ★${p.rating} • ₹${p.revenue.toLocaleString('en-IN')}`
      ).join('\n');
      addMessage('assistant',
        `🏥 Provider Stats:\n\n` +
        `• Total: ${users.providers} • Verified: ${users.verified_providers} • Pending: ${users.pending_approvals}\n\n` +
        `Top providers by revenue:\n${lines}`,
        [
          { label: 'Pending approvals', value: 'pending approvals', type: 'suggestion' },
          { label: 'Top rated', value: 'top providers', type: 'suggestion' },
          { label: 'Manage providers', value: '/admin/provider-approvals', type: 'link' },
        ]
      );
      return true;
    }

    if (intent === 'appointments') {
      const recent = recent_appointments.slice(0, 5).map((a) =>
        `• ${a.customer_name} → ${a.provider_name} on ${a.appointment_date} [${a.status}]`
      ).join('\n');
      addMessage('assistant',
        `📅 Appointment Stats:\n\n` +
        `• Total: ${appointments.total}\n` +
        `• Pending: ${bs.pending || 0} • Confirmed: ${bs.confirmed || 0}\n` +
        `• Completed: ${bs.completed || 0} • Cancelled: ${bs.cancelled || 0}\n\n` +
        `Recent:\n${recent}`,
        [
          { label: 'Platform overview', value: 'platform overview', type: 'suggestion' },
          { label: 'Revenue', value: 'platform revenue', type: 'suggestion' },
          { label: 'All appointments', value: '/admin/appointments', type: 'link' },
        ]
      );
      return true;
    }

    if (intent === 'categories') {
      const lines = category_breakdown.slice(0, 6).map((c) =>
        `• ${c.category}: ${c.appointments} appointments, ${c.providers} providers`
      ).join('\n');
      addMessage('assistant',
        `🗂️ Category Breakdown:\n\n${lines}`,
        [
          { label: 'Platform overview', value: 'platform overview', type: 'suggestion' },
          { label: 'Manage categories', value: '/admin/categories', type: 'link' },
        ]
      );
      return true;
    }

    if (intent === 'ratings') {
      const topRated = top_rated_providers.slice(0, 3).map((p, i) =>
        `${i + 1}. ${p.name} (${p.specialization}) ★${p.rating} from ${p.total_reviews} reviews`
      ).join('\n');
      addMessage('assistant',
        `⭐ Platform Ratings:\n\n` +
        `• Average rating: ${reviews.average_rating}/5\n` +
        `• Total reviews: ${reviews.total}\n\n` +
        `Top rated providers:\n${topRated}`,
        [
          { label: 'Top providers', value: 'top providers', type: 'suggestion' },
          { label: 'Platform overview', value: 'platform overview', type: 'suggestion' },
        ]
      );
      return true;
    }

    if (intent === 'topProviders') {
      const byRevenue = top_providers_by_revenue.slice(0, 3).map((p, i) =>
        `${i + 1}. ${p.name} — ₹${p.revenue.toLocaleString('en-IN')} (${p.specialization})`
      ).join('\n');
      const byRating = top_rated_providers.slice(0, 3).map((p, i) =>
        `${i + 1}. ${p.name} — ★${p.rating} from ${p.total_reviews} reviews`
      ).join('\n');
      addMessage('assistant',
        `🏆 Top Providers:\n\nBy Revenue:\n${byRevenue}\n\nBy Rating:\n${byRating}`,
        [
          { label: 'Revenue details', value: 'platform revenue', type: 'suggestion' },
          { label: 'Platform overview', value: 'platform overview', type: 'suggestion' },
        ]
      );
      return true;
    }

    // Default: full overview
    const topCat = category_breakdown[0];
    addMessage('assistant',
      `🖥️ Platform Overview:\n\n` +
      `👥 Users: ${users.total} total (${users.customers} customers, ${users.verified_providers} verified providers)\n` +
      (users.pending_approvals > 0 ? `⚠️ ${users.pending_approvals} provider${users.pending_approvals > 1 ? 's' : ''} awaiting approval\n` : '') +
      `📅 Appointments: ${appointments.total} total • ${bs.pending || 0} pending • ${bs.completed || 0} completed\n` +
      `💰 Revenue: ₹${revenue.total.toLocaleString('en-IN')} from ${revenue.invoice_count} invoices\n` +
      `⭐ Avg rating: ${reviews.average_rating}/5 from ${reviews.total} reviews\n` +
      (topCat ? `🔥 Busiest category: ${topCat.category} (${topCat.appointments} appointments)` : ''),
      [
        users.pending_approvals > 0
          ? { label: `⚠️ ${users.pending_approvals} pending approvals`, value: 'pending approvals', type: 'suggestion' as const }
          : { label: 'Top providers', value: 'top providers', type: 'suggestion' as const },
        { label: 'Revenue breakdown', value: 'platform revenue', type: 'suggestion' as const },
        { label: 'Appointment stats', value: 'how many appointments', type: 'suggestion' as const },
        { label: 'Category breakdown', value: 'category breakdown', type: 'suggestion' as const },
      ]
    );
    return true;
  };

  // ─── Booking Flow ──────────────────────────────────────────────────────────

  const isBookingIntent = (text: string) => {
    const q = text.toLowerCase();
    return (
      q.includes('book') ||
      q.includes('appointment') ||
      q.includes('schedule') ||
      q.includes('reserve') ||
      q.includes('find a') ||
      q.includes('need a') ||
      q.includes('want to see') ||
      q.includes('consult')
    );
  };

  const extractBookingSearchQuery = (text: string) =>
    text
      .toLowerCase()
      .replace(
        /\b(i|want|would|like|need|to|please|book|booking|appointment|appointments|schedule|reserve|find|me|a|an|with|for|show)\b/g,
        ' '
      )
      .replace(/\s+/g, ' ')
      .trim();

  const extractBookingLocation = (text: string): string => {
    const q = text.toLowerCase();
    const cityAliases: Record<string, string> = {
      mumbai: 'Mumbai', mubai: 'Mumbai', bombay: 'Mumbai',
      delhi: 'Delhi', 'new delhi': 'Delhi',
      bangalore: 'Bangalore', bengaluru: 'Bangalore', banglore: 'Bangalore', bangaluru: 'Bangalore',
      hyderabad: 'Hyderabad', hyd: 'Hyderabad',
      chennai: 'Chennai', madras: 'Chennai',
      pune: 'Pune',
      kolkata: 'Kolkata', calcutta: 'Kolkata',
      ahmedabad: 'Ahmedabad',
    };
    const matched = Object.keys(cityAliases).find((alias) => q.includes(alias));
    return matched ? cityAliases[matched] : '';
  };

  const startBookingFlow = async (userMessage: string) => {
    setBooking({ step: 'ask_service' });
    setIsTyping(true);

    // Extract service hint from message
    const q = userMessage.toLowerCase();
    const locationHint = extractBookingLocation(userMessage);
    let serviceHint = '';
    if (q.includes('doctor') || q.includes('medical') || q.includes('health')) serviceHint = 'Healthcare';
    else if (q.includes('dentist') || q.includes('dental') || q.includes('teeth')) serviceHint = 'Dental Care';
    else if (q.includes('yoga') || q.includes('fitness') || q.includes('gym')) serviceHint = 'Fitness Training';
    else if (q.includes('beauty') || q.includes('salon') || q.includes('hair')) serviceHint = 'Beauty & Wellness';
    else if (q.includes('lawyer') || q.includes('legal')) serviceHint = 'Legal Services';
    else if (q.includes('tutor') || q.includes('teach') || q.includes('learn')) serviceHint = 'Education & Tutoring';

    await new Promise((r) => setTimeout(r, 600));
    setIsTyping(false);

    if (serviceHint) {
      // Skip asking, go straight to providers
      await searchProviders(serviceHint, { location: locationHint || undefined });
    } else {
      const extractedQuery = extractBookingSearchQuery(userMessage);
      if (extractedQuery.length >= 3) {
        const foundProviders = await searchProviders(extractedQuery, {
          keepFlowOnEmpty: true,
          location: locationHint || undefined,
        });
        if (foundProviders) return;
      }

      addMessage('assistant',
        'What type of service are you looking for? I can help you find and book an appointment.',
        [
          { label: 'Healthcare', value: 'Healthcare', type: 'suggestion' },
          { label: 'Dental Care', value: 'Dental Care', type: 'suggestion' },
          { label: 'Fitness Training', value: 'Fitness Training', type: 'suggestion' },
          { label: 'Beauty & Wellness', value: 'Beauty & Wellness', type: 'suggestion' },
          { label: 'Mental Health', value: 'Mental Health', type: 'suggestion' },
          { label: 'Legal Services', value: 'Legal Services', type: 'suggestion' },
        ]
      );
    }
  };

  const searchProviders = async (
    service: string,
    options?: { keepFlowOnEmpty?: boolean; location?: string }
  ) => {
    const location = options?.location || booking.location || '';
    setBooking((prev) => ({ ...prev, step: 'show_providers', service, location }));
    setIsTyping(true);

    try {
      const res = await api.get('/mcp-tools/providers', {
        params: { query: service, location, limit: 5 },
      });
      const providers = res.data.providers || [];

      await new Promise((r) => setTimeout(r, 400));
      setIsTyping(false);

      if (providers.length === 0) {
        const categoriesRes = await api.get('/categories');
        const categories = categoriesRes.data || [];
        const serviceWords = service.toLowerCase();
        const matchedCategory = categories.find((category: { id: string; name: string }) =>
          category.name.toLowerCase().includes(serviceWords) ||
          serviceWords.includes(category.name.toLowerCase().split(' ')[0])
        );

        if (matchedCategory) {
          const retry = await api.get('/mcp-tools/providers', {
            params: { category: matchedCategory.name, location, limit: 5 },
          });
          const retryProviders = retry.data.providers || [];
          if (retryProviders.length > 0) {
            const retryActions: ChatAction[] = retryProviders.map((p: { id: string; name?: string; user?: { full_name?: string }; specialization?: string; location?: string; rating?: number; hourly_rate?: number }) => ({
              label: `${p.name || p.user?.full_name || 'Provider'} — ${p.specialization || service} (${p.location || 'N/A'}) ★${(p.rating || 0).toFixed(1)} • ₹${p.hourly_rate || 'N/A'}/hr`,
              value: p.id,
              type: 'provider' as const,
              data: { name: p.name || p.user?.full_name, specialization: p.specialization },
            }));

            addMessage('assistant',
              `MCP tools found ${matchedCategory.name} providers${location ? ` in ${location}` : ''}. Which one would you like to book with?`,
              retryActions
            );
            return true;
          }
        }

        if (options?.keepFlowOnEmpty) {
          setBooking({ step: 'ask_service' });
          return false;
        }

        addMessage('assistant', `I couldn’t find a matching provider for "${service}". Try another category or search by provider name.`, [
          { label: 'Try Healthcare', value: 'Healthcare', type: 'suggestion' },
          { label: 'Try Fitness', value: 'Fitness Training', type: 'suggestion' },
        ]);
        setBooking({ step: 'idle' });
        return false;
      }

      const actions: ChatAction[] = providers.map((p: { id: string; name?: string; user?: { full_name?: string }; specialization?: string; location?: string; rating?: number; hourly_rate?: number }) => ({
        label: `${p.name || p.user?.full_name || 'Provider'} — ${p.specialization || service} (${p.location || 'N/A'}) ★${(p.rating || 0).toFixed(1)} • ₹${p.hourly_rate || 'N/A'}/hr`,
        value: p.id,
        type: 'provider' as const,
        data: { name: p.name || p.user?.full_name, specialization: p.specialization },
      }));

      addMessage('assistant',
        `MCP tools found these ${service} providers${location ? ` in ${location}` : ''} from live data. Which one would you like to book with?`,
        actions
      );
      return true;
    } catch {
      setIsTyping(false);
      addMessage('assistant', 'Could not load providers right now. Please try again.');
      setBooking({ step: 'idle' });
      return false;
    }
  };

  const selectProvider = async (providerId: string, providerName: string) => {
    setBooking((prev) => ({ ...prev, step: 'ask_date', providerId, providerName }));
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 400));
    setIsTyping(false);

    // Generate next 7 available dates
    const today = new Date();
    const dates: ChatAction[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label = i === 1 ? 'Tomorrow' : i === 2 ? 'Day after tomorrow' :
        d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      dates.push({ label, value: dateStr, type: 'date' });
    }

    addMessage('assistant',
      `Great choice! When would you like to book with ${providerName}?`,
      dates
    );
  };

  const selectDate = async (date: string) => {
    const { providerId, providerName } = booking;
    if (!providerId) return;

    setBooking((prev) => ({ ...prev, step: 'show_slots', date }));
    setIsTyping(true);

    try {
      const res = await api.get(`/mcp-tools/providers/${providerId}/availability`, {
        params: { date },
      });
      const slots = (res.data.slots || []).filter((slot: { is_available?: boolean }) => slot.is_available !== false);

      await new Promise((r) => setTimeout(r, 400));
      setIsTyping(false);

      if (slots.length === 0) {
        addMessage('assistant',
          `No available slots on ${date} for ${providerName}. Please choose another date.`,
          [
            { label: 'Choose different date', value: 'change_date', type: 'suggestion' },
          ]
        );
        setBooking((prev) => ({ ...prev, step: 'ask_date' }));
        return;
      }

      const slotActions: ChatAction[] = slots.slice(0, 8).map((s: { start_time: string; end_time: string }) => ({
        label: `${formatTime(s.start_time)} – ${formatTime(s.end_time)}`,
        value: s.start_time,
        type: 'slot' as const,
        data: { end_time: s.end_time },
      }));

      const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', month: 'long', day: 'numeric'
      });

      addMessage('assistant',
        `Available slots on ${dateLabel} with ${providerName}:`,
        slotActions
      );
    } catch {
      setIsTyping(false);
      addMessage('assistant', 'Could not load time slots. Please try again.');
    }
  };

  const selectSlot = async (slot: string, endTime: string) => {
    const { providerId, providerName, date } = booking;
    if (!providerId || !date) return;

    setBooking((prev) => ({ ...prev, step: 'confirm', slot, endTime }));

    const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', month: 'long', day: 'numeric'
    });

    addMessage('assistant',
      `Please confirm your booking:\n\nProvider: ${providerName}\nDate: ${dateLabel}\nTime: ${formatTime(slot)} – ${formatTime(endTime)}\n\nShall I confirm this appointment?`,
      [
        { label: 'Yes, confirm booking', value: 'confirm', type: 'confirm' },
        { label: 'No, cancel', value: 'cancel', type: 'cancel' },
      ]
    );
  };

  const confirmBooking = async () => {
    const { providerId, date, slot } = booking;
    if (!providerId || !date || !slot) return;

    setBooking({ step: 'booked' });
    const params = new URLSearchParams({
      date,
      time: slot,
      step: 'confirm',
      source: 'chat',
    });
    navigate(`/book/${providerId}?${params.toString()}`);
    setIsOpen(false);
  };

  // ─── Main message handler ──────────────────────────────────────────────────

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isTyping) return;

    addMessage('user', messageText);
    setInput('');
    setSuggestions([]);

    // Handle booking flow actions
    if (messageText === 'confirm' && booking.step === 'confirm') {
      await confirmBooking();
      return;
    }
    if (messageText === 'cancel' && booking.step === 'confirm') {
      setBooking({ step: 'idle' });
      addMessage('assistant', 'Booking cancelled. How else can I help you?');
      setSuggestions(initialSuggestions.slice(0, 3));
      return;
    }
    if (messageText === 'change_date' && booking.step === 'ask_date') {
      const { providerId, providerName } = booking;
      if (providerId && providerName) await selectProvider(providerId, providerName);
      return;
    }
    if (messageText === 'book another') {
      setBooking({ step: 'idle' });
      await startBookingFlow('book appointment');
      return;
    }

    // Provider intent handling via MCP
    if (userRole === 'provider') {
      const handled = await handleProviderQuery(messageText);
      if (handled) return;
    }

    // Admin intent handling via MCP
    if (userRole === 'admin') {
      const handled = await handleAdminQuery(messageText);
      if (handled) return;
    }

    // Customer booking flow
    if (
      userRole === 'customer' &&
      isBookingIntent(messageText) &&
      (booking.step === 'ask_service' || booking.step === 'show_providers')
    ) {
      await startBookingFlow(messageText);
      return;
    }

    if (userRole === 'customer' && isBookingIntent(messageText) && booking.step === 'idle') {
      await startBookingFlow(messageText);
      return;
    }

    // Service selection
    if (booking.step === 'ask_service') {
      await searchProviders(messageText);
      return;
    }

    if (userRole === 'customer' && /(loyalty|points|wallet)/i.test(messageText) && booking.step === 'idle') {
      try {
        const account = await loyaltyService.getAccount();
        addMessage(
          'assistant',
          `You currently have ${account.points.toLocaleString('en-IN')} loyalty points in your wallet. Your tier is ${account.tier}.`
        );
      } catch {
        addMessage('assistant', 'I could not load your wallet right now. Please open the Wallet page for the latest balance.');
      }
      return;
    }

    if (/(mcp|model context protocol)/i.test(messageText) && booking.step === 'idle') {
      setIsTyping(true);
      try {
        const response = await api.get('/mcp-tools/status');
        const data = response.data as McpStatus;
        setMcpStatus(data);
        setMcpStatusLoaded(true);
        addMessage(
          'assistant',
          `MCP is ${data.connected ? 'connected' : 'not connected'} in the live app.\n\nBridge: ${data.bridge}\nTools: ${data.tool_count}\nDatabase: ${data.health?.database || 'unknown'}\nUsers visible to health check: ${data.health?.user_count ?? 'unknown'}`
        );
      } catch {
        addMessage('assistant', 'I could not reach the MCP bridge from the live app right now.');
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Regular AI response
    setIsTyping(true);
    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await api.post('/ai-chat', {
        message: messageText,
        conversation_history: conversationHistory,
      });

      const { reply, suggestions: newSuggestions, actions } = response.data;
      addMessage('assistant', reply, actions || []);
      setSuggestions(newSuggestions || []);
    } catch {
      addMessage('assistant', getFallbackResponse(messageText));
    } finally {
      setIsTyping(false);
    }
  };

  const handleAction = async (action: ChatAction) => {
    if (action.type === 'provider') {
      addMessage('user', action.label.split(' — ')[0]);
      await selectProvider(action.value, action.data?.name as string || action.label.split(' — ')[0]);
    } else if (action.type === 'date') {
      addMessage('user', action.label);
      await selectDate(action.value);
    } else if (action.type === 'slot') {
      addMessage('user', action.label);
      await selectSlot(action.value, action.data?.end_time as string || '');
    } else if (action.type === 'confirm') {
      addMessage('user', 'Yes, confirm booking');
      await confirmBooking();
    } else if (action.type === 'cancel') {
      addMessage('user', 'No, cancel');
      setBooking({ step: 'idle' });
      addMessage('assistant', 'Booking cancelled. How else can I help you?');
    } else if (action.type === 'link') {
      addMessage('user', action.label);
      navigate(action.value);
      setIsOpen(false);
    } else if (action.type === 'suggestion') {
      await handleSend(action.value);
    }
  };

  const getFallbackResponse = (userMessage: string): string => {
    const q = userMessage.toLowerCase();
    const firstName = user?.full_name?.split(' ')[0] || 'there';

    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      return `${greeting}, ${firstName}! I can help you book appointments, check your schedule, or answer questions about the platform. What would you like to do?`;
    }
    if (q.includes('loyalty') || q.includes('points')) {
      return 'Check your loyalty points in the Wallet section. You earn points on every completed booking.';
    }
    if (q.includes('reschedule')) {
      return 'To reschedule: Go to My Appointments → Click the appointment → Reschedule → Pick a new date and time.';
    }
    if (q.includes('cancel')) {
      return 'To cancel: Go to My Appointments → Click the appointment → Cancel Appointment.';
    }
    return 'I can help you book appointments, check your schedule, or answer questions. What would you like to do?';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeSuggestions = suggestions.length > 0
    ? suggestions
    : messages.length === 0
    ? initialSuggestions.slice(0, 3)
    : [];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 flex flex-col border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl rounded-xl overflow-hidden"
            style={
              isMaximized
                ? { left: 16, top: 16, width: 'calc(100vw - 32px)', height: 'calc(100vh - 32px)' }
                : { left: position.x, top: position.y, width: size.width, height: size.height }
            }
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-black dark:bg-gray-900"
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                startDrag(e as React.PointerEvent<HTMLDivElement>);
              }}
            >
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-black dark:text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">AppointEase AI</p>
                  <p className="text-[10px] text-gray-400">
                    {booking.step !== 'idle' ? '● Booking in progress...' : `${userRole} mode`}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    MCP {mcpStatus?.connected ? 'connected' : mcpStatusLoaded ? 'offline' : 'checking...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowHistory((value) => !value)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                  aria-label={showHistory ? 'Hide chat history' : 'Show chat history'}
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={startNewChat}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 inline-block mr-1" />
                  New chat
                </button>
                <button
                  type="button"
                  onClick={() => setIsMaximized((value) => !value)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                  aria-label={isMaximized ? 'Restore chat size' : 'Maximize chat'}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages / History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
              {showHistory ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Chat history</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Open any past conversation or start a fresh one.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowHistory(false)}
                      className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                    >
                      Back to chat
                    </button>
                  </div>

                  {threads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
                      No saved chats yet. Start a new conversation to keep a history.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {threads.map((thread) => (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => loadThread(thread)}
                          className={cn(
                            'w-full text-left rounded-xl border px-3 py-3 transition-colors',
                            thread.id === activeThreadId
                              ? 'border-black dark:border-white bg-white dark:bg-gray-900'
                              : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/70 hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {thread.title || 'New chat'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {thread.messages.length} messages
                              </p>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 flex-shrink-0">
                              {new Date(thread.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                        <Sparkles className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Hi {user?.full_name?.split(' ')[0]}! How can I help?
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {userRole === 'customer'
                          ? 'I can book appointments with MCP-backed provider search and availability.'
                          : 'Ask me anything about the platform.'}
                      </p>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-[11px] text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900">
                        <span className={cn(
                          'w-2 h-2 rounded-full',
                          mcpStatus?.connected ? 'bg-green-500' : mcpStatusLoaded ? 'bg-red-500' : 'bg-gray-400'
                        )} />
                        MCP {mcpStatus?.connected ? `${mcpStatus.tool_count} tools ready` : mcpStatusLoaded ? 'bridge offline' : 'checking bridge'}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center bg-black dark:bg-gray-700">
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className="max-w-[85%] space-y-2">
                        <div className={cn(
                          'px-3 py-2 text-sm whitespace-pre-line rounded-xl',
                          msg.role === 'user'
                            ? 'bg-black text-white dark:bg-white dark:text-black rounded-br-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-sm rounded-bl-sm'
                        )}>
                          {msg.content}
                        </div>

                        {/* Action buttons */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            {msg.actions.map((action, i) => (
                              <button
                                key={i}
                                onClick={() => handleAction(action)}
                                className={cn(
                                  'text-left px-3 py-2 text-xs rounded-lg border transition-all hover:scale-[1.01]',
                                  action.type === 'confirm'
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300 font-medium'
                                    : action.type === 'cancel'
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                    : action.type === 'provider'
                                    ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                                    : action.type === 'date' || action.type === 'slot'
                                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 flex items-center gap-2'
                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                )}
                              >
                                {action.type === 'date' && <Calendar className="w-3 h-3 flex-shrink-0" />}
                                {action.type === 'slot' && <Clock className="w-3 h-3 flex-shrink-0" />}
                                {action.type === 'confirm' && <CheckCircle className="w-3 h-3 flex-shrink-0" />}
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-6 h-6 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex gap-2 items-center">
                      <div className="w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center bg-black dark:bg-gray-700">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Suggestion chips */}
            {activeSuggestions.length > 0 && !isTyping && (
              <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex flex-wrap gap-1.5">
                  {activeSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex gap-2 items-end rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 p-2 shadow-sm">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder={
                    booking.step === 'ask_service' ? 'Type a service (e.g., Healthcare)...' :
                    booking.step === 'show_providers' ? 'Select a provider above...' :
                    booking.step === 'ask_date' ? 'Select a date above...' :
                    booking.step === 'show_slots' ? 'Select a time slot above...' :
                    booking.step === 'confirm' ? 'Confirm or cancel above...' :
                    'Type a message...'
                  }
                  className="flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-2.5 text-sm leading-6 text-gray-900 dark:text-gray-50 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-0"
                />
                {/* AI Feature #10: Voice input button — hidden if browser doesn't support */}
                {speechSupported && (
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-all shadow-sm ${
                      isListening
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            {!isMaximized && (
              <div
                onPointerDown={startResize}
                className="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize rounded-br-lg flex items-end justify-end text-gray-300 hover:text-gray-500"
                aria-label="Resize chat"
              >
                <Move className="w-3 h-3 rotate-45" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating trigger */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </motion.button>
    </>
  );
};

// Helper
function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
