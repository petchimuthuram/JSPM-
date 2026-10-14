// ====== CONFIG: after deploying the backend on Render, paste its URL here ======
const API_BASE = "http://localhost:8080";   // e.g. "https://velsmart-api.onrender.com"
// ===============================================================================

const $ = id => document.getElementById(id);
let products = [];
let cart = JSON.parse(localStorage.getItem("vs_cart") || "{}");
let token = localStorage.getItem("vs_token");
$("yr").textContent = new Date().getFullYear();

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const r = await fetch(API_BASE + path, { ...opts, headers });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Something went wrong");
  return data;
}
const openModal = id => $(id).classList.add("open");
const closeAll = () => document.querySelectorAll(".modal").forEach(m => m.classList.remove("open"));
document.querySelectorAll("[data-close]").forEach(b => b.onclick = closeAll);
const setMsg = (el, text, ok) => { el.textContent = text; el.className = "msg" + (ok ? " ok" : ""); };

function refreshLoginBtn() { $("loginBtn").textContent = token ? "Logout" : "Login"; }
$("loginBtn").onclick = () => {
  if (token) { token = null; localStorage.removeItem("vs_token"); refreshLoginBtn(); return; }
  $("stepMobile").hidden = false; $("stepOtp").hidden = true; setMsg($("loginMsg"), ""); openModal("loginModal");
};

async function loadProducts() {
  try {
    products = await api("/api/products");
    $("productGrid").innerHTML = products.map(p => `
      <div class="card prod">
        <div class="em">${p.emoji}</div>
        <h3>${p.name}</h3>
        <small>${p.description}</small>
        <p class="price">₹${p.price} <small>/ ${p.unit}</small></p>
        <span class="tag">Free delivery</span><br><br>
        <button class="btn" onclick="addToCart(${p.id})">Add to cart</button>
      </div>`).join("");
  } catch (e) {
    $("productGrid").innerHTML = "<p>Products are temporarily unavailable. Please call 8608376150.</p>";
  }
}

function saveCart() { localStorage.setItem("vs_cart", JSON.stringify(cart)); renderCart(); }
window.addToCart = id => { cart[id] = (cart[id] || 0) + 1; saveCart(); };
window.chg = (id, d) => { cart[id] = (cart[id] || 0) + d; if (cart[id] <= 0) delete cart[id]; saveCart(); };
function renderCart() {
  let total = 0, count = 0;
  const rows = Object.entries(cart).map(([id, q]) => {
    const p = products.find(x => x.id == id); if (!p) return "";
    total += p.price * q; count += q;
    return `<div class="row"><span>${p.emoji} ${p.name}</span>
      <span><button onclick="chg(${id},-1)">−</button> ${q} <button onclick="chg(${id},1)">+</button></span>
      <b>₹${(p.price * q).toFixed(2)}</b></div>`;
  }).join("");
  $("cartItems").innerHTML = rows || "<p>Your cart is empty.</p>";
  $("cartTotal").textContent = total.toFixed(2);
  $("cartCount").textContent = count;
  $("checkoutForm").hidden = !count;
}
$("cartBtn").onclick = () => { renderCart(); setMsg($("cartMsg"), ""); openModal("cartModal"); };

$("sendOtp").onclick = async () => {
  const mobile = $("mobile").value.trim();
  try {
    const r = await api("/api/auth/send-otp", { method: "POST", body: JSON.stringify({ mobile }) });
    $("stepMobile").hidden = true; $("stepOtp").hidden = false;
    setMsg($("loginMsg"), r.devOtp ? "DEV MODE – your OTP is " + r.devOtp : "OTP sent to your mobile.", true);
  } catch (e) { setMsg($("loginMsg"), e.message); }
};
$("verifyOtp").onclick = async () => {
  try {
    const r = await api("/api/auth/verify-otp", { method: "POST",
      body: JSON.stringify({ mobile: $("mobile").value.trim(), otp: $("otp").value.trim() }) });
    token = r.token; localStorage.setItem("vs_token", token); refreshLoginBtn();
    setMsg($("loginMsg"), "Login successful!", true); setTimeout(closeAll, 800);
  } catch (e) { setMsg($("loginMsg"), e.message); }
};

$("placeOrder").onclick = async () => {
  if (!token) { closeAll(); $("loginBtn").click(); return; }
  try {
    const items = Object.entries(cart).map(([id, qty]) => ({ productId: +id, quantity: qty }));
    const o = await api("/api/orders", { method: "POST", body: JSON.stringify({
      customerName: $("custName").value, address: $("custAddr").value,
      paymentMethod: $("payMethod").value, items }) });
    cart = {}; saveCart();
    setMsg($("cartMsg"), `Order #${o.id} placed! Total ₹${o.total} (delivery free). We will call you shortly.`, true);
  } catch (e) { setMsg($("cartMsg"), e.message); }
};

window.sendEnquiry = () => {
  const n = encodeURIComponent($("qName").value), m = encodeURIComponent($("qMsg").value);
  location.href = `mailto:velsmartindia@gmail.com?subject=Enquiry from ${n}&body=${m}`;
};

refreshLoginBtn();
loadProducts().then(renderCart);
