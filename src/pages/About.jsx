import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Smartphone, Shield, Truck, HeadphonesIcon,
  MapPin, Phone, Mail, Clock, Award, Users, Target, Heart
} from 'lucide-react';
import { motion } from 'framer-motion';

const DEFAULTS = {
  about_hero_title: 'About FMM CLASSICO',
  about_hero_subtitle: 'Your trusted destination for premium Phones & Accessories, Home Appliances and Electronics. Quality products, unbeatable prices, exceptional service.',
  about_story_title: 'Our Story',
  about_story_p1: 'FMM CLASSICO was founded with a simple mission: to provide high-quality phone accessories, electronic appliances, and home appliances at affordable prices. We understand the importance of protecting and enhancing your mobile devices while also delivering reliable electronic and household solutions for everyday living.',
  about_story_p2: 'Since our inception, we have served thousands of satisfied customers through both retail and wholesale, offering a carefully curated selection of phone cases, chargers, earphones, consumer electronics, and essential home appliances. Every product in our catalog is selected and tested to ensure quality, performance, and durability.',
  about_story_p3: 'We believe everyone deserves access to premium products without excessive cost. That is why we work directly with manufacturers and trusted suppliers to deliver dependable products at competitive prices.',
  about_years_badge: '5+',
  about_years_label: 'Years of Excellence',
  about_stat1_value: '10K+',
  about_stat1_label: 'Happy Customers',
  about_stat2_value: '5K+',
  about_stat2_label: 'Products Sold',
  about_stat3_value: '4.8',
  about_stat3_label: 'Average Rating',
  about_stat4_value: '24/7',
  about_stat4_label: 'Support Available',
  about_whychoose_title: 'Why Choose Us',
  about_whychoose_subtitle: 'The FMM CLASSICO difference',
  about_val1_title: 'Quality Assurance',
  about_val1_desc: 'We only sell genuine, high-quality products from trusted suppliers.',
  about_val2_title: 'Fast Delivery',
  about_val2_desc: 'Quick and reliable delivery to your doorstep with real-time tracking.',
  about_val3_title: 'Customer Support',
  about_val3_desc: '24/7 AI-powered support and dedicated customer service team.',
  about_val4_title: 'Customer First',
  about_val4_desc: 'Your satisfaction is our top priority. Easy returns and exchanges.',
  about_mission_title: 'Our Mission',
  about_mission_text: 'To provide every customer with access to premium quality Phones & Accessories, Home Appliances and Electronics at affordable prices, backed by exceptional customer service and fast delivery.',
  about_vision_title: 'Our Vision',
  about_vision_text: 'To become the most trusted and preferred destination for Phones & Accessories, Home Appliances and Electronics, known for our quality, reliability, and customer satisfaction.',
  about_contact_title: 'Get in Touch',
  about_contact_subtitle: "We'd love to hear from you",
  about_location1_title: 'Tarkwa Location',
  about_location1_addr: 'UMAT Main Campus, Tarkwa',
  about_location2_title: 'Accra Location',
  about_location2_addr: 'Ashongman Estate, Accra',
  about_phone: '0599676419',
  about_email: 'fmmcompanylimited@gmail.com',
  about_cta_title: 'Ready to Shop?',
  about_cta_subtitle: 'Explore our wide range of Phones & Accessories, Home Appliances and Electronics.',
};

export default function About() {
  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
    staleTime: 60000,
  });

  const g = (key) => settings.find(s => s.key === key)?.value || DEFAULTS[key] || '';

  const stats = [
    { value: g('about_stat1_value'), label: g('about_stat1_label'), icon: Users },
    { value: g('about_stat2_value'), label: g('about_stat2_label'), icon: Smartphone },
    { value: g('about_stat3_value'), label: g('about_stat3_label'), icon: Award },
    { value: g('about_stat4_value'), label: g('about_stat4_label'), icon: Clock },
  ];

  const values = [
    { icon: Shield, title: g('about_val1_title'), desc: g('about_val1_desc') },
    { icon: Truck, title: g('about_val2_title'), desc: g('about_val2_desc') },
    { icon: HeadphonesIcon, title: g('about_val3_title'), desc: g('about_val3_desc') },
    { icon: Heart, title: g('about_val4_title'), desc: g('about_val4_desc') },
  ];

  return (
    <div className="pb-12">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#2E86C1] to-[#1a6fa8] py-16 md:py-24">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1200')] bg-cover bg-center opacity-10" />
        <div className="container mx-auto px-4 relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4">{g('about_hero_title')}</h1>
            <p className="text-lg text-white/90">{g('about_hero_subtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="p-6 text-center shadow-lg hover:shadow-xl transition-shadow">
                <stat.icon className="h-8 w-8 text-[#2E86C1] mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Our Story */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">{g('about_story_title')}</h2>
            <p className="text-gray-600 mb-4">{g('about_story_p1')}</p>
            <p className="text-gray-600 mb-4">{g('about_story_p2')}</p>
            <p className="text-gray-600">{g('about_story_p3')}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
            <img src="https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600" alt="Phone Accessories" className="rounded-2xl shadow-xl" />
            <div className="absolute -bottom-6 -left-6 bg-[#2E86C1] text-white p-6 rounded-2xl shadow-lg">
              <p className="text-3xl font-bold">{g('about_years_badge')}</p>
              <p className="text-sm">{g('about_years_label')}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Values */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{g('about_whychoose_title')}</h2>
            <p className="text-gray-500">{g('about_whychoose_subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-[#2E86C1]" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">{value.title}</h3>
                  <p className="text-sm text-gray-600">{value.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="p-8 h-full bg-gradient-to-br from-[#2E86C1] to-[#1a6fa8] text-white">
              <Target className="h-10 w-10 mb-4" />
              <h3 className="text-xl font-bold mb-3">{g('about_mission_title')}</h3>
              <p className="text-white/90">{g('about_mission_text')}</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <Card className="p-8 h-full border-2 border-blue-200">
              <Award className="h-10 w-10 text-[#2E86C1] mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-3">{g('about_vision_title')}</h3>
              <p className="text-gray-600">{g('about_vision_text')}</p>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="bg-gray-900 py-16 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{g('about_contact_title')}</h2>
            <p className="text-gray-400">{g('about_contact_subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-bold mb-2">{g('about_location1_title')}</h3>
              <p className="text-gray-400 text-sm">{g('about_location1_addr')}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-bold mb-2">{g('about_location2_title')}</h3>
              <p className="text-gray-400 text-sm">{g('about_location2_addr')}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-bold mb-2">Phone</h3>
              <p className="text-gray-400 text-sm">{g('about_phone')}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-bold mb-2">Email</h3>
              <p className="text-gray-400 text-sm">{g('about_email')}</p>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}