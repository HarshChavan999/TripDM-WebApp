import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Footer from '@/components/Footer';
import BlogViewTracker from '@/components/BlogViewTracker';
import BlogShareBar from '@/components/BlogShareBar';
import BlogComments from '@/components/BlogComments';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export async function generateStaticParams() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogs?pageSize=10000`;
    const res = await fetch(url);
    if (!res.ok) return [{ slug: 'default' }];
    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents) || data.documents.length === 0) {
      return [{ slug: 'default' }];
    }
    const paths = data.documents
      .map((doc: any) => {
        const fields = doc.fields || {};
        const slug = fields.slug?.stringValue;
        return slug ? { slug } : null;
      })
      .filter(Boolean);
    return paths.length > 0 ? paths : [{ slug: 'default' }];
  } catch {
    return [{ slug: 'default' }];
  }
}

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  published: boolean;
  publishedAt: string;
  updatedAt: string;
  metaTitle: string;
  metaDescription: string;
  readTime: string;
  views?: number;
}

function parseBlogDoc(doc: any): Blog {
  const nameParts = doc.name ? doc.name.split('/') : [];
  const id = nameParts.length ? nameParts[nameParts.length - 1] : '';
  const fields = doc.fields || {};
  const viewsVal = fields.views?.integerValue || fields.views?.numberValue || fields.viewsCount?.integerValue;
  return {
    id,
    title: fields.title?.stringValue || '',
    slug: fields.slug?.stringValue || id,
    excerpt: fields.excerpt?.stringValue || '',
    content: fields.content?.stringValue || '',
    coverImage: fields.coverImage?.stringValue || '',
    category: fields.category?.stringValue || 'Destinations',
    tags: fields.tags?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
    author: fields.author?.stringValue || 'TripDM Travel Expert',
    published: fields.published?.booleanValue || false,
    publishedAt: fields.publishedAt?.stringValue || '',
    updatedAt: fields.updatedAt?.stringValue || '',
    metaTitle: fields.metaTitle?.stringValue || '',
    metaDescription: fields.metaDescription?.stringValue || '',
    readTime: fields.readTime?.stringValue || '8 min read',
    views: viewsVal ? Number(viewsVal) : undefined,
  };
}

async function getBlogBySlug(slug: string): Promise<Blog | null> {
  try {
    const directUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogs/${slug}`;
    const directRes = await fetch(directUrl, { cache: 'no-store' });
    if (directRes.ok) {
      const doc = await directRes.json();
      if (doc && doc.fields) return parseBlogDoc(doc);
    }
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'blogs' }],
        where: { fieldFilter: { field: { fieldPath: 'slug' }, op: 'EQUAL', value: { stringValue: slug } } },
        limit: 1,
      },
    };
    const res = await fetch(queryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query), cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.find((d: any) => d.document);
    if (!item) return null;
    return parseBlogDoc(item.document);
  } catch { return null; }
}

async function getRecommendedBlogs(currentBlog: Blog): Promise<Blog[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'blogs' }],
        where: {
          fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } }
        },
        limit: 50,
      },
    };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query), cache: 'no-store' });
    let allBlogs: Blog[] = [];
    if (res.ok) {
      const data = await res.json();
      allBlogs = data.filter((item: any) => item.document).map((item: any) => parseBlogDoc(item.document));
    }

    if (allBlogs.length === 0) {
      allBlogs = getFallbackPopularBlogs(currentBlog.slug);
    }

    const currentTags = (currentBlog.tags || []).map((t) => t.toLowerCase().trim());
    const currentCategory = (currentBlog.category || '').toLowerCase().trim();
    const stopWords = new Set(['the', 'and', 'for', 'in', 'to', 'of', 'a', 'an', 'is', 'on', 'with', 'at', 'by', 'from', 'this', 'that', 'you', 'your', 'best', 'guide', 'top', '2026', '2025', '2024']);
    const titleKeywords = (currentBlog.title + ' ' + currentBlog.slug)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const candidateBlogs = allBlogs.filter((b: Blog) => b.slug !== currentBlog.slug);

    const scored = candidateBlogs.map((b: Blog) => {
      let score = 0;
      const bTags = (b.tags || []).map((t) => t.toLowerCase().trim());
      const matchingTags = bTags.filter((t) => currentTags.includes(t));
      score += matchingTags.length * 6;

      if (b.category && b.category.toLowerCase().trim() === currentCategory) {
        score += 4;
      }

      const bKeywords = (b.title + ' ' + b.slug)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));
      
      const matchingKeywords = bKeywords.filter((w) => titleKeywords.includes(w));
      score += matchingKeywords.length * 3;

      const views = typeof b.views === 'number' ? b.views : 0;
      if (views > 0) {
        score += Math.min(2, Math.log10(views + 1));
      }

      return { blog: b, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const bViews = typeof b.blog.views === 'number' ? b.blog.views : 0;
      const aViews = typeof a.blog.views === 'number' ? a.blog.views : 0;
      return bViews - aViews;
    });

    const topResults = scored.slice(0, 3).map((s) => s.blog);
    if (topResults.length >= 3) return topResults;

    const fallbacks = getFallbackPopularBlogs(currentBlog.slug);
    for (const fb of fallbacks) {
      if (topResults.length >= 3) break;
      if (!topResults.some((r) => r.slug === fb.slug)) {
        topResults.push(fb);
      }
    }
    return topResults.slice(0, 3);
  } catch {
    return getFallbackPopularBlogs(currentBlog.slug).slice(0, 3);
  }
}

function getFallbackPopularBlogs(currentSlug: string): Blog[] {
  const fallbacks: Blog[] = [
    {
      id: 'pop-1',
      title: '30 Bucket List Ideas for Adventure Travellers in India',
      slug: '30-bucket-list-ideas-for-adventure-travellers-in-india',
      excerpt: 'Ultimate thrill seeker guide across Ladakh, Spiti, and Meghalaya',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1506461883276-594a12b11ce3?auto=format&fit=crop&w=600&q=80',
      category: 'Adventure',
      tags: ['Adventure', 'India'],
      author: 'TripDM Travel Expert',
      published: true,
      publishedAt: '2026-06-15T00:00:00Z',
      updatedAt: '',
      metaTitle: '',
      metaDescription: '',
      readTime: '6 min read'
    },
    {
      id: 'pop-2',
      title: '20 Cheapest Countries to Visit from India (2026 Edition)',
      slug: '20-cheapest-countries-to-visit-from-india',
      excerpt: 'Comprehensive budget breakdown: flights, visas, food & daily hostel rates',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      category: 'Budget Travel',
      tags: ['Budget', 'International'],
      author: 'TripDM Team',
      published: true,
      publishedAt: '2026-06-10T00:00:00Z',
      updatedAt: '',
      metaTitle: '',
      metaDescription: '',
      readTime: '8 min read'
    },
    {
      id: 'pop-3',
      title: '50 Countries Where Getting A Visa Is Easier Than Ordering A Pizza',
      slug: '50-countries-where-getting-a-visa-is-easier',
      excerpt: 'Instant visa-on-arrival and frictionless e-visas for Indian passport holders',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80',
      category: 'Travel Tips',
      tags: ['Visa', 'Travel Tips'],
      author: 'TripDM Team',
      published: true,
      publishedAt: '2026-05-28T00:00:00Z',
      updatedAt: '',
      metaTitle: '',
      metaDescription: '',
      readTime: '7 min read'
    }
  ];
  return fallbacks.filter(b => b.slug !== currentSlug);
}

