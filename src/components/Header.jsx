import React from 'react';
import { RefreshCw, Download } from 'lucide-react';

export default function Header({ theme, setTheme, mapData, showToast, role, setRole }) {
    const handleExport = () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mapData, null, 4));
            const downloadAnchor = document.createElement("a");
            const timestamp = new Date().toISOString().slice(0, 10);
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `bcdi_layout_backup_${timestamp}.json`);
            
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            
            showToast("BCDI Real Estate Layout exported successfully as JSON", "success");
        } catch (e) {
            console.error("Export failures: ", e);
            showToast("Failed to serialize database structures", "error");
        }
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to completely erase your customizations and reset the layout to factory defaults?")) {
            localStorage.removeItem("aerostage_map_database");
            localStorage.removeItem("aerostage_multilayouts_database");
            showToast("Database cleared. Re-assembling defaults...", "warning");
            setTimeout(() => window.location.reload(), 600);
        }
    };

    return (
        <header>
            <div className="logo-container">
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)', boxShadow: '0 2px 8px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', flexShrink: 0 }}>
                    <img src="/logo.jpg" alt="BCDI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                </div>
                <div className="logo-text">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        BCDI <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600 }}>{role === 'admin' ? 'ADMIN' : 'PORTAL'}</span>
                    </h1>
                    <p>Bharathi City Developers of India</p>
                </div>
            </div>

            <div className="header-actions">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>CANVAS VIEW:</span>
                    <select id="theme-selector" className="theme-selector" value={theme} onChange={(e) => {
                        setTheme(e.target.value);
                        showToast(`Theme changed to: ${e.target.options[e.target.selectedIndex].text}`, "success");
                    }}>
                        <option value="bcdi">BCDI Brand (Lime Green - Dark)</option>
                        <option value="bcdi-light">BCDI Brand (Lime Green - Light)</option>
                        <option value="dark">Sleek Dark Mode</option>
                        <option value="light">Sleek Light Mode</option>
                        <option value="blueprint">Blueprint Grid</option>
                        <option value="cad">Technical CAD (Light)</option>
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
