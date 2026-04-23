import analiaVideo from '../assets/analia-franco.mp4';
import paulistaVideo from '../assets/paulista.mp4';

export interface Unit {
  id: string;
  name: string;
  address: string;
  url: string;
  video: number;
}

export const UNITS: Unit[] = [
  {
    id: 'analia',
    name: 'Unidade Anália Franco',
    address: 'Shopping Anália Franco — R. Funchal, 400, Jd. Paulistano',
    url: 'https://example.com/analia-franco',
    video: analiaVideo,
  },
  {
    id: 'paulista',
    name: 'Unidade Paulista',
    address: 'Av. Paulista, 1578 — Bela Vista, São Paulo',
    url: 'https://example.com/paulista',
    video: paulistaVideo,
  },
];
