import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const categories = [
  { 
    id: 'phone_cases', 
    name: 'Phone Cases', 
    desc: 'Protect your phone in style',
    image: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=600',
    color: 'from-pink-500 to-rose-500'
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
];

export default function Categories() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Shop by Category</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <Link to={createPageUrl(`Shop?category=${cat.id}`)}>
              <div className="group relative overflow-hidden rounded-2xl h-48 shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}