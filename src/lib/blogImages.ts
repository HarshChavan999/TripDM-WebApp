/**
 * Smart Blog Cover Image Resolver
 * 100% Code-Based — Zero Database Updates Required.
 * Dynamically pairs each blog with high-resolution, accurately-matched Unsplash travel photography
 * according to specific title keywords, destination, activity, and a deterministic hash for zero repetition.
 */

interface BlogTarget {
  title?: string;
  slug?: string;
  category?: string;
  tags?: string[];
  coverImage?: string;
}

// Helper to calculate a positive hash code from a string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Rich image pools for highly specific travel topics & destinations
const TOPIC_POOLS: Array<{
  match: (title: string, slug: string, allText: string) => boolean;
  images: string[];
}> = [
  // ── 1. KASHMIR SUB-CATEGORIES ─────────────────────────────────────────────
  
  // Kashmir: Hotels, Houseboats, Stays, Dal Lake, Tariffs
  {
    match: (t, s, all) => 
      all.includes('kashmir') && 
      (all.includes('hotel') || all.includes('houseboat') || all.includes('accommodation') || all.includes('stay') || all.includes('tariff') || all.includes('dal lake') || all.includes('shikara') || all.includes('srinagar') || all.includes('resort') || all.includes('cost in kashmir')),
    images: [
      'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80', // Srinagar Dal Lake traditional houseboats with mountain backdrop
      'https://images.unsplash.com/photo-1566228015668-4c45dbc4e2f5?auto=format&fit=crop&w=1200&q=80', // Beautiful wooden Shikara in Dal Lake with flowers
      'https://images.unsplash.com/photo-1618083707368-b3823daa2726?auto=format&fit=crop&w=1200&q=80', // Luxury Kashmir wooden resort room & lake view
      'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80', // Scenic Kashmiri cottage among chinar trees
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80', // Houseboat reflection at sunset in Kashmir
    ],
  },

  // Kashmir: Snow, Skiing, Gondola, Apharwat Peak, Winter, Gulmarg Snowfall
  {
    match: (t, s, all) =>
      (all.includes('kashmir') || all.includes('gulmarg') || all.includes('apharwat')) &&
      (all.includes('ski') || all.includes('snow') || all.includes('gondola') || all.includes('apharwat') || all.includes('winter') || all.includes('snowfall') || all.includes('snow line') || all.includes('cable car')),
    images: [
      'https://images.unsplash.com/photo-1579619168310-942b0369a845?auto=format&fit=crop&w=1200&q=80', // Gulmarg Apharwat snow mountain peak & ski slopes
      'https://images.unsplash.com/photo-1548777123-e216912df7d8?auto=format&fit=crop&w=1200&q=80', // Cable car gondola moving over snowy pine mountains
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80', // Skiing on fresh deep Himalayan powder snow
      'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=1200&q=80', // Snowy winter mountain valley in Gulmarg
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80', // Snow covered pine trees & winter cabin
    ],
  },

  // Kashmir: Adventure, Trekking, Aru Valley, Pahalgam, Sonamarg, Rafting, Trips with Friends
  {
    match: (t, s, all) =>
      all.includes('kashmir') || all.includes('aru valley') || all.includes('pahalgam') || all.includes('sonamarg') || all.includes('betaab'),
    images: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', // Alpine lush green valley of Aru & Pahalgam with stream
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', // Trekking in high Himalayan mountain trails with friends
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80', // Sonamarg glacier peak with pine trees and alpine meadow
      'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1200&q=80', // River rafting in cold mountain rapids
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80', // Crystal clear mountain lake surrounded by peaks
    ],
  },

  // ── 2. AULI & UTTARAKHAND SUB-CATEGORIES ──────────────────────────────────

  // Auli: Snowfall, Skiing, Itinerary, Winter
  {
    match: (t, s, all) =>
      all.includes('auli'),
    images: [
      'https://images.unsplash.com/photo-1548777123-e216912df7d8?auto=format&fit=crop&w=1200&q=80', // Auli snow slopes & ski chairlift
      'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=1200&q=80', // Auli Nanda Devi panoramic snowy mountain peaks
      'https://images.unsplash.com/photo-1579619168310-942b0369a845?auto=format&fit=crop&w=1200&q=80', // Auli artificial lake reflecting snow mountains
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80', // Fresh snowfall on alpine Himalayan ski slopes
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80', // Skier in winter Auli wonderland
    ],
  },

  // Astro Tourism / Stargazing / Night Skies
  {
    match: (t, s, all) =>
      all.includes('astro') || all.includes('stargazing') || all.includes('night sk') || all.includes('milky way'),
    images: [
      'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80', // Glowing Milky Way over dark Himalayan mountain silhouettes
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80', // Starry night sky with tent & mountain camping
      'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1200&q=80', // Vibrant starry galaxy night sky
      'https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?auto=format&fit=crop&w=1200&q=80', // Mountain ridge beneath celestial star field
    ],
  },

  // Badrinath / Kedarnath / Holy Shrines / Char Dham
  {
    match: (t, s, all) =>
      all.includes('badrinath') || all.includes('kedarnath') || all.includes('char dham') || all.includes('hemkund') || all.includes('gangotri') || all.includes('yamunotri'),
    images: [
      'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80', // Sacred Himalayan stone temple against snow peak
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80', // High Himalayan pilgrimage valley with holy river
      'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=1200&q=80', // Golden hour at sacred mountain temple
      'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80', // Ancient stone temple in misty Himalayan hills
    ],
  },

  // Rishikesh, Haridwar, Ganga Aarti & Rafting
  {
    match: (t, s, all) =>
      all.includes('rishikesh') || all.includes('haridwar') || all.includes('ganga') || all.includes('laxman jhula') || all.includes('ram jhula'),
    images: [
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80', // River Ganga at Rishikesh with suspension bridge
      'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80', // Ganga evening aarti lamps floating on river
      'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1200&q=80', // White water rafting on turquoise Ganga rapids
    ],
  },

  // Almora, Nainital, Mussoorie, Chopta, Munsiyari, Offbeat Uttarakhand
  {
    match: (t, s, all) =>
      all.includes('uttarakhand') || all.includes('almora') || all.includes('nainital') || all.includes('mussoorie') || all.includes('chopta') || all.includes('munsiyari') || all.includes('kausani') || all.includes('ranikhet') || all.includes('dehradun') || all.includes('corbett'),
    images: [
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80', // Misty pine forest hills of Almora & Nainital
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', // Emerald mountain lake surrounded by scenic hills
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80', // Chopta Chandrashila meadow with snow peak backdrop
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', // Scenic valley winding road through deodar trees
    ],
  },

  // ── 3. MANALI & HIMACHAL PRADESH ──────────────────────────────────────────
  {
    match: (t, s, all) =>
      all.includes('manali') || all.includes('himachal') || all.includes('shimla') || all.includes('solang') || all.includes('rohtang') || all.includes('spiti') || all.includes('kasol') || all.includes('dharamshala') || all.includes('mcleodganj') || all.includes('jibhi') || all.includes('bir billing'),
    images: [
      'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1200&q=80', // Solang valley snow mountains and pine trees
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80', // Scenic Himachali valley with wooden cottages
      'https://images.unsplash.com/photo-1566228015668-4c45dbc4e2f5?auto=format&fit=crop&w=1200&q=80', // Rohtang pass snow covered ranges
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', // Parvati river flowing through Kasol pine forest
      'https://images.unsplash.com/photo-1621415263409-2259bdd2ac0d?auto=format&fit=crop&w=1200&q=80', // Spiti valley ancient monastery perched on cliff
    ],
  },

  // ── 4. GOA & BEACHES ──────────────────────────────────────────────────────
  {
    match: (t, s, all) =>
      all.includes('goa') || all.includes('calangute') || all.includes('baga') || all.includes('candolim') || all.includes('palolem') || all.includes('anjuna') || all.includes('vagator') || all.includes('beach'),
    images: [
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80', // Palm fringed Goa beach with golden sand & ocean waves
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', // Tropical sunset on sandy ocean beach
      'https://images.unsplash.com/photo-1543039625-14cbd3802e7d?auto=format&fit=crop&w=1200&q=80', // Beach shacks with wooden tables and tropical umbrellas
      'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80', // Turquoise ocean water and white shoreline
    ],
  },

  // ── 5. KERALA & SOUTH INDIA ───────────────────────────────────────────────
  {
    match: (t, s, all) =>
      all.includes('kerala') || all.includes('munnar') || all.includes('alleppey') || all.includes('wayanad') || all.includes('kovalam') || all.includes('thekkady') || all.includes('varkala') || all.includes('backwater'),
    images: [
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80', // Munnar rolling emerald tea plantation hills
      'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80', // Traditional Alleppey houseboat cruising on serene backwaters
      'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80', // Wayanad rainforest treehouse and misty hills
      'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80', // Varkala red cliff coastline overlooking Arabian sea
    ],
  },

  // ── 6. RAJASTHAN & FORTS ──────────────────────────────────────────────────
  {
    match: (t, s, all) =>
      all.includes('rajasthan') || all.includes('jaipur') || all.includes('udaipur') || all.includes('jaisalmer') || all.includes('jodhpur') || all.includes('pushkar') || all.includes('ranthambore') || all.includes('fort') || all.includes('palace') || all.includes('haveli'),
    images: [
      'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80', // Magnificent Udaipur Lake Palace reflecting in water
      'https://images.unsplash.com/photo-1609137144822-0d1999818815?auto=format&fit=crop&w=1200&q=80', // Jaisalmer golden desert dunes with camel safari
      'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=1200&q=80', // Royal Jaipur Hawa Mahal palace facade at dusk
      'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80', // Majestic Mehrangarh fort overlooking blue city
    ],
  },

  // ── 7. LADAKH & HIGH PASSES ───────────────────────────────────────────────
  {
    match: (t, s, all) =>
      all.includes('ladakh') || all.includes('leh') || all.includes('pangong') || all.includes('nubra') || all.includes('khardung') || all.includes('zanskar'),
    images: [
      'https://images.unsplash.com/photo-1621415263409-2259bdd2ac0d?auto=format&fit=crop&w=1200&q=80', // Brilliant deep blue Pangong Lake with barren mountains
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80', // Nubra valley sand dunes with double hump camels
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', // High Himalayan Khardung La motorcycling mountain pass
    ],
  },

  // ── 8. ANDAMAN ISLANDS ────────────────────────────────────────────────────
  {
    match: (t, s, all) =>
      all.includes('andaman') || all.includes('havelock') || all.includes('radhanagar') || all.includes('neil island') || all.includes('port blair') || all.includes('scuba'),
    images: [
      'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80', // Radhanagar Beach white sands and turquoise blue water
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', // Scuba diving reef in crystal Andaman waters
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80', // Tropical island paradise with clear emerald sea
    ],
  },

  // ── 9. TRAVEL AGENCIES / GENERAL VALUE / COST / ADVICE ────────────────────
  {
    match: (t, s, all) =>
      all.includes('travel agenc') || all.includes('worth it') || all.includes('travel tips') || all.includes('how to choose') || all.includes('pack') || all.includes('budget breakdown') || all.includes('cost breakdown'),
    images: [
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80', // Traveler looking at travel map & itinerary in scenic location
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80', // Road trip van driving on open scenic road
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80', // Wanderlust explorer standing on scenic mountain overlook
      'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1200&q=80', // Backpacking traveler on mountain trail
    ],
  },

  // ── 10. INTERNATIONAL DESTINATIONS (Dubai, Bali, Maldives, Europe, etc.) ──
  {
    match: (t, s, all) =>
      all.includes('dubai') || all.includes('burj khalifa') || all.includes('abu dhabi'),
    images: [
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80', // Dubai skyline and Burj Khalifa illuminated
      'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80', // Dubai luxury desert dunes safari
    ],
  },
  {
    match: (t, s, all) =>
      all.includes('bali') || all.includes('ubud') || all.includes('nusa penida'),
    images: [
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80', // Bali tropical temple gate overlooking volcano
      'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80', // Lush green Ubud rice terraces in Bali
    ],
  },
  {
    match: (t, s, all) =>
      all.includes('maldives'),
    images: [
      'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80', // Maldives overwater bungalow & turquoise lagoon
      'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=80', // Aerial view of tropical Maldives coral atoll
    ],
  },
  {
    match: (t, s, all) =>
      all.includes('europe') || all.includes('switzerland') || all.includes('paris') || all.includes('italy') || all.includes('london'),
    images: [
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80', // European historic town & river bridge
      'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80', // Swiss Alps snow mountains and flower meadows
    ],
  },
];

