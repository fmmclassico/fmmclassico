import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown } from 'lucide-react';

const phoneSubCategories = [
{ id: 'iphone', name: 'iPhones', desc: 'Apple iPhone models' },
{ id: 'samsung', name: 'Samsung Phones', desc: 'Galaxy & more' },
{ id: 'tecno', name: 'Tecno Phones', desc: 'Spark, Camon & more' },
{ id: 'infinix', name: 'Infinix Phones', desc: 'Hot, Note & more' },
{ id: 'itel', name: 'Itel Phones', desc: 'Budget smartphones' },
{ id: 'android_general', name: 'Other Android', desc: 'All other brands' }];


const phoneCaseSubCategories = [
{ id: 'iphone_case', name: 'iPhone Cases', desc: 'All iPhone models' },
{ id: 'samsung_case', name: 'Samsung Cases', desc: 'Galaxy series' },
{ id: 'tecno_case', name: 'Tecno Cases', desc: 'Spark & Camon' },
{ id: 'infinix_case', name: 'Infinix Cases', desc: 'Hot & Note series' },
{ id: 'universal_case', name: 'Universal Cases', desc: 'Fits most phones' }];


const electronicSubCategories = [
{ id: 'tv', name: 'Televisions', desc: 'LED, Smart TVs & more' },
{ id: 'laptop', name: 'Laptops & Tablets', desc: 'Work & entertainment' },
{ id: 'camera', name: 'Cameras & CCTV', desc: 'Photography & security' },
{ id: 'gaming', name: 'Gaming Accessories', desc: 'Controllers, headsets' },
{ id: 'lighting', name: 'LED Lighting', desc: 'Ring lights, bulbs' },
{ id: 'printer', name: 'Printers & Scanners', desc: 'Office essentials' },
{ id: 'audio', name: 'Audio Systems', desc: 'Home theatre, soundbars' },
{ id: 'fan', name: 'Fans & Cooling', desc: 'Standing & ceiling fans' }];


const homeApplianceSubCategories = [
{ id: 'fridge', name: 'Refrigerators', desc: 'Fridges & deep freezers' },
{ id: 'washing_machine', name: 'Washing Machines', desc: 'Front & top load' },
{ id: 'microwave', name: 'Microwaves & Ovens', desc: 'Cooking & baking' },
{ id: 'iron', name: 'Irons & Steamers', desc: 'Clothes care' },
{ id: 'kettle', name: 'Kettles & Toasters', desc: 'Kitchen essentials' },
{ id: 'blender', name: 'Blenders & Juicers', desc: 'Food preparation' },
{ id: 'air_conditioner', name: 'Air Conditioners', desc: 'Stay cool all year' },
{ id: 'vacuum', name: 'Vacuum Cleaners', desc: 'Floor & carpet cleaning' },
{ id: 'rice_cooker', name: 'Rice Cookers', desc: 'Perfect rice every time' },
{ id: 'water_dispenser', name: 'Water Dispensers', desc: 'Hot & cold water' }];


const categories = [
{
  id: 'phones',
  name: 'Phones',
  desc: 'iPhones, Samsung, Tecno, Infinix & more',
  image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
  color: 'from-violet-600 to-purple-700',
  subCategories: phoneSubCategories,
  subColor: 'purple'
},
{
  id: 'phone_cases',
  name: 'Phone Cases',
  desc: 'Protection for all phone brands',
  image: 'https://images.unsplash.com/photo-1601972599720-36938d4ecd31?w=600',
  color: 'from-pink-500 to-rose-500',
  subCategories: phoneCaseSubCategories,
  subColor: 'rose'
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
  image: 'https://m.media-amazon.com/images/I/713ShqGXrxL._AC_UF1000,1000_QL80_.jpg',
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
  image: 'https://www.popsci.com/wp-content/uploads/2023/09/13/best-screen-protectors-iphone-header-image.jpg?quality=85&w=1200',
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
  desc: 'TVs, laptops, cameras & more',
  image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ94SJivj0M3R6IzI-Ef1RaIn5Y7HOF7y5FnVqEpq0-uFqeEJFh3iu_0NE&s=10',
  color: 'from-cyan-500 to-blue-600',
  subCategories: electronicSubCategories,
  subColor: 'blue'
},
{
  id: 'home_appliances',
  name: 'Home Appliances',
  desc: 'Fridges, washing machines & more',
  image: 'https://images.unsplash.com/photo-1556909211-36987daf7b4d?w=600',
  color: 'from-amber-500 to-yellow-600',
  subCategories: homeApplianceSubCategories,
  subColor: 'amber'
}];


