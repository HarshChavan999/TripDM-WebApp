'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image as ImageIcon,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  RefreshCw,
  Filter,
  Layers,
  MapPin,
  Building2,
  Eye,
  Check,
  Trash2,
  Compass,
  ArrowRight,
  ArrowLeft,
  Info,
  Globe,
  SlidersHorizontal,
  FolderOpen,
  Plus,
  BookOpen,
  Newspaper,
  Calendar,
  Tag,
  Share2,
  FileText,
  CheckCircle,
  Play,
  Pause,
  Square,
  Cpu,
  Zap,
  ListOrdered,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { searchWikimediaImages, cleanPlaceQuery, WikimediaImageResult } from '@/lib/wikipediaCommons';
import { extractPlacesFromTitle } from '@/lib/locationExtractor';
import { getDbInstance } from '@/lib/firebase';
import { doc, updateDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';

export interface BlogItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  author?: string;
  published?: boolean;
  publishedAt?: string;
  updatedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  readTime?: string;
  views?: number;
  hasPhoto: boolean;
  photoPlaces?: string[]; // AI-extracted landmark & place names for images
  autoFilledRepeated?: boolean;
  autoFilledAt?: number;
  autoFilledSource?: string;
}

export interface KnownBlogPhotoSource {
  urls: string[];
  placeName: string;
  sourceTitle: string;
  sourceId: string;
  dayNumber?: number;
  destination?: string;
  sourceType: 'itinerary' | 'placesCovered' | 'blog';
}

export interface BlogAutoFillCandidate {
  id: string; // blog.id
  targetBlogId: string;
  targetBlogTitle: string;
  targetBlogSlug: string;
  targetCategory?: string;
  targetMatchedTopic: string;

  proposedUrls: string[];
  primaryImageUrl: string;
  imageTitle: string;

  sourcePlaceName: string;
  sourceTitle: string;
  sourceId: string;
  sourceDayNumber?: number;
  sourceType: 'itinerary' | 'placesCovered' | 'blog' | 'ai_web_search';
  matchType: 'exact' | 'landmark' | 'cleaned' | 'split' | 'topic';
  matchReason: string;
}

export interface BlogAutoFillRevertEntry {
  id: string; // blog.id
  blogId: string;
  blogTitle: string;
  blogSlug: string;
  category?: string;
  imageUrl: string;
  autoFilledAt?: number;
  sourcePlaceName?: string;
}

// Extract human-readable image title/filename from URL (Wikimedia, R2, etc.)
export function extractImageTitleFromUrl(url: string): string {
  if (!url) return 'Unknown Asset';
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const parts = cleanUrl.split('/').filter(Boolean);
    if (parts.length === 0) return 'Unknown Asset';

    const thumbIdx = parts.indexOf('thumb');
    let rawFilename = '';
    if (thumbIdx !== -1 && parts.length > thumbIdx + 3) {
      rawFilename = parts[thumbIdx + 3];
    } else {
      rawFilename = parts[parts.length - 1];
      rawFilename = rawFilename.replace(/^\d+px-/, '');
    }

    let decoded = decodeURIComponent(rawFilename);
    decoded = decoded.replace(/\.(jpg|jpeg|png|webp|gif|svg|avif|tiff)$/i, '');
    decoded = decoded.replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim();
    return decoded || 'Photo Asset';
  } catch (e) {
    return 'Photo Asset';
  }
}

export interface QueueItem {
  id: string;
  blogId: string;
  title: string;
  category: string;
  status: 'pending' | 'analyzing' | 'success' | 'failed' | 'skipped';
  extractedPlaces?: string[];
  error?: string;
  timeTaken?: number;
}

export interface QueueLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warn';
  message: string;
}

interface AdminBlogPhotoManagerProps {
  initialBlogs?: BlogItem[];
  initialListings?: any[];
  onBlogUpdated?: (updatedBlog: BlogItem) => void;
}

// Known common destinations and landmarks for fast entity matching
const FAMOUS_DESTINATIONS_MAP: { [key: string]: string[] } = {
  kedarnath: ['Kedarnath Temple', 'Kedarnath', 'Garhwal Himalayas'],
  badrinath: ['Badrinath Temple', 'Badrinath', 'Chamoli'],
  nainital: ['Nainital Lake', 'Nainital', 'Naini Peak'],
  mussoorie: ['Mussoorie', 'Kempty Falls', 'Mall Road Mussoorie'],
  rishikesh: ['Rishikesh', 'Laxman Jhula', 'Triveni Ghat Rishikesh'],
  haridwar: ['Haridwar', 'Har Ki Pauri', 'Ganga Aarti Haridwar'],
  auli: ['Auli', 'Auli Skiing', 'Auli Ropeway', 'Nanda Devi'],
  'jim corbett': ['Jim Corbett National Park', 'Corbett Tiger Reserve'],
  chopta: ['Chopta', 'Tungnath Temple', 'Chandrashila'],
  tungnath: ['Tungnath Temple', 'Chopta', 'Chandrashila'],
  'valley of flowers': ['Valley of Flowers National Park', 'Hemkund Sahib'],
  uttarakhand: ['Uttarakhand', 'Garhwal', 'Himalayas India'],
  manali: ['Manali', 'Solang Valley', 'Rohtang Pass'],
  shimla: ['Shimla', 'Mall Road Shimla', 'Jakhoo Temple'],
  goa: ['Goa Beaches', 'Calangute Beach', 'Old Goa Churches'],
  kerala: ['Kerala Backwaters', 'Alleppey Houseboat', 'Munnar Tea Gardens'],
  kashmir: ['Dal Lake Srinagar', 'Gulmarg Snow', 'Pahalgam Valley'],
  ladakh: ['Pangong Lake Ladakh', 'Nubra Valley', 'Leh Ladakh'],
  rajasthan: ['Jaipur Hawa Mahal', 'Udaipur City Palace', 'Jaisalmer Fort'],
  jaipur: ['Hawa Mahal Jaipur', 'Amber Fort Jaipur', 'City Palace Jaipur'],
  udaipur: ['Lake Pichola Udaipur', 'City Palace Udaipur'],
  andaman: ['Radhanagar Beach Havelock', 'Cellular Jail Port Blair', 'Andaman Islands'],
  dubai: ['Burj Khalifa Dubai', 'Dubai Marina', 'Dubai Skyline'],
  bali: ['Bali Temple', 'Ubud Rice Terrace', 'Tanah Lot Bali'],
  maldives: ['Maldives Resort Overwater', 'Maldives Beach'],
  thailand: ['Bangkok Grand Palace', 'Phuket Island', 'Phi Phi Islands'],
  vietnam: ['Ha Long Bay Vietnam', 'Hoi An Ancient Town'],
  singapore: ['Marina Bay Sands Singapore', 'Gardens by the Bay']
};

// Strict Blacklist of non-place English words, guide verbs, and noise tokens
const NON_PLACE_WORDS = new Set([
  'think', 'thinking', 'thought', 'why', 'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'how',
  'how to', 'use', 'using', 'used', 'instead', 'instead of', 'honest', 'reality', 'check', 'checking',
  'online', 'offline', 'book', 'booking', 'booked', 'agency', 'agencies', 'agent', 'agents',
  'difference', 'differences', 'compare', 'comparing', 'comparison', 'versus', 'vs',
  'better', 'best', 'worst', 'pros', 'cons', 'benefits', 'advantage', 'advantages', 'disadvantage', 'disadvantages',
  'tips', 'tip', 'tricks', 'trick', 'hacks', 'hack', 'secrets', 'secret', 'mistakes', 'mistake', 'rules', 'rule',
  'guide', 'guides', 'guidelines', 'guideline', 'review', 'reviews', 'rating', 'ratings',
  'cost', 'costs', 'budget', 'budgets', 'price', 'prices', 'pricing', 'cheap', 'expensive', 'affordable',
  'money', 'save', 'saving', 'plan', 'planning', 'planner', 'plans', 'itinerary', 'itineraries',
  'package', 'packages', 'deal', 'deals', 'offer', 'offers', 'advice', 'option', 'options',
  'reason', 'reasons', 'things', 'thing', 'places', 'place', 'visit', 'visiting', 'visited',
  'travel', 'travelling', 'traveling', 'traveler', 'travelers', 'traveller', 'travellers',
  'trip', 'trips', 'tour', 'tours', 'tourism', 'holiday', 'holidays', 'vacation', 'vacations',
  'experience', 'experiences', 'destination', 'destinations', 'overview', 'summary', 'introduction',
  'conclusion', 'faq', 'faqs', 'question', 'questions', 'answer', 'answers', 'essential', 'essentials',
  'complete', 'ultimate', 'definitive', 'conquering', 'simple', 'easy', 'step', 'steps', 'season', 'seasons',
  'weather', 'climate', 'month', 'months', 'year', 'years', '2024', '2025', '2026', '2027', '2028', '2029', '2030',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'spring', 'summer', 'monsoon', 'autumn', 'winter', 'hotel', 'hotels', 'resort', 'resorts', 'stay', 'staying',
  'accommodation', 'accommodations', 'flight', 'flights', 'train', 'trains', 'bus', 'buses', 'taxi', 'taxis',
  'cab', 'cabs', 'car', 'cars', 'rental', 'rentals', 'insurance', 'safety', 'safe', 'secure', 'danger',
  'dangerous', 'warning', 'warnings', 'permit', 'permits', 'visa', 'visas', 'passport', 'passports',
  'packing', 'pack', 'luggage', 'baggage', 'clothes', 'clothing', 'wear', 'wearing', 'dress', 'food',
  'foodie', 'dishes', 'cuisine', 'eat', 'eating', 'drink', 'drinks', 'shopping', 'souvenir', 'souvenirs',
  'scam', 'scams', 'avoid', 'avoiding', 'dos', 'donts', 'culture', 'etiquette', 'customs', 'language',
  'internet', 'sim', 'wifi', 'currency', 'exchange', 'atm', 'cards', 'cash', 'emergency', 'help',
  'explore', 'exploring', 'discover', 'discovering', 'conquer', 'adventure', 'adventures', 'trek', 'treks',
  'valley', 'lake', 'falls', 'temple', 'peak', 'glacier', 'mountain', 'hill', 'river', 'beach', 'island', 'fort'
]);

function isValidPlaceChip(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim().replace(/^[\s,.\-–—:|()?!"]+|[\s,.\-–—:|()?!"]+$/g, '');
  if (clean.length < 3) return false;

  // Discard if contains sentence punctuation, question marks, or comparison phrases
  if (clean.includes('?') || clean.includes('!') || clean.includes(' vs ') || clean.includes(' versus ')) {
    return false;
  }

  const lower = clean.toLowerCase();

  // Direct blacklist match
  if (NON_PLACE_WORDS.has(lower)) return false;

  // Single word checks
  const words = clean.split(/\s+/);
  if (words.length === 1 && NON_PLACE_WORDS.has(words[0].toLowerCase())) {
    return false;
  }

  // Check if every word in a multi-word phrase is noise
  const allNoise = words.every(w => NON_PLACE_WORDS.has(w.toLowerCase()) || w.length <= 2);
  if (allNoise) return false;

  // Discard conversational phrases and headlines
  if (
    lower.startsWith('why ') ||
    lower.startsWith('how to ') ||
    lower.startsWith('how ') ||
    lower.startsWith('is ') ||
    lower.startsWith('should you ') ||
    lower.startsWith('what is ') ||
    lower.startsWith('what ') ||
    lower.startsWith('where to ') ||
    lower.startsWith('when to ') ||
    lower.startsWith('explore ') ||
    lower.startsWith('exploring ') ||
    lower.startsWith('discover ') ||
    lower.startsWith('discovering ') ||
    lower.includes('instead of') ||
    lower.includes('reality check') ||
    lower.includes('honest review') ||
    lower.includes('everything you need') ||
    lower.includes('complete guide to')
  ) {
    return false;
  }

  return true;
}

function getConceptualTravelThemes(title: string, category: string = ''): Array<{ name: string; query: string }> {
  const t = `${title} ${category}`.toLowerCase();

  if (t.includes('agency') || t.includes('agent') || t.includes('booking') || t.includes('online')) {
    return [
      { name: 'Travel Planning', query: 'Travel Planning' },
      { name: 'Vacation Planning', query: 'Vacation Planning' },
      { name: 'Travel Luggage', query: 'Travel Luggage' },
      { name: 'Airplane Travel', query: 'Airplane Travel' }
    ];
  }

  if (t.includes('packing') || t.includes('clothes') || t.includes('luggage') || t.includes('backpack')) {
    return [
      { name: 'Travel Suitcase', query: 'Travel Suitcase Packing' },
      { name: 'Travel Backpack', query: 'Travel Backpack Luggage' },
      { name: 'Travel Planning', query: 'Travel Planning' }
    ];
  }

  if (t.includes('budget') || t.includes('cost') || t.includes('cheap') || t.includes('money') || t.includes('save')) {
    return [
      { name: 'Travel Planning', query: 'Travel Planning' },
      { name: 'Backpacker Travel', query: 'Backpacker Map Travel' },
      { name: 'Airplane Window', query: 'Airplane Window View' }
    ];
  }

  if (t.includes('solo') || t.includes('safety') || t.includes('safe') || t.includes('female')) {
    return [
      { name: 'Solo Traveler', query: 'Solo Traveler Scenic View' },
      { name: 'Travel Backpacking', query: 'Backpacker Mountain Landscape' },
      { name: 'Scenic Viewpoint', query: 'Scenic Mountain Viewpoint' }
    ];
  }

  if (t.includes('flight') || t.includes('airport') || t.includes('airline') || t.includes('ticket')) {
    return [
      { name: 'Airplane Flight', query: 'Airplane Wing Sky' },
      { name: 'Airport Travel', query: 'Airport Travel Departure' },
      { name: 'Passport & Ticket', query: 'Passport Boarding Pass Travel' }
    ];
  }

  if (t.includes('hotel') || t.includes('resort') || t.includes('stay') || t.includes('room')) {
    return [
      { name: 'Luxury Resort', query: 'Luxury Resort Pool View' },
      { name: 'Boutique Hotel', query: 'Boutique Hotel Room Landscape' },
      { name: 'Resort View', query: 'Resort Ocean Mountain' }
    ];
  }

  if (t.includes('food') || t.includes('cuisine') || t.includes('eat') || t.includes('dining')) {
    return [
      { name: 'Travel Dining', query: 'Local Street Food Travel' },
      { name: 'Traditional Cuisine', query: 'Traditional Cuisine Feast' }
    ];
  }

  return [
    { name: 'Travel Planning', query: 'Travel Planning' },
    { name: 'Scenic Landscape', query: 'Scenic Travel Landscape Mountains' },
    { name: 'Vacation View', query: 'Beautiful Vacation View' },
    { name: 'Travel Adventure', query: 'Travel Adventure Scenic' }
  ];
}

