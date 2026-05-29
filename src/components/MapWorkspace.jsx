import React, { useEffect, useRef } from 'react';
import { Pointer, Move, Maximize, PencilRuler, PlusCircle, Trash2, Type, Milestone, Grid3X3, Palette } from 'lucide-react';
import MapRenderer from '../utils/MapRenderer';

export default function MapWorkspace({ mapData, setMapData, selectedPlotId, setSelectedPlotId, currentTool, setCurrentTool, layers, setLayers, theme, editMode, setEditMode, showToast }) {
    const svgRef = useRef(null);
    const rendererRef = useRef(null);

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
                }
            );
        }
    }, []);

    // Sync state changes into the renderer
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.data = mapData;
            // only call render if not actively dragging, but actually React might trigger this too often, MapRenderer is smart enough.
            rendererRef.current.render();
        }
    }, [mapData]);

    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setSelectedPlot(selectedPlotId);
            
            // Auto-pan if newly selected and not edit mode
            if (selectedPlotId && !editMode) {
                const plot = mapData.plots.find(p => p.id === selectedPlotId);
                if (plot) {
                    const centroid = rendererRef.current.calculateCentroid(plot.points);
                    const rect = svgRef.current.getBoundingClientRect();
                    const targetPanX = (rect.width - 380) / 2 - centroid.x * rendererRef.current.zoom;
                    const targetPanY = rect.height / 2 - centroid.y * rendererRef.current.zoom;
                    
                    rendererRef.current.panX = targetPanX;
                    rendererRef.current.panY = targetPanY;
                    rendererRef.current.render();
                }
            } else if (!selectedPlotId) {
                // Deselect
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

    const handleZoomReset = () => {
        if (rendererRef.current) {
            rendererRef.current.resetZoom();
            showToast("Map workspace reset to global viewport fits", "success");
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
        if (svgRef.current) svgRef.current.style.cursor = "default";
    };

    const handleToolPan = () => {
        setCurrentTool("pan");
        if (svgRef.current) svgRef.current.style.cursor = "grab";
        if (editMode) setEditMode(false);
    };

    const toggleLayer = (key) => {
        setLayers(prev => {
            const next = { ...prev, [key]: !prev[key] };
            if (rendererRef.current) {
                rendererRef.current.toggleLayer(key === 'statusColors' ? 'statusColors' : key, next[key]);
            }
            return next;
        });
    };

    return (
        <main className="map-workspace" id="canvas-workspace">
            <div className="floating-toolbar">
                <div className="toolbar-group">
                    <button className={`btn-icon ${currentTool === 'select' ? 'active' : ''}`} onClick={handleToolSelect} title="Select Tool"><Pointer size={16}/></button>
                    <button className={`btn-icon ${currentTool === 'pan' ? 'active' : ''}`} onClick={handleToolPan} title="Pan Navigation Tool"><Move size={16}/></button>
                    <button className="btn-icon" onClick={handleZoomReset} title="Zoom Fit All"><Maximize size={16}/></button>
                </div>
                <div className="toolbar-group">
                    <button className={`btn-icon ${editMode ? 'active' : ''}`} onClick={() => { if(selectedPlotId) setEditMode(!editMode) }} disabled={!selectedPlotId} title="Edit Plot Boundaries"><PencilRuler size={16}/></button>
                    <button className="btn-icon" onClick={handleAddPlot} title="Add New custom Plot Boundary"><PlusCircle size={16}/></button>
                    <button className="btn-icon" onClick={handleDeletePlot} disabled={!selectedPlotId} title="Delete Selected Plot"><Trash2 size={16}/></button>
                </div>
                <div className="toolbar-group" style={{ paddingRight: 0, marginRight: 0 }}>
                    <button className={`btn-icon ${layers.labels ? 'active' : ''}`} onClick={() => toggleLayer('labels')} title="Toggle Plot Name Labels"><Type size={16}/></button>
                    <button className={`btn-icon ${layers.roads ? 'active' : ''}`} onClick={() => toggleLayer('roads')} title="Toggle Roads Layer"><Milestone size={16}/></button>
                    <button className={`btn-icon ${layers.grids ? 'active' : ''}`} onClick={() => toggleLayer('grids')} title="Toggle Blueprint Grid"><Grid3X3 size={16}/></button>
                    <button className={`btn-icon ${layers.statusColors ? 'active' : ''}`} onClick={() => toggleLayer('statusColors')} title="Toggle Status Accent Colors"><Palette size={16}/></button>
                </div>
            </div>
            <div className="map-indicator-overlay">
                <div className="compass-container">
                    <div className="compass-icon"><div className="compass-pointer"></div></div>
                    <span>NORTH GRID</span>
                </div>
                <div className="scale-container">
                    <div className="scale-bar"></div>
                    <span>50 METERS</span>
                </div>
            </div>
            <svg id="cad-canvas" className="map-svg-container" viewBox="0 0 1600 1000" ref={svgRef}></svg>
            <div id="canvas-tooltip" className="custom-tooltip"></div>
        </main>
    );
}
