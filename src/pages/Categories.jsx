import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Home, Settings, Upload, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
      { label: 'Chargers & Power', shopCategory: 'chargers' },
      { label: 'Earphones & Audio', shopCategory: 'earphones' },
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

  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState({});
  const [editText, setEditText] = useState({});
  const queryClient = useQueryClient();
  const fileRefs = useRef({});

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
  });

  const isAdmin = user?.role === 'admin';

  // Get overridden image for a category
  const getCatImage = (catId) => {
    const s = settings.find(x => x.key === `cat_bg_${catId}`);
    return s?.value || null;
  };

  const getCatText = (catId, field, fallback) => {
    const s = settings.find(x => x.key === `cat_text_${catId}_${field}`);
    return s?.value || fallback;
  };

  const saveSetting = async (key, value) => {
    const existing = settings.find(s => s.key === key);
    if (existing) {
      await base44.entities.AppSetting.update(existing.id, { value });
    } else {
      await base44.entities.AppSetting.create({ key, value });
    }
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
  };

  const handleImageUpload = async (catId, file) => {
    setUploading(u => ({ ...u, [catId]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await saveSetting(`cat_bg_${catId}`, file_url);
      toast.success('Background image updated!');
    } catch {
      toast.error('Upload failed');
    }
    setUploading(u => ({ ...u, [catId]: false }));
  };

  const handleRemoveImage = async (catId) => {
    await saveSetting(`cat_bg_${catId}`, '');
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    toast.success('Image removed');
  };

  const handleSaveText = async (catId, field) => {
    const val = editText[`${catId}_${field}`];
    if (val === undefined) return;
    await saveSetting(`cat_text_${catId}_${field}`, val);
    toast.success('Saved!');
  };

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

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Shop by Category</h1>
        {isAdmin && (
          <button
            onClick={() => setEditMode(e => !e)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${editMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
          >
            <Settings className="h-3.5 w-3.5" />
            {editMode ? 'Done Editing' : 'Edit Page'}
          </button>
        )}
      </div>

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
                onClick={() => !editMode && toggle(cat.id)}
              >
                <img
                  src={getCatImage(cat.id) || cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${cat.color} opacity-70 group-hover:opacity-80 transition-opacity`} />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {getCatText(cat.id, 'name', cat.name)}
                  </h3>
                  <p className="text-white/80 text-sm mb-3">
                    {getCatText(cat.id, 'desc', cat.desc)}
                  </p>
                  {!editMode && (
                    <div className="flex items-center text-white font-medium text-sm">
                      {isOpen ? 'Hide subcategories' : 'Browse subcategories'}
                      <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  )}
                </div>

                {/* Admin edit overlay */}
                {editMode && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 p-4" onClick={e => e.stopPropagation()}>
                    <p className="text-white text-xs font-bold mb-1">Edit "{cat.name}" Card</p>
                    <input
                      type="text"
                      defaultValue={getCatText(cat.id, 'name', cat.name)}
                      placeholder="Title"
                      className="w-full text-xs px-2 py-1 rounded border bg-white/90"
                      onChange={e => setEditText(t => ({ ...t, [`${cat.id}_name`]: e.target.value }))}
                      onBlur={() => handleSaveText(cat.id, 'name')}
                    />
                    <input
                      type="text"
                      defaultValue={getCatText(cat.id, 'desc', cat.desc)}
                      placeholder="Description"
                      className="w-full text-xs px-2 py-1 rounded border bg-white/90"
                      onChange={e => setEditText(t => ({ ...t, [`${cat.id}_desc`]: e.target.value }))}
                      onBlur={() => handleSaveText(cat.id, 'desc')}
                    />
                    <div className="flex gap-2">
                      <input
                        ref={el => fileRefs.current[cat.id] = el}
                        type="file" accept="image/*" className="hidden"
                        onChange={e => e.target.files?.[0] && handleImageUpload(cat.id, e.target.files[0])}
                      />
                      <button
                        className="flex items-center gap-1 bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600"
                        onClick={() => fileRefs.current[cat.id]?.click()}
                      >
                        {uploading[cat.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        Change Image
                      </button>
                      {getCatImage(cat.id) && (
                        <button
                          className="flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                          onClick={() => handleRemoveImage(cat.id)}
                        >
                          <X className="h-3 w-3" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
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