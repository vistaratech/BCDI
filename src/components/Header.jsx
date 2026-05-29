import React from 'react';
import { Map, RefreshCw, Download } from 'lucide-react';

export default function Header({ setTheme, mapData, showToast }) {
    const handleExport = () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mapData, null, 4));
            const downloadAnchor = document.createElement("a");
            const timestamp = new Date().toISOString().slice(0, 10);
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `aerostage_layout_backup_${timestamp}.json`);
            
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            
            showToast("Real Estate Layout exported successfully as JSON", "success");
        } catch (e) {
            console.error("Export failures: ", e);
            showToast("Failed to serialize database structures", "error");
        }
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to completely erase your customizations and reset the layout to factory defaults?")) {
            localStorage.removeItem("aerostage_map_database");
            showToast("Database cleared. Re-assembling defaults...", "warning");
            setTimeout(() => window.location.reload(), 600);
        }
    };

    return (
        <header>
            <div className="logo-container">
                <div className="logo-icon">
                    <Map size={24} color="#1d4ed8" />
                </div>
                <div className="logo-text">
                    <h1>AEROSTAGE CAD</h1>
                    <p>Interactive Real Estate Layout Engine</p>
                </div>
            </div>

            <div className="header-actions">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>CANVAS VIEW:</span>
                    <select id="theme-selector" className="theme-selector" onChange={(e) => {
                        setTheme(e.target.value);
                        showToast(`Theme changed to: ${e.target.options[e.target.selectedIndex].text}`, "success");
                    }}>
                        <option value="dark">Sleek Dark Mode</option>
                        <option value="blueprint">Blueprint Grid</option>
                        <option value="cad">Technical CAD</option>
                        <option value="luxury">Luxury Gold</option>
                    </select>
                </div>

                <button id="btn-reset-map" className="btn-secondary" title="Reset map to default values" onClick={handleReset}>
                    <RefreshCw size={16} /> Reset Database
                </button>
                
                <button id="btn-export-json" className="btn-primary" onClick={handleExport}>
                    <Download size={16} /> Export JSON
                </button>
            </div>
        </header>
    );
}
