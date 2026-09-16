import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiEdit2, FiTrash2, FiPlus, FiImage, FiX, FiSearch, FiDownload, FiPackage } from 'react-icons/fi';
import './ProductManager.css';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { API_BASE, API_HEADERS } from '../config/api';

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Most Loved Data
  const [mostLovedData, setMostLovedData] = useState([]);

  // Variations State
  const [isVariable, setIsVariable] = useState(false);
  const [variations, setVariations] = useState([]);

  const blankVariation = () => ({
    id: 'new_' + Date.now() + Math.random(),
    attribute_value: '',
    sku: '',
    mrp: '',
    reseller_price: '',
    retailer_price: '',
    distributor_price: '',
    sarvo_price: '',
    customer_price: '',
    store_price: '',
    barcode: '',
    discount: '0',
    stock: '0',
    drug_price: '',
    weight_volume: ''
  });

  const handleAddVariation = () => setVariations(prev => [...prev, blankVariation()]);
  const handleRemoveVariation = async (id) => {
    if (typeof id === 'number') {
      if (!window.confirm("Are you sure you want to delete this variation?")) return;
      try {
        const response = await fetch(`${API_BASE}/product-variation/${id}/`, {
          method: 'DELETE',
          headers: API_HEADERS
        });
        if (response.ok) {
          setVariations(prev => prev.filter(v => v.id !== id));
        } else {
          alert("Failed to delete variation.");
        }
      } catch (err) {
        console.error("Error deleting variation", err);
        alert("Network error while deleting variation.");
      }
    } else {
      setVariations(prev => prev.filter(v => v.id !== id));
    }
  };
  const handleVariationChange = (id, field, value) => setVariations(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));


  const handleToggleVariable = (e) => {
    const checked = e.target.checked;
    setIsVariable(checked);
    if (checked && variations.length === 0) {
      setVariations([{
        ...blankVariation(),
        attribute_value: formData.weight_volume || '',
        sku: formData.product_code || '',
        mrp: formData.mrp || '',
        reseller_price: formData.reseller_price || '',
        retailer_price: formData.retailer_price || '',
        distributor_price: formData.distributor_price || '',
        sarvo_price: formData.sarvo_price || '',
        customer_price: formData.customer_price || '',
        store_price: formData.store_price || '',
        barcode: formData.barcode || '',
        discount: formData.discount || '0',
        stock: formData.stock || '0',
        drug_price: formData.drug_price || '',
        weight_volume: formData.weight_volume || '',
      }]);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    product_code: '',
    discount: '0',
    weight_volume: '0',
    category: '',
    brand: '',
    unit: '',
    stock: '0',
    gst_percentage: '0',
    tamil_name: '',
    product_type: '',
    mrp: '0',
    customer_price: '0',
    reseller_price: '0',
    retailer_price: '0',
    distributor_price: '0',
    sarvo_price: '0',
    drug_price: '0',
    barcode: '',
    is_new: false,
    description: '',
    key_points: '',
    store_price: '0',
    purchase_price: '0',
    reorder_level: '0',
    batch_number: '',
    manufacturer: '',
    expiry_date: '',
    is_active: true,
    is_public: true
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [newKeyPoint, setNewKeyPoint] = useState('');
  const [editingKeyPointId, setEditingKeyPointId] = useState(null);
  const [existingGalleryImages, setExistingGalleryImages] = useState([]);
  const [newGalleryImages, setNewGalleryImages] = useState([]);

  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const res = await fetch(`${API_BASE}/brands/`, {
        headers: API_HEADERS
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setBrands(Array.isArray(data) ? data : data.results || data.data || data.brands || Object.values(data).find(Array.isArray) || []);
      } catch (e) { }
    } catch (err) {
      console.error("Error fetching brands", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories/`, {
        headers: API_HEADERS
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setCategories(Array.isArray(data) ? data : data.results || data.data || data.categories || Object.values(data).find(Array.isArray) || []);
      } catch (e) { }
    } catch (err) {
      console.error("Error fetching categories", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const userStr = localStorage.getItem('user');
      let userId = '';
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          userId = userObj.id || userObj.user_id || userObj.staff_id || '';
        } catch (e) { }
      }
      const fetchUrl = `${API_BASE}/products/?role=admin`;
      const res = await fetch(fetchUrl, {
        headers: API_HEADERS
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('JSON Parse Error:', e);
        setIsLoading(false);
        return;
      }

      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data && typeof data === 'object') {
        items = data.results || data.data || data.products || Object.values(data).find(Array.isArray) || [];
      }

      // Fetch most loved to set is_featured status
      try {
        const mlRes = await fetch(`${API_BASE}/crm/most-loved/`, {
          headers: API_HEADERS
        });
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          setMostLovedData(mlData);
          const activeMlIds = mlData.filter(item => item.is_active).map(item => item.product_id);
          items = items.map(p => ({
            ...p,
            is_featured: activeMlIds.includes(p.id)
          }));
        }
      } catch (err) {
        console.error("Error fetching most loved products", err);
      }

      setProducts(items);
    } catch (err) {
      console.error("Error fetching products", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(prod => {
    const search = searchTerm.toLowerCase();
    const name = (prod.name || prod.title || '').toLowerCase();
    const desc = (prod.description || '').toLowerCase();
    return name.includes(search) || desc.includes(search);
  });

  const openModal = async (product = null) => {
    setStatus({ type: '', message: '' });
    if (product) {
      setEditingId(product.id);
      setIsVariable(product.is_variable === true);

      let userId = '';
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          userId = String(userObj.id || userObj.user_id || userObj.staff_id || '');
        } catch (e) { }
      }

      let customerPrice = product.price;
      try {
        const prodRes = await fetch(`${API_BASE}/products/${product.id}/?role=admin`, {
          headers: API_HEADERS
        });
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          product = { ...product, ...prodData };
          if (prodData.customer_price !== undefined) {
            customerPrice = prodData.customer_price;
          } else if (prodData.price) {
            customerPrice = prodData.price;
          }
        }
      } catch (e) {
        console.error("Failed to fetch individual product details:", e);
      }

      let fetchedKeyPoints = product.key_points || '';
      try {
        const kpRes = await fetch(`${API_BASE}/products/${product.id}/key-points/?role=admin`, {
          headers: API_HEADERS
        });
        if (kpRes.ok) {
          const kpData = await kpRes.json();
          let parsedPts = [];
          if (Array.isArray(kpData)) {
            parsedPts = kpData;
          } else if (kpData.key_points && Array.isArray(kpData.key_points)) {
            parsedPts = kpData.key_points;
          } else if (kpData.points && Array.isArray(kpData.points)) {
            parsedPts = kpData.points;
          }
          if (parsedPts.length > 0) {
            fetchedKeyPoints = JSON.stringify(parsedPts);
          }
        }
      } catch (e) {
        console.error("Failed to fetch key points:", e);
      }


      setFormData({
        name: product.name || product.title || '',
        product_code: product.product_code || '',
        discount: product.discount || '0',
        weight_volume: product.weight_volume || product.weight || '0',
        category: product.category_id || product.category || '',
        brand: product.brand_id || product.brand || '',
        unit: product.unit || product.uom || '',
        stock: product.stock !== undefined ? product.stock : '0',
        gst_percentage: product.gst_percentage || '0',
        tamil_name: product.tamil_name || '',
        product_type: product.type || product.product_type || '',
        mrp: product.mrp || '0',
        customer_price: customerPrice !== undefined && customerPrice !== null ? customerPrice : (product.customer_price || product.customer_amount || '0'),
        reseller_price: product.reseller_price !== undefined ? product.reseller_price : '0',
        retailer_price: product.retailer_price !== undefined ? product.retailer_price : '0',
        distributor_price: product.distributor_price !== undefined ? product.distributor_price : '0',
        sarvo_price: product.sarvo_price !== undefined ? product.sarvo_price : '0',
        drug_price: product.drug_price !== undefined ? product.drug_price : '0',
        barcode: product.barcode || '',
        is_new: product.is_new || false,
        description: product.description || '',
        key_points: fetchedKeyPoints,
        store_price: product.store_price !== undefined && product.store_price !== null ? product.store_price : (product.member_amount || '0'),
        purchase_price: product.purchase_price !== undefined ? product.purchase_price : '0',
        reorder_level: product.reorder_level !== undefined ? product.reorder_level : '0',
        batch_number: product.batch_number || '',
        manufacturer: product.manufacturer || '',
        expiry_date: product.expiry_date ? product.expiry_date.substring(0, 10) : '',
        is_active: product.is_active !== undefined ? product.is_active : true,
        is_public: product.is_public !== undefined ? product.is_public : true
      });
      let mainImg = product.image || '';
      if (typeof mainImg === 'string') {
        if (mainImg.includes('ngrok-free.dev') || mainImg.includes('ngrok-free.app')) {
          fetch(mainImg, { headers: API_HEADERS })
            .then(r => r.blob())
            .then(blob => setImagePreview(URL.createObjectURL(blob)))
            .catch(() => setImagePreview(mainImg));
        } else {
          setImagePreview(mainImg);
        }
      } else {
        setImagePreview(mainImg);
      }
      setImage(null);
      setExistingGalleryImages([]);
      setNewGalleryImages([]);
      // The backend products list API does not return `is_variable`, so we must fetch variations unconditionally
      fetch(`${API_BASE}/products/${product.id}/variations/?role=admin`, {
        headers: API_HEADERS
      })
        .then(res => res.ok ? res.json() : [])
        .then(varData => {
          const fetchedVariations = Array.isArray(varData) ? varData : (varData.results || varData.data || []);
          if (fetchedVariations.length > 0) {
            setIsVariable(true);
          } else {
            setIsVariable(product.is_variable === true);
          }

          Promise.all(fetchedVariations.map(async v => {
            return {
              ...blankVariation(),
              ...v,
              attribute_value: v.variation_name || v.attribute_value || '',
              store_price: v.store_price !== undefined && v.store_price !== null ? v.store_price : (v.member_amount || ''),
              id: v.id || 'new_' + Date.now() + Math.random()
            };
          })).then(mappedVariations => {
            setVariations(mappedVariations);
          });
        })
        .catch(err => {
          console.error("Error fetching variations:", err);
          setIsVariable(product.is_variable === true);
          setVariations([]);
        });

      // Fetch existing gallery images
      fetch(`${API_BASE}/product-images/`, {
        headers: API_HEADERS
      })
        .then(res => res.json())
        .then(data => {
          let imgs = [];
          if (Array.isArray(data)) imgs = data;
          else if (data && data.data) imgs = data.data;
          else if (data && data.results) imgs = data.results;

          // Filter imgs for the current product
          imgs = imgs.filter(img => String(img.product) === String(product.id) || String(img.product_id) === String(product.id));

          const previews = imgs.map(img => {
            let url = img.image || img.url || img;
            return url;
          }).filter(Boolean);

          Promise.all(previews.map((url, idx) => {
            if (typeof url === 'string' && url.includes('ngrok-free.dev')) {
              return fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
                .then(r => r.blob())
                .then(blob => ({ id: imgs[idx].id, url: URL.createObjectURL(blob) }))
                .catch(() => ({ id: imgs[idx].id, url }));
            }
            return { id: imgs[idx].id, url };
          })).then(blobObjs => {
            setExistingGalleryImages(blobObjs);
          });
        })
        .catch(err => console.error('Error fetching gallery images', err));
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        product_code: '',
        discount: '0',
        weight_volume: '0',
        category: '',
        brand: '',
        unit: '',
        stock: '0',
        gst_percentage: '0',
        tamil_name: '',
        product_type: '',
        mrp: '0',
        customer_price: '0',
        reseller_price: '0',
        retailer_price: '0',
        distributor_price: '0',
        sarvo_price: '0',
        drug_price: '0',
        barcode: '',
        is_new: false,
        description: '',
        key_points: '',
        store_price: '0',
        purchase_price: '0',
        reorder_level: '0',
        batch_number: '',
        manufacturer: '',
        expiry_date: '',
        is_active: true,
        is_public: true
      });
      setImagePreview('');
      setImage(null);
      setExistingGalleryImages([]);
      setNewGalleryImages([]);
      setIsVariable(false);
      setVariations([]);
    }
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveMainImage = async () => {
    if (editingId && imagePreview && !image) {
      // It's an existing image from the backend, remove it instantly via PUT
      if (!window.confirm("Are you sure you want to remove the main product image?")) return;
      try {
        const res = await fetch(`${API_BASE}/products/${editingId}/?role=admin`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...API_HEADERS
          },
          body: JSON.stringify({ image: null })
        });
        if (res.ok) {
          setImage(null);
          setImagePreview(null);
        } else {
          alert("Failed to remove image from server.");
        }
      } catch (err) {
        console.error("Error removing main image", err);
        alert("Network error while removing image.");
      }
    } else {
      // Just clear local state
      setImage(null);
      setImagePreview(null);
      document.getElementById('product_photo').value = '';
    }
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newImgs = files.map(file => ({
        file,
        url: URL.createObjectURL(file)
      }));
      setNewGalleryImages(prev => [...prev, ...newImgs]);
    }
  };

  const removeNewGalleryImage = (index) => {
    setNewGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingGalleryImage = async (id) => {
    if (!window.confirm("Are you sure you want to delete this gallery image?")) return;
    try {
      const response = await fetch(`${API_BASE}/product-image/delete/${id}/`, {
        method: 'DELETE',
        headers: API_HEADERS
      });
      if (response.ok) {
        setExistingGalleryImages(prev => prev.filter(img => img.id !== id));
      } else {
        alert("Failed to delete image.");
      }
    } catch (err) {
      console.error("Error deleting image", err);
      alert("Network error while deleting image.");
    }
  };

  const handleAddOrUpdateKeyPoint = async () => {
    if (newKeyPoint.trim()) {
      let currentPts = [];
      try { currentPts = formData.key_points ? JSON.parse(formData.key_points) : []; } catch (err) { currentPts = (formData.key_points || '').split('\n').filter(x => x.trim()); }

      if (editingKeyPointId) {
        // PUT Request
        try {
          await fetch(`${API_BASE}/product-key-point/${editingKeyPointId}/?role=admin`, {
            method: 'PUT',
            headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newKeyPoint.trim(), key_point: newKeyPoint.trim(), point: newKeyPoint.trim() })
          });
          const index = currentPts.findIndex(p => p.id === editingKeyPointId);
          if (index !== -1) {
            currentPts[index].title = newKeyPoint.trim();
            currentPts[index].key_point = newKeyPoint.trim();
            currentPts[index].point = newKeyPoint.trim();
          } else {
            currentPts.push({ id: editingKeyPointId, title: newKeyPoint.trim(), key_point: newKeyPoint.trim() });
          }
        } catch (e) {
          console.error("Failed to update key point", e);
        }
        setEditingKeyPointId(null);
      } else {
        if (editingId) {
          try {
            const res = await fetch(`${API_BASE}/products/${editingId}/key-points/?role=admin`, {
              method: 'POST',
              headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: newKeyPoint.trim(), key_points: [newKeyPoint.trim()], points: [newKeyPoint.trim()], key_point: newKeyPoint.trim(), point: newKeyPoint.trim() })
            });
            if (res.ok) {
              const resData = await res.json();
              if (Array.isArray(resData) && resData.length > 0 && resData[0].id) {
                currentPts.push({ id: resData[0].id, title: newKeyPoint.trim() });
              } else if (resData.key_points && Array.isArray(resData.key_points) && resData.key_points.length > 0 && resData.key_points[0].id) {
                currentPts.push({ id: resData.key_points[0].id, title: newKeyPoint.trim() });
              } else if (resData.id) {
                currentPts.push({ id: resData.id, title: newKeyPoint.trim() });
              } else {
                currentPts.push(newKeyPoint.trim());
              }
            } else {
              currentPts.push(newKeyPoint.trim());
            }
          } catch (e) {
            currentPts.push(newKeyPoint.trim());
          }
        } else {
          currentPts.push(newKeyPoint.trim());
        }
      }

      setFormData({ ...formData, key_points: JSON.stringify(currentPts) });
      setNewKeyPoint('');
    }
  };

  const handleDeleteKeyPoint = async (idx, kpId) => {
    let pts = [];
    try { pts = formData.key_points ? JSON.parse(formData.key_points) : []; } catch (err) { pts = (formData.key_points || '').split('\n').filter(x => x.trim()); }

    if (kpId) {
      try {
        await fetch(`${API_BASE}/product-key-point/${kpId}/?role=admin`, {
          method: 'DELETE',
          headers: API_HEADERS
        });
      } catch (e) {
        console.error("Failed to delete key point", e);
      }
    }
    pts.splice(idx, 1);
    setFormData({ ...formData, key_points: JSON.stringify(pts) });
    if (editingKeyPointId === kpId) {
      setEditingKeyPointId(null);
      setNewKeyPoint('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus({ type: '', message: '' });

    const dataToSubmit = { ...formData };
    if (isVariable && variations.length > 0) {
      dataToSubmit.customer_price = variations[0].customer_price || '0';
      dataToSubmit.store_price = variations[0].store_price || '0';
    }

    const submitData = new FormData();
    Object.keys(dataToSubmit).forEach(key => {
      if (dataToSubmit[key] !== null && dataToSubmit[key] !== undefined) {
        submitData.append(key, dataToSubmit[key]);
      }
    });

    submitData.append('is_variable', isVariable);
    // Note: Variations are uploaded separately to the variations endpoint after product saves

    if (image) {
      submitData.append('image', image);
    }

    // Note: Gallery images are uploaded separately to the product-images endpoint

    const userStr = localStorage.getItem('user');
    let userId = '';
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        userId = String(userObj.id || userObj.user_id || userObj.staff_id || '');
      } catch (e) { }
    }

    try {
      const baseUrl = editingId ? `${API_BASE}/products/${editingId}/` : `${API_BASE}/products/`;
      const url = `${baseUrl}?role=admin`;
      const method = editingId ? 'PUT' : 'POST';

      let finalBody, finalHeaders;
      if (image || !editingId) {
        finalBody = submitData;
        finalHeaders = {
          ...API_HEADERS
        };
      } else {
        const jsonData = {};
        submitData.forEach((value, key) => {
          jsonData[key] = value;
        });
        finalBody = JSON.stringify(jsonData);
        finalHeaders = {
          'Content-Type': 'application/json',
          ...API_HEADERS
        };
      }

      const response = await fetch(url, {
        method,
        headers: finalHeaders,
        body: finalBody
      });

      const data = await response.json();

      if (response.ok) {
        const currentProductId = editingId || data.id;

        // Upload gallery images if any
        if (newGalleryImages && newGalleryImages.length > 0 && currentProductId) {
          const uploadPromises = newGalleryImages.map(imgObj => {
            const imgData = new FormData();
            imgData.append('product_id', currentProductId);
            imgData.append('image', imgObj.file);
            imgData.append('is_active', 'true');

            return fetch(`${API_BASE}/product-images/`, {
              method: 'POST',
              body: imgData,
              headers: API_HEADERS
            });
          });
          try {
            await Promise.all(uploadPromises);
          } catch (err) {
            console.error("Failed to upload some gallery images", err);
          }
        }

        // Upload variations
        if (isVariable && currentProductId) {
          const newVariations = variations.filter(v => typeof v.id === 'string' && v.id.startsWith('new_'));
          const existingVariations = variations.filter(v => typeof v.id === 'number');

          // Helper to clean variation decimals
          const cleanVariation = (vCopy) => {
            vCopy.variation_name = vCopy.attribute_value;
            delete vCopy.attribute_value;
            delete vCopy.imageFile;
            delete vCopy.imagePreview;
            const decimalFields = ['mrp', 'reseller_price', 'retailer_price', 'distributor_price', 'sarvo_price', 'customer_price', 'store_price', 'drug_price', 'discount', 'stock', 'weight_volume'];
            decimalFields.forEach(field => {
              if (vCopy[field] === '') {
                vCopy[field] = '0'; // Replace empty string with '0' to avoid backend validation error
              }
            });
            return vCopy;
          };

          // POST new variations
          if (newVariations.length > 0) {
            for (const v of newVariations) {
              let vCopy = { ...v };
              vCopy = cleanVariation(vCopy);
              delete vCopy.id; // Let backend assign ID

              try {
                await fetch(`${API_BASE}/products/${currentProductId}/variations/?role=admin`, {
                  method: 'POST',
                  headers: {
                    ...API_HEADERS,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(vCopy)
                });
              } catch (e) {
                console.error("Failed to upload new variation", e);
              }
            }
          }

          // PUT existing variations individually
          for (const v of existingVariations) {
            let vCopy = { ...v };
            vCopy = cleanVariation(vCopy);
            delete vCopy.image; // Do not send image to avoid backend crash

            try {
              await fetch(`${API_BASE}/product-variation/${v.id}/?role=admin`, {
                method: 'PUT',
                headers: {
                  ...API_HEADERS,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(vCopy)
              });
            } catch (e) {
              console.error(`Failed to update variation ${v.id}`, e);
            }
          }
        }

        // Upload Key Points
        if (currentProductId && formData.key_points) {
          try {
            let ptsArray = [];
            try { ptsArray = JSON.parse(formData.key_points); } catch (e) { ptsArray = formData.key_points.split('\n').filter(x => x.trim()); }
            const newPts = ptsArray.filter(p => typeof p === 'string');
            if (newPts.length > 0) {
              for (const pt of newPts) {
                await fetch(`${API_BASE}/products/${currentProductId}/key-points/?role=admin`, {
                  method: 'POST',
                  headers: {
                    ...API_HEADERS,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ title: pt, key_point: pt, point: pt })
                });
              }
            }
          } catch (e) {
            console.error("Failed to upload key points", e);
          }
        }

        setStatus({ type: 'success', message: editingId ? 'Product updated successfully!' : 'Product added successfully!' });
        fetchProducts(); // Refresh list
        setTimeout(() => setIsModalOpen(false), 1500);
      } else {
        setStatus({ type: 'error', message: data.message || data.error || 'Failed to save product.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error while saving product.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprovalToggle = async (product, e) => {
    e.stopPropagation();
    const newValue = !product.is_featured;

    // Calculate display order if turning ON
    let newDisplayOrder = 0;
    if (newValue) {
      const activeItems = mostLovedData.filter(item => item.is_active);
      const currentMaxOrder = activeItems.length > 0
        ? Math.max(...activeItems.map(item => item.display_order || 0))
        : 0;
      newDisplayOrder = currentMaxOrder + 1;
    }

    // Optimistic update
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_featured: newValue } : p));

    try {
      const payload = { product_id: parseInt(product.id, 10), is_active: newValue };
      if (newValue) {
        payload.display_order = newDisplayOrder;
      }

      console.log('Sending most-loved update payload:', payload);

      const res = await fetch(`${API_BASE}/crm/most-loved/update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...API_HEADERS
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Update failed:', res.status, errData);
        // Revert on failure
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_featured: !newValue } : p));
        alert('Failed to update approval status.');
      } else {
        // Update local mostLovedData state for subsequent clicks
        setMostLovedData(prev => {
          const existing = prev.find(item => item.product_id === product.id);
          if (existing) {
            return prev.map(item => item.product_id === product.id ? { ...item, is_active: newValue, display_order: newDisplayOrder } : item);
          } else {
            return [...prev, { product_id: product.id, is_active: newValue, display_order: newDisplayOrder }];
          }
        });
      }
    } catch (err) {
      // Revert on network error
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_featured: !newValue } : p));
      console.error('Error updating approval:', err);
    }
  };

  const handleDelete = (product) => {
    setDeleteConfirm({
      isOpen: true,
      id: product.id,
      name: product.name || product.title || ''
    });
  };

  const confirmDeleteProduct = async () => {
    if (!deleteConfirm.id) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`${API_BASE}/products/${deleteConfirm.id}/?role=admin`, {
        method: 'DELETE',
        headers: API_HEADERS
      });

      if (response.ok) {
        setProducts(products.filter(p => p.id !== deleteConfirm.id));
        setDeleteConfirm({ isOpen: false, id: null, name: '' });
      } else {
        let errMsg = "Unknown error";
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errData.detail || JSON.stringify(errData);
        } catch (e) { }
        alert(`Failed to delete product. Backend says: ${errMsg}`);
      }
    } catch (err) {
      console.error("Error deleting product", err);
      alert("Network error while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };
  const handleExport = () => {
    if (products.length === 0) {
      alert("No products to export!");
      return;
    }
    const headers = ["ID", "SKU", "Product Name", "Category", "Brand", "Customer Price", "Store Price", "Stock"];
    const csvContent = [
      headers.join(","),
      ...products.map(p => {
        return [
          p.id,
          `"${p.product_code || p.sku || ''}"`,
          `"${(p.name || '').replace(/"/g, '""')}"`,
          `"${p.category_name || p.category || ''}"`,
          `"${p.brand_name || p.brand || ''}"`,
          p.customer_price || p.price || 0,
          p.store_price || p.price || 0,
          p.stock_quantity || p.stock || 0
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Products_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="product-manager">
      <div className="product-header-bar">
        <div className="product-toolbar">
          <div className="product-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="ultra-btn outline-btn" onClick={handleExport} style={{ margin: 0, width: 'auto', padding: '0.6rem 1.2rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <FiDownload /> Export
            </span>
          </button>
          <button className="ultra-btn" onClick={() => openModal()} style={{ margin: 0, width: 'auto', padding: '0.6rem 1.2rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <FiPlus /> Add Product
            </span>
            <div className="btn-glow"></div>
          </button>
        </div>
      </div>

      <div className="product-table-container">
        {isLoading ? (
          <div className="product-loading">Loading products data...</div>
        ) : (
          <div className="table-responsive">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Pricing</th>
                  <th>Stock</th>
                  <th style={{ textAlign: 'center' }}>Loved Pics</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      No products found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} onClick={() => setViewProduct(product)} style={{ cursor: 'pointer' }} className="clickable-row">
                      <td>
                        <div className="prod-cell-profile">
                          <div className="prod-table-avatar">
                            {product.image ? (
                              <img src={product.image} alt={product.name || product.title} />
                            ) : (
                              <FiImage style={{ fontSize: '1.2rem', color: '#000000' }} />
                            )}
                          </div>
                          <div className="prod-table-name">
                            <strong>{product.name || product.title}</strong>
                            <span className="prod-table-desc">
                              {product.description ? (product.description.length > 50 ? product.description.substring(0, 50) + '...' : product.description) : 'No description'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="prod-table-pricing" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div className="price-badge"><span>Customer:</span> ₹{product.customer_price || product.price || '0'}</div>
                          <div className="price-badge"><span>Store:</span> ₹{product.store_price || '0'}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`prod-badge ${product.stock > 10 ? 'badge-in-stock' : (product.stock > 0 ? 'badge-low-stock' : 'badge-out-stock')}`}>
                          <FiPackage style={{ marginRight: '4px' }} />
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <label className="approval-toggle" title={product.is_featured ? 'Approved – Showing on Website' : 'Not Approved – Hidden from Website'}>
                          <input
                            type="checkbox"
                            checked={!!product.is_featured}
                            onChange={(e) => handleApprovalToggle(product, e)}
                          />
                          <span className="approval-slider"></span>
                        </label>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="prod-action-group">
                          <button className="prod-action-btn" onClick={(e) => { e.stopPropagation(); openModal(product); }} title="Edit">
                            <FiEdit2 />
                          </button>
                          <button className="prod-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(product); }} title="Delete">
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="cat-modal-overlay">
          <div className="cat-modal product-modal">
            <div className="cat-modal-header">
              <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="cat-close-btn" onClick={() => setIsModalOpen(false)}><FiX /></button>
            </div>

            {status.message && (
              <div className={`dash-${status.type} cat-status`}>
                {status.message}
              </div>
            )}

            <form className="dash-form product-form-grid" onSubmit={handleSubmit}>
              {/* Variable Product Toggle */}
              <div className="full-width" style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid rgba(48, 55, 42, 0.12)', marginBottom: '15px' }}>
                <label className="ultra-checkbox switch" style={{ position: 'relative', top: 'auto', left: 'auto', pointerEvents: 'auto', transform: 'none', color: 'initial', margin: 0 }}>
                  <input type="checkbox" checked={isVariable} onChange={handleToggleVariable} />
                  <span className="slider round"></span>
                </label>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#000000' }}>Variable Product</span>
              </div>

              {/* Row 1 */}
              <div className="dash-input-group">
                <input type="text" id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder=" " required />
                <label htmlFor="name">Name</label>
              </div>
              <div className="dash-input-group">
                <input type="text" id="product_code" value={formData.product_code} onChange={e => setFormData({ ...formData, product_code: e.target.value })} placeholder=" " />
                <label htmlFor="product_code">product_code</label>
              </div>
              {!isVariable && (
                <div className="dash-input-group">
                  <input type="number" id="discount" value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} placeholder=" " />
                  <label htmlFor="discount">Discount</label>
                </div>
              )}

              {/* Row 2 */}
              {!isVariable && (
                <div className="dash-input-group">
                  <input type="text" id="weight_volume" value={formData.weight_volume} onChange={e => setFormData({ ...formData, weight_volume: e.target.value })} placeholder=" " />
                  <label htmlFor="weight_volume">weight_volume</label>
                </div>
              )}
              <div className="dash-input-group file-input-group">
                <input type="file" accept="image/*" onChange={handleImageChange} id="product_photo" className="custom-file-input" />
                <label htmlFor="product_photo" className="file-label" style={{ top: '-10px', fontSize: '12px', color: 'var(--brand-primary)', position: 'absolute' }}>Product Photo</label>
                {imagePreview && (
                  <div style={{ position: 'relative', display: 'inline-block', marginTop: '10px' }}>
                    <img src={imagePreview} alt="Preview" className="inline-img-preview" style={{ display: 'block' }} />
                    <button type="button" onClick={handleRemoveMainImage} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#30372A', color: '#000000', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                      <FiX size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="dash-input-group">
                <select id="category" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required>
                  <option value="" disabled>Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <label htmlFor="category" style={{ top: '-10px', fontSize: '12px', color: 'var(--brand-primary)' }}>Category</label>
              </div>

              {/* Row 3 */}
              <div className="dash-input-group">
                <select id="brand" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })}>
                  <option value="">Select Brand</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <label htmlFor="brand" style={{ top: '-10px', fontSize: '12px', color: 'var(--brand-primary)' }}>Brand</label>
              </div>
              <div className="dash-input-group">
                <input type="text" id="unit" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder=" " />
                <label htmlFor="unit">unit</label>
              </div>
              {!isVariable && (
                <div className="dash-input-group">
                  <input type="number" id="stock" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} placeholder=" " required={!isVariable} />
                  <label htmlFor="stock">Stock</label>
                </div>
              )}

              {/* Row 4 */}
              <div className="dash-input-group">
                <input type="number" id="gst_percentage" value={formData.gst_percentage} onChange={e => setFormData({ ...formData, gst_percentage: e.target.value })} placeholder=" " />
                <label htmlFor="gst_percentage">gst_percentage</label>
              </div>
              <div className="dash-input-group">
                <input type="text" id="tamil_name" value={formData.tamil_name} onChange={e => setFormData({ ...formData, tamil_name: e.target.value })} placeholder=" " />
                <label htmlFor="tamil_name">Tamil Name</label>
              </div>
              <div className="dash-input-group">
                <select id="product_type" value={formData.product_type} onChange={e => setFormData({ ...formData, product_type: e.target.value })}>
                  <option value="">Select Type</option>
                  <option value="powder">Powder</option>
                  <option value="liquid">Liquid</option>
                  <option value="capsule">Capsule</option>
                  <option value="tablet">Tablet</option>
                  <option value="oil">Oil</option>
                  <option value="cream">Cream</option>
                  <option value="soap">Soap</option>
                  <option value="shampoo">Shampoo</option>
                  <option value="rice">Rice</option>
                  <option value="other">Other</option>
                </select>
                <label htmlFor="product_type" style={{ top: '-10px', fontSize: '12px', color: 'var(--brand-primary)' }}>Product Type</label>
              </div>

              {/* Conditional Pricing Rows */}
              {!isVariable && (
                <>
                  {/* Row 5 */}
                  <div className="dash-input-group">
                    <input type="number" id="mrp" value={formData.mrp} onChange={e => setFormData({ ...formData, mrp: e.target.value })} placeholder=" " />
                    <label htmlFor="mrp">MRP</label>
                  </div>
                  <div className="dash-input-group">
                    <input type="number" id="customer_price" value={formData.customer_price} onChange={e => setFormData({ ...formData, customer_price: e.target.value })} placeholder=" " required={!isVariable} />
                    <label htmlFor="customer_price">Customer Price</label>
                  </div>
                  <div className="dash-input-group">
                    <input type="number" id="store_price" value={formData.store_price} onChange={e => setFormData({ ...formData, store_price: e.target.value })} placeholder=" " />
                    <label htmlFor="store_price">Store Price</label>
                  </div>

                  {/* Row 6 */}
                  <div className="dash-input-group">
                    <input type="number" id="reseller_price" value={formData.reseller_price} onChange={e => setFormData({ ...formData, reseller_price: e.target.value })} placeholder=" " />
                    <label htmlFor="reseller_price">Reseller Price</label>
                  </div>
                  <div className="dash-input-group">
                    <input type="number" id="retailer_price" value={formData.retailer_price} onChange={e => setFormData({ ...formData, retailer_price: e.target.value })} placeholder=" " />
                    <label htmlFor="retailer_price">Retailer Price</label>
                  </div>
                  <div className="dash-input-group">
                    <input type="number" id="distributor_price" value={formData.distributor_price} onChange={e => setFormData({ ...formData, distributor_price: e.target.value })} placeholder=" " />
                    <label htmlFor="distributor_price">Distributor Price</label>
                  </div>

                  {/* Row 7 */}
                  <div className="dash-input-group">
                    <input type="number" id="sarvo_price" value={formData.sarvo_price} onChange={e => setFormData({ ...formData, sarvo_price: e.target.value })} placeholder=" " />
                    <label htmlFor="sarvo_price">Sarvo Price</label>
                  </div>
                  <div className="dash-input-group">
                    <input type="number" id="drug_price" value={formData.drug_price} onChange={e => setFormData({ ...formData, drug_price: e.target.value })} placeholder=" " />
                    <label htmlFor="drug_price">Drug Price</label>
                  </div>
                  <div className="dash-input-group">
                    <input type="text" id="barcode" value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} placeholder=" " />
                    <label htmlFor="barcode">Barcode</label>
                  </div>

                  {/* Row 8 */}
                  <div className="dash-input-group">
                    <input type="number" id="purchase_price" value={formData.purchase_price} onChange={e => setFormData({ ...formData, purchase_price: e.target.value })} placeholder=" " />
                    <label htmlFor="purchase_price">Purchase Price</label>
                  </div>
                  <div className="dash-input-group">
                    <input type="number" id="reorder_level" value={formData.reorder_level} onChange={e => setFormData({ ...formData, reorder_level: e.target.value })} placeholder=" " />
                    <label htmlFor="reorder_level">Reorder Level</label>
                  </div>
                  <div className="dash-input-group">
                    <input type="text" id="batch_number" value={formData.batch_number} onChange={e => setFormData({ ...formData, batch_number: e.target.value })} placeholder=" " />
                    <label htmlFor="batch_number">Batch Number</label>
                  </div>
                </>
              )}

              {/* Row 9 */}
              <div className="dash-input-group">
                <input type="text" id="manufacturer" value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} placeholder=" " />
                <label htmlFor="manufacturer">Manufacturer</label>
              </div>
              <div className="dash-input-group">
                <input type="date" id="expiry_date" value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} placeholder=" " />
                <label htmlFor="expiry_date" style={{ top: '-10px', fontSize: '12px', color: 'var(--brand-primary)' }}>Expiry Date</label>
              </div>
              <div className="dash-input-group">
                {/* Empty filler for alignment if needed, or we can just leave it since grid auto-flows. Let's just put an empty div */}
              </div>

              {/* Row 10 - Toggles */}
              <div className="toggle-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '100%', paddingLeft: '10px' }}>
                <label className="ultra-checkbox switch" style={{ position: 'relative', top: 'auto', left: 'auto', pointerEvents: 'auto', transform: 'none', color: 'initial' }}>
                  <input type="checkbox" checked={formData.is_new} onChange={e => setFormData({ ...formData, is_new: e.target.checked })} />
                  <span className="slider round"></span>
                </label>
                <span className="toggle-label" style={{ fontWeight: 600, color: '#000000' }}>New Launch 🚀</span>
              </div>
              <div className="toggle-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '100%', paddingLeft: '10px' }}>
                <label className="ultra-checkbox switch" style={{ position: 'relative', top: 'auto', left: 'auto', pointerEvents: 'auto', transform: 'none', color: 'initial' }}>
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                  <span className="slider round"></span>
                </label>
                <span className="toggle-label" style={{ fontWeight: 600, color: '#000000' }}>Is Active</span>
              </div>
              <div className="toggle-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '100%', paddingLeft: '10px' }}>
                <label className="ultra-checkbox switch" style={{ position: 'relative', top: 'auto', left: 'auto', pointerEvents: 'auto', transform: 'none', color: 'initial' }}>
                  <input type="checkbox" checked={formData.is_public} onChange={e => setFormData({ ...formData, is_public: e.target.checked })} />
                  <span className="slider round"></span>
                </label>
                <span className="toggle-label" style={{ fontWeight: 600, color: '#000000' }}>Is Public</span>
              </div>

              {/* Row 10 */}
              <div className="dash-input-group full-width">
                <textarea id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder=" " rows="4"></textarea>
                <label htmlFor="description">Description</label>
              </div>

              <div className="full-width" style={{ marginTop: '15px' }}>
                <div style={{ border: '1px solid #B3C58A', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', background: '#fff', boxShadow: '0 0 0 1px rgba(48, 55, 42,0.2)' }}>

                  {/* List of Key Points without separate boxes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(function () {
                      let pts = [];
                      try { pts = formData.key_points ? JSON.parse(formData.key_points) : []; } catch (err) { pts = (formData.key_points || '').split('\n').filter(x => x.trim()); }
                      return Array.isArray(pts) ? pts.map((kp, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '4px 8px' }}>
                          <span style={{ fontSize: '14px', color: '#000000', flex: 1, paddingRight: '10px' }}>• {typeof kp === 'string' ? kp : (kp.title || kp.key_point || kp.point || '')}</span>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                            <button type="button" onClick={() => {
                              setNewKeyPoint(typeof kp === 'string' ? kp : (kp.title || kp.key_point || kp.point || ''));
                              if (kp.id) {
                                setEditingKeyPointId(kp.id);
                              } else {
                                pts.splice(idx, 1);
                                setFormData({ ...formData, key_points: JSON.stringify(pts) });
                              }
                            }} style={{ background: 'transparent', border: 'none', color: '#000000', cursor: 'pointer' }}>
                              <FiEdit2 size={14} />
                            </button>
                            <button type="button" onClick={() => handleDeleteKeyPoint(idx, kp.id)} style={{ background: 'transparent', border: 'none', color: '#000000', cursor: 'pointer' }}>
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )) : null;
                    })()}
                  </div>

                  {/* Input area - seamless within the box */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <textarea
                      placeholder="Type a key point..."
                      value={newKeyPoint}
                      onChange={e => setNewKeyPoint(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', resize: 'vertical', minHeight: '30px', fontSize: '14px', padding: '8px' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddOrUpdateKeyPoint();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddOrUpdateKeyPoint}
                      style={{ padding: '0 15px', background: '#B3C58A', color: '#000000', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start', height: '36px', fontSize: '13px', marginTop: '4px' }}
                    >
                      {editingKeyPointId ? 'Update' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 11 */}
              <div className="dash-input-group full-width" style={{ position: 'relative', marginTop: '1rem' }}>
                <label htmlFor="gallery" style={{ top: '-25px', fontSize: '14px', fontWeight: 600, color: '#000000', position: 'absolute', pointerEvents: 'none', backgroundColor: 'transparent', padding: 0 }}>Product Gallery</label>
                <input type="file" multiple accept="image/*" id="gallery" className="custom-file-input" style={{ width: '100%' }} onChange={handleGalleryChange} />
                {(existingGalleryImages.length > 0 || newGalleryImages.length > 0) && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
                    {existingGalleryImages.map((img) => (
                      <div key={`existing-${img.id}`} style={{ position: 'relative' }}>
                        <img src={img.url} alt={`existing preview`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(48, 55, 42, 0.12)' }} />
                        <button type="button" onClick={() => removeExistingGalleryImage(img.id)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#30372A', color: '#000000', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', zIndex: 2 }}>
                          <FiX />
                        </button>
                      </div>
                    ))}
                    {newGalleryImages.map((img, index) => (
                      <div key={`new-${index}`} style={{ position: 'relative' }}>
                        <img src={img.url} alt={`new preview ${index}`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(48, 55, 42, 0.12)' }} />
                        <button type="button" onClick={() => removeNewGalleryImage(index)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#30372A', color: '#000000', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}>
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isVariable && (
                <div className="full-width variations-section">
                  <div className="variations-header">
                    <h3 style={{ margin: 0, color: '#000000', fontSize: '1.2rem', fontWeight: 600 }}>Product Variations</h3>
                    <button type="button" className="btn-add-var" onClick={handleAddVariation}>Add Variation</button>
                  </div>
                  <div className="variations-list">
                    {variations.map((v, idx) => (
                      <div key={v.id} className="variation-card">
                        <div className="var-card-header">
                          <h4 style={{ margin: 0, color: '#000000', fontWeight: 500 }}>Variation {idx + 1}</h4>
                          <button type="button" className="btn-remove-var" onClick={() => handleRemoveVariation(v.id)}>Remove</button>
                        </div>
                        <div className="var-card-body">
                          <div className="var-input-group">
                            <label>Attribute Value</label>
                            <input type="text" placeholder="e.g. 250 gm" value={v.attribute_value} onChange={e => handleVariationChange(v.id, 'attribute_value', e.target.value)} required />
                          </div>
                          <div className="var-input-group">
                            <label>SKU</label>
                            <input type="text" value={v.sku} onChange={e => handleVariationChange(v.id, 'sku', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>MRP</label>
                            <input type="number" value={v.mrp} onChange={e => handleVariationChange(v.id, 'mrp', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>Reseller Price</label>
                            <input type="number" value={v.reseller_price} onChange={e => handleVariationChange(v.id, 'reseller_price', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>Retailer Price</label>
                            <input type="number" value={v.retailer_price} onChange={e => handleVariationChange(v.id, 'retailer_price', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>Distributor Price</label>
                            <input type="number" value={v.distributor_price} onChange={e => handleVariationChange(v.id, 'distributor_price', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>Sarvo Price</label>
                            <input type="number" value={v.sarvo_price} onChange={e => handleVariationChange(v.id, 'sarvo_price', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>Customer Price</label>
                            <input type="number" value={v.customer_price} onChange={e => handleVariationChange(v.id, 'customer_price', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>Store Price</label>
                            <input type="number" value={v.store_price} onChange={e => handleVariationChange(v.id, 'store_price', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>Barcode</label>
                            <input type="text" value={v.barcode} onChange={e => handleVariationChange(v.id, 'barcode', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>Discount</label>
                            <input type="number" value={v.discount} onChange={e => handleVariationChange(v.id, 'discount', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>Stock</label>
                            <input type="number" value={v.stock} onChange={e => handleVariationChange(v.id, 'stock', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>Drug Price</label>
                            <input type="number" value={v.drug_price} onChange={e => handleVariationChange(v.id, 'drug_price', e.target.value)} />
                          </div>
                          <div className="var-input-group">
                            <label>Weight (kg)</label>
                            <input type="text" value={v.weight_volume} onChange={e => handleVariationChange(v.id, 'weight_volume', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="full-width form-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="dash-btn" disabled={isSaving}>
                  <span>{isSaving ? 'Saving...' : (editingId ? 'Update Product' : 'Add Product')}</span>
                  <div className="btn-glow"></div>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {viewProduct && createPortal(
        <div className="cat-modal-overlay">
          <div className="cat-modal" style={{ maxWidth: '600px' }}>
            <div className="cat-modal-header">
              <h2>{viewProduct.name || viewProduct.title} - Details</h2>
              <button className="cat-close-btn" onClick={() => setViewProduct(null)}><FiX /></button>
            </div>
            <div className="view-product-details" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                {viewProduct.image ? (
                  <img src={viewProduct.image} alt="Product" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '10px' }} />
                ) : (
                  <div style={{ width: '100px', height: '100px', background: '#F5F7EC', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FiImage size={30} color="#8A927E" />
                  </div>
                )}
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>{viewProduct.name || viewProduct.title}</h3>
                  {viewProduct.tamil_name && <p style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#000000' }}>{viewProduct.tamil_name}</p>}
                  <p style={{ margin: 0, color: '#000000', fontSize: '0.9rem' }}>{viewProduct.description || 'No description provided'}</p>
                  <p style={{ margin: '5px 0 0 0', fontWeight: 600, color: '#000000' }}>{viewProduct.stock} In Stock</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#F5F7EC', padding: '15px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Customer Price:</strong> <span>₹{viewProduct.customer_price || viewProduct.price || '0'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Store Price:</strong> <span>₹{viewProduct.store_price || '0'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Purchase Price:</strong> <span>₹{viewProduct.purchase_price || '0'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>MRP:</strong> <span>₹{viewProduct.mrp || '0'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Reseller Price:</strong> <span>₹{viewProduct.reseller_price || '0'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Retailer Price:</strong> <span>₹{viewProduct.retailer_price || '0'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Distributor Price:</strong> <span>₹{viewProduct.distributor_price || '0'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Sarvo Price:</strong> <span>₹{viewProduct.sarvo_price || '0'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Drug Price:</strong> <span>₹{viewProduct.drug_price || '0'}</span></div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDeleteProduct}
        title="Delete Product"
        message="Are you sure you want to delete this product?"
        itemName={deleteConfirm.name}
        isLoading={isDeleting}
      />
    </div>
  );
}
