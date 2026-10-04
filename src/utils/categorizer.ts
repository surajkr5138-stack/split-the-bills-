import { Category } from '../types';

export interface CategoryMeta {
  id: Category;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  iconName: string;
  keywords: string[];
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  Dining: {
    id: 'Dining',
    label: 'Dining & Drinks',
    color: '#F97316',
    bgColor: 'bg-orange-950/40',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-800/40',
    iconName: 'UtensilsCrossed',
    keywords: [
      'dinner', 'lunch', 'breakfast', 'brunch', 'cafe', 'coffee', 'starbucks', 'bistro', 
      'restaurant', 'bar', 'pub', 'beer', 'cocktails', 'wine', 'pizza', 'burger', 'sushi', 
      'tacos', 'drinks', 'mcdonalds', 'kfc', 'subway', 'ice cream', 'bakery', 'meal', 'food'
    ],
  },
  Groceries: {
    id: 'Groceries',
    label: 'Groceries & Supplies',
    color: '#10B981',
    bgColor: 'bg-emerald-950/40',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-800/40',
    iconName: 'ShoppingBag',
    keywords: [
      'groceries', 'supermarket', 'walmart', 'trader joe', 'whole foods', 'costco', 
      'target', 'market', 'produce', 'vegetables', 'fruits', 'snacks', 'milk', 'bread', 'safeway', 'kroger'
    ],
  },
  Lodging: {
    id: 'Lodging',
    label: 'Lodging & Stays',
    color: '#8B5CF6',
    bgColor: 'bg-purple-950/40',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-800/40',
    iconName: 'Home',
    keywords: [
      'airbnb', 'hotel', 'motel', 'resort', 'cabin', 'booking', 'hostel', 'rent', 'villa', 'stay'
    ],
  },
  Travel: {
    id: 'Travel',
    label: 'Travel & Trips',
    color: '#06B6D4',
    bgColor: 'bg-cyan-950/40',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-800/40',
    iconName: 'Plane',
    keywords: [
      'flight', 'airline', 'delta', 'united', 'luggage', 'boarding', 'terminal', 'tour', 'sightseeing', 'cruise'
    ],
  },
  Transport: {
    id: 'Transport',
    label: 'Transport & Gas',
    color: '#3B82F6',
    bgColor: 'bg-blue-950/40',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-800/40',
    iconName: 'Car',
    keywords: [
      'uber', 'lyft', 'taxi', 'gas', 'fuel', 'shell', 'chevron', 'toll', 'parking', 'train', 
      'subway', 'bus', 'transit', 'car rental', 'hertz', 'enterprise', 'metro'
    ],
  },
  Entertainment: {
    id: 'Entertainment',
    label: 'Entertainment & Fun',
    color: '#EC4899',
    bgColor: 'bg-pink-950/40',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-800/40',
    iconName: 'Sparkles',
    keywords: [
      'movie', 'cinema', 'concert', 'ticket', 'show', 'museum', 'bowling', 'arcade', 
      'ski', 'snowboard', 'theme park', 'club', 'event', 'amc', 'game'
    ],
  },
  Utilities: {
    id: 'Utilities',
    label: 'Utilities & Bills',
    color: '#EAB308',
    bgColor: 'bg-yellow-950/40',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-800/40',
    iconName: 'Zap',
    keywords: [
      'wifi', 'internet', 'electric', 'electricity', 'water', 'gas bill', 'trash', 
      'subscription', 'netflix', 'spotify', 'cleaning', 'maintenance'
    ],
  },
  Shopping: {
    id: 'Shopping',
    label: 'Shopping',
    color: '#14B8A6',
    bgColor: 'bg-teal-950/40',
    textColor: 'text-teal-400',
    borderColor: 'border-teal-800/40',
    iconName: 'Tag',
    keywords: [
      'amazon', 'clothes', 'shoes', 'electronics', 'gift', 'souvenir', 'store', 'hardware', 'supplies'
    ],
  },
  Other: {
    id: 'Other',
    label: 'Other',
    color: '#94A3B8',
    bgColor: 'bg-slate-900/60',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-800/40',
    iconName: 'Receipt',
    keywords: [],
  },
};

/**
 * Automatically predicts the expense category from title and text notes.
 */
export function autoCategorize(text: string): Category {
  const normalized = text.toLowerCase();
  
  for (const catKey of Object.keys(CATEGORIES) as Category[]) {
    if (catKey === 'Other') continue;
    const meta = CATEGORIES[catKey];
    for (const keyword of meta.keywords) {
      if (normalized.includes(keyword)) {
        return catKey;
      }
    }
  }

  return 'Other';
}
