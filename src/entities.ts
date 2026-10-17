import type { JsonObject, Project } from './project';
export type Point = [number, number];
export interface Country extends JsonObject {
  id: string; name: string; color: string; flag?: string; profile: Record<string, string>; custom: Record<string, string>;
}
export interface Territory extends JsonObject {
  id: string; name: string; points: Point[]; ownerId: string | null; occupierId: string | null;
  status: 'controlled' | 'contested' | 'occupied'; color: string; notes: string;
}
export interface Mapping extends JsonObject {
  version: 1; countries: Country[]; territories: Territory[]; visible: boolean;
  ownershipHistory: Array<{id: string; territoryId: string; from: string | null; to: string | null; at: string}>;
}
export function emptyMapping(): Mapping { return {version:1,countries:[],territories:[],visible:true,ownershipHistory:[]}; }
const err = (message: string): never => { throw new Error(message); };
const record = (x: unknown): x is JsonObject => !!x && typeof x === 'object' && !Array.isArray(x);
const text = (x: unknown, max=10000): x is string => typeof x === 'string' && x.length <= max;
const id = (x: unknown): x is string => text(x,100) && /^[a-zA-Z0-9_-]+$/.test(x);
export const validColor = (x: unknown): x is string => typeof x === 'string' && /^#[a-fA-F0-9]{6}$/.test(x);
function cross(a: Point,b: Point,c: Point) {return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function on(a: Point,b: Point,p: Point) { return Math.abs(cross(a,b,p)) < 1e-8 && p[0]>=Math.min(a[0],b[0])-1e-8 && p[0]<=Math.max(a[0],b[0])+1e-8 && p[1]>=Math.min(a[1],b[1])-1e-8 && p[1]<=Math.max(a[1],b[1])+1e-8; }
function intersects(a: Point,b: Point,c: Point,d: Point) {return cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0 || on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);}
export function validatePolygon(points: unknown, width: number, height: number): asserts points is Point[] {
  if (!Array.isArray(points) || points.length<3 || points.length>500) err('Trace between 3 and 500 vertices.');
  const p = points as Point[];
  for(const v of p) if (!Array.isArray(v)||v.length!==2||!v.every(Number.isFinite)||v[0]<0||v[1]<0||v[0]>width||v[1]>height) err('Territory vertices must stay inside the original image.');
  let area=0;
  for(let i=0;i<p.length;i++) {
    const a=p[i],b=p[(i+1)%p.length];
    if(Math.hypot(a[0]-b[0],a[1]-b[1])<.01) err('Remove duplicate or overlapping vertices.');
    area+=a[0]*b[1]-b[0]*a[1];
    for(let j=i+1;j<p.length;j++) {if(j===i+1 || (i===0&&j===p.length-1)) continue;if(intersects(a,b,p[j],p[(j+1)%p.length])) err('Boundary crosses or touches itself. Move the vertices to form a simple polygon.');}
  }
  if(Math.abs(area)<1) err('Territory boundary must enclose an area.');
}
export function validateMapping(project: Project) {
  const value = project.world.mapping;
  if(value === undefined) return;
  if(!record(value)||value.version!==1) err('Unsupported mapping schema. Your project was not changed.');
  const m=value as unknown as Mapping;
  if(!Array.isArray(m.countries)||!Array.isArray(m.territories)||m.countries.length>500||m.territories.length>1000||typeof m.visible!=='boolean'||!Array.isArray(m.ownershipHistory)||m.ownershipHistory.length>10000) err('Invalid mapping collections or limits exceeded.');
  const ids=new Set<string>();
  for(const c of m.countries) {
    if(!record(c)||!id(c.id)||ids.has(c.id)||!text(c.name,200)||!c.name.trim()||!validColor(c.color)) err('Invalid or duplicate country record.');ids.add(c.id);
    for(const fields of [c.profile,c.custom]) if(!record(fields)||Object.entries(fields).length>100||!Object.entries(fields).every(([k,v])=>text(k,100)&&text(v))) err('Dossier fields must be text (up to 100 fields and 10,000 characters per field).');
    if(c.flag!==undefined && (typeof c.flag!=='string'||!/^assets\/flags\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(c.flag)||!project.extras.has(c.flag))) err('Country flag asset is missing or invalid.');
  }
  const countries=new Set(m.countries.map(c=>c.id));
  let vertices=0;
  for(const t of m.territories) {
    if(!record(t)||!id(t.id)||ids.has(t.id)||!text(t.name,200)||!t.name.trim()||!validColor(t.color)||!text(t.notes)||!['controlled','occupied','contested'].includes(t.status)) err('Invalid or duplicate territory record.'); ids.add(t.id);
    for(const owner of [t.ownerId,t.occupierId]) if(owner!==null && !countries.has(owner)) err('Territory references a missing country.');
    if(Array.isArray(t.points))vertices+=t.points.length;
    if(vertices>10000)err('Mapping exceeds the 10,000-vertex project limit.');
    validatePolygon(t.points,project.manifest.artwork.width,project.manifest.artwork.height);
  }
  const events=new Set<string>();
  for(const e of m.ownershipHistory) {
    if(!record(e)||!id(e.id)||events.has(e.id)||!id(e.territoryId)||!(e.from===null||id(e.from))||!(e.to===null||id(e.to))||!text(e.at,100)||!Number.isFinite(Date.parse(e.at))) err('Invalid ownership history.'); events.add(e.id);
  }
}
export function getMapping(project: Project): Mapping {return project.world.mapping as Mapping | undefined ?? emptyMapping();}
export function updateTerritory(mapping: Mapping, territory: Territory): Mapping {
  const next=structuredClone(mapping);const old=next.territories.find(t=>t.id===territory.id);
  if(old && old.ownerId!==territory.ownerId) next.ownershipHistory.push({id:crypto.randomUUID(),territoryId:territory.id,from:old.ownerId,to:territory.ownerId,at:new Date().toISOString()});
  if(old) next.territories[next.territories.indexOf(old)]=territory; else next.territories.push(territory);
  return next;
}
