(async function startYanimeriApp(){
  const authenticated = await window.yanimeriAuthReady;
  if (!authenticated) return;
  const { data: ownProfile, error: ownProfileError } = await window.yanimeriSupabase.from('profiles').select('username,display_name,username_changed_at,display_name_changed_at').eq('id', window.yanimeriUser.id).maybeSingle();
  if (ownProfileError) console.error('Could not load Yanimeri username:', ownProfileError);
  window.yanimeriProfileData = ownProfile || null;
const starterAnime = [
 {id:'a1',title:'Frieren: Beyond Journey’s End',genres:'Fantasy · Adventure',status:'Watching',episode:8,rating:'',emoji:'❄',tone:'blue'},
 {id:'a2',title:'The Apothecary Diaries',genres:'Mystery · Drama',status:'Plan to watch',episode:0,rating:'',emoji:'🌿',tone:'green'},
 {id:'a3',title:'Spy x Family',genres:'Comedy · Action',status:'Completed',episode:12,rating:'5',emoji:'✿',tone:'pink'},
 {id:'a4',title:'Violet Evergarden',genres:'Drama · Fantasy',status:'Plan to watch',episode:0,rating:'',emoji:'🕊',tone:'blue'},
 {id:'a5',title:'Kaguya-sama: Love Is War',genres:'Romance · Comedy',status:'On hold',episode:4,rating:'',emoji:'♡',tone:'pink'},
 {id:'a6',title:'Erased',genres:'Mystery · Drama',status:'Completed',episode:12,rating:'4',emoji:'⌛',tone:'green'},
 {id:'a7',title:'A Sign of Affection',genres:'Romance · Slice of Life',status:'Plan to watch',episode:0,rating:'',emoji:'❀',tone:'pink'},
 {id:'a8',title:'Nichijou',genres:'Comedy · Slice of Life',status:'Watching',episode:3,rating:'',emoji:'☁',tone:'blue'}
];
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

const companionChoices = [
 {id:'c1',name:'Mochi',mood:'sweet & cheerful',image:'https://i.pinimg.com/474x/76/a8/0e/76a80ebf4cd62c4694bf67984064c6ca.jpg',hello:'Hiii! I hope you enjoy your time here! ♡'},
 {id:'c2',name:'Yuki',mood:'calm & gentle',image:'https://i.pinimg.com/474x/54/5c/74/545c7408bb3d1e9e7776a25f6ccc0ad5.jpg',hello:'Welcome! Let’s find some lovely stories together.'},
 {id:'c3',name:'Mimi',mood:'curious & playful',image:'https://i.pinimg.com/474x/7f/59/6c/7f596c82797a3e1cf9bffce92f4dd373.jpg',hello:'Ooh, so many anime to discover! Where shall we go?'},
 {id:'c4',name:'Hana',mood:'soft & thoughtful',image:'https://i.pinimg.com/736x/1f/2d/f1/1f2df11428af363277c032496c8c1004.jpg',hello:'I hope Yanimeri feels like a little home for you. ♡'}
];
let companion = JSON.parse(localStorage.getItem('yanimeri_companion') || 'null');
let account = JSON.parse(localStorage.getItem('yanimeri_demo_account') || 'null');
let selectedCompanionId = companion?.id || '';

let anime = JSON.parse(localStorage.getItem('yanimeri_anime') || 'null') || starterAnime;
let entries = JSON.parse(localStorage.getItem('yanimeri_diary') || '[]');
let ideas = JSON.parse(localStorage.getItem('yanimeri_ideas') || '[]');
let profile = JSON.parse(localStorage.getItem('yanimeri_profile') || 'null') || {name:'Little star',bio:'Collecting stories, one episode at a time ♡',avatar:'🌷',avatarImage:'',bannerImage:'',accent:'#c92f43',background:'#fffafa',font:'DM Sans'};
let currentFilter='All', selectedAvatar=profile.avatar, catalogue=[], apiPage=1, apiQuery='', apiMode='top', toastTimer;
function persist(){
 const values={anime,diary:entries,profile,ideas,companion,account};
 localStorage.setItem('yanimeri_anime',JSON.stringify(anime));
 localStorage.setItem('yanimeri_diary',JSON.stringify(entries));
 localStorage.setItem('yanimeri_profile',JSON.stringify(profile));
 localStorage.setItem('yanimeri_ideas',JSON.stringify(ideas));
 localStorage.setItem('yanimeri_companion',JSON.stringify(companion));
 localStorage.setItem('yanimeri_demo_account',JSON.stringify(account));
 if(window.yanimeriUser){
  window.yanimeriSupabase.from('user_data').upsert({user_id:window.yanimeriUser.id,data:values,updated_at:new Date().toISOString()},{onConflict:'user_id'})
   .then(({error})=>{if(error)console.error('Yanimeri cloud save failed:',error)});
 }
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2400)}
function go(page){$$('.page').forEach(p=>p.classList.toggle('active',p.id===page));$$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===page));window.scrollTo({top:0,behavior:'smooth'});if(page==='library')renderLibrary();if(page==='profile')renderProfile();if(page==='ideas')renderIdeas()}
$$('.nav').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
$$('[data-goto]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.goto)));
$('.brand').addEventListener('click',e=>{e.preventDefault();go('home')});
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function poster(a){
 const image=esc(a.image||'');
 return image
  ? `<img class="poster-img" src="${image}" alt="Poster for ${esc(a.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="posterImageFallback(this)"><span class="poster-fallback" style="display:none">Poster unavailable</span>`
  : `<span class="poster-fallback poster-missing">Poster unavailable</span>`;
}
function posterImageFallback(img){
 if(!img.dataset.proxyTried){
  img.dataset.proxyTried='1';
  const raw=img.src.replace(/^https?:\/\//,'');
  img.src='https://images.weserv.nl/?url='+encodeURIComponent(raw);
  return;
 }
 img.style.display='none';
 const fallback=img.nextElementSibling;
 if(fallback) fallback.style.display='grid';
}
function card(a){return `<article class="anime-card"><div class="poster ${a.tone||'blue'}">${poster(a)}</div><div class="anime-info"><h3 title="${esc(a.title)}">${esc(a.title)}</h3><p>${esc(a.genres||'Anime')}</p><div class="card-bottom"><span class="status-pill">${esc(a.status)}</span><div class="card-actions"><button class="icon-btn" data-edit="${esc(a.id)}" title="Edit">Edit</button><button class="icon-btn" data-delete="${esc(a.id)}" title="Remove">×</button></div></div>${a.status==='Watching'?`<p class="episode-note">Episode ${a.episode||0}</p>`:''}${a.rating?`<p class="rating-note">Your rating: ${'★'.repeat(+a.rating)}${'☆'.repeat(5-(+a.rating))}</p>`:''}</div></article>`}
function bindCardActions(root){root.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{anime=anime.filter(a=>a.id!==b.dataset.delete);persist();renderAll();toast('Removed from your library')});root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openAnime(anime.find(a=>a.id===b.dataset.edit)))}
function renderHome(){
 if(companion){
  const c=companionChoices.find(x=>x.id===companion.id)||companionChoices[0];
  $('#welcomeTitle').innerHTML=`Welcome back, ${esc(account?.name||profile.name)}!`;
  $('#welcomeCopy').textContent=c.hello;$('#homeCompanionImage').src=c.image;
  $('#homeCompanionImage').alt=`${c.name}, your Yanimeri companion`;$('#companionBubble').textContent=c.hello;
 }
 const counts={Watching:0,Completed:0,'Plan to watch':0};anime.forEach(a=>{if(counts[a.status]!==undefined)counts[a.status]++});$('#watchingCount').textContent=counts.Watching;$('#completedCount').textContent=counts.Completed;$('#plannedCount').textContent=counts['Plan to watch'];$('#totalCount').textContent=anime.length;const list=anime.filter(a=>a.status==='Watching').slice(0,3);$('#continueGrid').innerHTML=list.map(card).join('');$('#homeEmpty').style.display=list.length?'none':'block';bindCardActions($('#continueGrid'))}
