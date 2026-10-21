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
 } catch { target.innerHTML='<p class="catalogue-empty">Products could not load right now. Please contact us on WhatsApp for current styles and prices.</p>'; }
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
loadProducts();
