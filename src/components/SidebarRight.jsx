import React, { useEffect, useState } from 'react';
import { Sliders, X, PencilRuler, CheckCircle2, Pointer } from 'lucide-react';

export default function SidebarRight({ mapData, setMapData, selectedPlotId, setSelectedPlotId, showToast }) {
    const plot = selectedPlotId ? mapData.plots.find(p => p.id === selectedPlotId) : null;
    
    const [formData, setFormData] = useState({
        id: '', status: 'available', area: 0, price: 0, owner: '', notes: ''
    });

    useEffect(() => {
        if (plot) {
            setFormData({
                id: plot.id,
                status: plot.status,
                area: plot.area,
                price: plot.price,
                owner: plot.owner || '',
                notes: plot.notes || ''
            });
        }
    }, [plot, selectedPlotId]);

    const handleSave = (e) => {
        if (e) e.preventDefault();
        if (!plot) return;
        
        const newId = formData.id.trim();
        if (newId !== plot.id) {
            if (mapData.plots.some(p => p.id === newId)) {
                showToast(`Plot ID "${newId}" already exists. Please choose a unique name.`, "error");
                setFormData(prev => ({ ...prev, id: plot.id }));
                return;
            }
        }
        
        setMapData(prev => {
            const newPlots = prev.plots.map(p => {
                if (p.id === plot.id) {
                    return {
                        ...p,
                        id: newId,
                        status: formData.status,
                        area: parseFloat(formData.area) || p.area,
                        price: parseFloat(formData.price) || 0,
                        owner: formData.owner.trim() || null,
                        notes: formData.notes.trim() || null
                    };
                }
                return p;
            });
            return { ...prev, plots: newPlots };
        });
        
        if (newId !== plot.id) {
            setSelectedPlotId(newId);
        }
        
        showToast(`Plot properties for "${newId}" updated successfully`, "success");
    };

    if (!selectedPlotId || !plot) {
        return (
            <aside id="editor-sidebar" className="editor-panel collapsed">
                <div id="editor-empty-state" className="empty-selection-state" style={{ display: 'flex' }}>
                    <Pointer size={48} />
                    <div>
                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>No Plot Selected</h3>
                        <p style={{ fontSize: '0.85rem' }}>Click any parcel polygon on the visual map or use the inventory list to view and customize dimensions.</p>
                    </div>
                </div>
            </aside>
        );
    }

    const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
    const totalVal = formData.area * formData.price;

    return (
        <aside id="editor-sidebar" className="editor-panel">
            <div className="panel-header">
                <h2><Sliders size={20} /> Plot Properties</h2>
                <button className="btn-icon" title="Close Panel" onClick={() => setSelectedPlotId(null)}>
                    <X size={16} />
                </button>
            </div>
            
            <div className="panel-content">
                <form id="plot-editor-form" onSubmit={handleSave}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label>Plot Identifier (Editable Name)</label>
                        <input type="text" required placeholder="e.g. 234/Premium" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} onBlur={() => handleSave()} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Updates directly on map label instantly.</span>
                    </div>

                    <div className="form-row" style={{ marginBottom: '16px' }}>
                        <div className="form-group">
                            <label>Sales Status</label>
                            <select value={formData.status} onChange={e => { setFormData({...formData, status: e.target.value}); setTimeout(handleSave, 10); }}>
                                <option value="available">Available</option>
                                <option value="reserved">Reserved</option>
                                <option value="sold">Sold</option>
                                <option value="premium">Premium</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Surface Area (m²)</label>
                            <input type="number" step="0.01" required value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} onBlur={() => handleSave()} />
                        </div>
                    </div>

                    <div className="form-row" style={{ marginBottom: '16px' }}>
                        <div className="form-group">
                            <label>Price ($ per m²)</label>
                            <input type="number" step="1" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} onBlur={() => handleSave()} />
                        </div>
                        <div className="form-group">
                            <label>Total Value</label>
                            <input type="text" readOnly style={{ opacity: 0.7 }} value={currencyFormatter.format(totalVal)} />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label>Current Registered Owner</label>
                        <input type="text" placeholder="Unregistered / Available" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} onBlur={() => handleSave()} />
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label>Layout Description & Notes</label>
                        <textarea placeholder="Enter special features, geological survey remarks, etc." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} onBlur={() => handleSave()}></textarea>
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Polygon Coordinates Table</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Double click point to delete</span>
                        </label>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)' }}>
                            <table style={{ width: '100%', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th style={{ padding: '6px 12px', fontWeight: 500 }}>Vertex</th>
                                        <th style={{ padding: '6px 12px', fontWeight: 500 }}>Coord X</th>
                                        <th style={{ padding: '6px 12px', fontWeight: 500 }}>Coord Y</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plot.points.map((pt, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }} onDoubleClick={() => {
                                            if (plot.points.length > 3) {
                                                const newPoints = [...plot.points];
                                                newPoints.splice(index, 1);
                                                setMapData(prev => {
                                                    const newPlots = prev.plots.map(p => {
                                                        if(p.id === plot.id) {
                                                            // Using a simplified Shoelace formula for area recalculation approximation as in original
                                                            let area = 0;
                                                            for (let i = 0; i < newPoints.length; i++) {
                                                                const p1 = newPoints[i];
                                                                const p2 = newPoints[(i + 1) % newPoints.length];
                                                                area += (p1[0] * p2[1]) - (p2[0] * p1[1]);
                                                            }
                                                            const newArea = Math.abs(area) * 0.055;
                                                            return { ...p, points: newPoints, area: newArea };
                                                        }
                                                        return p;
                                                    });
                                                    return { ...prev, plots: newPlots };
                                                });
                                                showToast(`Vertex ${index + 1} removed from boundary coordinates`, "warning");
                                            } else {
                                                showToast("Polygons require at least 3 boundaries to remain secure", "error");
                                            }
                                        }}>
                                            <td style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>{index + 1}</td>
                                            <td style={{ padding: '6px 12px' }}>{pt[0]}</td>
                                            <td style={{ padding: '6px 12px' }}>{pt[1]}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Click the <strong>Edit Boundaries tool <PencilRuler size={12} style={{ display: 'inline', verticalAlign: 'middle' }}/></strong> on the toolbar to drag nodes directly.</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                            <CheckCircle2 size={16} /> Save Metadata Changes
                        </button>
                    </div>
                </form>
            </div>
        </aside>
    );
}
