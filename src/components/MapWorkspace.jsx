import React, { useEffect, useRef, useState } from 'react';
import { Pointer, Move, Maximize, PencilRuler, PlusCircle, Trash2, Type, Milestone, Grid3X3, Palette, FileText, Minus, Plus, Settings, Lock, Unlock } from 'lucide-react';
import MapRenderer from '../utils/MapRenderer';

export default function MapWorkspace({ 
    mapData, 
    setMapData, 
    selectedPlotId, 
    setSelectedPlotId, 
    currentTool, 
    setCurrentTool, 
    layers, 
    setLayers, 
    theme, 
    editMode, 
    setEditMode, 
    showToast,
    isLocked,
    setIsLocked,
    isAdmin = true
}) {
    const svgRef = useRef(null);
    const rendererRef = useRef(null);
    const [currentZoom, setCurrentZoom] = useState(0.85);

    // Initialize map renderer once
    useEffect(() => {
        if (svgRef.current && !rendererRef.current) {
            rendererRef.current = new MapRenderer(
                svgRef.current,
                mapData,
                (plotId) => {
                    setSelectedPlotId(plotId);
                },
                (updatedPlot, isDragging) => {
                    setMapData(prev => {
                        const newPlots = prev.plots.map(p => p.id === updatedPlot.id ? updatedPlot : p);
                        return { ...prev, plots: newPlots };
                    });
                },
                (zoomLevel) => {
                    setCurrentZoom(zoomLevel);
                }
            );
        }
    }, []);

    // Sync state changes into the renderer
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.data = mapData;
            rendererRef.current.render();
        }
    }, [mapData]);

    // Pan to selected plot centroid
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setSelectedPlot(selectedPlotId);
            
            // Auto-pan if newly selected, not edit mode, viewport sync is locked, and user is admin
            if (selectedPlotId && !editMode && isLocked && isAdmin) {
                const plot = mapData.plots.find(p => p.id === selectedPlotId);
                if (plot) {
                    const centroid = rendererRef.current.calculateCentroid(plot.points);
                    const rect = svgRef.current.getBoundingClientRect();
                    const targetPanX = (rect.width - 360) / 2 - centroid.x * rendererRef.current.zoom;
                    const targetPanY = rect.height / 2 - centroid.y * rendererRef.current.zoom;
                    
                    rendererRef.current.panX = targetPanX;
                    rendererRef.current.panY = targetPanY;
                    rendererRef.current.updateTransform();
                    rendererRef.current.render();
                }
            } else if (!selectedPlotId) {
                if (rendererRef.current.editMode) {
                    rendererRef.current.setEditMode(false);
                    setEditMode(false);
                }
            }
        }
    }, [selectedPlotId]);

    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setTheme(theme);
        }
    }, [theme]);

    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setEditMode(editMode);
        }
    }, [editMode]);

    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setTool(currentTool);
        }
    }, [currentTool]);

    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setLayers(layers);
        }
    }, [layers]);

    const handleZoomReset = () => {
        if (rendererRef.current) {
            rendererRef.current.resetZoom();
            setCurrentZoom(rendererRef.current.zoom);
            showToast("Map workspace reset to global viewport fits", "success");
        }
    };

    const handleZoomIn = () => {
        if (rendererRef.current) {
            const nextZoom = Math.min(5.0, rendererRef.current.zoom + 0.1);
            rendererRef.current.zoom = nextZoom;
            rendererRef.current.updateTransform();
            rendererRef.current.render();
            setCurrentZoom(nextZoom);
        }
    };

    const handleZoomOut = () => {
        if (rendererRef.current) {
            const nextZoom = Math.max(0.15, rendererRef.current.zoom - 0.1);
            rendererRef.current.zoom = nextZoom;
            rendererRef.current.updateTransform();
            rendererRef.current.render();
            setCurrentZoom(nextZoom);
        }
    };

    const handleAddPlot = () => {
        if (!rendererRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const screenCenterX = rect.width / 2;
        const screenCenterY = rect.height / 2;
        const svgCoords = rendererRef.current.screenToSVG(screenCenterX, screenCenterY);
        
        const cx = svgCoords.x;
        const cy = svgCoords.y;
        const radius = 60;
        const newPoints = [
            [Math.round(cx - radius), Math.round(cy - radius/2)],
            [Math.round(cx), Math.round(cy - radius)],
            [Math.round(cx + radius), Math.round(cy - radius/2)],
            [Math.round(cx + radius), Math.round(cy + radius/2)],
            [Math.round(cx), Math.round(cy + radius)],
            [Math.round(cx - radius), Math.round(cy + radius/2)]
        ];

        let newPlotIndex = mapData.plots.length + 1;
        let newPlotId = `PLOT-${newPlotIndex}`;
        while (mapData.plots.some(p => p.id === newPlotId)) {
            newPlotIndex++;
            newPlotId = `PLOT-${newPlotIndex}`;
        }

        const newPlot = {
            id: newPlotId, status: "available", area: rendererRef.current.calculatePolygonArea(newPoints),
            price: 300, owner: null, notes: "Custom newly-created subdivision block.",
            points: newPoints, labelOffset: { x: 0, y: 0 }
        };

        setMapData(prev => ({ ...prev, plots: [...prev.plots, newPlot] }));
        setSelectedPlotId(newPlotId);
        setEditMode(true);
        showToast(`Plot ${newPlotId} created at center coordinate screen. Drag handle corner nodes to adapt geometry limits.`, "success");
    };

    const handleDeletePlot = () => {
        if (!selectedPlotId) return;
        if (window.confirm(`Are you sure you want to permanently delete Plot boundary "${selectedPlotId}"?`)) {
            setMapData(prev => ({ ...prev, plots: prev.plots.filter(p => p.id !== selectedPlotId) }));
            setSelectedPlotId(null);
            showToast(`Plot ${selectedPlotId} permanently deleted from inventory records`, "warning");
        }
    };

    const handleToolSelect = () => {
        setCurrentTool("select");
    };

    const handleToolPan = () => {
        setCurrentTool("pan");
        if (editMode) setEditMode(false);
    };

    const toggleLayer = (key) => {
        setLayers(prev => ({ ...prev, [key]: !prev[key] }));
    };

    let fileName = mapData.name || "BCDI Layout Sheet";
    if (mapData.backgroundImage?.name) {
        const parts = mapData.backgroundImage.name.split('.');
        const ext = parts.length > 1 ? parts[parts.length - 1] : '';
        if (ext) {
            fileName = `${fileName}.${ext}`;
        }
    } else {
        fileName = `${fileName}.png`;
    }

    return (
        <main className={`map-workspace tool-${currentTool}`} id="canvas-workspace" style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Top Canvas Header Bar */}
            <div className="canvas-header-bar">
                <div className="canvas-file-info">
                    <FileText size={16} />
                    <span>{fileName}</span>
                </div>
                
                <div className="canvas-controls">
                    <button className="btn-canvas-action" onClick={handleZoomReset}>
                        <Maximize size={14} />
                        <span>Fit to Screen</span>
                    </button>
                    
                    <div className="zoom-control-group">
                        <button className="btn-zoom-adjust" onClick={handleZoomOut} title="Zoom Out">
                            <Minus size={14} />
                        </button>
                        <span className="zoom-percent-display">
                            {Math.round(currentZoom * 100)}%
                        </span>
                        <button className="btn-zoom-adjust" onClick={handleZoomIn} title="Zoom In">
                            <Plus size={14} />
                        </button>
                    </div>

                    {isAdmin && (
                        <button 
                            className={`btn-canvas-action ${isLocked ? 'active' : ''}`} 
                            onClick={() => {
                                setIsLocked(!isLocked);
                                showToast(isLocked ? "Viewport synchronization unlocked (manual scrolling)." : "Viewport synchronization locked (auto-focusing).", "info");
                            }} 
                            style={{ padding: '6px' }} 
                            title={isLocked ? "Unlock Viewport Synchronization" : "Lock Viewport Synchronization"}
                        >
                            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Collapsible CAD Tools Toolbar */}
            <div className="floating-toolbar">
                <div className="toolbar-group">
                    <button className={`btn-icon ${currentTool === 'select' ? 'active' : ''}`} onClick={handleToolSelect} title="Select Tool"><Pointer size={16}/></button>
                    <button className={`btn-icon ${currentTool === 'pan' ? 'active' : ''}`} onClick={handleToolPan} title="Pan Navigation Tool"><Move size={16}/></button>
                    <button className="btn-icon" onClick={handleZoomReset} title="Zoom Fit All"><Maximize size={16}/></button>
                </div>
                {isAdmin && (
                    <div className="toolbar-group">
                        <button className={`btn-icon ${editMode ? 'active' : ''}`} onClick={() => { if(selectedPlotId) setEditMode(!editMode) }} disabled={!selectedPlotId} title="Edit Plot Boundaries"><PencilRuler size={16}/></button>
                        <button className="btn-icon" onClick={handleAddPlot} title="Add New custom Plot Boundary"><PlusCircle size={16}/></button>
                        <button className="btn-icon" onClick={handleDeletePlot} disabled={!selectedPlotId} title="Delete Selected Plot"><Trash2 size={16}/></button>
                    </div>
                )}
                <div className="toolbar-group">
                    <button className={`btn-icon ${layers.labels ? 'active' : ''}`} onClick={() => toggleLayer('labels')} title="Toggle Plot Name Labels"><Type size={16}/></button>
                    <button className={`btn-icon ${layers.roads ? 'active' : ''}`} onClick={() => toggleLayer('roads')} title="Toggle Roads Layer"><Milestone size={16}/></button>
                    <button className={`btn-icon ${layers.grids ? 'active' : ''}`} onClick={() => toggleLayer('grids')} title="Toggle Blueprint Grid"><Grid3X3 size={16}/></button>
                    <button className={`btn-icon ${layers.statusColors ? 'active' : ''}`} onClick={() => toggleLayer('statusColors')} title="Toggle Status Accent Colors"><Palette size={16}/></button>
                </div>
            </div>



            {/* Main Interactive SVG */}
            <svg 
                id="cad-canvas" 
                className="map-svg-container" 
                viewBox="0 0 1600 1000" 
                ref={svgRef}
                style={{ flex: 1, width: '100%', height: '100%' }}
            ></svg>
            
            <div id="canvas-tooltip" className="custom-tooltip"></div>
        </main>
    );
}