function getFormattedViews(blog: Blog): string {
  const count = typeof blog.views === 'number' && !isNaN(blog.views) ? blog.views : 0;
  return count.toLocaleString('en-US');
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) return { title: 'Blog Not Found | TripDM', robots: { index: false, follow: false } };
  const title = blog.metaTitle || blog.title;
  const description = blog.metaDescription || blog.excerpt;
  const image = blog.coverImage || 'https://tripdm.com/og-default.jpg';
  return {
    title: `${title} | TripDM Travel Field Report`,
    description,
    keywords: [...(blog.tags || []), 'travel', 'TripDM', blog.category].filter(Boolean),
    authors: [{ name: blog.author }],
    openGraph: { title, description, type: 'article', url: `https://tripdm.com/blog/${slug}`, images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : [], publishedTime: blog.publishedAt, modifiedTime: blog.updatedAt, authors: [blog.author], tags: blog.tags, section: blog.category },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    alternates: { canonical: `https://tripdm.com/blog/${slug}` },
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

interface TocItem {
  id: string;
  title: string;
}

function extractTocItems(content: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      const text = h2Match[1].replace(/[*_`]/g, '').trim();
      if (!/frequently asked questions|faqs|quick jumplinks|table of contents|book your trip/i.test(text)) {
        items.push({ id: slugify(text), title: text });
      }
    }
  }
  return items;
}

function parseTableLine(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
  return trimmed.split('|').map(c => {
    let text = c.trim();
    return text.replace(/^[\*\-\+]\s+/, '');
  });
}

function convertMarkdownTables(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        let sepIndex = -1;
        for (let j = 0; j < tableLines.length; j++) {
          const l = tableLines[j].trim();
          if (/^\|?\s*:?-{2,}:?\s*(\||$)/.test(l) || /^[\s|:-]+$/.test(l)) {
            sepIndex = j;
            break;
          }
        }

        let headerCells: string[] = [];
        const bodyRows: string[][] = [];

        if (sepIndex > 0) {
          headerCells = parseTableLine(tableLines[sepIndex - 1]);
          for (let j = 0; j < tableLines.length; j++) {
            if (j !== sepIndex && j !== sepIndex - 1) {
              const cells = parseTableLine(tableLines[j]);
              if (cells.length > 0 && cells.some(c => c.length > 0)) {
                bodyRows.push(cells);
              }
            }
          }
        } else {
          headerCells = parseTableLine(tableLines[0]);
          for (let j = 1; j < tableLines.length; j++) {
            const cells = parseTableLine(tableLines[j]);
            if (cells.length > 0 && cells.some(c => c.length > 0)) {
              bodyRows.push(cells);
            }
          }
        }

        if (headerCells.length > 0 || bodyRows.length > 0) {
          const thHtml = headerCells.map(c => `<th>${c}</th>`).join('');
          const trHtml = bodyRows.map(row => {
            const tdHtml = row.map(c => `<td>${c}</td>`).join('');
            return `<tr>${tdHtml}</tr>`;
          }).join('\n');

          const tableHtml = `\n\n<div class="table-wrap"><table class="blog-table"><thead><tr>${thHtml}</tr></thead><tbody>\n${trHtml}\n</tbody></table></div>\n\n`;
          result.push(tableHtml);
          continue;
        }
      }

      result.push(...tableLines);
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

function cleanUnicodeBoxDrawing(content: string): string {
  const boxCharRegex = /[┌┐└┘├┤┬┴┼─│═║╔╦╗╠╬╣╚╩╝]/;
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (boxCharRegex.test(lines[i])) {
      const boxLines: string[] = [];
      while (
        i < lines.length &&
        (boxCharRegex.test(lines[i]) ||
          lines[i].trim() === '' ||
          lines[i].trim() === '`' ||
          lines[i].trim() === '`,`' ||
          lines[i].trim() === ',' ||
          lines[i].trim() === '`,' ||
          lines[i].trim() === ',`')
      ) {
        boxLines.push(lines[i]);
        i++;
      }

      const items: string[] = [];
      for (const bLine of boxLines) {
        const cleaned = bLine
          .replace(/[┌┐└┘├┤┬┴┼─│═║╔╦╗╠╬╣╚╩╝]/g, '')
          .replace(/^[`,\s]+|[`,\s]+$/g, '')
          .trim();
        if (cleaned && cleaned !== '`' && cleaned !== ',' && cleaned !== '`,`') {
          items.push(cleaned);
        }
      }

      if (items.length > 0) {
        const listHtml = items.map(item => `<li>${item}</li>`).join('\n');
        result.push(`\n\n<ul class="blog-benefit-list">\n${listHtml}\n</ul>\n\n`);
        continue;
      }
    }

    result.push(lines[i]);
    i++;
  }

  return result.join('\n');
}

function parseMarkdownLists(content: string): string {
  const lines = content.split('\n');
  const resultLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*([\*\-\+]|\d+\.)\s+/.test(line)) {
      const listLines: string[] = [];
      while (i < lines.length) {
        const curr = lines[i];
        if (/^\s*([\*\-\+]|\d+\.)\s+/.test(curr)) {
          listLines.push(curr);
          i++;
        } else if (curr.trim() === '' && i + 1 < lines.length && /^\s*([\*\-\+]|\d+\.)\s+/.test(lines[i + 1])) {
          i++;
        } else {
          break;
        }
      }

      const items: { content: string; isTariff: boolean; tierName?: string; price?: string; desc?: string }[] = [];

      listLines.forEach(l => {
        const trimmed = l.trim().replace(/^[\*\-\+]\s+/, '').replace(/^\d+\.\s+/, '');
        if (!trimmed) return;

        // Detect if this list item is an accommodation tariff (Budget, Mid-Range, Luxury with currency)
        const tariffPattern = /^(Budget(?:\s+Stays|\s+Guesthouses)?|Mid-Range(?:\s+Hotels)?|Luxury(?:\s+Resorts|\s+Riverside)?|Basic(?:\s+Tourist|\s+Camps)?|Standard(?:\s+Hotels)?)([^:]*):\s*([₹$][\d,\s–—\-+a-zA-Z\/]+)(.*)$/i;
        const match = trimmed.match(tariffPattern);

        if (match) {
          items.push({
            content: trimmed,
            isTariff: true,
            tierName: (match[1] + (match[2] || '')).trim(),
            price: match[3].trim(),
            desc: match[4].replace(/^\s*[\(–—\-]\s*/, '').replace(/\)\s*$/, '').trim()
          });
        } else {
          items.push({ content: trimmed, isTariff: false });
        }
      });

      const hasTariffs = items.some(it => it.isTariff);

      if (hasTariffs) {
        const cardsHtml = items.map(it => {
          if (it.isTariff) {
            const isLuxury = /luxury|heritage/i.test(it.tierName || '');
            const isMid = /mid-range|standard/i.test(it.tierName || '');
            const badgeClass = isLuxury ? 'tier-luxury' : isMid ? 'tier-mid' : 'tier-budget';
            const icon = isLuxury ? '👑' : isMid ? '🏨' : '🛖';

            return `
              <div class="stay-tier-card ${badgeClass}">
                <div class="st-top">
                  <div class="st-badge">
                    <span class="st-icon">${icon}</span>
                    <span class="st-name">${it.tierName}</span>
                  </div>
                  <div class="st-price">${it.price}</div>
                </div>
                ${it.desc ? `<div class="st-desc">${it.desc}</div>` : ''}
              </div>
            `;
          }
          return `<div class="stay-tier-note">• ${it.content}</div>`;
        }).join('\n');

        resultLines.push(`\n\n<div class="stay-tier-deck">\n${cardsHtml}\n</div>\n\n`);
        continue;
      }

      // Standard list styling
      const lis = items.map(it => `<li>${it.content}</li>`).join('\n');
      resultLines.push(`\n\n<ul class="blog-parsed-list">\n${lis}\n</ul>\n\n`);
      continue;
    } else {
      resultLines.push(line);
      i++;
    }
  }

  return resultLines.join('\n');
}

