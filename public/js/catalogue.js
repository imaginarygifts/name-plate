const $=id=>document.getElementById(id);
let all=[], gallery=[], current=0, currentProductId=null;

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const money=v=>Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:2});

async function load(){
  try{
    const r=await fetch("/api/catalogues");
    if(!r.ok) throw new Error("Unable to load catalogue");
    all=await r.json();
    $("loading").remove();
    const box=$("catalogues");
    if(!all.length){box.innerHTML='<div class="empty">No catalogue available.</div>';return;}
    for(const c of all) await render(c,box);
  }catch(e){$("loading").textContent=e.message;}
}

async function render(c,box){
  const r=await fetch("/api/catalogues/"+encodeURIComponent(c.id));
  const full=await r.json();
  const section=document.createElement("section");
  section.className="section";
  section.innerHTML=`<h2 class="title">${esc(full.name)}</h2>${full.description?`<p class="desc">${esc(full.description)}</p>`:""}`;
  const opt=document.createElement("div");opt.className="options";
  let colour=full.colours?.[0]?.id||full.colours?.[0]?.name||"";
  let size=full.sizes?.[0]?.id||full.sizes?.[0]?.name||"";
  const price=()=>{const s=full.sizes?.find(x=>(x.id||x.name)===size);return Number(s?.prices?.[colour]||s?.price||0)};
  const renderOpts=()=>{
    opt.innerHTML=`<span class="label">Colour</span><div class="buttons">${(full.colours||[]).map(x=>`<button class="opt ${((x.id||x.name)===colour)?"active":""}" data-c="${esc(x.id||x.name)}">${esc(x.name)}</button>`).join("")}</div>
    <span class="label">Size</span><div class="buttons">${(full.sizes||[]).map(x=>`<button class="opt ${((x.id||x.name)===size)?"active":""}" data-s="${esc(x.id||x.name)}">${esc(x.name)}</button>`).join("")}</div>
    <div class="price">₹${money(price())}</div>`;
    opt.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{colour=b.dataset.c;renderOpts()});
    opt.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{size=b.dataset.s;renderOpts()});
  };
  renderOpts();section.appendChild(opt);
  const galleryBox=document.createElement("div");galleryBox.className="gallery";
  (full.images||[]).forEach((im,i)=>{
    const b=document.createElement("button");b.className="card";b.innerHTML=`<img loading="lazy" src="${esc(im.imageUrl)}" alt="${esc(im.alt)}">`;
    b.onclick=()=>open(full.images,i);galleryBox.appendChild(b);
  });
  if(!galleryBox.children.length)galleryBox.innerHTML='<div class="empty">No images yet.</div>';
  section.appendChild(galleryBox);box.appendChild(section);
}
function open(g,i){gallery=g;current=i;update();$("lightbox").classList.remove("hidden")}
function update(){const x=gallery[current];if(!x)return;$("lightboxImg").src=x.imageUrl;$("lightboxImg").alt=x.alt||"";$("lightboxName").textContent=x.productName||"Product";$("lightboxMeta").textContent=x.colour?`Colour: ${x.colour}`:"";currentProductId=x.productId||null}
$("close").onclick=()=>$("lightbox").classList.add("hidden");
$("prev").onclick=()=>{current=(current-1+gallery.length)%gallery.length;update()};
$("next").onclick=()=>{current=(current+1)%gallery.length;update()};
$("orderBtn").onclick=()=>{if(currentProductId)location.href="/product?id="+encodeURIComponent(currentProductId)};
load();
