import React, { useState, useEffect } from 'react';

export default function FlashSaleCountdown({ endTime }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!endTime) return;
    const calc = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) { setTimeLeft(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  if (!endTime || !timeLeft) return null;

  const pad = n => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-1 ml-2">
      <span className="text-[10px] text-orange-500 font-bold">Ends in:</span>
      {[pad(timeLeft.h), pad(timeLeft.m), pad(timeLeft.s)].map((v, i) => (
        <React.Fragment key={i}>
          <span className="bg-orange-500 text-white text-[11px] font-black px-1.5 py-0.5 rounded">{v}</span>
          {i < 2 && <span className="text-orange-500 font-black text-xs">:</span>}
        </React.Fragment>
      ))}
    </div>
  );
}