import React, { useState, useEffect, useMemo } from 'react';
import {
  FiSearch, FiDownload, FiPhone, FiBox, FiClock,
  FiPlus, FiTrash2, FiX, FiSave, FiAlertCircle,
  FiCheckCircle, FiShoppingCart, FiUser, FiMapPin,
  FiMessageSquare, FiTruck, FiCreditCard, FiPackage,
  FiHash, FiFileText, FiDollarSign, FiPrinter,
  FiArrowLeft, FiEye, FiCalendar, FiTag,
  FiUploadCloud, FiSettings, FiRefreshCw, FiCheck, FiDatabase
} from 'react-icons/fi';
import './OrderManager.css';
import { API_BASE, API_HEADERS } from '../config/api';
import dharaniService, { getOrderSyncStatus, getSyncedRecords } from '../services/dharaniService';
import { getDharaniConfig, saveDharaniConfig, resetDharaniConfig } from '../config/dharaniConfig';

const BASE = API_BASE;
const ORDER_CREATE_URL = `${API_BASE}/orders/`;
const HDR = API_HEADERS;

const genOrderNo = () => { const y = new Date().getFullYear(); return `ORD-${y}-${Math.floor(1000000 + Math.random() * 8999999)}`; };
const genInvoice = () => `DH${Math.floor(1000000 + Math.random() * 8999999)}`;
const blankRow = () => ({ id: Date.now(), product: '', sku: '', qty: 1, price: 0, total: 0 });
const fmtDate = (d) => {
  if (!d) return '—';
  let dateStr = d;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(d)) {
    dateStr = d.replace(' ', 'T') + (d.split(':').length === 2 ? ':00Z' : 'Z');
  }
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
};
const fmtMoney = (n) => `₹${parseFloat(n || 0).toFixed(2)}`;

const processOrderForDisplay = (order) => {
  order.order_id = order.id || order.order_id;
  order.created_at = order.date || order.created_at;

  let itemsSum = (order.items || []).reduce((sum, it) => sum + (parseFloat(it.price || 0) * parseInt(it.quantity || 1)), 0);

  let apiShipping = parseFloat(order.shipping_charges);
  if (isNaN(apiShipping)) apiShipping = null;

  let apiTax = parseFloat(order.tax_total || order.gst_amount || order.tax);
  if (isNaN(apiTax)) {
    apiTax = (parseFloat(order.cgst || 0) + parseFloat(order.sgst || 0) + parseFloat(order.igst || 0)) || 0;
  }

  let apiTotal = parseFloat(order.total || order.total_amount);
  if (isNaN(apiTotal)) apiTotal = null;

  let calculatedShipping = 0;
  let state = '';
  if (order.address && order.address.state) {
    state = order.address.state.toLowerCase();
  } else if (order.shipping_address) {
    state = order.shipping_address.toLowerCase();
  } else if (order.billing_address) {
    state = order.billing_address.toLowerCase();
  }

  let isTamilNadu = true;
  if (state) {
    if (state.includes('tamil nadu') || state.includes('tamilnadu')) {
      calculatedShipping = 50;
    } else {
      calculatedShipping = 100;
      isTamilNadu = false;
    }
  } else {
    let diff = apiTotal !== null ? apiTotal - itemsSum - apiTax : 0;
    if (diff > 0) calculatedShipping = diff;
  }

  let cgst = parseFloat(order.cgst || 0);
  let sgst = parseFloat(order.sgst || 0);
  let igst = parseFloat(order.igst || 0);

  if (cgst > 0 && sgst > 0 && (cgst + sgst) > apiTax) {
    cgst = apiTax / 2;
    sgst = apiTax / 2;
  } else if (cgst === 0 && sgst === 0 && igst === 0 && apiTax > 0) {
    if (isTamilNadu) {
      cgst = apiTax / 2;
      sgst = apiTax / 2;
    } else {
      igst = apiTax;
    }
  }

  order.sub_total = itemsSum;
  order.shipping_charges = apiShipping !== null ? apiShipping : calculatedShipping;
  order.tax = apiTax;
  order.cgst = cgst;
  order.sgst = sgst;
  order.igst = igst;
  order.tax_total = apiTax;
  order.total_amount = apiTotal !== null ? apiTotal : (itemsSum + order.shipping_charges + order.tax);

  if (order.items) {
    order.items = order.items.map(it => {
      const qty = parseInt(it.quantity) || 0;
      const price = parseFloat(it.price || 0);
      const value = price * qty;
      const itemTax = itemsSum > 0 ? (value / itemsSum) * apiTax : 0;
      if (it.cgst === undefined) {
        if (isTamilNadu) {
          it.cgst = itemTax / 2;
          it.sgst = itemTax / 2;
          it.igst = 0;
        } else {
          it.cgst = 0;
          it.sgst = 0;
          it.igst = itemTax;
        }
        it.tax_total = itemTax;
      }
      return it;
    });
  }

  if (order.address && typeof order.address === 'object') {
    const addr = order.address;
    if (addr.full_name) order.customer = addr.full_name;
    if (addr.phone) order.mobile = addr.phone;

    let fullAddress = addr.address || '';
    if (fullAddress && addr.city && !fullAddress.includes(addr.city)) {
      fullAddress += `, ${addr.city}`;
    }
    if (fullAddress && addr.state && !fullAddress.includes(addr.state)) {
      fullAddress += `, ${addr.state}`;
    }
    if (fullAddress && addr.pincode && !fullAddress.includes(addr.pincode)) {
      fullAddress += ` - ${addr.pincode}`;
    }
    if (!fullAddress) {
      fullAddress = [addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
    }
    order.shipping_address = fullAddress || order.shipping_address || '—';
  }
  return order;
};

const COMMUNICATION_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'walk_in', label: 'Walk-In' },
  { value: 'website', label: 'Website' }
];

const LOGISTICS_OPTIONS = [
  { value: 'ST courier', label: 'ST Courier' },
  { value: 'professional delivery', label: 'Professional Delivery' },
  { value: 'ABT courier', label: 'ABT Courier' },
  { value: 'other', label: 'Other' }
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'cheque', label: 'Cheque' }
];

const PRICE_CATEGORY_OPTIONS = [
  { value: 'retailer_price', label: 'Retailer Price' },
  { value: 'sarvo_price', label: 'Servo Price' },
  { value: 'drug_price', label: 'Ayush Price' },
  { value: 'distributor_price', label: 'Distributor Price' },
  { value: 'store_price', label: 'Store Price' },
  { value: 'customer_price', label: 'Customer Price' },
  { value: 'reseller_price', label: 'Reseller Price' },
  { value: 'mrp', label: 'MRP Price' }
];

