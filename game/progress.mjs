import {LEGACY_IDS,KNOWN_IDS} from './campaign.js';
export const PROGRESS_KEY='birdMathAdventureProgressV2';
const version=2,maxFeathers=12;
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const isV2=raw=>isObject(raw)&&raw.version===version&&isObject(raw.records);
// Missing, unreadable and unrecognized saves are different states. Never erase
// an unreadable/newer save merely because this client cannot interpret it.
function readStored(storage,key){
 try{const text=storage.getItem(key);if(text===null)return {missing:true};return {value:JSON.parse(text)};}
 catch{return {invalid:true};}
}
function isLegacy(raw){
 return isObject(raw)&&Number.isInteger(raw.unlocked)&&raw.unlocked>=0&&raw.unlocked<LEGACY_IDS.length&&
  Array.isArray(raw.best)&&raw.best.length===LEGACY_IDS.length&&
  Array.from(raw.best).every(best=>Number.isInteger(best)&&best>=0&&best<=maxFeathers);
}
const cleanRecord=r=>({completed:r?.completed===true,best:typeof r?.best==='number'&&Number.isFinite(r.best)?Math.max(0,Math.min(maxFeathers,Math.floor(r.best))):0});
export function normalizeProgress(raw={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
 const records={};for(const id of KNOWN_IDS)if(raw.records&&Object.hasOwn(raw.records,id))records[id]=cleanRecord(raw.records[id]);
 return {version,records,lastId:KNOWN_IDS.includes(raw.lastId)?raw.lastId:null};
}
export function mergeProgress(current,incoming){
 const a=normalizeProgress(current),b=normalizeProgress(incoming);for(const [id,r] of Object.entries(b.records)){const previous=a.records[id]||cleanRecord();a.records[id]={completed:previous.completed||r.completed,best:Math.max(previous.best,r.best)};}if(b.lastId)a.lastId=b.lastId;return a;
}
export function migrateLegacy(raw){
 if(!isLegacy(raw))throw new Error('Unsupported legacy save');
 const old=raw,n=old.unlocked,records={};
 for(let i=0;i<LEGACY_IDS.length;i++){const best=Number.isFinite(old.best?.[i])?Math.max(0,Math.min(12,Math.floor(old.best[i]))):0;records[LEGACY_IDS[i]]={best,completed:i<n||best>0};}
 // An old final-world score of zero does not prove completion. All released chapters remain selectable.
 return {version,records,lastId:LEGACY_IDS[n]};
}
export function loadProgress(storage){
 const modern=readStored(storage,PROGRESS_KEY);
 // Even an empty V2 records object is authoritative. Legacy indices belong
 // only to the original eight-world game, never to the reordered campaign.
 if(!modern.missing)return isV2(modern.value)?normalizeProgress(modern.value):normalizeProgress();
 const legacy=readStored(storage,'missingLemmaProgress');
 if(!isLegacy(legacy.value))return normalizeProgress();
 const migrated=migrateLegacy(legacy.value);
 saveProgress(storage,migrated);
 return migrated;
}
export function completeProgress(progress,id,feathers){
 if(!KNOWN_IDS.includes(id))throw new Error('Unknown world');const record=cleanRecord(progress.records[id]);progress.records[id]={completed:true,best:Math.max(record.best,cleanRecord({best:feathers}).best)};progress.lastId=id;return progress;
}
export function saveProgress(storage,progress){
 const stored=readStored(storage,PROGRESS_KEY);
 if(!stored.missing&&!isV2(stored.value))return false;
 try{storage.setItem(PROGRESS_KEY,JSON.stringify(mergeProgress(stored.value,progress)));return true;}catch{return false;}
}
export function exportProgress(progress){return JSON.stringify({format:'bird-math-adventure-save',...normalizeProgress(progress)},null,2);}
export function importProgress(text,current){
 if(typeof text!=='string'||text.length>100000)throw new Error('Save file is too large');const raw=JSON.parse(text);
 if(raw?.format!=='bird-math-adventure-save'||!isV2(raw))throw new Error('Unsupported save file');
 return mergeProgress(current,raw);
}

export const PRE_FLUFFY_BACKUP_KEY='birdMathAdventureProgressV2BeforeFluffy';
export function backupPreviousProgress(storage){
 try{const current=storage.getItem(PROGRESS_KEY);if(current!==null&&storage.getItem(PRE_FLUFFY_BACKUP_KEY)===null)storage.setItem(PRE_FLUFFY_BACKUP_KEY,current);return true;}catch{return false;}
}
