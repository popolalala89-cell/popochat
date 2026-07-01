import React from 'react';
import { IonLoading } from '@ionic/react';

const QUOTES = [
  '🤔 "Kopi dulu, nanti kode lancar"',
  '🚀 "Loading... sambil bayangin gajian"',
  '😅 "Sebentar, pesan lagi dijemput kurir"',
  '💡 "Fun fact: keyboard QWERTY diciptain biar ngetik pelan-pelan"',
  '☕ "Selagi nunggu, teguk kopi dulu"',
  '🐢 "Kura-kura aja bisa menang, apalagi loading ini"',
  '🎯 "80% loading = 20% sisanya paling lama"',
  '🌈 "Pesan ini mungkin udah sampe, cuma lagi dipeluk server"',
  '🦥 "Loading lambat? Santuy, namanya juga usaha"',
  '🎵 "Ting... pesan dikirim, notifikasi menyusul"',
  '🧋 "Es teh manis dulu sambil nunggu"',
  '⚡ "Jreng! Pesan hampir sampe..."',
  '📡 "Sinyal merambat, sabar ya..."',
  '🎉 "Loading ini bonus gratis, nikmati aja"',
  '🤖 "Si Centil bilang: sabar, rekan!"',
];

interface FunLoadingProps {
  isOpen: boolean;
  message?: string;
  duration?: number;
}

const FunLoading: React.FC<FunLoadingProps> = ({ isOpen, message, duration }) => {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const displayMessage = message || quote;

  return (
    <IonLoading
      isOpen={isOpen}
      message={displayMessage}
      duration={duration}
    />
  );
};

export default FunLoading;
