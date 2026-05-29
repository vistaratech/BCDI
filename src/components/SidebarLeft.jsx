import React, { useMemo, useRef, useState } from 'react';
import { BarChart3, Search, Image as ImageIcon, ImagePlus, ImageOff, ScanLine, Cpu, Upload } from 'lucide-react';
import VectorizerEngine from '../utils/VectorizerEngine';

export default function SidebarLeft({ mapData, setMapData, activeFilter, setActiveFilter, searchQuery, setSearchQuery, selectedPlotId, setSelectedPlotId, showToast }) {
    const fileImportInput = useRef(null);
    const refImageInput = useRef(null);
    
    // Derived state for metrics
    const metrics = useMemo(() => {
        let totalVal = 0, soldVal = 0, totalArea = 0, soldArea = 0, availableArea = 0;
        let availableCount = 0, reservedCount = 0, soldCount = 0;
        
        mapData.plots.forEach(plot => {
            const plotVal = plot.area * plot.price;
            totalVal += plotVal;
            totalArea += plot.area;
            if (plot.status === "available" || plot.status === "premium") {
                availableCount++;
                availableArea += plot.area;
            } else if (plot.status === "sold") {
                soldCount++;
                soldArea += plot.area;
                soldVal += plotVal;
            } else if (plot.status === "reserved") {
                reservedCount++;
                soldArea += plot.area;
                soldVal += plotVal;
            }
        });
        
        const occupancyValPercent = totalVal > 0 ? Math.round((soldVal / totalVal) * 100) : 0;
        const availAreaPercent = totalArea > 0 ? Math.round((availableArea / totalArea) * 100) : 0;
        const occupancyRate = mapData.plots.length > 0 ? Math.round(((soldCount + reservedCount) / mapData.plots.length) * 100) : 0;
        
        return { totalVal, occupancyValPercent, availableCount, availAreaPercent, totalArea, occupancyRate, soldCount, reservedCount };
    }, [mapData]);

    const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    const filteredPlots = useMemo(() => {
        return mapData.plots.filter(plot => {
            const matchesFilter = activeFilter === "all" || plot.status === activeFilter;
            const query = searchQuery.toLowerCase();
            const matchesSearch = plot.id.toLowerCase().includes(query) || 
                                 (plot.owner && plot.owner.toLowerCase().includes(query)) ||
                                 (plot.notes && plot.notes.toLowerCase().includes(query));
            return matchesFilter && matchesSearch;
        });
    }, [mapData, activeFilter, searchQuery]);

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedDatabase = JSON.parse(event.target.result);
                if (importedDatabase && Array.isArray(importedDatabase.plots) && Array.isArray(importedDatabase.roads)) {
                    setMapData(importedDatabase);
                    showToast("Layout database successfully parsed.", "success");
                } else {
                    showToast("Import failed: JSON file is missing essential plot structure segments.", "error");
                }
            } catch (err) {
                console.error("Import processing error", err);
                showToast("Failed to parse JSON file structures.", "error");
            }
        };
        reader.readAsText(file);
    };

    const handleRefImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        
        setMapData(prev => ({
            ...prev,
            backgroundImage: {
                ...prev.backgroundImage,
                href: objectUrl,
                opacity: 0.5,
                x: 100, y: 100, width: 1200, height: 800
            }
        }));
        showToast("Reference sketch overlay uploaded. Align it using controls to trace.", "success");
    };

    const handleClearRefImage = () => {
        setMapData(prev => ({ ...prev, backgroundImage: { ...prev.backgroundImage, href: null } }));
        showToast("Reference sketch overlay removed.", "warning");
    };

    const updateBgProps = (key, val) => {
        setMapData(prev => ({
            ...prev,
            backgroundImage: { ...prev.backgroundImage, [key]: val }
        }));
    };

    // Vectorizer
    const [vecThreshold, setVecThreshold] = useState(130);
    const [vecDilation, setVecDilation] = useState(2);
    const [vecSimplify, setVecSimplify] = useState(5.0);
    const [vecMask, setVecMask] = useState(false);

    return (
        <aside className="sidebar">
            <div className="panel-header">
                <h2><BarChart3 size={20} /> Layout Analytics</h2>
            </div>
            
            <div className="panel-content" style={{ gap: '16px' }}>
                <div className="metrics-grid">
                    <div className="metric-card">
                        <h3>Portfolio Value</h3>
                        <div className="metric-value">{currencyFormatter.format(metrics.totalVal)}</div>
                        <div className="metric-sub">{metrics.occupancyValPercent}% occupancy valuation</div>
                    </div>
                    <div className="metric-card">
                        <h3>Available Plots</h3>
                        <div className="metric-value">{metrics.availableCount} / {mapData.plots.length}</div>
                        <div className="metric-sub">{metrics.availAreaPercent}% sqm available</div>
                    </div>
                </div>

                <div className="metrics-grid">
                    <div className="metric-card">
                        <h3>Total Surface Area</h3>
                        <div className="metric-value">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(metrics.totalArea)} m²</div>
                        <div className="metric-sub">Across all layout vectors</div>
                    </div>
                    <div className="metric-card">
                        <h3>Sales Velocity</h3>
                        <div className="metric-value">{metrics.occupancyRate}%</div>
                        <div className="metric-sub">{metrics.soldCount} sold, {metrics.reservedCount} reserved</div>
                    </div>
                </div>

                <div className="search-filter-box">
                    <div className="search-wrapper">
                        <Search size={16} />
                        <input type="text" placeholder="Search by Plot ID or owner..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="filter-row">
                        {['all', 'available', 'reserved', 'sold', 'premium'].map(f => (
                            <button key={f} className={`btn-filter ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: '10px' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Plot Inventory Explorer</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Showing {filteredPlots.length} plots</span>
                    </label>
                    <div className="plot-list-container">
                        {filteredPlots.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px 0' }}>No matching parcels found</div>
                        ) : (
                            filteredPlots.map(plot => (
                                <div key={plot.id} className={`plot-item ${plot.id === selectedPlotId ? 'selected' : ''}`} onClick={() => setSelectedPlotId(plot.id)}>
                                    <div className="plot-item-info">
                                        <div className="plot-item-id">{plot.id}</div>
                                        <div className="plot-item-area">
                                            {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(plot.area)} SQ.MT. | {currencyFormatter.format(plot.area * plot.price)}
                                        </div>
                                    </div>
                                    <span className={`status-indicator status-${plot.status}`}>{plot.status}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Reference Sketch tracing */}
                <div className="search-filter-box" style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ImageIcon size={16} /> Reference Sketch Tracing
                    </span>
                    
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button className="btn-secondary" style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => refImageInput.current.click()}>
                            <ImagePlus size={14} /> Upload Sketch
                        </button>
                        <input type="file" ref={refImageInput} accept="image/*" style={{ display: 'none' }} onChange={handleRefImageChange} />
                        {mapData.backgroundImage?.href && (
                            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} title="Remove Overlay" onClick={handleClearRefImage}>
                                <ImageOff size={14} />
                            </button>
                        )}
                    </div>

                    {mapData.backgroundImage?.href && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                            <div className="form-group" style={{ gap: '4px' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    <span>Overlay Opacity</span>
                                    <span>{Math.round(mapData.backgroundImage.opacity * 100)}%</span>
                                </label>
                                <input type="range" min="0" max="1" step="0.05" value={mapData.backgroundImage.opacity || 0.5} onChange={(e) => updateBgProps('opacity', parseFloat(e.target.value))} style={{ height: '4px', padding: 0, cursor: 'pointer' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div className="form-group" style={{ gap: '4px' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Width (m)</label>
                                    <input type="number" value={mapData.backgroundImage.width || 1200} step="50" onChange={(e) => updateBgProps('width', parseInt(e.target.value))} style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)' }} />
                                </div>
                                <div className="form-group" style={{ gap: '4px' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Height (m)</label>
                                    <input type="number" value={mapData.backgroundImage.height || 800} step="50" onChange={(e) => updateBgProps('height', parseInt(e.target.value))} style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div className="form-group" style={{ gap: '4px' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Offset X</label>
                                    <input type="number" value={mapData.backgroundImage.x || 100} step="10" onChange={(e) => updateBgProps('x', parseInt(e.target.value))} style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)' }} />
                                </div>
                                <div className="form-group" style={{ gap: '4px' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Offset Y</label>
                                    <input type="number" value={mapData.backgroundImage.y || 100} step="10" onChange={(e) => updateBgProps('y', parseInt(e.target.value))} style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)' }} />
                                </div>
                            </div>
                            
                            <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '8px', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ScanLine size={14} /> CAD Auto-Vectorizer
                                </span>
                                
                                <div className="form-group" style={{ gap: '4px' }}>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                        <span>Line Threshold</span>
                                        <span>{vecThreshold}</span>
                                    </label>
                                    <input type="range" min="30" max="220" value={vecThreshold} onChange={(e) => setVecThreshold(parseInt(e.target.value))} style={{ height: '4px', padding: 0 }} />
                                </div>
                                <button className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.8rem', marginTop: '4px', width: '100%' }}>
                                    <Cpu size={14} /> Run Auto-Vectorizer
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Import section */}
                <div className="import-export-section" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <button className="btn-secondary" style={{ width: '100%' }} onClick={() => fileImportInput.current.click()}>
                        <Upload size={16} /> Import Layout
                    </button>
                    <input type="file" ref={fileImportInput} accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                </div>
            </div>
        </aside>
    );
}
