import { CrowdLevel, Line } from '../types';

export interface Palette {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  danger: string;
  dangerSoft: string;
  crowd: Record<CrowdLevel, string>;
  crowdSoft: Record<CrowdLevel, string>;
  neutralSoft: string;
}

const crowd = { green: '#16A34A', yellow: '#D9A400', red: '#DC2626' };

export const lightColors: Palette = {
  bg: '#F4F6FA',
  card: '#FFFFFF',
  cardAlt: '#EEF2F8',
  text: '#0F1B2D',
  muted: '#5B6B82',
  border: '#E1E7F0',
  primary: '#2563EB',
  primarySoft: '#E6EEFE',
  onPrimary: '#FFFFFF',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  crowd,
  crowdSoft: { green: '#E3F6EA', yellow: '#FDF5D8', red: '#FDE7E7' },
  neutralSoft: '#EEF1F6',
};

export const darkColors: Palette = {
  bg: '#0A111F',
  card: '#131C2E',
  cardAlt: '#1A2539',
  text: '#E8EEF8',
  muted: '#93A3BC',
  border: '#24314A',
  primary: '#5B8CFF',
  primarySoft: '#1A2A4D',
  onPrimary: '#FFFFFF',
  danger: '#F87171',
  dangerSoft: '#3A1A1E',
  crowd: { green: '#22C55E', yellow: '#FACC15', red: '#F87171' },
  crowdSoft: { green: '#123323', yellow: '#3A3210', red: '#3A1A1E' },
  neutralSoft: '#1C2638',
};

/** Each railway line has its own colour (used on chips, map polylines and train cards). */
export const LINE_COLORS: Record<Line, string> = {
  western: '#7C3AED',
  central: '#0891B2',
  harbour: '#DB2777',
};

export const LINE_NAMES: Record<Line, string> = {
  western: 'Western',
  central: 'Central',
  harbour: 'Harbour',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
