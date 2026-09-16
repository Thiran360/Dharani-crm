import { getDharaniConfig } from '../config/dharaniConfig';

const TOKEN_KEY = 'dharani_auth_token';
const TOKEN_EXPIRY_KEY = 'dharani_token_expiry';
const SYNC_RECORDS_KEY = 'dharani_synced_records';
const CACHE_ITEMS_KEY = 'dharani_cached_items';
const CACHE_CUSTOMERS_KEY = 'dharani_cached_customers';

// Simple UUID v4 generator
export const generateGuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
};

// Generates stable pseudo-UUID for an order ID
export const getStableGuidForOrder = (orderId) => {
  const records = getSyncedRecords();
  if (records[orderId] && records[orderId].gid) {
    return records[orderId].gid;
  }
  // Create deterministic hex string from orderId
  const idStr = String(orderId).padStart(12, '0');
  const guid = `00000000-0000-4000-8000-${idStr.slice(-12).toUpperCase()}`;
  return guid;
};

// Local storage helpers for sync tracking
export const getSyncedRecords = () => {
  try {
    const data = localStorage.getItem(SYNC_RECORDS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export const saveSyncedRecord = (orderId, record) => {
  try {
    const current = getSyncedRecords();
    current[orderId] = {
      ...current[orderId],
      ...record,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(SYNC_RECORDS_KEY, JSON.stringify(current));
    return current[orderId];
  } catch (e) {
    console.error('Failed to save sync record', e);
  }
};

export const getOrderSyncStatus = (orderId) => {
  const records = getSyncedRecords();
  return records[orderId] || null;
};

// Master cache helpers
export const getCachedItems = () => {
  try {
    const data = localStorage.getItem(CACHE_ITEMS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const getCachedCustomers = () => {
  try {
    const data = localStorage.getItem(CACHE_CUSTOMERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * Dharani API Service
 */
class DharaniService {
  /**
   * Authenticate with Dharani ERP
   */
  async login(force = false) {
    const config = getDharaniConfig();
    const cachedToken = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    // Return cached token if valid and not forcing refresh (cached for 12 hours)
    if (!force && cachedToken && expiry && Date.now() < parseInt(expiry, 10)) {
      return { token: cachedToken, isSuccess: true };
    }

    const loginUrl = `${config.baseUrl}/api/Users/login`;
    const payload = {
      LoginName: config.loginName,
      Password: config.password
    };

    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DB_NAME': config.dbName
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errText = `HTTP Error ${response.status}`;
        try {
          const errData = await response.json();
          errText = errData.ErrMsg || errData.message || errText;
        } catch {
          errText = await response.text();
        }
        throw new Error(errText || 'Login failed');
      }

      const data = await response.json();

      if (data.IsSuccess && data.Token) {
        // Cache token for 12 hours
        localStorage.setItem(TOKEN_KEY, data.Token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 12 * 60 * 60 * 1000));
        localStorage.setItem('dharani_user_info', JSON.stringify({
          UserID: data.UserID,
          UserName: data.UserName,
          LoginName: data.LoginName
        }));

        return { token: data.Token, isSuccess: true, data };
      } else {
        throw new Error(data.ErrMsg || 'Dharani ERP login failed without error details');
      }
    } catch (error) {
      console.error('Dharani login error:', error);
      throw error;
    }
  }

  /**
   * Helper to get request headers with Bearer Token
   */
  async getAuthHeaders() {
    const config = getDharaniConfig();
    const { token } = await this.login();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'DB_NAME': config.dbName
    };
  }

  /**
   * Download Master Customers
   */
  async fetchCustomers() {
    const config = getDharaniConfig();
    const headers = await this.getAuthHeaders();
    const url = `${config.baseUrl}/api/DharaniData/getcustomers`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch customers: HTTP ${res.status}`);
    }
    const data = await res.json();
    const customers = data.Customers || (Array.isArray(data) ? data : []);
    localStorage.setItem(CACHE_CUSTOMERS_KEY, JSON.stringify(customers));
    return customers;
  }

  /**
   * Download Master Items
   */
  async fetchItems() {
    const config = getDharaniConfig();
    const headers = await this.getAuthHeaders();
    const url = `${config.baseUrl}/api/DharaniData/getitems`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch items: HTTP ${res.status}`);
    }
    const data = await res.json();
    const items = data.Items || (Array.isArray(data) ? data : []);
    localStorage.setItem(CACHE_ITEMS_KEY, JSON.stringify(items));
    return items;
  }

  /**
   * Transform a CRM Order into the Dharani importorder JSON payload format
   */
  transformOrder(crmOrder, itemMaster = [], customerMaster = []) {
    const config = getDharaniConfig();
    const orderId = crmOrder.id || crmOrder.order_id;
    const gid = getStableGuidForOrder(orderId);

    // Format date YYYY-MM-DD
    let orderDate = '';
    if (crmOrder.created_at || crmOrder.date) {
      const rawDate = crmOrder.created_at || crmOrder.date;
      orderDate = String(rawDate).slice(0, 10);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) {
      orderDate = new Date().toISOString().slice(0, 10);
    }

    // Customer resolution
    const customerName = (
      crmOrder.customer ||
      (crmOrder.address && crmOrder.address.full_name) ||
      crmOrder.customer_name ||
      'Customer'
    ).trim();

    let matchedCustomer = null;
    if (customerMaster && customerMaster.length > 0) {
      matchedCustomer = customerMaster.find(c =>
        c.CustomerName && c.CustomerName.toLowerCase() === customerName.toLowerCase()
      );
    }

    const customerId = matchedCustomer
      ? parseInt(matchedCustomer.CustomerSystemID, 10)
      : (crmOrder.customer_id ? parseInt(crmOrder.customer_id, 10) : 0);

    // Address resolution
    const addr = crmOrder.address || {};
    const streetAddress = (addr.address || crmOrder.shipping_address || crmOrder.billing_address || '').trim();
    const city = (addr.city || 'Coimbatore').trim();
    const state = (addr.state || 'Tamil Nadu').trim();
    const pincode = (addr.pincode || addr.zip || '641001').trim();
    const phone = (addr.phone || crmOrder.mobile || '9999999999').trim();
    const email = (crmOrder.email || (matchedCustomer && matchedCustomer.CustEmail) || '').trim();
    const gstin = (crmOrder.gstin || (matchedCustomer && matchedCustomer.CustGSTIN) || '').trim();

    // Type of customer
    const isB2B = Boolean(
      gstin ||
      (crmOrder.customer_role && ['staff', 'b2b', 'store_member'].includes(crmOrder.customer_role.toLowerCase()))
    );
    const typeOfCustomer = isB2B ? 'B2B' : 'B2C';

    // Items mapping
    const rawItems = crmOrder.items || [];
    let calculatedTotal = 0;

    const items = rawItems.map(item => {
      const itemName = (item.product || item.product_name || item.name || '').trim();

      // Find matching item in Dharani Master
      let masterItem = null;
      if (itemMaster && itemMaster.length > 0) {
        masterItem = itemMaster.find(m =>
          m.ItemName && m.ItemName.toLowerCase() === itemName.toLowerCase()
        );
      }

      const itemId = masterItem
        ? parseInt(masterItem.ItemSystemID, 10)
        : (item.product_id || item.variation_id || 0);

      const uom = masterItem && masterItem.ItemUOM
        ? masterItem.ItemUOM
        : (item.uom || 'PCS');

      const quantity = parseFloat(item.quantity || 1);
      const unitPrice = parseFloat(item.price || 0);
      const lineAmount = parseFloat((quantity * unitPrice).toFixed(2));
      calculatedTotal += lineAmount;

      return {
        ItemID: itemId,
        ItemName: masterItem ? masterItem.ItemName : itemName,
        ItemDescription: item.variation_name || item.description || itemName,
        Quantity: quantity,
        UOM: uom,
        UnitPrice: unitPrice,
        Amount: lineAmount
      };
    });

    // Dharani import API requires TotalAmount to equal the sum of item Amounts
    const totalAmount = parseFloat(calculatedTotal.toFixed(2));

    return {
      ID: 0,
      GID: gid,
      OrderNo: `ORD-${orderId}`,
      OrderDate: orderDate,
      CustomerID: customerId || null,
      CustomerName: customerName,
      CustBillAddress1: streetAddress.slice(0, 120),
      CustBillAddress2: '',
      CustBillAddress3: '',
      CustBillCity: city.slice(0, 120),
      CustBillState: state.slice(0, 50),
      CustBillCountry: 'India',
      CustBillPinCode: pincode.slice(0, 25),
      CustBillGSTIN: gstin.slice(0, 20),
      CustBillPhone: phone.slice(0, 50),
      CustBillEmail: email.slice(0, 50),
      CustShipAddress1: streetAddress.slice(0, 120),
      CustShipAddress2: '',
      CustShipAddress3: '',
      CustShipCity: city.slice(0, 120),
      CustShipState: state.slice(0, 50),
      CustShipCountry: 'India',
      CustShipPinCode: pincode.slice(0, 25),
      CustShipGSTIN: gstin.slice(0, 20),
      CustShipPhone: phone.slice(0, 50),
      CustShipEmail: email.slice(0, 50),
      Remarks: (crmOrder.remarks || 'Web Sales Order from CRM').slice(0, 200),
      TotalAmount: totalAmount,
      TypeOfCustomer: typeOfCustomer,
      Portal: config.portal || 'VEDAI',
      Items: items
    };
  }

  /**
   * Import Orders into Dharani ERP (POST /api/DharaniOrder/importorder)
   * Accepts an array of CRM orders or transformed Dharani order payloads
   */
  async importOrders(orders, onProgress = null) {
    const config = getDharaniConfig();
    const headers = await this.getAuthHeaders();
    const url = `${config.baseUrl}/api/DharaniOrder/importorder`;

    // Load cached masters if available
    const itemMaster = getCachedItems();
    const customerMaster = getCachedCustomers();

    // Transform if CRM orders passed
    const payloads = orders.map(order => {
      // Check if already transformed
      if (order.GID && order.OrderNo && Array.isArray(order.Items)) {
        return order;
      }
      return this.transformOrder(order, itemMaster, customerMaster);
    });

    if (payloads.length === 0) {
      throw new Error('No orders provided for import');
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloads)
      });

      if (!response.ok) {
        let errDesc = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errDesc = errData.ErrMsg || errData.message || JSON.stringify(errData);
        } catch {
          errDesc = await response.text();
        }
        throw new Error(errDesc || 'Import failed at Dharani ERP');
      }

      // Response is an array: [{ VoucherNo, GID, OrderNo, Status, ErrMsg }]
      const results = await response.json();

      // Update sync records in localStorage for each order
      results.forEach((res, idx) => {
        const orderId = orders[idx] ? (orders[idx].id || orders[idx].order_id) : null;
        if (orderId) {
          saveSyncedRecord(orderId, {
            status: res.Status,
            voucherNo: res.VoucherNo,
            error: res.ErrMsg,
            gid: res.GID,
            orderNo: res.OrderNo,
            syncedAt: new Date().toISOString()
          });
        }
      });

      return results;
    } catch (error) {
      console.error('Dharani order import error:', error);
      throw error;
    }
  }

  /**
   * Quick test connection to Dharani ERP
   */
  async testConnection() {
    try {
      const loginRes = await this.login(true);
      return {
        success: true,
        message: 'Successfully authenticated with Dharani ERP API!',
        data: loginRes
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Connection failed'
      };
    }
  }
}

export const dharaniService = new DharaniService();
export default dharaniService;