function renderDiscover(){const q=$('#discoverSearch').value.toLowerCase(),g=$('#genreFilter').value.toLowerCase();let list=catalogue.filter(a=>(apiMode==='search'||!q||(a.title+' '+(a.altTitles||[]).join(' ')+' '+a.genres).toLowerCase().includes(q))&&(!g||a.genres.toLowerCase().includes(g)));$('#discoverGrid').innerHTML=list.map(a=>`<article class="anime-card"><div class="poster">${poster(a)}</div><div class="anime-info"><h3 title="${esc(a.title)}">${esc(a.title)}</h3><p>${esc(a.genres)}</p><button class="text-btn" data-add="${esc(a.id)}">＋ Add to my library</button></div></article>`).join('')||'<div class="empty-hint">No matches found. Try another search.</div>';$('#discoverGrid').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const item=catalogue.find(a=>String(a.id)===b.dataset.add);if(anime.some(a=>a.title===item.title)){toast('Already in your library!');return}anime.push({...item,id:'u'+Date.now(),status:'Plan to watch',episode:0,rating:''});persist();renderAll();toast('Added to your library ♡')})}

function normalizeJikan(x){
 const img=x.images?.webp?.large_image_url||x.images?.jpg?.large_image_url||x.images?.webp?.image_url||x.images?.jpg?.image_url||'';
 return {id:'mal'+x.mal_id,mediaCategory:'ANIME',title:x.title_english||x.title||x.title_japanese||'Untitled anime',genres:(x.genres||[]).map(g=>g.name).join(' · ')||'Anime',image:img,episode:0,status:'Plan to watch',rating:'',year:x.year||x.aired?.prop?.from?.year||'',emoji:'✿',mediaType:String(x.type||'').toLowerCase(),releaseStatus:String(x.status||''),startDate:x.aired?.from||''};
}
function normalizeKitsu(x,included=[]){
 const a=x.attributes||{},p=a.posterImage||{};
 const includedGenres=new Map((included||[]).filter(v=>v.type==='genres'||v.type==='categories').map(v=>[String(v.id),v.attributes?.title||v.attributes?.name||'']));
 const genreIds=x.relationships?.genres?.data||[];
 const genreNames=genreIds.map(g=>includedGenres.get(String(g.id))).filter(Boolean);
 return {id:'kitsu'+x.id,mediaCategory:'ANIME',title:a.titles?.en||a.titles?.en_jp||a.canonicalTitle||'Untitled anime',genres:genreNames.join(' · ')||'Anime',image:p.large||p.original||p.medium||'',episode:0,status:'Plan to watch',rating:'',year:a.startDate?Number(a.startDate.slice(0,4)):'',emoji:'✿',mediaType:String(a.subtype||''),releaseStatus:String(a.status||''),startDate:a.startDate||''};
}
function normalizeAniList(x){
 const t=x.title||{},title=t.english||t.romaji||t.native||'Untitled anime';
 const formats={TV:'tv',TV_SHORT:'tv',MOVIE:'movie',OVA:'ova',ONA:'ona',SPECIAL:'special'};
 return {id:'anilist'+x.id,mediaCategory:x.type||'ANIME',title,altTitles:[t.english,t.romaji,t.native,...(x.synonyms||[])].filter(Boolean),genres:(x.genres||[]).join(' · ')||'Anime',image:x.coverImage?.extraLarge||x.coverImage?.large||'',episode:0,status:'Plan to watch',rating:'',year:x.startDate?.year||'',emoji:'✿',mediaType:formats[x.format]||String(x.format||''),releaseStatus:x.status==='FINISHED'?'finished':x.status==='RELEASING'?'current':'',startDate:x.startDate?.year&&x.startDate?.month&&x.startDate?.day?String(x.startDate.year).padStart(4,'0')+'-'+String(x.startDate.month).padStart(2,'0')+'-'+String(x.startDate.day).padStart(2,'0'):''};
}
function resolveSearchQuery(query){
 const normalized=String(query||'').toLowerCase().replace(/[×✕]/g,'x').replace(/[^a-z0-9]+/g,' ').trim();
 // Search the broader spy keyword so both Spy x Family and Spy Classroom can appear.
 if(['spy','spy family','spy x family','spy classroom','spy kyoushitsu','spy room'].includes(normalized))return 'spy';
 return String(query||'').trim();
}
function matchesSearchIntent(item,query){
 const normalized=String(query||'').toLowerCase().replace(/[×✕]/g,'x').replace(/[^a-z0-9]+/g,' ').trim();
 const titles=[item?.title,...(item?.altTitles||[])].filter(Boolean).join(' ').toLowerCase().replace(/[×✕]/g,'x').replace(/[^a-z0-9]+/g,' ');
 if(['spy','spy family','spy x family','spy classroom','spy kyoushitsu','spy room'].includes(normalized)){
  // Include the two requested anime franchises, including Spy Classroom's sequel; exclude unrelated spy keyword matches and crossovers.
  const wanted=titles.includes('spy x family')||titles.includes('spy classroom')||titles.includes('spy kyoushitsu')||titles.includes('spy room');
  return wanted&&!/\b(vs|versus|crossover)\b/i.test(String(item?.title||''));
 }
 return true;
}
async function fetchAniList({page=1,search='',genre=''}={}){
 const query=`query ($page:Int,$search:String,$genre:String) {
  Page(page:$page,perPage:50) {
   pageInfo { hasNextPage }
   media(type:ANIME,search:$search,genre:$genre,format_in:[TV,TV_SHORT,MOVIE,OVA,ONA,SPECIAL],status_in:[FINISHED,RELEASING],isAdult:false,sort:POPULARITY_DESC) {
    id type title { english romaji native } synonyms format status startDate { year month day } episodes duration genres coverImage { large extraLarge }
   }
  }
 }`;
 const response=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables:{page,search:search||null,genre:genre||null}})});
 if(!response.ok)throw new Error('AniList request failed ('+response.status+')');
 const payload=await response.json();
 if(payload.errors?.length)throw new Error(payload.errors[0].message||'AniList query failed');
 return {items:(payload.data?.Page?.media||[]).map(normalizeAniList).filter(isUsableAnime),hasNext:!!payload.data?.Page?.pageInfo?.hasNextPage};
}
function isUsableAnime(item){
 const title=String(item?.title||'').trim();
 const allowedTypes=['tv','movie','ova','ona','special'];
 const mediaCategory=String(item?.mediaCategory||'').toUpperCase();
 const type=String(item?.mediaType||'').trim().toLowerCase();
 const release=String(item?.releaseStatus||'').trim().toLowerCase();
 const today=new Date().toISOString().slice(0,10);
 const futureStart=!!item?.startDate&&item.startDate>today;
 const releasedStatus=['finished','current','finished airing','currently airing'];
 const knownRelease=release?releasedStatus.includes(release):!!item?.startDate&&!futureStart;
 // Brand campaigns, commercials and other marketing tie-ins are not watchable anime entries.
 const marketingPattern=/\b(campaign|commercial|advertisement|advertising|promotional|promotion|collaboration|collab|tie[ -]?in|brand[ -]?project)\b/i;
 const isMarketing=marketingPattern.test(title);
 return mediaCategory==='ANIME'&&!!title&&!/^deleted(?:\b|\s)/i.test(title)&&!isMarketing&&!!String(item?.image||'').trim()&&allowedTypes.includes(type)&&knownRelease&&!futureStart;
}
function matchesAnimeSearch(item,query){
 const ignored=new Set(['x','the','a','an','and','of','part','season','movie','tv']);
 const words=String(query||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(w=>w.length>1&&!ignored.has(w));
 const title=String(item?.title||'').toLowerCase();
 return words.length===0||words.every(word=>title.includes(word));
}
async function fetchWithRetry(url,attempts=3){
 let lastError;
 // Kitsu is a JSON:API service and rejects the generic application/json Accept
 // header with HTTP 406. Jikan uses ordinary JSON.
 const isKitsu=/kitsu\.io/i.test(url);
 const headers=isKitsu
  ? {'Accept':'application/vnd.api+json','Content-Type':'application/vnd.api+json'}
  : {'Accept':'application/json'};
 for(let i=0;i<attempts;i++){
  const controller=new AbortController();
  const timeoutId=setTimeout(()=>controller.abort(),7000);
  try{
   const response=await fetch(url,{method:'GET',headers,mode:'cors',signal:controller.signal});
   clearTimeout(timeoutId);
   if(response.status===429||response.status>=500){
    if(i<attempts-1){
     const retryAfter=Number(response.headers.get('Retry-After'))*1000;
     await new Promise(r=>setTimeout(r,retryAfter|| (response.status===429?1800:700*(i+1))));
     continue;
    }
   }
   if(!response.ok)throw new Error('Request failed ('+response.status+')');
   return await response.json();
  }catch(err){
   clearTimeout(timeoutId);
   lastError=err;
   if(i<attempts-1)await new Promise(r=>setTimeout(r,600*(i+1)));
  }
 }
 throw lastError||new Error('Could not reach anime database');
}
const diverseAnimeGenres = [
 {id:22,name:'Romance'},{id:36,name:'Slice of Life'},{id:4,name:'Comedy'},
 {id:10,name:'Fantasy'},{id:8,name:'Drama'},{id:7,name:'Mystery'},
 {id:30,name:'Sports'},{id:2,name:'Adventure'},{id:24,name:'Sci-Fi'},
 {id:37,name:'Supernatural'},{id:14,name:'Horror'},{id:26,name:'Girls Love'},
 {id:28,name:'Boys Love'}
];
let animeRequestId=0;
function mergeCatalogue(items){
 const seen=new Set(catalogue.map(x=>String(x.id)));
 for(const item of items){if(isUsableAnime(item)&&!seen.has(String(item.id))){seen.add(String(item.id));catalogue.push(item)}}
}
async function loadDiverseAnime(requestId){
 // Use one paginated feed instead of dozens of separate genre requests.
 let kitsuOffset=20;
 let source='kitsu';
 while(requestId===animeRequestId&&catalogue.length<200){
  let items=[];
  try{
   const data=source==='kitsu'
    ?await fetchWithRetry(`https://kitsu.io/api/edge/anime?page%5Blimit%5D=20&page%5Boffset%5D=${kitsuOffset}&sort=-userCount&include=genres`,1)
    :await fetchWithRetry(`https://api.jikan.moe/v4/top/anime?page=${Math.floor(catalogue.length/25)+1}&limit=25&filter=bypopularity`,1);
   if(requestId!==animeRequestId)return;
   items=(data.data||[]).map(x=>source==='kitsu'?normalizeKitsu(x,data.included||[]):normalizeJikan(x)).filter(isUsableAnime);
   if(source==='kitsu'&&(data.data||[]).length)kitsuOffset+=20;
   if(!items.length)break;
  }catch(error){
   if(source==='kitsu'){
    console.warn('Kitsu pagination unavailable; trying Jikan:',error);
    source='jikan';
    continue;
   }
   console.warn('Anime catalogue expansion paused:',error);
   break;
  }
  const before=catalogue.length;
  mergeCatalogue(items);
  if(catalogue.length>before){
   renderDiscover();
   $('#catalogueStatus').textContent=`${catalogue.length} anime loaded · adding more in the background…`;
  }
  await new Promise(r=>setTimeout(r,180));
 }
 if(requestId===animeRequestId){
  $('#catalogueStatus').textContent=catalogue.length>=200
   ?`${catalogue.length} anime loaded. Enjoy browsing!`
   :`${catalogue.length} anime loaded so far. Tap Load more anime to continue.`;
  $('#loadMoreAnime').disabled=false;
  $('#loadMoreAnime').textContent='Load more anime ↓';
 }
}
async function loadAnime(reset=false){
 const requestId=++animeRequestId;
 if(reset){apiPage=1;catalogue=[]}
 const status=$('#catalogueStatus'),more=$('#loadMoreAnime');
 const requestedQuery=apiMode==='search'?resolveSearchQuery(apiQuery):'';
 const selectedGenre=apiMode==='genre'?apiQuery.trim():'';
 status.textContent=apiMode==='search'?'Searching anime titles and alternate names…':apiMode==='genre'?'Finding anime in this genre…':'Loading anime…';
 more.disabled=true;
 try{
  const result=await fetchAniList({page:apiPage,search:requestedQuery,genre:selectedGenre});
  if(requestId!==animeRequestId)return;
  const seen=new Set(catalogue.map(x=>String(x.id)));
  catalogue=catalogue.concat(result.items.filter(x=>matchesSearchIntent(x,apiQuery)&&!seen.has(String(x.id))));
  renderDiscover();
  status.textContent=apiMode==='search'?'“'+requestedQuery+'” · '+catalogue.length+' matching anime':apiMode==='genre'?selectedGenre+' · '+catalogue.length+' anime found':catalogue.length+' anime loaded';
  apiPage++;more.textContent='Load more anime ↓';more.disabled=!result.hasNext;
 }catch(error){
  if(requestId!==animeRequestId)return;
  console.error('AniList catalogue error:',error);
  status.textContent='AniList is temporarily unavailable. Trying backup anime databases…';
  try{
   let fallback=[];
   if(apiMode==='search'){
    const data=await fetchWithRetry('https://api.jikan.moe/v4/anime?q='+encodeURIComponent(requestedQuery)+'&page=1&limit=25&sfw=true',1);
    fallback=(data.data||[]).map(normalizeJikan).filter(x=>isUsableAnime(x)&&matchesSearchIntent(x,apiQuery));
   }else if(apiMode==='genre'){
    const genreId=diverseAnimeGenres.find(x=>x.name.toLowerCase()===selectedGenre.toLowerCase())?.id;
    if(genreId){const data=await fetchWithRetry('https://api.jikan.moe/v4/anime?genres='+genreId+'&order_by=popularity&sort=desc&limit=25&sfw=true',1);fallback=(data.data||[]).map(normalizeJikan).filter(isUsableAnime)}
   }else{
    const data=await fetchWithRetry('https://api.jikan.moe/v4/top/anime?page=1&limit=25&filter=bypopularity',1);
    fallback=(data.data||[]).map(normalizeJikan).filter(isUsableAnime);
   }
   if(requestId!==animeRequestId)return;
   catalogue=fallback;renderDiscover();status.textContent=fallback.length?'Loaded '+fallback.length+' anime from backup database.':'No results found. Try another title or genre.';
   more.disabled=true;
  }catch(fallbackError){
   if(requestId!==animeRequestId)return;
   console.error('Backup catalogue error:',fallbackError);
   status.textContent='Anime databases are temporarily unavailable. Please try again shortly.';
   more.disabled=false;more.textContent='Retry loading anime ↻';
   if(!catalogue.length)$('#discoverGrid').innerHTML='<div class="empty-hint">Could not load anime right now. Please tap Retry.</div>';
  }
 }
}
let searchTimer;
$('#discoverSearch').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{const q=$('#discoverSearch').value.trim();if(q){apiMode='search';apiQuery=q;loadAnime(true)}else{apiMode='top';apiQuery='';loadAnime(true)}},500)});
$('#genreFilter').addEventListener('change',()=>{const g=$('#genreFilter').value.trim();if(g){apiMode='genre';apiQuery=g;loadAnime(true)}else{apiMode='top';apiQuery='';loadAnime(true)}});
$('#loadMoreAnime').onclick=()=>loadAnime(false);
function renderLibrary(){const list=anime.filter(a=>currentFilter==='All'||a.status===currentFilter);$('#libraryGrid').innerHTML=list.map(card).join('');$('#libraryEmpty').style.display=list.length?'none':'block';$('#tabAll').textContent=anime.length;bindCardActions($('#libraryGrid'))}
$$('#libraryTabs .tab').forEach(b=>b.onclick=()=>{$$('#libraryTabs .tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentFilter=b.dataset.status;renderLibrary()});
$('#globalSearch').addEventListener('input',e=>{go('library');currentFilter='All';$$('#libraryTabs .tab').forEach(x=>x.classList.toggle('active',x.dataset.status==='All'));renderLibrary();const q=e.target.value.toLowerCase();$('#libraryGrid').innerHTML=anime.filter(a=>(a.title+' '+a.genres).toLowerCase().includes(q)).map(card).join('');bindCardActions($('#libraryGrid'))});
const dlg=$('#animeDialog');let editingId=null;
function openAnime(a=null){editingId=a?.id||null;$('#dialogTitle').textContent=a?'Edit anime':'Add an anime';$('#animeTitle').value=a?.title||'';$('#animeGenres').value=a?.genres||'';$('#animeStatus').value=a?.status||'Watching';$('#animeEpisode').value=a?.episode||0;$('#animeRating').value=a?.rating||'';$('#submitAnime').textContent=a?'Save changes':'Add to library ♡';dlg.showModal()}
$('#addAnimeTop').onclick=()=>openAnime();
$('#animeForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const item={id:editingId||'u'+Date.now(),title:$('#animeTitle').value.trim(),genres:$('#animeGenres').value.trim()||'Anime',status:$('#animeStatus').value,episode:+$('#animeEpisode').value||0,rating:$('#animeRating').value,emoji:'✧',tone:'pink'};if(!item.title)return;if(editingId)anime=anime.map(a=>a.id===editingId?{...a,...item}:a);else anime.unshift(item);persist();dlg.close();renderAll();toast(editingId?'Changes saved':'Added to your library ♡')});
$('#saveDiary').onclick=()=>{const value=$('#diaryText').value.trim();if(!value){toast('Write a little note first ♡');return}entries.unshift({text:value,date:new Date().toLocaleString()});$('#diaryText').value='';persist();renderDiary();toast('Your private entry was saved')};
function renderDiary(){$('#diaryEntries').innerHTML=entries.map((e,i)=>`<article class="diary-entry"><small>🔒 PRIVATE · ${esc(e.date)}</small><p>${esc(e.text)}</p><button class="text-btn" data-entry-delete="${i}">Delete entry</button></article>`).join('')||'<div class="empty-hint">Your diary is still blank. That’s okay — write whenever you feel like it.</div>';$$('[data-entry-delete]').forEach(b=>b.onclick=()=>{entries.splice(+b.dataset.entryDelete,1);persist();renderDiary();toast('Entry deleted')})}
function cooldownLabel(timestamp,days,label){if(!timestamp)return 'You can change your '+label+' now.';const next=new Date(new Date(timestamp).getTime()+days*86400000);const remaining=next-Date.now();if(remaining<=0)return 'You can change your '+label+' now.';const hours=Math.ceil(remaining/3600000);const daysLeft=Math.floor(hours/24),hoursLeft=hours%24;return 'Next change available in '+(daysLeft?daysLeft+'d ':'')+(hoursLeft?hoursLeft+'h':'')+'.';}
function renderProfile(){profile.accent=profile.accent||'#c92f43';profile.background=profile.background||'#fffafa';profile.font=profile.font||'DM Sans';$('#profileName').value=profile.name;$('#profileBio').value=profile.bio;$('#profileUsername').value=window.yanimeriProfileData?.username||'';const usernameLocked=!!window.yanimeriProfileData?.username_changed_at&&Date.now()<new Date(window.yanimeriProfileData.username_changed_at).getTime()+30*86400000;const displayLocked=!!window.yanimeriProfileData?.display_name_changed_at&&Date.now()<new Date(window.yanimeriProfileData.display_name_changed_at).getTime()+86400000;$('#profileUsername').disabled=usernameLocked;$('#profileName').disabled=displayLocked;$('#usernameCooldown').textContent=cooldownLabel(window.yanimeriProfileData?.username_changed_at,30,'username');$('#displayNameCooldown').textContent=cooldownLabel(window.yanimeriProfileData?.display_name_changed_at,1,'display name');$('#profileNameDisplay').textContent=profile.name;$('#profileBioDisplay').textContent=profile.bio;$('#profileAvatar').innerHTML=profile.avatarImage?`<img src="${profile.avatarImage}" alt="Profile picture">`:esc(profile.avatar);$('#profileBanner').style.backgroundImage=profile.bannerImage?`url("${profile.bannerImage}")`:'';
 $('#profileBanner').style.backgroundPosition=`${profile.bannerX??50}% ${profile.bannerY??50}%`;
 $('#profileBanner').style.backgroundSize=`${profile.bannerZoom??100}% auto`;
 $('#bannerX').value=profile.bannerX??50;$('#bannerY').value=profile.bannerY??50;$('#bannerZoom').value=profile.bannerZoom??100;updateBannerPreview();$('#accentColor').value=profile.accent;$('#backgroundColor').value=profile.background;$('#fontChoice').value=profile.font;$$('#avatarChoices button').forEach(b=>{b.classList.toggle('chosen',b.textContent===profile.avatar);b.onclick=()=>{selectedAvatar=b.textContent;profile.avatarImage='';$$('#avatarChoices button').forEach(x=>x.classList.toggle('chosen',x===b));$('#profileAvatar').textContent=selectedAvatar}})}
function readImage(file,callback){if(!file)return;if(file.size>1200000){toast('Please choose an image smaller than 1.2 MB ♡');return}const reader=new FileReader();reader.onload=()=>callback(reader.result);reader.readAsDataURL(file)}
$('#avatarUpload').onchange=e=>readImage(e.target.files[0],v=>{profile.avatarImage=v;$('#profileAvatar').innerHTML=`<img src="${v}" alt="Profile picture">`;toast('Profile picture preview updated')});
$('#cameraUpload').onchange=e=>readImage(e.target.files[0],v=>{profile.avatarImage=v;$('#profileAvatar').innerHTML=`<img src="${v}" alt="Profile picture">`;toast('Camera picture preview updated')});
$('#bannerUpload').onchange=e=>readImage(e.target.files[0],v=>{profile.bannerImage=v;$('#profileBanner').style.backgroundImage=`url("${v}")`;toast('Banner preview updated')});
function updateBannerPreview(){
 const p=$('#bannerCropPreview');if(!p)return;
 p.style.backgroundImage=profile.bannerImage?`url("${profile.bannerImage}")`:'';
 p.style.backgroundPosition=`${profile.bannerX??50}% ${profile.bannerY??50}%`;
 p.style.backgroundSize=`${profile.bannerZoom??100}% auto`;
}
['bannerX','bannerY','bannerZoom'].forEach(id=>$('#'+id).addEventListener('input',()=>{
 profile.bannerX=+$('#bannerX').value;profile.bannerY=+$('#bannerY').value;profile.bannerZoom=+$('#bannerZoom').value;
 $('#profileBanner').style.backgroundPosition=`${profile.bannerX}% ${profile.bannerY}%`;
 $('#profileBanner').style.backgroundSize=`${profile.bannerZoom}% auto`;updateBannerPreview();
}));

$('#saveProfile').onclick=async()=>{
 const username=$('#profileUsername').value.trim().replace(/^@/,'').toLowerCase();
 const displayName=$('#profileName').value.trim();
 if(!/^[a-z0-9_]{3,20}$/.test(username)){toast('Username must be 3–20 characters: letters, numbers or _ ♡');$('#profileUsername').focus();return}
 if(!displayName){toast('Please enter a display name ♡');$('#profileName').focus();return}
 const old=window.yanimeriProfileData||{};
 const changes={};
 if(username!==old.username)changes.username=username;
 if(displayName!==(old.display_name||''))changes.display_name=displayName;
 let savedProfile=old;
 if(Object.keys(changes).length){
  const {data,error}=await window.yanimeriSupabase.from('profiles').update(changes).eq('id',window.yanimeriUser.id).select('username,display_name,username_changed_at,display_name_changed_at').single();
  if(error){
   const message=String(error.message||'');
   if(error.code==='23505')toast('That username is already taken. Try another ♡');
   else if(message.includes('USERNAME_COOLDOWN'))toast('You can only change your username once every 30 days ♡');
   else if(message.includes('DISPLAY_NAME_COOLDOWN'))toast('You can only change your display name once every 24 hours ♡');
   else toast('Could not save account names: '+message);
   return;
  }
  savedProfile=data;
 }
 window.yanimeriProfileData=savedProfile;
 profile={...profile,name:displayName,bio:$('#profileBio').value.trim(),avatar:selectedAvatar,accent:$('#accentColor').value,background:$('#backgroundColor').value,font:$('#fontChoice').value,bannerX:+$('#bannerX').value,bannerY:+$('#bannerY').value,bannerZoom:+$('#bannerZoom').value};
 persist();applyTheme();renderProfile();$('.mini-profile b').textContent=profile.name;$('.mini-profile .avatar').innerHTML=profile.avatarImage?'<img src="'+profile.avatarImage+'" alt="">':esc(profile.avatar);toast('Your profile and account names are saved ♡')
};
function applyTheme(){document.documentElement.style.setProperty('--accent',profile.accent||'#c92f43');document.documentElement.style.setProperty('--page-bg',profile.background||'#fffafa');document.documentElement.style.setProperty('--user-font',`"${profile.font||'DM Sans'}", sans-serif`)}
function renderIdeas(){$('#ideaList').innerHTML=ideas.map((x,i)=>`<article class="diary-entry"><small>IDEA · ${esc(x.date)}</small><h3>${esc(x.title)}</h3><p>${esc(x.details)}</p><button class="text-btn" data-idea-delete="${i}">Delete idea</button></article>`).join('')||'<div class="empty-hint">Your idea box is empty. Add your first recommendation above ♡</div>';$$('[data-idea-delete]').forEach(b=>b.onclick=()=>{ideas.splice(+b.dataset.ideaDelete,1);persist();renderIdeas()})}
$('#sendIdea').onclick=()=>{const title=$('#ideaTitle').value.trim(),details=$('#ideaDetails').value.trim();if(!title){toast('Give your idea a little title first ♡');return}ideas.unshift({title,details,date:new Date().toLocaleDateString()});$('#ideaTitle').value='';$('#ideaDetails').value='';persist();renderIdeas();toast('Idea saved on this device ♡')};

function showOnboarding(){
 const overlay=$('#onboardingOverlay');
 if(!account){
  const user=window.yanimeriUser;
  account={name:user?.user_metadata?.display_name||user?.email?.split('@')[0]||'Little star',email:user?.email||''};
  profile.name=account.name;
  persist();
 }
 if(!companion){overlay.hidden=false;$('#accountStep').hidden=true;$('#companionStep').hidden=false;renderCompanionChoices()}
 else{overlay.hidden=true;setupCompanionHelper()}
}
function renderCompanionChoices(){
 $('#companionOptions').innerHTML=companionChoices.map(c=>`<button class="companion-choice ${selectedCompanionId===c.id?'selected':''}" data-companion="${c.id}"><span class="choice-art"><img src="${c.image}" alt="${c.name}" onerror="this.alt='Image link unavailable';this.style.opacity='.25'"></span><b>${c.name}</b><small>${c.mood}</small></button>`).join('');
 $$('#companionOptions [data-companion]').forEach(b=>b.onclick=()=>{
  selectedCompanionId=b.dataset.companion;
  $$('#companionOptions .companion-choice').forEach(x=>x.classList.toggle('selected',x===b));
  $('#finishOnboarding').disabled=false;
 });
}
$('#continueToCompanions').onclick=()=>{
 const name=$('#newAccountName').value.trim(),email=$('#newAccountEmail').value.trim();
 if(!name||!email||!email.includes('@')){toast('Add your name and a valid email first ♡');return}
 account={name,email};profile.name=name;persist();$('#accountStep').hidden=true;$('#companionStep').hidden=false;renderCompanionChoices();
};
$('#finishOnboarding').onclick=()=>{
 const chosen=companionChoices.find(c=>c.id===selectedCompanionId);if(!chosen)return;
 companion=chosen;persist();$('#onboardingOverlay').hidden=true;renderHome();setupCompanionHelper();toast(`You and ${chosen.name} are ready! ♡`);
};
function setupCompanionHelper(){
 if(!companion)return;const c=companionChoices.find(x=>x.id===companion.id)||companionChoices[0];
 $('#companionHelper').hidden=false;$('#helperImage').src=c.image;$('#helperName').textContent=c.name;
 $('#helperText').textContent='Need a hand? I can show you around Yanimeri! ♡';
}
$('#helperCharacter').onclick=()=>{$('#helperPopover').hidden=!$('#helperPopover').hidden};
$('#helperClose').onclick=()=>$('#helperPopover').hidden=true;
$$('[data-help-page]').forEach(b=>b.onclick=()=>{$('#helperPopover').hidden=true;go(b.dataset.helpPage);toast(`Let's visit ${b.textContent.toLowerCase()}!`)});

function renderAll(){renderHome();renderDiscover();renderLibrary();renderDiary();renderProfile();$('.mini-profile b').textContent=profile.name||'Little star';$('.mini-profile .avatar').innerHTML=profile.avatarImage?`<img src="${profile.avatarImage}" alt="">`:esc(profile.avatar||'🌷');applyTheme();renderIdeas()}
renderAll();showOnboarding();loadAnime(true);

})();
