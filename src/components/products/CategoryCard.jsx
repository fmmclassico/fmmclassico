import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { motion } from 'framer-motion';

const categoryImages = {
  phone_cases: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=400',
  chargers: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400',
  earphones: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
  cables: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  power_banks: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400',
  screen_protectors: 'https://images.unsplash.com/photo-1601972599720-36938d4ecd31?w=400',
  holders: 'https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=400',
  speakers: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
};

const categoryNames = {
  phone_cases: 'Phone Cases',
  chargers: 'Chargers',
  earphones: 'Earphones',
  cables: 'Cables',
  power_banks: 'Power Banks',
  screen_protectors: 'Screen Protectors',
  holders: 'Holders & Mounts',
  speakers: 'Speakers',
};

export default function CategoryCard({ category, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link to={createPageUrl(`Shop?category=${category}`)}>
        <div className="group relative overflow-hidden rounded-2xl aspect-square shadow-md hover:shadow-xl transition-all duration-300">
          <img
            src={categoryImages[category]}
            alt={categoryNames[category]}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-bold text-sm md:text-base">{categoryNames[category]}</h3>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}