/**
 * Extracts smart searchable destination/topic chips from blog's AI photoPlaces or title/content
 */
function extractBlogTopics(blog: BlogItem): { name: string; query: string }[] {
  const topics: { name: string; query: string }[] = [];
  const added = new Set<string>();

  // 1. Highest Priority: AI-extracted photoPlaces (Strictly validated)
  if (Array.isArray(blog.photoPlaces) && blog.photoPlaces.length > 0) {
    blog.photoPlaces.forEach(place => {
      if (typeof place === 'string' && isValidPlaceChip(place)) {
        const cleaned = place.trim();
        const lower = cleaned.toLowerCase();
        if (!added.has(lower)) {
          added.add(lower);
          topics.push({ name: cleaned, query: cleaned });
        }
      }
    });
  }

  const fullText = `${blog.title} ${blog.category || ''} ${(blog.tags || []).join(' ')} ${blog.excerpt || ''}`.toLowerCase();

  // 2. Check known destination keywords
  for (const [key, searchTerms] of Object.entries(FAMOUS_DESTINATIONS_MAP)) {
    if (fullText.includes(key)) {
      searchTerms.forEach(term => {
        if (isValidPlaceChip(term)) {
          const lower = term.toLowerCase();
          if (!added.has(lower)) {
            added.add(lower);
            topics.push({ name: term, query: term });
          }
        }
      });
    }
  }

  // 3. Extract title segments by cleaning title
  const titlePlaces = extractPlacesFromTitle(blog.title, blog.category);
  titlePlaces.forEach(place => {
    const cleaned = cleanPlaceQuery(place);
    if (cleaned && isValidPlaceChip(cleaned)) {
      const lower = cleaned.toLowerCase();
      if (!added.has(lower)) {
        added.add(lower);
        topics.push({ name: cleaned, query: cleaned });
      }
    }
  });

  // 4. If no physical landmarks found, provide clean curated aesthetic travel themes
  if (topics.length === 0) {
    const themes = getConceptualTravelThemes(blog.title, blog.category);
    themes.forEach(theme => {
      const lower = theme.name.toLowerCase();
      if (!added.has(lower)) {
        added.add(lower);
        topics.push(theme);
      }
    });
  }

  return topics.slice(0, 10);
}

