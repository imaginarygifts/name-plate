const $=id=>document.getElementById(id);
let colours=[],sizes=[];

async function api(url,opts={}){const r=await fetch(url,{...opts,headers:{"content-type":"application/json",...(opts.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed");return d}
async function boot(){try{await api("/api/me");$("loginBox").classList.add("hidden");$("adminBox").classList.remove("hidden");load()}catch{}}
$("login").onclick=async()=>{try{await api("/api/login",{method:"POST",body:JSON.stringify({email:$("email").value,password:$("password").value})});location.reload()}catch(e){$("loginMsg").textContent=e.message}}
$("setup").onclick=async()=>{try{const d=await api("/api/setup",{method:"POST",body:JSON.stringify({setupKey:$("setupKey").value,email:$("setupEmail").value,password:$("setupPassword").value})});$("setupMsg").textContent=d.message||"Admin created. You can now log in."}catch(e){$("setupMsg").textContent=e.message}}
$("logout").onclick=async()=>{await api("/api/logout",{method:"POST"});location.reload()};
$("newCat").onclick=reset;
$("addColour").onclick=()=>{colours.push({id:crypto.randomUUID(),name:"",});renderColours()};
$("addSize").onclick=()=>{sizes.push({id:crypto.randomUUID(),name:"",prices:{}});renderSizes()};
function renderColours(){ $("colours").innerHTML=colours.map((c,i)=>`<div class="row"><input data-ci="${i}" value="${c.name||""}" placeholder="Black"><button data-cdel="${i}" class="secondary">Remove</button></div>`).join("");$("colours").querySelectorAll("[data-ci]").forEach(x=>x.oninput=()=>colours[x.dataset.ci].name=x.value);$("colours").querySelectorAll("[data-cdel]").forEach(x=>x.onclick=()=>{colours.splice(x.dataset.cdel,1);renderColours();renderSizes()})}
function renderSizes(){ $("sizes").innerHTML=sizes.map((s,i)=>`<div class="item"><div class="row"><input data-si="${i}" value="${s.name||""}" placeholder="12×18"><button data-sdel="${i}" class="secondary">Remove</button></div>${colours.map(c=>`<div class="row"><span class="muted">${c.name||"Colour"}</span><input type="number" data-price="${i}:${c.id}" value="${Number(s.prices?.[c.id]||0)}" placeholder="Price"></div>`).join("")}</div>`).join("");$("sizes").querySelectorAll("[data-si]").forEach(x=>x.oninput=()=>sizes[x.dataset.si].name=x.value);$("sizes").querySelectorAll("[data-sdel]").forEach(x=>x.onclick=()=>{sizes.splice(x.dataset.sdel,1);renderSizes()});$("sizes").querySelectorAll("[data-price]").forEach(x=>x.oninput=()=>{const [i,c]=x.dataset.price.split(":");sizes[i].prices??={};sizes[i].prices[c]=Number(x.value||0)})}
async function load(){const list=await api("/api/admin/catalogues");$("catList").innerHTML=list.map(c=>`<div class="item"><strong>${c.name}</strong><div class="muted">${c.images?.length||0} images · ${c.active?"Published":"Hidden"}</div><button data-edit="${c.id}" class="secondary">Edit</button><button data-del="${c.id}" class="secondary danger">Delete</button></div>`).join("");$("catList").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>edit(b.dataset.edit,list));$("catList").querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{if(confirm("Delete catalogue?")){await api("/api/admin/catalogues/"+b.dataset.del,{method:"DELETE"});load()}})}
async function edit(id,list){
 const c=list.find(x=>x.id===id); if(!c)return;
 $("catId").value=c.id;$("catName").value=c.name;$("catDesc").value=c.description||"";
 $("catOrder").value=c.order||0;$("catActive").checked=c.active!==false;
 colours=structuredClone(c.colours||[]);sizes=structuredClone(c.sizes||[]);
 renderColours();renderSizes();await loadProductsForUpload();renderImages(c.images||[]);
}
function reset(){$("catId").value="";$("catName").value="";$("catDesc").value="";$("catOrder").value=0;$("catActive").checked=true;colours=[];sizes=[];renderColours();renderSizes();$("imageList").innerHTML="";$("imageProduct").innerHTML='<option value="">Link to product (optional)</option>'}
async function loadProductsForUpload(){const p=await api("/api/admin/products");$("imageProduct").innerHTML='<option value="">Link to product (optional)</option>'+p.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}
function renderImages(images){$("imageList").innerHTML=images.map(x=>`<div class="item"><img src="${x.imageUrl}" style="width:80px;height:80px;object-fit:cover;border-radius:8px"><div class="muted">${x.alt||""}</div><button class="secondary" data-imgdel="${x.id}">Remove</button></div>`).join("");$("imageList").querySelectorAll("[data-imgdel]").forEach(b=>b.onclick=async()=>{await api("/api/admin/catalogue-images/"+b.dataset.imgdel,{method:"DELETE"});load()})}
$("uploadImage").onclick=async()=>{
 const cid=$("catId").value;if(!cid){alert("Save the catalogue first, then upload images.");return}
 const f=$("imageFile").files[0];if(!f){alert("Choose an image.");return}
 const fd=new FormData();fd.append("catalogueId",cid);fd.append("productId",$("imageProduct").value);fd.append("colour",$("imageColour").value);fd.append("alt",$("imageAlt").value);fd.append("file",f);
 const r=await fetch("/api/admin/catalogue-images",{method:"POST",body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error||"Upload failed");$("imageFile").value="";$("imageAlt").value="";$("imageColour").value="";load();
};
$("saveCat").onclick=async()=>{const body={name:$("catName").value.trim(),description:$("catDesc").value,order:Number($("catOrder").value||0),active:$("catActive").checked,colours,sizes};const cid=$("catId").value;await api(cid?"/api/admin/catalogues/"+cid:"/api/admin/catalogues",{method:cid?"PUT":"POST",body:JSON.stringify(body)});reset();load()};
boot();loadProductsForUpload().catch(()=>{});
