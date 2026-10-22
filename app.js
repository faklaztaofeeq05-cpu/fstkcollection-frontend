const API_BASE = "https://fstk-collections-api.onrender.com";
const WHATSAPP = "2347083752801";
const target = document.querySelector("#live-products");
const cart = new Map();
const money = n => new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(n);
const safe = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function productPrice(p){ return Number(p.price ?? (Number(p.price_kobo || 0)/100)); }
function productStock(p){ return Number(p.quantity ?? p.stock ?? 0); }
function productImage(p){ return String(p.imageUrl ?? p.image_url ?? ""); }
async function loadProducts(){
 if(!target) return;
 target.innerHTML = '<p class="catalogue-empty">Loading the latest collection…</p>';
 try {
  const response = await fetch(API_BASE + "/api/products");
  if(!response.ok) throw new Error("Could not load products");
  const data = await response.json();
  const products = Array.isArray(data.products) ? data.products : [];
  if(!products.length){ target.innerHTML='<p class="catalogue-empty">New arrivals will appear here soon. Message us on WhatsApp to ask about available styles and prices.</p>'; return; }
  target.innerHTML = products.map(p => {
   const id=String(p.id), stock=productStock(p), image=productImage(p);
   return '<article class="live-product"><img src="'+safe(image)+'" alt="'+safe(p.name)+'" loading="lazy" onerror="this.style.display=\'none\'"><div class="live-product-info"><span class="product-category">'+safe(p.category || "FSTK COLLECTIONS")+'</span><h3>'+safe(p.name)+'</h3><p class="live-price">'+money(productPrice(p))+'</p>'+(p.description?'<p class="live-description">'+safe(p.description)+'</p>':'')+'<p class="stock-status '+(stock>0?'in-stock':'out-of-stock')+'">'+(stock>0?'In stock: '+stock:'Currently out of stock')+'</p>'+(stock>0?'<div class="buy-controls"><label for="qty-'+safe(id)+'">Quantity</label><input id="qty-'+safe(id)+'" type="number" min="1" max="'+stock+'" value="1" step="1"><button type="button" class="product-order" data-add="'+encodeURIComponent(id)+'">ADD TO ORDER +</button></div>':'<p class="stock-note">Message us on WhatsApp to ask when this item will be available.</p>')+'</div></article>';
  }).join("");
  target.querySelectorAll("[data-add]").forEach(button=>button.addEventListener("click",()=>{
   const id=decodeURIComponent(button.dataset.add||"");
   const p=products.find(item=>String(item.id)===id);
   const input=target.querySelector("#qty-"+CSS.escape(id));
   if(!p||!input)return;
   const quantity=Number(input.value), existing=cart.get(id)?.quantity||0, stock=productStock(p);
   if(!Number.isInteger(quantity)||quantity<1||quantity+existing>stock){alert("Please choose a quantity between 1 and "+Math.max(0,stock-existing)+".");return;}
   cart.set(id,{id,name:p.name,price:productPrice(p),quantity:existing+quantity,stock});
   updateCartDisplay(); button.textContent="ADDED ✓"; window.setTimeout(()=>{if(button.isConnected)button.textContent="ADD TO ORDER +";},1200);
  }));
 } catch (error) {
  console.error("FSTK catalogue load failed:", error);
  target.innerHTML='<div class="catalogue-empty"><p>We could not load the live product catalogue.</p><p>Please refresh this page or message us on WhatsApp.</p><button class="product-order" type="button" id="retry-products">TRY AGAIN ↻</button></div>';
  document.querySelector("#retry-products")?.addEventListener("click", loadProducts);
 }
}
function updateCartDisplay(){
 const items=[...cart.values()], count=items.reduce((s,i)=>s+i.quantity,0), total=items.reduce((s,i)=>s+i.price*i.quantity,0);
 const countEl=document.querySelector("#cart-count"), totalEl=document.querySelector("#cart-total"), button=document.querySelector("#checkout-order");
 if(countEl)countEl.textContent=count?count+" item"+(count===1?"":"s")+" in your order":"Your order is empty";
 if(totalEl)totalEl.textContent=count?"Estimated total: "+money(total):"Add products to begin.";
 if(button)button.disabled=count===0;
}
function openReview(){
 if(!cart.size)return;
 const items=[...cart.values()];
 document.querySelector("#order-lines").innerHTML=items.map(i=>'<div class="order-line"><span>'+safe(i.name)+' × '+i.quantity+'</span><strong>'+money(i.price*i.quantity)+'</strong></div>').join("");
 document.querySelector("#order-grand-total").textContent=money(items.reduce((s,i)=>s+i.price*i.quantity,0));
 document.querySelector(".order-modal").hidden=false;
 document.querySelector('input[name="customerName"]')?.focus();
}
document.querySelector("#checkout-order")?.addEventListener("click",openReview);
document.querySelector("#order-close")?.addEventListener("click",()=>document.querySelector(".order-modal").hidden=true);
document.querySelector(".order-modal")?.addEventListener("click",e=>{if(e.target===e.currentTarget)e.currentTarget.hidden=true;});
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelector(".order-modal").hidden=true;});
document.querySelector("#order-details")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const form=new FormData(e.currentTarget), customerName=String(form.get("customerName")||"").trim(), deliveryLocation=String(form.get("deliveryLocation")||"").trim(), items=[...cart.values()];
 if(!customerName||!deliveryLocation||!items.length)return;
 const messageText=["Hello FSTK COLLECTIONS, I would like to place an order.","","Customer: "+customerName,"Delivery location: "+deliveryLocation,"","ORDER DETAILS",...items.map((i,n)=>(n+1)+". "+i.name+" — Qty: "+i.quantity+" × "+money(i.price)+" = "+money(i.price*i.quantity)),"","Estimated total: "+money(items.reduce((s,i)=>s+i.price*i.quantity,0)),"","Please confirm stock availability, delivery fee and payment details."].join("\n");
 const submit=e.currentTarget.querySelector('button[type="submit"]'); submit.disabled=true;
 try{
  const response=await fetch(API_BASE+"/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer_name:customerName,delivery_address:deliveryLocation,phone:"",items:items.map(i=>({product_id:Number(i.id),quantity:i.quantity}))})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||"Order could not be saved");
  window.open("https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(messageText),"_blank","noopener,noreferrer");
  document.querySelector(".order-modal").hidden=true; cart.clear(); updateCartDisplay(); await loadProducts();
 }catch(err){alert("We could not save this order: "+(err.message||"Please try again")+". You can contact us directly on WhatsApp.");}
 finally{submit.disabled=false;}
});