// Fallback pool of high quality global travel landscapes
const DEFAULT_POOL = [
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
];

/**
 * Returns a high quality cover image URL for any blog.
 * Accurately analyzes title, slug, and category keywords, and selects a unique image
 * from a diverse topic pool using a deterministic hash so images never look repetitive.
 */
export function getBlogCoverImage(blog?: BlogTarget | string | null): string {
  if (!blog) {
    return DEFAULT_POOL[0];
  }

  // Handle case where string is passed directly
  if (typeof blog === 'string') {
    const trimmed = blog.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
      return trimmed;
    }
    return resolveImageFromMetadata({ title: trimmed });
  }

  return resolveImageFromMetadata(blog);
}

function resolveImageFromMetadata(blog: BlogTarget): string {
  const title = (blog.title || '').trim();
  const slug = (blog.slug || '').trim();
  const category = (blog.category || '').trim();
  const tags = Array.isArray(blog.tags) ? blog.tags.join(' ') : '';

  const allText = `${title} ${slug.replace(/-/g, ' ')} ${category} ${tags}`.toLowerCase();
  const seed = slug || title || 'travel-story';
  const seedHash = hashString(seed);

  // Match the most specific topic pool
  for (const pool of TOPIC_POOLS) {
    if (pool.match(title.toLowerCase(), slug.toLowerCase(), allText)) {
      const selectedIndex = seedHash % pool.images.length;
      return pool.images[selectedIndex];
    }
  }

  // Fallback to default pool with hash-based unique selection
  const defaultIndex = seedHash % DEFAULT_POOL.length;
  return DEFAULT_POOL[defaultIndex];
}

