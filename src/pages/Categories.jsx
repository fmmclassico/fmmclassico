import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown } from 'lucide-react';

const phoneSubCategories = [
  { id: 'iphone', name: 'iPhones', desc: 'Apple iPhone accessories' },
  { id: 'samsung', name: 'Samsung Phones', desc: 'Samsung accessories' },
  { id: 'android_typec', name: 'Android Type-C', desc: 'Type-C Android accessories' },
  { id: 'android_general', name: 'Android Phones', desc: 'General Android accessories' },
];

const categories = [
  { 
    id: 'phone_cases', 
    name: 'Phones', 
    desc: 'iPhones, Samsung, Android & more',
    image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600',
    color: 'from-pink-500 to-rose-500',
    hasSubcategories: true
  },
  { 
    id: 'chargers', 
    name: 'Chargers', 
    desc: 'Fast & reliable charging',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600',
    color: 'from-blue-500 to-cyan-500'
  },
  { 
    id: 'earphones', 
    name: 'Earphones', 
    desc: 'Premium audio experience',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
    color: 'from-purple-500 to-violet-500'
  },
  { 
    id: 'cables', 
    name: 'Cables', 
    desc: 'All types & lengths',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
    color: 'from-green-500 to-emerald-500'
  },
  { 
    id: 'power_banks', 
    name: 'Power Banks', 
    desc: 'Power on the go',
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600',
    color: 'from-orange-500 to-amber-500'
  },
  { 
    id: 'screen_protectors', 
    name: 'Screen Protectors', 
    desc: 'Ultimate screen defense',
    image: 'https://images.unsplash.com/photo-1601972599720-36938d4ecd31?w=600',
    color: 'from-teal-500 to-cyan-500'
  },
  { 
    id: 'holders', 
    name: 'Holders & Mounts', 
    desc: 'Hands-free convenience',
    image: 'https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=600',
    color: 'from-indigo-500 to-blue-500'
  },
  { 
    id: 'speakers', 
    name: 'Speakers', 
    desc: 'Powerful portable sound',
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600',
    color: 'from-red-500 to-orange-500'
  },
  { 
    id: 'smart_watches', 
    name: 'Smart Watches', 
    desc: 'Stay connected on your wrist',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
    color: 'from-slate-600 to-slate-800'
  },
  { 
    id: 'electronic_appliances', 
    name: 'Electronic Appliances', 
    desc: 'Modern electronics for you',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
    color: 'from-cyan-500 to-blue-600'
  },
  { 
    id: 'home_appliances', 
    name: 'Home Appliances', 
    desc: 'Essential home solutions',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600',
    color: 'from-amber-500 to-yellow-600'
  },
];

export default function Categories() {
  const [phoneExpanded, setPhoneExpanded] = useState(false);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Shop by Category</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            {cat.hasSubcategories ? (
              <div>
                <div
                  className="group relative overflow-hidden rounded-2xl h-48 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => setPhoneExpanded(prev => !prev)}
                >
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className={`absolute inset-0 bg-gradient-to-r ${cat.color} opacity-70 group-hover:opacity-80 transition-opacity`} />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <h3 className="text-2xl font-bold text-white mb-1">{cat.name}</h3>
                    <p className="text-white/80 text-sm mb-3">{cat.desc}</p>
                    <div className="flex items-center text-white font-medium text-sm">
                      {phoneExpanded ? 'Hide subcategories' : 'Browse subcategories'}
                      <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${phoneExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>
                {phoneExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 gap-2 mt-2"
                  >
                    {phoneSubCategories.map(sub => (
                      <Link key={sub.id} to={createPageUrl(`Shop?category=phone_cases&sub=${sub.id}`)}>
                        <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 hover:bg-pink-100 transition-colors">
                          <p className="font-semibold text-gray-800 text-sm">{sub.name}</p>
                          <p className="text-xs text-gray-500">{sub.desc}</p>
                        </div>
                      </Link>
                    ))}
                    <Link to={createPageUrl(`Shop?category=phone_cases`)}>
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 hover:bg-rose-100 transition-colors col-span-2">
                        <p className="font-semibold text-gray-800 text-sm">All Phone Accessories</p>
                        <p className="text-xs text-gray-500">View everything</p>
                      </div>
                    </Link>
                  </motion.div>
                )}
              </div>
            ) : (
              <Link to={createPageUrl(`Shop?category=${cat.id}`)}>
                <div className="group relative overflow-hidden rounded-2xl h-48 shadow-lg hover:shadow-xl transition-all duration-300">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className={`absolute inset-0 bg-gradient-to-r ${cat.color} opacity-70 group-hover:opacity-80 transition-opacity`} />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <h3 className="text-2xl font-bold text-white mb-1">{cat.name}</h3>
                    <p className="text-white/80 text-sm mb-3">{cat.desc}</p>
                    <div className="flex items-center text-white font-medium text-sm opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                      Shop Now <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}