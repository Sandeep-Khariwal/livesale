"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductsClient({ initialProducts }: { initialProducts: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("Restock");

  const [productCode, setProductCode] = useState("");
  const [price, setPrice] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [availableStock, setAvailableStock] = useState("");
  const [status, setStatus] = useState("AVAILABLE");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const resetForm = () => {
    setProductCode("");
    setPrice("");
    setInitialStock("");
    setAvailableStock("");
    setStatus("AVAILABLE");
    setIsAdding(false);
    setIsEditing(null);
    setAdjustingProduct(null);
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
  };

  const openEdit = (product: any) => {
    setProductCode(product.productCode);
    setPrice(product.price.toString());
    setAvailableStock(product.availableStock.toString());
    setStatus(product.status);
    setExistingImageUrl(product.imageUrl || null);
    setIsEditing(product);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImageIfNeeded = async (): Promise<string | undefined> => {
    if (!imageFile) return undefined;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      const res = await fetch("/api/admin/products/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image upload failed");
      return data.imageKey;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const imageKey = await uploadImageIfNeeded();

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode, price, initialStock, imageKey }),
      });
      if (res.ok) {
        resetForm();
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add product");
      }
    } catch (err: any) {
      alert(err.message || "Error adding product");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const imageKey = await uploadImageIfNeeded();

      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: isEditing._id,
          price,
          availableStock,
          ...(imageKey ? { imageKey } : {}),
        }),
      });
      if (res.ok) {
        resetForm();
        router.refresh();
      } else {
        alert("Failed to update product");
      }
    } catch (err: any) {
      alert(err.message || "Error updating product");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustingProduct._id,
          adjustment: Number(adjustAmount),
          reason: adjustReason,
        }),
      });
      if (res.ok) {
        setAdjustingProduct(null);
        setAdjustAmount("");
        setAdjustReason("Restock");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to adjust stock");
      }
    } catch (err) {
      alert("Error adjusting stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prd">
      <div className="prd-header">
        <h1>Products</h1>
        <button className="btn btn-gold" onClick={() => setIsAdding(true)}>
          + ADD PRODUCT
        </button>
      </div>

      {(isAdding || isEditing) && (
        <div className="panel">
          <h2>{isEditing ? "Edit Product" : "Add Product"}</h2>
          <form onSubmit={isEditing ? handleEditSubmit : handleAddSubmit} className="form">
            <div className="form-block">
              <h3>PRODUCT INFORMATION</h3>
              <label>Product Code</label>
              <input type="text" value={productCode} onChange={(e) => setProductCode(e.target.value)} disabled={!!isEditing} required />

              <label>Price (₹)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />

              <label>Product Image</label>
              {(imagePreview || existingImageUrl) && (
                <img src={imagePreview || existingImageUrl!} alt="Product" className="img-preview" />
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} className="file-input" />
              {uploadingImage && <p className="hint">Uploading image...</p>}
            </div>

            <div className="form-block">
              <h3>INVENTORY</h3>
              {!isEditing ? (
                <>
                  <label>Initial Stock</label>
                  <input type="number" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} required />
                </>
              ) : (
                <>
                  <label>Available Stock</label>
                  <input
                    type="number"
                    value={availableStock}
                    onChange={(e) => {
                      setAvailableStock(e.target.value);
                      setStatus(Number(e.target.value) > 0 ? "AVAILABLE" : "SOLD_OUT");
                    }}
                    required
                  />
                </>
              )}
            </div>

            {isEditing && (
              <div>
                <h3>STATUS</h3>
                <div className={`status-badge ${status === "AVAILABLE" ? "status-ok" : "status-bad"}`}>
                  {status === "AVAILABLE" ? "🟢 AVAILABLE" : "🔴 SOLD OUT"}
                </div>
                <p className="hint">Status is automatically calculated from available stock.</p>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" disabled={loading || uploadingImage} className="btn btn-gold">
                {loading || uploadingImage ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {adjustingProduct && (
        <div className="panel">
          <h2>Adjust Stock: {adjustingProduct.productCode}</h2>
          <form onSubmit={handleAdjustSubmit} className="form">
            <p className="current-stock">
              Current Stock: <strong>{adjustingProduct.availableStock}</strong>
            </p>
            <label>Adjustment Quantity (use negative to remove)</label>
            <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} required />

            <label>Reason</label>
            <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} required />

            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn btn-gold">
                {loading ? "Saving..." : "Confirm Adjustment"}
              </button>
              <button type="button" onClick={() => setAdjustingProduct(null)} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrap">
        <table className="prd-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Code</th>
              <th>Price</th>
              <th>Available Stock</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row">
                  No products found.
                </td>
              </tr>
            ) : (
              initialProducts.map((product: any) => (
                <tr key={product._id.toString()}>
                  <td>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.productCode} className="thumb" />
                    ) : (
                      <div className="thumb-empty" />
                    )}
                  </td>
                  <td className="code-cell">{product.productCode}</td>
                  <td>₹{product.price}</td>
                  <td className="stock-cell">{product.availableStock}</td>
                  <td>
                    <span className={`status-badge ${product.status === "AVAILABLE" ? "status-ok" : "status-bad"}`}>
                      {product.status === "AVAILABLE" ? "🟢 AVAILABLE" : "🔴 SOLD OUT"}
                    </span>
                  </td>
                  <td>{new Date(product.updatedAt).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button onClick={() => openEdit(product)} className="btn btn-outline">
                      Edit
                    </button>
                    <button onClick={() => setAdjustingProduct(product)} className="btn btn-outline">
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .prd {
          --gold: #d4af5a;
          --gold-bright: #f3d68f;
          --surface: #211217;
          --surface-alt: #2a161c;
          --hairline: rgba(212, 175, 90, 0.18);
          --cream: #f6ecd9;
          --muted: #a8927b;
          --success: #4fae7a;
          --error: #e0654f;
          color: var(--cream);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .prd-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .prd-header h1 {
          margin: 0;
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--cream);
        }

        .btn {
          padding: 0.55rem 1.1rem;
          border-radius: 0.4rem;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          border: none;
          font-family: inherit;
          transition: all 0.18s ease;
        }

        .btn-gold {
          background: linear-gradient(135deg, var(--gold-bright), var(--gold));
          color: #2c0810;
        }
        .btn-gold:hover:not(:disabled) {
          filter: brightness(1.08);
        }
        .btn-gold:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .btn-ghost {
          background: transparent;
          border: 1px solid var(--hairline);
          color: var(--cream);
        }
        .btn-ghost:hover {
          border-color: var(--gold);
        }

        .btn-outline {
          background: transparent;
          border: 1px solid var(--hairline);
          color: var(--gold-bright);
          padding: 0.35rem 0.7rem;
          font-size: 0.78rem;
          font-weight: 600;
        }
        .btn-outline:hover {
          border-color: var(--gold);
          background: rgba(212, 175, 90, 0.08);
        }

        .panel {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: var(--surface);
          border: 1px solid var(--hairline);
          border-radius: 0.75rem;
        }

        .panel h2 {
          margin-top: 0;
          color: var(--gold-bright);
          font-size: 1.2rem;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 420px;
        }

        .form-block {
          border-bottom: 1px solid var(--hairline);
          padding-bottom: 1rem;
          margin-bottom: 0.5rem;
        }

        .form-block h3 {
          margin-top: 0;
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 700;
        }

        label {
          display: block;
          margin-bottom: 0.4rem;
          margin-top: 1rem;
          font-size: 0.85rem;
          color: var(--muted);
          font-weight: 500;
        }

        input[type="text"],
        input[type="number"] {
          width: 100%;
          padding: 0.6rem 0.7rem;
          background: #000000a0;
          border: 1px solid var(--hairline);
          border-radius: 0.35rem;
          color: var(--cream);
          font-size: 0.9rem;
          outline: none;
          font-family: inherit;
        }
        input[type="text"]:focus,
        input[type="number"]:focus {
          border-color: var(--gold);
        }
        input:disabled {
          opacity: 0.5;
        }

        .file-input {
          width: 100%;
          color: var(--muted);
          font-size: 0.85rem;
        }

        .img-preview {
          width: 100%;
          max-height: 160px;
          object-fit: cover;
          border-radius: 0.35rem;
          margin-bottom: 0.5rem;
          border: 1px solid var(--hairline);
        }

        .hint {
          font-size: 0.78rem;
          opacity: 0.65;
          margin-top: 0.4rem;
          color: var(--muted);
        }

        .current-stock {
          margin: 0;
          color: var(--cream);
        }

        .status-badge {
          display: inline-block;
          padding: 0.4rem 0.9rem;
          border-radius: 0.35rem;
          font-weight: 700;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }
        .status-ok {
          background: rgba(79, 174, 122, 0.12);
          color: var(--success);
        }
        .status-bad {
          background: rgba(224, 101, 79, 0.12);
          color: var(--error);
        }

        .form-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .prd-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          background: var(--surface);
          border: 1px solid var(--hairline);
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .prd-table thead {
          border-bottom: 1px solid var(--hairline);
          background: var(--surface-alt);
        }

        .prd-table th {
          padding: 0.9rem 1rem;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 700;
        }

        .prd-table td {
          padding: 0.9rem 1rem;
          border-bottom: 1px solid var(--hairline);
          font-size: 0.9rem;
        }

        .prd-table tr:last-child td {
          border-bottom: none;
        }

        .prd-table tr:hover td {
          background: rgba(212, 175, 90, 0.03);
        }

        .code-cell {
          font-weight: 600;
          color: var(--gold-bright);
        }

        .stock-cell {
          font-weight: 700;
        }

        .empty-row {
          padding: 2rem;
          text-align: center;
          opacity: 0.5;
        }

        .thumb {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 0.35rem;
        }

        .thumb-empty {
          width: 48px;
          height: 48px;
          border-radius: 0.35rem;
          background: rgba(255, 255, 255, 0.05);
        }

        .actions-cell {
          display: flex;
          gap: 0.5rem;
        }

        @media (max-width: 640px) {
          .prd-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .form {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}