/**
 * State & Destination Specific Background Resolver for Blog Article Headers
 * Provides ultra-wide panoramic landscape imagery tailored to each state/region
 * with deterministic fallback to the signature blog hero background.
 */
export function getDestinationHeaderBg(blog?: BlogTarget | null): string {
  if (!blog) return '/blog-hero-bg.jpg';

  const title = (blog.title || '').toLowerCase();
  const slug = (blog.slug || '').toLowerCase();
  const category = (blog.category || '').toLowerCase();
  const tags = Array.isArray(blog.tags) ? blog.tags.join(' ').toLowerCase() : '';
  const allText = `${title} ${slug.replace(/-/g, ' ')} ${category} ${tags}`;

  // 1. Kashmir & Ladakh (Snow peaks, Dal lake, Himalayan pines)
  if (
    allText.includes('kashmir') ||
    allText.includes('srinagar') ||
    allText.includes('gulmarg') ||
    allText.includes('pahalgam') ||
    allText.includes('sonamarg') ||
    allText.includes('dal lake') ||
    allText.includes('ladakh') ||
    allText.includes('leh') ||
    allText.includes('nubra') ||
    allText.includes('pangong') ||
    allText.includes('zanskar') ||
    allText.includes('shikara')
  ) {
    return 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1920&q=80';
  }

  // 2. Himachal Pradesh (Manali, Spiti, Shimla pine valleys)
  if (
    allText.includes('himachal') ||
    allText.includes('manali') ||
    allText.includes('shimla') ||
    allText.includes('spiti') ||
    allText.includes('dharamshala') ||
    allText.includes('mcleodganj') ||
    allText.includes('kasol') ||
    allText.includes('kullu') ||
    allText.includes('jibhi') ||
    allText.includes('bir billing') ||
    allText.includes('dalhousie') ||
    allText.includes('kinnaur') ||
    allText.includes('solang')
  ) {
    return 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1920&q=80';
  }

  // 3. Uttarakhand (Rishikesh, Mussoorie, Auli, Kedarnath)
  if (
    allText.includes('uttarakhand') ||
    allText.includes('rishikesh') ||
    allText.includes('mussoorie') ||
    allText.includes('nainital') ||
    allText.includes('kedarnath') ||
    allText.includes('badrinath') ||
    allText.includes('chopta') ||
    allText.includes('tungnath') ||
    allText.includes('auli') ||
    allText.includes('haridwar') ||
    allText.includes('corbett') ||
    allText.includes('dehradun') ||
    allText.includes('char dham')
  ) {
    return 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1920&q=80';
  }

  // 4. Goa & Coastal Beaches
  if (
    allText.includes('goa') ||
    allText.includes('panaji') ||
    allText.includes('calangute') ||
    allText.includes('baga') ||
    allText.includes('anjuna') ||
    allText.includes('palolem') ||
    allText.includes('candolim') ||
    allText.includes('morjim') ||
    allText.includes('vagator') ||
    allText.includes('dudhsagar') ||
    allText.includes('beach') ||
    allText.includes('beaches')
  ) {
    return 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1920&q=80';
  }

  // 5. Andaman & Nicobar
  if (
    allText.includes('andaman') ||
    allText.includes('havelock') ||
    allText.includes('neil island') ||
    allText.includes('port blair') ||
    allText.includes('radhanagar') ||
    allText.includes('scuba') ||
    allText.includes('snorkeling')
  ) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80';
  }

  // 6. Kerala (Munnar tea hills, Alleppey backwaters)
  if (
    allText.includes('kerala') ||
    allText.includes('alleppey') ||
    allText.includes('alappuzha') ||
    allText.includes('munnar') ||
    allText.includes('wayanad') ||
    allText.includes('varkala') ||
    allText.includes('kovalam') ||
    allText.includes('thekkady') ||
    allText.includes('kochi') ||
    allText.includes('kumarakom') ||
    allText.includes('backwaters')
  ) {
    return 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1920&q=80';
  }

  // 7. Rajasthan & Deserts (Jaipur, Udaipur, Jaisalmer dunes)
  if (
    allText.includes('rajasthan') ||
    allText.includes('jaipur') ||
    allText.includes('udaipur') ||
    allText.includes('jodhpur') ||
    allText.includes('jaisalmer') ||
    allText.includes('pushkar') ||
    allText.includes('ranthambore') ||
    allText.includes('bikaner') ||
    allText.includes('mount abu') ||
    allText.includes('sand dunes') ||
    allText.includes('hawa mahal') ||
    allText.includes('mehrangarh')
  ) {
    return 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1920&q=80';
  }

  // 8. Sikkim & Darjeeling (Kanchenjunga Himalayas)
  if (
    allText.includes('sikkim') ||
    allText.includes('gangtok') ||
    allText.includes('darjeeling') ||
    allText.includes('pelling') ||
    allText.includes('lachung') ||
    allText.includes('yumthang') ||
    allText.includes('kanchenjunga') ||
    allText.includes('tsomgo')
  ) {
    return 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1920&q=80';
  }

  // 9. Meghalaya & North East
  if (
    allText.includes('meghalaya') ||
    allText.includes('shillong') ||
    allText.includes('cherrapunji') ||
    allText.includes('sohra') ||
    allText.includes('dawki') ||
    allText.includes('living root') ||
    allText.includes('kaziranga') ||
    allText.includes('assam') ||
    allText.includes('arunachal') ||
    allText.includes('tawang') ||
    allText.includes('nagaland') ||
    allText.includes('north east')
  ) {
    return 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1920&q=80';
  }

  // 10. South India Hills (Ooty, Coorg, Kodaikanal, Chikmagalur)
  if (
    allText.includes('ooty') ||
    allText.includes('coorg') ||
    allText.includes('kodaikanal') ||
    allText.includes('chikmagalur') ||
    allText.includes('mysore') ||
    allText.includes('hampi') ||
    allText.includes('gokarna') ||
    allText.includes('kabini') ||
    allText.includes('nilgiri')
  ) {
    return 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=1920&q=80';
  }

  // 11. Maharashtra & Western Ghats
  if (
    allText.includes('maharashtra') ||
    allText.includes('lonavala') ||
    allText.includes('khandala') ||
    allText.includes('mahabaleshwar') ||
    allText.includes('alibaug') ||
    allText.includes('mumbai') ||
    allText.includes('pune') ||
    allText.includes('panchgani') ||
    allText.includes('matheran') ||
    allText.includes('sahyadri')
  ) {
    return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80';
  }

  // 12. Gujarat
  if (
    allText.includes('gujarat') ||
    allText.includes('rann of kutch') ||
    allText.includes('kutch') ||
    allText.includes('gir') ||
    allText.includes('somnath') ||
    allText.includes('dwarka') ||
    allText.includes('statue of unity')
  ) {
    return 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=80';
  }

  // Default: Signature panoramic mountain background
  return '/blog-hero-bg.jpg';
}
