/**
 * DUMMY DATA. Coordinates are plausible approximations for simulation only.
 * The timetable is invented for the demo and is NOT the official railway timetable.
 * Each tuple: [name, code, latitude, longitude]. Order = sequence from the city terminus.
 */
export type StationTuple = [string, string, number, number];

export const WESTERN: StationTuple[] = [
  ['Churchgate', 'CCG', 18.9353, 72.8274],
  ['Marine Lines', 'MEL', 18.9447, 72.8235],
  ['Charni Road', 'CYR', 18.9517, 72.8187],
  ['Grant Road', 'GTR', 18.9633, 72.816],
  ['Mumbai Central', 'BCT', 18.9711, 72.8193],
  ['Mahalaxmi', 'MX', 18.9827, 72.824],
  ['Lower Parel', 'PL', 18.9958, 72.8302],
  ['Prabhadevi', 'PBHD', 19.0087, 72.836],
  ['Dadar', 'DDR', 19.0183, 72.8424],
  ['Matunga Road', 'MRU', 19.0277, 72.8466],
  ['Mahim', 'MM', 19.041, 72.8468],
  ['Bandra', 'BA', 19.0544, 72.8406],
  ['Khar Road', 'KHAR', 19.0694, 72.8397],
  ['Santacruz', 'STC', 19.0819, 72.8413],
  ['Vile Parle', 'VLP', 19.0996, 72.8436],
  ['Andheri', 'ADH', 19.1197, 72.8464],
  ['Jogeshwari', 'JOS', 19.1364, 72.849],
  ['Goregaon', 'GMN', 19.1647, 72.8493],
  ['Malad', 'MDD', 19.1871, 72.8484],
  ['Kandivali', 'KILE', 19.2045, 72.8516],
  ['Borivali', 'BVI', 19.229, 72.8573],
  ['Dahisar', 'DIC', 19.2502, 72.8592],
  ['Mira Road', 'MIRA', 19.2812, 72.8558],
  ['Bhayandar', 'BYR', 19.3114, 72.8524],
  ['Vasai Road', 'BSR', 19.3826, 72.832],
  ['Virar', 'VR', 19.4559, 72.8114],
];

export const CENTRAL: StationTuple[] = [
  ['CSMT', 'CSMT', 18.9402, 72.8356],
  ['Masjid', 'MSD', 18.9517, 72.8384],
  ['Sandhurst Road', 'SNRD', 18.9614, 72.8394],
  ['Byculla', 'BY', 18.9767, 72.8326],
  ['Chinchpokli', 'CHG', 18.9866, 72.8331],
  ['Currey Road', 'CRD', 18.9943, 72.8335],
  ['Parel', 'PR', 19.009, 72.8378],
  ['Dadar', 'DR', 19.019, 72.844],
  ['Matunga', 'MTN', 19.0275, 72.8553],
  ['Sion', 'SIN', 19.0473, 72.8638],
  ['Kurla', 'CLA', 19.0655, 72.8794],
  ['Vidyavihar', 'VVH', 19.0792, 72.8972],
  ['Ghatkopar', 'GC', 19.086, 72.9081],
  ['Vikhroli', 'VK', 19.111, 72.928],
  ['Kanjurmarg', 'KJRD', 19.1296, 72.9285],
  ['Bhandup', 'BND', 19.144, 72.937],
  ['Mulund', 'MLND', 19.1717, 72.9566],
  ['Thane', 'TNA', 19.1863, 72.9758],
  ['Kalwa', 'KLVA', 19.196, 72.9963],
  ['Mumbra', 'MBQ', 19.1906, 73.0228],
  ['Diva', 'DIVA', 19.1873, 73.0434],
  ['Dombivli', 'DI', 19.2183, 73.0868],
  ['Kalyan', 'KYN', 19.2354, 73.1299],
];

