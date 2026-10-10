/**
 * Dynamic Destination Resolver with Universal Typo Tolerance & Autocorrect
 * Dynamically resolves any user search query (with or without misspellings like 'munbai', 'rajsthan', 'mnali', 'kasmeer')
 * to clean, exact canonical destination names WITHOUT appending artificial combinations.
 */

export interface DestinationMapPin {
  city: string;
  lat: number;
  lng: number;
  count: number;
}

export interface CanonicalDestination {
  id: string;
  displayName: string;
  stateOrCountry: string;
  isInternational?: boolean;
  keywords: string[];
  aliases: string[];
  center: [number, number];
  zoom: number;
  aboutText: string;
  image: string;
  popularSearches: string[];
  pins: DestinationMapPin[];
}

export interface ResolvedDestinationResult {
  canonicalKey: string;
  displayName: string;
  originalQuery: string;
  wasCorrected: boolean;
  correctedFrom?: string;
  keywords: string[];
  meta: CanonicalDestination;
}

// Fast Levenshtein distance for dynamic typo tolerance
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const al = a.length;
  const bl = b.length;
  const matrix: number[][] = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0));

  for (let i = 0; i <= al; i++) matrix[i][0] = i;
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[al][bl];
}

// Clean standalone canonical destination entries (Exact single place names only)
export const DESTINATION_DICTIONARY: Record<string, {
  displayName: string;
  stateOrCountry: string;
  isInternational?: boolean;
  keywords: string[];
  aliases: string[];
  lat: number;
  lng: number;
  zoom: number;
  aboutText: string;
  image: string;
  popularSearches: string[];
  pins: DestinationMapPin[];
}> = {
  // Cities & Regions
  mumbai: {
    displayName: 'Mumbai',
    stateOrCountry: 'Maharashtra',
    keywords: ['mumbai', 'bombay', 'navi mumbai', 'thane', 'gateway of india', 'marine drive', 'elephanta', 'juhu', 'bandra', 'colaba'],
    aliases: ['munbai', 'mubai', 'mumbay', 'mumbau', 'numbai', 'mumabi', 'bombay', 'mumb', 'mumbaii'],
    lat: 18.98,
    lng: 72.83,
    zoom: 9.5,
    aboutText: 'The City of Dreams, featuring iconic colonial architecture, bustling markets, coastal promenades, and vibrant city nightlife.',
    image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80',
    popularSearches: ['Gateway of India Tour', 'Marine Drive Walk', 'Elephanta Caves Tour', 'Mumbai City Sightseeing', 'South Mumbai Heritage Walk'],
    pins: [
      { city: 'South Mumbai', lat: 18.9220, lng: 72.8347, count: 12 },
      { city: 'Bandra', lat: 19.0596, lng: 72.8295, count: 8 },
      { city: 'Navi Mumbai', lat: 19.0330, lng: 73.0297, count: 6 },
    ],
  },
  manali: {
    displayName: 'Manali',
    stateOrCountry: 'Himachal Pradesh',
    keywords: ['manali', 'kullu', 'solang', 'solang valley', 'rohtang', 'rohtang pass', 'atal tunnel', 'old manali', 'hadimba temple', 'sethan'],
    aliases: ['manli', 'mnali', 'mnaali', 'manalli', 'manaali', 'kullumanali'],
    lat: 32.2432,
    lng: 77.1892,
    zoom: 9.0,
    aboutText: 'Nestled in the Himalayas, Manali offers snowcapped peaks, adventure sports in Solang Valley, pine forests, and mountain cafes.',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80',
    popularSearches: ['Solang Valley Adventure', 'Rohtang Pass Snow Tour', 'Atal Tunnel & Sissu Tour', 'Manali Honeymoon Package', 'Old Manali Cafes'],
    pins: [
      { city: 'Manali Town', lat: 32.2432, lng: 77.1892, count: 10 },
      { city: 'Solang Valley', lat: 32.3167, lng: 77.1558, count: 6 },
      { city: 'Old Manali', lat: 32.2548, lng: 77.1750, count: 5 },
    ],
  },
  shimla: {
    displayName: 'Shimla',
    stateOrCountry: 'Himachal Pradesh',
    keywords: ['shimla', 'kufri', 'chail', 'mashobra', 'narkanda', 'mall road', 'jakhoo', 'ridge shimla'],
    aliases: ['simla', 'shiml', 'kufri', 'chail', 'mashobra'],
    lat: 31.1048,
    lng: 77.1734,
    zoom: 9.0,
    aboutText: 'The Queen of Hills, celebrated for colonial architecture on the Mall Road, toy train rides, pine forests, and snow views at Kufri.',
    image: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&q=80',
    popularSearches: ['Shimla Mall Road & Ridge', 'Kufri Snow Adventure', 'Toy Train Kalka-Shimla', 'Chail Palace Tour', 'Mashobra Nature Walk'],
    pins: [
      { city: 'Shimla City', lat: 31.1048, lng: 77.1734, count: 8 },
      { city: 'Kufri', lat: 31.0979, lng: 77.2678, count: 6 },
    ],
  },
  himachal: {
    displayName: 'Himachal Pradesh',
    stateOrCountry: 'India',
    keywords: ['himachal', 'himachal pradesh', 'hp', 'shimla', 'manali', 'kullu', 'dharamshala', 'mcleodganj', 'dalhousie', 'khajjiar', 'spiti', 'kasol', 'jibhi', 'bir billing'],
    aliases: ['himchal', 'himachal', 'himachalpradesh', 'himachal pradesh', 'hp'],
    lat: 31.8,
    lng: 77.3,
    zoom: 7.5,
    aboutText: 'Snow-clad mountains, apple orchards, paragliding in Bir Billing, Tibetan culture in Dharamshala, and high-altitude road trips in Spiti.',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80',
    popularSearches: ['Shimla Manali Volvo Tour', 'Dharamshala & McLeodGanj', 'Spiti Valley Road Trip', 'Dalhousie & Khajjiar', 'Kasol & Parvati Valley'],
    pins: [
      { city: 'Manali', lat: 32.2432, lng: 77.1892, count: 10 },
      { city: 'Shimla', lat: 31.1048, lng: 77.1734, count: 8 },
      { city: 'Dharamshala', lat: 32.2190, lng: 76.3234, count: 7 },
      { city: 'Spiti Valley', lat: 32.2461, lng: 78.0349, count: 6 },
    ],
  },
  rajasthan: {
    displayName: 'Rajasthan',
    stateOrCountry: 'India',
    keywords: ['rajasthan', 'jaipur', 'udaipur', 'jodhpur', 'jaisalmer', 'pushkar', 'bikaner', 'ajmer', 'mount abu', 'ranthambore', 'chittorgarh', 'kumbhalgarh', 'desert safari'],
    aliases: ['rajsthan', 'rajastan', 'rajashtan', 'rajathan', 'rajasathan', 'rajsthn', 'rajputana'],
    lat: 26.5,
    lng: 74.0,
    zoom: 6.5,
    aboutText: 'The land of royalty, grand palaces, golden sand dunes, majestic hill forts, and vibrant folk traditions.',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80',
    popularSearches: ['Jaipur Pink City Tour', 'Udaipur Lake Palace Tour', 'Jodhpur Blue City', 'Jaisalmer Desert Safari', 'Rajasthan Forts & Palaces'],
    pins: [
      { city: 'Jaipur', lat: 26.9124, lng: 75.7873, count: 11 },
      { city: 'Udaipur', lat: 24.5854, lng: 73.7125, count: 9 },
      { city: 'Jodhpur', lat: 26.2389, lng: 73.0243, count: 6 },
      { city: 'Jaisalmer', lat: 26.9157, lng: 70.9083, count: 5 },
    ],
  },
  jaipur: {
    displayName: 'Jaipur',
    stateOrCountry: 'Rajasthan',
    keywords: ['jaipur', 'pink city', 'hawa mahal', 'amber fort', 'city palace', 'nahargarh', 'jaigarh', 'jal mahal', 'chokhi dhani'],
    aliases: ['jaipr', 'jaipur', 'pinkcity', 'amberfort'],
    lat: 26.9124,
    lng: 75.7873,
    zoom: 10.0,
    aboutText: 'The Pink City, featuring the iconic Hawa Mahal, grand Amber Fort, royal City Palace, and rich handicraft bazaars.',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80',
    popularSearches: ['Amber Fort & Jal Mahal', 'Hawa Mahal & City Palace', 'Chokhi Dhani Cultural Night', 'Jaipur Heritage Day Tour'],
    pins: [
      { city: 'Jaipur Old City', lat: 26.9124, lng: 75.7873, count: 10 },
      { city: 'Amer', lat: 26.9855, lng: 75.8513, count: 6 },
    ],
  },
  udaipur: {
    displayName: 'Udaipur',
    stateOrCountry: 'Rajasthan',
    keywords: ['udaipur', 'city of lakes', 'lake pichola', 'city palace udaipur', 'fateh sagar', 'jag mandir', 'saheliyon ki bari', 'sajjangarh'],
    aliases: ['udaipr', 'udaipur', 'lakecity', 'lakepichola'],
    lat: 24.5854,
    lng: 73.7125,
    zoom: 10.0,
    aboutText: 'The City of Lakes and Venice of the East, famed for Lake Pichola, royal Lake Palace, and romantic sunset views.',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80',
    popularSearches: ['Lake Pichola Boat Cruise', 'Udaipur City Palace Tour', 'Jag Mandir Sunset', 'Udaipur Honeymoon Package'],
    pins: [
      { city: 'Lake Pichola', lat: 24.5764, lng: 73.6800, count: 8 },
      { city: 'Udaipur City', lat: 24.5854, lng: 73.7125, count: 7 },
    ],
  },
  kashmir: {
    displayName: 'Kashmir',
    stateOrCountry: 'Jammu & Kashmir',
    keywords: ['kashmir', 'srinagar', 'gulmarg', 'pahalgam', 'sonmarg', 'sonamarg', 'dal lake', 'yusmarg', 'doodhpathri', 'mughal gardens', 'tulip garden'],
    aliases: ['kasmeer', 'kashmr', 'kashmer', 'kashmirr', 'kasmir', 'kashmiir', 'kashmeer', 'srinagar', 'srinager', 'gulmarg', 'pahalgam', 'sonmarg'],
    lat: 34.12,
    lng: 74.85,
    zoom: 8.5,
    aboutText: 'Snow-capped mountain ranges, pristine shikara rides on serene Dal Lake, lush alpine valleys, and world-renowned skiing slopes.',
    image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=800&q=80',
    popularSearches: ['Srinagar Houseboat Stay', 'Gulmarg Gondola Ride', 'Pahalgam Valley Tour', 'Sonmarg Glacier Trip', 'Kashmir Honeymoon Package'],
    pins: [
      { city: 'Srinagar', lat: 34.0837, lng: 74.7973, count: 12 },
      { city: 'Gulmarg', lat: 34.0484, lng: 74.3805, count: 8 },
      { city: 'Pahalgam', lat: 34.0163, lng: 75.3150, count: 6 },
      { city: 'Sonmarg', lat: 34.3100, lng: 75.2900, count: 5 },
    ],
  },
  kerala: {
    displayName: 'Kerala',
    stateOrCountry: 'India',
    keywords: ['kerala', 'kochi', 'cochin', 'munnar', 'alleppey', 'alappuzha', 'wayanad', 'thekkady', 'kovalam', 'varkala', 'kumarakom', 'poovar', 'gods own country'],
    aliases: ['kerla', 'karela', 'keralam', 'keraala', 'kerela', 'munnar', 'alleppey', 'kochi', 'wayanad'],
    lat: 10.2,
    lng: 76.5,
    zoom: 7.5,
    aboutText: "God's Own Country boasts tranquil backwaters, tea plantation hills in Munnar, Ayurvedic wellness resorts, and tropical beaches.",
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=80',
    popularSearches: ['Munnar Tea Hills', 'Alleppey Houseboat Cruise', 'Kochi Heritage & Fort', 'Wayanad Nature & Waterfalls', 'Kerala Honeymoon Special'],
    pins: [
      { city: 'Munnar', lat: 10.0889, lng: 77.0595, count: 8 },
      { city: 'Alleppey', lat: 9.4981, lng: 76.3388, count: 7 },
      { city: 'Kochi', lat: 9.9312, lng: 76.2673, count: 9 },
      { city: 'Wayanad', lat: 11.6854, lng: 76.1320, count: 5 },
    ],
  },
  munnar: {
    displayName: 'Munnar',
    stateOrCountry: 'Kerala',
    keywords: ['munnar', 'tea gardens munnar', 'eravikulam', 'mattupetty dam', 'anamudi', 'top station munnar', 'attukal'],
    aliases: ['munar', 'munnaar', 'munnar'],
    lat: 10.0889,
    lng: 77.0595,
    zoom: 10.0,
    aboutText: 'Famous South Indian hill station covered in rolling green tea plantations, misty mountain peaks, and cool waterfalls.',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=80',
    popularSearches: ['Munnar Tea Estate Tour', 'Eravikulam National Park Nilgiri Tahr', 'Mattupetty Dam Boating', 'Munnar Honeymoon Resort'],
    pins: [
      { city: 'Munnar Town', lat: 10.0889, lng: 77.0595, count: 8 },
      { city: 'Old Munnar', lat: 10.0760, lng: 77.0620, count: 5 },
    ],
  },
  goa: {
    displayName: 'Goa',
    stateOrCountry: 'India',
    keywords: ['goa', 'north goa', 'south goa', 'panaji', 'panjim', 'baga', 'calangute', 'candolim', 'anjuna', 'vagator', 'colva', 'palolem', 'dudhsagar', 'scuba goa'],
    aliases: ['goaa', 'goan', 'panjim', 'panaji', 'baga', 'calangute'],
    lat: 15.4,
    lng: 73.85,
    zoom: 9.5,
    aboutText: 'Sun-kissed golden beaches, vibrant beach shacks, Portuguese heritage architecture, water sports, and lively nightlife.',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80',
    popularSearches: ['North Goa Beach Tour', 'South Goa Peaceful Resorts', 'Baga & Calangute Water Sports', 'Dudhsagar Waterfalls Trek', 'Scuba Diving Goa'],
    pins: [
      { city: 'North Goa', lat: 15.5400, lng: 73.7600, count: 10 },
      { city: 'South Goa', lat: 15.2800, lng: 73.9800, count: 8 },
      { city: 'Panaji', lat: 15.4909, lng: 73.8278, count: 6 },
    ],
  },
  ladakh: {
    displayName: 'Ladakh',
    stateOrCountry: 'India',
    keywords: ['ladakh', 'leh', 'leh ladakh', 'nubra', 'nubra valley', 'pangong', 'pangong tso', 'khardungla', 'khardung la', 'zanskar', 'tso moriri', 'shanti stupa', 'magnetic hill'],
    aliases: ['ladak', 'ldakh', 'ladhk', 'ledakh', 'leh', 'lehladakh', 'nubra', 'pangong'],
    lat: 34.15,
    lng: 77.58,
    zoom: 8.0,
    aboutText: 'The Land of High Passes, featuring dramatic moonscapes, crystal-blue alpine lakes, ancient monasteries, and rugged mountain biking.',
    image: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=800&q=80',
    popularSearches: ['Pangong Lake Camping', 'Nubra Valley Camel Safari', 'Khardung La Pass Tour', 'Ladakh Bike Expedition', 'Leh Monasteries'],
    pins: [
      { city: 'Leh', lat: 34.1526, lng: 77.5771, count: 10 },
      { city: 'Nubra Valley', lat: 34.6863, lng: 77.5673, count: 6 },
      { city: 'Pangong Tso', lat: 33.7595, lng: 78.6674, count: 5 },
    ],
  },
  uttarakhand: {
    displayName: 'Uttarakhand',
    stateOrCountry: 'India',
    keywords: ['uttarakhand', 'uttaranchal', 'rishikesh', 'haridwar', 'dehradun', 'mussoorie', 'nainital', 'jim corbett', 'corbett', 'kedarnath', 'badrinath', 'chopta', 'auli'],
    aliases: ['uttrakhand', 'utarakhand', 'uttarkhad', 'uttranchal', 'uttaranchal', 'uk', 'rishikesh', 'haridwar', 'mussoorie', 'nainital', 'kedarnath', 'auli'],
    lat: 30.06,
    lng: 79.01,
    zoom: 7.5,
    aboutText: 'Devbhumi (Land of the Gods), offering Himalayan pilgrim shrines, river rafting in Rishikesh, skiing in Auli, and wildlife in Corbett.',
    image: 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=800&q=80',
    popularSearches: ['Rishikesh River Rafting & Yoga', 'Nainital Lake Tour', 'Mussoorie Queen of Hills', 'Jim Corbett Jungle Safari', 'Auli Skiing Tour'],
    pins: [
      { city: 'Rishikesh', lat: 30.0869, lng: 78.2676, count: 9 },
      { city: 'Nainital', lat: 29.3919, lng: 79.4542, count: 7 },
      { city: 'Mussoorie', lat: 30.4598, lng: 78.0644, count: 6 },
      { city: 'Jim Corbett', lat: 29.5300, lng: 78.7747, count: 5 },
    ],
  },
  meghalaya: {
    displayName: 'Meghalaya',
    stateOrCountry: 'India',
    keywords: ['meghalaya', 'shillong', 'cherrapunji', 'cherrapunjee', 'sohra', 'dawki', 'mawlynnong', 'living root bridge', 'krang suri', 'umngot river', 'laitlum'],
    aliases: ['meghalay', 'megahalaya', 'meghlaya', 'shilong', 'shillong', 'cherrapunji', 'dawki', 'sohra'],
    lat: 25.57,
    lng: 91.88,
    zoom: 8.0,
    aboutText: 'Abode of Clouds featuring crystalline rivers in Dawki, living root bridges, and thunderous waterfalls in Cherrapunji.',
    image: 'https://images.unsplash.com/photo-1622308644420-a8870197ee4a?w=800&q=80',
    popularSearches: ['Dawki Crystal Clear River', 'Living Root Bridges Trek', 'Cherrapunji Waterfalls Tour', 'Shillong City & Cafes', 'Mawlynnong Clean Village'],
    pins: [
      { city: 'Shillong', lat: 25.5788, lng: 91.8933, count: 9 },
      { city: 'Cherrapunji', lat: 25.2986, lng: 91.7303, count: 7 },
      { city: 'Dawki', lat: 25.1884, lng: 92.0253, count: 6 },
    ],
  },
  sikkim: {
    displayName: 'Sikkim',
    stateOrCountry: 'India',
    keywords: ['sikkim', 'gangtok', 'pelling', 'lachung', 'lachen', 'yumthang', 'yumthang valley', 'nathula', 'gurudongmar', 'ravangla', 'tsomgo lake'],
    aliases: ['sikim', 'sikkim', 'gangtok', 'gantok', 'pelling', 'lachung'],
    lat: 27.33,
    lng: 88.61,
    zoom: 8.5,
    aboutText: 'Majestic views of Mt. Kanchenjunga, serene Himalayan monasteries, hot springs in Yumthang Valley, and pristine alpine lakes.',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&q=80',
    popularSearches: ['Gangtok MG Marg & Viewpoints', 'Nathula Pass & Tsomgo Lake', 'North Sikkim & Gurudongmar Lake', 'Yumthang Valley of Flowers', 'Pelling Skywalk'],
    pins: [
      { city: 'Gangtok', lat: 27.3389, lng: 88.6065, count: 9 },
      { city: 'Lachung', lat: 27.6891, lng: 88.7430, count: 6 },
      { city: 'Pelling', lat: 27.3167, lng: 88.2333, count: 5 },
    ],
  },
  gujarat: {
    displayName: 'Gujarat',
    stateOrCountry: 'India',
    keywords: ['gujarat', 'ahmedabad', 'rann of kutch', 'kutch', 'gir', 'gir national park', 'somnath', 'dwarka', 'statue of unity', 'saputara', 'white desert'],
    aliases: ['gujrat', 'kutch', 'ahmedabad', 'dwarka', 'somnath', 'statueofunity'],
    lat: 22.25,
    lng: 71.19,
    zoom: 7.0,
    aboutText: 'White Desert of Rann of Kutch, Asiatic Lions in Gir, the monumental Statue of Unity, and sacred coastal temples.',
    image: 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=800&q=80',
    popularSearches: ['Rann of Kutch Rann Utsav', 'Statue of Unity & Tent City', 'Gir Lion Safari Tour', 'Dwarka & Somnath Temple Yatra', 'Ahmedabad Heritage Walk'],
    pins: [
      { city: 'Ahmedabad', lat: 23.0225, lng: 72.5714, count: 8 },
      { city: 'Kutch', lat: 23.7337, lng: 69.8597, count: 7 },
      { city: 'Statue of Unity', lat: 21.8380, lng: 73.7191, count: 6 },
    ],
  },
  punjab: {
    displayName: 'Punjab',
    stateOrCountry: 'India',
    keywords: ['punjab', 'amritsar', 'golden temple', 'wagah border', 'chandigarh', 'ludhiana', 'jalandhar', 'jallianwala bagh'],
    aliases: ['panjab', 'amritsar', 'goldentemple', 'wagah', 'chandigarh'],
    lat: 31.14,
    lng: 75.34,
    zoom: 8.0,
    aboutText: 'Sacred Golden Temple in Amritsar, patriotic Wagah Border ceremony, rich Punjabi heritage, and farm stays.',
    image: 'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=800&q=80',
    popularSearches: ['Amritsar Golden Temple Tour', 'Wagah Border Ceremony', 'Amritsar Food & Heritage Tour', 'Chandigarh City Tour'],
    pins: [
      { city: 'Amritsar', lat: 31.6340, lng: 74.8723, count: 10 },
      { city: 'Chandigarh', lat: 30.7333, lng: 76.7794, count: 7 },
    ],
  },
  andaman: {
    displayName: 'Andaman',
    stateOrCountry: 'India',
    keywords: ['andaman', 'andaman and nicobar', 'andaman & nicobar', 'port blair', 'havelock', 'swaraj dweep', 'neil island', 'radhanagar', 'scuba'],
    aliases: ['andman', 'andaman', 'portblair', 'havelock', 'neilisland', 'radhanagar'],
    lat: 11.8,
    lng: 92.8,
    zoom: 8.5,
    aboutText: 'Turquoise waters, pristine coral reefs, white sand beaches in Havelock, and world-class scuba diving.',
    image: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800&q=80',
    popularSearches: ['Radhanagar Beach Sunset', 'Havelock Island Scuba Diving', 'Port Blair Cellular Jail', 'Andaman Honeymoon Tour'],
    pins: [
      { city: 'Port Blair', lat: 11.6234, lng: 92.7265, count: 8 },
      { city: 'Havelock Island', lat: 12.0100, lng: 92.9800, count: 6 },
    ],
  },
  delhi: {
    displayName: 'Delhi',
    stateOrCountry: 'India',
    keywords: ['delhi', 'new delhi', 'ncr', 'old delhi', 'qutub minar', 'red fort', 'india gate', 'connaught place', 'chandni chowk'],
    aliases: ['dilli', 'delhi', 'newdelhi', 'ncr', 'new delhi'],
    lat: 28.61,
    lng: 77.20,
    zoom: 10.0,
    aboutText: 'India’s historic capital featuring grand Mughal architecture, lively street food bazaars, and rich culture.',
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80',
    popularSearches: ['Old Delhi Food Tour', 'Qutub Minar & Humayun Tomb', 'India Gate Sightseeing', 'Delhi City Tour'],
    pins: [
      { city: 'Central Delhi', lat: 28.6139, lng: 77.2090, count: 10 },
      { city: 'Old Delhi', lat: 28.6562, lng: 77.2410, count: 8 },
    ],
  },
  dubai: {
    displayName: 'Dubai',
    stateOrCountry: 'United Arab Emirates',
    isInternational: true,
    keywords: ['dubai', 'uae', 'united arab emirates', 'abu dhabi', 'burj khalifa', 'dubai mall', 'palm jumeirah', 'desert safari', 'marina'],
    aliases: ['dubay', 'dubaii', 'dubai', 'uae', 'abudhabi'],
    lat: 25.20,
    lng: 55.27,
    zoom: 9.0,
    aboutText: 'Futuristic skyscrapers, world-record landmarks, luxury shopping, desert dune bashing, and glittering marina coastlines.',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
    popularSearches: ['Burj Khalifa Top View', 'Desert Safari BBQ Dinner', 'Dubai Marina Cruise', 'Abu Dhabi Grand Mosque Tour'],
    pins: [
      { city: 'Downtown Dubai', lat: 25.1972, lng: 55.2744, count: 10 },
      { city: 'Dubai Marina', lat: 25.0805, lng: 55.1403, count: 8 },
    ],
  },
  bali: {
    displayName: 'Bali',
    stateOrCountry: 'Indonesia',
    isInternational: true,
    keywords: ['bali', 'indonesia', 'ubud', 'kuta', 'seminyak', 'canggu', 'nusa penida', 'uluwatu', 'tanah lot'],
    aliases: ['baali', 'bali', 'indonesia', 'ubud', 'seminyak'],
    lat: -8.40,
    lng: 115.18,
    zoom: 9.0,
    aboutText: 'The Island of the Gods, celebrated for lush rice terraces in Ubud, cliffside sea temples in Uluwatu, and surf beaches.',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    popularSearches: ['Ubud Rice Terraces & Swing', 'Nusa Penida Kelingking Tour', 'Uluwatu Sunset Kecak Dance', 'Bali Honeymoon Villa'],
    pins: [
      { city: 'Ubud', lat: -8.5069, lng: 115.2625, count: 9 },
      { city: 'Seminyak', lat: -8.6913, lng: 115.1682, count: 8 },
    ],
  },
  thailand: {
    displayName: 'Thailand',
    stateOrCountry: 'Thailand',
    isInternational: true,
    keywords: ['thailand', 'bangkok', 'phuket', 'pattaya', 'krabi', 'koh samui', 'chiang mai', 'phi phi'],
    aliases: ['thiland', 'tailand', 'bangkok', 'bankok', 'phuket', 'pattaya', 'krabi'],
    lat: 13.75,
    lng: 100.50,
    zoom: 7.0,
    aboutText: 'Tropical limestone islands, bustling night markets, floating markets, ornate Buddhist temples, and vibrant street life.',
    image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80',
    popularSearches: ['Phuket & Phi Phi Island Tour', 'Bangkok City & Temple Tour', 'Krabi 4-Island Tour', 'Pattaya Coral Island'],
    pins: [
      { city: 'Bangkok', lat: 13.7563, lng: 100.5018, count: 10 },
      { city: 'Phuket', lat: 7.8804, lng: 98.3923, count: 9 },
    ],
  },
  singapore: {
    displayName: 'Singapore',
    stateOrCountry: 'Singapore',
    isInternational: true,
    keywords: ['singapore', 'sentosa', 'marina bay', 'universal studios', 'gardens by the bay', 'night safari'],
    aliases: ['singapur', 'singpore', 'singapour', 'singapore', 'sentosa'],
    lat: 1.35,
    lng: 103.82,
    zoom: 11.0,
    aboutText: 'The Garden City, featuring futuristic supertrees at Gardens by the Bay, Marina Bay Sands skyline, and Sentosa island.',
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80',
    popularSearches: ['Gardens by the Bay & Cloud Forest', 'Universal Studios Sentosa', 'Marina Bay Sands SkyPark', 'Night Safari Tour'],
    pins: [
      { city: 'Marina Bay', lat: 1.2847, lng: 103.8610, count: 9 },
      { city: 'Sentosa Island', lat: 1.2494, lng: 103.8303, count: 7 },
    ],
  },
};