const ADMIN_KEY = "fstk_owner_admin_token";
const adminToken = () => sessionStorage.getItem(ADMIN_KEY) || "";
const adminHeaders = (json = false) => ({ ...(json ? {"Content-Type":"application/json"} : {}), "x-admin-token": adminToken() });
const adminMessage = (message, error = false) => {
 const el = document.querySelector("#admin-message");
 if(el){ el.textContent=message; el.classList.toggle("error",error); }
};
async function apiJson(path, options = {}) {
 const response = await fetch(API_BASE + path, options);
 const data = await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(data.error || "Request failed ("+response.status+")");
 return data;
}
async function compressProductImage(file) {
 if(!file) return "";
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choose a JPG, PNG or WebP image.");
 if(file.size > 12 * 1024 * 1024) throw new Error("Please choose an image smaller than 12 MB.");
 const source = await new Promise((resolve,reject)=>{
  const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(new Error("Could not read that image.")); reader.readAsDataURL(file);
 });
 const img = await new Promise((resolve,reject)=>{
  const image=new Image(); image.onload=()=>resolve(image); image.onerror=()=>reject(new Error("That image could not be opened.")); image.src=source;
 });
 const scale=Math.min(1,1200/img.width,1200/img.height), canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
 const ctx=canvas.getContext("2d"); if(!ctx) throw new Error("Image compression is not available in this browser.");
 ctx.drawImage(img,0,0,canvas.width,canvas.height);
 let quality=.78, dataUrl=canvas.toDataURL("image/jpeg",quality);
 while(dataUrl.length > 700000 && quality > .35){ quality-=.1; dataUrl=canvas.toDataURL("image/jpeg",quality); }
 if(dataUrl.length > 900000) throw new Error("That image is too large after compression. Choose a smaller photo.");
 return dataUrl;
}
function adminProductRows(products) {
 const target=document.querySelector("#admin-products"); if(!target)return;
 if(!products.length){target.innerHTML='<p class="admin-note">No products yet. Add your first product above.</p>';return;}
 target.innerHTML=products.map(p=>{
  const id=String(p.id), stock=productStock(p), active=p.active!==false;
  return '<div class="admin-product-row"><div class="admin-product-details"><strong>'+safe(p.name)+'</strong><span>'+money(productPrice(p))+' · Stock: '+stock+' · '+(active?'Visible':'Hidden')+'</span></div><div class="admin-product-actions"><button type="button" data-stock="'+safe(id)+'" data-next="'+(stock>0?0:1)+'">'+(stock>0?'Set out of stock':'Set stock to 1')+'</button><button type="button" data-visibility="'+safe(id)+'" data-next="'+(!active)+'">'+(active?'Hide':'Publish')+'</button><button type="button" data-delete="'+safe(id)+'">Delete</button></div></div>';
 }).join("");
 target.querySelectorAll("[data-stock]").forEach(button=>button.addEventListener("click",async()=>{
  try{ await apiJson("/api/products/"+encodeURIComponent(button.dataset.stock),{method:"PATCH",headers:adminHeaders(true),body:JSON.stringify({stock:Number(button.dataset.next)})}); await refreshAdminProducts(); await loadProducts(); }
  catch(e){adminMessage(e.message,true);}
 }));
 target.querySelectorAll("[data-visibility]").forEach(button=>button.addEventListener("click",async()=>{
  try{ await apiJson("/api/products/"+encodeURIComponent(button.dataset.visibility),{method:"PATCH",headers:adminHeaders(true),body:JSON.stringify({active:button.dataset.next==="true"})}); await refreshAdminProducts(); await loadProducts(); }
  catch(e){adminMessage(e.message,true);}
 }));
 target.querySelectorAll("[data-delete]").forEach(button=>button.addEventListener("click",async()=>{
  if(!confirm("Delete this product permanently?"))return;
  try{ await apiJson("/api/products/"+encodeURIComponent(button.dataset.delete),{method:"DELETE",headers:adminHeaders()}); adminMessage("Product deleted."); await refreshAdminProducts(); await loadProducts(); }
  catch(e){adminMessage(e.message,true);}
 }));
}
async function refreshAdminProducts() {
 const data=await apiJson("/api/products?all=true",{headers:adminHeaders()});
 adminProductRows(Array.isArray(data.products)?data.products:[]);
}
document.querySelector("#admin-toggle")?.addEventListener("click",()=>{
 const panel=document.querySelector("#admin-panel"), button=document.querySelector("#admin-toggle");
 const opening=panel.hidden; panel.hidden=!opening; button.setAttribute("aria-expanded",String(opening));
 if(opening)panel.scrollIntoView({behavior:"smooth",block:"start"});
});
document.querySelector("#admin-close")?.addEventListener("click",()=>{
 document.querySelector("#admin-panel").hidden=true;
 document.querySelector("#admin-toggle")?.setAttribute("aria-expanded","false");
});
document.querySelector("#owner-login")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const input=document.querySelector("#admin-token"), token=input.value.trim(), submit=e.currentTarget.querySelector('button[type="submit"]');
 if(!token)return;
 submit.disabled=true; adminMessage("Checking owner access…");
 try{
  const response=await fetch(API_BASE+"/api/products?all=true",{headers:{"x-admin-token":token}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"Owner verification failed. Check your token and API settings.");
  sessionStorage.setItem(ADMIN_KEY,token);
  document.querySelector("#owner-login").hidden=true;
  document.querySelector("#admin-workspace").hidden=false;
  adminMessage("Owner access verified.");
  adminProductRows(Array.isArray(data.products)?data.products:[]);
 }catch(err){sessionStorage.removeItem(ADMIN_KEY);adminMessage(err.message+" If the request is blocked, the backend CORS_ORIGIN must include https://fstkcollections.name.ng.",true);}
 finally{submit.disabled=false;}
});
document.querySelector("#product-form")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const form=e.currentTarget, submit=form.querySelector('button[type="submit"]'), data=new FormData(form);
 submit.disabled=true; adminMessage("Publishing product…");
 try{
  let imageUrl=String(data.get("imageUrl")||"").trim();
  const file=form.elements.imageFile.files?.[0];
  if(file) imageUrl=await compressProductImage(file);
  const price=Number(data.get("price")), stock=Number(data.get("stock"));
  if(!Number.isFinite(price)||price<0||!Number.isSafeInteger(stock)||stock<0)throw new Error("Enter a valid price and whole-number stock quantity.");
  await apiJson("/api/products",{method:"POST",headers:adminHeaders(true),body:JSON.stringify({
   name:String(data.get("name")||"").trim(),category:String(data.get("category")||"Other"),
   description:String(data.get("description")||"").trim(),price_kobo:Math.round(price*100),
   stock,image_url:imageUrl,active:true
  })});
  form.reset(); adminMessage("Product published. It is now available on the public catalogue.");
  await refreshAdminProducts(); await loadProducts();
 }catch(err){adminMessage(err.message+" If the request is blocked, the backend CORS_ORIGIN must include https://fstkcollections.name.ng.",true);}
 finally{submit.disabled=false;}
});
(async function restoreOwnerSession(){
 if(!adminToken())return;
 try{
  const response=await fetch(API_BASE+"/api/products?all=true",{headers:adminHeaders()});
  if(!response.ok)throw new Error("Session expired");
  const data=await response.json();
  document.querySelector("#owner-login").hidden=true;
  document.querySelector("#admin-workspace").hidden=false;
  adminProductRows(Array.isArray(data.products)?data.products:[]);
  adminMessage("Owner session restored for this browser tab.");
 }catch{sessionStorage.removeItem(ADMIN_KEY);}
})();

loadProducts();
