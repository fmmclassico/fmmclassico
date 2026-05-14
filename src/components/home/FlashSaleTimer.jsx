import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function FlashSaleTimer({ endTime, isVisible = true }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!endTime || !isVisible) return;

    const calculate = () => {
      const now = new Date();
      const end = new Date(endTime);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Sale Ended');
        return;
      }

      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [endTime, isVisible]);

  if (!timeLeft || !isVisible) return null;

  return (
    <div className="flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
      <Clock className="h-3 w-3" />
      <span>{timeLeft}</span>
    </div>
  );
}