// Known common typo mappings (Instant O(1) resolution)
export const COMMON_TYPOS_MAP: Record<string, string> = {
  // Mumbai typos
  'munbai': 'mumbai',
  'mubai': 'mumbai',
  'mumbay': 'mumbai',
  'mumbau': 'mumbai',
  'numbai': 'mumbai',
  'mumabi': 'mumbai',
  'mombai': 'mumbai',
  'bombay': 'mumbai',

  // Manali typos
  'manli': 'manali',
  'mnali': 'manali',
  'mnaali': 'manali',
  'manalli': 'manali',
  'manaali': 'manali',

  // Shimla typos
  'simla': 'shimla',
  'shiml': 'shimla',

  // Himachal typos
  'himchal': 'himachal',
  'himachalpradesh': 'himachal',

  // Rajasthan typos
  'rajsthan': 'rajasthan',
  'rajastan': 'rajasthan',
  'rajashtan': 'rajasthan',
  'rajathan': 'rajasthan',
  'rajasathan': 'rajasthan',
  'rajsthn': 'rajasthan',

  // Jaipur typos
  'jaipr': 'jaipur',
  'jaipor': 'jaipur',

  // Udaipur typos
  'udaipr': 'udaipur',
  'udaipor': 'udaipur',

  // Kashmir typos
  'kasmeer': 'kashmir',
  'kashmr': 'kashmir',
  'kashmer': 'kashmir',
  'kashmirr': 'kashmir',
  'kasmir': 'kashmir',
  'kashmiir': 'kashmir',
  'srinager': 'kashmir',

  // Kerala typos
  'kerla': 'kerala',
  'karela': 'kerala',
  'keralam': 'kerala',
  'keraala': 'kerala',
  'kerela': 'kerala',

  // Munnar typos
  'munar': 'munnar',
  'munnaar': 'munnar',

  // Goa typos
  'goaa': 'goa',
  'goan': 'goa',

  // Ladakh typos
  'ladak': 'ladakh',
  'ldakh': 'ladakh',
  'ladhk': 'ladakh',
  'ledakh': 'ladakh',

  // Uttarakhand typos
  'uttrakhand': 'uttarakhand',
  'utarakhand': 'uttarakhand',
  'uttarkhad': 'uttarakhand',
  'uttranchal': 'uttarakhand',
  'uttaranchal': 'uttarakhand',

  // Meghalaya / Shillong typos
  'meghalay': 'meghalaya',
  'megahalaya': 'meghalaya',
  'meghlaya': 'meghalaya',
  'shilong': 'meghalaya',
  'shillong': 'meghalaya',

  // Sikkim typos
  'sikim': 'sikkim',
  'gantok': 'sikkim',

  // Gujarat typos
  'gujrat': 'gujarat',

  // Punjab typos
  'panjab': 'punjab',
  'amritser': 'punjab',

  // Delhi typos
  'dilli': 'delhi',
  'newdelhi': 'delhi',

  // International typos
  'dubay': 'dubai',
  'dubaii': 'dubai',
  'baali': 'bali',
  'thiland': 'thailand',
  'tailand': 'thailand',
  'bankok': 'thailand',
  'singapur': 'singapore',
  'singpore': 'singapore',
};