export const HARBOUR: StationTuple[] = [
  ['CSMT', 'CSMT', 18.9402, 72.8356],
  ['Dockyard Road', 'DKRD', 18.9663, 72.844],
  ['Reay Road', 'RRD', 18.9772, 72.8445],
  ['Cotton Green', 'CTGN', 18.9863, 72.844],
  ['Sewri', 'SVE', 18.9984, 72.8546],
  ['Wadala Road', 'VDLR', 19.017, 72.859],
  ['GTB Nagar', 'GTBN', 19.036, 72.864],
  ['Chunabhatti', 'CHF', 19.051, 72.87],
  ['Kurla', 'CLA', 19.0655, 72.88],
  ['Tilak Nagar', 'TKNG', 19.067, 72.896],
  ['Chembur', 'CMBR', 19.0622, 72.901],
  ['Govandi', 'GV', 19.0553, 72.915],
  ['Mankhurd', 'MNKD', 19.048, 72.932],
  ['Vashi', 'VSH', 19.0631, 72.9989],
  ['Sanpada', 'SNCR', 19.0626, 73.009],
  ['Juinagar', 'JNJ', 19.0536, 73.0185],
  ['Nerul', 'NEU', 19.0338, 73.0189],
  ['Belapur', 'CBD', 19.019, 73.039],
  ['Kharghar', 'KHAG', 19.026, 73.07],
  ['Panvel', 'PNVL', 18.991, 73.121],
];

export const LINE_DATA = {
  western: { prefix: 'W', stations: WESTERN, fastStops: ['CCG', 'BCT', 'DDR', 'BA', 'ADH', 'BVI', 'BYR', 'BSR', 'VR'] },
  central: { prefix: 'C', stations: CENTRAL, fastStops: ['CSMT', 'BY', 'DR', 'GC', 'TNA', 'DI', 'KYN'] },
  harbour: { prefix: 'H', stations: HARBOUR, fastStops: [] as string[] },
} as const;

export interface TrainSeed {
  number: string;
  line: keyof typeof LINE_DATA;
  type: 'fast' | 'slow';
  from: string; // station code on that line
  to: string;
  departure: string;
  durationMin: number;
}

// Direction is derived: travelling away from the terminus = "down", towards it = "up".
export const TRAINS: TrainSeed[] = [
  { number: '90101', line: 'western', type: 'fast', from: 'CCG', to: 'VR', departure: '07:52', durationMin: 72 },
  { number: '90102', line: 'western', type: 'fast', from: 'VR', to: 'CCG', departure: '08:10', durationMin: 74 },
  { number: '90201', line: 'western', type: 'slow', from: 'CCG', to: 'BVI', departure: '09:05', durationMin: 62 },
  { number: '90202', line: 'western', type: 'slow', from: 'BVI', to: 'CCG', departure: '08:34', durationMin: 63 },
  { number: '90203', line: 'western', type: 'slow', from: 'ADH', to: 'CCG', departure: '18:15', durationMin: 42 },
  { number: '95101', line: 'central', type: 'fast', from: 'CSMT', to: 'KYN', departure: '18:02', durationMin: 78 },
  { number: '95102', line: 'central', type: 'fast', from: 'KYN', to: 'CSMT', departure: '08:20', durationMin: 80 },
  { number: '95201', line: 'central', type: 'slow', from: 'CSMT', to: 'TNA', departure: '17:40', durationMin: 60 },
  { number: '95202', line: 'central', type: 'slow', from: 'TNA', to: 'CSMT', departure: '09:12', durationMin: 61 },
  { number: '95203', line: 'central', type: 'slow', from: 'KYN', to: 'CSMT', departure: '07:30', durationMin: 98 },
  { number: '97201', line: 'harbour', type: 'slow', from: 'CSMT', to: 'PNVL', departure: '10:00', durationMin: 82 },
  { number: '97202', line: 'harbour', type: 'slow', from: 'PNVL', to: 'CSMT', departure: '08:45', durationMin: 84 },
  { number: '97203', line: 'harbour', type: 'slow', from: 'CSMT', to: 'VSH', departure: '19:10', durationMin: 50 },
];

