import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Home } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'phones',
    name: 'Phones',
    desc: 'iPhones, Samsung, Tecno, Infinix & more',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
    color: 'from-violet-600 to-purple-700',
    subColor: 'purple',
    shopCategory: 'phones',
    subCategories: [
      { label: 'Apple (iPhone)', brand: 'Apple', category: 'phones' },
      { label: 'Samsung Phones', brand: 'Samsung', category: 'phones' },
      { label: 'Tecno Phones', brand: 'Tecno', category: 'phones' },
      { label: 'Infinix Phones', brand: 'Infinix', category: 'phones' },
      { label: 'Itel Phones', brand: 'Itel', category: 'phones' },
      { label: 'Xiaomi Phones', brand: 'Xiaomi', category: 'phones' },
    ],
  },
  {
    id: 'phone_accessories',
    name: 'Phone Accessories',
    desc: 'Cases, chargers, earphones, cables & more',
    image: 'https://mate.net.in/public/uploads/all/UsReqZvujmEjMUb27qlTtRcCG8Pf18SyULO4HW7U.jpg',
    color: 'from-pink-500 to-rose-600',
    subColor: 'rose',
    subCategories: [
      { label: 'Phone Cases', shopCategory: 'phone_cases' },
      { label: 'Chargers', shopCategory: 'chargers' },
      { label: 'Earphones', shopCategory: 'earphones' },
      { label: 'Cables', shopCategory: 'cables' },
      { label: 'Power Banks', shopCategory: 'power_banks' },
      { label: 'Screen Protectors', shopCategory: 'screen_protectors' },
      { label: 'Holders & Mounts', shopCategory: 'holders' },
      { label: 'Speakers', shopCategory: 'speakers' },
      { label: 'Smart Watches', shopCategory: 'smart_watches' },
    ],
  },
  {
    id: 'electronics',
    name: 'Electronics',
    desc: 'TVs, laptops, cameras, audio & more',
    image: 'https://images.unsplash.com/photo-1593640408182-31c228f30ca0?w=400&q=90',
    color: 'from-cyan-500 to-blue-600',
    subColor: 'blue',
    shopCategory: 'electronic_appliances',
    subCategories: [
      { label: 'Televisions', shopCategory: 'electronic_appliances', sub: 'tv' },
      { label: 'Laptops & Tablets', shopCategory: 'electronic_appliances', sub: 'laptop' },
      { label: 'Cameras & CCTV', shopCategory: 'electronic_appliances', sub: 'camera' },
      { label: 'Gaming Accessories', shopCategory: 'electronic_appliances', sub: 'gaming' },
      { label: 'LED Lighting', shopCategory: 'electronic_appliances', sub: 'lighting' },
      { label: 'Audio Systems', shopCategory: 'electronic_appliances', sub: 'audio' },
      { label: 'Fans & Cooling', shopCategory: 'electronic_appliances', sub: 'fan' },
    ],
  },
  {
    id: 'home_appliances',
    name: 'Home Appliances',
    desc: 'Fridges, washing machines, microwaves & more',
    image: 'https://images.unsplash.com/photo-1556909211-36987daf7b4d?w=600',
    color: 'from-amber-500 to-yellow-600',
    subColor: 'amber',
    shopCategory: 'home_appliances',
    subCategories: [
      { label: 'Refrigerators', shopCategory: 'home_appliances', sub: 'fridge' },
      { label: 'Washing Machines', shopCategory: 'home_appliances', sub: 'washing_machine' },
      { label: 'Microwaves & Ovens', shopCategory: 'home_appliances', sub: 'microwave' },
      { label: 'Air Conditioners', shopCategory: 'home_appliances', sub: 'air_conditioner' },
      { label: 'Blenders & Juicers', shopCategory: 'home_appliances', sub: 'blender' },
      { label: 'Kettles & Toasters', shopCategory: 'home_appliances', sub: 'kettle' },
      { label: 'Rice Cookers', shopCategory: 'home_appliances', sub: 'rice_cooker' },
      { label: 'Vacuum Cleaners', shopCategory: 'home_appliances', sub: 'vacuum' },
      { label: 'Water Dispensers', shopCategory: 'home_appliances', sub: 'water_dispenser' },
    ],
  },
];

const subColorClasses = {
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', hover: 'hover:bg-purple-100', text: 'text-purple-800', allBg: 'bg-purple-100', allBorder: 'border-purple-300' },
  rose:   { bg: 'bg-rose-50',   border: 'border-rose-200',   hover: 'hover:bg-rose-100',   text: 'text-rose-800',   allBg: 'bg-rose-100',   allBorder: 'border-rose-300' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   hover: 'hover:bg-blue-100',   text: 'text-blue-800',   allBg: 'bg-blue-100',   allBorder: 'border-blue-300' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  hover: 'hover:bg-amber-100',  text: 'text-amber-800',  allBg: 'bg-amber-100',  allBorder: 'border-amber-300' },
};

function getSubLink(sub) {
  if (sub.brand && sub.category) {
    return createPageUrl(`BrandProducts?brand=${encodeURIComponent(sub.brand)}&category=${sub.category}`);
  }
  if (sub.sub) {
    return createPageUrl(`Shop?category=${sub.shopCategory}&sub=${sub.sub}`);
  }
  return createPageUrl(`Shop?category=${sub.shopCategory}`);
}

export default function Categories() {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
        <Link to={createPageUrl('Home')} className="flex items-center gap-1 hover:text-gray-700">
          <Home className="h-3 w-3" /> Home
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-semibold">Categories</span>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-5">Shop by Category</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {CATEGORIES.map((cat, i) => {
          const sc = subColorClasses[cat.subColor];
          const isOpen = !!expanded[cat.id];
          const allLink = cat.shopCategory
            ? createPageUrl(`Shop?category=${cat.shopCategory}`)
            : createPageUrl(`Shop`);

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
            >
              {/* Category card */}
              <div
                className="group relative overflow-hidden rounded-2xl h-48 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => toggle(cat.id)}
              >
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className={`absolute inset-0 bg-gradient-to-r ${cat.color} opacity-70 group-hover:opacity-80 transition-opacity`} />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h3 className="text-2xl font-bold text-white mb-1">{cat.name}</h3>
                  <p className="text-white/80 text-sm mb-3">{cat.desc}</p>
                  <div className="flex items-center text-white font-medium text-sm">
                    {isOpen ? 'Hide subcategories' : 'Browse subcategories'}
                    <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Subcategory dropdown */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`grid grid-cols-2 gap-2 mt-2 p-3 rounded-2xl border ${sc.border} ${sc.bg}`}>
                      {cat.subCategories.map((sub) => (
                        <Link key={sub.label} to={getSubLink(sub)}>
                          <div className={`border rounded-xl p-3 transition-colors bg-white ${sc.border} ${sc.hover}`}>
                            <p className={`font-semibold text-sm ${sc.text}`}>{sub.label}</p>
                          </div>
                        </Link>
                      ))}
                      <Link to={allLink} className="col-span-2">
                        <div className={`border rounded-xl p-3 transition-colors text-center ${sc.allBorder} ${sc.allBg} ${sc.hover}`}>
                          <p className={`font-bold text-sm ${sc.text}`}>View All {cat.name} →</p>
                        </div>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}