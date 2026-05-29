import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import SidebarLeft from './components/SidebarLeft';
import SidebarRight from './components/SidebarRight';
import MapWorkspace from './components/MapWorkspace';
import ToastContainer from './components/ToastContainer';
import INITIAL_MAP_DATA from './utils/initialMapData';

export default function App() {
    const [mapData, setMapData] = useState(() => {
        const savedData = localStorage.getItem("aerostage_map_database");
        if (savedData) {
            try {
                return JSON.parse(savedData);
            } catch (e) {
                console.error("Error reading saved database.", e);
                return { ...INITIAL_MAP_DATA };
            }
        }
        return { ...INITIAL_MAP_DATA };
    });

    const [selectedPlotId, setSelectedPlotId] = useState(null);
    const [currentTool, setCurrentTool] = useState("select");
    const [activeFilter, setActiveFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [theme, setTheme] = useState("dark");
    const [layers, setLayers] = useState({ labels: true, roads: true, grids: true, statusColors: true });
    const [editMode, setEditMode] = useState(false);
    
    const [toasts, setToasts] = useState([]);
    
    const showToast = useCallback((message, type = "success") => {
        const id = Date.now() + Math.random().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3400); // Wait for transition out
    }, []);

    const saveDatabaseState = useCallback((dataToSave) => {
        localStorage.setItem("aerostage_map_database", JSON.stringify(dataToSave));
    }, []);

    useEffect(() => {
        saveDatabaseState(mapData);
    }, [mapData, saveDatabaseState]);

    const handleMapDataChange = useCallback((newData) => {
        setMapData(newData);
    }, []);

    return (
        <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header 
                setTheme={setTheme} 
                mapData={mapData} 
                showToast={showToast} 
            />
            <div className="app-container" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <SidebarLeft 
                    mapData={mapData}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    selectedPlotId={selectedPlotId}
                    setSelectedPlotId={setSelectedPlotId}
                    setMapData={setMapData}
                    showToast={showToast}
                />
                
                <MapWorkspace 
                    mapData={mapData}
                    setMapData={setMapData}
                    selectedPlotId={selectedPlotId}
                    setSelectedPlotId={setSelectedPlotId}
                    currentTool={currentTool}
                    setCurrentTool={setCurrentTool}
                    layers={layers}
                    setLayers={setLayers}
                    theme={theme}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    showToast={showToast}
                />

                <SidebarRight 
                    mapData={mapData}
                    setMapData={setMapData}
                    selectedPlotId={selectedPlotId}
                    setSelectedPlotId={setSelectedPlotId}
                    showToast={showToast}
                />
            </div>
            <ToastContainer toasts={toasts} />
        </div>
    );
}
