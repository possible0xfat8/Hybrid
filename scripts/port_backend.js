import fs from 'fs';
import path from 'path';

// 1. Copy gameEngine.ts and adjust imports
const unoEngineSrc = 'C:/Users/possi/.gemini/antigravity-ide/brain/07711836-ba42-421e-9cd2-f0269b167858/scratch/Hemi-Uno/server/gameEngine.ts';
let unoEngineCode = fs.readFileSync(unoEngineSrc, 'utf8');
unoEngineCode = unoEngineCode.replace("from '../src/types.js';", "from '../../../src/types/uno';");
unoEngineCode = unoEngineCode.replace("from './database.js';", "from './database';");
fs.writeFileSync('server/engine/uno/gameEngine.ts', unoEngineCode);
console.log('✓ Wrote server/engine/uno/gameEngine.ts');

// 2. Copy roomManager.ts and adjust imports
const unoRoomSrc = 'C:/Users/possi/.gemini/antigravity-ide/brain/07711836-ba42-421e-9cd2-f0269b167858/scratch/Hemi-Uno/server/roomManager.ts';
let unoRoomCode = fs.readFileSync(unoRoomSrc, 'utf8');
unoRoomCode = unoRoomCode.replace("from './gameEngine.js';", "from './gameEngine';");
unoRoomCode = unoRoomCode.replace("from '../src/types.js';", "from '../../../src/types/uno';");
unoRoomCode = unoRoomCode.replace("from './database.js';", "from './database';");
unoRoomCode = unoRoomCode.replace("from './escrowService.js';", "from '../../services/uno/escrowService';");
fs.writeFileSync('server/engine/uno/roomManager.ts', unoRoomCode);
console.log('✓ Wrote server/engine/uno/roomManager.ts');
