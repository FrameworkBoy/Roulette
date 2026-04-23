export interface Unit {
  id: string;
  name: string;
  address: string;
  url: string;
  video: ReturnType<typeof require>;
}

export const UNITS: Unit[] = [
  {
    id: 'analia',
    name: 'Unidade Anália Franco',
    address: 'Shopping Anália Franco — R. Funchal, 400, Jd. Paulistano',
    url: 'https://example.com/analia-franco',
    video: require('../assets/analia-franco.mp4'),
  },
  {
    id: 'paulista',
    name: 'Unidade Paulista',
    address: 'Av. Paulista, 1578 — Bela Vista, São Paulo',
    url: 'https://example.com/paulista',
    video: require('../assets/paulista.mp4'),
  },
];
