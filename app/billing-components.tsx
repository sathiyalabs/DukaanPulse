"use client";

import { useState, useMemo } from "react";
import {
  Product,
  Bill,
  ProductCategory,
  buildPaytmUPIUrl,
  generateQRCode,
  computeSalesAnalytics,
  getSavedProducts,
  saveProducts,
  getSavedBills,
  addRealBill,
  clearSyntheticBills,
  resetDemoBills,
  speakTamil,
  PAYTM_DEFAULT_CONFIG,
  getProductName,
  getCategoryLabel,
} from "@/lib/billing";
import { analyzeStoreBills } from "@/lib/ai-assistant";
import {
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  TrendingUp,
  Printer,
  Sparkles,
  ArrowRight,
  Search,
  ShoppingCart,
  Calendar,
  IndianRupee,
  Store,
  ChevronRight,
  Flame,
  Award,
} from "lucide-react";

type CartItem = {
  product: Product;
  quantity: number;
};

// ==========================================
// BILLING SCREEN (பில்லிங் & விற்பனை பதிவு)
// ==========================================
export function BillingScreen({
  lang,
  onGoToAnalytics,
}: {
  lang: "en-IN" | "hi-IN" | "ta-IN";
  onGoToAnalytics: () => void;
}) {
  const isTamil = lang === "ta-IN";
  const isHindi = lang === "hi-IN";

  const [products, setProducts] = useState<Product[]>(() => getSavedProducts());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"paytm_upi" | "cash">("paytm_upi");

  // Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState<string>("");
  const [newProdNameTa, setNewProdNameTa] = useState<string>("");
  const [newProdPrice, setNewProdPrice] = useState<string>("");
  const [newProdCategory, setNewProdCategory] = useState<ProductCategory>("tea_coffee");
  const [newProdEmoji, setNewProdEmoji] = useState<string>("☕");

  // Paytm QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [currentBillId, setCurrentBillId] = useState<string>("");
  const [billTotalAmount, setBillTotalAmount] = useState<number>(0);
  const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Saved bills list and real vs synthetic filtering
  const [savedBillsList, setSavedBillsList] = useState<Bill[]>(() => getSavedBills("all"));
  const [billFilter, setBillFilter] = useState<"all" | "real" | "synthetic">("all");

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === "all" || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.nameTa.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const totalQuantity = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Handle Add Custom Product
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice) return;
    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const newProd: Product = {
      id: "prod_" + Date.now(),
      name: newProdName.trim(),
      nameTa: newProdNameTa.trim() || newProdName.trim(),
      price: Math.round(priceNum),
      category: newProdCategory,
      emoji: newProdEmoji.trim() || "🍽️",
    };

    const updated = [...products, newProd];
    setProducts(updated);
    saveProducts(updated);

    // Reset Form
    setNewProdName("");
    setNewProdNameTa("");
    setNewProdPrice("");
    setShowAddProductModal(false);
  };

  // Generate Paytm QR Code
  const handleOpenPaytmQR = async () => {
    if (totalAmount <= 0) return;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const billId = `DP-${dateStr.replace(/-/g, "")}-${String(Math.floor(100 + Math.random() * 900))}`;

    setCurrentBillId(billId);
    setBillTotalAmount(totalAmount);
    setPaymentConfirmed(false);

    const upiUrl = buildPaytmUPIUrl({
      amount: totalAmount,
      billId,
      note: `Bill-${billId}`,
    });

    const qrData = await generateQRCode(upiUrl);
    setQrCodeDataUrl(qrData);
    setQrModalOpen(true);
  };

  // Complete Payment (Record Real Merchant Bill with verified entry)
  const handleConfirmPayment = () => {
    if (paymentConfirmed) return;

    setPaymentConfirmed(true);

    // Save completed real merchant bill to repository with explicit isSynthetic: false
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newBill: Bill = {
      id: currentBillId,
      timestamp: now.toISOString(),
      date: dateStr,
      time: timeStr,
      hour: now.getHours(),
      items: cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        nameTa: item.product.nameTa,
        nameHi: item.product.nameHi,
        price: item.product.price,
        quantity: item.quantity,
        itemTotal: item.product.price * item.quantity,
      })),
      totalItems: totalQuantity,
      totalAmount: billTotalAmount,
      paymentMethod,
      status: "completed",
      isSynthetic: false,
    };

    const updated = addRealBill(newBill);
    setSavedBillsList(updated);

    // Honest receipt verification announcement (no unsupported Paytm soundbox claims)
    setIsSpeaking(true);
    const speechText = isTamil
      ? `பில் ${currentBillId} பதிவு செய்யப்பட்டது. ${billTotalAmount} ரூபாய் பெறப்பட்டது.`
      : isHindi
        ? `बिल ${currentBillId} दर्ज हुआ। ${billTotalAmount} रुपये प्राप्त हुए।`
        : `Bill ${currentBillId} recorded. ${billTotalAmount} rupees received.`;

    speakTamil(
      speechText,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      lang,
    );
  };

  const handleNextCustomer = () => {
    setQrModalOpen(false);
    setPaymentConfirmed(false);
    clearCart();
  };

  return (
    <div className="billing-container">
      {/* Top Banner */}
      <div className="billing-topbar">
        <div>
          <h1 className="billing-title">
            {isTamil
              ? "பில்லிங் & விற்பனை பதிவு (POS)"
              : isHindi
                ? "क्विक बिलिंग और POS"
                : "Quick Billing & POS"}
          </h1>
          <p className="billing-subtitle">
            {isTamil
              ? "பொருட்களைச் சேர்த்து உடனடி Paytm QR குறியீட்டை உருவாக்கி கட்டணம் பெறுங்கள்."
              : isHindi
                ? "उत्पाद जोड़ें, तत्काल Paytm QR कोड बनाएं और भुगतान प्राप्त करें।"
                : "Add products, generate instant Paytm QR code, and announce payments in Tamil."}
          </p>
        </div>
        <div className="billing-actions-right">
          <button
            className="secondary-btn"
            onClick={() => setShowAddProductModal(true)}
          >
            <Plus size={16} />
            <span>{isTamil ? "பொருள் சேர்க்க" : isHindi ? "उत्पाद जोड़ें" : "Add Product"}</span>
          </button>
          <button className="primary-btn" onClick={onGoToAnalytics}>
            <TrendingUp size={16} />
            <span>{isTamil ? "விற்பனை பகுப்பாய்வு" : isHindi ? "बिक्री विश्लेषण" : "Sales Analytics"}</span>
          </button>
        </div>
      </div>

      <div className="billing-grid">
        {/* Left Column: Product Catalog */}
        <div className="product-catalog-pane">
          {/* Category Tabs & Search */}
          <div className="catalog-controls">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={
                  isTamil
                    ? "பொருள் தேடுக (டீ, வடை, காபி...)"
                    : isHindi
                      ? "उत्पाद खोजें (चाय, समोसा, कॉफ़ी...)"
                      : "Search items (Tea, Vada, Coffee...)"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="clear-search"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="category-chips">
              <button
                className={`cat-chip ${selectedCategory === "all" ? "active" : ""}`}
                onClick={() => setSelectedCategory("all")}
              >
                {isTamil ? "அனைத்தும்" : isHindi ? "सभी" : "All"}
              </button>
              {(
                [
                  "tea_coffee",
                  "snacks",
                  "bakery_tiffin",
                  "drinks",
                ] as ProductCategory[]
              ).map((cat) => (
                <button
                  key={cat}
                  className={`cat-chip ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {getCategoryLabel(cat, lang)}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items Cards */}
          <div className="product-cards-grid">
            {filteredProducts.map((p) => {
              const inCartItem = cart.find(
                (item) => item.product.id === p.id,
              );
              const inCartCount = inCartItem ? inCartItem.quantity : 0;

              return (
                <button
                  type="button"
                  key={p.id}
                  className={`product-card ${inCartCount > 0 ? "in-cart" : ""}`}
                  onClick={() => addToCart(p)}
                >
                  <div className="product-emoji">{p.emoji}</div>
                  <div className="product-details">
                    <strong className="product-name">
                      {getProductName(p, lang)}
                    </strong>
                    <span className="product-alt-name">
                      {lang === "ta-IN" ? p.name : lang === "hi-IN" ? p.name : p.nameTa}
                    </span>
                    <div className="product-price-row">
                      <span className="product-price">₹{p.price}</span>
                      {inCartCount > 0 && (
                        <span className="cart-badge">+{inCartCount}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: POS Cart & Checkout */}
        <div id="pos-cart-panel" className="pos-cart-pane">
          <div className="cart-header">
            <div className="cart-title-row">
              <ShoppingCart size={18} />
              <h2>{isTamil ? "தற்போதைய பில்" : isHindi ? "वर्तमान ऑर्डर" : "Current Order"}</h2>
            </div>
            {cart.length > 0 && (
              <button
                className="cart-clear-btn"
                onClick={clearCart}
                title="Clear Cart"
              >
                <Trash2 size={15} />
                <span>{isTamil ? "அழிக்க" : isHindi ? "साफ़ करें" : "Clear"}</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="cart-items-list">
            {cart.length === 0 ? (
              <div className="cart-empty-state">
                <Store size={36} className="empty-icon" />
                <p>
                  {isTamil
                    ? "பொருட்களை கிளிக் செய்து பில்லில் சேர்க்கவும்"
                    : isHindi
                      ? "बिल में जोड़ने के लिए उत्पादों पर क्लिक करें"
                      : "Tap items on the left to add to bill"}
                </p>
                <small>
                  {isTamil
                    ? "Paytm QR குறியீடு தானாக உருவாகும்"
                    : isHindi
                      ? "Paytm QR कोड स्वतः उत्पन्न होगा"
                      : "Paytm dynamic QR code will be generated"}
                </small>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="cart-row">
                  <div className="cart-row-info">
                    <span className="cart-item-name">
                      {getProductName(item.product, lang)}
                    </span>
                    <span className="cart-item-rate">
                      ₹{item.product.price} × {item.quantity}
                    </span>
                  </div>
                  <div className="cart-qty-controls">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.product.id, -1)}
                    >
                      -
                    </button>
                    <span className="qty-number">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.product.id, 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="cart-row-total">
                    ₹{item.product.price * item.quantity}
                  </div>
                  <button
                    type="button"
                    className="cart-row-delete"
                    onClick={() => removeFromCart(item.product.id)}
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Pay Options */}
          {cart.length > 0 && (
            <div className="cart-footer">
              <div className="cart-subtotal-row">
                <span>
                  {isTamil ? "மொத்த பொருட்கள்" : isHindi ? "कुल आइटम" : "Total Items"}
                </span>
                <span>{totalQuantity}</span>
              </div>
              <div className="cart-total-row">
                <span>{isTamil ? "செலுத்த வேண்டிய தொகை" : isHindi ? "कुल देय राशि" : "Grand Total"}</span>
                <span className="total-rupees">₹{totalAmount}</span>
              </div>

              {/* Payment Method Selector */}
              <div className="payment-method-switch">
                <button
                  type="button"
                  className={`pm-btn ${paymentMethod === "paytm_upi" ? "selected" : ""}`}
                  onClick={() => setPaymentMethod("paytm_upi")}
                >
                  <QrCode size={16} />
                  <span>Paytm UPI QR</span>
                </button>
                <button
                  type="button"
                  className={`pm-btn ${paymentMethod === "cash" ? "selected" : ""}`}
                  onClick={() => setPaymentMethod("cash")}
                >
                  <IndianRupee size={16} />
                  <span>{isTamil ? "ரொக்கம்" : isHindi ? "नकद भुगतान" : "Cash"}</span>
                </button>
              </div>

              {/* QR Checkout Trigger */}
              <button
                className="paytm-checkout-btn"
                onClick={handleOpenPaytmQR}
              >
                <QrCode size={20} />
                <span>
                  {paymentMethod === "paytm_upi"
                    ? isTamil
                      ? `Paytm QR உருவாக்கு (₹${totalAmount})`
                      : isHindi
                        ? `Paytm QR बनाएं (₹${totalAmount})`
                        : `Generate Paytm QR (₹${totalAmount})`
                    : isTamil
                      ? `ரொக்கம் செலுத்துதல் (₹${totalAmount})`
                      : isHindi
                        ? `नकद प्राप्त करें (₹${totalAmount})`
                        : `Receive Cash (₹${totalAmount})`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Cart Summary Button */}
      {cart.length > 0 && !qrModalOpen && (
        <button
          type="button"
          className="mobile-cart-float-bar"
          onClick={() => {
            const el = document.getElementById("pos-cart-panel");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span>🛒 {totalQuantity} {isTamil ? "பொருட்கள்" : isHindi ? "आइटम" : "Items"} · ₹{totalAmount}</span>
          <span>{isTamil ? "பில் பார்க்க / பணம் செலுத்த →" : isHindi ? "ऑर्डर देखें / भुगतान करें →" : "View Cart & Pay →"}</span>
        </button>
      )}

      {/* ========================================== */}
      {/* RECORDED BILLS & SEPARATION OF DEMO / REAL DATA */}
      {/* ========================================== */}
      <section className="recent-bills-panel" style={{ marginTop: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Clock3 size={18} style={{ color: "var(--navy)" }} />
              <span>{isTamil ? "பதிவு செய்யப்பட்ட பில்கள் & பரிவர்த்தனைகள்" : isHindi ? "दर्ज बिल और बिक्री इतिहास" : "Recorded Bills & POS History"}</span>
            </h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
              {isTamil
                ? "நேரடி கடையில் பதிவான உண்மையான பில்கள் மற்றும் மாதிரி தரவு தெளிவாக பிரிக்கப்பட்டுள்ளது."
                : isHindi
                  ? "वास्तविक पीओएस रिकॉर्ड और सिंथेटिक बेंचमार्क डेटा को स्पष्ट रूप से अलग किया गया है।"
                  : "Clearly separates genuine merchant records from synthetic benchmark demo data."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", background: "var(--surface-hover)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => setBillFilter("all")}
                style={{
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  background: billFilter === "all" ? "var(--navy)" : "transparent",
                  color: billFilter === "all" ? "#fff" : "inherit",
                  cursor: "pointer",
                }}
              >
                {isTamil ? "அனைத்தும்" : isHindi ? "सभी" : "All"} ({savedBillsList.length})
              </button>
              <button
                type="button"
                onClick={() => setBillFilter("real")}
                style={{
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  background: billFilter === "real" ? "#059669" : "transparent",
                  color: billFilter === "real" ? "#fff" : "inherit",
                  cursor: "pointer",
                }}
              >
                {isTamil ? "நேரடி POS" : isHindi ? "वास्तविक POS" : "Real POS"} ({savedBillsList.filter((b) => b.isSynthetic !== true).length})
              </button>
              <button
                type="button"
                onClick={() => setBillFilter("synthetic")}
                style={{
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  background: billFilter === "synthetic" ? "#0284c7" : "transparent",
                  color: billFilter === "synthetic" ? "#fff" : "inherit",
                  cursor: "pointer",
                }}
              >
                {isTamil ? "மாதிரி" : isHindi ? "डेमो" : "Demo"} ({savedBillsList.filter((b) => b.isSynthetic === true).length})
              </button>
            </div>

            <button
              type="button"
              className="text-button"
              onClick={() => {
                if (confirm(isTamil ? "மாதிரி பில்களை அழிக்கவா? நேரடி POS பில்கள் பாதுகாக்கப்படும்." : isHindi ? "डेमो डेटा हटाएं? वास्तविक बिल सुरक्षित रहेंगे।" : "Clear demo data? Real merchant POS bills will be preserved.")) {
                  const updated = clearSyntheticBills();
                  setSavedBillsList(updated);
                }
              }}
              style={{ fontSize: 11, padding: "5px 9px", color: "var(--warn)", border: "1px solid var(--border)", borderRadius: 6, background: "transparent", cursor: "pointer" }}
            >
              {isTamil ? "மாதிரி தரவை நீக்குக" : isHindi ? "डेमो डेटा साफ़ करें" : "Clear Demo Data"}
            </button>

            <button
              type="button"
              className="text-button"
              onClick={() => {
                const updated = resetDemoBills();
                setSavedBillsList(updated);
              }}
              style={{ fontSize: 11, padding: "5px 9px", color: "#0284c7", border: "1px solid var(--border)", borderRadius: 6, background: "transparent", cursor: "pointer" }}
            >
              {isTamil ? "மாதிரி தரவை மீட்டமை" : isHindi ? "डेमो डेटा पुनर्स्थापित करें" : "Restore Demo Benchmark"}
            </button>
          </div>
        </div>

        <div className="table-scroll" style={{ maxHeight: 260, overflowY: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: "8px 6px" }}>{isTamil ? "வகை" : isHindi ? "प्रकार" : "Type"}</th>
                <th style={{ padding: "8px 6px" }}>{isTamil ? "பில் எண்" : isHindi ? "बिल आईडी" : "Bill ID"}</th>
                <th style={{ padding: "8px 6px" }}>{isTamil ? "நேரம்" : isHindi ? "समय" : "Time"}</th>
                <th style={{ padding: "8px 6px" }}>{isTamil ? "பொருட்கள்" : isHindi ? "आइटम" : "Items"}</th>
                <th style={{ padding: "8px 6px" }}>{isTamil ? "தொகை" : isHindi ? "राशि" : "Amount"}</th>
                <th style={{ padding: "8px 6px" }}>{isTamil ? "கட்டணம்" : isHindi ? "भुगतान" : "Payment"}</th>
              </tr>
            </thead>
            <tbody>
              {savedBillsList
                .filter((b) => {
                  if (billFilter === "real") return b.isSynthetic !== true;
                  if (billFilter === "synthetic") return b.isSynthetic === true;
                  return true;
                })
                .slice(0, 15)
                .map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "7px 6px" }}>
                      {b.isSynthetic ? (
                        <span style={{ fontSize: 10, padding: "2px 6px", background: "#e0f2fe", color: "#0369a1", borderRadius: 4, fontWeight: 600 }}>
                          {isTamil ? "மாதிரி" : isHindi ? "डेमो" : "Demo"}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, padding: "2px 6px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontWeight: 700 }}>
                          {isTamil ? "நேரடி POS" : isHindi ? "वास्तविक POS" : "Real POS"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "7px 6px", fontWeight: 600, fontFamily: "monospace" }}>{b.id}</td>
                    <td style={{ padding: "7px 6px", color: "#64748b" }}>{b.date} {b.time}</td>
                    <td style={{ padding: "7px 6px" }}>
                      {b.items.map((i) => `${isTamil ? i.nameTa : i.name} (${i.quantity})`).join(", ")}
                    </td>
                    <td style={{ padding: "7px 6px", fontWeight: 700 }}>₹{b.totalAmount}</td>
                    <td style={{ padding: "7px 6px", textTransform: "uppercase", fontSize: 11 }}>
                      {b.paymentMethod === "paytm_upi" ? "UPI QR" : "Cash"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================== */}
      {/* PAYTM QR CODE & SOUNDBOX MODAL */}
      {/* ========================================== */}
      {qrModalOpen && (
        <div className="modal-backdrop">
          <div className="paytm-qr-modal">
            {/* Branded Paytm Soundbox Standee Header */}
            <div className="paytm-standee-header">
              <div className="paytm-header-brand">
                <span className="paytm-logo-text">Paytm</span>
                <span className="paytm-accepted">
                  {isTamil ? "ஏற்கப்படும்" : isHindi ? "यहाँ स्वीकार्य है" : "Accepted Here"}
                </span>
              </div>
              <button
                className="close-modal-btn"
                onClick={() => setQrModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="paytm-modal-body">
              {/* Shop info & Bill ID */}
              <div className="standee-shop-info">
                <strong>
                  {isTamil
                    ? PAYTM_DEFAULT_CONFIG.merchantNameTa
                    : PAYTM_DEFAULT_CONFIG.merchantName}
                </strong>
                <span className="standee-bill-id">{currentBillId}</span>
              </div>

              {/* QR Code Container */}
              <div className="standee-qr-frame">
                {qrCodeDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrCodeDataUrl}
                    alt="Paytm Dynamic QR"
                    className="paytm-qr-image"
                  />
                ) : (
                  <div className="qr-skeleton">QR Generating...</div>
                )}
                <div className="standee-upi-icons">
                  <span>Paytm</span> • <span>GPay</span> • <span>PhonePe</span>{" "}
                  • <span>BHIM UPI</span>
                </div>
              </div>

              {/* Amount Display */}
              <div className="standee-amount-pill">
                <span className="amount-label">
                  {isTamil ? "தொகை" : isHindi ? "राशि" : "Amount"}
                </span>
                <span className="amount-value">₹{billTotalAmount}</span>
              </div>

              {/* Merchant Payment Entry Box */}
              {!paymentConfirmed ? (
                <div className="soundbox-box">
                  <p className="soundbox-hint">
                    {isTamil
                      ? "வாடிக்கையாளர் ஸ்கேன் செய்து பணம் செலுத்தியதும், வணிகர் கட்டணத்தை சரிபார்த்து 'கட்டணம் பதிவு செய்க' என்பதைக் கிளிக் செய்யவும்:"
                      : isHindi
                        ? "ग्राहक द्वारा स्कैन कर भुगतान करने पर, व्यापारी द्वारा सत्यापन कर 'भुगतान दर्ज करें' पर क्लिक करें:"
                        : "Customer scans dynamic QR. Once payment is verified received by the merchant, click Record Payment:"}
                  </p>
                  <button
                    className="paytm-soundbox-play-btn"
                    onClick={handleConfirmPayment}
                  >
                    <CheckCircle2 size={20} className="pulse-icon" />
                    <span>
                      {isTamil
                        ? "கட்டணம் பதிவு செய்க (Merchant Verified)"
                        : isHindi
                          ? "भुगतान दर्ज करें (व्यापारी सत्यापन)"
                          : "Record Payment Received (Merchant Verified)"}
                    </span>
                  </button>
                  <small style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "block" }}>
                    {isTamil
                      ? "நேரடி வணிகர் பதிவு. தானியங்கி Paytm கேட்வே அழைப்பு இல்லை."
                      : isHindi
                        ? "व्यापारी द्वारा मैन्युअल प्रविष्टि। कोई स्वचालित Paytm गेटवे कॉलबैक नहीं।"
                        : "Manual merchant entry. Independent prototype; no automated Paytm gateway callback."}
                  </small>
                </div>
              ) : (
                <div className="payment-success-card">
                  <div className="success-header">
                    <CheckCircle2 size={32} className="success-icon" />
                    <div>
                      <h3>
                        {isTamil
                          ? "கட்டணம் சரிபார்க்கப்பட்டு பதிவு செய்யப்பட்டது!"
                          : isHindi
                            ? "भुगतान सत्यापित और दर्ज किया गया!"
                            : "Payment Verified & Recorded!"}
                      </h3>
                      <p className="voice-transcript">
                        {isTamil
                          ? `🔊 "பில் ${currentBillId} பதிவு செய்யப்பட்டது. ${billTotalAmount} ரூபாய் பெறப்பட்டது."`
                          : isHindi
                            ? `🔊 "बिल ${currentBillId} दर्ज हुआ। ${billTotalAmount} रुपये प्राप्त हुए।"`
                            : `🔊 "Bill ${currentBillId} recorded. ${billTotalAmount} rupees received."`}
                      </p>
                    </div>
                  </div>

                  {isSpeaking && (
                    <div className="soundwave-bar">
                      <span className="wave"></span>
                      <span className="wave"></span>
                      <span className="wave"></span>
                      <span className="wave"></span>
                      <span className="wave-text">
                        {isTamil
                          ? "ரசீது உறுதிப்படுத்தல் ஒலிக்கிறது..."
                          : isHindi
                            ? "रसीद सत्यापन उद्घोषणा..."
                            : "Playing receipt confirmation..."}
                      </span>
                    </div>
                  )}

                  <div className="success-actions">
                    <button
                      className="print-btn"
                      onClick={() => window.print()}
                    >
                      <Printer size={16} />
                      <span>{isTamil ? "ரசீது அச்சிடுக" : isHindi ? "रसीद प्रिंट करें" : "Print Receipt"}</span>
                    </button>
                    <button
                      className="next-customer-btn"
                      onClick={handleNextCustomer}
                    >
                      <ArrowRight size={16} />
                      <span>
                        {isTamil ? "அடுத்த வாடிக்கையாளர்" : isHindi ? "अगला ग्राहक →" : "Next Customer →"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ADD CUSTOM PRODUCT MODAL */}
      {/* ========================================== */}
      {showAddProductModal && (
        <div className="modal-backdrop">
          <div className="add-product-modal">
            <div className="modal-header">
              <h3>
                {isTamil ? "புதிய பொருள் சேர்க்க" : isHindi ? "नया उत्पाद जोड़ें" : "Add New Product"}
              </h3>
              <button
                className="close-modal-btn"
                onClick={() => setShowAddProductModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="modal-form">
              <label>
                <span>{isTamil ? "பொருள் பெயர் (ஆங்கிலம்)" : isHindi ? "उत्पाद नाम (अंग्रेज़ी)" : "Item Name (English)"}</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ginger Tea"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                />
              </label>

              <label>
                <span>{isTamil ? "பொருள் பெயர் (தமிழ் / இந்தி)" : isHindi ? "उत्पाद नाम (हिंदी / क्षेत्रीय)" : "Item Name (Regional)"}</span>
                <input
                  type="text"
                  placeholder="e.g. இஞ்சி டீ / अदरक चाय"
                  value={newProdNameTa}
                  onChange={(e) => setNewProdNameTa(e.target.value)}
                />
              </label>

              <div className="form-row-2">
                <label>
                  <span>{isTamil ? "விலை (₹)" : isHindi ? "कीमत (₹)" : "Price (₹)"}</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="15"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                  />
                </label>

                <label>
                  <span>{isTamil ? "பிரிவு" : isHindi ? "श्रेणी" : "Category"}</span>
                  <select
                    value={newProdCategory}
                    onChange={(e) =>
                      setNewProdCategory(e.target.value as ProductCategory)
                    }
                  >
                    <option value="tea_coffee">{getCategoryLabel("tea_coffee", lang)}</option>
                    <option value="snacks">{getCategoryLabel("snacks", lang)}</option>
                    <option value="bakery_tiffin">{getCategoryLabel("bakery_tiffin", lang)}</option>
                    <option value="drinks">{getCategoryLabel("drinks", lang)}</option>
                    <option value="other">{getCategoryLabel("other", lang)}</option>
                  </select>
                </label>
              </div>

              <label>
                <span>{isTamil ? "சின்னம் (Emoji)" : isHindi ? "चिह्न (Emoji)" : "Icon / Emoji"}</span>
                <input
                  type="text"
                  value={newProdEmoji}
                  onChange={(e) => setNewProdEmoji(e.target.value)}
                  placeholder="☕, 🥯, 🥟, 🥐..."
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowAddProductModal(false)}
                >
                  {isTamil ? "ரத்து" : isHindi ? "रद्द करें" : "Cancel"}
                </button>
                <button type="submit" className="primary-btn">
                  {isTamil ? "சேமி" : isHindi ? "सहेजें" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// ANALYTICS SCREEN (விற்பனை & நேர பகுப்பாய்வு)
// ==========================================
export function AnalyticsScreen({
  lang,
  onGoToBilling,
  onGoToActions,
}: {
  lang: "en-IN" | "hi-IN" | "ta-IN";
  onGoToBilling: () => void;
  onGoToActions: () => void;
}) {
  const isTamil = lang === "ta-IN";
  const isHindi = lang === "hi-IN";

  const [selectedDate, setSelectedDate] = useState<string>("2026-11-15");
  const [bills] = useState<Bill[]>(() => getSavedBills());
  const [products] = useState<Product[]>(() => getSavedProducts());
  const [datasetFilter, setDatasetFilter] = useState<"all" | "real" | "synthetic">("all");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string>("");

  const filteredBills = useMemo(() => {
    if (datasetFilter === "real") return bills.filter((b) => b.isSynthetic !== true);
    if (datasetFilter === "synthetic") return bills.filter((b) => b.isSynthetic === true);
    return bills;
  }, [bills, datasetFilter]);

  const realCount = useMemo(() => bills.filter((b) => b.isSynthetic !== true).length, [bills]);
  const syntheticCount = useMemo(() => bills.filter((b) => b.isSynthetic === true).length, [bills]);

  const analytics = useMemo(() => {
    return computeSalesAnalytics(filteredBills, selectedDate, products);
  }, [filteredBills, selectedDate, products]);

  const availableDates = useMemo(() => {
    return [...new Set(filteredBills.map((b) => b.date))].sort().reverse();
  }, [filteredBills]);

  const storeAI = useMemo(() => {
    const targetDate = selectedDate === "all" ? availableDates[0] || "2026-11-15" : selectedDate;
    return analyzeStoreBills(filteredBills, targetDate, products);
  }, [filteredBills, selectedDate, products, availableDates]);

  // Voice playback triggers
  const handlePlayVoice = (text: string) => {
    setSpokenTranscript(text);
    setIsSpeaking(true);
    speakTamil(
      text,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      lang,
    );
  };

  const handleStopVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  return (
    <div className="analytics-container">
      {/* Top Header */}
      <div className="analytics-topbar">
        <div>
          <h1 className="analytics-title">
            {isTamil
              ? "விற்பனை & நேர பகுப்பாய்வு"
              : isHindi
                ? "बिक्री और समय विश्लेषण"
                : "Sales & Time Analytics"}
          </h1>
          <p className="analytics-subtitle">
            {isTamil
              ? "எந்தப் பொருட்கள் அதிகம் விற்றன, எந்த நேரத்தில் விற்பனை மந்தமாக இருந்தது, மற்றும் 6 நாள் விற்பனை விவரங்கள்."
              : isHindi
                ? "कौन से उत्पाद बिके, किस समय मंदी रही, और 6-दिवसीय बिक्री विवरण।"
                : "Track product volumes, identify inactive dead hours, and review 6-day sales trends."}
          </p>
        </div>
        <div className="analytics-actions-right">
          <button className="secondary-btn" onClick={onGoToBilling}>
            <ShoppingCart size={16} />
            <span>{isTamil ? "பில்லிங் செல்ல" : isHindi ? "बिलिंग पर जाएं" : "Go to Billing"}</span>
          </button>
        </div>
      </div>

      {/* Dataset Separation Bar: Real Records vs Synthetic Demo Benchmark */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {isTamil ? "தரவு ஆதாரம் (Dataset):" : isHindi ? "डेटा स्रोत (Dataset):" : "Dataset:"}
          </span>
          <div style={{ display: "flex", background: "var(--surface-hover)", padding: 2, borderRadius: 6, border: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={() => setDatasetFilter("all")}
              style={{
                padding: "4px 10px",
                fontSize: 11.5,
                fontWeight: 600,
                borderRadius: 5,
                border: "none",
                background: datasetFilter === "all" ? "var(--navy)" : "transparent",
                color: datasetFilter === "all" ? "#fff" : "inherit",
                cursor: "pointer",
              }}
            >
              {isTamil ? "அனைத்தும்" : isHindi ? "सभी" : "All Records"} ({bills.length})
            </button>
            <button
              type="button"
              onClick={() => setDatasetFilter("real")}
              style={{
                padding: "4px 10px",
                fontSize: 11.5,
                fontWeight: 600,
                borderRadius: 5,
                border: "none",
                background: datasetFilter === "real" ? "#059669" : "transparent",
                color: datasetFilter === "real" ? "#fff" : "inherit",
                cursor: "pointer",
              }}
            >
              {isTamil ? "நேரடி POS மட்டும்" : isHindi ? "केवल वास्तविक POS" : "Real POS Only"} ({realCount})
            </button>
            <button
              type="button"
              onClick={() => setDatasetFilter("synthetic")}
              style={{
                padding: "4px 10px",
                fontSize: 11.5,
                fontWeight: 600,
                borderRadius: 5,
                border: "none",
                background: datasetFilter === "synthetic" ? "#0284c7" : "transparent",
                color: datasetFilter === "synthetic" ? "#fff" : "inherit",
                cursor: "pointer",
              }}
            >
              {isTamil ? "மாதிரி பெஞ்ச்மார்க்" : isHindi ? "डेमो बेंचमार्क" : "Demo Benchmark"} ({syntheticCount})
            </button>
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: "#64748b" }}>
          {datasetFilter === "real" ? (
            realCount > 0 ? (
              <span style={{ color: "#059669", fontWeight: 600 }}>✓ {isTamil ? `${realCount} நேரடி கடை விற்பனை பில்கள் ஆய்வு செய்யப்படுகின்றன.` : isHindi ? `${realCount} वास्तविक पीओएस बिलों का विश्लेषण किया जा रहा है।` : `Analyzing ${realCount} genuine store POS bills.`}</span>
            ) : (
              <span style={{ color: "var(--warn)", fontWeight: 500 }}>⚠️ {isTamil ? "நேரடி பில்கள் இன்னும் பதிவு செய்யப்படவில்லை. POS-ல் ஒரு பில்லைப் பதிவு செய்யவும்." : isHindi ? "अभी तक कोई वास्तविक बिल दर्ज नहीं है। पीओएस पर बिल बनाएं।" : "No real POS bills recorded yet. Record a bill in Quick Billing."}</span>
            )
          ) : datasetFilter === "synthetic" ? (
            <span style={{ color: "#0284c7", fontWeight: 600 }}>🔬 {isTamil ? "மாதிரி கடைப் புள்ளிவிவரங்கள் (Synthetic Benchmark)." : isHindi ? "सिंथेटिक बेंचमार्क डेटा (डेमो)।" : "Synthetic 6-day store benchmark demonstration."}</span>
          ) : (
            <span>📈 {isTamil ? "ஒருங்கிணைந்த தரவு (நேரடி + மாதிரி)." : isHindi ? "संयुक्त डेटा (वास्तविक + डेमो)।" : "Combined dataset (Real POS + Demo Benchmark)."}</span>
          )}
        </div>
      </div>

      {/* Date Selector Row & Voice Assistant Pill */}
      <div className="date-filter-bar">
        <div className="filter-chips">
          <span className="filter-label">
            <Calendar size={16} />
            {isTamil ? "தேதி:" : isHindi ? "तारीख:" : "Date:"}
          </span>
          {[
            ...availableDates.map((d, idx) => ({
              id: d,
              label:
                idx === 0
                  ? isTamil ? `இன்று (${d.slice(8)} Nov)` : isHindi ? `आज (${d.slice(8)} Nov)` : `Today (${d.slice(8)} Nov)`
                  : idx === 1
                  ? isTamil ? `நேற்று (${d.slice(8)} Nov)` : isHindi ? `कल (${d.slice(8)} Nov)` : `Yesterday (${d.slice(8)} Nov)`
                  : `${d.slice(8)} Nov`,
            })),
            { id: "all", label: isTamil ? "அனைத்து 6 நாட்கள்" : isHindi ? "सभी 6 दिन" : "All 6 Days" },
          ].map((d) => (
            <button
              key={d.id}
              className={`date-chip ${selectedDate === d.id ? "active" : ""}`}
              onClick={() => setSelectedDate(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Multilingual Voice Briefing Button */}
        <div className="voice-control-group">
          {!isSpeaking ? (
            <button
              className="voice-play-pill"
              onClick={() =>
                handlePlayVoice(
                  isTamil
                    ? analytics.voiceBriefingTa
                    : isHindi
                      ? storeAI.fullReportHi
                      : storeAI.fullReportEn,
                )
              }
            >
              <Volume2 size={18} className="pulse-icon" />
              <span>
                {isTamil
                  ? "குரல் அறிக்கை கேட்க"
                  : isHindi
                    ? "आवाज़ में रिपोर्ट सुनें"
                    : "Listen Voice Summary"}
              </span>
            </button>
          ) : (
            <button className="voice-stop-pill" onClick={handleStopVoice}>
              <VolumeX size={18} />
              <span>{isTamil ? "நிறுத்துக" : isHindi ? "रोकें" : "Stop Voice"}</span>
            </button>
          )}
        </div>
      </div>

      {/* MULTILINGUAL VOICE ASSISTANT CARD */}
      <div className="tamil-voice-card">
        <div className="voice-card-header">
          <div className="voice-card-title">
            <Volume2 size={20} className="text-cyan" />
            <h3>
              {isTamil
                ? "குரல் வழி வணிக வழிகாட்டி"
                : isHindi
                  ? "आवाज़ आधारित व्यापार गाइड"
                  : "Voice Store Assistant"}
            </h3>
          </div>
          <div className="quick-voice-prompts">
            <button
              className="prompt-chip"
              onClick={() =>
                handlePlayVoice(
                  isTamil
                    ? analytics.voiceBriefingTa
                    : isHindi
                      ? storeAI.fullReportHi
                      : storeAI.fullReportEn,
                )
              }
            >
              🔊 {isTamil ? "முழு அறிக்கை" : isHindi ? "पूरी रिपोर्ट" : "Full Summary"}
            </button>
            <button
              className="prompt-chip alert-chip"
              onClick={() =>
                handlePlayVoice(
                  isTamil
                    ? analytics.deadHoursWarningTa
                    : isHindi
                      ? (storeAI.decisions[0]?.voiceTextHi || storeAI.fullReportHi)
                      : (storeAI.decisions[0]?.voiceTextEn || storeAI.fullReportEn),
                )
              }
            >
              ⚠️ {isTamil ? "மந்தமான நேரம்" : isHindi ? "मंदी का समय" : "Dead Hours"}
            </button>
            <button
              className="prompt-chip success-chip"
              onClick={() =>
                handlePlayVoice(
                  isTamil
                    ? (analytics.topSellingProduct
                      ? `இன்று அதிகம் விற்ற பொருள் ${analytics.topSellingProduct.nameTa}, மொத்தம் ${analytics.topSellingProduct.unitsSold} விற்று ரூபாய் ${analytics.topSellingProduct.totalRevenue} வசூலானது.`
                      : "இன்று விற்பனை இன்னும் பதிவாகவில்லை.")
                    : isHindi
                      ? (storeAI.topProduct
                        ? `आज सबसे ज्यादा बिकने वाला उत्पाद ${storeAI.topProduct.name} है, कुल ${storeAI.topProduct.units} पीस बिके।`
                        : "बिक्री दर्ज की जा रही है।")
                      : (storeAI.topProduct
                        ? `Top seller today is ${storeAI.topProduct.name} with ${storeAI.topProduct.units} units sold.`
                        : "Recording sales."),
                )
              }
            >
              🏆 {isTamil ? "அதிகம் விற்ற பொருள்" : isHindi ? "टॉप उत्पाद" : "Top Item"}
            </button>
            <button
              className="prompt-chip decision-chip"
              onClick={() =>
                handlePlayVoice(
                  isTamil
                    ? storeAI.decisions[0]?.voiceTextTa || analytics.voiceBriefingTa
                    : isHindi
                      ? storeAI.decisions[0]?.voiceTextHi || storeAI.fullReportHi
                      : storeAI.decisions[0]?.voiceTextEn || storeAI.fullReportEn,
                )
              }
            >
              💡 {isTamil ? "AI முடிவுகள்" : isHindi ? "AI निर्णय" : "AI Decisions"}
            </button>
          </div>
        </div>

        {/* Spoken Transcript display */}
        <div className="voice-transcript-box">
          <p>
            {spokenTranscript ||
              (isTamil
                ? analytics.voiceBriefingTa
                : isHindi
                  ? storeAI.fullReportHi
                  : storeAI.fullReportEn)}
          </p>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="kpi-cards-grid">
        <div className="kpi-card">
          <span className="kpi-label">
            {isTamil ? "மொத்த வருவாய்" : isHindi ? "कुल बिक्री राजस्व" : "Total Revenue"}
          </span>
          <strong className="kpi-value text-cyan">
            ₹{analytics.totalRevenue}
          </strong>
          <small className="kpi-sub">
            {isTamil ? "பதிவான பில்கள்" : isHindi ? "दर्ज बिल" : "Recorded Sales"}
          </small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">
            {isTamil ? "பில்கள் எண்ணிக்கை" : isHindi ? "कुल बिल" : "Total Bills"}
          </span>
          <strong className="kpi-value">{analytics.totalBills}</strong>
          <small className="kpi-sub">
            {isTamil ? "சராசரி பில்: ₹" : isHindi ? "औसत बिल: ₹" : "Avg Bill: ₹"}
            {analytics.averageBillValue}
          </small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">
            {isTamil ? "விற்பனையான பொருட்கள்" : isHindi ? "बिके सामान" : "Total Items Sold"}
          </span>
          <strong className="kpi-value">{analytics.totalUnitsSold}</strong>
          <small className="kpi-sub">
            {isTamil ? "மொத்த எண்ணிக்கைகள்" : isHindi ? "कुल पीस" : "Units Dispensed"}
          </small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">
            {isTamil ? "Paytm UPI பங்கு" : isHindi ? "Paytm UPI हिस्सेदारी" : "Paytm UPI Share"}
          </span>
          <strong className="kpi-value text-blue">
            {analytics.paytmUpiSharePercent}%
          </strong>
          <small className="kpi-sub">
            {isTamil ? "QR மூலம் பெறப்பட்டது" : isHindi ? "QR द्वारा प्राप्त" : "Via Dynamic QR"}
          </small>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SARVAM AI DECISION ENGINE (AI முடிவெடுக்கும் மையம்) */}
      {/* ======================================================== */}
      <div className="sarvam-decision-panel">
        <div className="sarvam-decision-header">
          <div className="decision-header-left">
            <span className="paytm-brand-tag">Paytm Merchant AI Decision Engine</span>
            <h2>
              {isTamil
                ? "💡 சர்வம் AI வணிக முடிவுகள் (Sarvam Decision Engine)"
                : isHindi
                  ? "💡 सर्वम AI व्यावसायिक निर्णय (Decision Engine)"
                  : "💡 Sarvam AI Store Strategic Decisions"}
            </h2>
            <p>
              {isTamil
                ? "நேரடி வானிலை, 6 நாள் விற்பனை போக்கு மற்றும் நேரத்தைக் கணக்கிட்டு உருவாக்கப்பட்ட தானியங்கி முடிவுகள்."
                : isHindi
                  ? "लाइव मौसम, 6-दिवसीय बिक्री रुझान और समय पर आधारित व्यावसायिक निर्णय।"
                  : "Automated business decisions driven by live weather, 6-day sales trends, and time-of-day analytics."}
            </p>
          </div>
        </div>

        <div className="sarvam-decision-cards-grid">
          {storeAI.decisions.map((dec) => (
            <div key={dec.id} className={`sarvam-decision-card priority-${dec.priority}`}>
              <div className="decision-card-top">
                <span className="decision-icon">{dec.icon}</span>
                <span className={`decision-badge badge-${dec.priority}`}>
                  {isTamil ? dec.badgeTa : isHindi ? dec.badgeHi : dec.badgeEn}
                </span>
                <button
                  className="decision-listen-btn"
                  title="Listen via Sarvam AI"
                  onClick={() =>
                    handlePlayVoice(
                      isTamil ? dec.voiceTextTa : isHindi ? dec.voiceTextHi : dec.voiceTextEn,
                    )
                  }
                >
                  <Volume2 size={16} />
                  <span>{isTamil ? "கேட்க" : isHindi ? "सुनें" : "Listen"}</span>
                </button>
              </div>

              <h3 className="decision-title">
                {isTamil ? dec.titleTa : isHindi ? dec.titleHi : dec.titleEn}
              </h3>
              <p className="decision-context">
                {isTamil ? dec.contextTa : isHindi ? dec.contextHi : dec.contextEn}
              </p>
              <div className="decision-recommendation-box">
                <Sparkles size={16} className="text-cyan" />
                <p>{isTamil ? dec.recommendationTa : isHindi ? dec.recommendationHi : dec.recommendationEn}</p>
              </div>
              <div className="decision-footer">
                <div className="decision-impact">
                  <small>{isTamil ? "எதிர்பார்க்கப்படும் பலன்:" : isHindi ? "अनुमानित लाभ:" : "Projected Impact:"}</small>
                  <strong>{isTamil ? dec.projectedImpactTa : isHindi ? dec.projectedImpactHi : dec.projectedImpactEn}</strong>
                </div>
                <button className="decision-action-btn" onClick={onGoToActions}>
                  <span>{isTamil ? dec.actionLabelTa : isHindi ? dec.actionLabelHi : dec.actionLabelEn}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: INACTIVE & DEAD HOURS (எந்த நேரம் விற்பனை ஆகல) */}
      {/* ======================================================== */}
      <div className="analytics-section dead-hours-section">
        <div className="section-head">
          <div className="section-title-wrap">
            <Clock3 size={20} className="text-amber" />
            <div>
              <h2>
                {isTamil
                  ? "நேர வாரியான விற்பனை & மந்தமான நேரங்கள் (Time & Dead Hours)"
                  : isHindi
                    ? "समयवार बिक्री और मंदी के घंटे"
                    : "Hourly Breakdown & Inactive Hours"}
              </h2>
              <p>
                {isTamil
                  ? "எந்த நேரத்தில் விற்பனை நடந்தது, எந்த நேரத்தில் விற்பனை மந்தமாக இருந்தது அல்லது நடக்கவில்லை என்பதை விளக்குகிறது."
                  : isHindi
                    ? "किस समय बिक्री हुई और किस समय मंदी रही, इसका संपूर्ण विवरण।"
                    : "Tracks peak rush hours and explicitly flags quiet/dead windows with zero sales."}
              </p>
            </div>
          </div>
        </div>

        {/* Dead hours callout banner */}
        {analytics.deadHours.length > 0 && (
          <div className="dead-hours-callout">
            <div className="callout-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="callout-content">
              <strong>
                {isTamil
                  ? "விற்பனை மந்தமான / நடக்காத நேரங்கள் கண்டறியப்பட்டன!"
                  : isHindi
                    ? "बिक्री मंदी का समय पाया गया!"
                    : "Inactive / Dead Hours Detected!"}
              </strong>
              <p>
                {isTamil
                  ? `மதியம் ${analytics.deadHours.map((d) => d.hourLabel).join(", ")} நேரங்களில் விற்பனை ஏதும் நடக்கவில்லை அல்லது மிகக் குறைவாக இருந்தது.`
                  : isHindi
                    ? `${analytics.deadHours.map((d) => d.hourLabel).join(", ")} के समय में ग्राहक बहुत कम या शून्य रहे।`
                    : `During ${analytics.deadHours.map((d) => d.hourLabel).join(", ")}, customer count was zero or minimal.`}
              </p>
              <div className="recommendation-badge">
                <Sparkles size={16} />
                <span>
                  {isTamil
                    ? analytics.actionRecommendationTa
                    : isHindi
                      ? (storeAI.decisions[0]?.recommendationHi || analytics.actionRecommendationTa)
                      : (storeAI.decisions[0]?.recommendationEn || analytics.actionRecommendationTa)}
                </span>
              </div>
            </div>
            <button className="action-pill-btn" onClick={onGoToActions}>
              <span>{isTamil ? "சலுகை உருவாக்குக" : isHindi ? "कॉम्बो ऑफर बनाएं" : "Create Offer"}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* 24-Hour Timeline Bar Chart */}
        <div className="hourly-chart-card">
          <div className="chart-legend">
            <span className="legend-item">
              <span className="dot dot-peak"></span>
              {isTamil ? "பீக் நேரம் (அதிக விற்பனை)" : isHindi ? "पीक समय (अधिक बिक्री)" : "Peak Rush"}
            </span>
            <span className="legend-item">
              <span className="dot dot-normal"></span>
              {isTamil ? "சாதாரண விற்பனை" : isHindi ? "सामान्य बिक्री" : "Normal"}
            </span>
            <span className="legend-item">
              <span className="dot dot-dead"></span>
              {isTamil ? "மந்தமான நேரம்" : isHindi ? "मंदी का समय" : "Dead Hours"}
            </span>
          </div>

          <div className="timeline-bars">
            {analytics.hourlyStats.map((h) => {
              const heightPercent = Math.min(
                100,
                Math.max(6, Math.round((h.totalRevenue / 500) * 100)),
              );

              return (
                <div key={h.hour} className="timeline-col">
                  <div className="bar-wrapper">
                    <div
                      className={`timeline-bar ${
                        h.isPeak
                          ? "bar-peak"
                          : h.isDead
                            ? "bar-dead"
                            : "bar-normal"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${h.hourLabel}: ₹${h.totalRevenue} (${h.billsCount} bills)`}
                    >
                      {h.billsCount > 0 && (
                        <span className="bar-val">₹{h.totalRevenue}</span>
                      )}
                    </div>
                  </div>
                  <span className="timeline-hour">{h.hour}:00</span>
                  {h.isDead && (
                    <span className="dead-tag">
                      {isTamil ? "மந்தம்" : isHindi ? "मंदी" : "Dead"}
                    </span>
                  )}
                  {h.isPeak && (
                    <span className="peak-tag">
                      <Flame size={12} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: PRODUCT SALES BREAKDOWN (எவ்வளவு பொருள் விற்பனை) */}
      {/* ======================================================== */}
      <div className="analytics-section">
        <div className="section-head">
          <div className="section-title-wrap">
            <Award size={20} className="text-cyan" />
            <div>
              <h2>
                {isTamil
                  ? "பொருள் வாரியான விற்பனை விவரம்"
                  : isHindi
                    ? "उत्पादवार बिक्री विवरण"
                    : "Product Sales & Popularity"}
              </h2>
              <p>
                {isTamil
                  ? "எந்தப் பொருள் எத்தனை எண்ணிக்கையில் விற்றது, எவ்வளவு வருவாய் கிடைத்தது என்ற விவரம்."
                  : isHindi
                    ? "प्रत्येक मेनू आइटम की बिकी मात्रा और राजस्व योगदान।"
                    : "Quantities sold and revenue contribution for each menu item."}
              </p>
            </div>
          </div>
        </div>

        {/* Top Product Spotlight */}
        {analytics.topSellingProduct && (
          <div className="top-product-spotlight">
            <div className="spotlight-emoji">
              {analytics.topSellingProduct.emoji}
            </div>
            <div className="spotlight-details">
              <div className="spotlight-badge">
                🏆 {isTamil ? "இன்றைய முதலிடம்" : isHindi ? "आज का #1 बेस्ट सेलर" : "#1 Best Seller"}
              </div>
              <h3>
                {getProductName(analytics.topSellingProduct, lang)}
              </h3>
              <p>
                {isTamil
                  ? `மொத்தம் ${analytics.topSellingProduct.unitsSold} எண்ணிக்கையில் விற்று, ₹${analytics.topSellingProduct.totalRevenue} வருவாய் ஈட்டியுள்ளது. (மொத்த விற்பனையில் ${analytics.topSellingProduct.revenuePercent}%)`
                  : isHindi
                    ? `कुल ${analytics.topSellingProduct.unitsSold} पीस बिके और ₹${analytics.topSellingProduct.totalRevenue} राजस्व प्राप्त हुआ। (दैनिक बिक्री का ${analytics.topSellingProduct.revenuePercent}%)`
                    : `Sold ${analytics.topSellingProduct.unitsSold} units generating ₹${analytics.topSellingProduct.totalRevenue} (${analytics.topSellingProduct.revenuePercent}% of daily revenue).`}
              </p>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="table-card table-responsive">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>{isTamil ? "பொருள்" : isHindi ? "उत्पाद" : "Product"}</th>
                <th>{isTamil ? "பிரிவு" : isHindi ? "श्रेणी" : "Category"}</th>
                <th>{isTamil ? "விலை" : isHindi ? "कीमत" : "Price"}</th>
                <th>{isTamil ? "விற்ற எண்ணிக்கை" : isHindi ? "बिकी संख्या" : "Units Sold"}</th>
                <th>{isTamil ? "மொத்த வருவாய்" : isHindi ? "कुल राजस्व" : "Revenue"}</th>
                <th>{isTamil ? "பங்கு (%)" : isHindi ? "हिस्सेदारी (%)" : "Share"}</th>
              </tr>
            </thead>
            <tbody>
              {analytics.productStats.map((p) => (
                <tr key={p.productId}>
                  <td className="product-cell">
                    <span className="p-emoji">{p.emoji}</span>
                    <div>
                      <strong>{getProductName(p, lang)}</strong>
                      <small>{lang === "ta-IN" ? p.name : lang === "hi-IN" ? p.name : p.nameTa}</small>
                    </div>
                  </td>
                  <td>
                    <span className="cat-badge">
                      {getCategoryLabel(p.category, lang)}
                    </span>
                  </td>
                  <td>₹{p.unitPrice}</td>
                  <td>
                    <span className="units-pill">{p.unitsSold}</span>
                  </td>
                  <td>
                    <strong>₹{p.totalRevenue}</strong>
                  </td>
                  <td className="share-cell">
                    <div className="progress-bar-wrap">
                      <div
                        className="progress-fill"
                        style={{ width: `${p.revenuePercent}%` }}
                      ></div>
                    </div>
                    <span>{p.revenuePercent}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: DAY-WISE PRODUCT SALES (தினசரி எந்தப் பொருள் எவ்வளவு) */}
      {/* ======================================================== */}
      <div className="analytics-section">
        <div className="section-head">
          <div className="section-title-wrap">
            <Calendar size={20} className="text-cyan" />
            <div>
              <h2>
                {isTamil
                  ? "தினசரி பொருள் விற்பனை ஒப்பீடு"
                  : isHindi
                    ? "दैनिक बिक्री तुलना"
                    : "Day-wise Sales & Trends"}
              </h2>
              <p>
                {isTamil
                  ? "ஒவ்வொரு நாளும் எந்தெந்தப் பொருள் எவ்வளவு விற்றது என்ற நாள் வாரியான ஒப்பீடு."
                  : isHindi
                    ? "पिछले 6 दिनों में दैनिक बिक्री और बिके सामान की तुलना।"
                    : "Daily sales comparison showing exact item quantities sold per day."}
              </p>
            </div>
          </div>
        </div>

        <div className="daywise-cards-grid">
          {analytics.dayWiseStats.map((day) => (
            <div key={day.date} className="daywise-card">
              <div className="daywise-header">
                <div>
                  <strong>{day.dayLabel}</strong>
                  <span className="daywise-date">{day.date}</span>
                </div>
                <div className="daywise-totals">
                  <span className="day-rev">₹{day.totalRevenue}</span>
                  <span className="day-bills">
                    {day.billsCount} {isTamil ? "பில்கள்" : isHindi ? "बिल" : "bills"}
                  </span>
                </div>
              </div>

              <div className="daywise-products-list">
                <span className="list-title">
                  {isTamil ? "விற்ற பொருட்கள்:" : isHindi ? "बिके सामान:" : "Items Sold:"}
                </span>
                <div className="day-items-chips">
                  {day.products.map((item) => (
                    <div key={item.productId} className="day-item-pill">
                      <span className="item-name">
                        {getProductName(item, lang)}
                      </span>
                      <span className="item-qty">×{item.unitsSold}</span>
                      <span className="item-rev">₹{item.revenue}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