const SearchableSelect = ({ options, value, onChange, placeholder = "- Select -", className = "" }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const wrapperRef = React.useRef(null);
  const listRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayValue = selectedOption ? selectedOption.label : '';

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [search, isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        setSearch('');
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev < filteredOptions.length - 1 ? prev + 1 : prev;
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev > 0 ? prev - 1 : 0;
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        onChange(filteredOptions[activeIndex].value);
        setIsOpen(false);
        setSearch('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  const scrollToIndex = (index) => {
    if (!listRef.current) return;
    const item = listRef.current.children[index];
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div
        className={className}
        style={{
          cursor: 'text', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff'
        }}
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
            setSearch('');
            if (inputRef.current) inputRef.current.focus();
          }
        }}
      >
        <input
          ref={inputRef}
          style={{
            border: 'none', outline: 'none', width: '100%', background: 'transparent',
            color: '#000000', fontSize: 'inherit', fontFamily: 'inherit', padding: 0
          }}
          value={isOpen ? search : displayValue}
          placeholder={placeholder}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <svg width="16" height="16" fill="none" stroke="#8A927E" viewBox="0 0 24 24" style={{ flexShrink: 0, marginLeft: '8px', pointerEvents: 'none' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: '#fff',
          border: '1px solid rgba(48, 55, 42, 0.12)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div ref={listRef} style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px', color: '#000000', textAlign: 'center', fontSize: '13px' }}>No results found</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={{
                      padding: '10px 12px', cursor: 'pointer', fontSize: '14px',
                      background: isActive ? 'rgba(48, 55, 42, 0.12)' : (isSelected ? '#F5F7EC' : 'transparent'),
                      color: '#000000', borderBottom: '1px solid #F5F7EC'
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    {opt.label}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   PRINT HELPERS — generate HTML for each print type
══════════════════════════════════════════════════════════ */
const COMPANY = { name: 'Vedan Mart', address: 'Tamil Nadu, India', phone: '+91 00000 00000', gstin: 'GSTIN: 33XXXXX0000X0X0' };

function printWindow(html, title, options = {}) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const isLabel = options.isLabel || title === 'Shipping Label';
  const printStyles = isLabel ? `
    @page { size: auto; margin: 8mm; }
    html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff !important; display: flex !important; justify-content: center !important; }
    .print-wrap { width: 105mm !important; max-width: 105mm !important; margin: 0 auto !important; padding: 0 !important; }
  ` : `
    @page { margin: 0; }
    body { padding: 1.5cm; }
  `;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',sans-serif;font-size:13px;color:#000000;background:#fff;padding:${isLabel ? '16px' : '24px'};${isLabel ? 'display:flex;justify-content:center;' : ''}}
    .print-wrap{width:${isLabel ? '105mm' : '800px'};max-width:${isLabel ? '105mm' : '800px'};margin:0 auto;}
    h1{font-size:22px;font-weight:800;} h2{font-size:15px;font-weight:700;margin-bottom:8px;}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid rgba(48, 55, 42, 0.12);}
    .company-name{font-size:20px;font-weight:800;color:#000000;}
    .company-sub{font-size:11px;color:#000000;margin-top:4px;}
    .badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;}
    .badge-office{background:rgba(179, 197, 138, 0.2);color:#000000;}
    .badge-customer{background:rgba(179, 197, 138, 0.15);color:#000000;}
    .badge-delivery{background:rgba(48, 55, 42, 0.1);color:#000000;}
    .badge-label{background:rgba(179, 197, 138, 0.2);color:#000000;}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 32px;margin-bottom:20px;padding:16px;background:#F5F7EC;border-radius:8px;border:1px solid rgba(48, 55, 42, 0.12);}
    .info-item label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#000000;margin-bottom:3px;}
    .info-item span{font-size:13px;font-weight:600;color:#000000;}
    .info-item span.green{color:#000000;}
    table{width:100%;border-collapse:collapse;margin-bottom:20px;}
    th{background:#F5F7EC;padding:9px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#000000;border-bottom:2px solid rgba(48, 55, 42, 0.12);}
    td{padding:9px 12px;border-bottom:1px solid #F5F7EC;font-size:13px;}
    tr:last-child td{border-bottom:none;}
    .totals{margin-left:auto;width:280px;border:1px solid rgba(48, 55, 42, 0.12);border-radius:8px;overflow:hidden;}
    .totals-row{display:flex;justify-content:space-between;padding:8px 14px;font-size:13px;}
    .totals-row:nth-child(odd){background:#F5F7EC;}
    .totals-row.grand{background:#B3C58A;color:#000000;font-weight:800;font-size:15px;}
    .footer-note{text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid rgba(48, 55, 42, 0.12);font-size:11px;color:#000000;}
    .address-box{border:1px solid rgba(48, 55, 42, 0.12);border-radius:8px;padding:14px;margin-bottom:16px;}
    .address-box h3{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#000000;margin-bottom:6px;}
    .address-box p{font-size:14px;font-weight:600;color:#000000;line-height:1.6;}
    @media print{
      ${printStyles}
      button{display:none;}
      * {-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important;}
    }
  </style></head><body><div class="print-wrap">${html}</div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
    window.onafterprint = function() {
      setTimeout(function() {
        if (window.frameElement) window.frameElement.remove();
      }, 500);
    };
  </script>
  </body></html>`);
  doc.close();
}

function buildOfficeCopy(order, products = []) {
  const items = order.items || [];
  const shippingCharges = parseFloat(order.shipping_charges || 0);
  let totalWt = 0;
  let itemsSumWithTax = 0;
  let itemsSumWithoutTax = 0;
  let commonUnit = '';
  const totalQty = items.reduce((s, it) => s + (parseInt(it.quantity) || 0), 0);

  const rows = items.map((it, i) => {
    const matched = products.find(p => p.name === it.product || String(p.id) === String(it.product_id)) || {};
    const sku = it.product_code || matched.product_code || it.sku || matched.sku || it.product_id || matched.id || '—';
    const getValidWeight = (...vals) => {
      for (let v of vals) {
        if (v && v !== '0' && parseFloat(v) !== 0) return v;
      }
      return '';
    };
    let unitWeight = getValidWeight(it.weight_volume, matched.weight_volume, it.weight, matched.weight, it.variation_name);

    let calcWeightStr = unitWeight || '—';
    let weightVal = 0;
    if (unitWeight && unitWeight !== '0') {
      const num = parseFloat(unitWeight);
      if (!isNaN(num) && num > 0) {
        weightVal = num * (parseInt(it.quantity) || 1);
        const currentUnit = unitWeight.toString().replace(/^[0-9.\s]+/, '').trim() || 'kg';
        if (!commonUnit) commonUnit = currentUnit;
        else if (commonUnit !== currentUnit) commonUnit = 'Mixed';
        calcWeightStr = weightVal.toFixed(3) + currentUnit;
        totalWt += weightVal;
      } else {
        calcWeightStr = unitWeight;
      }
    }

    const qty = parseInt(it.quantity) || 0;
    let mrp = parseFloat(it.mrp) || 0;
    if (!mrp) {
      if (parseFloat(it.price) > parseFloat(matched.mrp)) mrp = parseFloat(it.price);
      else if (it.variation_name || it.variation_id) mrp = parseFloat(it.price);
      else mrp = parseFloat(matched.mrp) || parseFloat(it.price) || 0;
    }
    const itemTotalWithTax = parseFloat(it.total || (parseFloat(it.price || 0) * qty) || 0);
    itemsSumWithTax += itemTotalWithTax;

    let taxPercent = 5;
    if (it.tax_percent) {
      taxPercent = parseFloat(it.tax_percent);
    } else if (it.cgst_percent && it.sgst_percent) {
      taxPercent = parseFloat(it.cgst_percent) + parseFloat(it.sgst_percent);
    } else if (it.igst_percent) {
      taxPercent = parseFloat(it.igst_percent);
    } else if (it.tax_total && itemsSumWithTax > 0) {
      // Fallback calculation if percentages are missing but tax total exists
      taxPercent = 5; // Default assumption based on the image
    }

    let rateExcludingTax = (itemTotalWithTax / qty) / (1 + (taxPercent / 100));
    itemsSumWithoutTax += (rateExcludingTax * qty) || 0;

    return `<tr>
      <td style="border:1px solid #000;padding:4px;text-align:center;">${i + 1}</td>
      <td style="border:1px solid #000;padding:4px;text-align:left;">${sku}</td>
      <td style="border:1px solid #000;padding:4px;text-align:left;">${it.product || '—'}</td>
      <td style="border:1px solid #000;padding:4px;text-align:center;">${qty}</td>
      <td style="border:1px solid #000;padding:4px;text-align:right;">₹${mrp > 0 ? mrp.toFixed(2) : '—'}</td>
      <td style="border:1px solid #000;padding:4px;text-align:right;">₹${rateExcludingTax.toFixed(2)}</td>
      <td style="border:1px solid #000;padding:4px;text-align:center;">${taxPercent}%</td>
      <td style="border:1px solid #000;padding:4px;text-align:right;">₹${itemTotalWithTax.toFixed(2)}</td>
      <td style="border:1px solid #000;padding:4px;text-align:left;">${calcWeightStr}</td>
    </tr>`;
  }).join('');

  const grandTotal = itemsSumWithTax + shippingCharges;

  return `
  <div style="font-family:'Segoe UI',sans-serif;color:#000000;font-size:11px;background:#fff;padding:20px;">
    <div style="text-align:center;font-weight:bold;font-size:13px;margin-bottom:12px;">
      Office Copy / SALES - ONLINE
    </div>
    <table style="width:100%;border:none;margin-bottom:12px;">
      <tr>
        <td style="width:50%;vertical-align:top;border:none;line-height:1.4;">
          <b>Memo No:</b> ${order.order_no || order.order_id || '—'} / ${fmtDate(new Date())}<br>
          <b>Customer Name:</b> ${order.customer || '—'}<br>
          <b>Customer Phone:</b> ${order.mobile || '—'}<br>
          <b>Order Type:</b> DH Online OS - ${order.customer || '—'}<br>
          <b>Billing Address:</b><br>
          <div style="word-break:normal;overflow-wrap:break-word;white-space:pre-wrap;padding-right:10px;margin-top:2px;">${(order.billing_address || order.shipping_address || '—').replace(/,(?=[^\\s])/g, ', ')}</div>
        </td>
        <td style="width:50%;vertical-align:top;text-align:left;border:none;line-height:1.4;">
          <b>Order Date:</b> ${fmtDate(order.created_at)}<br>
          <b>CRO:</b> Ambika 9788122001<br>
          <b>Payment:</b> ${order.payment_status || order.payment_method || 'Online Payment'}<br>
          <b>Shipping Address:</b><br>
          <div style="word-break:normal;overflow-wrap:break-word;white-space:pre-wrap;padding-right:10px;margin-top:2px;">${(order.shipping_address || order.billing_address || '—').replace(/,(?=[^\\s])/g, ', ')}</div>
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px;">
      <thead>
        <tr>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:4%;">S.NO</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:6%;">SKU ID</th>
          <th style="border:1px solid #000;padding:4px;text-align:center;width:52%;">PRODUCT NAME</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:4%;">QTY</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:6%;">MRP</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:7%;">RATE</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:4%;">TAX</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:8%;">TOTAL</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:9%;">WT</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td colspan="3" style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold;">Sub Total</td>
          <td style="border:1px solid #000;padding:4px;text-align:center;">${totalQty}</td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;text-align:right;">₹${itemsSumWithoutTax.toFixed(2)}</td>
          <td style="border:1px solid #000;padding:4px;text-align:center;">5%</td>
          <td style="border:1px solid #000;padding:4px;text-align:right;">₹${itemsSumWithTax.toFixed(2)}</td>
          <td style="border:1px solid #000;padding:4px;text-align:center;">${totalWt > 0 ? totalWt.toFixed(3) + (commonUnit === 'Mixed' ? '' : commonUnit) : ''}</td>
        </tr>
        <tr>
          <td colspan="3" style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold;">Shipping Charges</td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;text-align:right;">₹${shippingCharges.toFixed(2)}</td>
          <td style="border:1px solid #000;padding:4px;"></td>
        </tr>
        <tr>
          <td colspan="3" style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold;">Grand Total</td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold;">₹${grandTotal.toFixed(2)}</td>
          <td style="border:1px solid #000;padding:4px;"></td>
        </tr>
      </tbody>
    </table>

  </div>`;
}

function buildCustomerCopy(order, products = []) {
  const items = order.items || [];
  const shippingCharges = parseFloat(order.shipping_charges || 0);
  let totalWt = 0;
  let itemsSumWithTax = 0;
  let itemsSumWithoutTax = 0;
  let commonUnit = '';
  const totalQty = items.reduce((s, it) => s + (parseInt(it.quantity) || 0), 0);

  const rows = items.map((it, i) => {
    const matched = products.find(p => p.name === it.product || String(p.id) === String(it.product_id)) || {};
    const sku = it.product_code || matched.product_code || it.sku || matched.sku || it.product_id || matched.id || '—';
    const getValidWeight = (...vals) => {
      for (let v of vals) {
        if (v && v !== '0' && parseFloat(v) !== 0) return v;
      }
      return '';
    };
    let unitWeight = getValidWeight(it.weight_volume, matched.weight_volume, it.weight, matched.weight, it.variation_name);
    let calcWeightStr = unitWeight || '—';
    let weightVal = 0;
    if (unitWeight && unitWeight !== '0') {
      const num = parseFloat(unitWeight);
      if (!isNaN(num) && num > 0) {
        weightVal = num * (parseInt(it.quantity) || 1);
        const currentUnit = unitWeight.toString().replace(/^[0-9.\s]+/, '').trim() || 'kg';
        if (!commonUnit) commonUnit = currentUnit;
        else if (commonUnit !== currentUnit) commonUnit = 'Mixed';
        calcWeightStr = weightVal.toFixed(3) + currentUnit;
        totalWt += weightVal;
      } else {
        calcWeightStr = unitWeight;
      }
    }

    const qty = parseInt(it.quantity) || 0;
    let mrp = parseFloat(it.mrp) || 0;
    if (!mrp) {
      if (parseFloat(it.price) > parseFloat(matched.mrp)) mrp = parseFloat(it.price);
      else if (it.variation_name || it.variation_id) mrp = parseFloat(it.price);
      else mrp = parseFloat(matched.mrp) || parseFloat(it.price) || 0;
    }
    const itemTotalWithTax = parseFloat(it.total || (parseFloat(it.price || 0) * qty) || 0);
    itemsSumWithTax += itemTotalWithTax;

    let taxPercent = 5;
    if (it.tax_percent) {
      taxPercent = parseFloat(it.tax_percent);
    } else if (it.cgst_percent && it.sgst_percent) {
      taxPercent = parseFloat(it.cgst_percent) + parseFloat(it.sgst_percent);
    } else if (it.igst_percent) {
      taxPercent = parseFloat(it.igst_percent);
    } else if (it.tax_total && itemsSumWithTax > 0) {
      taxPercent = 5;
    }

    let rateExcludingTax = (itemTotalWithTax / qty) / (1 + (taxPercent / 100));
    itemsSumWithoutTax += (rateExcludingTax * qty) || 0;

    return `<tr>
      <td style="border:1px solid #000;padding:4px;text-align:center;">${i + 1}</td>
      <td style="border:1px solid #000;padding:4px;text-align:left;">${sku}</td>
      <td style="border:1px solid #000;padding:4px;text-align:left;">${matched.tamil_name || it.product || '—'}</td>
      <td style="border:1px solid #000;padding:4px;text-align:center;">${qty}</td>
      <td style="border:1px solid #000;padding:4px;text-align:right;">₹${mrp > 0 ? mrp.toFixed(2) : '—'}</td>
      <td style="border:1px solid #000;padding:4px;text-align:right;">₹${rateExcludingTax.toFixed(2)}</td>
      <td style="border:1px solid #000;padding:4px;text-align:center;">${taxPercent}%</td>
      <td style="border:1px solid #000;padding:4px;text-align:right;">₹${itemTotalWithTax.toFixed(2)}</td>
      <td style="border:1px solid #000;padding:4px;text-align:left;">${calcWeightStr}</td>
    </tr>`;
  }).join('');

  const grandTotal = itemsSumWithTax + shippingCharges;

  return `
  <div style="font-family:'Segoe UI',sans-serif;color:#000000;font-size:11px;background:#fff;padding:20px;">
    <div style="text-align:center;font-weight:bold;font-size:13px;margin-bottom:12px;">
      Customer Copy / SALES - ONLINE
    </div>
    <table style="width:100%;border:none;margin-bottom:12px;">
      <tr>
        <td style="width:50%;vertical-align:top;border:none;line-height:1.4;">
          <b>Memo No:</b> ${order.order_no || order.order_id || '—'} / ${fmtDate(new Date())}<br>
          <b>Customer Name:</b> ${order.customer || '—'}<br>
          <b>Customer Phone:</b> ${order.mobile || '—'}<br>
          <b>Order Type:</b> DH Online OS - ${order.customer || '—'}<br>
          <b>Billing Address:</b><br>
          <div style="word-break:normal;overflow-wrap:break-word;white-space:pre-wrap;padding-right:10px;margin-top:2px;">${(order.billing_address || order.shipping_address || '—').replace(/,(?=[^\\s])/g, ', ')}</div>
        </td>
        <td style="width:50%;vertical-align:top;text-align:left;border:none;line-height:1.4;">
          <b>Order Date:</b> ${fmtDate(order.created_at)}<br>
          <b>CRO:</b> Ambika 9788122001<br>
          <b>Payment:</b> ${order.payment_status || order.payment_method || 'Online Payment'}<br>
          <b>Shipping Address:</b><br>
          <div style="word-break:normal;overflow-wrap:break-word;white-space:pre-wrap;padding-right:10px;margin-top:2px;">${(order.shipping_address || order.billing_address || '—').replace(/,(?=[^\\s])/g, ', ')}</div>
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px;">
      <thead>
        <tr>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:4%;">S.NO</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:6%;">SKU ID</th>
          <th style="border:1px solid #000;padding:4px;text-align:center;width:52%;">PRODUCT NAME</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:4%;">QTY</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:6%;">MRP</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:7%;">RATE</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:4%;">TAX</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:8%;">TOTAL</th>
          <th style="border:1px solid #000;padding:4px;text-align:left;width:9%;">WT</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td colspan="3" style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold;">Sub Total</td>
          <td style="border:1px solid #000;padding:4px;text-align:center;">${totalQty}</td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;text-align:right;">₹${itemsSumWithoutTax.toFixed(2)}</td>
          <td style="border:1px solid #000;padding:4px;text-align:center;">5%</td>
          <td style="border:1px solid #000;padding:4px;text-align:right;">₹${itemsSumWithTax.toFixed(2)}</td>
          <td style="border:1px solid #000;padding:4px;text-align:center;">${totalWt > 0 ? totalWt.toFixed(3) + (commonUnit === 'Mixed' ? '' : commonUnit) : ''}</td>
        </tr>
        <tr>
          <td colspan="3" style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold;">Shipping Charges</td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;text-align:right;">₹${shippingCharges.toFixed(2)}</td>
          <td style="border:1px solid #000;padding:4px;"></td>
        </tr>
        <tr>
          <td colspan="3" style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold;">Grand Total</td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;"></td>
          <td style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold;">₹${grandTotal.toFixed(2)}</td>
          <td style="border:1px solid #000;padding:4px;"></td>
        </tr>
      </tbody>
    </table>


    <div style="font-size:9.5px;line-height:1.6;border:1px solid #000;padding:6px;margin-bottom:30px;text-align:left;">
      அன்புடையீர் வணக்கம், புதிய பொருட்கள் : 1) வல்லாரை மிக்ஸர், 2) கருப்பட்டி அல்வா 3) Rice Kanji Shampoo - தங்கள் ஆர்டர்களை 5 மணிக்குள் அனுப்புங்கள். Order Support No: 9788122001-. நன்றி. WhatsApp Complaint- 9965582001 (First Employee) எமது பொருட்களைப் போன்றே வரும் போலி பொருட்களைத் தவிருங்கள். ஜூலை மாதம் மட்டும் 500 ML செம்பருத்தி ஷாம்பு க்கு ஒரு சிவப்பு சந்தன சோப்பு இலவசம்.. நன்றி. - சுந்தரராஜ், முதன்மை பணியாளர்.
    </div>
    
    <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:15px;padding:0 10px;">
      <div>Prepared by Sign</div>
      <div>Checked by Sign</div>
      <div>Approved by Sign</div>
    </div>
    <div style="display:flex;justify-content:flex-end;font-size:10px;">
      <div>Page 1 of 1</div>
    </div>
  </div>`;
}

function buildDeliveryNote(order, products = []) {
  const items = order.items || [];
  const rows = items.map((it, i) => {
    const matched = products.find(p => p.name === it.product || String(p.id) === String(it.product_id)) || {};
    const sku = it.product_code || matched.product_code || it.sku || matched.sku || it.product_id || matched.id || '—';
    return `<tr>
    <td>${i + 1}</td><td>${it.product || '—'}</td><td>${sku}</td>
    <td style="text-align:center;font-weight:700;font-size:16px">${it.quantity || 0}</td>
    <td style="text-align:center">☐</td>
  </tr>`}).join('');
  return `
  <div class="hdr">
    <div><div class="company-name">${COMPANY.name}</div><div class="company-sub">${COMPANY.address} | ${COMPANY.phone}</div></div>
    <div style="text-align:right"><h1>DELIVERY NOTE</h1><span class="badge badge-delivery">DELIVERY COPY</span></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div class="address-box"><h3>📦 Deliver To</h3><div style="font-size:15px;font-weight:700;word-break:normal;overflow-wrap:break-word;white-space:pre-wrap;padding-right:10px;">${order.customer || '—'}<br>${(order.shipping_address || order.billing_address || '—').replace(/,(?=[^\\s])/g, ', ')}<br><span style="color:#000000">${order.mobile || ''}</span></div></div>
    <div class="address-box"><h3>Order Info</h3>
      <p>Order #: <b>${order.order_id || order.order_no || '—'}</b><br>
      Date: ${fmtDate(order.created_at)}<br>
      Logistics: <b>${order.logistics || '—'}</b><br>
      Total Items: <b>${items.reduce((s, it) => s + (parseInt(it.quantity) || 0), 0)} units</b></p>
    </div>
  </div>
  <h2>Items to Deliver</h2>
  <div className="table-responsive">
          <table><thead><tr><th>#</th><th>Product Name</th><th>SKU</th><th style="text-align:center">Qty</th><th style="text-align:center">Checked ✓</th></tr></thead>
  <tbody>${rows}</tbody></table>
        </div>
  <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="address-box"><h3>Packed By</h3><p style="height:40px"></p><p style="border-top:1px solid rgba(48, 55, 42, 0.12);padding-top:8px;font-size:11px;color:#000000">Signature</p></div>
    <div class="address-box"><h3>Received By</h3><p style="height:40px"></p><p style="border-top:1px solid rgba(48, 55, 42, 0.12);padding-top:8px;font-size:11px;color:#000000">Signature & Date</p></div>
  </div>
  <div class="footer-note">This delivery note must be signed and returned. — ${COMPANY.name}</div>`;
}

function buildShippingLabel(order, products = []) {
  let totalWt = 0;
  (order.items || []).forEach((it) => {
    const matched = products.find(p => p.name === it.product || String(p.id) === String(it.product_id)) || {};
    const getValidWeight = (...vals) => {
      for (let v of vals) {
        if (v && v !== '0' && parseFloat(v) !== 0) return v;
      }
      return '';
    };
    let unitWeight = getValidWeight(it.weight_volume, matched.weight_volume, it.weight, matched.weight, it.variation_name);
    if (unitWeight && unitWeight !== '0') {
      const num = parseFloat(unitWeight);
      if (!isNaN(num) && num > 0) {
        let weightVal = num * (parseInt(it.quantity) || 1);
        totalWt += weightVal;
      }
    }
  });

  // DC No
  let dcNo = order.invoice_number || order.invoice_no;
  if (!dcNo) {
    if (order.order_no) {
      dcNo = order.order_no.startsWith('ORD-') ? order.order_no.replace('ORD-', 'DC/') : order.order_no;
    } else {
      dcNo = order.order_id ? `DC/${order.order_id}` : '—';
    }
  }

  // DC Date
  let dcDate = '—';
  if (order.created_at || order.date) {
    const d = new Date(order.created_at || order.date);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      dcDate = `${day}/${month}/${year}`;
    }
  }

  // Weight
  let weightDisplay = order.weight || order.total_weight;
  if (!weightDisplay) {
    if (totalWt > 0) {
      weightDisplay = totalWt.toFixed(2);
    } else {
      weightDisplay = '—';
    }
  }

  // Box count
  const boxDisplay = order.box_count || order.boxes || '1/1';

  // Phones / Mobile
  const phoneList = [];
  if (order.mobile) phoneList.push(order.mobile);
  if (order.alt_mobile && order.alt_mobile !== order.mobile) phoneList.push(order.alt_mobile);
  if (order.alternate_phone && !phoneList.includes(order.alternate_phone)) phoneList.push(order.alternate_phone);
  if (order.address && typeof order.address === 'object') {
    if (order.address.phone && !phoneList.includes(order.address.phone)) phoneList.push(order.address.phone);
    if (order.address.alternate_phone && !phoneList.includes(order.address.alternate_phone)) phoneList.push(order.address.alternate_phone);
  }
  const mobileDisplay = phoneList.length > 0 ? phoneList.join('. ') : '—';

  // Recipient Name
  const customerName = (order.customer || (order.address && order.address.full_name) || '—').toUpperCase();

  // Address formatted line by line
  let rawAddress = '';
  if (order.shipping_address) {
    rawAddress = order.shipping_address;
  } else if (order.billing_address) {
    rawAddress = order.billing_address;
  } else if (order.address && typeof order.address === 'object') {
    rawAddress = order.address.address || [order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', ');
  }

  let formattedAddressHtml = '';
  if (rawAddress && rawAddress !== '—') {
    const clean = rawAddress.replace(/\s*,\s*/g, ', ').trim();
    const parts = clean.split(', ').map(s => s.trim()).filter(Boolean);
    
    // If the last item is a 6-digit pincode, merge with previous line (e.g. TAMIL NADU - 638476)
    if (parts.length >= 2 && /^\d{6}$/.test(parts[parts.length - 1])) {
      const pin = parts.pop();
      parts[parts.length - 1] = `${parts[parts.length - 1]} - ${pin}`;
    }

    formattedAddressHtml = parts.map((p, idx) => {
      const isLast = idx === parts.length - 1;
      return `<div style="margin-bottom:1px;">${p.toUpperCase()}${isLast ? '' : ','}</div>`;
    }).join('');
  } else {
    formattedAddressHtml = '<div>—</div>';
  }

  return `
  <div style="width:100%;box-sizing:border-box;border:2px solid #000;border-radius:6px;padding:8px 12px;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#000;text-align:left;">
    
    <!-- BRAND / TITLE HEADER -->
    <div style="text-align:center;border-bottom:1.5px dashed #aaa;padding-bottom:5px;margin-bottom:6px;">
      <div style="font-size:17px;font-weight:900;color:#000;letter-spacing:0.5px;">Vedan Mart</div>
      <div style="display:inline-block;background:#e5ebd3;color:#000;font-size:9.5px;font-weight:800;padding:2px 10px;border-radius:12px;margin-top:2px;letter-spacing:0.5px;text-transform:uppercase;">
        SHIPPING LABEL
      </div>
    </div>

    <!-- TOP HEADER -->
    <div style="margin-bottom:4px;">
      <table style="width:100%;border-collapse:collapse;margin:0;font-size:14px;font-weight:700;color:#000;">
        <tbody>
          <tr>
            <td style="padding:2px 0;border:none;width:68px;font-weight:800;white-space:nowrap;">DC NO</td>
            <td style="padding:2px 0;border:none;width:15px;font-weight:800;text-align:center;">:</td>
            <td style="padding:2px 0;border:none;font-weight:700;padding-right:10px;white-space:nowrap;">${dcNo}</td>
            <td style="padding:2px 0;border:none;width:75px;font-weight:800;white-space:nowrap;">WEIGHT</td>
            <td style="padding:2px 0;border:none;width:15px;font-weight:800;text-align:center;">:</td>
            <td style="padding:2px 0;border:none;font-weight:700;text-align:right;white-space:nowrap;">${weightDisplay}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;border:none;width:68px;font-weight:800;white-space:nowrap;">DC DATE</td>
            <td style="padding:2px 0;border:none;width:15px;font-weight:800;text-align:center;">:</td>
            <td style="padding:2px 0;border:none;font-weight:700;padding-right:10px;white-space:nowrap;">${dcDate}</td>
            <td style="padding:2px 0;border:none;width:75px;font-weight:800;white-space:nowrap;">BOX</td>
            <td style="padding:2px 0;border:none;width:15px;font-weight:800;text-align:center;">:</td>
            <td style="padding:2px 0;border:none;font-weight:700;text-align:right;white-space:nowrap;">${boxDisplay}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MIDDLE COURIER STICKER BLANK AREA -->
    <div style="height:30mm;width:100%;"></div>

    <!-- RECIPIENT (TO) DETAILS -->
    <div style="color:#000;line-height:1.35;font-size:14px;font-weight:800;margin-bottom:8px;text-align:left;">
      <div style="margin-bottom:3px;">Mobile : ${mobileDisplay}</div>
      <div style="margin-bottom:2px;">To. :</div>
      <div style="text-transform:uppercase;margin-bottom:2px;">${customerName}</div>
      <div style="text-transform:uppercase;font-size:13px;font-weight:700;line-height:1.35;word-break:break-word;text-align:left;">
        ${formattedAddressHtml}
      </div>
    </div>

    <!-- SENDER (FROM) ENCLOSED BOX -->
    <div style="border:1.5px solid #000;padding:3px 6px;font-size:10px;font-weight:700;color:#000;line-height:1.2;width:100%;box-sizing:border-box;text-align:left;white-space:nowrap;">
      From : Dharani Herbals,Punjai Puliampatti + 01 99429 29001,98651 32001
    </div>

  </div>`;
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('web');

  /* view: 'list' | 'detail' | 'add' */
  const [view, setView] = useState('list');
  const [detailOrder, setDetailOrder] = useState(null);

  /* add-order */
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [toast, setToast] = useState(null);

  /* Dharani ERP Integration State */
  const [erpSyncLoading, setErpSyncLoading] = useState({});
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [showErpSettings, setShowErpSettings] = useState(false);
  const [erpConfig, setErpConfig] = useState(getDharaniConfig());
  const [erpTestResult, setErpTestResult] = useState(null);
  const [erpTesting, setErpTesting] = useState(false);
  const [syncRecords, setSyncRecords] = useState({});
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [erpFilter, setErpFilter] = useState('all'); // 'all' | 'pending' | 'synced'

  useEffect(() => {
    setSyncRecords(getSyncedRecords());
  }, []);

  const [form, setForm] = useState({
    orderNo: genOrderNo(), invoiceNo: genInvoice(),
    customerId: '', billingAddr: '', shippingAddr: '',
    communication: '', logistics: '', remarks: '',
    paymentMethod: '', shippingCharge: 0,
    priceCategory: '',
  });
  const [rows, setRows] = useState([blankRow()]);

  useEffect(() => {
    fetchOrders(true);
    fetchProductList();
    const interval = setInterval(() => fetchOrders(false), 15000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => { if (view === 'add') { fetchCustomers(); } }, [view]);

  /* ── API ── */
  const fetchOrders = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/orders/?_t=${Date.now()}`, { headers: HDR });
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch { return; }
      let items = Array.isArray(data) ? data : data.results || data.orders || Object.values(data).find(Array.isArray) || [];
      items = items.map(processOrderForDisplay);
      setOrders(items);
    } catch (e) { console.error(e); } finally { if (showLoader) setIsLoading(false); }
  };
  const fetchCustomers = async () => {
    try {
      const d = await (await fetch(`${API_BASE}/admin/staff/`, { headers: HDR })).json();
      setCustomers(Array.isArray(d) ? d : d.results || d.customers || []);
    } catch (e) { }
  };
  const [hasVariationsMap, setHasVariationsMap] = useState({});

  const fetchProductList = async () => {
    try {
      const d = await (await fetch(`${BASE}/store/products/`, { headers: HDR })).json();
      const prodList = Array.isArray(d) ? d : d.results || d.products || [];
      setProducts(prodList);
    } catch (e) { }
  };

  /* ── view order detail ── */
  const openDetail = async (order) => {
    setDetailOrder(order);
    setView('detail');
    // try to load full detail from API
    try {
      const fetchUrl = activeTab === 'web'
        ? `${BASE}/orders/${order.order_id}/?role=customer`
        : `${BASE}/orders/${order.order_id}/?role=staff`;
      const res = await fetch(fetchUrl, { headers: HDR });
      if (res.ok) {
        let full = await res.json();

        // Fetch staff/store_member address if missing
        if (full.customer_role && ['staff', 'store_member'].includes(full.customer_role.toLowerCase())) {
          const hasValidAddr = full.address && (full.address.address || full.address.city || full.address.state);
          if (!hasValidAddr) {
            try {
              const staffRes = await fetch(`${BASE}/admin/staff/`, { headers: HDR });
              if (staffRes.ok) {
                const staffData = await staffRes.json();
                const staffList = Array.isArray(staffData) ? staffData : staffData.results || staffData.customers || [];
                const staffMember = staffList.find(s => String(s.mobile) === String(full.mobile) || String(s.name).toLowerCase() === String(full.customer).toLowerCase());
                if (staffMember) {
                  const addrRes = await fetch(`${BASE}/address/${staffMember.id}/?role=staff`, { headers: HDR });
                  if (addrRes.ok) {
                    const addrData = await addrRes.json();
                    const formatAddr = (a) => {
                      if (!a) return '';
                      if (a.address && a.address.trim().length > 0) return a.address.trim();
                      return [a.city, a.state, a.pincode].filter(Boolean).join(', ');
                    };
                    let foundAddr = '';
                    if (addrData && Array.isArray(addrData.addresses) && addrData.addresses.length > 0) {
                      foundAddr = formatAddr(addrData.addresses[0]);
                    } else if (addrData && addrData.address) {
                      foundAddr = formatAddr(addrData);
                    } else if (Array.isArray(addrData) && addrData.length > 0) {
                      foundAddr = formatAddr(addrData[0]);
                    }
                    if (foundAddr) {
                      full.billing_address = foundAddr;
                      full.shipping_address = foundAddr;
                    }
                  }
                }
              }
            } catch (e) { console.error("Error fetching staff address", e); }
          }
        }

        setDetailOrder(processOrderForDisplay({ ...order, ...full }));
      }
    } catch (e) { }
  };

  /* ── derived ── */
  const selCust = customers.find(c => String(c.id) === String(form.customerId));
  const custName = c => c?.name || `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || c?.username || 'Unknown';
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const fetchedProdDetailIdsRef = React.useRef(new Set());

  const extractPrice = (pObj, catKey) => {
    if (!pObj || !catKey) return 0;
    if (pObj.pricing && pObj.pricing[catKey] !== undefined && pObj.pricing[catKey] !== null) {
      const val = parseFloat(pObj.pricing[catKey]);
      if (!isNaN(val)) return val;
    }
    if (pObj[catKey] !== undefined && pObj[catKey] !== null) {
      const val = parseFloat(pObj[catKey]);
      if (!isNaN(val)) return val;
    }
    const fallback = parseFloat(pObj.pricing?.customer_price ?? pObj.customer_price ?? pObj.pricing?.mrp ?? pObj.mrp ?? pObj.price ?? 0);
    return !isNaN(fallback) ? fallback : 0;
  };

  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const barcodeInputRef = React.useRef(null);

  const handleBarcodeScan = React.useCallback(async (codeToScan) => {
    const rawInput = (codeToScan !== undefined ? codeToScan : barcodeInput).trim();
    if (!rawInput) return;

    const barcodeList = rawInput.split(/[, \n]+/).map(b => b.trim()).filter(Boolean);
    if (barcodeList.length === 0) return;

    setIsScanningBarcode(true);
    let addedCount = 0;

    for (const barcodeStr of barcodeList) {
      console.log("🚀 [BARCODE SCAN] Initiating scan for barcode:", barcodeStr);
      try {
        const ts = Date.now();
        const apiUrl = `${API_BASE}/products/barcode/?barcode=${encodeURIComponent(barcodeStr)}&_t=${ts}`;
        console.log("🌐 [BARCODE SCAN] Calling API URL:", apiUrl);

        const res = await fetch(apiUrl, { headers: HDR });
        console.log("📥 [BARCODE SCAN] HTTP Status:", res.status);
        const data = await res.json();
        console.log("📦 [BARCODE SCAN] Response Data:", data);

        if ((res.ok && data.success && data.data) || (res.ok && data.id)) {
          const prodData = data.data || data;

          setProducts(prev => {
            if (prev.some(p => String(p.id) === String(prodData.id))) {
              return prev.map(p => String(p.id) === String(prodData.id) ? { ...p, ...prodData } : p);
            }
            return [...prev, prodData];
          });

          const prodId = prodData.id;
          const calcPrice = form.priceCategory ? extractPrice(prodData, form.priceCategory) : 0;
          const prodCode = prodData.product_code || prodData.barcode || prodData.sku || '';

          setRows(prevRows => {
            const existingIdx = prevRows.findIndex(r => String(r.product) === String(prodId) || (r.sku && r.sku === prodCode));

            if (existingIdx !== -1) {
              return prevRows.map((r, idx) => {
                if (idx !== existingIdx) return r;
                const newQty = (parseInt(r.qty) || 0) + 1;
                const unitPrice = (r.price && r.price > 0) ? r.price : calcPrice;
                return {
                  ...r,
                  qty: newQty,
                  price: unitPrice,
                  total: unitPrice * newQty
                };
              });
            } else {
              const emptyIdx = prevRows.findIndex(r => !r.product);
              const newRow = {
                id: Date.now() + Math.random(),
                product: prodId,
                sku: prodCode,
                qty: 1,
                price: calcPrice,
                total: calcPrice,
                variations: prodData.variations || null,
                variationId: ''
              };

              if (emptyIdx !== -1) {
                return prevRows.map((r, idx) => idx === emptyIdx ? newRow : r);
              } else {
                return [...prevRows, newRow];
              }
            }
          });

          addedCount++;
        } else {
          console.warn("Product not found for barcode:", barcodeStr);
        }
      } catch (err) {
        console.error('Barcode scan error for barcode:', barcodeStr, err);
      }
    }

    if (addedCount > 0) {
      showToast('success', `${addedCount} product(s) processed via barcode scan!`);
    } else {
      showToast('error', 'No products found for scanned barcode(s).');
    }

    setBarcodeInput('');
    setIsScanningBarcode(false);
  }, [barcodeInput, form.priceCategory]);

  // Auto-focus barcode input box when opening Add Order form
  useEffect(() => {
    if (view === 'add') {
      const timer = setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [view]);

  // Global keydown listener for hardware USB/Bluetooth barcode scanners
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;

    const handleGlobalKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      // If user is typing in another text field (not barcode input), do not intercept standard typing
      if (isInput && activeEl !== barcodeInputRef.current) {
        return;
      }

      const currentTime = Date.now();

      if (e.key === 'Enter') {
        if (buffer.length > 2 && (currentTime - lastKeyTime < 150)) {
          e.preventDefault();
          const scannedCode = buffer.trim();
          buffer = '';
          if (view !== 'add') setView('add');
          setTimeout(() => handleBarcodeScan(scannedCode), 50);
        }
      } else if (e.key.length === 1) {
        if (currentTime - lastKeyTime > 150) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
        lastKeyTime = currentTime;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [view, handleBarcodeScan]);

  useEffect(() => {
    setRows(prev => prev.map(r => {
      if (!r.product) return r;

      let newPrice = r.price;
      const p = products.find(x => String(x.id) === String(r.product));

      if (p && p.retailer_price === undefined && p.pricing === undefined && !fetchedProdDetailIdsRef.current.has(String(r.product))) {
        fetchedProdDetailIdsRef.current.add(String(r.product));
        fetch(`${API_BASE}/products/${r.product}/?role=admin`, { headers: HDR })
          .then(res => res.json())
          .then(prodDetail => {
            setProducts(prev => prev.map(item => String(item.id) === String(r.product) 
              ? { 
                  ...item, 
                  ...prodDetail, 
                  retailer_price: prodDetail.retailer_price !== undefined ? prodDetail.retailer_price : 0 
                } 
              : item
            ));
          })
          .catch(err => console.error("Failed to fetch product detail", err));
      }

      if (!form.priceCategory) {
        newPrice = 0;
      } else {
        if (r.variationId && r.variations) {
          const v = r.variations.find(x => String(x.id) === String(r.variationId));
          if (v) {
            newPrice = extractPrice(v, form.priceCategory);
          }
        } else if (p) {
          if (r.variations && r.variations.length > 0) {
            const v = r.variations[0];
            newPrice = extractPrice(v, form.priceCategory);
          } else {
            newPrice = extractPrice(p, form.priceCategory);
          }
        }
      }

      return {
        ...r,
        price: newPrice,
        total: newPrice * (parseInt(r.qty) || 0)
      };
    }));
  }, [form.priceCategory, products]);

  const handleCustomerChange = async (custId) => {
    setField('customerId', custId);
    const c = customers.find(x => String(x.id) === String(custId));
    if (c) {
      let bAddr = c.billing_address || c.address || '';
      let sAddr = c.shipping_address || c.store_address || c.address || '';

      try {
        const res = await fetch(`${API_BASE}/address/${custId}/?role=staff`, {
          headers: HDR
        });
        if (res.ok) {
          const addrData = await res.json();
          const formatAddr = (a) => {
            if (!a) return '';
            if (a.address && a.address.trim().length > 0) return a.address.trim();
            return [a.city, a.state, a.pincode].filter(Boolean).join(', ');
          };
          let foundAddr = '';
          if (addrData && Array.isArray(addrData.addresses) && addrData.addresses.length > 0) {
            foundAddr = formatAddr(addrData.addresses[0]);
          } else if (addrData && addrData.address) {
            foundAddr = formatAddr(addrData);
          } else if (Array.isArray(addrData) && addrData.length > 0) {
            foundAddr = formatAddr(addrData[0]);
          }
          if (foundAddr) {
            sAddr = foundAddr;
            bAddr = foundAddr;
          }
        }
      } catch (err) {
        console.error("Failed to fetch address", err);
      }

      if (!bAddr && sAddr) bAddr = sAddr;
      if (!sAddr && bAddr) sAddr = bAddr;

      setField('billingAddr', bAddr);
      setField('shippingAddr', sAddr);

      // Reset products when a new customer is selected
      setRows([blankRow()]);

    } else {
      setField('billingAddr', '');
      setField('shippingAddr', '');
      setRows([blankRow()]);
    }
  };

  const handleProductChange = async (rowId, productId) => {
    setRows(prev => {
      const isLastRow = prev.findIndex(r => r.id === rowId) === prev.length - 1;
      const newRows = prev.map(r => {
        if (r.id !== rowId) return r;
        const p = products.find(x => String(x.id) === String(productId));
        const priceVal = form.priceCategory ? extractPrice(p, form.priceCategory) : 0;
        return {
          ...r,
          product: productId,
          sku: p?.product_code || p?.sku || p?.barcode || '',
          price: priceVal,
          total: priceVal * (parseInt(r.qty) || 0),
          variationId: '',
          variations: null
        };
      });
      return newRows;
    });

    if (!productId) return;

    try {
      const [varsRes, prodRes] = await Promise.all([
        fetch(`${API_BASE}/products/${productId}/variations/?role=admin`, { headers: HDR }),
        fetch(`${API_BASE}/products/${productId}/?role=admin`, { headers: HDR })
      ]);

      if (prodRes.ok) {
        const prodDetail = await prodRes.json();
        setProducts(prev => prev.map(p => String(p.id) === String(productId) ? { ...p, ...prodDetail } : p));
      }

      if (varsRes.ok) {
        const vars = await varsRes.json();
        if (vars && vars.length > 0) {
          setRows(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            const firstVar = vars[0];
            const pPrice = form.priceCategory ? extractPrice(firstVar, form.priceCategory) : 0;
            return {
              ...r,
              variations: vars,
              variationId: firstVar.id,
              sku: firstVar.sku || r.sku,
              price: pPrice,
              total: pPrice * (parseInt(r.qty) || 0)
            };
          }));
        } else {
          setRows(prev => prev.map(r => r.id === rowId ? { ...r, variations: [] } : r));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVariationChange = (rowId, variationId) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const v = (r.variations || []).find(x => String(x.id) === String(variationId));
      if (!v) return r;
      const pPrice = form.priceCategory ? extractPrice(v, form.priceCategory) : 0;
      return {
        ...r,
        variationId,
        sku: v.sku || r.sku,
        price: pPrice,
        total: pPrice * (parseInt(r.qty) || 0)
      };
    }));
  };

  const changeRow = (id, key, val) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [key]: val };
      if (['qty', 'price'].includes(key)) u.total = (parseFloat(u.price) || 0) * (parseInt(u.qty) || 0);
      return u;
    }));
  };
  const addRow = () => setRows(r => [...r, blankRow()]);
  const removeRow = id => setRows(r => {
    const filtered = r.filter(x => x.id !== id);
    return filtered.length > 0 ? filtered : [blankRow()];
  });

  const subTotal = rows.reduce((s, r) => s + (r.total || 0), 0);
  const grandTotal = subTotal + parseFloat(form.shippingCharge || 0);

  const handleStatusChange = async (orderId, status) => {
    try {
      const res = await fetch(`${BASE}/orders/${orderId}/update-status/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...HDR }, body: JSON.stringify({ status })
      });
      if (res.ok) {
        setOrders(orders.map(o => o.order_id === orderId ? { ...o, status } : o));
        if (detailOrder?.order_id === orderId) setDetailOrder(d => ({ ...d, status }));
      }
    } catch (e) { }
  };

  const resetForm = () => {
    setForm({ orderNo: genOrderNo(), invoiceNo: genInvoice(), customerId: '', billingAddr: '', shippingAddr: '', communication: '', logistics: '', remarks: '', paymentMethod: '', shippingCharge: 0 });
    setRows([blankRow()]); setView('list');
  };

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  const saveOrder = async () => {
    if (!form.customerId) { showToast('error', 'Please select a customer.'); return; }
    if (rows.some(r => !r.product)) { showToast('error', 'Select a product for every row.'); return; }
    setSavingOrder(true);
    try {
      const payload = {
        order_no: form.orderNo, invoice_number: form.invoiceNo,
        customer: parseInt(form.customerId), customer_id: parseInt(form.customerId),
        billing_address: form.billingAddr,
        shipping_address: form.shippingAddr || form.billingAddr,
        mode_of_communication: form.communication, logistics: form.logistics,
        remarks: form.remarks, payment_method: form.paymentMethod,
        price_category: form.priceCategory,
        shipping_charges: parseFloat(form.shippingCharge || 0), total_amount: grandTotal,
        items: rows.map(r => ({
          product: parseInt(r.product),
          product_id: parseInt(r.product),
          variation: r.variationId ? parseInt(r.variationId) : null,
          variation_id: r.variationId ? parseInt(r.variationId) : null,
          sku: r.sku,
          quantity: parseInt(r.qty || 1),
          price: parseFloat(r.price || 0),
          total: parseFloat(r.total || 0)
        }))
      };
      const res = await fetch(ORDER_CREATE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...HDR }, body: JSON.stringify(payload) });
      if (res.ok || res.status === 201) { showToast('success', 'Order saved!'); await fetchOrders(); resetForm(); }
      else showToast('error', 'Failed to save order.');
    } catch (e) { showToast('error', 'Network error.'); }
    finally { setSavingOrder(false); }
  };

  const erpCounts = useMemo(() => {
    let pending = 0;
    let synced = 0;
    orders.forEach(o => {
      const isStaff = String(o.customer_role).toLowerCase() === 'staff' || String(o.customer_role).toLowerCase() === 'store_member';
      if ((activeTab === 'web' && isStaff) || (activeTab === 'store' && !isStaff)) return;
      const oid = o.order_id || o.id;
      const sync = syncRecords[oid] || getOrderSyncStatus(oid);
      if (sync && sync.status === 'OK') synced++;
      else pending++;
    });
    return { all: pending + synced, pending, synced };
  }, [orders, syncRecords, activeTab]);

  const filtered = orders.filter(o => {
    const s = searchTerm.toLowerCase();
    const match = String(o.order_id || '').toLowerCase().includes(s) || (o.customer || '').toLowerCase().includes(s) || (o.mobile || '').toLowerCase().includes(s);
    if (!match) return false;

    const isStaff = String(o.customer_role).toLowerCase() === 'staff' || String(o.customer_role).toLowerCase() === 'store_member';
    if (activeTab === 'web' && isStaff) return false;
    if (activeTab === 'store' && !isStaff) return false;

    const oid = o.order_id || o.id;
    const sync = syncRecords[oid] || getOrderSyncStatus(oid);
    const isSynced = sync && sync.status === 'OK';
    if (erpFilter === 'pending' && isSynced) return false;
    if (erpFilter === 'synced' && !isSynced) return false;

    return true;
  });

  const handleExport = () => {
    try {
      if (filtered.length === 0) {
        alert("No orders to export");
        return;
      }

      const headers = ['Order ID', 'Customer', 'Mobile', 'Date', 'Total Amount', 'Status', 'Payment Method'];
      const rows = filtered.map(o => [
        `"${o.order_id || ''}"`,
        `"${(o.customer || 'Guest User').replace(/"/g, '""')}"`,
        `"${o.mobile || ''}"`,
        `"${o.created_at ? new Date(o.created_at).toLocaleString() : ''}"`,
        (parseFloat(o.total_amount) || 0).toFixed(2),
        `"${o.status || 'Pending'}"`,
        `"${o.payment_method || 'N/A'}"`
      ]);

      const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed.");
    }
  };

  /* ── Dharani ERP Handlers ── */
  const handleSyncSingleOrderToDharani = async (order) => {
    const orderId = order.id || order.order_id;
    setErpSyncLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await dharaniService.importOrders([order]);
      const result = res[0];
      if (result && result.Status === 'OK') {
        showToast('success', `Order #${orderId} pushed to Dharani ERP! Voucher #${result.VoucherNo}`);
      } else {
        showToast('error', `Dharani ERP: ${result?.ErrMsg || 'Order import rejected'}`);
      }
      setSyncRecords(getSyncedRecords());
    } catch (err) {
      showToast('error', `Dharani Sync Failed: ${err.message}`);
    } finally {
      setErpSyncLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleBulkSyncToDharani = async () => {
    const targetOrders = selectedOrderIds.length > 0
      ? filtered.filter(o => selectedOrderIds.includes(o.id || o.order_id))
      : filtered.filter(o => {
          const st = getOrderSyncStatus(o.id || o.order_id);
          return !st || st.status !== 'OK';
        });

    if (targetOrders.length === 0) {
      showToast('error', 'No pending or selected orders to sync.');
      return;
    }

    setIsBulkSyncing(true);
    try {
      const results = await dharaniService.importOrders(targetOrders);
      const okCount = results.filter(r => r.Status === 'OK').length;
      const errCount = results.length - okCount;
      if (okCount > 0) {
        showToast('success', `Bulk Sync: ${okCount} order(s) successfully imported into Dharani ERP${errCount > 0 ? `, ${errCount} failed` : ''}.`);
      } else {
        showToast('error', `Dharani Sync Failed: ${results[0]?.ErrMsg || 'All orders rejected'}`);
      }
      setSyncRecords(getSyncedRecords());
    } catch (err) {
      showToast('error', `Bulk Sync Failed: ${err.message}`);
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const handleTestErpConnection = async () => {
    setErpTesting(true);
    setErpTestResult(null);
    try {
      const res = await dharaniService.testConnection();
      setErpTestResult(res);
      if (res.success) {
        showToast('success', 'Connected to Dharani ERP API successfully!');
      } else {
        showToast('error', `Connection Failed: ${res.message}`);
      }
    } catch (e) {
      setErpTestResult({ success: false, message: e.message });
      showToast('error', `Connection Error: ${e.message}`);
    } finally {
      setErpTesting(false);
    }
  };

  const handleSyncMasterData = async () => {
    setErpTesting(true);
    try {
      const [items, custs] = await Promise.all([
        dharaniService.fetchItems(),
        dharaniService.fetchCustomers()
      ]);
      showToast('success', `Master sync complete: ${items.length} items & ${custs.length} customers loaded.`);
    } catch (e) {
      showToast('error', `Master sync failed: ${e.message}`);
    } finally {
      setErpTesting(false);
    }
  };

  const handleSaveErpConfig = () => {
    saveDharaniConfig(erpConfig);
    showToast('success', 'Dharani ERP Configuration saved!');
    setShowErpSettings(false);
  };

  const handleResetErpConfig = () => {
    const def = resetDharaniConfig();
    setErpConfig(def);
    showToast('info', 'ERP configuration reset to defaults.');
  };

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div className="order-manager">

      {/* Toast */}
      {toast && (
        <div className={`om-toast om-toast-${toast.type}`}>
          {toast.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ══════════ LIST VIEW ══════════ */}
      {view === 'list' && (
        <>
          <div className="order-header-bar" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div className="order-toolbar">
                <div className="order-search">
                  <FiSearch className="search-icon" />
                  <input type="text" placeholder="Search by ID, name, or phone..."
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select
                  className="om-erp-filter-dropdown"
                  value={erpFilter}
                  onChange={e => setErpFilter(e.target.value)}
                  title="Filter by Dharani ERP Sync Status"
                >
                  <option value="all">📦 All Orders ({erpCounts.all})</option>
                  <option value="pending">⏳ Pending ERP Sync ({erpCounts.pending})</option>
                  <option value="synced">✓ Synced to ERP ({erpCounts.synced})</option>
                </select>
                <button
                  type="button"
                  className="om-erp-settings-btn"
                  onClick={() => { setErpConfig(getDharaniConfig()); setErpTestResult(null); setShowErpSettings(true); }}
                  title="Configure Dharani ERP Credentials, DB Name, and Server URL"
                >
                  <FiSettings /> Dharani ERP
                </button>
                <button
                  type="button"
                  className="om-erp-sync-btn"
                  onClick={handleBulkSyncToDharani}
                  disabled={isBulkSyncing}
                  title="Push selected or all pending orders to Dharani ERP"
                >
                  <FiUploadCloud className={isBulkSyncing ? 'om-spin' : ''} />
                  {isBulkSyncing ? 'Syncing to ERP...' : `Sync to ERP (${selectedOrderIds.length > 0 ? `${selectedOrderIds.length} Selected` : 'All Pending'})`}
                </button>
                <button type="button" className="ultra-btn outline-btn" onClick={handleExport} style={{ margin: 0, width: 'auto', padding: '0.6rem 1.2rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}><FiDownload /> Export</span>
                </button>
                <button className="om-add-order-btn" onClick={() => setView('add')}>
                  <FiPlus /> Add Order
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: 'rgba(255, 255, 255, 0.6)', padding: '6px', borderRadius: '12px', width: '100%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid rgba(48, 55, 42, 0.12)', backdropFilter: 'blur(10px)' }}>
              <button
                onClick={() => setActiveTab('web')}
                style={{
                  flex: 1, padding: '12px 20px', borderRadius: '8px', border: 'none',
                  background: activeTab === 'web' ? '#B3C58A' : 'transparent',
                  color: activeTab === 'web' ? '#000000' : '#6B7360',
                  fontWeight: activeTab === 'web' ? '700' : '600',
                  boxShadow: activeTab === 'web' ? '0 4px 12px rgba(48, 55, 42, 0.3)' : 'none',
                  cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', fontSize: '15px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', letterSpacing: '0.3px'
                }}
              >
                <FiShoppingCart style={{ fontSize: '18px', opacity: activeTab === 'web' ? 1 : 0.7 }} />
                Web Orders (Customers)
              </button>
              <button
                onClick={() => setActiveTab('store')}
                style={{
                  flex: 1, padding: '12px 20px', borderRadius: '8px', border: 'none',
                  background: activeTab === 'store' ? '#B3C58A' : 'transparent',
                  color: activeTab === 'store' ? '#000000' : '#6B7360',
                  fontWeight: activeTab === 'store' ? '700' : '600',
                  boxShadow: activeTab === 'store' ? '0 4px 12px rgba(48, 55, 42, 0.3)' : 'none',
                  cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', fontSize: '15px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', letterSpacing: '0.3px'
                }}
              >
                <FiUser style={{ fontSize: '18px', opacity: activeTab === 'store' ? 1 : 0.7 }} />
                Store Member Orders
              </button>
            </div>
          </div>

          <div className="order-table-container">
            {isLoading ? (
              <div className="order-loading"><div className="om-spinner" /><span>Loading orders...</span></div>
            ) : (
              <div className="table-responsive">
                <table className="order-table">
                  <thead><tr>
                    <th style={{ width: '38px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedOrderIds.length === filtered.length}
                        onChange={e => {
                          if (e.target.checked) setSelectedOrderIds(filtered.map(o => o.order_id || o.id));
                          else setSelectedOrderIds([]);
                        }}
                        title="Select All Orders for ERP Sync"
                      />
                    </th>
                    <th>Order ID</th><th>Customer</th><th>Date &amp; Time</th>
                    <th>Items</th><th>Total</th><th>Status</th><th>Dharani ERP</th><th>Action</th>
                  </tr></thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan="9" className="empty-state">No orders found.</td></tr>
                    ) : filtered.map((order, idx) => {
                      const oid = order.order_id || order.id;
                      const sync = syncRecords[oid] || getOrderSyncStatus(oid);
                      const isSyncing = erpSyncLoading[oid];
                      const isSelected = selectedOrderIds.includes(oid);
                      return (
                      <tr key={oid || idx} style={{ background: isSelected ? 'rgba(179, 197, 138, 0.15)' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) setSelectedOrderIds(prev => [...prev, oid]);
                              else setSelectedOrderIds(prev => prev.filter(id => id !== oid));
                            }}
                          />
                        </td>
                        <td><strong className="order-id-text">#{order.order_id}</strong></td>
                        <td>
                          <div className="order-table-customer">
                            <strong>{order.customer}</strong>
                            <span className="order-table-mobile"><FiPhone /> {order.mobile}</span>
                          </div>
                        </td>
                        <td>
                          <span className="order-table-date">
                            <FiClock style={{ marginRight: '4px', color: '#000000' }} />
                            {fmtDate(order.created_at)}
                          </span>
                        </td>
                        <td>
                          <div className="order-table-items">
                            <FiBox />
                            {order.items?.length > 0 ? (
                              <span><span style={{ fontWeight: 500, color: '#000000' }}>{order.items[0].product}</span>{order.items.length > 1 ? ` +${order.items.length - 1} more` : ''}</span>
                            ) : <span>No items</span>}
                          </div>
                        </td>
                        <td><strong className="order-table-total">₹{order.total_amount}</strong></td>
                        <td>
                          <select
                            className={`order-status-select badge-${(order.status || 'default').toLowerCase()}`}
                            value={(order.status || 'pending').toLowerCase()}
                            onChange={e => handleStatusChange(order.order_id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          {isSyncing ? (
                            <span className="om-dharani-badge om-badge-loading">
                              <FiRefreshCw className="om-spin" /> Syncing...
                            </span>
                          ) : sync && sync.status === 'OK' ? (
                            <span className="om-dharani-badge om-badge-success" title={`Voucher: #${sync.voucherNo} | Synced at: ${sync.syncedAt || ''}`}>
                              <FiCheck /> Voucher #{sync.voucherNo}
                            </span>
                          ) : sync && sync.status === 'ERROR' ? (
                            <span className="om-dharani-badge om-badge-error" title={sync.error || 'Failed to sync'}>
                              <FiAlertCircle /> Sync Failed
                            </span>
                          ) : (
                            <span className="om-dharani-badge om-badge-pending" title="Not yet pushed to Dharani ERP">
                              <FiClock /> Not Synced
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button className="om-view-btn" onClick={() => openDetail(order)} title="View Details">
                              <FiEye /> View
                            </button>
                            <button
                              className="om-erp-quick-btn"
                              onClick={() => handleSyncSingleOrderToDharani(order)}
                              disabled={isSyncing}
                              title={sync?.status === 'OK' ? `Update in Dharani ERP (Voucher #${sync.voucherNo})` : 'Push to Dharani ERP'}
                            >
                              <FiUploadCloud className={isSyncing ? 'om-spin' : ''} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════ ORDER DETAIL VIEW ══════════ */}
      {view === 'detail' && detailOrder && (
        <div className="od-wrapper">

          {/* Back bar */}
          <div className="od-back-bar">
            <button className="od-back-btn" onClick={() => setView('list')}>
              <FiArrowLeft /> Back to Orders
            </button>
            <div className="od-breadcrumb">
              <span>Orders</span><span className="od-sep">/</span>
              <span className="od-bc-current">Order Details — {detailOrder.order_no || detailOrder.order_id || '—'}</span>
            </div>
          </div>

          {/* Header strip */}
          <div className="od-header-strip">
            <div className="od-header-left">
              <div className="od-header-icon"><FiShoppingCart /></div>
              <div>
                <h1 className="od-title">Order Details</h1>
                <p className="od-subtitle">{detailOrder.order_no || `#${detailOrder.order_id}`}</p>
              </div>
            </div>
            <div className="od-status-wrap" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="om-erp-sync-btn"
                onClick={() => handleSyncSingleOrderToDharani(detailOrder)}
                disabled={erpSyncLoading[detailOrder.order_id || detailOrder.id]}
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}
                title="Push order to Dharani ERP"
              >
                <FiUploadCloud className={erpSyncLoading[detailOrder.order_id || detailOrder.id] ? 'om-spin' : ''} />
                {erpSyncLoading[detailOrder.order_id || detailOrder.id] ? 'Syncing...' : (
                  (syncRecords[detailOrder.order_id || detailOrder.id]?.status === 'OK') ? 'Re-sync with Dharani ERP' : 'Sync to Dharani ERP'
                )}
              </button>
              <span className="od-status-label">Status</span>
              <select
                className={`order-status-select badge-${(detailOrder.status || 'default').toLowerCase()}`}
                value={(detailOrder.status || 'pending').toLowerCase()}
                onChange={e => handleStatusChange(detailOrder.order_id, e.target.value)}
                style={{ fontSize: '0.9rem', padding: '0.5rem 2.2rem 0.5rem 1rem' }}
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* ── PRINT OPTIONS ── */}
          <div className="od-print-section">
            <p className="od-print-label"><FiPrinter /> Print Options</p>
            <div className="od-print-btns">
              <button className="od-print-btn od-office"
                onClick={() => printWindow(buildOfficeCopy(detailOrder, products), 'Office Copy')}>
                <FiPrinter /> Office Copy
              </button>
              <button className="od-print-btn od-customer"
                onClick={() => printWindow(buildCustomerCopy(detailOrder, products), 'Customer Copy')}>
                <FiPrinter /> Customer Copy
              </button>
              <button className="od-print-btn od-delivery"
                onClick={() => printWindow(buildDeliveryNote(detailOrder, products), 'Delivery Note')}>
                <FiPrinter /> Delivery Note
              </button>
              <button className="od-print-btn od-shipping"
                onClick={() => printWindow(buildShippingLabel(detailOrder, products), 'Shipping Label', { isLabel: true })}>
                <FiPrinter /> Shipping Label
              </button>
            </div>
          </div>

          {/* ── ORDER INFO CARDS ── */}
          <div className="od-info-grid">

            {/* Left column */}
            <div className="od-card">
              <div className="od-card-head"><FiFileText /> Order Information</div>
              <div className="od-info-list">
                <div className="od-info-row">
                  <span className="od-info-label">Order Number</span>
                  <span className="od-info-val od-blue">{detailOrder.order_no || `#${detailOrder.order_id}`}</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-label">Invoice Number</span>
                  <span className="od-info-val">{detailOrder.invoice_number || '—'}</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-label">Total Quantity</span>
                  <span className="od-info-val">{(detailOrder.items || []).reduce((s, it) => s + (parseInt(it.quantity) || 0), 0)}</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-label">Order Date</span>
                  <span className="od-info-val">{fmtDate(detailOrder.created_at)}</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-label">Order Type</span>
                  <span className="od-info-val">{detailOrder.order_type || detailOrder.mode_of_communication || '—'}</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-label">Logistics</span>
                  <span className="od-info-val">{detailOrder.logistics || '—'}</span>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="od-card">
              <div className="od-card-head"><FiDollarSign /> Payment Summary</div>
              <div className="od-info-list">
                {(() => {
                  let displayCgst = parseFloat(detailOrder.cgst || 0);
                  let displaySgst = parseFloat(detailOrder.sgst || 0);
                  let displayIgst = parseFloat(detailOrder.igst || 0);
                  let displayTaxTotal = parseFloat(detailOrder.tax_total || detailOrder.tax || detailOrder.gst_amount || 0);
                  let displaySubtotal = parseFloat(detailOrder.sub_total || detailOrder.subtotal || (parseFloat(detailOrder.total_amount || 0) - parseFloat(detailOrder.shipping_charges || 0)));

                  const isStaffOrder = String(detailOrder.customer_role).toLowerCase() === 'staff' || String(detailOrder.customer_role).toLowerCase() === 'store_member';

                  if (isStaffOrder && displayTaxTotal === 0 && detailOrder.items) {
                    let calcTax = 0;
                    let calcCgst = 0;
                    let calcSgst = 0;
                    detailOrder.items.forEach(it => {
                      const qty = parseInt(it.quantity) || 0;
                      const itemTotal = parseFloat(it.total || (parseFloat(it.price || 0) * qty) || 0);
                      let taxPercent = parseFloat(it.tax_percent || 5);
                      const itemTax = itemTotal * (taxPercent / 100);
                      calcTax += itemTax;
                      calcCgst += itemTax / 2;
                      calcSgst += itemTax / 2;
                    });
                    displayCgst = calcCgst;
                    displaySgst = calcSgst;
                    displayTaxTotal = calcTax;
                  }

                  return (
                    <>
                      <div className="od-info-row">
                        <span className="od-info-label">Sub Total</span>
                        <span className="od-info-val od-green">{fmtMoney(displaySubtotal)}</span>
                      </div>
                      <div className="od-info-row">
                        <span className="od-info-label">Shipping Charges</span>
                        <span className="od-info-val od-green">{fmtMoney(detailOrder.shipping_charges)}</span>
                      </div>
                      <div className="od-info-row">
                        <span className="od-info-label">CGST</span>
                        <span className="od-info-val od-green">{fmtMoney(displayCgst)}</span>
                      </div>
                      <div className="od-info-row">
                        <span className="od-info-label">SGST</span>
                        <span className="od-info-val od-green">{fmtMoney(displaySgst)}</span>
                      </div>
                      <div className="od-info-row">
                        <span className="od-info-label">IGST</span>
                        <span className="od-info-val od-green">{fmtMoney(displayIgst)}</span>
                      </div>
                      <div className="od-info-row">
                        <span className="od-info-label">Tax Total</span>
                        <span className="od-info-val od-green">{fmtMoney(displayTaxTotal)}</span>
                      </div>
                      <div className="od-info-row od-grand-row">
                        <span className="od-info-label">Total Amount</span>
                        <span className="od-info-val od-green od-big">{fmtMoney(detailOrder.total_amount)}</span>
                      </div>
                    </>
                  );
                })()}
                <div className="od-info-row">
                  <span className="od-info-label">Payment Method</span>
                  <span className="od-info-val">{detailOrder.payment_method || '—'}</span>
                </div>
                {detailOrder.remarks && (
                  <div className="od-info-row">
                    <span className="od-info-label">Remarks</span>
                    <span className="od-info-val od-remark">{detailOrder.remarks}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer card */}
            <div className="od-card">
              <div className="od-card-head"><FiUser /> Customer Details</div>
              <div className="od-info-list">
                <div className="od-info-row">
                  <span className="od-info-label">Name</span>
                  <span className="od-info-val">{detailOrder.customer || '—'}</span>
                </div>
                <div className="od-info-row">
                  <span className="od-info-label">Mobile</span>
                  <span className="od-info-val">{detailOrder.mobile || '—'}</span>
                </div>
                <div className="od-info-row address-row">
                  <span className="od-info-label">Billing Address</span>
                  <span className="od-info-val">{(detailOrder.billing_address || detailOrder.shipping_address || '—').replace(/,(?=[^\\s])/g, ', ')}</span>
                </div>
                <div className="od-info-row address-row">
                  <span className="od-info-label">Shipping Address</span>
                  <span className="od-info-val">{(detailOrder.shipping_address || detailOrder.billing_address || '—').replace(/,(?=[^\\s])/g, ', ')}</span>
                </div>
              </div>
            </div>

            {/* Dharani ERP Card */}
            <div className="od-card">
              <div className="od-card-head"><FiDatabase /> Dharani ERP Integration</div>
              <div className="od-info-list">
                {(() => {
                  const oid = detailOrder.order_id || detailOrder.id;
                  const sync = syncRecords[oid] || getOrderSyncStatus(oid);
                  const isSyncing = erpSyncLoading[oid];
                  return (
                    <>
                      <div className="od-info-row">
                        <span className="od-info-label">ERP Sync Status</span>
                        <span className="od-info-val">
                          {isSyncing ? (
                            <span className="om-dharani-badge om-badge-loading"><FiRefreshCw className="om-spin" /> Syncing...</span>
                          ) : sync && sync.status === 'OK' ? (
                            <span className="om-dharani-badge om-badge-success"><FiCheck /> Synced (OK)</span>
                          ) : sync && sync.status === 'ERROR' ? (
                            <span className="om-dharani-badge om-badge-error"><FiAlertCircle /> Sync Error</span>
                          ) : (
                            <span className="om-dharani-badge om-badge-pending"><FiClock /> Not Synced</span>
                          )}
                        </span>
                      </div>
                      {sync && sync.voucherNo ? (
                        <div className="od-info-row">
                          <span className="od-info-label">ERP Voucher #</span>
                          <span className="od-info-val od-green" style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                            #{sync.voucherNo}
                          </span>
                        </div>
                      ) : null}
                      {sync && sync.gid ? (
                        <div className="od-info-row">
                          <span className="od-info-label">Transaction GID</span>
                          <span className="od-info-val" style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>
                            {sync.gid}
                          </span>
                        </div>
                      ) : null}
                      {sync && sync.syncedAt ? (
                        <div className="od-info-row">
                          <span className="od-info-label">Last Synced</span>
                          <span className="od-info-val">{fmtDate(sync.syncedAt)}</span>
                        </div>
                      ) : null}
                      {sync && sync.error ? (
                        <div className="od-info-row" style={{ alignItems: 'flex-start' }}>
                          <span className="od-info-label">ERP Error</span>
                          <span className="od-info-val" style={{ color: '#d32f2f', fontSize: '0.85rem' }}>
                            {sync.error}
                          </span>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className="om-erp-quick-btn-block"
                        onClick={() => handleSyncSingleOrderToDharani(detailOrder)}
                        disabled={isSyncing}
                      >
                        <FiUploadCloud className={isSyncing ? 'om-spin' : ''} />
                        {isSyncing ? 'Connecting & Syncing...' : (sync?.status === 'OK' ? 'Re-sync / Update Order in ERP' : 'Push Order to Dharani ERP')}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>

          </div>

          {/* ── ITEMS TABLE ── */}
          <div className="od-card" style={{ marginTop: '1.5rem' }}>
            <div className="od-card-head"><FiPackage /> Order Items
              <span className="od-item-count">{(detailOrder.items || []).length} item{(detailOrder.items || []).length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {(detailOrder.items || []).length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>No items found for this order.</div>
              ) : (
                <div className="table-responsive">
                  <table className="order-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr style={{ background: '#B3C58A', color: '#000000' }}>
                        <th style={{ padding: '12px', border: '1px solid rgba(48, 55, 42, 0.12)', color: '#000000', textAlign: 'center' }}>S. No</th>
                        <th style={{ padding: '12px', border: '1px solid rgba(48, 55, 42, 0.12)', color: '#000000', textAlign: 'center' }}>SKUID</th>
                        <th style={{ padding: '12px', border: '1px solid rgba(48, 55, 42, 0.12)', color: '#000000', textAlign: 'left' }}>Products</th>
                        <th style={{ padding: '12px', border: '1px solid rgba(48, 55, 42, 0.12)', color: '#000000', textAlign: 'center' }}>Quantity</th>
                        <th style={{ padding: '12px', border: '1px solid rgba(48, 55, 42, 0.12)', color: '#000000', textAlign: 'center' }}>MRP</th>
                        <th style={{ padding: '12px', border: '1px solid rgba(48, 55, 42, 0.12)', color: '#000000', textAlign: 'center' }}>Rate</th>
                        <th style={{ padding: '12px', border: '1px solid rgba(48, 55, 42, 0.12)', color: '#000000', textAlign: 'center' }}>Tax</th>
                        <th style={{ padding: '12px', border: '1px solid rgba(48, 55, 42, 0.12)', color: '#000000', textAlign: 'center' }}>Total</th>
                        <th style={{ padding: '12px', border: '1px solid rgba(48, 55, 42, 0.12)', color: '#000000', textAlign: 'center' }}>Wt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailOrder.items || []).map((it, i) => {
                        const matched = products.find(p => p.name === it.product || String(p.id) === String(it.product_id)) || {};
                        const displaySku = it.product_code || matched.product_code || it.sku || matched.sku || it.product_id || matched.id || '—';

                        const getValidWeight = (...vals) => {
                          for (let v of vals) {
                            if (v && v !== '0' && parseFloat(v) !== 0) return v;
                          }
                          return '';
                        };
                        let unitWeight = getValidWeight(it.weight_volume, matched.weight_volume, it.weight, matched.weight, it.variation_name);
                        let calcWeightStr = unitWeight || '—';
                        if (unitWeight && unitWeight !== '0') {
                          const num = parseFloat(unitWeight);
                          if (!isNaN(num) && num > 0) {
                            const weightVal = num * (parseInt(it.quantity) || 1);
                            calcWeightStr = weightVal.toFixed(3) + (unitWeight.toString().replace(/^[0-9.\s]+/, '').trim() || 'kg');
                          }
                        }

                        const qty = parseInt(it.quantity) || 0;
                        let mrp = parseFloat(it.mrp) || 0;
                        if (!mrp) {
                          if (parseFloat(it.price) > parseFloat(matched.mrp)) mrp = parseFloat(it.price);
                          else if (it.variation_name || it.variation_id) mrp = parseFloat(it.price);
                          else mrp = parseFloat(matched.mrp) || parseFloat(it.price) || 0;
                        }
                        const itemTotalWithTax = parseFloat(it.total || (parseFloat(it.price || 0) * qty) || 0);

                        let taxPercent = 5;
                        if (it.tax_percent) {
                          taxPercent = parseFloat(it.tax_percent);
                        } else if (it.cgst_percent && it.sgst_percent) {
                          taxPercent = parseFloat(it.cgst_percent) + parseFloat(it.sgst_percent);
                        } else if (it.igst_percent) {
                          taxPercent = parseFloat(it.igst_percent);
                        }

                        let rateExcludingTax = (itemTotalWithTax / qty) / (1 + (taxPercent / 100));

                        return (
                          <tr key={i}>
                            <td style={{ border: '1px solid rgba(48, 55, 42, 0.12)', padding: '12px', textAlign: 'center', color: '#000000' }}>{i + 1}</td>
                            <td style={{ border: '1px solid rgba(48, 55, 42, 0.12)', padding: '12px', textAlign: 'center', color: '#000000' }}>{displaySku}</td>
                            <td style={{ border: '1px solid rgba(48, 55, 42, 0.12)', padding: '12px', color: '#000000' }}>{it.product || '—'}</td>
                            <td style={{ border: '1px solid rgba(48, 55, 42, 0.12)', padding: '12px', textAlign: 'center', color: '#000000' }}>{qty}</td>
                            <td style={{ border: '1px solid rgba(48, 55, 42, 0.12)', padding: '12px', textAlign: 'center', color: '#000000' }}>{mrp > 0 ? `₹${mrp.toFixed(2)}` : '—'}</td>
                            <td style={{ border: '1px solid rgba(48, 55, 42, 0.12)', padding: '12px', textAlign: 'center', color: '#000000' }}>₹{rateExcludingTax.toFixed(2)}</td>
                            <td style={{ border: '1px solid rgba(48, 55, 42, 0.12)', padding: '12px', textAlign: 'center', color: '#000000' }}>{taxPercent}%</td>
                            <td style={{ border: '1px solid rgba(48, 55, 42, 0.12)', padding: '12px', textAlign: 'center', color: '#000000' }}>₹{itemTotalWithTax.toFixed(2)}</td>
                            <td style={{ border: '1px solid rgba(48, 55, 42, 0.12)', padding: '12px', textAlign: 'center', color: '#000000' }}>{calcWeightStr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ══════════ ADD ORDER FORM ══════════ */}
      {view === 'add' && (
        <div className="oe-wrapper">
          <div className="oe-top-bar">
            <div className="oe-top-left">
              <div className="oe-icon-badge"><FiShoppingCart /></div>
              <div>
                <h1 className="oe-main-title">New Order Entry</h1>
                <p className="oe-main-sub">Fill in all details to create a new order</p>
              </div>
            </div>
            <button className="oe-close-btn" onClick={resetForm} title="Cancel"><FiX /></button>
          </div>

          {/* Customer Details Section */}
          <div className="oe-section">
            <div className="oe-section-heading">
              <div className="oe-section-icon icon-blue"><FiUser /></div><span>Customer Details</span>
            </div>
            <div className="oe-grid oe-grid-4">
              <div className="oe-field">
                <label className="oe-label"><FiHash className="oe-label-icon" />Order No</label>
                <input className="oe-input oe-readonly" value={form.orderNo} readOnly />
              </div>
              <div className="oe-field">
                <label className="oe-label"><FiFileText className="oe-label-icon" />Invoice Number</label>
                <input className="oe-input oe-readonly" value={form.invoiceNo} readOnly />
              </div>
              <div className="oe-field">
                <label className="oe-label"><FiUser className="oe-label-icon" />Customer Name <span className="oe-req">*</span></label>
                <SearchableSelect
                  className="oe-select"
                  value={form.customerId}
                  onChange={val => handleCustomerChange(val)}
                  placeholder="- Select Customer -"
                  options={customers.map(c => ({ value: c.id, label: custName(c) }))}
                />
              </div>
              <div className="oe-field">
                <label className="oe-label"><FiMapPin className="oe-label-icon" />Billing Address</label>
                <textarea className="oe-textarea" value={form.billingAddr} onChange={e => setField('billingAddr', e.target.value)} placeholder="Type billing address..." disabled={!form.customerId} />
              </div>
            </div>
            <div className="oe-grid oe-grid-4" style={{ marginTop: '1rem' }}>
              <div className="oe-field">
                <label className="oe-label"><FiMapPin className="oe-label-icon" />Shipping Address</label>
                <textarea className="oe-textarea" value={form.shippingAddr} onChange={e => setField('shippingAddr', e.target.value)} placeholder="Shipping address using billing" disabled={!form.customerId} />
              </div>
              <div className="oe-field">
                <label className="oe-label"><FiMessageSquare className="oe-label-icon" />Mode of Communication</label>
                <SearchableSelect
                  className="oe-select"
                  value={form.communication}
                  onChange={val => setField('communication', val)}
                  placeholder="— Select —"
                  options={COMMUNICATION_OPTIONS}
                />
              </div>
              <div className="oe-field">
                <label className="oe-label"><FiTruck className="oe-label-icon" />Logistics</label>
                <SearchableSelect
                  className="oe-select"
                  value={form.logistics}
                  onChange={val => setField('logistics', val)}
                  placeholder="— Select —"
                  options={LOGISTICS_OPTIONS}
                />
              </div>
              <div className="oe-field">
                <label className="oe-label"><FiFileText className="oe-label-icon" />Remarks</label>
                <input className="oe-input" placeholder="Optional notes..." value={form.remarks} onChange={e => setField('remarks', e.target.value)} />
              </div>
            </div>
            <div className="oe-grid oe-grid-4" style={{ marginTop: '1rem' }}>
              <div className="oe-field">
                <label className="oe-label"><FiCreditCard className="oe-label-icon" />Payment Method</label>
                <SearchableSelect
                  className="oe-select"
                  value={form.paymentMethod}
                  onChange={val => setField('paymentMethod', val)}
                  placeholder="— Select —"
                  options={PAYMENT_METHOD_OPTIONS}
                />
              </div>

              <div className="oe-field">
                <label className="oe-label"><FiTag className="oe-label-icon" />Price Category</label>
                <SearchableSelect
                  className="oe-select"
                  value={form.priceCategory}
                  onChange={val => setField('priceCategory', val)}
                  placeholder="— Select Category —"
                  options={PRICE_CATEGORY_OPTIONS}
                />
              </div>

              <div className="oe-field">
                <label className="oe-label"><FiDollarSign className="oe-label-icon" />Total Value (₹)</label>
                <input className="oe-input oe-readonly oe-total-display" value={`₹ ${grandTotal.toFixed(2)}`} readOnly />
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="oe-section">
            <div className="om-scanner-box">
              <div className="om-scanner-info">
                <div className="om-scanner-icon">
                  <FiTag size={18} />
                </div>
                <div>
                  <span className="om-scanner-title">QR / Barcode Quick Scanner</span>
                  <span className="om-scanner-sub">Scan physical product barcode or enter code to auto-add or update quantity</span>
                </div>
              </div>

              <div className="om-scanner-controls">
                <div className="om-scanner-input-wrap">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    className="oe-input om-scanner-input"
                    placeholder="Scan QR/Barcode or enter code & press Enter..."
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBarcodeScan();
                      }
                    }}
                  />
                  {barcodeInput && (
                    <button
                      type="button"
                      onClick={() => setBarcodeInput('')}
                      className="om-scanner-clear-btn"
                    >
                      <FiX size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="om-add-order-btn om-scanner-action-btn"
                  onClick={() => handleBarcodeScan()}
                  disabled={isScanningBarcode}
                >
                  {isScanningBarcode ? 'Scanning...' : 'Scan / Add'}
                </button>
              </div>
            </div>

            <div className="oe-section-heading">
              <div className="oe-section-icon icon-green"><FiPackage /></div>
              <span>Products</span>
              <div className="oe-prod-summary">{rows.length} item{rows.length !== 1 ? 's' : ''} · Subtotal: ₹{subTotal.toFixed(2)}</div>
            </div>
            <div className="oe-prod-table-head">
              <div></div>
              <div className="oe-ph-name">Product Name</div>
              <div className="oe-ph-sku">SKU</div>
              <div className="oe-ph-qty">Qty</div>
              <div className="oe-ph-price">Unit Price (₹)</div>
              <div className="oe-ph-total">Row Total (₹)</div>
              <div className="oe-ph-del"></div>
            </div>
            <div className="oe-rows">
              {rows.map((row, idx) => (
                <div className="oe-prod-row" key={row.id} onKeyDown={(e) => {
                  if (e.key === 'Enter' && idx === rows.length - 1 && row.product) {
                    e.preventDefault();
                    addRow();
                  }
                }}>
                  <div className="oe-row-num">{idx + 1}</div>
                  <div className="oe-field oe-col-name">
                    <SearchableSelect
                      className="oe-select"
                      value={row.product}
                      onChange={val => handleProductChange(row.id, val)}
                      placeholder="- Select Product -"
                      options={products.map(p => {
                        const hasVariations = hasVariationsMap[p.id] || p.is_variable === true || p.is_variable === 'true' || p.is_variable === 1 || p.is_variable === '1';
                        const w = p.weight_volume || p.weight;
                        const weightStr = (!hasVariations && w && w !== '0') ? ` - ${w}` : '';
                        return { value: p.id, label: `${p.name}${weightStr}${p.product_code ? ` (${p.product_code})` : ''}` };
                      })}
                    />
                    {row.variations && row.variations.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', background: '#F5F7EC', padding: '4px', borderRadius: '8px', border: '1px solid rgba(48, 55, 42, 0.12)', width: 'fit-content', maxWidth: '100%' }}>
                        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                          {row.variations.map(v => {
                            const isSelected = String(row.variationId) === String(v.id);
                            return (
                              <div
                                key={v.id}
                                onClick={() => handleVariationChange(row.id, v.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  fontWeight: isSelected ? '700' : '600',
                                  color: isSelected ? '#B3C58A' : '#6B7360',
                                  background: isSelected ? '#ffffff' : 'transparent',
                                  border: `1px solid ${isSelected ? 'rgba(48, 55, 42, 0.12)' : 'transparent'}`,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                  whiteSpace: 'nowrap'
                                }}
                                title={`₹${parseFloat(v.customer_price || v.mrp).toFixed(2)}`}
                              >
                                {v.variation_name}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="oe-field oe-col-sku">
                    <input className="oe-input oe-readonly" placeholder="SKU" value={row.sku} readOnly />
                  </div>
                  <div className="oe-field oe-col-qty">
                    <input type="number" className="oe-input" min="1" value={row.qty} onChange={e => changeRow(row.id, 'qty', e.target.value)} />
                  </div>
                  <div className="oe-field oe-col-price">
                    <input type="number" className="oe-input" min="0" step="0.01" value={row.price} onChange={e => changeRow(row.id, 'price', e.target.value)} />
                  </div>
                  <div className="oe-field oe-col-total">
                    <input className="oe-input oe-readonly oe-row-total" value={`₹ ${(row.total || 0).toFixed(2)}`} readOnly />
                  </div>
                  <button className="oe-del-row-btn" onClick={() => removeRow(row.id)} title="Remove"><FiTrash2 /></button>
                </div>
              ))}
            </div>

            {/* Product Addition Action Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1.2rem' }}>
              <button type="button" className="om-add-order-btn" onClick={addRow} style={{ padding: '0.6rem 1.4rem', margin: 0, fontSize: '0.9rem' }}>
                <FiPlus /> Add Product
              </button>
            </div>
          </div>

          {/* Summary - Only show if products exist */}
          {rows.some(r => r.product && r.total > 0) && (
            <div style={{
              marginTop: '2rem', padding: '1.5rem 2rem', background: 'linear-gradient(135deg, #F5F7EC 0%, #F5F7EC 100%)',
              borderRadius: '16px', border: '1px solid rgba(48, 55, 42, 0.12)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'rgba(48, 55, 42, 0.1)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                  <FiPackage size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#000000', fontWeight: '700' }}>Order Summary</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#000000' }}>{rows.filter(r => r.product).length} item(s) in cart</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: '600' }}>Subtotal</div>
                  <div style={{ fontSize: '18px', color: '#000000', fontWeight: '700' }}>₹{subTotal.toFixed(2)}</div>
                </div>
                <div style={{ width: '1px', height: '40px', background: 'rgba(48, 55, 42, 0.18)' }}></div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: '700' }}>Grand Total</div>
                  <div style={{ fontSize: '26px', color: '#000000', fontWeight: '900', letterSpacing: '-0.5px' }}>₹{grandTotal.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="oe-footer">
            <button className="oe-cancel-btn" onClick={resetForm} disabled={savingOrder}><FiX /> Cancel</button>
            <button className="oe-save-btn" onClick={saveOrder} disabled={savingOrder}>
              {savingOrder ? <><div className="oe-btn-spinner" /> Saving…</> : <><FiSave /> Save Order</>}
            </button>
          </div>
        </div>
      )}

      {/* ══════════ DHARANI ERP SETTINGS MODAL ══════════ */}
      {showErpSettings && (
        <div className="om-modal-backdrop" onClick={() => setShowErpSettings(false)}>
          <div className="om-modal-content" onClick={e => e.stopPropagation()}>
            <div className="om-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FiDatabase style={{ fontSize: '1.3rem', color: '#30372A' }} />
                <h3>Dharani ERP API Configuration</h3>
              </div>
              <button className="om-modal-close" onClick={() => setShowErpSettings(false)}>
                <FiX />
              </button>
            </div>

            <div className="om-modal-body">
              {erpTestResult && (
                <div className={`om-modal-alert ${erpTestResult.success ? 'om-alert-success' : 'om-alert-error'}`}>
                  <strong>{erpTestResult.success ? '✓ Connected!' : '⚠ Connection Failed:'}</strong> {erpTestResult.message}
                </div>
              )}

              <div className="om-form-group">
                <label>API Base URL</label>
                <input
                  type="text"
                  value={erpConfig.baseUrl}
                  onChange={e => setErpConfig({ ...erpConfig, baseUrl: e.target.value })}
                  placeholder="/dharani-api or http://..."
                />
                <span className="om-form-help">Use <code>/dharani-api</code> for Vite proxy, or provide direct server URL / IP.</span>
              </div>

              <div className="om-form-group">
                <label>Database Name (DB_NAME Header)</label>
                <input
                  type="text"
                  value={erpConfig.dbName}
                  onChange={e => setErpConfig({ ...erpConfig, dbName: e.target.value })}
                  placeholder="TRIAL_DHARANI_2526_INV"
                />
                <span className="om-form-help">Matches DB_NAME in ERP (e.g. TRIAL_DHARANI_2526_INV)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="om-form-group">
                  <label>Login Name</label>
                  <input
                    type="text"
                    value={erpConfig.loginName}
                    onChange={e => setErpConfig({ ...erpConfig, loginName: e.target.value })}
                    placeholder="dh_user_09"
                  />
                </div>
                <div className="om-form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={erpConfig.password}
                    onChange={e => setErpConfig({ ...erpConfig, password: e.target.value })}
                    placeholder="$Ki45yu"
                  />
                </div>
              </div>

              <div className="om-form-group">
                <label>Portal Identifier</label>
                <input
                  type="text"
                  value={erpConfig.portal}
                  onChange={e => setErpConfig({ ...erpConfig, portal: e.target.value })}
                  placeholder="VEDAI"
                />
                <span className="om-form-help">Must be one of: VEDAI, MADAN, or AMAZON</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <button
                  type="button"
                  className="om-erp-settings-btn"
                  onClick={handleTestErpConnection}
                  disabled={erpTesting}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <FiRefreshCw className={erpTesting ? 'om-spin' : ''} />
                  {erpTesting ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  type="button"
                  className="om-erp-settings-btn"
                  onClick={handleSyncMasterData}
                  disabled={erpTesting}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <FiDownload /> Sync Masters
                </button>
              </div>
            </div>

            <div className="om-modal-footer">
              <button
                type="button"
                className="om-modal-close"
                onClick={handleResetErpConfig}
                style={{ fontSize: '0.85rem', color: '#888' }}
              >
                Reset Defaults
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="ultra-btn outline-btn"
                  onClick={() => setShowErpSettings(false)}
                  style={{ margin: 0, padding: '0.5rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="om-erp-sync-btn"
                  onClick={handleSaveErpConfig}
                  style={{ padding: '0.5rem 1.2rem' }}
                >
                  <FiSave /> Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
