import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { createPageUrl } from '../../utils';
import OptimizedImage from '@/components/ui/optimized-image.jsx';

const categoryImages = {
  phones: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1600',
  phone_cases: 'https://images.unsplash.com/photo-1601972599720-36938d4ecd31?w=1600',
  chargers: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=1600',
  earphones: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1600',
  cables: 'https://images.unsplash.com/photo-1615526675159-e248c3021d3f?w=1600',
  power_banks: 'https://images.unsplash.com/photo-1609592424823-351b27f32717?w=1600',
  screen_protectors: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=1600',
  holders: 'https://images.unsplash.com/photo-1586105251261-72a756497a12?w=1600',
  speakers: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=1600',
  smart_watches: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=1600',
  electronic_appliances: 'https://images.unsplash.com/photo-1580894908361-967195033215?w=1600',
  home_appliances: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1600',
};

const categoryNames = {
  phones: 'Phones',
  phone_cases: 'Phone Cases',
  chargers: 'Chargers',
  earphones: 'Earphones',
  cables: 'Cables',
  power_banks: 'Power Banks',
  screen_protectors: 'Screen Protectors',
  holders: 'Phone Holders',
  speakers: 'Speakers',
  smart_watches: 'Smart Watches',
  electronic_appliances: 'Electronics',
  home_appliances: 'Home Appliances',
};

export default function CategoryCard({ category, index, productImage }) {
  const imageUrl = productImage || categoryImages[category];
  const title = categoryNames[category] || 'Category';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
    >
      <Link to={createPageUrl(`Shop?category=${category}`)}>
        <div className="group relative overflow-hidden rounded-2xl aspect-square shadow-md hover:shadow-xl transition-all duration-300 bg-slate-100">
          <OptimizedImage
            src={imageUrl}
            alt={title}
            containerClassName="h-full w-full"
            className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 16vw"
            widths={[240, 360, 540, 720, 960, 1200]}
            quality={78}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4">
            <h3 className="text-white font-bold text-xs md:text-sm text-center drop-shadow-sm">{title}</h3>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
