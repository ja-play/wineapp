    import { db, auth, collection, doc, getDocs, updateDoc, onSnapshot, query, where, addDoc, serverTimestamp, onAuthStateChanged } from '../firebase-config.js';
    import { getShops, getUserRole, setupAuthUI } from '../auth-guard.js';
    import { escapeHtml, toProperCase } from '../utils/sanitizer.js';
    import { calculateOrderTotals } from '../utils/tax-calculator.js';
    import { formatCurrency, TAX_CONFIG, COMPANY_CONFIG } from '../app-config.js';
    import { populateNoteModal, openPrintableNote } from '../utils/note-generator.js';
    import { showToast, renderStatusBadge } from '../utils/ui-components.js';

    let currentWines = [];
    let cart = {}; // sku -> qty
    let selectedClient = null;
    let currentUser = null;
    let availableShops = [];
    let evaluatorOrders = [];
    let shopsUnsubscribe = null;

    // Helper to render shop options in dropdown (Proper Case Shop Name only)
    function renderShopOptions() {
      const shopSelect = document.getElementById('client-shop-select');
      const filterInput = document.getElementById('client-shop-filter');
      if (!shopSelect) return;

      const currentVal = shopSelect.value;
      const searchTerm = filterInput ? filterInput.value.trim().toLowerCase() : '';

      const filteredShops = searchTerm
        ? availableShops.filter(s => (s.name && s.name.toLowerCase().includes(searchTerm)) || (s.vat && s.vat.toLowerCase().includes(searchTerm)))
        : availableShops;

      if (!filteredShops || filteredShops.length === 0) {
        shopSelect.innerHTML = `<option value="" disabled selected>${searchTerm ? '-- No matching shops --' : '-- No Client Shops Available --'}</option>`;
      } else {
        shopSelect.innerHTML = `
          <option value="" disabled ${!currentVal ? 'selected' : ''}>-- Select Customer Shop --</option>
          ${filteredShops.map(s => `<option value="${escapeHtml(s.id)}" ${s.id === currentVal ? 'selected' : ''}>${escapeHtml(toProperCase(s.name))}</option>`).join('')}
        `;
      }
    }

    // Populate Client Selector dynamically with real-time Firestore listener (Evaluator & Admin only)
    function subscribeClientShops(user, role) {
      const clientShopBar = document.getElementById('client-shop-bar');
      const shopSelect = document.getElementById('client-shop-select');
      const infoBox = document.getElementById('selected-client-info');

      if (shopsUnsubscribe) {
        shopsUnsubscribe();
        shopsUnsubscribe = null;
      }

      const isAuthorized = user && (role === 'evaluator' || role === 'admin');

      if (!isAuthorized) {
        availableShops = [];
        selectedClient = null;
        if (clientShopBar) clientShopBar.classList.add('hidden');
        renderCatalog(currentWines);
        updateCartTotals();
        return;
      }

      if (clientShopBar) clientShopBar.classList.remove('hidden');
      if (shopSelect) shopSelect.disabled = false;

      try {
        shopsUnsubscribe = onSnapshot(collection(db, 'shops'), async (snapshot) => {
          if (!snapshot.empty) {
            availableShops = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          } else {
            availableShops = await getShops();
          }
          renderShopOptions();
        }, async (err) => {
          console.warn("Realtime shops subscription fallback:", err);
          availableShops = await getShops();
          renderShopOptions();
        });
      } catch (e) {
        console.error("Failed to subscribe to shops:", e);
      }
    }

    // Initialize Auth UI Guard
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      const role = await getUserRole(user);
      setupAuthUI(user, role, 'auth-bar-container');
      subscribeClientShops(user, role);
      if (currentWines && currentWines.length > 0) {
        renderCatalog(currentWines);
        updateCartTotals();
      }
    });

    // Client Selector & Filter Listeners
    const shopSelectEl = document.getElementById('client-shop-select');
    if (shopSelectEl) {
      shopSelectEl.addEventListener('change', (e) => {
        const shopId = e.target.value;
        selectedClient = availableShops.find(s => s.id === shopId) || null;

        const infoBox = document.getElementById('selected-client-info');
        if (selectedClient) {
          const contactHtml = selectedClient.contactPerson 
            ? `<span class="text-slate-300">|</span><span class="inline-flex items-center gap-1.5 text-slate-700"><svg class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg><span class="font-semibold text-slate-900">${escapeHtml(selectedClient.contactPerson)}</span></span>` 
            : '';
          const phoneHtml = selectedClient.phone 
            ? `<span class="text-slate-300">|</span><a href="tel:${escapeHtml(selectedClient.phone).replace(/\s+/g, '')}" class="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold hover:underline"><svg class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg><span>${escapeHtml(selectedClient.phone)}</span></a>` 
            : '';

          if (infoBox) {
            infoBox.innerHTML = `
              <div class="inline-flex items-center gap-2.5 bg-slate-50 border border-slate-200 text-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-mono shadow-sm flex-wrap">
                <span class="inline-flex items-center gap-1">
                  <span class="text-slate-500 font-sans text-[10px] uppercase font-bold tracking-wider">N° TVA:</span>
                  <span class="text-[#BA1628] font-bold">${escapeHtml(selectedClient.vat)}</span>
                </span>
                <span class="text-slate-300">|</span>
                <span class="inline-flex items-center gap-1">
                  <span class="text-slate-500 font-sans text-[10px] uppercase font-bold tracking-wider">N° Client:</span>
                  <span class="text-slate-900 font-bold">${escapeHtml(selectedClient.clientNo || 'N/A')}</span>
                </span>
                ${contactHtml}
                ${phoneHtml}
              </div>
            `;
          }
        } else {
          if (infoBox) {
            infoBox.innerHTML = `<span class="text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm"><svg class="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span>Select a shop client to enable order placement</span></span>`;
          }
        }
        renderCatalog(currentWines);
        updateCartTotals();
      });
    }

    const shopFilterEl = document.getElementById('client-shop-filter');
    if (shopFilterEl) {
      shopFilterEl.addEventListener('input', () => {
        renderShopOptions();
      });
    }

    let activeCategory = 'all';
    let searchQuery = '';
    let viewMode = 'color'; // 'color' or 'photo'

    window.setViewMode = function (mode) {
      viewMode = mode;
      const btnColor = document.getElementById('view-mode-color');
      const btnPhoto = document.getElementById('view-mode-photo');
      if (mode === 'color') {
        btnColor.className = "px-3 py-1.5 rounded-lg font-bold transition bg-amber-500 text-slate-950 shadow flex items-center gap-1";
        btnPhoto.className = "px-3 py-1.5 rounded-lg font-bold transition text-slate-400 hover:text-white flex items-center gap-1";
      } else {
        btnPhoto.className = "px-3 py-1.5 rounded-lg font-bold transition bg-amber-500 text-slate-950 shadow flex items-center gap-1";
        btnColor.className = "px-3 py-1.5 rounded-lg font-bold transition text-slate-400 hover:text-white flex items-center gap-1";
      }
      applyFilters();
    };

    function detectWineCategory(wine) {
      if (wine && wine.category) return wine.category;
      const str = `${wine?.name || ''} ${wine?.description || ''} ${wine?.sku || ''}`.toLowerCase();
      if (str.includes('rosé') || str.includes('rose')) return 'Rosé';
      if (str.includes('moscato') || str.includes('sparkling') || str.includes('champagne') || str.includes('cava') || str.includes('prosecco') || str.includes('spritz')) return 'Sparkling';
      if (str.includes('cabernet') || str.includes('merlot') || str.includes('pinotage') || str.includes('shiraz') || str.includes('syrah') || str.includes('red') || str.includes('rouge') || str.includes('malbec')) return 'Red';
      if (str.includes('wit') || str.includes('chardonnay') || str.includes('pinot grigio') || str.includes('sauvignon') || str.includes('white') || str.includes('blanc') || str.includes('chenin')) return 'White';
      return 'White';
    }

    function getWineColorTheme(category) {
      switch (category) {
        case 'Red':
          return {
            name: 'Ruby Red / Vin Rouge',
            hex: '#800020',
            bgGradient: 'from-rose-950/90 via-red-950/70 to-slate-900',
            swatchGradient: 'from-red-600 via-rose-800 to-rose-950',
            glow: 'shadow-[0_0_22px_rgba(225,29,72,0.5)]',
            borderColor: 'border-rose-700/60',
            badgeBg: 'bg-rose-950/90 text-rose-300 border-rose-700/80',
            dotBg: 'bg-rose-500',
            tastingTone: 'Deep Ruby • High Tannin Profile'
          };
        case 'White':
          return {
            name: 'Straw Gold / Vin Blanc',
            hex: '#F4E07B',
            bgGradient: 'from-amber-950/90 via-yellow-950/70 to-slate-900',
            swatchGradient: 'from-amber-300 via-yellow-500 to-amber-700',
            glow: 'shadow-[0_0_22px_rgba(251,191,36,0.5)]',
            borderColor: 'border-amber-600/60',
            badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-700/80',
            dotBg: 'bg-amber-400',
            tastingTone: 'Straw Gold • Crisp Acidity'
          };
        case 'Rosé':
          return {
            name: 'Salmon Pink / Vin Rosé',
            hex: '#FFC0CB',
            bgGradient: 'from-pink-950/90 via-rose-950/70 to-slate-900',
            swatchGradient: 'from-pink-400 via-rose-400 to-pink-700',
            glow: 'shadow-[0_0_22px_rgba(244,114,182,0.5)]',
            borderColor: 'border-pink-600/60',
            badgeBg: 'bg-pink-950/90 text-pink-300 border-pink-700/80',
            dotBg: 'bg-pink-400',
            tastingTone: 'Salmon Pink • Fresh Berry Finish'
          };
        case 'Sparkling':
          return {
            name: 'Champagne Gold / Effervescent',
            hex: '#F0E68C',
            bgGradient: 'from-cyan-950/90 via-amber-950/70 to-slate-900',
            swatchGradient: 'from-cyan-300 via-amber-300 to-yellow-500',
            glow: 'shadow-[0_0_22px_rgba(103,232,249,0.5)]',
            borderColor: 'border-cyan-600/60',
            badgeBg: 'bg-cyan-950/90 text-cyan-300 border-cyan-700/80',
            dotBg: 'bg-cyan-300',
            tastingTone: 'Golden Spritz • Bubbly Perlage'
          };
        case 'Dessert':
          return {
            name: 'Royal Tawny / Vin Doux',
            hex: '#6A1B9A',
            bgGradient: 'from-purple-950/90 via-indigo-950/70 to-slate-900',
            swatchGradient: 'from-purple-500 via-indigo-600 to-amber-700',
            glow: 'shadow-[0_0_22px_rgba(192,132,252,0.5)]',
            borderColor: 'border-purple-600/60',
            badgeBg: 'bg-purple-950/90 text-purple-300 border-purple-700/80',
            dotBg: 'bg-purple-400',
            tastingTone: 'Royal Tawny • Honeyed Sweetness'
          };
        default:
          return {
            name: 'Classic Wine',
            hex: '#722F37',
            bgGradient: 'from-slate-900 to-slate-950',
            swatchGradient: 'from-slate-600 to-slate-800',
            glow: '',
            borderColor: 'border-slate-700',
            badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
            dotBg: 'bg-slate-400',
            tastingTone: 'Standard Wholesale Wine'
          };
      }
    }

    function getCategoryBadge(category) {
      switch (category) {
        case 'Red':
          return { html: '<span class="w-3.5 h-3.5 rounded-full bg-[#CC0000] border border-red-400 inline-block shadow-sm"></span>', class: 'bg-red-950 border-red-900', title: 'Red Wine' };
        case 'White':
          return { html: '<span class="w-3.5 h-3.5 rounded-full bg-amber-100 border border-amber-300 inline-block shadow-sm"></span>', class: 'bg-slate-900 border-slate-700', title: 'White Wine' };
        case 'Rosé':
          return { html: '<span class="w-3.5 h-3.5 rounded-full bg-[#FFB3DA] border border-pink-400 inline-block shadow-sm"></span>', class: 'bg-pink-950/80 border-pink-700/80', title: 'Rosé Wine' };
        case 'Sparkling':
          return { html: '<span class="w-3.5 h-3.5 rounded-full bg-cyan-300 border border-cyan-200 inline-block shadow-sm"></span>', class: 'bg-cyan-950/80 border-cyan-800/80', title: 'Sparkling Wine' };
        case 'Dessert':
          return { html: '<span class="w-3.5 h-3.5 rounded-full bg-purple-500 border border-purple-400 inline-block shadow-sm"></span>', class: 'bg-purple-950/80 border-purple-800/80', title: 'Dessert Wine' };
        default:
          return { html: '<span class="w-3.5 h-3.5 rounded-full bg-slate-400 border border-slate-500 inline-block shadow-sm"></span>', class: 'bg-slate-800 border-slate-700', title: 'Wine' };
      }
    }

    function updateCategoryCounts() {
      const counts = { all: currentWines.length, Red: 0, White: 0, Rosé: 0, Sparkling: 0, Dessert: 0 };
      currentWines.forEach(w => {
        const cat = detectWineCategory(w);
        if (counts[cat] !== undefined) counts[cat]++;
      });
      Object.keys(counts).forEach(cat => {
        const el = document.getElementById(`cat-count-${cat}`);
        if (el) el.textContent = counts[cat];
      });
    }

    window.setCategoryFilter = function (cat) {
      activeCategory = cat;
      const categories = ['all', 'Red', 'White', 'Rosé', 'Sparkling', 'Dessert'];
      categories.forEach(c => {
        const btn = document.getElementById(`cat-pill-${c}`);
        if (!btn) return;
        if (c === cat) {
          btn.className = "cat-pill px-3.5 py-1.5 rounded-xl font-bold text-xs transition whitespace-nowrap btn-gold shadow-md flex items-center gap-1.5";
        } else {
          btn.className = "cat-pill px-3.5 py-1.5 rounded-xl font-bold text-xs transition whitespace-nowrap bg-white text-[#475569] hover:bg-[#FFF5F5] hover:text-[#BA1628] border border-[#E2E8F0] shadow-sm flex items-center gap-1.5";
        }
      });
      applyFilters();
    };

    window.handleSearchInput = function () {
      const input = document.getElementById('catalog-search-input');
      searchQuery = (input.value || '').trim().toLowerCase();
      applyFilters();
    };

    window.resetCatalogFilter = function () {
      const input = document.getElementById('catalog-search-input');
      if (input) input.value = '';
      searchQuery = '';
      window.setCategoryFilter('all');
    };

    function applyFilters() {
      updateCategoryCounts();
      const filtered = currentWines.filter(w => {
        const cat = detectWineCategory(w);
        const matchesCategory = activeCategory === 'all' || cat === activeCategory;

        if (!matchesCategory) return false;
        if (!searchQuery) return true;

        const nameStr = (w.name || '').toLowerCase();
        const skuStr = (w.sku || '').toLowerCase();
        const regionStr = (w.region || '').toLowerCase();
        const catStr = cat.toLowerCase();
        const tagsStr = (Array.isArray(w.tags) ? w.tags.join(' ') : (w.tags || '')).toLowerCase();

        return nameStr.includes(searchQuery) || skuStr.includes(searchQuery) || regionStr.includes(searchQuery) || catStr.includes(searchQuery) || tagsStr.includes(searchQuery);
      });

      renderCatalog(filtered);
    }

    // Subscribe to live Firestore updates (Uses IndexedDB local cache for instant load)
    try {
      onSnapshot(collection(db, "wines"), (snapshot) => {
        document.getElementById('catalog-loading')?.classList.add('hidden');
        currentWines = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        applyFilters();
      });
    } catch (e) {
      console.error("Firestore live snapshot error:", e);
    }

    function renderCatalog(wines) {
      const grid = document.getElementById('catalog-grid');
      const emptySec = document.getElementById('catalog-empty');

      if (!wines || wines.length === 0) {
        grid.classList.add('hidden');
        emptySec.classList.remove('hidden');
        return;
      }

      emptySec.classList.add('hidden');
      grid.classList.remove('hidden');

      grid.innerHTML = wines.map(w => {
        const qty = cart[w.sku] || 0;
        const category = detectWineCategory(w);
        const categoryBadge = getCategoryBadge(category);
        const tags = Array.isArray(w.tags) ? w.tags : (w.tags ? String(w.tags).split(',') : []);

        const stockQty = (w.stockQuantity !== undefined && w.stockQuantity !== null && !isNaN(Number(w.stockQuantity))) ? Number(w.stockQuantity) : 0;
        const isAvailable = w.stockAvailable !== false && stockQty > 0;
        const isLowStock = isAvailable && stockQty < 10;
        const isWholesale = Boolean(currentUser);

        const bottlePriceHT = typeof w.priceBottleHT === 'number' ? w.priceBottleHT : (parseFloat((w.priceBottle || '').replace(/[^0-9.]/g, '')) || 5.50);
        const casePriceHT = typeof w.priceCaseHT === 'number' ? w.priceCaseHT : (parseFloat((w.priceCase || '').replace(/[^0-9.]/g, '')) || 33.00);

        const bottlePriceRetail = typeof w.priceBottleRetail === 'number' && w.priceBottleRetail > 0 ? w.priceBottleRetail : Number((bottlePriceHT * 1.5).toFixed(2));
        const casePriceRetail = typeof w.priceCaseRetail === 'number' && w.priceCaseRetail > 0 ? w.priceCaseRetail : Number((casePriceHT * 1.5).toFixed(2));

        const displayBottlePrice = isWholesale ? bottlePriceHT : bottlePriceRetail;
        const displayCasePrice = isWholesale ? casePriceHT : casePriceRetail;
        const bottlePriceLabel = isWholesale ? "Bottle Price (HT):" : "Bottle Price:";
        const casePriceLabel = isWholesale ? "Case Price (HT):" : "Case Price:";

        const caseConfig = w.caseSize ? `1x${w.caseSize}` : '1x6';
        const depositCase = w.depositCase || 1.35;
        const isClientSelected = Boolean(selectedClient);

        const isAuthenticated = Boolean(currentUser);

        const stockBadgeClass = !isAvailable
          ? 'bg-rose-100 text-rose-700 border-rose-300'
          : (isLowStock && isAuthenticated
            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse font-extrabold'
            : 'bg-emerald-50 text-emerald-700 border-emerald-300');

        const stockBadgeText = !isAvailable
          ? '○ Out of Stock'
          : (isAuthenticated
            ? (isLowStock
              ? `Low Stock: ${stockQty} Cases left`
              : `In Stock: ${stockQty} Cases`)
            : 'In Stock');

        const tagsHtml = tags.map(t => `<span class="text-[9px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full font-medium">#${t.trim()}</span>`).join('');

        return `
          <div class="card-theme card-theme-hover rounded-2xl overflow-hidden flex flex-col group ${!isAvailable ? 'opacity-75' : ''}">
            <div class="relative overflow-hidden cursor-pointer bg-[#F8F9FA] flex items-center justify-center h-52 p-4 border-b border-[#E2E8F0] group-hover:bg-[#FFF0F2] transition" onclick="window.openModal('${w.sku}')">
              <img src="${w.imageUrl || w.image || 'images/34172 DGB Oude kaap_Cab Merlot.png'}" alt="${w.name}" class="h-full object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-md" />
              <span class="absolute top-3 left-3 bg-white/90 text-[#1E242B] border border-[#E2E8F0] text-xs px-2.5 py-0.5 rounded font-mono font-semibold">${w.vintage || '2024'}</span>
              <span class="absolute top-3 right-3 text-[11px] px-2.5 py-0.5 rounded font-mono font-bold border ${stockBadgeClass}">
                ${stockBadgeText}
              </span>
            </div>

            <div class="p-5 flex flex-col flex-grow">
              <div class="flex justify-between items-start mb-1.5">
                <h3 class="font-serif-title text-base font-extrabold text-[#1E242B] group-hover:text-[#BA1628] transition leading-snug">${w.name}</h3>
              </div>
              <div class="flex items-center gap-2 mb-3 flex-wrap">
                <span class="text-xs font-mono text-slate-500">${w.sku}</span>
                <span title="${categoryBadge.title}" class="border px-2 py-0.5 rounded-full text-xs font-bold flex items-center justify-center bg-white border-slate-200 text-slate-700">${categoryBadge.html}</span>
                <span class="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold">${caseConfig}</span>
              </div>
              ${tagsHtml ? `<div class="flex items-center gap-1 flex-wrap mb-3">${tagsHtml}</div>` : ''}
              <p class="text-xs text-[#64748B] mb-4 line-clamp-2">${w.description || ''}</p>

              <div class="mt-auto border-t border-[#E2E8F0] pt-3 space-y-1.5 text-xs">
                <div class="flex justify-between text-[#64748B]">
                  <span>${bottlePriceLabel}</span>
                  <span class="font-bold text-[#1E242B]">€${displayBottlePrice.toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-[#64748B]">
                  <span>${casePriceLabel}</span>
                  <span class="font-bold text-[#BA1628] text-sm">€${displayCasePrice.toFixed(2)}</span>
                </div>
              </div>

              <!-- Quantity Selector -->
              <div class="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                <span class="text-xs text-[#64748B] font-semibold">Cases:</span>
                <div class="flex items-center gap-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl p-1">
                  <button onclick="updateQty('${w.sku}', -1)" ${!isClientSelected || qty <= 0 ? 'disabled' : ''} class="w-8 h-8 rounded-lg bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FFF0F2] text-[#1E242B] border border-[#E2E8F0] font-bold text-sm transition flex items-center justify-center">
                    -
                  </button>
                  <span class="w-7 text-center text-sm font-extrabold text-[#BA1628] font-mono">${qty}</span>
                  <button onclick="updateQty('${w.sku}', 1)" ${!isClientSelected || !isAvailable || qty >= stockQty ? 'disabled' : ''} class="w-8 h-8 rounded-lg btn-gold disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm transition flex items-center justify-center">
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    window.updateQty = function (sku, delta) {
      if (!selectedClient) {
        showToast("Please select a client shop first", true);
        return;
      }
      const wine = currentWines.find(w => w.sku === sku);
      const stockQty = wine && (wine.stockQuantity !== undefined && wine.stockQuantity !== null && !isNaN(Number(wine.stockQuantity))) ? Number(wine.stockQuantity) : 0;
      const current = cart[sku] || 0;
      const next = Math.max(0, Math.min(stockQty, current + delta));

      if (next === 0) delete cart[sku];
      else cart[sku] = next;

      renderCatalog(currentWines);
      updateCartTotals();
    };

    window.setCartDiscount = function (percent) {
      const discountInput = document.getElementById('cart-discount-input');
      if (discountInput) {
        discountInput.value = percent;
        updateCartTotals();
      }
    };

    const cartDiscountInputEl = document.getElementById('cart-discount-input');
    if (cartDiscountInputEl) {
      cartDiscountInputEl.addEventListener('input', () => {
        updateCartTotals();
      });
    }

    function updateCartTotals() {
      let totalCases = 0;
      const itemsList = [];

      for (const [sku, qty] of Object.entries(cart)) {
        if (qty <= 0) continue;
        const wine = currentWines.find(w => w.sku === sku);
        if (!wine) continue;

        const priceHT = typeof wine.priceCaseHT === 'number' ? wine.priceCaseHT : (parseFloat((wine.priceCase || '').replace(/[^0-9.]/g, '')) || 33.00);
        const lineHT = priceHT * qty;

        totalCases += qty;

        itemsList.push({
          sku: wine.sku,
          description: wine.name,
          colis: wine.caseSize ? `1x${wine.caseSize}` : '1x6',
          qty: qty,
          priceHT: priceHT,
          montantHT: lineHT,
          tvaRate: 21
        });
      }

      const discountInput = document.getElementById('cart-discount-input');
      const discountPercent = Math.max(0, Math.min(100, parseFloat(discountInput ? discountInput.value : 0) || 0));

      const totals = calculateOrderTotals(itemsList, discountPercent);

      document.getElementById('cart-case-count').textContent = totalCases;
      document.getElementById('cart-subtotal-ht').textContent = `€${totals.rawSubtotalHT.toFixed(2)}`;

      const discountCol = document.getElementById('cart-discount-col');
      const discountAmountEl = document.getElementById('cart-discount-amount');
      const headerDiscountBadge = document.getElementById('cart-header-discount-badge');

      if (discountPercent > 0) {
        if (discountCol) {
          discountCol.classList.remove('hidden');
          discountAmountEl.textContent = `-€${totals.discountAmount.toFixed(2)} (${discountPercent}%)`;
        }
        if (headerDiscountBadge) {
          headerDiscountBadge.classList.remove('hidden');
          headerDiscountBadge.textContent = `${discountPercent}% OFF`;
        }
      } else {
        if (discountCol) discountCol.classList.add('hidden');
        if (headerDiscountBadge) headerDiscountBadge.classList.add('hidden');
      }

      if (document.getElementById('cart-total-vidanges')) {
        document.getElementById('cart-total-vidanges').textContent = `€0.00`;
      }
      document.getElementById('cart-total-tva').textContent = `€${totals.totalTVA.toFixed(2)}`;
      document.getElementById('cart-total-ttc').textContent = `€${totals.totalTTC.toFixed(2)}`;
      document.getElementById('cart-grand-ttc').textContent = `€${totals.totalTTC.toFixed(2)}`;

      const submitBtn = document.getElementById('submit-order-btn');
      submitBtn.disabled = !selectedClient || totalCases === 0;

      const cancelBtn = document.getElementById('cancel-cart-btn');
      if (cancelBtn) {
        if (totalCases > 0) {
          cancelBtn.classList.remove('hidden');
        } else {
          cancelBtn.classList.add('hidden');
        }
      }

      const cartItemsContainer = document.getElementById('cart-items-list');
      if (itemsList.length === 0) {
        cartItemsContainer.innerHTML = `<div class="text-slate-500 text-xs italic">No items selected yet.</div>`;
      } else {
        cartItemsContainer.innerHTML = itemsList.map(item => `
          <div class="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <div>
              <span class="font-bold text-white">${item.description}</span>
              <span class="text-slate-400 font-mono text-[11px] ml-2">(${item.sku} - ${item.colis})</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-amber-400 font-bold font-mono">${item.qty} cases</span>
              <span class="text-slate-200 font-mono">€${item.montantHT.toFixed(2)} HT</span>
            </div>
          </div>
        `).join('');
      }
    }

    window.cancelCurrentOrder = function () {
      if (Object.keys(cart).length === 0) return;
      cart = {};
      const discountInput = document.getElementById('cart-discount-input');
      if (discountInput) discountInput.value = 0;

      const panel = document.getElementById('cart-detail-panel');
      if (panel) panel.classList.add('hidden');
      const toggleText = document.getElementById('toggle-cart-text');
      if (toggleText) toggleText.textContent = "Show Line Items ▲";

      renderCatalog(currentWines);
      updateCartTotals();
      showToast("Order selection cancelled.");
    };

    window.toggleCartDetail = function () {
      const panel = document.getElementById('cart-detail-panel');
      const text = document.getElementById('toggle-cart-text');
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        text.textContent = "Hide Line Items ▼";
      } else {
        panel.classList.add('hidden');
        text.textContent = "Show Line Items ▲";
      }
    };

    window.submitOrder = async function () {
      if (!auth.currentUser) {
        showToast("Please sign in as a Field Evaluator to submit orders!", true);
        if (window.showLoginModal) window.showLoginModal();
        return;
      }

      if (!selectedClient) {
        showToast("Select a Belgian client shop first!", true);
        return;
      }

      const submitBtn = document.getElementById('submit-order-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="animate-spin inline-block h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full mr-2"></span> Submitting Order...`;

      try {
        const discountInput = document.getElementById('cart-discount-input');
        const discountPercent = Math.max(0, Math.min(100, parseFloat(discountInput ? discountInput.value : 0) || 0));
        const items = [];

        for (const [sku, qty] of Object.entries(cart)) {
          if (qty <= 0) continue;
          const wine = currentWines.find(w => w.sku === sku);
          if (!wine) continue;

          const originalPriceHT = typeof wine.priceCaseHT === 'number' ? wine.priceCaseHT : (parseFloat((wine.priceCase || '').replace(/[^0-9.]/g, '')) || 33.00);
          const lineHT = Number((originalPriceHT * qty).toFixed(2));

          items.push({
            wineId: wine.id,
            sku: wine.sku,
            description: wine.name,
            colis: wine.caseSize ? `1x${wine.caseSize}` : '1x6',
            qty: qty,
            priceHT: originalPriceHT,
            montantHT: lineHT,
            tvaRate: TAX_CONFIG.VAT_RATE * 100
          });

          // Deduct stock quantity in Firestore
          const currentQty = (wine.stockQuantity !== undefined && wine.stockQuantity !== null && !isNaN(Number(wine.stockQuantity))) ? Number(wine.stockQuantity) : 0;
          const nextQty = Math.max(0, currentQty - qty);
          await updateDoc(doc(db, "wines", wine.id), {
            stockQuantity: nextQty,
            stockAvailable: nextQty > 0
          });
        }

        const calculatedTotals = calculateOrderTotals(items, discountPercent);

        const orderPayload = {
          evaluatorUid: currentUser ? currentUser.uid : 'evaluator-demo-uid',
          evaluatorEmail: currentUser ? currentUser.email : 'evaluator@aurellionwine.com',
          client: {
            name: toProperCase(selectedClient.name),
            address: selectedClient.address,
            vat: selectedClient.vat,
            clientNo: selectedClient.clientNo,
            contactPerson: selectedClient.contactPerson || '',
            phone: selectedClient.phone || ''
          },
          items: items,
          totals: calculatedTotals,
          discountPercent: discountPercent,
          status: 'submitted',
          createdAt: serverTimestamp(),
          invoicePdfUrl: null
        };

        const docRef = await addDoc(collection(db, "orders"), orderPayload);

        cart = {};
        if (discountInput) discountInput.value = 0;
        renderCatalog(currentWines);
        updateCartTotals();

        showToast(`Order submitted! Stock auto-deducted.`);

        setTimeout(() => {
          window.printEvaluatorOrder(docRef.id, orderPayload);
        }, 500);
      } catch (err) {
        console.error("Order submission error:", err);
        showToast("Order submission failed: " + err.message, true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Submit Wholesale Order</span>`;
      }
    };

    window.openEvaluatorOrdersModal = async function () {
      const modal = document.getElementById('evaluator-orders-modal');
      const container = document.getElementById('evaluator-orders-list');
      container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Loading placed orders...</p>`;
      modal.classList.remove('hidden');

      try {
        const snap = await getDocs(collection(db, "orders"));
        evaluatorOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        evaluatorOrders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (evaluatorOrders.length === 0) {
          container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">No placed orders found.</p>`;
          return;
        }

        container.innerHTML = evaluatorOrders.map(o => {
          const client = o.client || { name: 'Shop Client' };
          const totals = o.totals || { totalTTC: 0 };
          const dateStr = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleString('fr-BE') : 'Recent';
          const discPct = Number(o.discountPercent || totals.discountPercent || 0);
          const discBadge = discPct > 0 ? `<span class="bg-rose-100 text-[#BA1628] border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">-${discPct}% Remise</span>` : '';
          return `
            <div class="bg-white border border-slate-200 hover:border-rose-300 p-4 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-bold text-slate-900">${escapeHtml(client.name)}</span>
                  ${renderStatusBadge(o.status || 'submitted')}
                  ${discBadge}
                </div>
                <div class="text-xs text-slate-500 font-mono mt-0.5">Order #${o.id.substring(0, 12)} • ${dateStr}</div>
                <div class="text-xs font-mono font-bold text-[#BA1628] mt-1.5 flex items-center gap-1.5">
                  <span class="text-slate-500 font-sans font-medium text-[11px]">Total TTC:</span>
                  <span class="text-sm text-[#BA1628]">€${Number(totals.totalTTC || 0).toFixed(2)}</span>
                </div>
              </div>
              <button onclick="window.printEvaluatorOrder('${o.id}')" class="inline-flex items-center justify-center gap-2 bg-rose-50 hover:bg-[#BA1628] text-[#BA1628] hover:text-white border border-rose-200 hover:border-[#BA1628] font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm flex-shrink-0">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                <span>Note d'Envoi</span>
              </button>
            </div>
          `;
        }).join('');
      } catch (err) {
        container.innerHTML = `<p class="text-xs text-rose-400 py-4 text-center">Failed to load orders: ${err.message}</p>`;
      }
    };

    window.closeEvaluatorOrdersModal = function () {
      document.getElementById('evaluator-orders-modal').classList.add('hidden');
    };

    window.printEvaluatorOrder = function (orderId, directPayload = null) {
      const order = directPayload ? { id: orderId, ...directPayload } : evaluatorOrders.find(o => o.id === orderId);
      if (!order) {
        showToast("Order details loading...", true);
        return;
      }

      populateNoteModal('note-modal-content', order);
      document.getElementById('evaluator-orders-modal').classList.add('hidden');
      document.getElementById('delivery-note-modal').classList.remove('hidden');
    };

    // Modal Image Lightbox
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalCaption = document.getElementById('modal-caption');

    window.openModal = function (sku) {
      const wine = currentWines.find(w => w.sku === sku);
      if (!wine) return;
      modalImg.src = wine.imageUrl || wine.image || 'images/34172 DGB Oude kaap_Cab Merlot.png';
      modalImg.alt = wine.name || 'Wine';
      modalTitle.textContent = wine.name || 'Wine';
      modalCaption.textContent = `SKU: ${wine.sku}`;
      modal.classList.remove('hidden');
      setTimeout(() => modal.classList.remove('opacity-0'), 10);
    };

    window.closeModal = function () {
      modal.classList.add('opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 200);
    };