/**
 * Universal dynamic destination and query resolver with typo tolerance.
 * Keeps user search term clean (e.g. 'Manali' stays 'Manali', 'Mumbai' stays 'Mumbai').
 */
export function resolveDestinationWithAutocorrect(rawQuery: string): ResolvedDestinationResult {
  const cleanRaw = (rawQuery || '').trim();
  const lowerQuery = cleanRaw.toLowerCase();

  // Empty fallback
  if (!lowerQuery) {
    const def = DESTINATION_DICTIONARY['kashmir'];
    return {
      canonicalKey: 'kashmir',
      displayName: 'Kashmir',
      originalQuery: '',
      wasCorrected: false,
      keywords: def.keywords,
      meta: {
        id: 'kashmir',
        displayName: 'Kashmir',
        stateOrCountry: def.stateOrCountry,
        keywords: def.keywords,
        aliases: def.aliases,
        center: [def.lat, def.lng],
        zoom: def.zoom,
        aboutText: def.aboutText,
        image: def.image,
        popularSearches: def.popularSearches,
        pins: def.pins,
      },
    };
  }

  // 1. Check known typo map
  if (COMMON_TYPOS_MAP[lowerQuery]) {
    const key = COMMON_TYPOS_MAP[lowerQuery];
    const def = DESTINATION_DICTIONARY[key];
    if (def) {
      return {
        canonicalKey: key,
        displayName: def.displayName,
        originalQuery: cleanRaw,
        wasCorrected: lowerQuery !== def.displayName.toLowerCase(),
        correctedFrom: lowerQuery !== def.displayName.toLowerCase() ? cleanRaw : undefined,
        keywords: def.keywords,
        meta: {
          id: key,
          displayName: def.displayName,
          stateOrCountry: def.stateOrCountry,
          keywords: def.keywords,
          aliases: def.aliases,
          center: [def.lat, def.lng],
          zoom: def.zoom,
          aboutText: def.aboutText,
          image: def.image,
          popularSearches: def.popularSearches,
          pins: def.pins,
        },
      };
    }
  }

  // 2. Check exact destination dictionary entry
  if (DESTINATION_DICTIONARY[lowerQuery]) {
    const def = DESTINATION_DICTIONARY[lowerQuery];
    return {
      canonicalKey: lowerQuery,
      displayName: def.displayName,
      originalQuery: cleanRaw,
      wasCorrected: false,
      keywords: def.keywords,
      meta: {
        id: lowerQuery,
        displayName: def.displayName,
        stateOrCountry: def.stateOrCountry,
        keywords: def.keywords,
        aliases: def.aliases,
        center: [def.lat, def.lng],
        zoom: def.zoom,
        aboutText: def.aboutText,
        image: def.image,
        popularSearches: def.popularSearches,
        pins: def.pins,
      },
    };
  }

  // 3. Check aliases and keywords
  for (const [key, def] of Object.entries(DESTINATION_DICTIONARY)) {
    if (def.displayName.toLowerCase() === lowerQuery || def.aliases.includes(lowerQuery)) {
      return {
        canonicalKey: key,
        displayName: def.displayName,
        originalQuery: cleanRaw,
        wasCorrected: lowerQuery !== def.displayName.toLowerCase(),
        correctedFrom: lowerQuery !== def.displayName.toLowerCase() ? cleanRaw : undefined,
        keywords: def.keywords,
        meta: {
          id: key,
          displayName: def.displayName,
          stateOrCountry: def.stateOrCountry,
          keywords: def.keywords,
          aliases: def.aliases,
          center: [def.lat, def.lng],
          zoom: def.zoom,
          aboutText: def.aboutText,
          image: def.image,
          popularSearches: def.popularSearches,
          pins: def.pins,
        },
      };
    }
  }

  // 4. Token-based matching (e.g. "trip in manli", "cheap kasmeer packages")
  const tokens = lowerQuery.split(/[\s,/\-.;:()]+/).filter((t) => t.length >= 3);
  for (const token of tokens) {
    if (COMMON_TYPOS_MAP[token]) {
      const key = COMMON_TYPOS_MAP[token];
      const def = DESTINATION_DICTIONARY[key];
      if (def) {
        return {
          canonicalKey: key,
          displayName: def.displayName,
          originalQuery: cleanRaw,
          wasCorrected: true,
          correctedFrom: cleanRaw,
          keywords: def.keywords,
          meta: {
            id: key,
            displayName: def.displayName,
            stateOrCountry: def.stateOrCountry,
            keywords: def.keywords,
            aliases: def.aliases,
            center: [def.lat, def.lng],
            zoom: def.zoom,
            aboutText: def.aboutText,
            image: def.image,
            popularSearches: def.popularSearches,
            pins: def.pins,
          },
        };
      }
    }

    for (const [key, def] of Object.entries(DESTINATION_DICTIONARY)) {
      if (key === token || def.displayName.toLowerCase() === token || def.aliases.includes(token)) {
        return {
          canonicalKey: key,
          displayName: def.displayName,
          originalQuery: cleanRaw,
          wasCorrected: token !== def.displayName.toLowerCase(),
          correctedFrom: token !== def.displayName.toLowerCase() ? cleanRaw : undefined,
          keywords: def.keywords,
          meta: {
            id: key,
            displayName: def.displayName,
            stateOrCountry: def.stateOrCountry,
            keywords: def.keywords,
            aliases: def.aliases,
            center: [def.lat, def.lng],
            zoom: def.zoom,
            aboutText: def.aboutText,
            image: def.image,
            popularSearches: def.popularSearches,
            pins: def.pins,
          },
        };
      }
    }
  }

  // 5. Dynamic Fuzzy / Levenshtein Distance Check (Threshold: dist <= 2)
  let bestCandidateKey: string | null = null;
  let minDistance = 999;

  for (const [key, def] of Object.entries(DESTINATION_DICTIONARY)) {
    const listToTest = [key, def.displayName.toLowerCase(), ...def.aliases];
    for (const target of listToTest) {
      const dist = levenshteinDistance(lowerQuery, target);
      if (dist <= 2 && dist < minDistance && Math.abs(lowerQuery.length - target.length) <= 2) {
        minDistance = dist;
        bestCandidateKey = key;
      }
    }
  }

  if (bestCandidateKey && DESTINATION_DICTIONARY[bestCandidateKey]) {
    const def = DESTINATION_DICTIONARY[bestCandidateKey];
    return {
      canonicalKey: bestCandidateKey,
      displayName: def.displayName,
      originalQuery: cleanRaw,
      wasCorrected: true,
      correctedFrom: cleanRaw,
      keywords: def.keywords,
      meta: {
        id: bestCandidateKey,
        displayName: def.displayName,
        stateOrCountry: def.stateOrCountry,
        keywords: def.keywords,
        aliases: def.aliases,
        center: [def.lat, def.lng],
        zoom: def.zoom,
        aboutText: def.aboutText,
        image: def.image,
        popularSearches: def.popularSearches,
        pins: def.pins,
      },
    };
  }

  // 6. Dynamic User Query (No artificial hardcoding)
  const capitalized = cleanRaw
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const searchKeywords = Array.from(new Set([lowerQuery, ...tokens])).filter((k) => k.length >= 2);

  return {
    canonicalKey: lowerQuery,
    displayName: capitalized,
    originalQuery: cleanRaw,
    wasCorrected: false,
    keywords: searchKeywords,
    meta: {
      id: lowerQuery,
      displayName: capitalized,
      stateOrCountry: 'India',
      keywords: searchKeywords,
      aliases: [lowerQuery],
      center: [20.5937, 78.9629],
      zoom: 5.5,
      aboutText: `Explore custom packages, itineraries, and verified travel agents offering tours for ${capitalized}.`,
      image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
      popularSearches: [
        `${capitalized} Tour Package`,
        `${capitalized} Sightseeing`,
        `${capitalized} Family Trip`,
        `${capitalized} Weekend Getaway`,
      ],
      pins: [
        { city: capitalized, lat: 20.5937, lng: 78.9629, count: 5 },
      ],
    },
  };
}