export default function AdminBlogPhotoManager({
  initialBlogs = [],
  initialListings = [],
  onBlogUpdated
}: AdminBlogPhotoManagerProps) {
  const [blogs, setBlogs] = useState<BlogItem[]>(initialBlogs);
  const [allListings, setAllListings] = useState<any[]>(initialListings || []);
  const [loading, setLoading] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [activeTab, setActiveTab] = useState<'missing' | 'all' | 'completed' | 'drafts' | 'unanalyzed'>('missing');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'grouped' | 'list'>('grid');

  // Modal State
  const [activeBlog, setActiveBlog] = useState<BlogItem | null>(null);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'wikimedia' | 'wikipedia' | 'flickr'>('all');
  const [isSearchingWiki, setIsSearchingWiki] = useState(false);
  const [isAnalyzingSingle, setIsAnalyzingSingle] = useState(false);
  const [wikiResults, setWikiResults] = useState<WikimediaImageResult[]>([]);
  const [selectedImage, setSelectedImage] = useState<WikimediaImageResult | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewFullImageUrl, setPreviewFullImageUrl] = useState<string | null>(null);

  // Auto-Fill Repeated Review Modal State
  const [isAutoFillReviewOpen, setIsAutoFillReviewOpen] = useState(false);
  const [autoFillModalSearch, setAutoFillModalSearch] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [isAutoFillingRepeated, setIsAutoFillingRepeated] = useState(false);

  // AI Web Auto-Fill Candidate State
  const [aiWebCandidates, setAiWebCandidates] = useState<Map<string, BlogAutoFillCandidate>>(new Map());
  const [isAiWebSearching, setIsAiWebSearching] = useState(false);
  const [aiSearchProgress, setAiSearchProgress] = useState<{
    current: number;
    total: number;
    blogTitle: string;
    landmark?: string;
    foundCount: number;
  }>({ current: 0, total: 0, blogTitle: '', foundCount: 0 });
  const [isFindingSingleAiPhoto, setIsFindingSingleAiPhoto] = useState<string | null>(null);
  const aiSearchCancelRef = useRef(false);

  // Revert Auto-Filled Modal State
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [revertModalSearch, setRevertModalSearch] = useState('');
  const [selectedRevertIds, setSelectedRevertIds] = useState<Set<string>>(new Set());
  const [isReverting, setIsReverting] = useState(false);

  // Extracted Smart Topics
  const [extractedTopics, setExtractedTopics] = useState<{ name: string; query: string }[]>([]);
  const [activeTopicQuery, setActiveTopicQuery] = useState<string>('');

  // ─── AI BATCH QUEUE STATE ───
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueRunning, setQueueRunning] = useState(false);
  const [queuePaused, setQueuePaused] = useState(false);
  const [queueCurrentIndex, setQueueCurrentIndex] = useState(-1);
  const [queueLogs, setQueueLogs] = useState<QueueLog[]>([]);
  const [queueDelaySeconds, setQueueDelaySeconds] = useState(1);

  const queueRunningRef = useRef(false);
  const queuePausedRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    queueRunningRef.current = queueRunning;
  }, [queueRunning]);

  useEffect(() => {
    queuePausedRef.current = queuePaused;
  }, [queuePaused]);

  const addQueueLog = (type: 'info' | 'success' | 'error' | 'warn', message: string) => {
    const newLog: QueueLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setQueueLogs(prev => [newLog, ...prev.slice(0, 150)]);
  };

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch blogs directly from Firestore on mount or refresh
  const fetchAllBlogs = async () => {
    setLoading(true);
    try {
      const db = getDbInstance();
      if (!db) {
        // Fallback to REST API
        const res = await fetch('/api/blog?all=true');
        if (res.ok) {
          const data = await res.json();
          const items: BlogItem[] = (data.blogs || []).map((b: any) => ({
            ...b,
            photoPlaces: Array.isArray(b.photoPlaces) ? b.photoPlaces : [],
            hasPhoto: !!(b.coverImage && b.coverImage.trim().length > 0),
            autoFilledRepeated: !!b.autoFilledRepeated,
            autoFilledAt: b.autoFilledAt || undefined,
            autoFilledSource: b.autoFilledSource || undefined
          }));
          setBlogs(items);
          showToast(`Loaded ${items.length} blogs.`, 'info');
        }
        setLoading(false);
        return;
      }

      const q = query(collection(db, 'blogs'), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const items: BlogItem[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        const cover = d.coverImage || '';
        return {
          id: docSnap.id,
          title: d.title || 'Untitled Blog',
          slug: d.slug || docSnap.id,
          excerpt: d.excerpt || '',
          content: d.content || '',
          coverImage: cover,
          category: d.category || 'Travel Guides',
          tags: Array.isArray(d.tags) ? d.tags : [],
          author: d.author || 'TripDM Team',
          published: d.published ?? false,
          publishedAt: d.publishedAt || '',
          updatedAt: d.updatedAt || '',
          metaTitle: d.metaTitle || '',
          metaDescription: d.metaDescription || '',
          readTime: d.readTime || '5 min read',
          views: d.views || 0,
          photoPlaces: Array.isArray(d.photoPlaces) ? d.photoPlaces : [],
          hasPhoto: !!(cover && cover.trim().length > 0),
          autoFilledRepeated: !!d.autoFilledRepeated,
          autoFilledAt: d.autoFilledAt || undefined,
          autoFilledSource: d.autoFilledSource || undefined
        };
      });

      setBlogs(items);
      showToast(`Refreshed ${items.length} blogs from Firestore.`, 'info');
    } catch (err: any) {
      console.error('Error fetching blogs:', err);
      showToast('Failed to load blogs. Retrying...', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialBlogs && initialBlogs.length > 0) {
      setBlogs(
        initialBlogs.map(b => ({
          ...b,
          photoPlaces: Array.isArray(b.photoPlaces) ? b.photoPlaces : [],
          hasPhoto: !!(b.coverImage && b.coverImage.trim().length > 0),
          autoFilledRepeated: !!b.autoFilledRepeated,
          autoFilledAt: b.autoFilledAt,
          autoFilledSource: b.autoFilledSource
        }))
      );
    } else {
      fetchAllBlogs();
    }
  }, [initialBlogs]);

  // Keep package listings synchronized for cross-referencing photos
  useEffect(() => {
    if (initialListings && initialListings.length > 0) {
      setAllListings(initialListings);
    } else {
      const fetchListings = async () => {
        try {
          const db = getDbInstance();
          if (!db) return;
          const snap = await getDocs(collection(db, 'listings'));
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setAllListings(list);
        } catch (e) {
          console.error('Error loading listings for photo reference:', e);
        }
      };
      fetchListings();
    }
  }, [initialListings]);

  // Global Known Photos Map from Package Listings & Existing Blogs
  const knownDestinationPhotos = useMemo(() => {
    const map = new Map<string, string[]>();

    // 1. From existing blogs with cover photos
    blogs.forEach(b => {
      if (b.coverImage && b.coverImage.trim()) {
        const topics = extractBlogTopics(b);
        topics.forEach(t => {
          const k = t.query.toLowerCase().trim();
          if (!map.has(k)) map.set(k, []);
          const arr = map.get(k)!;
          if (!arr.includes(b.coverImage!)) arr.push(b.coverImage!);
        });
      }
    });

    // 2. From package listings
    allListings.forEach((pkg: any) => {
      if (!pkg) return;
      if (Array.isArray(pkg.itinerary)) {
        pkg.itinerary.forEach((day: any) => {
          const urls: string[] = Array.isArray(day.imageUrls)
            ? day.imageUrls.filter(Boolean)
            : day.imageUrl
            ? [day.imageUrl]
            : [];
          if (urls.length > 0 && day.placeName) {
            const cleanKey = cleanPlaceQuery(day.placeName).toLowerCase().trim();
            if (cleanKey) {
              if (!map.has(cleanKey)) map.set(cleanKey, []);
              const arr = map.get(cleanKey)!;
              urls.forEach(u => {
                if (!arr.includes(u)) arr.push(u);
              });
            }
          }
        });
      }
    });

    return map;
  }, [blogs, allListings]);

  // Find known photos for a blog
  const findKnownBlogPhotos = (blog: BlogItem, topics: { name: string; query: string }[]): string[] => {
    for (const t of topics) {
      const k = t.query.toLowerCase().trim();
      if (knownDestinationPhotos.has(k) && (knownDestinationPhotos.get(k)?.length ?? 0) > 0) {
        return knownDestinationPhotos.get(k)!;
      }
    }
    return [];
  };

  // Structured known photo sources with package & blog metadata for human-readable reasons
  const allKnownPhotoSources = useMemo<KnownBlogPhotoSource[]>(() => {
    const sources: KnownBlogPhotoSource[] = [];
    const seenUrls = new Set<string>();

    // 1. From package listings itinerary days
    allListings.forEach((pkg: any) => {
      if (!pkg) return;
      if (Array.isArray(pkg.itinerary)) {
        pkg.itinerary.forEach((day: any, idx: number) => {
          const urls: string[] = Array.isArray(day.imageUrls)
            ? day.imageUrls.filter(Boolean)
            : day.imageUrl
            ? [day.imageUrl]
            : [];
          if (urls.length > 0 && day.placeName) {
            const firstUrl = urls[0];
            if (!seenUrls.has(firstUrl)) {
              seenUrls.add(firstUrl);
              sources.push({
                urls,
                placeName: day.placeName,
                sourceTitle: pkg.title || 'Package Itinerary',
                sourceId: pkg.id,
                dayNumber: day.dayNumber || idx + 1,
                destination: pkg.destination || '',
                sourceType: 'itinerary'
              });
            }
          }
        });
      }

      // 2. From package listings placesCovered
      if (Array.isArray(pkg.placesCovered)) {
        pkg.placesCovered.forEach((place: any) => {
          const urls: string[] = Array.isArray(place.imageUrls)
            ? place.imageUrls.filter(Boolean)
            : place.imageUrl
            ? [place.imageUrl]
            : [];
          if (urls.length > 0 && place.name) {
            const firstUrl = urls[0];
            if (!seenUrls.has(firstUrl)) {
              seenUrls.add(firstUrl);
              sources.push({
                urls,
                placeName: place.name,
                sourceTitle: pkg.title || 'Package Highlight',
                sourceId: pkg.id,
                destination: pkg.destination || '',
                sourceType: 'placesCovered'
              });
            }
          }
        });
      }
    });

    // 3. From other existing blogs with cover photos
    blogs.forEach((b: BlogItem) => {
      if (b.hasPhoto && b.coverImage && b.coverImage.trim()) {
        const firstUrl = b.coverImage.trim();
        if (!seenUrls.has(firstUrl)) {
          seenUrls.add(firstUrl);
          const topPlace = (b.photoPlaces && b.photoPlaces.length > 0) ? b.photoPlaces[0] : b.title;
          sources.push({
            urls: [firstUrl],
            placeName: topPlace,
            sourceTitle: b.title,
            sourceId: b.id,
            sourceType: 'blog'
          });
        }
      }
    });

    return sources;
  }, [allListings, blogs]);

  // Database repeated photo auto-fill candidates with exact match reasoning
  const dbAutoFillCandidates = useMemo<BlogAutoFillCandidate[]>(() => {
    const candidates: BlogAutoFillCandidate[] = [];

    blogs.forEach(b => {
      if (b.hasPhoto) return;

      const blogTopics = extractBlogTopics(b);
      const aiPlaces = Array.isArray(b.photoPlaces) ? b.photoPlaces : [];
      const titleExtracted = extractPlacesFromTitle(b.title, b.category);

      let bestMatch: {
        source: KnownBlogPhotoSource;
        matchedTopic: string;
        matchType: 'exact' | 'landmark' | 'cleaned' | 'split' | 'topic';
        matchReason: string;
      } | null = null;

      const formatSourceDesc = (s: KnownBlogPhotoSource) => {
        if (s.sourceType === 'itinerary') {
          return `package "${s.sourceTitle}" (Day ${s.dayNumber}: ${s.placeName})`;
        } else if (s.sourceType === 'placesCovered') {
          return `package highlight "${s.placeName}" in "${s.sourceTitle}"`;
        } else {
          return `blog "${s.sourceTitle}"`;
        }
      };

      // 1. Check AI-extracted photoPlaces (highest precision)
      if (aiPlaces.length > 0) {
        for (const place of aiPlaces) {
          const placeLower = place.toLowerCase().trim();
          const placeClean = cleanPlaceQuery(place).toLowerCase().trim();

          for (const s of allKnownPhotoSources) {
            const sNameLower = s.placeName.toLowerCase().trim();
            const sClean = cleanPlaceQuery(s.placeName).toLowerCase().trim();

            if (sNameLower === placeLower) {
              bestMatch = {
                source: s,
                matchedTopic: place,
                matchType: 'exact',
                matchReason: `AI landmark "${place}" matches exact place name in ${formatSourceDesc(s)}`
              };
              break;
            }

            if (!bestMatch && placeClean.length > 2 && sClean === placeClean) {
              bestMatch = {
                source: s,
                matchedTopic: place,
                matchType: 'cleaned',
                matchReason: `AI landmark "${place}" matches "${s.placeName}" in ${formatSourceDesc(s)}`
              };
              break;
            }
          }
          if (bestMatch) break;
        }
      }

      // 2. Check extracted topics (destination keywords & title entities)
      if (!bestMatch && blogTopics.length > 0) {
        for (const t of blogTopics) {
          const tLower = t.query.toLowerCase().trim();
          const tClean = cleanPlaceQuery(t.query).toLowerCase().trim();

          for (const s of allKnownPhotoSources) {
            const sNameLower = s.placeName.toLowerCase().trim();
            const sClean = cleanPlaceQuery(s.placeName).toLowerCase().trim();

            if (sNameLower === tLower) {
              bestMatch = {
                source: s,
                matchedTopic: t.name,
                matchType: 'exact',
                matchReason: `Topic "${t.name}" matches exact place name in ${formatSourceDesc(s)}`
              };
              break;
            }

            if (tClean.length > 2 && sClean === tClean) {
              bestMatch = {
                source: s,
                matchedTopic: t.name,
                matchType: 'cleaned',
                matchReason: `Topic "${t.name}" matches place "${s.placeName}" in ${formatSourceDesc(s)}`
              };
              break;
            }
          }
          if (bestMatch) break;
        }
      }

      // 3. Substring / sub-location matching
      if (!bestMatch) {
        const searchTargets = [
          ...aiPlaces.map(p => ({ text: cleanPlaceQuery(p).toLowerCase().trim(), orig: p, isAi: true })),
          ...blogTopics.map(t => ({ text: cleanPlaceQuery(t.query).toLowerCase().trim(), orig: t.name, isAi: false })),
          ...titleExtracted.map(p => ({ text: cleanPlaceQuery(p).toLowerCase().trim(), orig: p, isAi: false }))
        ].filter(item => item.text.length > 2);

        for (const target of searchTargets) {
          for (const s of allKnownPhotoSources) {
            const sClean = cleanPlaceQuery(s.placeName).toLowerCase().trim();
            if (sClean.length > 2 && (sClean.includes(target.text) || target.text.includes(sClean))) {
              bestMatch = {
                source: s,
                matchedTopic: target.orig,
                matchType: target.isAi ? 'landmark' : 'split',
                matchReason: `${target.isAi ? 'AI landmark' : 'Location'} "${target.orig}" matches photo for "${s.placeName}" in ${formatSourceDesc(s)}`
              };
              break;
            }
          }
          if (bestMatch) break;
        }
      }

      // 4. Fallback to existing knownDestinationPhotos map if found
      if (!bestMatch) {
        const known = findKnownBlogPhotos(b, blogTopics);
        if (known.length > 0) {
          const matchedUrl = known[0];
          const matchedSource = allKnownPhotoSources.find(s => s.urls.includes(matchedUrl));
          const topTopic = blogTopics[0]?.name || b.title;
          if (matchedSource) {
            bestMatch = {
              source: matchedSource,
              matchedTopic: topTopic,
              matchType: 'topic',
              matchReason: `Matches known destination photo from ${formatSourceDesc(matchedSource)}`
            };
          } else {
            bestMatch = {
              source: {
                urls: [matchedUrl],
                placeName: topTopic,
                sourceTitle: 'Database Photo Archive',
                sourceId: 'archive',
                sourceType: 'blog'
              },
              matchedTopic: topTopic,
              matchType: 'topic',
              matchReason: `Matches known destination photo in database`
            };
          }
        }
      }

      if (bestMatch && bestMatch.source.urls.length > 0) {
        const primaryUrl = bestMatch.source.urls[0];
        candidates.push({
          id: b.id,
          targetBlogId: b.id,
          targetBlogTitle: b.title,
          targetBlogSlug: b.slug,
          targetCategory: b.category,
          targetMatchedTopic: bestMatch.matchedTopic,

          proposedUrls: bestMatch.source.urls,
          primaryImageUrl: primaryUrl,
          imageTitle: extractImageTitleFromUrl(primaryUrl),

          sourcePlaceName: bestMatch.source.placeName,
          sourceTitle: bestMatch.source.sourceTitle,
          sourceId: bestMatch.source.sourceId,
          sourceDayNumber: bestMatch.source.dayNumber,
          sourceType: bestMatch.source.sourceType,
          matchType: bestMatch.matchType,
          matchReason: bestMatch.matchReason
        });
      }
    });

    return candidates;
  }, [blogs, allKnownPhotoSources, knownDestinationPhotos]);

  // Combined Auto-Fill Candidates (Repeated DB photos + Verified AI Web Search photos)
  const autoFillCandidates = useMemo<BlogAutoFillCandidate[]>(() => {
    const map = new Map<string, BlogAutoFillCandidate>();

    // 1. Add candidates from package itineraries and repeated blog photos
    dbAutoFillCandidates.forEach(cand => {
      map.set(cand.id, cand);
    });

    // 2. Add or prioritize verified AI Web Search candidates (with exact landmark context)
    aiWebCandidates.forEach((cand, blogId) => {
      const blog = blogs.find(b => b.id === blogId);
      if (blog && !blog.hasPhoto) {
        map.set(blogId, cand);
      }
    });

    return Array.from(map.values());
  }, [dbAutoFillCandidates, aiWebCandidates, blogs]);

  // Revertible blogs: blogs that have auto-filled repeated photos OR duplicate shared cover photos
  const revertibleBlogs = useMemo<BlogAutoFillRevertEntry[]>(() => {
    let storedIds: string[] = [];
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('tripdm_blog_autofill_revert_ids') : null;
      if (raw) storedIds = JSON.parse(raw);
    } catch (e) {}

    // Map of clean URLs to usages to detect duplicate photo assignments
    const urlUsageMap = new Map<string, Array<BlogItem>>();
    blogs.forEach(b => {
      if (!b.coverImage) return;
      const clean = b.coverImage.split('?')[0];
      if (!urlUsageMap.has(clean)) urlUsageMap.set(clean, []);
      urlUsageMap.get(clean)!.push(b);
    });

    const entries: BlogAutoFillRevertEntry[] = [];
    const seen = new Set<string>();

    blogs.forEach(b => {
      if (!b.hasPhoto || !b.coverImage) return;
      const clean = b.coverImage.split('?')[0];
      const duplicateUsages = urlUsageMap.get(clean) || [];
      const isDuplicateUsage = duplicateUsages.length > 1;
      const isMarked = b.autoFilledRepeated || storedIds.includes(b.id);

      if ((isMarked || isDuplicateUsage) && !seen.has(b.id)) {
        seen.add(b.id);
        entries.push({
          id: b.id,
          blogId: b.id,
          blogTitle: b.title,
          blogSlug: b.slug,
          category: b.category,
          imageUrl: b.coverImage,
          autoFilledAt: b.autoFilledAt,
          sourcePlaceName: b.autoFilledSource || (isDuplicateUsage ? `Duplicate shared across ${duplicateUsages.length} blogs` : undefined)
        });
      }
    });

    return entries;
  }, [blogs]);

  // Filtered candidate list for Auto-Fill Review Modal
  const filteredCandidates = useMemo(() => {
    if (!autoFillModalSearch.trim()) return autoFillCandidates;
    const q = autoFillModalSearch.toLowerCase().trim();
    return autoFillCandidates.filter(c =>
      c.targetBlogTitle.toLowerCase().includes(q) ||
      (c.targetCategory && c.targetCategory.toLowerCase().includes(q)) ||
      c.targetBlogSlug.toLowerCase().includes(q) ||
      c.sourcePlaceName.toLowerCase().includes(q) ||
      c.sourceTitle.toLowerCase().includes(q) ||
      c.matchReason.toLowerCase().includes(q)
    );
  }, [autoFillCandidates, autoFillModalSearch]);

  // Filtered revert list for Revert Modal
  const filteredRevertBlogs = useMemo(() => {
    if (!revertModalSearch.trim()) return revertibleBlogs;
    const q = revertModalSearch.toLowerCase().trim();
    return revertibleBlogs.filter(r =>
      r.blogTitle.toLowerCase().includes(q) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      r.blogSlug.toLowerCase().includes(q) ||
      (r.sourcePlaceName && r.sourcePlaceName.toLowerCase().includes(q))
    );
  }, [revertibleBlogs, revertModalSearch]);

  // Statistics & Fillable Count for repeated blogs
  const stats = useMemo(() => {
    const totalBlogs = blogs.length;
    const missingPhotos = blogs.filter(b => !b.hasPhoto).length;
    const completedPhotos = totalBlogs - missingPhotos;
    const publishedCount = blogs.filter(b => b.published).length;
    const draftCount = totalBlogs - publishedCount;
    const coveragePercent = totalBlogs > 0 ? Math.round((completedPhotos / totalBlogs) * 100) : 100;
    const unanalyzedCount = blogs.filter(b => !b.photoPlaces || b.photoPlaces.length === 0).length;

    // Count how many missing can be auto-filled immediately from repeated photos
    const repeatedFillableCount = autoFillCandidates.length;

    return {
      totalBlogs,
      missingPhotos,
      completedPhotos,
      publishedCount,
      draftCount,
      coveragePercent,
      unanalyzedCount,
      repeatedFillableCount,
      autoFillableCount: repeatedFillableCount
    };
  }, [blogs, autoFillCandidates]);

  // Categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    blogs.forEach(b => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set).sort();
  }, [blogs]);

  // Filtered Blogs
  const filteredBlogs = useMemo(() => {
    return blogs.filter(blog => {
      if (activeTab === 'missing' && blog.hasPhoto) return false;
      if (activeTab === 'completed' && !blog.hasPhoto) return false;
      if (activeTab === 'drafts' && blog.published) return false;
      if (activeTab === 'unanalyzed' && (blog.photoPlaces?.length ?? 0) > 0) return false;

      if (selectedCategory !== 'all' && blog.category !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = blog.title.toLowerCase().includes(q);
        const matchesSlug = blog.slug.toLowerCase().includes(q);
        const matchesCat = (blog.category || '').toLowerCase().includes(q);
        const matchesExcerpt = (blog.excerpt || '').toLowerCase().includes(q);
        const matchesTags = (blog.tags || []).some(t => t.toLowerCase().includes(q));
        const matchesPlaces = (blog.photoPlaces || []).some(p => p.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSlug && !matchesCat && !matchesExcerpt && !matchesTags && !matchesPlaces) {
          return false;
        }
      }

      return true;
    });
  }, [blogs, activeTab, selectedCategory, searchQuery]);

  // Grouped by Category
  const groupedByCategory = useMemo(() => {
    const groups: { [cat: string]: BlogItem[] } = {};
    filteredBlogs.forEach(b => {
      const cat = b.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    });
    return Object.entries(groups).map(([category, items]) => ({
      category,
      items
    }));
  }, [filteredBlogs]);

  // Open Modal for Blog Photo
  const handleOpenPhotoSelector = async (blog: BlogItem) => {
    setActiveBlog(blog);
    setWikiResults([]);
    setManualImageUrl('');

    let topics = extractBlogTopics(blog);
    setExtractedTopics(topics);

    // Initial selected photo
    let initialSelected: WikimediaImageResult | null = null;
    if (blog.coverImage && blog.coverImage.trim()) {
      initialSelected = {
        id: `current-${blog.id}`,
        title: blog.title,
        thumbUrl: blog.coverImage,
        fullUrl: blog.coverImage,
        width: 1200,
        height: 675,
        source: 'Wikimedia Commons',
        license: 'Current Cover Photo'
      };
    }

    setSelectedImage(initialSelected);

    // If blog has no photoPlaces extracted yet, trigger fast on-demand AI analysis
    if (!blog.photoPlaces || blog.photoPlaces.length === 0) {
      triggerOnDemandAIAnalysis(blog, initialSelected !== null);
    } else {
      const initialQuery = topics[0]?.query || cleanPlaceQuery(blog.title);
      setCustomSearchQuery(initialQuery);
      setActiveTopicQuery(initialQuery);
      await performSearch(initialQuery, initialSelected !== null);
    }
  };

  // Trigger On-Demand AI Location Analysis for Single Blog
  const triggerOnDemandAIAnalysis = async (blog: BlogItem, hasPreselected: boolean) => {
    setIsAnalyzingSingle(true);
    try {
      const res = await fetch('/api/admin/blogs/analyze-photo-places/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: blog.id,
          title: blog.title,
          excerpt: blog.excerpt,
          content: blog.content,
          category: blog.category
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.photoPlaces) && data.photoPlaces.length > 0) {
          const db = getDbInstance();
          if (db) {
            const now = new Date().toISOString();
            updateDoc(doc(db, 'blogs', blog.id), {
              photoPlaces: data.photoPlaces,
              updatedAt: now
            }).catch(e => console.warn('Firestore updateDoc error:', e));
          }

          const updatedBlog: BlogItem = {
            ...blog,
            photoPlaces: data.photoPlaces
          };

          // Update local blogs state
          setBlogs(prev => prev.map(b => (b.id === blog.id ? updatedBlog : b)));
          setActiveBlog(updatedBlog);

          const newTopics = extractBlogTopics(updatedBlog);
          setExtractedTopics(newTopics);

          const bestQuery = newTopics[0]?.query || data.photoPlaces[0];
          setCustomSearchQuery(bestQuery);
          setActiveTopicQuery(bestQuery);

          showToast(`⚡ AI extracted ${data.photoPlaces.length} photogenic places!`, 'success');
          await performSearch(bestQuery, hasPreselected);
          return;
        }
      }
    } catch (err) {
      console.warn('AI analysis error:', err);
    } finally {
      setIsAnalyzingSingle(false);
    }

    // Fallback to local topics
    const fallbackTopics = extractBlogTopics(blog);
    const fallbackQuery = fallbackTopics[0]?.query || cleanPlaceQuery(blog.title);
    setCustomSearchQuery(fallbackQuery);
    setActiveTopicQuery(fallbackQuery);
    await performSearch(fallbackQuery, hasPreselected);
  };

  // Perform search across Wikimedia Commons, Wikipedia Lead & Flickr
  const performSearch = async (queryText: string, hasPreselected: boolean = false) => {
    if (!queryText.trim()) return;

    setIsSearchingWiki(true);
    try {
      const results = await searchWikimediaImages(queryText, {
        limit: 30,
        width: 1200,
        includeWikipediaLead: true,
        includeFlickr: true,
        sourceFilter: sourceFilter
      });

      setWikiResults(results);
    } catch (err: any) {
      console.error('Search error:', err);
      showToast('Error searching images. Please try another query keyword.', 'error');
    } finally {
      setIsSearchingWiki(false);
    }
  };

  // Switch Active Topic Chip
  const handleSelectTopic = (topic: { name: string; query: string }) => {
    setActiveTopicQuery(topic.query);
    setCustomSearchQuery(topic.query);
    performSearch(topic.query, selectedImage !== null);
  };

  // Save Selected Cover Photo
  const handleSavePhoto = async (autoAdvance: boolean = false) => {
    if (!activeBlog) return;

    const photoUrl = manualImageUrl.trim() || selectedImage?.fullUrl || selectedImage?.thumbUrl || '';

    if (!photoUrl) {
      showToast('Please select or paste an image before saving.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const db = getDbInstance();
      const now = new Date().toISOString();

      if (db) {
        await updateDoc(doc(db, 'blogs', activeBlog.id), {
          coverImage: photoUrl,
          ...(activeBlog.photoPlaces ? { photoPlaces: activeBlog.photoPlaces } : {}),
          updatedAt: now
        });
      }

      fetch('/api/admin/blogs/update-photo/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: activeBlog.id,
          coverImage: photoUrl
        })
      }).catch(e => console.warn('Server API update-photo background error:', e));

      const updatedBlog: BlogItem = {
        ...activeBlog,
        coverImage: photoUrl,
        hasPhoto: true,
        updatedAt: now
      };

      setBlogs(prev => prev.map(b => (b.id === activeBlog.id ? updatedBlog : b)));

      if (onBlogUpdated) {
        onBlogUpdated(updatedBlog);
      }

      showToast(`Saved cover photo for: "${activeBlog.title.slice(0, 40)}..."`, 'success');

      if (autoAdvance) {
        const nextMissing = blogs.find(b => !b.hasPhoto && b.id !== activeBlog.id);
        if (nextMissing) {
          handleOpenPhotoSelector(nextMissing);
          return;
        } else {
          showToast('🎉 All blogs now have cover photos!', 'success');
          setActiveBlog(null);
        }
      } else {
        setActiveBlog(null);
      }
    } catch (err: any) {
      console.error('Error saving blog photo:', err);
      showToast('Failed to save photo. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove Cover Photo
  const handleRemovePhoto = async (blog: BlogItem) => {
    if (!confirm(`Are you sure you want to remove the cover photo for "${blog.title}"?`)) return;

    try {
      const db = getDbInstance();
      const now = new Date().toISOString();

      if (db) {
        await updateDoc(doc(db, 'blogs', blog.id), {
          coverImage: '',
          updatedAt: now
        });
      }

      fetch('/api/admin/blogs/update-photo/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: blog.id,
          coverImage: ''
        })
      }).catch(e => console.warn(e));

      const updatedBlog: BlogItem = {
        ...blog,
        coverImage: '',
        hasPhoto: false,
        updatedAt: now
      };

      setBlogs(prev => prev.map(b => (b.id === blog.id ? updatedBlog : b)));
      if (onBlogUpdated) onBlogUpdated(updatedBlog);

      showToast(`Removed cover photo for: "${blog.title.slice(0, 35)}..."`, 'info');
      if (activeBlog?.id === blog.id) {
        setSelectedImage(null);
      }
    } catch (err: any) {
      console.error('Error removing photo:', err);
      showToast('Failed to remove photo.', 'error');
    }
  };

  // ─── AI LANDMARK EXTRACTION & WEB SEARCH ENGINE ───

  // Search web for verified landmark photos using Wikimedia Commons, Wikipedia & Flickr
  const searchWebPhotosForLandmark = async (
    landmark: string,
    detailedQuery?: string,
    categoryHint?: string
  ): Promise<WikimediaImageResult[]> => {
    const searchAttempts: string[] = [];

    if (detailedQuery && detailedQuery.trim()) {
      searchAttempts.push(detailedQuery.trim());
    }
    if (landmark && landmark.trim() && !searchAttempts.includes(landmark.trim())) {
      searchAttempts.push(landmark.trim());
    }
    if (categoryHint && landmark && !searchAttempts.includes(`${landmark} ${categoryHint}`.trim())) {
      searchAttempts.push(`${landmark} ${categoryHint}`.trim());
    }

    for (const q of searchAttempts) {
      try {
        const results = await searchWikimediaImages(q, {
          limit: 12,
          width: 1200,
          includeWikipediaLead: true,
          includeFlickr: true
        });
        if (results && results.length > 0) {
          return results;
        }
      } catch (e) {
        console.warn(`Web search failed for query "${q}":`, e);
      }
    }

    return [];
  };

  // 1. Get exact landmark place name using AI -> 2. Search web -> 3. Return AutoFill candidate
  const fetchAiPlaceAndWebPhoto = async (blog: BlogItem): Promise<BlogAutoFillCandidate | null> => {
    let landmarkName = '';
    let landmarkQuery = '';

    // Step 1: Extract exact physical landmark places using AI
    if (Array.isArray(blog.photoPlaces) && blog.photoPlaces.length > 0) {
      landmarkName = blog.photoPlaces[0];
      landmarkQuery = landmarkName;
    } else {
      try {
        const res = await fetch('/api/admin/blogs/analyze-photo-places/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blogId: blog.id,
            title: blog.title,
            excerpt: blog.excerpt,
            content: blog.content,
            category: blog.category
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.detailedPlaces) && data.detailedPlaces.length > 0) {
            landmarkName = data.detailedPlaces[0].name || data.detailedPlaces[0].query;
            landmarkQuery = data.detailedPlaces[0].query || landmarkName;
          } else if (Array.isArray(data.photoPlaces) && data.photoPlaces.length > 0) {
            landmarkName = data.photoPlaces[0];
            landmarkQuery = landmarkName;
          }

          // Persist the extracted places to blog state and Firestore
          if (Array.isArray(data.photoPlaces) && data.photoPlaces.length > 0) {
            const db = getDbInstance();
            if (db) {
              updateDoc(doc(db, 'blogs', blog.id), {
                photoPlaces: data.photoPlaces,
                updatedAt: new Date().toISOString()
              }).catch(e => console.warn('Firestore updateDoc photoPlaces error:', e));
            }
            setBlogs(prev => prev.map(b => (b.id === blog.id ? { ...b, photoPlaces: data.photoPlaces } : b)));
          }
        }
      } catch (err) {
        console.warn('AI place extraction error for blog:', blog.title, err);
      }
    }

    // Heuristic fallback if AI returned empty or is unavailable
    if (!landmarkName) {
      const extracted = extractPlacesFromTitle(blog.title, blog.category);
      if (extracted.length > 0) {
        landmarkName = extracted[0];
        landmarkQuery = extracted[0];
      } else {
        landmarkName = cleanPlaceQuery(blog.title);
        landmarkQuery = landmarkName;
      }
    }

    if (!landmarkName || landmarkName.trim().length < 2) return null;

    // Step 2: Search web for verified photos of this exact landmark
    const webResults = await searchWebPhotosForLandmark(landmarkName, landmarkQuery, blog.category);
    if (webResults.length === 0) return null;

    const bestImg = webResults[0];
    const primaryUrl = bestImg.fullUrl || bestImg.thumbUrl;

    // Step 3: Return BlogAutoFillCandidate with exact AI context
    return {
      id: blog.id,
      targetBlogId: blog.id,
      targetBlogTitle: blog.title,
      targetBlogSlug: blog.slug,
      targetCategory: blog.category,
      targetMatchedTopic: landmarkName,
      proposedUrls: webResults.map(r => r.fullUrl || r.thumbUrl).filter(Boolean),
      primaryImageUrl: primaryUrl,
      imageTitle: bestImg.title || extractImageTitleFromUrl(primaryUrl),
      sourcePlaceName: landmarkName,
      sourceTitle: `Web Search (${bestImg.source})`,
      sourceId: `web_${blog.id}_${bestImg.id || 'photo'}`,
      sourceType: 'ai_web_search',
      matchType: 'landmark',
      matchReason: `AI identified exact landmark "${landmarkName}" → Fetched verified photo from ${bestImg.source}`
    };
  };

  // Switch selected photo for a candidate in the Auto-Fill Review modal
  const handleSwitchCandidateImage = (candId: string, newUrl: string) => {
    setAiWebCandidates(prev => {
      const next = new Map(prev);
      const existing = next.get(candId);
      if (existing) {
        next.set(candId, {
          ...existing,
          primaryImageUrl: newUrl,
          imageTitle: extractImageTitleFromUrl(newUrl)
        });
      } else {
        const dbCand = dbAutoFillCandidates.find(c => c.id === candId);
        if (dbCand) {
          next.set(candId, {
            ...dbCand,
            primaryImageUrl: newUrl,
            imageTitle: extractImageTitleFromUrl(newUrl)
          });
        }
      }
      return next;
    });
  };

  // Run Batch AI Landmark Extraction + Web Photo Search
  const handleRunAiWebAutoFill = async (targetBlogIds?: string[]) => {
    const missingBlogs = targetBlogIds
      ? blogs.filter(b => targetBlogIds.includes(b.id) && !b.hasPhoto)
      : blogs.filter(b => !b.hasPhoto);

    if (missingBlogs.length === 0) {
      showToast('All target blogs already have cover photos!', 'info');
      return;
    }

    setIsAiWebSearching(true);
    aiSearchCancelRef.current = false;
    setAiSearchProgress({
      current: 0,
      total: missingBlogs.length,
      blogTitle: missingBlogs[0].title,
      foundCount: 0
    });

    let foundCount = 0;
    const newCandidatesMap = new Map<string, BlogAutoFillCandidate>();

    // Process in concurrent chunks of 3 for high speed and rate limit safety
    const BATCH_SIZE = 3;
    for (let i = 0; i < missingBlogs.length; i += BATCH_SIZE) {
      if (aiSearchCancelRef.current) {
        showToast('AI Web Auto-Fill cancelled.', 'info');
        break;
      }

      const batch = missingBlogs.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (blog, bIdx) => {
          const overallIndex = i + bIdx;
          setAiSearchProgress(prev => ({
            ...prev,
            current: overallIndex + 1,
            blogTitle: blog.title
          }));

          try {
            const cand = await fetchAiPlaceAndWebPhoto(blog);
            if (cand) {
              setAiSearchProgress(prev => ({
                ...prev,
                landmark: cand.sourcePlaceName
              }));
              return cand;
            }
          } catch (err) {
            console.warn(`Error finding AI photo for "${blog.title}":`, err);
          }
          return null;
        })
      );

      batchResults.forEach(cand => {
        if (cand) {
          newCandidatesMap.set(cand.id, cand);
          foundCount++;
          setAiSearchProgress(prev => ({ ...prev, foundCount }));
        }
      });
    }

    if (newCandidatesMap.size > 0) {
      setAiWebCandidates(prev => {
        const next = new Map(prev);
        newCandidatesMap.forEach((c, k) => next.set(k, c));
        return next;
      });

      // Pre-select the newly found candidates
      setSelectedCandidateIds(prev => {
        const next = new Set(prev);
        newCandidatesMap.forEach((_, id) => next.add(id));
        return next;
      });

      setIsAiWebSearching(false);
      setIsAutoFillReviewOpen(true);
      showToast(`🎉 AI found verified web photos for ${foundCount} blogs! Review and click Done.`, 'success');
    } else {
      setIsAiWebSearching(false);
      showToast('No web photos could be verified for these blogs. Try manual search.', 'info');
    }
  };

  // Run AI Place Extraction + Web Search for Single Blog
  const handleRunSingleBlogAiWebAutoFill = async (blog: BlogItem) => {
    setIsFindingSingleAiPhoto(blog.id);
    try {
      const cand = await fetchAiPlaceAndWebPhoto(blog);
      if (cand) {
        setAiWebCandidates(prev => new Map(prev).set(cand.id, cand));
        setSelectedCandidateIds(new Set([cand.id]));
        setAutoFillModalSearch('');
        setIsAutoFillReviewOpen(true);
        showToast(`✨ AI identified "${cand.sourcePlaceName}" and found verified photo from ${cand.sourceTitle}!`, 'success');
      } else {
        showToast(`Could not find a verified web photo for "${blog.title}". Opening manual search...`, 'info');
        handleOpenPhotoSelector(blog);
      }
    } catch (e: any) {
      console.error('Error finding single AI photo:', e);
      showToast('Failed to find photo with AI.', 'error');
    } finally {
      setIsFindingSingleAiPhoto(null);
    }
  };

  const handleCancelAiWebSearch = () => {
    aiSearchCancelRef.current = true;
    setIsAiWebSearching(false);
  };

  // Open the Auto-Fill Review Modal
  const handleOpenAutoFillReview = (targetBlogId?: string) => {
    if (targetBlogId) {
      setSelectedCandidateIds(new Set([targetBlogId]));
    } else {
      setSelectedCandidateIds(new Set(autoFillCandidates.map(c => c.id)));
    }
    setAutoFillModalSearch('');
    setIsAutoFillReviewOpen(true);
  };

  // Toggle selection for an individual candidate in the review modal
  const handleToggleCandidate = (id: string) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all visible candidates
  const handleSelectAllCandidates = (list: BlogAutoFillCandidate[]) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      list.forEach(c => next.add(c.id));
      return next;
    });
  };

  // Deselect all visible candidates
  const handleDeselectAllCandidates = (list: BlogAutoFillCandidate[]) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      list.forEach(c => next.delete(c.id));
      return next;
    });
  };

  // Execute Auto-Fill for the user-selected repeated blogs (triggered by "Done" button)
  const handleExecuteAutoFill = async () => {
    const candidatesToApply = autoFillCandidates.filter(c => selectedCandidateIds.has(c.id));
    if (candidatesToApply.length === 0) {
      showToast('Please select at least one blog to auto-fill.', 'info');
      return;
    }

    setIsAutoFillingRepeated(true);
    try {
      const db = getDbInstance();
      const now = new Date().toISOString();
      const updatedBlogs = [...blogs];
      let totalFilled = 0;

      for (const cand of candidatesToApply) {
        const blogIndex = updatedBlogs.findIndex(b => b.id === cand.id);
        if (blogIndex === -1) continue;

        const sourceDesc = cand.sourceType === 'itinerary'
          ? `${cand.sourceTitle} (Day ${cand.sourceDayNumber}: ${cand.sourcePlaceName})`
          : cand.sourceType === 'placesCovered'
          ? `${cand.sourceTitle} - ${cand.sourcePlaceName}`
          : cand.sourceType === 'ai_web_search'
          ? `${cand.sourceTitle}: ${cand.sourcePlaceName}`
          : cand.sourceTitle;

        const preservedPlaces = updatedBlogs[blogIndex].photoPlaces && updatedBlogs[blogIndex].photoPlaces!.length > 0
          ? updatedBlogs[blogIndex].photoPlaces
          : (cand.sourcePlaceName ? [cand.sourcePlaceName] : []);

        const updatedBlog: BlogItem = {
          ...updatedBlogs[blogIndex],
          coverImage: cand.primaryImageUrl,
          hasPhoto: true,
          photoPlaces: preservedPlaces,
          autoFilledRepeated: true,
          autoFilledAt: Date.now(),
          autoFilledSource: sourceDesc,
          updatedAt: now
        };

        if (db) {
          await updateDoc(doc(db, 'blogs', cand.id), {
            coverImage: cand.primaryImageUrl,
            photoPlaces: preservedPlaces,
            autoFilledRepeated: true,
            autoFilledAt: Date.now(),
            autoFilledSource: sourceDesc,
            updatedAt: now
          });
        }

        updatedBlogs[blogIndex] = updatedBlog;
        if (onBlogUpdated) {
          onBlogUpdated(updatedBlog);
        }
        totalFilled++;
      }

      // Clean up applied items from aiWebCandidates map
      setAiWebCandidates(prev => {
        const next = new Map(prev);
        candidatesToApply.forEach(c => next.delete(c.id));
        return next;
      });

      // Store applied IDs in localStorage so user can revert even after refresh
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('tripdm_blog_autofill_revert_ids') : null;
        const prev: string[] = raw ? JSON.parse(raw) : [];
        const newIds = Array.from(new Set([...prev, ...candidatesToApply.map(c => c.id)]));
        localStorage.setItem('tripdm_blog_autofill_revert_ids', JSON.stringify(newIds));
      } catch (e) {}

      setBlogs(updatedBlogs);
      setIsAutoFillReviewOpen(false);
      showToast(`🎉 Successfully auto-filled cover photos for ${totalFilled} blogs!`, 'success');
    } catch (err: any) {
      console.error('Error auto-filling repeated blogs:', err);
      showToast('Failed to auto-fill repeated blogs. Please try again.', 'error');
    } finally {
      setIsAutoFillingRepeated(false);
    }
  };

  // Open the Revert Modal
  const handleOpenRevertModal = (singleTargetId?: string) => {
    if (singleTargetId) {
      setSelectedRevertIds(new Set([singleTargetId]));
    } else {
      setSelectedRevertIds(new Set(revertibleBlogs.map(r => r.id)));
    }
    setRevertModalSearch('');
    setIsRevertModalOpen(true);
  };

  // Toggle selection for an individual item in the revert modal
  const handleToggleRevertItem = (id: string) => {
    setSelectedRevertIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all visible revert items
  const handleSelectAllRevert = (list: BlogAutoFillRevertEntry[]) => {
    setSelectedRevertIds(prev => {
      const next = new Set(prev);
      list.forEach(r => next.add(r.id));
      return next;
    });
  };

  // Deselect all visible revert items
  const handleDeselectAllRevert = (list: BlogAutoFillRevertEntry[]) => {
    setSelectedRevertIds(prev => {
      const next = new Set(prev);
      list.forEach(r => next.delete(r.id));
      return next;
    });
  };

  // Execute Revert for the user-selected auto-filled blogs
  const handleExecuteRevert = async () => {
    const itemsToRevert = revertibleBlogs.filter(item => selectedRevertIds.has(item.id));
    if (itemsToRevert.length === 0) {
      showToast('Please select at least one blog to revert.', 'info');
      return;
    }

    setIsReverting(true);
    try {
      const db = getDbInstance();
      const now = new Date().toISOString();
      const updatedBlogs = [...blogs];
      let totalReverted = 0;

      for (const item of itemsToRevert) {
        const blogIndex = updatedBlogs.findIndex(b => b.id === item.id);
        if (blogIndex === -1) continue;

        const currentBlog = { ...updatedBlogs[blogIndex] };
        delete currentBlog.autoFilledRepeated;
        delete currentBlog.autoFilledAt;
        delete currentBlog.autoFilledSource;
        currentBlog.coverImage = '';
        currentBlog.hasPhoto = false;
        currentBlog.updatedAt = now;

        if (db) {
          await updateDoc(doc(db, 'blogs', item.id), {
            coverImage: '',
            autoFilledRepeated: false,
            autoFilledAt: null,
            autoFilledSource: null,
            updatedAt: now
          });
        }

        updatedBlogs[blogIndex] = currentBlog;
        if (onBlogUpdated) {
          onBlogUpdated(currentBlog);
        }
        totalReverted++;
      }

      // Remove reverted IDs from localStorage
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('tripdm_blog_autofill_revert_ids') : null;
        if (raw) {
          const prev: string[] = JSON.parse(raw);
          const remaining = prev.filter(id => !selectedRevertIds.has(id));
          localStorage.setItem('tripdm_blog_autofill_revert_ids', JSON.stringify(remaining));
        }
      } catch (e) {}

      setBlogs(updatedBlogs);
      setIsRevertModalOpen(false);
      showToast(`↺ Successfully reverted cover photos for ${totalReverted} blog(s)!`, 'success');
    } catch (err: any) {
      console.error('Error reverting auto-filled blogs:', err);
      showToast('Failed to revert auto-filled blogs. Please try again.', 'error');
    } finally {
      setIsReverting(false);
    }
  };

  // Backwards compatibility aliases
  const handleAutoFillAllRepeatedBlogs = () => handleOpenAutoFillReview();
  const handleAutoFillMatchingBlogs = () => handleOpenAutoFillReview();

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── AI QUEUE PROCESSOR FOR PREVIOUS/EXISTING BLOGS ───
  // ═══════════════════════════════════════════════════════════════════════════

  // Open Queue Modal and initialize items
  const handleOpenQueueModal = (filterMode: 'all' | 'unanalyzed' | 'missingPhotos' = 'all') => {
    let targetBlogs = [...blogs];
    if (filterMode === 'unanalyzed') {
      targetBlogs = blogs.filter(b => !b.photoPlaces || b.photoPlaces.length === 0);
    } else if (filterMode === 'missingPhotos') {
      targetBlogs = blogs.filter(b => !b.hasPhoto);
    }

    const items: QueueItem[] = targetBlogs.map(b => ({
      id: b.id,
      blogId: b.id,
      title: b.title,
      category: b.category || 'Travel Guides',
      status: b.photoPlaces && b.photoPlaces.length > 0 ? 'success' : 'pending',
      extractedPlaces: b.photoPlaces || []
    }));

    setQueueItems(items);
    setQueueRunning(false);
    setQueuePaused(false);
    setQueueCurrentIndex(-1);
    setQueueLogs([]);
    setIsQueueModalOpen(true);
    addQueueLog('info', `📋 Initialized AI location analysis queue with ${items.length} articles.`);
  };

  // Start Queue Processing
  const handleStartQueue = async () => {
    if (queueItems.length === 0) return;

    setQueueRunning(true);
    queueRunningRef.current = true;
    setQueuePaused(false);
    queuePausedRef.current = false;
    addQueueLog('info', `🚀 Starting AI Location Analysis Queue for ${queueItems.length} blogs...`);

    const db = getDbInstance();

    for (let i = 0; i < queueItems.length; i++) {
      if (!queueRunningRef.current) break;

      while (queuePausedRef.current) {
        await new Promise(r => setTimeout(r, 500));
        if (!queueRunningRef.current) break;
      }
      if (!queueRunningRef.current) break;

      const item = queueItems[i];
      // Skip if already successfully analyzed
      if (item.status === 'success' && item.extractedPlaces && item.extractedPlaces.length > 0) {
        continue;
      }

      setQueueCurrentIndex(i);
      setQueueItems(prev =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'analyzing', error: undefined } : it))
      );

      const targetBlog = blogs.find(b => b.id === item.blogId);
      addQueueLog('info', `🤖 [${i + 1}/${queueItems.length}] Analyzing: "${item.title.slice(0, 45)}..."`);

      const startTime = Date.now();
      try {
        const res = await fetch('/api/admin/blogs/analyze-photo-places/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blogId: item.blogId,
            title: targetBlog?.title || item.title,
            excerpt: targetBlog?.excerpt || '',
            content: targetBlog?.content || '',
            category: targetBlog?.category || item.category
          })
        });

        const timeTaken = Math.round((Date.now() - startTime) / 1000);

        if (res.ok) {
          const data = await res.json();
          const places: string[] = data.photoPlaces || [];

          if (places.length > 0) {
            // Write to client Firestore
            if (db) {
              const now = new Date().toISOString();
              updateDoc(doc(db, 'blogs', item.blogId), {
                photoPlaces: places,
                updatedAt: now
              }).catch(e => console.warn('Firestore updateDoc error:', e));
            }

            // Update local blogs state
            setBlogs(prev =>
              prev.map(b => (b.id === item.blogId ? { ...b, photoPlaces: places } : b))
            );

            // Update queue item
            setQueueItems(prev =>
              prev.map((it, idx) =>
                idx === i
                  ? {
                      ...it,
                      status: 'success',
                      extractedPlaces: places,
                      timeTaken
                    }
                  : it
              )
            );

            addQueueLog(
              'success',
              `✅ [${timeTaken}s] "${item.title.slice(0, 35)}..." -> Places: ${places.slice(0, 4).join(', ')}${
                places.length > 4 ? ` (+${places.length - 4})` : ''
              }`
            );
          } else {
            throw new Error('No places returned by AI');
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
      } catch (err: any) {
        const timeTaken = Math.round((Date.now() - startTime) / 1000);
        addQueueLog('error', `❌ Failed "${item.title.slice(0, 35)}...": ${err.message}`);
        setQueueItems(prev =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'failed',
                  error: err.message,
                  timeTaken
                }
              : it
          )
        );
      }

      // Small delay between requests to guard rate limits
      if (i < queueItems.length - 1 && queueRunningRef.current) {
        await new Promise(r => setTimeout(r, queueDelaySeconds * 1000));
      }
    }

    setQueueRunning(false);
    queueRunningRef.current = false;
    setQueueCurrentIndex(-1);
    addQueueLog('success', '🎉 Batch AI location analysis queue finished!');
    showToast('Batch AI Location Analysis complete!', 'success');
  };

  const handlePauseQueue = () => {
    setQueuePaused(p => !p);
    addQueueLog('warn', !queuePaused ? '⏸ Pausing queue processing...' : '▶ Resuming queue processing...');
  };

  const handleStopQueue = () => {
    setQueueRunning(false);
    queueRunningRef.current = false;
    setQueuePaused(false);
    queuePausedRef.current = false;
    addQueueLog('error', '⏹ Queue processing stopped by user.');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── TOAST NOTIFICATION ─── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-white text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-600'
                : toast.type === 'error'
                ? 'bg-red-600'
                : 'bg-indigo-600'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0" />}
            {toast.type === 'info' && <Info className="h-5 w-5 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/80 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── TOP HEADER & ACTIONS ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl shadow-sm">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">Blog Photo Manager</h1>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
                  Wikimedia &amp; AI Place Engine
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                AI analyzes blog content in queue to extract verified landmark names &amp; queries high-res Wikimedia photography
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllBlogs}
            disabled={loading}
            className="flex items-center gap-2 text-gray-700 hover:bg-gray-50 rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {/* AI Queue Analysis Button */}
          <Button
            size="sm"
            onClick={() => handleOpenQueueModal('all')}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 shadow-sm font-semibold rounded-xl"
            title="Analyze all previous blogs in a queue with AI to extract precise tourist landmark place names"
          >
            <Cpu className="h-4 w-4 text-purple-200" />
            <span>Run AI Location Queue ({stats.totalBlogs})</span>
          </Button>

          {/* AI Auto-Fill with Web Search Button */}
          {stats.missingPhotos > 0 && (
            <Button
              size="sm"
              onClick={() => handleRunAiWebAutoFill()}
              disabled={loading || isAiWebSearching || isAutoFillingRepeated}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center gap-2 shadow-sm font-semibold rounded-xl transition-all"
              title="Extract exact landmark places using AI, search Wikimedia/Wikipedia/Flickr on the web, and auto-fill cover photos"
            >
              {isAiWebSearching ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Sparkles className="h-4 w-4 text-purple-200" />
              )}
              <span>AI Auto-Fill (Web Search) ({stats.missingPhotos})</span>
            </Button>
          )}

          {autoFillCandidates.length > 0 && (
            <Button
              size="sm"
              onClick={() => handleOpenAutoFillReview()}
              disabled={loading || isAutoFillingRepeated}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm font-semibold rounded-xl animate-in fade-in"
              title="Review matching photos and auto-fill across blogs"
            >
              {isAutoFillingRepeated ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-200" />
              )}
              <span>Review &amp; Auto-Fill ({autoFillCandidates.length})</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenRevertModal()}
            disabled={loading || isReverting || revertibleBlogs.length === 0}
            className={`border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-2 shadow-xs font-semibold rounded-xl transition-all ${
              revertibleBlogs.length === 0 ? 'opacity-60 cursor-not-allowed' : ''
            }`}
            title="Revert duplicate or auto-filled photos back to missing"
          >
            {isReverting ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
            ) : (
              <RotateCcw className="h-4 w-4 text-amber-700" />
            )}
            <span>Revert Duplicates ({revertibleBlogs.length})</span>
          </Button>

          {stats.missingPhotos > 0 && (
            <Button
              size="sm"
              onClick={() => {
                const firstMissing = blogs.find(b => !b.hasPhoto);
                if (firstMissing) handleOpenPhotoSelector(firstMissing);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center gap-2 shadow-sm rounded-xl font-medium"
            >
              <Sparkles className="h-4 w-4 text-blue-200" />
              <span>Fast Populate</span>
            </Button>
          )}

          <a
            href="/blogtripdm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 rounded-xl transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Blog Admin Hub</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* ─── STATS DASHBOARD ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Articles</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalBlogs}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {stats.publishedCount} Published &bull; {stats.draftCount} Drafts
                </p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Newspaper className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border shadow-sm hover:shadow-md transition-shadow rounded-2xl ${
            stats.missingPhotos > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-gray-200/80'
          }`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Missing Cover Photos</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{stats.missingPhotos}</p>
                <p className="text-xs text-amber-600 mt-0.5">Need photo assignment</p>
              </div>
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">AI Places Analyzed</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {stats.totalBlogs - stats.unanalyzedCount}{' '}
                  <span className="text-sm font-normal text-gray-500">/ {stats.totalBlogs}</span>
                </p>
                <p className="text-xs text-purple-600 mt-0.5">
                  {stats.unanalyzedCount > 0 ? `${stats.unanalyzedCount} need AI analysis` : '100% analyzed!'}
                </p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Zap className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="w-full mr-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Photo Coverage</p>
                  <span className="text-sm font-bold text-indigo-600">{stats.coveragePercent}%</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.completedPhotos} <span className="text-sm font-normal text-gray-500">/ {stats.totalBlogs}</span>
                </p>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stats.coveragePercent}%` }}
                  />
                </div>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <ImageIcon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── SEARCH & FILTER CONTROLS ─── */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl flex-wrap">
            <button
              onClick={() => setActiveTab('missing')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'missing'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Missing Photos</span>
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {stats.missingPhotos}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="h-4 w-4 text-gray-500" />
              <span>All Articles</span>
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {stats.totalBlogs}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'completed'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>With Photos</span>
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-medium">
                {stats.completedPhotos}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unanalyzed')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'unanalyzed'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Cpu className="h-4 w-4 text-purple-500" />
              <span>Need AI Places</span>
              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {stats.unanalyzedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('drafts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'drafts'
                  ? 'bg-white text-gray-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="h-4 w-4 text-gray-500" />
              <span>Drafts</span>
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {stats.draftCount}
              </span>
            </button>
          </div>

          {/* View mode switcher */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'grouped' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
              }`}
            >
              By Category
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
              }`}
            >
              List View
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search blog title, AI place names, destination, or tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all text-sm h-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500 shrink-0" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="h-10 px-3 text-sm rounded-xl border border-gray-200 bg-gray-50 hover:bg-white transition-all text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories ({blogs.length})</option>
              {categoriesList.map(cat => {
                const count = blogs.filter(b => b.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* ─── BLOGS DISPLAY AREA ─── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200/80">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-gray-500">Loading blog directory...</p>
        </div>
      ) : filteredBlogs.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-200/80 p-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No articles found in this filter</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
            {activeTab === 'missing'
              ? 'Awesome work! All blogs matching the filter have cover photos assigned.'
              : activeTab === 'unanalyzed'
              ? 'All articles have been analyzed with AI location extraction.'
              : 'Try clearing your search keyword or switching category filters.'}
          </p>
          {(searchQuery || selectedCategory !== 'all' || activeTab !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setActiveTab('all');
              }}
              className="mt-4 rounded-xl"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBlogs.map(blog => {
            const hasAiPlaces = blog.photoPlaces && blog.photoPlaces.length > 0;

            return (
              <Card
                key={blog.id}
                className={`overflow-hidden border transition-all duration-200 hover:shadow-lg flex flex-col rounded-2xl group ${
                  blog.hasPhoto ? 'bg-white border-gray-200' : 'bg-amber-50/20 border-amber-200/90'
                }`}
              >
                {/* Blog Cover Photo Box */}
                <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden group">
                  {blog.coverImage ? (
                    <>
                      <img
                        src={blog.coverImage}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPreviewFullImageUrl(blog.coverImage || null)}
                          className="bg-white/90 hover:bg-white text-gray-900 text-xs h-7 px-2.5 rounded-lg shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemovePhoto(blog)}
                          className="text-xs h-7 px-2.5 rounded-lg shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 text-center">
                      <div className="p-3 bg-amber-100 text-amber-700 rounded-full mb-2 shadow-sm">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-bold text-amber-800">No Cover Photo</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">Click "Choose Photo" to populate</p>
                    </div>
                  )}

                  {/* Status Badges Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                    <Badge
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                        blog.published
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-purple-600 text-white shadow-sm'
                      }`}
                    >
                      {blog.published ? 'Published' : 'Draft'}
                    </Badge>
                    <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md border-0">
                      {blog.category || 'Article'}
                    </Badge>
                    {blog.hasPhoto && (blog.autoFilledRepeated || revertibleBlogs.some(r => r.id === blog.id)) && (
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border-0 shadow-xs flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> Auto-Filled
                      </Badge>
                    )}
                  </div>

                  {blog.readTime && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {blog.readTime}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3
                      className="font-bold text-gray-900 line-clamp-2 text-sm leading-snug group-hover:text-blue-600 transition-colors"
                      title={blog.title}
                    >
                      {blog.title}
                    </h3>
                    {blog.excerpt && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">{blog.excerpt}</p>
                    )}
                  </div>

                  {/* AI Extracted Places Chips */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 text-blue-500" />
                        <span>AI Places:</span>
                      </span>
                      {!hasAiPlaces && (
                        <span className="text-[10px] text-purple-600 font-semibold">Not analyzed</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {hasAiPlaces ? (
                        blog.photoPlaces!.slice(0, 3).map((place, i) => (
                          <span
                            key={i}
                            className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] px-2 py-0.5 rounded-md font-medium truncate max-w-[160px]"
                            title={place}
                          >
                            📍 {place}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Auto-extracts when opened in selector</span>
                      )}
                      {hasAiPlaces && blog.photoPlaces!.length > 3 && (
                        <span className="text-[10px] text-gray-400 self-center">
                          +{blog.photoPlaces!.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Auto-Fill button if matching photo exists OR AI Web Search button */}
                  {(() => {
                    if (blog.hasPhoto) return null;
                    const autofillCand = autoFillCandidates.find(c => c.id === blog.id);
                    if (autofillCand) {
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAutoFillReview(blog.id)}
                          className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                          title={`Auto-fill photo available: ${autofillCand.sourcePlaceName} (${autofillCand.sourceTitle})`}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Auto-Fill Photo Available</span>
                        </Button>
                      );
                    }
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunSingleBlogAiWebAutoFill(blog)}
                        disabled={isFindingSingleAiPhoto === blog.id}
                        className="w-full bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                        title="Extract exact landmark using AI and find verified photo on the web"
                      >
                        {isFindingSingleAiPhoto === blog.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                            <span>AI Finding Place &amp; Photo...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                            <span>AI Auto-Fill (Web Search)</span>
                          </>
                        )}
                      </Button>
                    );
                  })()}

                  {/* Revert Auto-Fill button if this blog was auto-filled */}
                  {(() => {
                    const isAutoFilled = blog.hasPhoto && (blog.autoFilledRepeated || revertibleBlogs.some(r => r.id === blog.id));
                    if (!isAutoFilled) return null;
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenRevertModal(blog.id)}
                        className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                        title="Revert this auto-filled photo"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
                        <span>Revert Auto-Fill</span>
                      </Button>
                    );
                  })()}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenPhotoSelector(blog)}
                      className={`flex-1 text-xs h-8 rounded-xl font-semibold flex items-center justify-center gap-1.5 ${
                        blog.hasPhoto
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{blog.hasPhoto ? 'Change Photo' : 'Select Photo'}</span>
                    </Button>

                    <a
                      href={`/blog/${blog.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View public post"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-8">
          {groupedByCategory.map(({ category, items }) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-base">{category}</h3>
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                    {items.length} articles
                  </Badge>
                </div>
                <span className="text-xs text-gray-500">
                  {items.filter(i => i.hasPhoto).length}/{items.length} with photos
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(blog => (
                  <Card
                    key={blog.id}
                    className={`overflow-hidden border rounded-2xl hover:shadow-md transition-all ${
                      blog.hasPhoto ? 'bg-white border-gray-200' : 'bg-amber-50/20 border-amber-200'
                    }`}
                  >
                    <div className="flex gap-3 p-3">
                      <div className="relative w-28 h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                        {blog.coverImage ? (
                          <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-700">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                        {blog.hasPhoto && (blog.autoFilledRepeated || revertibleBlogs.some(r => r.id === blog.id)) && (
                          <span className="absolute bottom-1 right-1 bg-emerald-600/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                            {blog.title}
                          </h4>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {blog.photoPlaces?.[0] ? `📍 ${blog.photoPlaces[0]}` : (blog.readTime || '5 min')}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5 mt-2">
                          {(() => {
                            if (blog.hasPhoto) return null;
                            const autofillCand = autoFillCandidates.find(c => c.id === blog.id);
                            if (autofillCand) {
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenAutoFillReview(blog.id)}
                                  className="h-6 text-[10px] px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold flex items-center justify-center gap-1 shadow-2xs"
                                  title={`Auto-fill photo from ${autofillCand.sourceTitle}`}
                                >
                                  <Sparkles className="h-3 w-3 text-emerald-600" />
                                  <span>Auto-Fill Photo</span>
                                </Button>
                              );
                            }
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRunSingleBlogAiWebAutoFill(blog)}
                                disabled={isFindingSingleAiPhoto === blog.id}
                                className="h-6 text-[10px] px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200 font-semibold flex items-center justify-center gap-1 shadow-2xs"
                                title="Extract exact landmark using AI & search web"
                              >
                                {isFindingSingleAiPhoto === blog.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                                ) : (
                                  <Sparkles className="h-3 w-3 text-purple-600" />
                                )}
                                <span>AI Auto-Fill</span>
                              </Button>
                            );
                          })()}
                          {(() => {
                            const isAutoFilled = blog.hasPhoto && (blog.autoFilledRepeated || revertibleBlogs.some(r => r.id === blog.id));
                            if (!isAutoFilled) return null;
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRevertModal(blog.id)}
                                className="h-6 text-[10px] px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 font-semibold flex items-center justify-center gap-1 shadow-2xs"
                                title="Revert auto-filled photo"
                              >
                                <RotateCcw className="h-3 w-3 text-amber-700" />
                                <span>Revert Photo</span>
                              </Button>
                            );
                          })()}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleOpenPhotoSelector(blog)}
                              className="h-6 text-[11px] px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {blog.hasPhoto ? 'Edit' : 'Add Photo'}
                            </Button>
                            <a
                              href={`/blog/${blog.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-600 p-1"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Photo Preview</th>
                  <th className="py-3.5 px-4">Article Title &amp; Slug</th>
                  <th className="py-3.5 px-4">AI Landmark Places</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBlogs.map(blog => (
                  <tr key={blog.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="w-16 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                        {blog.coverImage ? (
                          <img
                            src={blog.coverImage}
                            alt=""
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                            onClick={() => setPreviewFullImageUrl(blog.coverImage || null)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-700 text-[10px] font-bold">
                            Missing
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <p className="font-semibold text-gray-900 text-sm line-clamp-1">{blog.title}</p>
                      <span className="text-xs text-gray-400">/{blog.slug}</span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {blog.photoPlaces && blog.photoPlaces.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {blog.photoPlaces.slice(0, 2).map((p, idx) => (
                            <span key={idx} className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]">
                              📍 {p}
                            </span>
                          ))}
                          {blog.photoPlaces.length > 2 && (
                            <span className="text-[10px] text-gray-400 self-center">+{blog.photoPlaces.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-purple-600 font-medium">Pending AI Queue</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {blog.category || 'Travel'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={`text-xs ${
                          blog.published ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {blog.published ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {(() => {
                          if (blog.hasPhoto) return null;
                          const autofillCand = autoFillCandidates.find(c => c.id === blog.id);
                          if (autofillCand) {
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAutoFillReview(blog.id)}
                                className="h-8 text-xs rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold flex items-center gap-1 shadow-2xs"
                                title={`Auto-fill photo from ${autofillCand.sourceTitle}`}
                              >
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Auto-Fill</span>
                              </Button>
                            );
                          }
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRunSingleBlogAiWebAutoFill(blog)}
                              disabled={isFindingSingleAiPhoto === blog.id}
                              className="h-8 text-xs rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200 font-semibold flex items-center gap-1 shadow-2xs"
                              title="Extract exact landmark using AI & search web"
                            >
                              {isFindingSingleAiPhoto === blog.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                                  <span>Searching...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                  <span>AI Auto-Fill</span>
                                </>
                              )}
                            </Button>
                          );
                        })()}
                        {(() => {
                          const isAutoFilled = blog.hasPhoto && (blog.autoFilledRepeated || revertibleBlogs.some(r => r.id === blog.id));
                          if (!isAutoFilled) return null;
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenRevertModal(blog.id)}
                              className="h-8 text-xs rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 font-semibold flex items-center gap-1 shadow-2xs"
                              title="Revert auto-filled photo"
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
                              <span>Revert</span>
                            </Button>
                          );
                        })()}
                        <Button
                          size="sm"
                          onClick={() => handleOpenPhotoSelector(blog)}
                          className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                          {blog.hasPhoto ? 'Change Photo' : 'Select Photo'}
                        </Button>
                        <a
                          href={`/blog/${blog.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          ─── PHOTO SELECTOR MODAL (Wikimedia Commons + AI Extractor) ───
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeBlog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge className="bg-blue-600 text-white text-xs">{activeBlog.category || 'Blog'}</Badge>
                  <Badge variant="outline" className="text-xs">
                    /{activeBlog.slug}
                  </Badge>
                  {activeBlog.published ? (
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">Published</Badge>
                  ) : (
                    <Badge className="bg-purple-100 text-purple-800 text-xs">Draft</Badge>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-1">{activeBlog.title}</h2>
              </div>

              <button
                onClick={() => setActiveBlog(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Smart Extracted Topic Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>AI-Extracted Photogenic Landmarks &amp; Search Queries</span>
                  </label>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerOnDemandAIAnalysis(activeBlog, selectedImage !== null)}
                    disabled={isAnalyzingSingle}
                    className="h-7 text-xs px-2.5 rounded-lg border-purple-200 text-purple-700 hover:bg-purple-50 flex items-center gap-1.5"
                  >
                    {isAnalyzingSingle ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3 text-purple-600" />
                    )}
                    <span>Re-Analyze with AI</span>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extractedTopics.map((topic, idx) => {
                    const isSelected = activeTopicQuery === topic.query;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectTopic(topic)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                            : 'bg-blue-50/70 hover:bg-blue-100 text-blue-800 border border-blue-200/60'
                        }`}
                      >
                        <MapPin className="h-3 w-3 text-blue-500" />
                        <span>{topic.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Search & Source Bar */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Type custom landmark/city query (e.g. Nainital Lake, Kedarnath Temple)..."
                      value={customSearchQuery}
                      onChange={e => setCustomSearchQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          performSearch(customSearchQuery, false);
                        }
                      }}
                      className="pl-10 rounded-xl bg-white border-gray-200 text-sm h-10"
                    />
                  </div>

                  <Button
                    onClick={() => performSearch(customSearchQuery, false)}
                    disabled={isSearchingWiki || !customSearchQuery.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 font-semibold text-xs shrink-0"
                  >
                    {isSearchingWiki ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-1.5" />}
                    <span>Search Media</span>
                  </Button>
                </div>

                {/* Direct Manual Image URL Paste */}
                <div className="pt-2 border-t border-gray-200/70 flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 shrink-0">Or Direct URL:</span>
                  <Input
                    type="url"
                    placeholder="https://images.unsplash.com/... or any high-res image link"
                    value={manualImageUrl}
                    onChange={e => setManualImageUrl(e.target.value)}
                    className="h-8 text-xs bg-white rounded-lg"
                  />
                  {manualImageUrl && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedImage({
                          id: `manual-${Date.now()}`,
                          title: 'Direct URL Photo',
                          thumbUrl: manualImageUrl,
                          fullUrl: manualImageUrl,
                          width: 1200,
                          height: 675,
                          source: 'Wikimedia Commons',
                          license: 'Direct Link'
                        });
                        showToast('Applied custom image URL', 'info');
                      }}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shrink-0 px-3"
                    >
                      Use URL
                    </Button>
                  )}
                </div>
              </div>

              {/* Selected Photo Tray / Active Selection */}
              {selectedImage && (
                <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-24 h-16 bg-gray-200 rounded-xl overflow-hidden shrink-0 shadow-sm border border-blue-200">
                      <img
                        src={selectedImage.thumbUrl || selectedImage.fullUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Check className="h-5 w-5 text-white drop-shadow" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">Active Cover Choice</Badge>
                        <span className="text-[11px] text-gray-500">{selectedImage.source}</span>
                      </div>
                      <p className="text-xs font-bold text-gray-900 truncate mt-0.5">{selectedImage.title}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {selectedImage.license || 'Free Creative Commons'} &bull; {selectedImage.width || 1200} &times;{' '}
                        {selectedImage.height || 675}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewFullImageUrl(selectedImage.fullUrl || selectedImage.thumbUrl)}
                      className="h-8 text-xs bg-white text-gray-700 rounded-xl"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Full View
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setSelectedImage(null)}
                      className="h-8 text-xs rounded-xl px-2.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Wikimedia Search Results Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-600" />
                    <span>Wikimedia &amp; Free Media Results ({wikiResults.length})</span>
                  </h4>
                  {isSearchingWiki && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
                    </span>
                  )}
                </div>

                {isSearchingWiki ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-2xl">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    <p className="text-xs font-medium text-gray-500">Searching Wikimedia Commons &amp; Wikipedia...</p>
                  </div>
                ) : wikiResults.length === 0 ? (
                  <div className="py-12 text-center bg-gray-50 rounded-2xl p-6">
                    <p className="text-sm font-semibold text-gray-700">No images returned for "{customSearchQuery}"</p>
                    <p className="text-xs text-gray-500 mt-1">Try one of the keyword chips above or paste an image URL.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {wikiResults.map(img => {
                      const isChosen =
                        selectedImage?.fullUrl === img.fullUrl || selectedImage?.thumbUrl === img.thumbUrl;

                      return (
                        <div
                          key={img.id}
                          onClick={() => setSelectedImage(img)}
                          className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 flex flex-col bg-white hover:shadow-md ${
                            isChosen
                              ? 'border-blue-600 ring-4 ring-blue-600/20 shadow-md'
                              : 'border-gray-200 hover:border-blue-400'
                          }`}
                        >
                          <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                            <img
                              src={img.thumbUrl}
                              alt={img.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />

                            {/* Overlay check icon */}
                            {isChosen && (
                              <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="p-1.5 bg-blue-600 text-white rounded-full shadow-lg">
                                  <Check className="h-5 w-5" />
                                </div>
                              </div>
                            )}

                            {/* Source Pill */}
                            <div className="absolute top-1.5 left-1.5">
                              <span className="bg-black/60 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                                {img.source}
                              </span>
                            </div>

                            {/* Full view button */}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setPreviewFullImageUrl(img.fullUrl || img.thumbUrl);
                              }}
                              className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Zoom"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="p-2 flex-1 flex flex-col justify-between">
                            <p className="text-[11px] font-semibold text-gray-800 line-clamp-1" title={img.title}>
                              {img.title}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                              <span>
                                {img.width} &times; {img.height}
                              </span>
                              <span className="truncate max-w-[80px]">{img.license || 'Free'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveBlog(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2.5">
                <Button
                  size="sm"
                  onClick={() => handleSavePhoto(false)}
                  disabled={isSaving || !selectedImage}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold px-4 shadow-sm"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
                  <span>Save Cover Photo</span>
                </Button>

                {stats.missingPhotos > 1 && (
                  <Button
                    size="sm"
                    onClick={() => handleSavePhoto(true)}
                    disabled={isSaving || !selectedImage}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold px-4 shadow-sm"
                    title="Save current photo and jump straight to the next blog needing a photo"
                  >
                    <Sparkles className="h-4 w-4 mr-1.5 text-emerald-200" />
                    <span>Save &amp; Next Missing Blog</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          ─── AI LOCATION ANALYSIS BATCH QUEUE MODAL ───
         ═══════════════════════════════════════════════════════════════════════════ */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            {/* Queue Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 via-indigo-50 to-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-600 text-white rounded-xl shadow-sm">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">AI Location Analysis Queue</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Extracts verified tourist landmarks &amp; photogenic place names from previous blog articles
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (queueRunning) {
                    if (!confirm('Queue is currently running. Are you sure you want to close?')) return;
                    handleStopQueue();
                  }
                  setIsQueueModalOpen(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Queue Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Progress & Controls Box */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Queue Progress</span>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {queueItems.filter(it => it.status === 'success').length} / {queueItems.length} Analyzed
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {!queueRunning ? (
                      <Button
                        onClick={handleStartQueue}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" />
                        <span>Start AI Queue</span>
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={handlePauseQueue}
                          variant="outline"
                          className="h-9 px-3 text-xs font-semibold rounded-xl"
                        >
                          {queuePaused ? (
                            <>
                              <Play className="h-3.5 w-3.5 mr-1" /> Resume
                            </>
                          ) : (
                            <>
                              <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleStopQueue}
                          variant="destructive"
                          className="h-9 px-3 text-xs font-semibold rounded-xl"
                        >
                          <Square className="h-3.5 w-3.5 mr-1 fill-white" /> Stop
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        queueItems.length > 0
                          ? Math.round(
                              (queueItems.filter(it => it.status === 'success').length / queueItems.length) * 100
                            )
                          : 0
                      }%`
                    }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ListOrdered className="h-3.5 w-3.5 text-purple-600" />
                  <span>Queue Items ({queueItems.length})</span>
                </h4>

                <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-2xl bg-white">
                  {queueItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-3 text-xs flex items-center justify-between gap-3 ${
                        queueCurrentIndex === idx ? 'bg-purple-50/80 font-medium' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-400 text-[10px]">#{idx + 1}</span>
                          <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                        </div>
                        {item.extractedPlaces && item.extractedPlaces.length > 0 && (
                          <p className="text-[11px] text-purple-700 mt-0.5 truncate">
                            📍 {item.extractedPlaces.join(', ')}
                          </p>
                        )}
                      </div>

                      <div>
                        {item.status === 'analyzing' && (
                          <Badge className="bg-purple-100 text-purple-800 border-0 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Analyzing</span>
                          </Badge>
                        )}
                        {item.status === 'success' && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            <span>Ready</span>
                          </Badge>
                        )}
                        {item.status === 'failed' && (
                          <Badge className="bg-red-100 text-red-800 border-0">Failed</Badge>
                        )}
                        {item.status === 'pending' && (
                          <Badge variant="secondary" className="text-gray-500">
                            Queued
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Console Live Logs */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                  <span>Real-Time Logs</span>
                </h4>
                <div className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-2xl h-40 overflow-y-auto space-y-1.5 border border-slate-800">
                  {queueLogs.length === 0 ? (
                    <p className="text-slate-500 italic">Click "Start AI Queue" to begin analyzing articles...</p>
                  ) : (
                    queueLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                        <span
                          className={
                            log.type === 'success'
                              ? 'text-emerald-400'
                              : log.type === 'error'
                              ? 'text-red-400'
                              : log.type === 'warn'
                              ? 'text-amber-300'
                              : 'text-slate-200'
                          }
                        >
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (queueRunning) handleStopQueue();
                  setIsQueueModalOpen(false);
                }}
                className="rounded-xl text-xs"
              >
                Close Queue Window
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AUTO-FILL REPEATED BLOG PHOTOS REVIEW MODAL ─── */}
      {isAutoFillReviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-gray-900">
                      Auto-Fill Blog Cover Photos
                    </h2>
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-bold text-xs">
                      {autoFillCandidates.length} Found
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Review matching images with AI landmark context &amp; verified web sources. Uncheck any blog you wish to skip, then click <strong>Done</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAutoFillReviewOpen(false)}
                disabled={isAutoFillingRepeated}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter & Selection Controls */}
            <div className="p-4 bg-gray-50 border-b border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Filter blog, landmark or match reason..."
                  value={autoFillModalSearch}
                  onChange={e => setAutoFillModalSearch(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm bg-white border-gray-300 rounded-xl"
                />
                {autoFillModalSearch && (
                  <button
                    onClick={() => setAutoFillModalSearch('')}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                {blogs.some(b => !b.hasPhoto && !autoFillCandidates.some(c => c.id === b.id)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunAiWebAutoFill()}
                    disabled={isAiWebSearching}
                    className="h-8 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1.5 shadow-2xs"
                    title="Find exact places and web photos for remaining missing blogs"
                  >
                    <Sparkles className="h-3 w-3 text-purple-600" />
                    <span>AI Search Remaining ({blogs.filter(b => !b.hasPhoto && !autoFillCandidates.some(c => c.id === b.id)).length})</span>
                  </Button>
                )}
                <div className="text-xs font-semibold text-gray-600">
                  <span className="text-emerald-700 font-bold">{selectedCandidateIds.size}</span> of {autoFillCandidates.length} selected
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAllCandidates(filteredCandidates)}
                    className="h-8 text-xs font-medium rounded-lg"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeselectAllCandidates(filteredCandidates)}
                    className="h-8 text-xs font-medium rounded-lg text-gray-500"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
            </div>

            {/* Candidate List (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {filteredCandidates.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No candidates match your search</p>
                  <p className="text-xs text-gray-400 mt-1">Try clearing or changing your filter term.</p>
                </div>
              ) : (
                filteredCandidates.map(c => {
                  const isChecked = selectedCandidateIds.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`transition-all rounded-xl p-3 border ${
                        isChecked
                          ? 'bg-emerald-50/30 border-emerald-200'
                          : 'bg-gray-50/60 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Selection Checkbox */}
                        <div
                          onClick={() => handleToggleCandidate(c.id)}
                          className="cursor-pointer shrink-0 mt-1 sm:mt-0"
                        >
                          <div
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                : 'border-gray-300 bg-white hover:border-emerald-500'
                            }`}
                          >
                            {isChecked && <Check className="h-4 w-4 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Image Preview Thumbnail */}
                        <div
                          onClick={() => setPreviewFullImageUrl(c.primaryImageUrl)}
                          className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-200 shrink-0 bg-gray-100 cursor-pointer group shadow-2xs"
                          title="Click to view full image"
                        >
                          <img
                            src={c.primaryImageUrl}
                            alt={c.imageTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => { (e.target as HTMLImageElement).src = '/images/placeholder.svg'; }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Eye className="h-5 w-5" />
                          </div>
                          {c.proposedUrls.length > 1 && (
                            <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                              +{c.proposedUrls.length}
                            </span>
                          )}
                        </div>

                        {/* Blog & Reasoning Details */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[11px] text-gray-600 border-gray-300 bg-white">
                              {c.targetCategory || 'Article'}
                            </Badge>
                            <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                              {c.targetBlogTitle}
                            </h4>
                          </div>

                          <p className="text-xs text-gray-400 truncate">
                            /{c.targetBlogSlug}
                          </p>

                          {/* "Why" this photo will be auto-filled */}
                          <div className="bg-white rounded-lg p-2.5 border border-emerald-200/80 shadow-2xs text-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                              <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>Why this photo:</span>
                              <Badge className={`text-[10px] font-bold py-0 px-1.5 border-none ${
                                c.sourceType === 'ai_web_search'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {c.sourceType === 'ai_web_search'
                                  ? 'AI Web Search (Verified Landmark)'
                                  : c.matchType === 'exact'
                                  ? 'Exact Match'
                                  : c.matchType === 'landmark'
                                  ? 'AI Landmark Match'
                                  : c.matchType === 'cleaned'
                                  ? 'Place Name Match'
                                  : c.matchType === 'split'
                                  ? 'Sub-location Match'
                                  : 'Topic Match'}
                              </Badge>
                            </div>
                            <p className="text-gray-700 text-xs font-medium">
                              {c.matchReason}
                            </p>
                            <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-gray-500">
                              <p>
                                Source: <strong className="text-gray-700 font-medium">{c.sourceTitle}</strong>
                              </p>
                              <p>
                                Photo asset: <strong className="text-gray-700 font-medium">{c.imageTitle}</strong>
                              </p>
                            </div>

                            {/* Multi-Photo Carousel / Alternative Switcher for Web Search */}
                            {c.proposedUrls && c.proposedUrls.length > 1 && (
                              <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100 mt-1">
                                <span className="text-[10px] text-gray-500 font-medium shrink-0">
                                  Alternative web photos ({c.proposedUrls.length}):
                                </span>
                                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                                  {c.proposedUrls.slice(0, 6).map((url, uIdx) => (
                                    <button
                                      key={uIdx}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSwitchCandidateImage(c.id, url);
                                      }}
                                      className={`w-7 h-7 rounded-md border overflow-hidden shrink-0 transition-all ${
                                        c.primaryImageUrl === url
                                          ? 'ring-2 ring-emerald-600 border-transparent shadow-xs scale-105'
                                          : 'opacity-60 hover:opacity-100 border-gray-300'
                                      }`}
                                      title={`Switch to photo option ${uIdx + 1}`}
                                    >
                                      <img src={url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 self-end sm:self-center">
                          {isChecked ? (
                            <Badge className="bg-emerald-600 text-white font-semibold text-xs py-1 px-2.5 rounded-lg flex items-center gap-1">
                              <Check className="h-3 w-3" /> Will Auto-Fill
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-400 border-gray-300 font-medium text-xs py-1 px-2.5 rounded-lg">
                              Skipped
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer with DONE option */}
            <div className="p-4 sm:p-5 bg-white border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-500 text-center sm:text-left">
                {selectedCandidateIds.size > 0 ? (
                  <span>
                    Will auto-populate <strong>{selectedCandidateIds.size}</strong> blog article{selectedCandidateIds.size > 1 ? 's' : ''}.
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">
                    No blogs selected. Select at least one blog to apply photos.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsAutoFillReviewOpen(false)}
                  disabled={isAutoFillingRepeated}
                  className="rounded-xl px-4 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleExecuteAutoFill}
                  disabled={selectedCandidateIds.size === 0 || isAutoFillingRepeated}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5 text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  {isAutoFillingRepeated ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Applying Photos...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                      <span>Done (Auto-Fill {selectedCandidateIds.size})</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── REVERT AUTO-FILLED BLOG PHOTOS MODAL ─── */}
      {isRevertModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-white">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-gray-900">
                      Revert Auto-Filled Photos
                    </h2>
                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-none font-bold text-xs">
                      {revertibleBlogs.length} Auto-Filled
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Select the blogs whose auto-filled photos you want to remove. Uncheck any blog you wish to keep, then click <strong>Revert Selected</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRevertModalOpen(false)}
                disabled={isReverting}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter & Selection Controls */}
            <div className="p-4 bg-gray-50 border-b border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Filter blog or match reason..."
                  value={revertModalSearch}
                  onChange={e => setRevertModalSearch(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm bg-white border-gray-300 rounded-xl"
                />
                {revertModalSearch && (
                  <button
                    onClick={() => setRevertModalSearch('')}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-xs font-semibold text-gray-600">
                  <span className="text-amber-800 font-bold">{selectedRevertIds.size}</span> of {revertibleBlogs.length} selected
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAllRevert(filteredRevertBlogs)}
                    className="h-8 text-xs font-medium rounded-lg"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeselectAllRevert(filteredRevertBlogs)}
                    className="h-8 text-xs font-medium rounded-lg text-gray-500"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
            </div>

            {/* Items List (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {filteredRevertBlogs.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No auto-filled blogs match your search</p>
                  <p className="text-xs text-gray-400 mt-1">Try clearing or changing your search query.</p>
                </div>
              ) : (
                filteredRevertBlogs.map(item => {
                  const isChecked = selectedRevertIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`transition-all rounded-xl p-3 border ${
                        isChecked
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-gray-50/60 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Checkbox */}
                        <div
                          onClick={() => handleToggleRevertItem(item.id)}
                          className="cursor-pointer shrink-0 mt-1 sm:mt-0"
                        >
                          <div
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                                : 'border-gray-300 bg-white hover:border-amber-500'
                            }`}
                          >
                            {isChecked && <Check className="h-4 w-4 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Image Preview Thumbnail */}
                        <div
                          onClick={() => setPreviewFullImageUrl(item.imageUrl)}
                          className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-200 shrink-0 bg-gray-100 cursor-pointer group shadow-2xs"
                          title="Click to view full image"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.blogTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => { (e.target as HTMLImageElement).src = '/images/placeholder.svg'; }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Eye className="h-5 w-5" />
                          </div>
                        </div>

                        {/* Blog Details */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[11px] text-gray-600 border-gray-300 bg-white">
                              {item.category || 'Article'}
                            </Badge>
                            <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                              {item.blogTitle}
                            </h4>
                          </div>

                          <p className="text-xs text-gray-400 truncate">
                            /{item.blogSlug}
                          </p>

                          <div className="bg-white rounded-lg p-2 border border-amber-200/80 shadow-2xs text-xs flex items-center gap-2 text-amber-900">
                            <RotateCcw className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                            <span>
                              Auto-filled photo asset: <strong>{extractImageTitleFromUrl(item.imageUrl)}</strong>
                              {item.sourcePlaceName && <span> (matched from: {item.sourcePlaceName})</span>}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 self-end sm:self-center">
                          {isChecked ? (
                            <Badge className="bg-rose-600 text-white font-semibold text-xs py-1 px-2.5 rounded-lg flex items-center gap-1">
                              Will Revert (Clear Photo)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-700 border-emerald-300 font-medium text-xs py-1 px-2.5 rounded-lg">
                              Keep Photo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-white border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-500 text-center sm:text-left">
                {selectedRevertIds.size > 0 ? (
                  <span>
                    Will remove auto-filled photos from <strong>{selectedRevertIds.size}</strong> blog{selectedRevertIds.size > 1 ? 's' : ''} and mark them missing again.
                  </span>
                ) : (
                  <span className="text-gray-500 font-medium">
                    No blogs selected to revert.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsRevertModalOpen(false)}
                  disabled={isReverting}
                  className="rounded-xl px-4 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleExecuteRevert}
                  disabled={selectedRevertIds.size === 0 || isReverting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl px-5 text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  {isReverting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Reverting Photos...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 text-amber-200" />
                      <span>Revert Selected ({selectedRevertIds.size})</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI WEB SEARCH PROGRESS MODAL ─── */}
      {isAiWebSearching && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-purple-100 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 animate-pulse">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">AI Place Extraction &amp; Web Search</h3>
              <p className="text-xs text-gray-500 mt-1">
                Extracting exact tourist landmarks with AI &amp; fetching verified photos from Wikimedia &amp; Flickr...
              </p>
            </div>

            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                <span>Blog {aiSearchProgress.current} of {aiSearchProgress.total}</span>
                <span className="text-purple-700 font-bold">
                  {Math.round((aiSearchProgress.current / (aiSearchProgress.total || 1)) * 100)}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((aiSearchProgress.current / (aiSearchProgress.total || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="w-full bg-purple-50/70 border border-purple-100 rounded-xl p-3 text-left">
              <p className="text-[11px] text-gray-500 font-medium">Analyzing article context:</p>
              <p className="text-xs font-bold text-gray-900 truncate mt-0.5">
                {aiSearchProgress.blogTitle || 'Analyzing blog...'}
              </p>
              {aiSearchProgress.landmark && (
                <p className="text-[11px] text-purple-700 font-semibold mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>Exact Landmark: {aiSearchProgress.landmark}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between w-full pt-2">
              <span className="text-xs text-emerald-700 font-bold">
                {aiSearchProgress.foundCount} photos verified
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelAiWebSearch}
                className="text-xs text-gray-600 hover:text-gray-900 rounded-xl"
              >
                Stop
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FULL IMAGE PREVIEW LIGHTBOX ─── */}
      {previewFullImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewFullImageUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={previewFullImageUrl}
              alt="High Resolution Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <div className="flex items-center gap-3 mt-3">
              <a
                href={previewFullImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-sm"
              >
                <span>Open Full Size</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => setPreviewFullImageUrl(null)}
                className="text-white text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg backdrop-blur-sm"
              >
                Close (ESC)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
