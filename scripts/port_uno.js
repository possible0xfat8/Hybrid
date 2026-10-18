import fs from 'fs';

// 1. Copy audio.ts
const audioSrc = 'C:/Users/possi/.gemini/antigravity-ide/brain/07711836-ba42-421e-9cd2-f0269b167858/scratch/Hemi-Uno/src/utils/audio.ts';
let audioCode = fs.readFileSync(audioSrc, 'utf8');
fs.writeFileSync('src/lib/uno/audio.ts', audioCode);
console.log('✓ src/lib/uno/audio.ts written');

// 2. Copy Crazy8ColorModal.tsx
const modalSrc = 'C:/Users/possi/.gemini/antigravity-ide/brain/07711836-ba42-421e-9cd2-f0269b167858/scratch/Hemi-Uno/src/components/Crazy8ColorModal.tsx';
let modalCode = fs.readFileSync(modalSrc, 'utf8');
modalCode = modalCode.replace("from '../types'", "from '@/types/uno'");
modalCode = modalCode.replace("from '../utils/audio'", "from '@/lib/uno/audio'");
fs.writeFileSync('src/components/uno/Crazy8ColorModal.tsx', modalCode);
console.log('✓ src/components/uno/Crazy8ColorModal.tsx written');
