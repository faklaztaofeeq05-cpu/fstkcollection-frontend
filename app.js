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

document.querySelector("#owner-logout")?.addEventListener("click",async()=>{
 const token=adminToken();
 try{ if(token) await fetch(API_BASE+"/api/admin/logout",{method:"POST",headers:{"x-admin-token":token}}); }catch{}
 sessionStorage.removeItem(ADMIN_KEY);
 document.querySelector("#admin-workspace").hidden=true;
 document.querySelector("#owner-login").hidden=false;
 document.querySelector("#owner-login").reset();
 adminMessage("You have signed out.");
});

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
 const form=e.currentTarget, email=String(new FormData(form).get("email")||"").trim(), password=String(new FormData(form).get("password")||"");
 const submit=form.querySelector('button[type="submit"]');
 if(!email||!password)return;
 submit.disabled=true; adminMessage("Signing in securely…");
 try{
  const response=await fetch(API_BASE+"/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"Owner sign-in failed.");
  sessionStorage.setItem(ADMIN_KEY,data.token);
  await refreshAdminProducts();
  await refreshAdminOrders();
  form.reset();
  form.hidden=true;
  document.querySelector("#admin-workspace").hidden=false;
  adminMessage("Owner sign-in successful.");
 }catch(err){
  sessionStorage.removeItem(ADMIN_KEY);
  form.hidden=false;
  document.querySelector("#admin-workspace").hidden=true;
  adminMessage(err.message+" Check the API deployment and owner credentials, then try again.",true);
 }
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
  await refreshAdminProducts();
  await refreshAdminOrders();
  document.querySelector("#owner-login").hidden=true;
  document.querySelector("#admin-workspace").hidden=false;
  adminMessage("Owner session restored for this browser tab.");
 }catch{sessionStorage.removeItem(ADMIN_KEY);}
})();;


async function refreshAdminOrders() {
 const workspace=document.querySelector("#admin-workspace");
 if(!workspace)return;
 let section=document.querySelector("#admin-orders-section");
 if(!section){
  section=document.createElement("section");
  section.id="admin-orders-section";
  section.className="admin-orders-section";
  section.innerHTML='<div class="admin-workspace-heading"><h3>Customer orders & sales</h3><button id="refresh-orders" type="button">REFRESH ORDERS ↻</button></div><p class="admin-note">Orders do not reduce stock until you explicitly confirm that the product was bought. Use “CONFIRM SALE & REDUCE STOCK” only after the sale is real.</p><div id="admin-orders-list"><p class="admin-note">Loading orders…</p></div>';
  workspace.appendChild(section);
  section.querySelector("#refresh-orders")?.addEventListener("click",()=>refreshAdminOrders().catch(err=>adminMessage(err.message,true)));
 }
 const list=section.querySelector("#admin-orders-list");
 list.innerHTML='<p class="admin-note">Loading orders…</p>';
 try{
  const data=await apiJson("/api/orders",{headers:adminHeaders()});
  const orders=Array.isArray(data.orders)?data.orders:[];
  if(!orders.length){list.innerHTML='<p class="admin-note">No customer orders yet.</p>';return;}
  const statusLabel={pending:"Pending",confirmed:"Confirmed",packed:"Packed",dispatched:"Dispatched",completed:"Sale confirmed",cancelled:"Cancelled"};
  list.innerHTML=orders.map(order=>{
   const id=String(order.id), items=Array.isArray(order.items)?order.items:[];
   const itemText=items.map(item=>safe(item.product_name)+" × "+Number(item.quantity||0)).join(", ")||"No items";
   const total=Number(order.total_kobo||0)/100;
   const date=order.created_at?new Date(order.created_at).toLocaleString():"";
   const deducted=order.stock_deducted===true || order.stock_deducted==="true";
   const status=String(order.status||"pending").toLowerCase();
   const saleButton=deducted
    ? '<button type="button" disabled class="sale-confirmed-button">STOCK ALREADY RECORDED ✓</button>'
    : status==="cancelled"
      ? '<button type="button" disabled>Cancelled order</button>'
      : '<button type="button" class="sale-confirm-button" data-confirm-sale="'+safe(id)+'">CONFIRM SALE & REDUCE STOCK</button>';
   const nextButtons=[
    ["confirmed","CONFIRM ORDER"],["packed","MARK PACKED"],["dispatched","MARK DISPATCHED"],["cancelled","CANCEL ORDER"]
   ].filter(([next])=>status!==next && status!=="completed" && status!=="cancelled")
    .map(([next,label])=>'<button type="button" data-order-status="'+safe(id)+'" data-next-status="'+next+'">'+label+'</button>').join("");
   return '<article class="admin-order-row" style="border:1px solid #dedbd4;border-radius:12px;padding:14px;margin:12px 0"><div class="admin-order-head" style="display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap"><strong>Order #'+safe(id)+'</strong><span><b>Status:</b> '+safe(statusLabel[status]||status)+'</span></div><p><b>Customer:</b> '+safe(order.customer_name||"")+'</p><p><b>Delivery:</b> '+safe(order.delivery_address||"")+'</p><p><b>Items:</b> '+itemText+'</p><p><b>Total:</b> '+money(total)+'</p><p><b>Placed:</b> '+safe(date)+'</p><p class="admin-note">'+(deducted?"Stock has already been recorded for this order.":"Stock has not been deducted for this order.")+'</p><div class="admin-product-actions">'+nextButtons+saleButton+'</div></article>';
  }).join("");
  list.querySelectorAll("[data-confirm-sale]").forEach(button=>button.addEventListener("click",async()=>{
   const id=button.dataset.confirmSale;
   if(!confirm("Confirm that order #"+id+" was actually bought? This will reduce stock by the quantities in the order."))return;
   button.disabled=true;button.textContent="RECORDING SALE…";
   try{
    await apiJson("/api/orders/"+encodeURIComponent(id),{method:"PATCH",headers:adminHeaders(true),body:JSON.stringify({status:"completed"})});
    adminMessage("Sale confirmed. Stock has been reduced once for order #"+id+".");
    await refreshAdminProducts(); await loadProducts(); await refreshAdminOrders();
   }catch(err){adminMessage(err.message,true);await refreshAdminOrders();}
  }));
  list.querySelectorAll("[data-order-status]").forEach(button=>button.addEventListener("click",async()=>{
   const id=button.dataset.orderStatus, next=button.dataset.nextStatus;
   const promptText=next==="cancelled"?"Cancel order #"+id+"? Stock will not be reduced.":"Update order #"+id+" to "+next+"? Stock will not be reduced.";
   if(!confirm(promptText))return;
   button.disabled=true;
   try{
    await apiJson("/api/orders/"+encodeURIComponent(id),{method:"PATCH",headers:adminHeaders(true),body:JSON.stringify({status:next})});
    adminMessage("Order #"+id+" updated to "+next+". Stock was not changed.");
    await refreshAdminOrders();
   }catch(err){adminMessage(err.message,true);await refreshAdminOrders();}
  }));
 }catch(err){
  list.innerHTML='<p class="admin-note">Could not load customer orders. '+safe(err.message)+'</p>';
 }
}


loadProducts();
