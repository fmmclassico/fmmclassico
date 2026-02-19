import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Smartphone, 
  Shield, 
  Truck, 
  HeadphonesIcon,
  MapPin,
  Phone,
  Mail,
  Clock,
  Award,
  Users,
  Target,
  Heart
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function About() {
  const stats = [
    { value: '10K+', label: 'Happy Customers', icon: Users },
    { value: '5K+', label: 'Products Sold', icon: Smartphone },
    { value: '4.8', label: 'Average Rating', icon: Award },
    { value: '24/7', label: 'Support Available', icon: Clock },
  ];

  const values = [
    { 
      icon: Shield, 
      title: 'Quality Assurance', 
      desc: 'We only sell genuine, high-quality products from trusted suppliers.' 
    },
    { 
      icon: Truck, 
      title: 'Fast Delivery', 
      desc: 'Quick and reliable delivery to your doorstep with real-time tracking.' 
    },
    { 
      icon: HeadphonesIcon, 
      title: 'Customer Support', 
      desc: '24/7 AI-powered support and dedicated customer service team.' 
    },
    { 
      icon: Heart, 
      title: 'Customer First', 
      desc: 'Your satisfaction is our top priority. Easy returns and exchanges.' 
    },
  ];

  return (
    <div className="pb-12">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-500 to-orange-600 py-16 md:py-24">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1200')] bg-cover bg-center opacity-10" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
              About FMM CLASSICO
            </h1>
            <p className="text-lg text-white/90">
              Your trusted destination for premium phone accessories and gadgets. Quality products, unbeatable prices, exceptional service.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6 text-center shadow-lg hover:shadow-xl transition-shadow">
                <stat.icon className="h-8 w-8 text-orange-500 mx-auto mb-2" />
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
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Our Story</h2>
            <p className="text-gray-600 mb-4">
              FMM CLASSICO was founded with a simple mission: to provide high-quality phone accessories, electronic appliances, and home appliances at affordable prices. We understand the importance of protecting and enhancing your mobile devices while also delivering reliable electronic and household solutions for everyday living.
            </p>
            <p className="text-gray-600 mb-4">
              Since our inception, we have served thousands of satisfied customers through both retail and wholesale, offering a carefully curated selection of phone cases, chargers, earphones, consumer electronics, and essential home appliances. Every product in our catalog is selected and tested to ensure quality, performance, and durability.
            </p>
            <p className="text-gray-600">
              We believe everyone deserves access to premium products without excessive cost. That is why we work directly with manufacturers and trusted suppliers to deliver dependable products at competitive prices.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <img
              src="https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600"
              alt="Phone Accessories"
              className="rounded-2xl shadow-xl"
            />
            <div className="absolute -bottom-6 -left-6 bg-orange-500 text-white p-6 rounded-2xl shadow-lg">
              <p className="text-3xl font-bold">5+</p>
              <p className="text-sm">Years of Excellence</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Values */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Why Choose Us</h2>
            <p className="text-gray-500">The FMM CLASSICO difference</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-orange-600" />
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="p-8 h-full bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <Target className="h-10 w-10 mb-4" />
              <h3 className="text-xl font-bold mb-3">Our Mission</h3>
              <p className="text-white/90">
                To provide every customer with access to premium quality phone accessories, electronic appliances, and home appliances at affordable prices, backed by exceptional customer service and fast delivery.
              </p>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-8 h-full border-2 border-orange-200">
              <Award className="h-10 w-10 text-orange-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-3">Our Vision</h3>
              <p className="text-gray-600">
                To become the most trusted and preferred destination for phone accessories, known for our quality, reliability, and customer satisfaction.
              </p>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="bg-gray-900 py-16 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Get in Touch</h2>
            <p className="text-gray-400">We'd love to hear from you</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="font-bold mb-2">Tarkwa Location</h3>
              <p className="text-gray-400 text-sm">UMAT Main Campus, Tarkwa</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="font-bold mb-2">Accra Location</h3>
              <p className="text-gray-400 text-sm">Ashongman Estate, Accra</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="font-bold mb-2">Phone</h3>
              <p className="text-gray-400 text-sm">0599676419</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="font-bold mb-2">Email</h3>
              <p className="text-gray-400 text-sm">fmmcompanylimited@gmail.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            Ready to Shop?
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Explore our wide range of premium phone accessories and find the perfect match for your device.
          </p>
          <Link to={createPageUrl('Shop')}>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 font-bold">
              Start Shopping
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}