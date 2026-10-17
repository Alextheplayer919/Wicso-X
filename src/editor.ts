import L from 'leaflet';
import { emptyMapping, getMapping, updateTerritory, validateMapping, validatePolygon, type Country, type Mapping, type Point, type Territory } from './entities';
import { validateRaster } from './image';
import type { Project } from './project';
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const fields = ['government','leadership','capital','population','economy','armedForces','alliances','conflicts','claims','notes'];
const labels: Record<string,string> = {government:'Government / political system',leadership:'Leadership',capital:'Capital',population:'Population',economy:'Economy',armedForces:'Armed forces',alliances:'Alliances & diplomacy',conflicts:'Current conflicts',claims:'Occupation & claims',notes:'Historical records & notes'};
interface Revision { mapping: Mapping; assets: Map<string,Blob> }
export class MappingEditor {
  private layers = L.layerGroup();
  private handles = L.layerGroup();
  private dialog = document.createElement('dialog');
  private bar = document.createElement('div');
  private directoryButton: HTMLButtonElement;
  private draft: Point[] | null = null;
  private editingId: string | null = null;
  private selectedVertex = -1;
  private preview?: L.Polygon;
  private selected?: string;
  private undoStack: Revision[]=[];
  private redoStack: Revision[]=[];
  private urls: string[]=[];
  private formDirty = false;
  constructor(private map: L.Map, private project:()=>Project|undefined, private changed:()=>void, private busy:()=>boolean) {
    this.layers.addTo(map);this.handles.addTo(map);
    this.dialog.className='entity-dialog'; this.dialog.setAttribute('aria-label','Mapping records'); document.body.append(this.dialog);
    this.dialog.addEventListener('close',()=>{this.releaseUrls();this.formDirty=false;});
    this.dialog.addEventListener('input',()=>{this.formDirty=true;});
    this.dialog.addEventListener('change',()=>{this.formDirty=true;});
    this.dialog.addEventListener('cancel',e=>{if(this.formDirty&&!confirm('Discard unsaved record changes?'))e.preventDefault();});
    this.dialog.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest('button');if(this.formDirty&&b&&b.type==='button'&&!confirm('Discard unsaved record changes?')){e.preventDefault();e.stopImmediatePropagation();}},true);
    this.bar.className='editing-bar';this.bar.setAttribute('aria-label','Territory tools');document.querySelector('.canvas-area')!.append(this.bar);
    this.directoryButton = document.querySelector('#countries')!;
    this.directoryButton.onclick=()=>this.directory();
    map.on('click',(e:L.LeafletMouseEvent)=>{ if(!this.draft || this.busy()) return;const p=this.project()!;const pt:Point=[e.latlng.lng,p.manifest.artwork.height-e.latlng.lat];if(pt[0]<0||pt[1]<0||pt[0]>p.manifest.artwork.width||pt[1]>p.manifest.artwork.height)return this.status('Click inside the artwork.');if(this.draft.length>=500)return this.status('Maximum 500 vertices.');this.draft.push(pt);this.renderDraft(); });
    document.addEventListener('keydown',e=>{
      if(/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName))return;
      if(e.key==='Escape'&&this.draft){e.preventDefault();this.cancel();this.status('Boundary draft cancelled · saved data unchanged');}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!this.dialog.open&&!this.draft){e.preventDefault();this.revise(e.shiftKey);}
    });
    this.controls();
  }
  get hasPendingChanges(){ return this.hasDraft || this.dialog.open && this.formDirty; }
  get hasDraft(){ return this.draft !== null; }
  private state(){const p=this.project();return p?getMapping(p):emptyMapping();}
  private status(message:string){const el=document.querySelector('#status');if(el)el.textContent=message;this.controls();}
  reset(){this.cancel();this.undoStack=[];this.redoStack=[];this.selected=undefined;this.dialog.close();this.render();}
  private releaseUrls(){this.urls.forEach(u=>URL.revokeObjectURL(u));this.urls=[];}
  private commit(mapping:Mapping,assets=this.project()!.extras){
    const p=this.project()!;validateMapping({...p,world:{...p.world,mapping},extras:assets});
    this.undoStack.push({mapping:structuredClone(this.state()),assets:new Map(p.extras)});if(this.undoStack.length>50)this.undoStack.shift();this.redoStack=[];
    p.world.mapping=mapping;p.extras=assets;this.changed();this.render();
  }
  private revise(redo=false){
    if(this.busy()||this.draft||this.dialog.open||!this.project())return;
    const from=redo?this.redoStack:this.undoStack,to=redo?this.undoStack:this.redoStack;const revision=from.pop();if(!revision)return;
    to.push({mapping:structuredClone(this.state()),assets:new Map(this.project()!.extras)});
    this.project()!.world.mapping=revision.mapping;this.project()!.extras=revision.assets;this.changed();this.render();this.status(redo?'Edit restored':'Edit undone');
  }
  private controls(){
    const ready=!!this.project();
    this.directoryButton.disabled=!ready;
    this.bar.innerHTML=this.draft?`<span>${this.editingId?'EDIT BOUNDARY':'TRACE TERRITORY'} · ${this.draft.length} vertices</span><button id="finish-boundary">${this.editingId?'Save boundary':'Finish trace'}</button><button id="remove-vertex">Remove ${this.selectedVertex<0?'last':'selected'}</button><button id="cancel-boundary">Cancel</button>`:`<button id="trace-territory" ${ready?'':'disabled'}>＋ Trace territory</button><button id="records" ${ready?'':'disabled'}>Countries & regions <small>${this.state().countries.length} / ${this.state().territories.length}</small></button><button id="territory-visibility" ${ready?'':'disabled'} aria-pressed="${this.state().visible}">${this.state().visible?'Hide':'Show'} territories</button><button id="undo-edit" ${this.undoStack.length?'':'disabled'} title="Undo (Ctrl+Z)">↶</button><button id="redo-edit" ${this.redoStack.length?'':'disabled'} title="Redo (Ctrl+Shift+Z)">↷</button>`;
    const on=(id:string,action:()=>void)=>{const b=this.bar.querySelector<HTMLButtonElement>(`#${id}`);if(b)b.onclick=()=>{if(!this.busy())action();};};
    on('trace-territory',()=>this.start());on('records',()=>this.directory());on('territory-visibility',()=>this.commit({...this.state(),visible:!this.state().visible}));on('undo-edit',()=>this.revise());on('redo-edit',()=>this.revise(true));
    on('cancel-boundary',()=>{this.cancel();this.status('Boundary draft cancelled · saved data unchanged');});on('finish-boundary',()=>this.finish());on('remove-vertex',()=>{this.draft!.splice(this.selectedVertex<0?this.draft!.length-1:this.selectedVertex,1);this.selectedVertex=-1;this.renderDraft();});
  }
  render(){
    this.layers.clearLayers();const p=this.project();if(!p){this.controls();return;}
    const m=this.state();
    if(m.visible) for(const t of m.territories){
      const owner=m.countries.find(c=>c.id===t.ownerId);
      const polygon=L.polygon(t.points.map(pt=>this.latlng(pt)),{color:owner?.color||t.color,fillColor:owner?.color||t.color,fillOpacity:.26,weight:this.selected===t.id?4:2,dashArray:t.status==='controlled'?undefined:'7 5'});
      polygon.on('click',e=>{if(this.draft)return;L.DomEvent.stopPropagation(e);this.selected=t.id;this.render();this.territoryForm(t);});
      const label=document.createElement('span');label.textContent=t.name;polygon.bindTooltip(label,{direction:'center',className:'territory-label'});polygon.addTo(this.layers);
    }
    this.controls();
  }
  private latlng(pt:Point):L.LatLngTuple{return [this.project()!.manifest.artwork.height-pt[1],pt[0]];}
  private start(t?:Territory){
    if(!this.project()||this.busy())return;this.dialog.close();this.draft=t?structuredClone(t.points):[];this.editingId=t?.id||null;this.selectedVertex=-1;
    this.map.doubleClickZoom.disable();this.status(t?'Drag vertices to correct the boundary. Click a vertex to select it, or + between vertices to insert.':'Click or tap points on the artwork, then Finish trace. Escape cancels.');this.renderDraft();
  }
  private cancel(){this.draft=null;this.editingId=null;this.selectedVertex=-1;this.handles.clearLayers();this.preview=undefined;this.map.doubleClickZoom.enable();this.controls();}
  private renderDraft(){
    this.handles.clearLayers();if(!this.draft)return;
    this.preview=L.polygon(this.draft.map(p=>this.latlng(p)),{color:'#a26425',weight:2,fillOpacity:.12,dashArray:'5 4',interactive:false}).addTo(this.handles);
    this.draft.forEach((pt,i)=>{
      const marker=L.marker(this.latlng(pt),{draggable:true,keyboard:true,title:`Vertex ${i+1}`,icon:L.divIcon({className:`vertex-handle ${this.selectedVertex===i?'chosen':''}`,html:`<span>${i+1}</span>`,iconSize:[24,24],iconAnchor:[12,12]})}).addTo(this.handles);
      marker.on('click',e=>{L.DomEvent.stopPropagation(e);this.selectedVertex=i;this.controls();});
      marker.on('drag',()=>{const ll=marker.getLatLng();this.draft![i]=[ll.lng,this.project()!.manifest.artwork.height-ll.lat];this.preview?.setLatLngs(this.draft!.map(p=>this.latlng(p)));});
      marker.on('dragend',()=>this.renderDraft());
      if(this.editingId){const b=this.draft![(i+1)%this.draft!.length];const mid:Point=[(pt[0]+b[0])/2,(pt[1]+b[1])/2];
        const add=L.marker(this.latlng(mid),{title:`Insert vertex after ${i+1}`,icon:L.divIcon({className:'midpoint-handle',html:'+',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(this.handles);
        add.on('click',e=>{L.DomEvent.stopPropagation(e);if(this.draft!.length>=500)return;this.draft!.splice(i+1,0,mid);this.renderDraft();});}
    });this.controls();
  }
  private finish(){
    try{const p=this.project()!;validatePolygon(this.draft,p.manifest.artwork.width,p.manifest.artwork.height);const points=structuredClone(this.draft!);const old=this.state().territories.find(t=>t.id===this.editingId);if(old){this.commit(updateTerritory(this.state(),{...old,points}));this.cancel();this.status('Boundary saved · download a ZIP to keep');}else {this.cancel();this.territoryForm(undefined,points);}}catch(e){this.status((e as Error).message);}
  }
  private modal(title:string,body:string){this.formDirty=false;this.releaseUrls();this.dialog.innerHTML=`<button type="button" class="entity-close icon-button" aria-label="Close records">×</button><span class="eyebrow">WICSO · WORLD RECORDS</span><h2>${esc(title)}</h2><div class="entity-error" role="alert"></div>${body}`;this.dialog.querySelector<HTMLButtonElement>('.entity-close')!.onclick=()=>this.dialog.close();if(!this.dialog.open)this.dialog.showModal();}
  private error(e:unknown){this.dialog.querySelector('.entity-error')!.textContent=(e as Error).message;}
  directory(){
    if(!this.project()||this.busy())return;
    if(this.draft)return this.status('Finish or cancel your boundary before opening records.');
    const m=this.state();this.modal('Countries & territories',`<p class="entity-intro">Trace boundaries over your artwork. Countries keep the same ID when renamed.</p><div class="record-heading"><h3>Countries <small>${m.countries.length}</small></h3><button class="button primary" id="new-country">＋ Add country</button></div><div class="record-list">${m.countries.map(c=>`<button data-country="${esc(c.id)}"><span class="country-swatch" style="background:${esc(c.color)}"></span><span>${esc(c.name)}</span><small>${m.territories.filter(t=>t.ownerId===c.id).length} regions →</small></button>`).join('')||'<p>No countries yet. Create your first country dossier.</p>'}</div><div class="record-heading"><h3>Territories <small>${m.territories.length}</small></h3><button class="button" id="new-territory">＋ Trace</button></div><div class="record-list">${m.territories.map(t=>`<button data-territory="${esc(t.id)}"><span>${esc(t.name)}</span><small>${esc(m.countries.find(c=>c.id===t.ownerId)?.name||'Unassigned')} →</small></button>`).join('')||'<p>No traced territories. Add at least three points on the map.</p>'}</div>`);
    this.dialog.querySelector<HTMLButtonElement>('#new-country')!.onclick=()=>this.countryForm();this.dialog.querySelector<HTMLButtonElement>('#new-territory')!.onclick=()=>this.start();
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-country]').forEach(b=>b.onclick=()=>this.countryForm(m.countries.find(c=>c.id===b.dataset.country)));
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-territory]').forEach(b=>b.onclick=()=>{const t=m.territories.find(t=>t.id===b.dataset.territory)!;this.selected=t.id;this.map.fitBounds(L.latLngBounds(t.points.map(p=>this.latlng(p))),{padding:[80,80],maxZoom:1});this.render();this.territoryForm(t);});
  }
  private countryForm(old?:Country){
    const c:Country=old||{id:crypto.randomUUID(),name:'',color:'#698853',profile:{},custom:{}};
    this.modal(old?'Country dossier':'New country',`<form id="country-form"><div class="form-row"><label>Name<input name="name" value="${esc(c.name)}" maxlength="200" required></label><label>Political color<input type="color" name="color" value="${esc(c.color)}"></label></div><label>Flag image (PNG, JPEG, WebP · up to 5 MB)<input type="file" name="flag" accept=".png,.jpg,.jpeg,.webp"></label><div id="flag-preview"></div>${c.flag?'<label class="check-label"><input name="removeFlag" type="checkbox"> Remove current flag</label>':''}<div class="dossier-fields">${fields.map(k=>`<label>${labels[k]}<textarea name="${k}" rows="${k==='notes'?4:2}" maxlength="10000">${esc(c.profile[k]||'')}</textarea></label>`).join('')}</div><label>Custom fields (JSON object of text values)<textarea name="custom" rows="3">${esc(JSON.stringify(c.custom,null,2))}</textarea></label><p class="record-id">Stable ID: ${esc(c.id)}</p><div class="entity-actions"><button class="button primary" type="submit">Save country</button><button class="button" id="back-records" type="button">All records</button>${old?'<button class="button danger" id="delete-country" type="button">Delete country</button>':''}</div></form>`);
    if(c.flag){const asset=this.project()!.extras.get(c.flag);if(asset){const url=URL.createObjectURL(asset);this.urls.push(url);const img=document.createElement('img');img.src=url;img.alt=`Flag of ${c.name}`;img.className='country-flag';this.dialog.querySelector('#flag-preview')!.append(img);}}
    const form=this.dialog.querySelector<HTMLFormElement>('#country-form')!;
    form.onsubmit=async e=>{e.preventDefault();if(this.busy())return;const button=form.querySelector<HTMLButtonElement>('[type=submit]')!;button.disabled=true;
      const editingProject = this.project();
      try {const f=new FormData(form);let flag=c.flag;const assets=new Map(this.project()!.extras);const file=f.get('flag') as File;
        if(f.has('removeFlag'))flag=undefined;
        if(file?.size){if(file.size>5*1024*1024)throw new Error('Flag must be under 5 MB.');await validateRaster(file,file.name);const image=new Image();const url=URL.createObjectURL(file);try{image.src=url;await image.decode();if(image.naturalWidth*image.naturalHeight>4_000_000)throw new Error('Flag must be under 4 megapixels.');}finally{URL.revokeObjectURL(url);}flag=`assets/flags/${crypto.randomUUID()}.${file.name.split('.').pop()!.toLowerCase()}`;assets.set(flag,file);}
        if (editingProject !== this.project() || !form.isConnected || !this.dialog.open) return;
        const custom=JSON.parse(String(f.get('custom')));const profile={...c.profile};for(const k of fields)profile[k]=String(f.get(k));
        const next:Country={...c,name:String(f.get('name')).trim(),color:String(f.get('color')),profile,custom};if(flag)next.flag=flag;else delete next.flag;
        const m=structuredClone(this.state());const at=m.countries.findIndex(x=>x.id===c.id);if(at<0)m.countries.push(next);else m.countries[at]=next;
        this.commit(m,assets);this.status('Country saved · download a ZIP to keep');this.countryForm(next);
      }catch(e){this.error(e);}finally{button.disabled=false;}};
    this.dialog.querySelector<HTMLButtonElement>('#back-records')!.onclick=()=>this.directory();
    const del=this.dialog.querySelector<HTMLButtonElement>('#delete-country');if(del)del.onclick=()=>{if(this.state().territories.some(t=>t.ownerId===c.id||t.occupierId===c.id)){this.error(new Error('Reassign owned and occupied territories before deleting this country.'));return;}if(!confirm(`Delete ${c.name}? Undo is available until you close this project.`))return;const m=structuredClone(this.state());m.countries=m.countries.filter(x=>x.id!==c.id);this.commit(m);this.directory();};
  }
  private territoryForm(old?:Territory,points:Point[]=[]){
    const t:Territory=old||{id:crypto.randomUUID(),name:'',points,ownerId:null,occupierId:null,status:'controlled',color:'#698853',notes:''};
    const options=(value:string|null)=>`<option value="">Unassigned</option>${this.state().countries.map(c=>`<option value="${esc(c.id)}" ${c.id===value?'selected':''}>${esc(c.name)}</option>`).join('')}`;
    this.modal(old?'Territory record':'Name your territory',`<form id="territory-form"><label>Territory name<input name="name" value="${esc(t.name)}" maxlength="200" required></label><div class="form-row"><label>Country / parent country<select name="ownerId">${options(t.ownerId)}</select></label><label>Occupying country<select name="occupierId">${options(t.occupierId)}</select></label></div><div class="form-row"><label>Status<select name="status">${['controlled','contested','occupied'].map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}</select></label><label>Unassigned territory color<input type="color" name="color" value="${esc(t.color)}"></label></div><label>Notes<textarea name="notes" rows="4" maxlength="10000">${esc(t.notes)}</textarea></label><p class="record-id">${t.points.length} vertices · ID: ${esc(t.id)}</p><div class="entity-actions"><button class="button primary" type="submit">Save territory</button>${old?'<button class="button" type="button" id="edit-boundary">Edit boundary</button><button class="button" type="button" id="owner-dossier">Country dossier</button><button class="button danger" type="button" id="delete-territory">Delete territory</button>':''}<button class="button" type="button" id="all-records">All records</button></div></form>`);
    const form=this.dialog.querySelector<HTMLFormElement>('#territory-form')!;
    form.onsubmit=e=>{e.preventDefault();if(this.busy())return;try{const f=new FormData(form);const next:Territory={...t,name:String(f.get('name')).trim(),ownerId:String(f.get('ownerId'))||null,occupierId:String(f.get('occupierId'))||null,status:String(f.get('status')) as Territory['status'],color:String(f.get('color')),notes:String(f.get('notes'))};this.commit(updateTerritory(this.state(),next));this.selected=t.id;this.dialog.close();this.render();this.status('Territory saved · download a ZIP to keep');}catch(e){this.error(e);}};
    this.dialog.querySelector<HTMLButtonElement>('#all-records')!.onclick=()=>this.directory();
    const edit=this.dialog.querySelector<HTMLButtonElement>('#edit-boundary');if(edit)edit.onclick=()=>this.start(t);
    const owner=this.dialog.querySelector<HTMLButtonElement>('#owner-dossier');if(owner)owner.onclick=()=>{const c=this.state().countries.find(c=>c.id===t.ownerId);if(c)this.countryForm(c);else this.error(new Error('Assign a country and save the territory first.'));};
    const del=this.dialog.querySelector<HTMLButtonElement>('#delete-territory');if(del)del.onclick=()=>{if(!confirm(`Delete ${t.name}? Undo is available until you close this project.`))return;const m=structuredClone(this.state());m.territories=m.territories.filter(x=>x.id!==t.id);this.commit(m);this.dialog.close();this.status('Territory deleted · Undo available');};
  }
}
