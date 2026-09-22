
import { COMPANY_CONFIG } from '../app-config.js';

export function renderHeader(type = 'catalog') {
  let rightSideControls = '';
  let badgeText = 'Field Ordering';
  
  if (type === 'catalog') {
    rightSideControls = `
      <button onclick="openEvaluatorOrdersModal()" class="card-theme hover:bg-[#3D0A11] text-[#F3E5AB] text-xs px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-1.5 shadow">
        <span>🍷 My Placed Orders</span>
      </button>
    `;
  } else if (type === 'admin') {
    badgeText = 'Admin Panel';
    rightSideControls = `
      <a href="depot.html" class="text-xs text-slate-500 hover:text-[#BA1628] font-bold transition">Warehouse</a>
      <a href="index.html" class="text-xs text-slate-500 hover:text-[#BA1628] font-bold transition">Catalog</a>
    `;
  } else if (type === 'depot') {
    badgeText = 'Warehouse Dispatch';
    rightSideControls = `
      <a href="admin.html" class="text-xs text-slate-500 hover:text-[#BA1628] font-bold transition">Admin</a>
      <a href="index.html" class="text-xs text-slate-500 hover:text-[#BA1628] font-bold transition">Catalog</a>
    `;
  } else if (type === 'contact') {
    badgeText = 'Contact Us';
    rightSideControls = `
      <a href="index.html" class="text-xs text-slate-500 hover:text-[#BA1628] font-bold transition">Catalog</a>
    `;
  }

  return `
    <header class="header-theme text-white sticky top-0 z-40 w-full">
      <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
        <div class="flex items-center gap-3">
          <a href="index.html" class="flex items-center gap-3 group">
            <div class="w-10 h-10 rounded-xl bg-[#BA1628] text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
              <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 22h8"></path><path d="M12 15v7"></path><path d="M12 15a7 7 0 0 0 7-7c0-2-1-3.5-2.5-4.5h-9C6 4.5 5 6 5 8a7 7 0 0 0 7 7z"></path><path d="M7 3.5 12 7l5-3.5"></path>
              </svg>
            </div>
            <div>
              <div class="font-serif-title font-black text-xl gold-gradient-text tracking-wide leading-none">AURELLION</div>
            </div>
          </a>
          <span class="bg-[#FFF0F2] text-[#BA1628] border border-[#FCA5A5] text-xs px-2.5 py-0.5 rounded-full font-bold">
            ${badgeText}
          </span>
        </div>
        <div class="flex items-center gap-3">
          ${rightSideControls}
          <div id="auth-bar-container" class="flex items-center gap-2">
            <!-- Auth widget injected here by auth-guard.js -->
          </div>
        </div>
      </div>
    </header>
  `;
}

export function renderFooter(systemName = 'Client Wholesale System') {
  const companyTitle = COMPANY_CONFIG.fullName || 'Aurellion Wine Distribution Belgium';
  return `
    <footer class="bg-white text-slate-600 text-xs py-6 text-center border-t border-slate-200 mt-auto w-full">
      <div class="max-w-7xl mx-auto px-4">
        <p>&copy; 2026 ${companyTitle}. ${systemName}.</p>
      </div>
    </footer>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const headerEl = document.getElementById('app-header');
  const footerEl = document.getElementById('app-footer');
  
  // Determine page type based on URL
  const path = window.location.pathname;
  let type = 'catalog';
  let systemName = 'Client Wholesale System';
  
  if (path.includes('admin')) {
    type = 'admin';
    systemName = 'Client Catalog Admin System';
  } else if (path.includes('depot')) {
    type = 'depot';
    systemName = 'Warehouse Dispatch System';
  } else if (path.includes('contact')) {
    type = 'contact';
  }

  if (headerEl) headerEl.innerHTML = renderHeader(type);
  if (footerEl) footerEl.innerHTML = renderFooter(systemName);
});