const subColorClasses = {
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', hover: 'hover:bg-purple-100', text: 'text-purple-800', allBg: 'bg-purple-100', allBorder: 'border-purple-300' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', hover: 'hover:bg-rose-100', text: 'text-rose-800', allBg: 'bg-rose-100', allBorder: 'border-rose-300' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100', text: 'text-blue-800', allBg: 'bg-blue-100', allBorder: 'border-blue-300' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', hover: 'hover:bg-amber-100', text: 'text-amber-800', allBg: 'bg-amber-100', allBorder: 'border-amber-300' }
};

export default function Categories() {
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Shop by Category</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat, i) =>
        <motion.div
          key={cat.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.05 }}>
          
            {cat.subCategories ?
          <div>
                <div
              className="group relative overflow-hidden rounded-2xl h-48 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => toggle(cat.id)}>
              
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className={`absolute inset-0 bg-gradient-to-r ${cat.color} opacity-70 group-hover:opacity-80 transition-opacity`} />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <h3 className="text-2xl font-bold text-white mb-1">{cat.name}</h3>
                    <p className="text-white/80 text-sm mb-3">{cat.desc}</p>
                    <div className="flex items-center text-white font-medium text-sm">
                      {expanded[cat.id] ? 'Hide subcategories' : 'Browse subcategories'}
                      <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${expanded[cat.id] ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {expanded[cat.id] &&
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                
                      <div className={`grid grid-cols-2 gap-2 mt-2 p-3 rounded-2xl border ${subColorClasses[cat.subColor]?.border || 'border-gray-200'} ${subColorClasses[cat.subColor]?.bg || 'bg-gray-50'}`}>
                        {cat.subCategories.map((sub) =>
                  <Link key={sub.id} to={createPageUrl(`Shop?category=${cat.id}&sub=${sub.id}`)}>
                            <div className={`border rounded-xl p-3 transition-colors ${subColorClasses[cat.subColor]?.border || ''} ${subColorClasses[cat.subColor]?.hover || 'hover:bg-gray-100'} bg-white`}>
                              <p className={`font-semibold text-sm ${subColorClasses[cat.subColor]?.text || 'text-gray-800'}`}>{sub.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{sub.desc}</p>
                            </div>
                          </Link>
                  )}
                        <Link to={createPageUrl(`Shop?category=${cat.id}`)} className="col-span-2">
                          <div className={`border rounded-xl p-3 transition-colors text-center ${subColorClasses[cat.subColor]?.allBorder || ''} ${subColorClasses[cat.subColor]?.allBg || 'bg-gray-100'} ${subColorClasses[cat.subColor]?.hover || ''}`}>
                            <p className={`font-bold text-sm ${subColorClasses[cat.subColor]?.text || 'text-gray-800'}`}>View All {cat.name} →</p>
                          </div>
                        </Link>
                      </div>
                    </motion.div>
              }
                </AnimatePresence>
              </div> :

          <Link to={createPageUrl(`Shop?category=${cat.id}`)}>
                <div className="group relative overflow-hidden rounded-2xl h-48 shadow-lg hover:shadow-xl transition-all duration-300 hidden">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 hidden" />
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-70 group-hover:opacity-80 transition-opacity hidden" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end hidden">
                    <h3 className="text-2xl font-bold text-white mb-1">{cat.name}</h3>
                    <p className="text-white/80 text-sm mb-3">{cat.desc}</p>
                    <div className="flex items-center text-white font-medium text-sm opacity-0 group-hover:opacity-100 transition-all duration-300">
                      Shop Now <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
          }
          </motion.div>
        )}
      </div>
    </div>);

}