function renderContent(content: string): string {
  if (!content) return '';

  // 1. Strip all Unicode emoji spam from content
  let html = content.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA9F}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{25A0}-\u{25FF}\u{2700}-\u{27BF}]/gu, '').trim();

  // Strip hidden HTML comment blocks
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Strip visible Focus Keyword callout line
  html = html.replace(/^\s*> ?\*\*Focus Keyword:\*\*.*$/gmi, '');
  html = html.replace(/^\s*Focus Keyword:.*$/gmi, '');

  // Deduplicate duplicate FAQ sections if present
  const faqHeaderRegex = /(?:^|\n)(?:---|\*\*\*|___)?\s*\n?##\s*(Frequently Asked Questions|FAQs)[\s\S]*?(?=\n##\s+|\n---\s*\n##\s+|$)/gi;
  const faqMatches = html.match(faqHeaderRegex);
  if (faqMatches && faqMatches.length > 1) {
    let count = 0;
    html = html.replace(faqHeaderRegex, (match) => {
      count++;
      return count === 1 ? '' : match;
    });
  }

  // Strip raw inline TOC / Quick Jumplinks header & list since we have the sticky Table of Contents in the right sidebar
  html = html.replace(/(?:^|\n)##\s*(?:Quick Jumplinks to Navigate|Table of Contents|Quick Jump Links|Jumplinks)[\s\S]*?(?=\n##|\n---|$)/gi, '');

  // Remove decorative triangle lines, stray dots, commas, dashes
  html = html
    .replace(/^\s*[▼▲\s]{2,}\s*$/gm, '')
    .replace(/^\s*[\.\…\,`'"\s]{1,}\s*$/gm, '')
    .replace(/^\s*[\-\*_]{3,}\s*$/gm, '')
    .replace(/\n\s*,\s*\n/g, '\n');

  // Strip Unicode Box Drawing ASCII blocks
  html = cleanUnicodeBoxDrawing(html);

  // Convert Markdown Tables to HTML Tables
  html = convertMarkdownTables(html);

  // Convert Markdown Lists into styled cards / lists
  html = parseMarkdownLists(html);

  // Blockquotes with Ground Reality or Insider Secret styling
  html = html.replace(/^> (?:⚠️|Caution|Warning|Watch Out:?|Ground Reality:?)\s*(.+)$/gmi, (_, txt) => {
    return `<div class="ground-reality-callout"><div class="gr-header"><span class="gr-icon">⚠️</span><span class="gr-title">GROUND REALITY & WATCH OUT</span><span class="gr-badge">Verified 2026</span></div><div class="gr-content">${txt}</div></div>`;
  });

  html = html.replace(/^> (?:💡|Tip|Insider Tip:?|Pro-Tip:?)\s*(.+)$/gmi, (_, txt) => {
    return `<div class="insider-secret-callout"><div class="is-header"><span class="is-icon">💡</span><span class="is-title">LOCAL INSIDER SECRET</span><span class="is-badge">Field Note</span></div><div class="is-content">${txt}</div></div>`;
  });

  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Headings with slugified anchor IDs
  html = html
    .replace(/^### (.+)$/gm, (_, t) => `<h3 id="${slugify(t)}">${t}</h3>`)
    .replace(/^## (.+)$/gm, (_, t) => `<h2 id="${slugify(t)}">${t}</h2>`)
    .replace(/^# (.+)$/gm, (_, t) => `<h1 id="${slugify(t)}">${t}</h1>`);

  // Bold, Italic, Code, HR
  html = html.replace(/`\s*[,.]?\s*`/g, ' ');
  html = html
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`\r\n]+)`/g, (_, code) => {
      const trimmed = code.trim();
      if (trimmed === ',' || trimmed === '.' || trimmed === '' || trimmed === '`') return ' ';
      return `<code>${trimmed}</code>`;
    })
    .replace(/^---$/gm, '<hr>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, (_, text, href) => {
    if (href.startsWith('#')) {
      return `<a href="${href}" class="bp-anchor-link">${text}</a>`;
    }
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // Paragraphs
  html = html.split(/\n\n+/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-6]|ul|ol|blockquote|hr|div|table|thead|tbody|tr)/i.test(trimmed)) {
      return trimmed;
    }
    if (/^\s*[\.\…\,`'"\-\*\_\s]+\s*$/.test(trimmed)) return '';
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean).join('\n');

  // Strip duplicate inline Table of Contents from article body (kept exclusively in the right sticky sidebar)
  html = html.replace(
    /<h2 id="(?:quick-jumplinks-to-navigate|table-of-contents|quick-jump-links|jumplinks)[^"]*">([\s\S]*?)<\/h2>\s*<ul[^>]*>([\s\S]*?)<\/ul>/gi,
    ''
  );
  html = html.replace(
    /<h2 id="(?:quick-jumplinks-to-navigate|table-of-contents|quick-jump-links|jumplinks)[^"]*">([\s\S]*?)<\/h2>/gi,
    ''
  );
  html = html.replace(/<div class="quick-jumplinks-card"[\s\S]*?<\/div>/gi, '');

  // Strip initial list of anchor jump links (#) at the start of content if author placed raw jump links
  html = html.replace(/^\s*<ul class="blog-parsed-list">\s*(?:<li>[\s\S]*?<\/li>\s*)+<\/ul>/i, (matchedList) => {
    if (matchedList.includes('href="#') || matchedList.includes('class="bp-anchor-link"')) {
      return '';
    }
    return matchedList;
  });

  // Transform FAQs section into Interactive Accordion
  html = convertFaqToAccordion(html);

  return html;
}

function convertFaqToAccordion(html: string): string {
  const faqSectionRegex = /(<h2 id="[^"]*(?:frequently-asked-questions|faqs|faq)[^"]*">([\s\S]*?)<\/h2>)([\s\S]*?)(?=<h2|$)/i;
  const match = html.match(faqSectionRegex);
  if (!match) return html;

  const h2Tag = match[1];
  const faqContent = match[3];

  const itemRegex = /<h3[^>]*>([\s\S]*?)<\/h3>\s*([\s\S]*?)(?=<h3|$)/gi;
  let itemsHtml = '';
  let itemMatch;

  while ((itemMatch = itemRegex.exec(faqContent)) !== null) {
    const questionText = itemMatch[1].trim();
    const answerHtml = itemMatch[2].trim();

    if (questionText && answerHtml) {
      itemsHtml += `
        <details class="faq-accordion-item">
          <summary class="faq-summary">
            <span class="faq-q-title">${questionText}</span>
            <span class="faq-chevron-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </summary>
          <div class="faq-answer">
            ${answerHtml}
          </div>
        </details>
      `;
    }
  }

  if (!itemsHtml) return html;
  const accordionContainer = `\n<div class="faq-accordion">\n${itemsHtml}\n</div>\n`;
  return html.replace(faqSectionRegex, `${h2Tag}\n${accordionContainer}`);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'June 15, 2026';
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  catch { return dateStr; }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog || !blog.published) notFound();

  const recommendedBlogs = await getRecommendedBlogs(blog);
  const contentHtml = renderContent(blog.content);
  const mainViews = getFormattedViews(blog);
  const tocItems = extractTocItems(blog.content);

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: blog.title, description: blog.metaDescription || blog.excerpt,
    image: blog.coverImage ? [blog.coverImage] : [],
    author: { '@type': 'Person', name: blog.author },
    publisher: { '@type': 'Organization', name: 'TripDM', url: 'https://tripdm.com', logo: { '@type': 'ImageObject', url: 'https://tripdm.com/logo.png' } },
    datePublished: blog.publishedAt, dateModified: blog.updatedAt || blog.publishedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://tripdm.com/blog/${blog.slug}` },
    keywords: blog.tags?.join(', '), articleSection: blog.category,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');

        /* BASE THEME & CRISP PURE WHITE PALETTE */
        :root {
          --surface-canvas: #FFFFFF;
          --surface-sheet: #FFFFFF;
          --ink-primary: #0F172A;
          --ink-secondary: #475569;
          --ink-muted: #64748B;
          --accent-terracotta: #EA580C;
          --accent-amber: #F59E0B;
          --accent-alpine: #166534;
          --hairline-border: #F1F5F9;
          --reading-width: 720px;
        }

        .blog-wrapper * { box-sizing: border-box; }
        .blog-wrapper {
          background: #FFFFFF;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          color: var(--ink-primary);
          -webkit-font-smoothing: antialiased;
        }

        /* 1. TOP READING PROGRESS BAR */
        .reading-progress-track {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: transparent;
          z-index: 1001;
        }
        .reading-progress-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #D9531E, #F59E0B);
          transition: width 0.08s ease-out;
        }

        /* 2. STICKY READER BAR (Appears on scroll) */
        .sticky-reader-bar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 58px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(231, 229, 228, 0.9);
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 clamp(16px, 4vw, 48px);
          transform: translateY(-100%);
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        }
        .sticky-reader-bar.is-visible {
          transform: translateY(0);
        }
        .srb-left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
          flex: 1;
          margin-right: 20px;
        }
        .srb-logo {
          height: 30px;
          width: auto;
          flex-shrink: 0;
        }
        .srb-divider {
          width: 1px;
          height: 20px;
          background: var(--hairline-border);
          flex-shrink: 0;
        }
        .srb-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 700;
          font-size: 15px;
          color: var(--ink-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .srb-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .srb-cta-btn {
          background: var(--accent-terracotta);
          color: #ffffff !important;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 9999px;
          text-decoration: none;
          transition: background 0.15s, transform 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .srb-cta-btn:hover {
          background: #C2410C;
          transform: translateY(-1px);
        }

        /* 3. PRIMARY NAVIGATION */
        .bp-nav {
          background: #FFFFFF;
          border-bottom: 1px solid var(--hairline-border);
        }
        .bp-nav-inner {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 clamp(20px, 4vw, 40px);
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bp-brand {
          display: flex;
          align-items: center;
          text-decoration: none;
        }
        .bp-nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .bp-verified-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--accent-alpine);
          background: #EBF5EE;
          border: 1px solid #D1E7DD;
          padding: 5px 12px;
          border-radius: 9999px;
          letter-spacing: 0.3px;
        }
        .bp-pulse-dot {
          width: 7px;
          height: 7px;
          background: #10B981;
          border-radius: 50%;
          display: inline-block;
          animation: pulseRing 2s infinite;
        }
        @keyframes pulseRing {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* 4. MAIN ARTICLE PAGE LAYOUT */
        .bp-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 32px clamp(16px, 4vw, 36px) 96px;
        }

        /* BREADCRUMB & LOCATION COORDINATES */
        .bp-breadcrumb-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
          font-size: 13px;
        }
        .bp-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--ink-muted);
          font-weight: 500;
        }
        .bp-breadcrumbs a {
          color: var(--ink-secondary);
          text-decoration: none;
          transition: color 0.15s;
        }
        .bp-breadcrumbs a:hover {
          color: var(--accent-terracotta);
        }
        .bp-coordinates-tag {
          font-family: 'Space Grotesk', monospace;
          font-size: 11.5px;
          color: var(--ink-muted);
          background: #F1F1EF;
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        /* ARTICLE HEADER & EDITORIAL TITLE */
        .bp-header {
          max-width: 900px;
          margin: 0 auto 36px;
          text-align: left;
        }
        .bp-category-badge {
          display: inline-block;
          color: var(--accent-terracotta);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .bp-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(30px, 4.2vw, 52px);
          font-weight: 900;
          color: var(--ink-primary);
          line-height: 1.16;
          margin: 0 0 24px;
          letter-spacing: -0.8px;
        }

        /* AUTHOR MASTHEAD ROW */
        .bp-author-masthead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px 0;
          border-top: 1px solid var(--hairline-border);
          border-bottom: 1px solid var(--hairline-border);
          flex-wrap: wrap;
        }
        .bp-author-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .bp-author-avatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: linear-gradient(135deg, #D9531E, #F59E0B);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .bp-author-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .bp-author-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bp-author-name {
          font-weight: 700;
          font-size: 15px;
          color: var(--ink-primary);
        }
        .bp-author-badge {
          font-size: 11px;
          font-weight: 700;
          background: #EBF5EE;
          color: var(--accent-alpine);
          padding: 2px 8px;
          border-radius: 9999px;
        }
        .bp-meta-sub {
          font-size: 13px;
          color: var(--ink-muted);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bp-author-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .bp-audit-seal {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          color: #92400E;
          padding: 5px 12px;
          border-radius: 8px;
        }

        /* 5. COVER HERO: HIGH RES PHOTO OR TYPOGRAPHIC COVER POSTER FALLBACK */
        .bp-hero-container {
          margin-bottom: 48px;
          width: 100%;
        }
        .bp-hero-box {
          position: relative;
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 12px 36px rgba(0,0,0,0.06);
          background: #E7E5E4;
        }
        .bp-hero-img {
          width: 100%;
          max-height: 560px;
          object-fit: cover;
          display: block;
        }
        .bp-hero-caption {
          position: absolute;
          bottom: 14px;
          right: 16px;
          background: rgba(18, 22, 25, 0.75);
          backdrop-filter: blur(10px);
          color: #FAF9F6;
          font-size: 11.5px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 9999px;
        }

        /* TYPOGRAPHIC COVER POSTER FALLBACK (ZERO BLACK BOXES FOREVER) */
        .bp-poster-fallback {
          position: relative;
          width: 100%;
          min-height: 380px;
          border-radius: 20px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          padding: clamp(28px, 5vw, 48px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.03);
        }
        .bp-poster-topo {
          position: absolute;
          top: -20%;
          right: -10%;
          width: 80%;
          height: 140%;
          opacity: 0.18;
          pointer-events: none;
        }
        .bp-poster-top-bar {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          border-bottom: 1px solid #E2E8F0;
          padding-bottom: 16px;
        }
        .bp-poster-stamp {
          font-family: 'Space Grotesk', monospace;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: var(--accent-terracotta);
          text-transform: uppercase;
        }
        .bp-poster-audit {
          font-size: 12px;
          font-weight: 700;
          color: #4B5563;
        }
        .bp-poster-body {
          position: relative;
          z-index: 2;
          margin: 36px 0;
        }
        .bp-poster-watermark {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(32px, 5vw, 68px);
          font-weight: 900;
          color: #121619;
          letter-spacing: -1.5px;
          line-height: 1.05;
          margin: 0 0 12px;
        }
        .bp-poster-subtitle {
          font-size: clamp(15px, 2vw, 18px);
          color: #4A5568;
          max-width: 680px;
          line-height: 1.6;
          font-weight: 500;
        }
        .bp-poster-bottom-bar {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 13px;
          color: #4B5563;
          border-top: 1px solid rgba(0,0,0,0.06);
          padding-top: 16px;
        }
        .bp-poster-badge-zero {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: var(--accent-alpine);
        }

        /* 6. TWO-COLUMN ASYMMETRIC MAGAZINE GRID */
        .bp-magazine-grid {
          display: grid;
          grid-template-columns: minmax(0, 720px) 340px;
          justify-content: center;
          gap: 56px;
          align-items: start;
        }

        @media (max-width: 1120px) {
          .bp-magazine-grid {
            grid-template-columns: minmax(0, 720px);
            gap: 40px;
          }
        }

        /* COLUMN A: 720px GOLDEN READING COLUMN */
        .bp-reading-column {
          width: 100%;
          max-width: 720px;
        }

        /* 5-SECOND EXECUTIVE SKIM CAPSULE */
        .executive-skim-card {
          background: #FAF7F2;
          border: 1px solid #EADDCF;
          border-left: 4px solid var(--accent-terracotta);
          border-radius: 12px;
          padding: 24px 28px;
          margin-bottom: 36px;
        }
        .esc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .esc-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 19px;
          font-weight: 800;
          color: var(--ink-primary);
        }
        .esc-pill {
          font-family: 'Space Grotesk', monospace;
          font-size: 11px;
          font-weight: 700;
          color: var(--accent-terracotta);
          background: rgba(217, 83, 30, 0.1);
          padding: 4px 10px;
          border-radius: 9999px;
        }
        .esc-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 600px) {
          .esc-grid { grid-template-columns: 1fr; gap: 12px; }
        }
        .esc-item {
          background: #FFFFFF;
          border: 1px solid #E7E5E4;
          padding: 12px 16px;
          border-radius: 8px;
        }
        .esc-item-label {
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 0.8px;
          color: var(--ink-muted);
          margin-bottom: 4px;
        }
        .esc-item-val {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--ink-primary);
          line-height: 1.4;
        }

        /* ARTICLE BODY STYLING */
        .bp-article-body {
          font-size: 18px;
          line-height: 1.88;
          color: #2D3748;
          letter-spacing: -0.01em;
        }

        /* CLASSICAL EDITORIAL DROP CAP ON OPENING PARAGRAPH */
        .bp-article-body > p:first-of-type::first-letter {
          font-family: 'Playfair Display', Georgia, serif;
          float: left;
          font-size: 64px;
          line-height: 52px;
          padding-top: 4px;
          padding-right: 12px;
          padding-bottom: 0;
          font-weight: 900;
          color: var(--ink-primary);
        }

        .bp-article-body p {
          margin-bottom: 24px;
          line-height: 1.88;
          color: #2D3748;
        }

        .bp-article-body h1, .bp-article-body h2, .bp-article-body h3 {
          font-family: 'Playfair Display', Georgia, serif;
          color: var(--ink-primary);
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.3px;
        }
        .bp-article-body h1 {
          font-size: 32px;
          margin: 44px 0 18px;
        }
        .bp-article-body h2 {
          font-size: 26px;
          margin: 48px 0 18px;
          padding-bottom: 8px;
          border-bottom: 1.5px solid #E7E5E4;
          display: flex;
          align-items: baseline;
          gap: 10px;
        }
        .bp-article-body h2::before {
          content: '§';
          color: var(--accent-terracotta);
          font-weight: 400;
          font-size: 20px;
        }
        .bp-article-body h3 {
          font-size: 21px;
          margin: 36px 0 14px;
          color: #1A202C;
        }

        .bp-article-body strong {
          color: var(--ink-primary);
          font-weight: 700;
        }

        /* STAY TIER COMPARISON CARDS (REPLACES RAW BULLETS) */
        .stay-tier-deck {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin: 28px 0 36px;
        }
        .stay-tier-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .stay-tier-card:hover {
          transform: translateY(-2px);
          border-color: #CBD5E1;
          box-shadow: 0 6px 18px rgba(0,0,0,0.05);
        }
        .stay-tier-card.tier-budget {
          border-left: 4px solid #64748B;
        }
        .stay-tier-card.tier-mid {
          border-left: 4px solid var(--accent-terracotta);
          background: #FFFAF6;
        }
        .stay-tier-card.tier-luxury {
          border-left: 4px solid #D97706;
          background: #FFFDF9;
        }
        .st-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        .st-badge {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .st-icon {
          font-size: 18px;
        }
        .st-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 700;
          font-size: 16px;
          color: var(--ink-primary);
        }
        .st-price {
          font-family: 'Space Grotesk', monospace;
          font-size: 14px;
          font-weight: 800;
          color: var(--accent-terracotta);
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          padding: 4px 12px;
          border-radius: 9999px;
        }
        .st-desc {
          margin-top: 8px;
          font-size: 14px;
          color: var(--ink-secondary);
          line-height: 1.55;
        }
        .stay-tier-note {
          font-size: 14px;
          color: var(--ink-muted);
          padding: 4px 8px;
        }

        /* GROUND REALITY & SCAM ALERT CALLOUT */
        .ground-reality-callout {
          background: #FFFBEB;
          border: 1px solid #FCD34D;
          border-left: 4px solid #D97706;
          border-radius: 12px;
          padding: 20px 24px;
          margin: 32px 0;
        }
        .gr-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .gr-icon {
          font-size: 18px;
        }
        .gr-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.8px;
          color: #92400E;
        }
        .gr-badge {
          font-size: 11px;
          font-weight: 700;
          background: #FDE68A;
          color: #78350F;
          padding: 2px 8px;
          border-radius: 9999px;
          margin-left: auto;
        }
        .gr-content {
          font-size: 15.5px;
          line-height: 1.7;
          color: #78350F;
        }

        /* LOCAL INSIDER SECRET CALLOUT */
        .insider-secret-callout {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-left: 4px solid var(--accent-terracotta);
          border-radius: 12px;
          padding: 20px 24px;
          margin: 32px 0;
        }
        .is-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .is-icon {
          font-size: 18px;
        }
        .is-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.8px;
          color: var(--accent-terracotta);
        }
        .is-badge {
          font-size: 11px;
          font-weight: 700;
          background: rgba(217, 83, 30, 0.1);
          color: var(--accent-terracotta);
          padding: 2px 8px;
          border-radius: 9999px;
          margin-left: auto;
        }
        .is-content {
          font-size: 15.5px;
          line-height: 1.7;
          color: #374151;
        }

        /* BLOCKQUOTE */
        .bp-article-body blockquote {
          margin: 36px 0;
          padding: 20px 28px;
          border-left: 3px solid var(--accent-terracotta);
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-left: 4px solid var(--accent-terracotta);
          border-radius: 0 12px 12px 0;
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic;
          font-size: 20px;
          color: var(--ink-primary);
          line-height: 1.6;
        }

        /* TABLES */
        .table-wrap {
          width: 100%;
          overflow-x: auto;
          margin: 32px 0;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
        }
        .blog-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14.5px;
          background: #FFFFFF;
        }
        .blog-table th {
          background: #181E24;
          color: #FFFFFF;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          padding: 14px 18px;
          text-align: left;
        }
        .blog-table td {
          padding: 14px 18px;
          border-bottom: 1px solid #F1F5F9;
          color: #334155;
          vertical-align: top;
        }
        .blog-table tr:nth-child(even) td {
          background: #F8FAFC;
        }

        /* INTERACTIVE LOCAL TARIFF CALCULATOR */
        .tariff-calculator-widget {
          background: #FFFFFF;
          border: 1px solid #E7E5E4;
          border-radius: 16px;
          padding: 28px;
          margin: 40px 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }
        .tc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .tc-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 20px;
          font-weight: 800;
          color: var(--ink-primary);
        }
        .tc-badge {
          font-family: 'Space Grotesk', monospace;
          font-size: 11px;
          font-weight: 700;
          background: #EBF5EE;
          color: var(--accent-alpine);
          padding: 4px 10px;
          border-radius: 9999px;
        }
        .tc-slider-box {
          margin-bottom: 24px;
        }
        .tc-slider-label {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 700;
          color: var(--ink-primary);
          margin-bottom: 8px;
        }
        .tc-slider {
          width: 100%;
          height: 6px;
          background: #E5E7EB;
          border-radius: 9999px;
          outline: none;
          accent-color: var(--accent-terracotta);
          cursor: pointer;
        }
        .tc-results-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 640px) {
          .tc-results-grid { grid-template-columns: 1fr; }
        }
        .tc-tier-box {
          background: #FAF9F6;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 14px;
          text-align: center;
        }
        .tc-tier-box.highlight {
          background: #FFFAF6;
          border-color: #FDBA74;
        }
        .tc-tier-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--ink-secondary);
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .tc-tier-cost {
          font-family: 'Space Grotesk', monospace;
          font-size: 19px;
          font-weight: 800;
          color: var(--ink-primary);
        }
        .tc-tier-box.highlight .tc-tier-cost {
          color: var(--accent-terracotta);
        }

        /* FAQ ACCORDION */
        .faq-accordion {
          margin: 28px 0 40px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .faq-accordion-item {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 0 20px;
          transition: border-color 0.2s;
        }
        .faq-accordion-item[open] {
          border-color: #CBD5E1;
        }
        .faq-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 0;
          cursor: pointer;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--ink-primary);
          list-style: none;
        }
        .faq-summary::-webkit-details-marker { display: none; }
        .faq-summary::marker { display: none; }
        .faq-chevron-icon {
          color: #94A3B8;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .faq-accordion-item[open] .faq-chevron-icon {
          transform: rotate(180deg);
          color: var(--accent-terracotta);
        }
        .faq-answer {
          padding: 0 0 18px;
          font-size: 16px;
          line-height: 1.8;
          color: #4A5568;
          border-top: 1px solid #F1F5F9;
          margin-top: 4px;
          padding-top: 14px;
        }

        /* COLUMN B: STICKY EDITORIAL DESK (SIDEBAR) */
        .bp-sidebar {
          position: sticky;
          top: 80px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        @media (max-width: 1120px) {
          .bp-sidebar { display: none; }
        }

        .bp-sidebar-card {
          background: #FFFFFF;
          border: 1px solid var(--hairline-border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.02);
        }

        /* KINETIC TABLE OF CONTENTS */
        .bp-toc-header {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--ink-muted);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bp-toc-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .bp-toc-link {
          font-size: 13.5px;
          font-weight: 500;
          color: var(--ink-secondary);
          text-decoration: none;
          line-height: 1.45;
          display: block;
          padding: 4px 0 4px 12px;
          border-left: 2px solid transparent;
          transition: all 0.15s;
        }
        .bp-toc-link:hover {
          color: var(--accent-terracotta);
          border-left-color: #FDBA74;
        }
        .bp-toc-link.is-active {
          color: var(--accent-terracotta);
          font-weight: 700;
          border-left-color: var(--accent-terracotta);
        }

        /* SEASON & TARIFF BAROMETER WIDGET */
        .barometer-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 17px;
          font-weight: 800;
          color: var(--ink-primary);
          margin-bottom: 12px;
        }
        .barometer-status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          padding: 8px 12px;
          background: #FAF9F6;
          border-radius: 8px;
          margin-bottom: 10px;
        }
        .barometer-badge {
          font-family: 'Space Grotesk', monospace;
          font-size: 11px;
          font-weight: 700;
          color: #B45309;
          background: #FEF3C7;
          padding: 2px 8px;
          border-radius: 4px;
        }

        /* DIRECT LOCAL OPERATOR CARD */
        .operator-bridge-card {
          background: linear-gradient(135deg, #181E24 0%, #0F1316 100%);
          color: #FFFFFF;
          border-radius: 16px;
          padding: 24px;
        }
        .ob-badge {
          font-family: 'Space Grotesk', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #34D399;
          margin-bottom: 8px;
          display: inline-block;
        }
        .ob-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 18px;
          font-weight: 800;
          line-height: 1.3;
          margin: 0 0 10px;
          color: #FFFFFF;
        }
        .ob-text {
          font-size: 13px;
          color: #94A3B8;
          line-height: 1.6;
          margin-bottom: 18px;
        }
        .ob-btn {
          display: block;
          text-align: center;
          background: var(--accent-terracotta);
          color: #FFFFFF !important;
          font-size: 13.5px;
          font-weight: 700;
          padding: 10px 16px;
          border-radius: 8px;
          text-decoration: none;
          transition: background 0.15s;
        }
        .ob-btn:hover {
          background: #C2410C;
        }

        /* 7. MOBILE CHAPTER PILL (ON SCREENS < 1024PX) */
        .mobile-chapter-bar {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 998;
          display: none;
        }
        @media (max-width: 1120px) {
          .mobile-chapter-bar { display: block; }
        }
        .mobile-chapter-btn {
          background: #181E24;
          color: #FFFFFF;
          border: 1px solid rgba(255,255,255,0.15);
          font-size: 13px;
          font-weight: 700;
          padding: 10px 20px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          cursor: pointer;
        }
        .mobile-toc-drawer {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          max-height: 70vh;
          background: #FFFFFF;
          border-top: 1px solid #E5E7EB;
          border-radius: 20px 20px 0 0;
          padding: 24px clamp(16px, 4vw, 28px) 36px;
          z-index: 1002;
          overflow-y: auto;
          box-shadow: 0 -10px 30px rgba(0,0,0,0.15);
          transform: translateY(100%);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mobile-toc-drawer.is-open {
          transform: translateY(0);
        }
        .mobile-toc-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 1001;
          display: none;
        }
        .mobile-toc-overlay.is-open {
          display: block;
        }

        /* 8. RECOMMENDED STORIES HORIZONTAL GRID */
        .bp-recommended-section {
          margin-top: 64px;
          padding-top: 48px;
          border-top: 1px solid var(--hairline-border);
          width: 100%;
        }
        .bp-recommended-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(24px, 3vw, 34px);
          font-weight: 800;
          color: var(--ink-primary);
          margin: 0 0 6px;
        }
        .bp-recommended-sub {
          font-size: 14.5px;
          color: var(--ink-muted);
          margin-bottom: 32px;
        }
        .bp-recommended-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }
        @media (max-width: 900px) {
          .bp-recommended-grid { grid-template-columns: 1fr; gap: 20px; }
        }
        .bp-rec-card {
          background: #FFFFFF;
          border: 1px solid var(--hairline-border);
          border-radius: 16px;
          overflow: hidden;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .bp-rec-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0,0,0,0.06);
        }
        .bp-rec-img-box {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #E5E7EB;
          overflow: hidden;
        }
        .bp-rec-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.35s ease;
        }
        .bp-rec-card:hover .bp-rec-img {
          transform: scale(1.04);
        }
        .bp-rec-cat {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(18, 22, 25, 0.85);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .bp-rec-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .bp-rec-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 17px;
          font-weight: 700;
          color: var(--ink-primary);
          line-height: 1.4;
          margin: 0 0 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .bp-rec-excerpt {
          font-size: 13.5px;
          color: var(--ink-secondary);
          line-height: 1.6;
          margin: 0 0 16px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }
        .bp-rec-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: var(--ink-muted);
          border-top: 1px solid #F1F5F9;
          padding-top: 12px;
        }
        .bp-rec-arrow {
          color: var(--accent-terracotta);
          font-weight: 700;
        }
      `}</style>

      {/* READING PROGRESS BAR AT VERY TOP */}
      <div className="reading-progress-track">
        <div className="reading-progress-fill" id="reading-progress-fill" suppressHydrationWarning />
      </div>

      {/* STICKY READER BAR (SLIDES DOWN ON SCROLL) */}
      <header className="sticky-reader-bar" id="sticky-reader-bar" suppressHydrationWarning>
        <div className="srb-left">
          <Link href="/">
            <img src="/tripdm-logo.png" alt="TripDM" className="srb-logo" />
          </Link>
          <div className="srb-divider" />
          <div className="srb-title">{blog.title}</div>
        </div>
        <div className="srb-right">
          <Link href="/" className="srb-cta-btn">
            Find Travel Agents →
          </Link>
        </div>
      </header>

      <div className="blog-wrapper">
        {/* PRIMARY TOP NAV */}
        <nav className="bp-nav">
          <div className="bp-nav-inner">
            <Link href="/" className="bp-brand">
              <img src="/tripdm-logo.png" alt="TripDM" style={{ height: 54, width: 'auto', objectFit: 'contain' }} />
            </Link>
            <div className="bp-nav-right">
              <Link href="/" style={{ color: '#4A5568', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Find Travel Agents →
              </Link>
            </div>
          </div>
        </nav>

        {/* MAIN CONTAINER */}
        <main className="bp-container">
          {/* BREADCRUMB ROW */}
          <div className="bp-breadcrumb-row">
            <div className="bp-breadcrumbs">
              <Link href="/">Home</Link>
              <span>/</span>
              <Link href="/blog">Blog</Link>
              <span>/</span>
              <span>{blog.category}</span>
            </div>
          </div>

          {/* ARTICLE HEADER (ABOVE HERO) */}
          <header className="bp-header">
            {blog.category && <span className="bp-category-badge">{blog.category}</span>}
            <h1 className="bp-title">{blog.title}</h1>

            {/* AUTHOR MASTHEAD ROW */}
            <div className="bp-author-masthead">
              <div className="bp-author-left">
                <div className="bp-author-avatar">
                  {blog.author.charAt(0)}
                </div>
                <div className="bp-author-info">
                  <div className="bp-author-name-row">
                    <span className="bp-author-name">By {blog.author}</span>
                  </div>
                  <div className="bp-meta-sub">
                    <span>{formatDate(blog.publishedAt)}</span>
                    <span>•</span>
                    <span>{blog.readTime || '8 min read'}</span>
                    <span>•</span>
                    <BlogViewTracker slug={blog.slug} blogId={blog.id} initialViews={blog.views} fallbackViewsText={mainViews} />
                  </div>
                </div>
              </div>

              <div className="bp-author-right">
                <BlogShareBar url={`https://tripdm.com/blog/${blog.slug}`} title={blog.title} />
              </div>
            </div>
          </header>

          {/* COVER HERO: HIGH-RES PHOTO OR TYPOGRAPHIC COVER POSTER FALLBACK */}
          <div className="bp-hero-container">
            {blog.coverImage ? (
              <div className="bp-hero-box">
                <img src={blog.coverImage} alt={blog.title} className="bp-hero-img" />
              </div>
            ) : (
              /* TYPOGRAPHIC COVER POSTER FALLBACK: CLEAN DYNAMIC COVER FOR ANY ARTICLE */
              <div className="bp-poster-fallback">
                <svg className="bp-poster-topo" viewBox="0 0 500 500" fill="none" stroke="#D9531E" strokeWidth="1.2">
                  <path d="M50 100 Q150 50 250 120 T450 100 M20 200 Q180 140 300 220 T480 190 M10 300 Q140 240 280 320 T490 280 M40 400 Q160 350 320 420 T480 380" />
                </svg>
                <div className="bp-poster-top-bar">
                  <span className="bp-poster-stamp">TRIPDM EDITORIAL</span>
                  <span className="bp-poster-audit">{blog.category}</span>
                </div>
                <div className="bp-poster-body">
                  <h2 className="bp-poster-watermark">{blog.title}</h2>
                  {blog.excerpt && (
                    <p className="bp-poster-sub">{blog.excerpt}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* TWO-COLUMN ASYMMETRIC MAGAZINE GRID */}
          <div className="bp-magazine-grid">
            {/* COLUMN A: 720PX READING COLUMN */}
            <article className="bp-reading-column">

              {/* ARTICLE BODY */}
              <div
                className="bp-article-body"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />

              {/* COMMENTS SECTION */}
              <BlogComments blogSlug={blog.slug} blogId={blog.id} blogTitle={blog.title} />
            </article>

            {/* COLUMN B: STICKY EDITORIAL DESK (DESKTOP SIDEBAR) */}
            <aside className="bp-sidebar">
              {/* KINETIC TABLE OF CONTENTS */}
              {tocItems.length > 0 && (
                <div className="bp-sidebar-card">
                  <div className="bp-toc-header">
                    <span>Table of Contents</span>
                    <span>📑</span>
                  </div>
                  <ul className="bp-toc-list">
                    {tocItems.map((item) => (
                      <li key={item.id}>
                        <a href={`#${item.id}`} className="bp-toc-link">
                          {item.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>

          {/* MOBILE CHAPTER PILL (OPENS TOC ON PHONE SCREENS) */}
          {tocItems.length > 0 && (
            <>
              <div className="mobile-chapter-bar">
                <button
                  type="button"
                  id="mobile-toc-toggle-btn"
                  className="mobile-chapter-btn"
                >
                  <span>📑</span>
                  <span>Jump to Section</span>
                </button>
              </div>

              <div className="mobile-toc-overlay" id="mobile-toc-overlay" />
              <div className="mobile-toc-drawer" id="mobile-toc-drawer">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontFamily: 'Playfair Display', fontWeight: 800, fontSize: 18 }}>Table of Contents</div>
                  <button id="mobile-toc-close-btn" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}>✕</button>
                </div>
                <ul className="bp-toc-list">
                  {tocItems.map((item) => (
                    <li key={item.id} style={{ marginBottom: 8 }}>
                      <a href={`#${item.id}`} className="bp-toc-link mobile-jump-link">
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* RECOMMENDED STORIES SECTION */}
          {recommendedBlogs.length > 0 && (
            <section className="bp-recommended-section">
              <h2 className="bp-recommended-title">Recommended Field Dispatches</h2>
              <p className="bp-recommended-sub">Handpicked ground guides & budget itineraries from our verified travel team</p>

              <div className="bp-recommended-grid">
                {recommendedBlogs.map((item) => (
                  <Link key={item.id} href={`/blog/${item.slug}`} className="bp-rec-card">
                    <div className="bp-rec-img-box">
                      <img
                        src={item.coverImage || 'https://images.unsplash.com/photo-1506461883276-594a12b11ce3?auto=format&fit=crop&w=600&q=80'}
                        alt={item.title}
                        className="bp-rec-img"
                      />
                      {item.category && <span className="bp-rec-cat">{item.category}</span>}
                    </div>
                    <div className="bp-rec-body">
                      <h3 className="bp-rec-title">{item.title}</h3>
                      {item.excerpt && <p className="bp-rec-excerpt">{item.excerpt}</p>}
                      <div className="bp-rec-meta">
                        <span>{item.readTime || '6 min read'}</span>
                        <span className="bp-rec-arrow">Read Guide →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>

      {/* CLIENT SCRIPT FOR INTERACTION (SCROLL PROGRESS, STICKY READER BAR, TOC ACTIVE TRACKING, CALCULATOR) */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function initEditorialInteractions() {
              // 1. Reading Progress & Sticky Reader Bar
              var fill = document.getElementById('reading-progress-fill');
              var srb = document.getElementById('sticky-reader-bar');

              function onScroll() {
                var scrollTop = window.scrollY;
                var docHeight = document.documentElement.scrollHeight - window.innerHeight;
                var progress = docHeight > 0 ? Math.min(Math.round((scrollTop / docHeight) * 100), 100) : 0;

                if (fill) fill.style.width = progress + '%';

                if (srb) {
                  if (scrollTop > 380) {
                    srb.classList.add('is-visible');
                  } else {
                    srb.classList.remove('is-visible');
                  }
                }
              }

              window.addEventListener('scroll', onScroll, { passive: true });
              onScroll();

              // 2. Kinetic Table of Contents Active Tracking
              var tocLinks = document.querySelectorAll('.bp-toc-link');
              var headings = [];

              tocLinks.forEach(function(link) {
                var href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                  var el = document.getElementById(href.substring(1));
                  if (el) headings.push({ el: el, link: link });
                }
              });

              if (headings.length > 0) {
                window.addEventListener('scroll', function() {
                  var fromTop = window.scrollY + 120;
                  var current = headings[0];
                  for (var i = 0; i < headings.length; i++) {
                    if (headings[i].el.offsetTop <= fromTop) {
                      current = headings[i];
                    }
                  }
                  tocLinks.forEach(function(l) { l.classList.remove('is-active'); });
                  if (current && current.link) current.link.classList.add('is-active');
                }, { passive: true });
              }

              // 4. Smooth Anchor Scrolling with Header Offset Compensation
              document.addEventListener('click', function(e) {
                var target = e.target;
                while (target && target !== document) {
                  if (target.tagName === 'A' && target.getAttribute('href') && target.getAttribute('href').startsWith('#')) {
                    var id = target.getAttribute('href').substring(1);
                    var el = document.getElementById(id);
                    if (el) {
                      e.preventDefault();
                      var offset = -76;
                      var y = el.getBoundingClientRect().top + window.pageYOffset + offset;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                      history.pushState(null, '', '#' + id);

                      // Close mobile drawer if opened
                      var drawer = document.getElementById('mobile-toc-drawer');
                      var overlay = document.getElementById('mobile-toc-overlay');
                      if (drawer) drawer.classList.remove('is-open');
                      if (overlay) overlay.classList.remove('is-open');
                    }
                    break;
                  }
                  target = target.parentNode;
                }
              });

              // 5. Mobile TOC Drawer Toggle
              var toggleBtn = document.getElementById('mobile-toc-toggle-btn');
              var closeBtn = document.getElementById('mobile-toc-close-btn');
              var drawer = document.getElementById('mobile-toc-drawer');
              var overlay = document.getElementById('mobile-toc-overlay');

              if (toggleBtn && drawer && overlay) {
                toggleBtn.addEventListener('click', function() {
                  drawer.classList.add('is-open');
                  overlay.classList.add('is-open');
                });
              }
              if (closeBtn && drawer && overlay) {
                closeBtn.addEventListener('click', function() {
                  drawer.classList.remove('is-open');
                  overlay.classList.remove('is-open');
                });
              }
              if (overlay && drawer) {
                overlay.addEventListener('click', function() {
                  drawer.classList.remove('is-open');
                  overlay.classList.remove('is-open');
                });
              }
            }

            // Execute after React hydration completes
            if (typeof window !== 'undefined') {
              if (document.readyState === 'complete') {
                setTimeout(initEditorialInteractions, 100);
              } else {
                window.addEventListener('load', function() {
                  setTimeout(initEditorialInteractions, 100);
                });
              }
            }
          })();
        `
      }} />
    </>
  );
}
  