/**
 * Checks if an agency operates in or has packages for a given set of destination keywords.
 */
export function isAgencyMatchingKeywords(agency: any, keywords: string[]): boolean {
  if (!agency || !keywords || keywords.length === 0) return false;

  // 1. Check agency packages first (Highest relevance)
  if (Array.isArray(agency.packages) && agency.packages.length > 0) {
    const hasMatchingPkg = agency.packages.some((p: any) => isPackageMatchingKeywords(p, keywords));
    if (hasMatchingPkg) return true;
  }

  // 2. Check agency listed destinations
  if (Array.isArray(agency.destinations) && agency.destinations.length > 0) {
    const matchesDest = agency.destinations.some((d: string) =>
      keywords.some((kw) => d.toLowerCase().includes(kw))
    );
    if (matchesDest) return true;
  }

  // 3. Check agency city / state / location (Exclude generic 'India' from triggering matches on every search)
  const locStr = `${agency.city || ''} ${agency.state || ''} ${agency.location || ''}`.toLowerCase();
  if (keywords.some((kw) => kw !== 'india' && locStr.includes(kw))) {
    return true;
  }

  return false;
}

/**
 * Checks if a specific package matches destination keywords.
 */
export function isPackageMatchingKeywords(pkg: any, keywords: string[]): boolean {
  if (!pkg || !keywords || keywords.length === 0) return false;

  const itineraryText = Array.isArray(pkg.itinerary)
    ? pkg.itinerary
        .map((day: any) => `${day?.title || ''} ${day?.activity || ''} ${day?.description || ''} ${day?.place || ''}`)
        .join(' ')
    : '';

  const placesText = Array.isArray(pkg.placesCovered)
    ? pkg.placesCovered.map((p: any) => (typeof p === 'string' ? p : p?.name || '')).join(' ')
    : '';

  const tagsText = Array.isArray(pkg.tags) ? pkg.tags.join(' ') : '';
  const catText = Array.isArray(pkg.tourCategories) ? pkg.tourCategories.join(' ') : '';
  const highlightsText = Array.isArray(pkg.highlights) ? pkg.highlights.join(' ') : '';

  const pkgText = [
    pkg.title || '',
    pkg.destination || '',
    pkg.city || '',
    pkg.state || '',
    pkg.country || '',
    pkg.location || '',
    pkg.overview || '',
    pkg.description || '',
    placesText,
    itineraryText,
    tagsText,
    catText,
    highlightsText,
  ]
    .join(' ')
    .toLowerCase();

  return keywords.some((kw) => kw && kw.length >= 2 && pkgText.includes(kw));
}

/**
 * Sorts and prioritizes agency packages so packages matching the destination keywords appear first.
 */
export function prioritizeAgencyPackages(packages: any[], keywords: string[]): any[] {
  if (!Array.isArray(packages) || packages.length === 0) return [];
  if (!keywords || keywords.length === 0) return packages;

  const matching: any[] = [];
  const other: any[] = [];

  packages.forEach((pkg) => {
    if (isPackageMatchingKeywords(pkg, keywords)) {
      matching.push(pkg);
    } else {
      other.push(pkg);
    }
  });

  return [...matching, ...other];
}
