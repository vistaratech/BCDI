import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, Map, Landmark, Users, ClipboardList, BarChart3, Settings, LogOut, ChevronDown, ChevronLeft, ChevronRight, Plus, Upload, Edit2, Trash2, X, Video } from 'lucide-react';
import Header from './components/Header';
import VectorizerEngine from './utils/VectorizerEngine';
import SidebarLeft from './components/SidebarLeft';
import SidebarRight from './components/SidebarRight';
import MapWorkspace from './components/MapWorkspace';
import ToastContainer from './components/ToastContainer';
import INITIAL_MAP_DATA from './utils/initialMapData';
import { fetchDatabase, saveFullDatabase, uploadImage } from './utils/api';
import UserPortal from './components/UserPortal';
import BookingsManager from './components/BookingsManager';
import VideosManager from './components/VideosManager';
import DashboardManager from './components/DashboardManager';
import PlotsManager from './components/PlotsManager';
import ClientsManager from './components/ClientsManager';
import ReportsManager from './components/ReportsManager';
import AdminSettings from './components/AdminSettings';

const DEFAULT_SETTINGS = {
    bookingAdvance: 50000,
    supportPhone: "+91 98765 43210",
    supportEmail: "support@bcdidevelopers.in",
    officeAddress: "BCDI Plaza, Highway Road, Vijayamangalam, Erode, Tamil Nadu - 638056"
};

const DEFAULT_PROMO_VIDEOS = [
    {
        id: "vid-1",
        title: "BCDI Prime Meadows - Aerial Drone Tour",
        description: "Watch a high-definition 4K drone walkthrough of our flagship Vijayamangalam project, showcasing internal sub-roads, ready-to-build subplots, and highway connections.",
        url: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-suburban-neighborhood-44365-large.mp4",
        duration: "2:15",
        tag: "Vijayamangalam"
    },
    {
        id: "vid-2",
        title: "Gated Community Site Walkthrough",
        description: "Explore the internal infrastructure, including concrete drainage systems, water supply piping, street lights, and common green parks for residents.",
        url: "https://assets.mixkit.co/videos/preview/mixkit-drone-shot-of-a-green-hillside-under-clouds-50201-large.mp4",
        duration: "1:45",
        tag: "Coimbatore"
    },
    {
        id: "vid-3",
        title: "Future Residential Layout Launch",
        description: "Sneak peek into our upcoming scenic layout project in Madurai, offering rich groundwater, calm surroundings, and quick access to schools and hospitals.",
        url: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-dense-forest-and-meadow-44357-large.mp4",
        duration: "3:02",
        tag: "Madurai Launch"
    }
];

export default function App() {
    const [database, setDatabase] = useState({
        activeLayoutId: "default",
        layouts: [],
        bookings: [],
        videos: [],
        settings: DEFAULT_SETTINGS
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDatabase = async () => {
            try {
                const data = await fetchDatabase();
                
                // One-time migration
                const savedDb = localStorage.getItem("aerostage_multilayouts_database");
                const savedLegacy = localStorage.getItem("aerostage_map_database");

                if ((!data.layouts || data.layouts.length === 0) && (savedDb || savedLegacy)) {
                    showToast("Migrating offline data to cloud database...", "info");
                    let migratedData = null;

                    if (savedDb) {
                        try {
                            migratedData = JSON.parse(savedDb);
                        } catch (e) {
                            console.error("Migration parse error", e);
                        }
                    }

                    if (!migratedData && savedLegacy) {
                        try {
                            const legacyLayoutData = JSON.parse(savedLegacy);
                            migratedData = {
                                activeLayoutId: "default",
                                layouts: [
                                    {
                                        id: "default",
                                        name: "BCDI Layout Sheet",
                                        state: "Tamil Nadu",
                                        district: "Erode",
                                        area: "Vijayamangalam",
                                        ...legacyLayoutData
                                    }
                                ],
                                bookings: [],
                                videos: DEFAULT_PROMO_VIDEOS,
                                settings: DEFAULT_SETTINGS
                            };
                        } catch (e) {
                            console.error("Legacy migration parse error", e);
                        }
                    }

                    if (migratedData) {
                        migratedData.layouts = (migratedData.layouts || []).map(l => ({
                            ...l,
                            state: l.state || "Tamil Nadu",
                            district: l.district || "Erode",
                            area: l.area || "Vijayamangalam"
                        }));
                        migratedData.bookings = migratedData.bookings || [];
                        migratedData.videos = migratedData.videos || DEFAULT_PROMO_VIDEOS;
                        migratedData.settings = migratedData.settings || DEFAULT_SETTINGS;

                        await saveFullDatabase(migratedData);
                        setDatabase(migratedData);
                        showToast("Offline data successfully migrated to PostgreSQL!", "success");
                    } else {
                        const defaultDb = {
                            activeLayoutId: "default",
                            layouts: [
                                {
                                    id: "default",
                                    name: "BCDI Layout Sheet",
                                    state: "Tamil Nadu",
                                    district: "Erode",
                                    area: "Vijayamangalam",
                                    ...INITIAL_MAP_DATA
                                }
                            ],
                            bookings: [],
                            videos: DEFAULT_PROMO_VIDEOS,
                            settings: DEFAULT_SETTINGS
                        };
                        await saveFullDatabase(defaultDb);
                        setDatabase(defaultDb);
                    }
                } else if (!data.layouts || data.layouts.length === 0) {
                    const defaultDb = {
                        activeLayoutId: "default",
                        layouts: [
                            {
                                id: "default",
                                name: "BCDI Layout Sheet",
                                state: "Tamil Nadu",
                                district: "Erode",
                                area: "Vijayamangalam",
                                ...INITIAL_MAP_DATA
                            }
                        ],
                        bookings: [],
                        videos: DEFAULT_PROMO_VIDEOS,
                        settings: DEFAULT_SETTINGS
                    };
                    await saveFullDatabase(defaultDb);
                    setDatabase(defaultDb);
                } else {
                    setDatabase(data);
                }
            } catch (err) {
                console.error("Failed to fetch database from server", err);
                showToast("Connection failed. Using offline cache.", "error");
                
                const savedDb = localStorage.getItem("aerostage_multilayouts_database");
                if (savedDb) {
                    try {
                        setDatabase(JSON.parse(savedDb));
                    } catch (e) {}
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadDatabase();
    }, []);

    const [role, setRole] = useState(() => {
        const path = window.location.pathname;
        const hash = window.location.hash;
        const search = window.location.search;
        if (path === '/admin' || path.startsWith('/admin/') || hash === '#/admin' || hash === '#admin' || search === '?admin' || search.includes('admin')) {
            return "admin";
        }
        return "user";
    });
    const [adminTab, setAdminTab] = useState("dashboard"); // "dashboard", "layouts", "plots", "bookings", "videos", "clients", "reports", "settings"

    const [selectedPlotId, setSelectedPlotId] = useState(null);
    const [currentTool, setCurrentTool] = useState("select");
    const [activeFilter, setActiveFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("bcdi_active_theme");
        return savedTheme || "bcdi";
    });

    // Handle initial theme application to document root html element
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("bcdi_active_theme", theme);
    }, [theme]);

    // Handle path/route tracking to switch roles between user portal and admin panel
    useEffect(() => {
        const checkRoute = () => {
            const path = window.location.pathname;
            const hash = window.location.hash;
            const search = window.location.search;
            if (path === '/admin' || path.startsWith('/admin/') || hash === '#/admin' || hash === '#admin' || search === '?admin' || search.includes('admin')) {
                setRole("admin");
            } else {
                setRole("user");
            }
        };

        window.addEventListener('popstate', checkRoute);
        window.addEventListener('hashchange', checkRoute);
        // Initial sync
        checkRoute();

        return () => {
            window.removeEventListener('popstate', checkRoute);
            window.removeEventListener('hashchange', checkRoute);
        };
    }, []);

    // Reset selected plot and edit mode when navigating away from layouts view
    useEffect(() => {
        if (adminTab !== 'layouts') {
            setSelectedPlotId(null);
            setEditMode(false);
        }
    }, [adminTab]);

    const [layoutsCollapsed, setLayoutsCollapsed] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [navCollapsed, setNavCollapsed] = useState(false);
    const [layoutsMenuExpanded, setLayoutsMenuExpanded] = useState(true);
    const [layers, setLayers] = useState({ labels: true, roads: true, grids: true, statusColors: true });
    const [editMode, setEditMode] = useState(false);
    
    const [toasts, setToasts] = useState([]);

    const refImageInput = useRef(null);
    const [modalConfig, setModalConfig] = useState(null);

    // OCR & Vectorizer States
    const [ocrWords, setOcrWords] = useState([]);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrStatus, setOcrStatus] = useState("");
    
    // Vectorizer settings default values
    const [vecThreshold, setVecThreshold] = useState(165);
    const [vecDilation, setVecDilation] = useState(2);
    const [vecSimplify, setVecSimplify] = useState(3.5);

    const ocrWorkerRef = useRef(null);

    // Clear OCR words when active layout switches
    useEffect(() => {
        setOcrWords([]);
    }, [database.activeLayoutId]);

    const cancelOcr = async () => {
        setOcrLoading(false);
        setOcrStatus("");
        setOcrProgress(0);
        if (ocrWorkerRef.current) {
            try {
                await ocrWorkerRef.current.terminate();
            } catch (e) {
                console.error("Error terminating OCR worker", e);
            }
            ocrWorkerRef.current = null;
        }
        showToast("Layout scan cancelled.", "info");
    };

    // Core vectorization computation logic
    const runAutoVectorization = async (imageSrc, currentOcrWords, fitBounds = null) => {
        showToast("Starting layout auto-vectorization. Computing contours...", "info");
        try {
            const engine = new VectorizerEngine();
            const config = {
                threshold: vecThreshold,
                dilation: vecDilation,
                simplify: vecSimplify,
                bgX: fitBounds ? fitBounds.x : (mapData.backgroundImage?.x !== undefined ? mapData.backgroundImage.x : 0),
                bgY: fitBounds ? fitBounds.y : (mapData.backgroundImage?.y !== undefined ? mapData.backgroundImage.y : 0),
                bgWidth: fitBounds ? fitBounds.width : (mapData.backgroundImage?.width !== undefined ? mapData.backgroundImage.width : 1600),
                bgHeight: fitBounds ? fitBounds.height : (mapData.backgroundImage?.height !== undefined ? mapData.backgroundImage.height : 1000),
                ocrWords: currentOcrWords
            };
            
            const newPlots = await engine.vectorize(imageSrc, config);
            if (newPlots && newPlots.length > 0) {
                setMapData(prev => ({
                    ...prev,
                    plots: newPlots
                }));
                showToast(`Auto-Vectorizer complete! Traced ${newPlots.length} parcel polygons.`, "success");
            } else {
                showToast("Auto-vectorization completed but detected no valid enclosed shapes.", "warning");
            }
        } catch (err) {
            console.error("Vectorization engine failure", err);
            showToast("Failed to vectorize the uploaded layout.", "error");
        }
    };

    // OCR analysis scan using Tesseract
    const runOcr = async (imageSrc, fitBounds = null) => {
        if (!window.Tesseract) {
            showToast("OCR engine (Tesseract.js) is not loaded yet.", "error");
            return;
        }
        setOcrLoading(true);
        setOcrProgress(0);
        setOcrStatus("Scanning layout...");
        
        try {
            const worker = await window.Tesseract.createWorker({
                logger: m => {
                    if (m.status === "recognizing text") {
                        setOcrProgress(Math.round(m.progress * 100));
                        setOcrStatus(`Scanning layout text: ${Math.round(m.progress * 100)}%`);
                    } else {
                        setOcrStatus(m.status);
                    }
                }
            });
            
            ocrWorkerRef.current = worker;
            
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-+ ',
                tessedit_pageseg_mode: '11',
            });
            
            const { data } = await worker.recognize(imageSrc);
            
            // If user cancelled while recognizing
            if (!ocrWorkerRef.current) {
                await worker.terminate();
                return;
            }
            
            const parsedWords = data.words
                .filter(w => w.confidence > 25)
                .map(w => ({
                    text: w.text.trim(),
                    x: (w.bbox.x0 + w.bbox.x1) / 2,
                    y: (w.bbox.y0 + w.bbox.y1) / 2,
                    bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
                    confidence: w.confidence
                }));
            
            const plotNumberCount = parsedWords.filter(w => /^(?:plot|lot|p|l)?[-.]?(\d{1,4}[A-Za-z]?)$/i.test(w.text)).length;
            setOcrWords(parsedWords);
            showToast(`Layout analysis complete. Found ${plotNumberCount} plot numbers.`, "success");
            await worker.terminate();
            ocrWorkerRef.current = null;
            
            // Auto run vectorization
            await runAutoVectorization(imageSrc, parsedWords, fitBounds);
        } catch (err) {
            console.error("OCR analysis failure", err);
            showToast("Failed to perform OCR layout text scan.", "error");
        } finally {
            setOcrLoading(false);
            setOcrStatus("");
            ocrWorkerRef.current = null;
        }
    };

    const handleRefImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
            if (!pdfjsLib) {
                showToast("PDF rendering engine is not loaded yet.", "error");
                return;
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

            const fileReader = new FileReader();
            fileReader.onload = async function () {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement("canvas");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const context = canvas.getContext("2d");
                    
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;
                    
                    const dataUrl = canvas.toDataURL("image/png");
                    
                    // Compute aspect ratio correct bounds inside 1600x1000 viewport box
                    const boxWidth = 1600;
                    const boxHeight = 1000;
                    const boxRatio = boxWidth / boxHeight;
                    const imgRatio = viewport.width / viewport.height;

                    let fitX = 0, fitY = 0, fitW = boxWidth, fitH = boxHeight;
                    if (imgRatio > boxRatio) {
                        fitW = boxWidth;
                        fitH = Math.round(boxWidth / imgRatio);
                        fitX = 0;
                        fitY = Math.round((boxHeight - fitH) / 2);
                    } else {
                        fitH = boxHeight;
                        fitW = Math.round(boxHeight * imgRatio);
                        fitX = Math.round((boxWidth - fitW) / 2);
                        fitY = 0;
                    }

                    setMapData(prev => ({
                        ...prev,
                        backgroundImage: {
                            ...prev.backgroundImage,
                            href: dataUrl,
                            opacity: 1.0,
                            x: fitX,
                            y: fitY,
                            width: fitW,
                            height: fitH,
                            name: file.name
                        }
                    }));
                    showToast("PDF Layout successfully converted. Analyzing text...", "success");
                    runOcr(dataUrl, { x: fitX, y: fitY, width: fitW, height: fitH });

                    // Background upload to Cloudinary
                    try {
                        const blob = await (await fetch(dataUrl)).blob();
                        const imageFile = new File([blob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' });
                        showToast("Uploading layout to cloud storage...", "info");
                        const uploadResult = await uploadImage(imageFile);
                        setMapData(prev => ({
                            ...prev,
                            backgroundImage: {
                                ...prev.backgroundImage,
                                href: uploadResult.url
                            }
                        }));
                        showToast("Layout successfully stored in cloud!", "success");
                    } catch (uploadErr) {
                        console.error("Cloudinary upload failed:", uploadErr);
                        showToast("Cloud storage upload failed. Image remains local.", "error");
                    }

                } catch (err) {
                    console.error("PDF parsing error", err);
                    showToast("Failed to render PDF page.", "error");
                }
            };
            fileReader.readAsArrayBuffer(file);
        } else {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = async () => {
                const boxWidth = 1600;
                const boxHeight = 1000;
                const boxRatio = boxWidth / boxHeight;
                const imgRatio = img.width / img.height;

                let fitX = 0, fitY = 0, fitW = boxWidth, fitH = boxHeight;
                if (imgRatio > boxRatio) {
                    fitW = boxWidth;
                    fitH = Math.round(boxWidth / imgRatio);
                    fitX = 0;
                    fitY = Math.round((boxHeight - fitH) / 2);
                } else {
                    fitH = boxHeight;
                    fitW = Math.round(boxHeight * imgRatio);
                    fitX = Math.round((boxWidth - fitW) / 2);
                    fitY = 0;
                }

                setMapData(prev => ({
                    ...prev,
                    backgroundImage: {
                        ...prev.backgroundImage,
                        href: objectUrl,
                        opacity: 1.0,
                        x: fitX,
                        y: fitY,
                        width: fitW,
                        height: fitH,
                        name: file.name
                    }
                }));
                showToast("Reference layout uploaded. Analyzing text...", "success");
                runOcr(objectUrl, { x: fitX, y: fitY, width: fitW, height: fitH });

                // Background upload to Cloudinary
                try {
                    showToast("Uploading layout to cloud storage...", "info");
                    const uploadResult = await uploadImage(file);
                    setMapData(prev => ({
                        ...prev,
                        backgroundImage: {
                            ...prev.backgroundImage,
                            href: uploadResult.url
                        }
                    }));
                    showToast("Layout successfully stored in cloud!", "success");
                } catch (uploadErr) {
                    console.error("Cloudinary upload failed:", uploadErr);
                    showToast("Cloud storage upload failed. Image remains local.", "error");
                }
            };
            img.src = objectUrl;
        }
    };

    const triggerCreateNewLayout = () => {
        setModalConfig({
            type: 'add',
            title: 'Create New Layout Sheet',
            placeholder: 'e.g. Upper Tiers Plan',
            defaultValue: '',
            onConfirm: (name) => {
                if (name && name.trim()) {
                    handleAddLayout(name.trim());
                }
            }
        });
    };

    const triggerEditLayoutInfo = () => {
        const activeLayout = layouts.find(l => l.id === activeLayoutId);
        if (!activeLayout) return;
        setModalConfig({
            type: 'edit_info',
            title: 'Edit Layout Information',
            defaultValue: {
                name: activeLayout.name,
                state: activeLayout.state || 'Tamil Nadu',
                district: activeLayout.district || 'Erode',
                area: activeLayout.area || 'Vijayamangalam'
            },
            onConfirm: (data) => {
                if (data.name && data.name.trim()) {
                    handleUpdateLayoutInfo(activeLayoutId, data);
                }
            }
        });
    };

    const triggerDeleteLayout = () => {
        const activeLayout = layouts.find(l => l.id === activeLayoutId);
        if (!activeLayout) return;
        setModalConfig({
            type: 'delete',
            title: 'Delete Layout Sheet',
            message: `Are you sure you want to delete layout sheet "${activeLayout.name}"? This action cannot be undone.`,
            onConfirm: () => {
                handleDeleteLayout(activeLayoutId);
            }
        });
    };

    const showToast = useCallback((message, type = "success") => {
        const id = Date.now() + Math.random().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3400); // Wait for transition out
    }, []);

    const isInitialMountRef = useRef(true);

    useEffect(() => {
        if (isLoading) return;
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            return;
        }
        saveFullDatabase(database).catch(err => {
            console.error("Failed to save database to server:", err);
        });
        localStorage.setItem("aerostage_multilayouts_database", JSON.stringify(database));
    }, [database, isLoading]);

    const { activeLayoutId, layouts } = database;
    const mapData = layouts.find(l => l.id === activeLayoutId) || layouts[0];

    const setMapData = useCallback((newDataOrFunc) => {
        setDatabase(prevDb => {
            const activeId = prevDb.activeLayoutId;
            const newLayouts = prevDb.layouts.map(l => {
                if (l.id === activeId) {
                    const updated = typeof newDataOrFunc === 'function' ? newDataOrFunc(l) : newDataOrFunc;
                    return { ...l, ...updated };
                }
                return l;
            });
            return {
                ...prevDb,
                layouts: newLayouts
            };
        });
    }, []);

    const handleAddLayout = useCallback((name) => {
        const newLayoutId = `layout-${Date.now()}`;
        setDatabase(prevDb => {
            const newLayout = {
                id: newLayoutId,
                name: name,
                state: "Tamil Nadu",
                district: "Erode",
                area: "Vijayamangalam",
                canvas: { ...INITIAL_MAP_DATA.canvas },
                backgroundImage: { href: null, opacity: 0.35, x: 0, y: 0, width: 1600, height: 1000 },
                roads: [],
                plots: [],
                hatches: []
            };
            return {
                activeLayoutId: newLayoutId,
                layouts: [...prevDb.layouts, newLayout]
            };
        });
        showToast(`Layout "${name}" created successfully.`, "success");
    }, [showToast]);

    const handleUpdateLayoutInfo = useCallback((id, data) => {
        setDatabase(prevDb => {
            const newLayouts = prevDb.layouts.map(l => {
                if (l.id === id) {
                    return { 
                        ...l, 
                        name: data.name.trim(),
                        state: data.state.trim(),
                        district: data.district.trim(),
                        area: data.area.trim()
                    };
                }
                return l;
            });
            return {
                ...prevDb,
                layouts: newLayouts
            };
        });
        showToast("Layout information updated successfully.", "success");
    }, [showToast]);

    const handleDeleteLayout = useCallback((id) => {
        setDatabase(prevDb => {
            if (prevDb.layouts.length <= 1) {
                showToast("Cannot delete the only layout sheet.", "error");
                return prevDb;
            }
            const newLayouts = prevDb.layouts.filter(l => l.id !== id);
            let nextActiveId = prevDb.activeLayoutId;
            if (prevDb.activeLayoutId === id) {
                nextActiveId = newLayouts[0].id;
            }
            return {
                activeLayoutId: nextActiveId,
                layouts: newLayouts
            };
        });
        showToast("Layout sheet deleted.", "warning");
    }, [showToast]);

    const handleSetActiveLayoutId = useCallback((id) => {
        setDatabase(prevDb => ({
            ...prevDb,
            activeLayoutId: id
        }));
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white font-sans">
                <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <Landmark className="absolute text-emerald-400" size={24} />
                </div>
                <h1 className="mt-6 text-xl font-medium tracking-wide text-slate-200">BCDI Real Estate Portal</h1>
                <p className="mt-2 text-sm text-slate-400">Connecting to Cloud Database...</p>
                <ToastContainer toasts={toasts} />
            </div>
        );
    }

    return (
        <div data-theme={theme} style={{ display: 'flex', flex: 1, flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            {role === 'admin' && (
                <Header 
                    theme={theme}
                    setTheme={setTheme} 
                    mapData={mapData} 
                    showToast={showToast} 
                    role={role}
                    setRole={setRole}
                />
            )}
            
            {role === 'user' ? (
                <UserPortal 
                    database={database}
                    setDatabase={setDatabase}
                    showToast={showToast}
                    theme={theme}
                    setRole={setRole}
                />
            ) : (
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {/* Navigation Sidebar Collapse button */}
                    <button 
                        className="nav-collapse-btn" 
                        style={{ 
                            left: `${navCollapsed ? 12 : 228}px`
                        }}
                        onClick={() => setNavCollapsed(!navCollapsed)}
                        title={navCollapsed ? "Expand Navigation Sidebar" : "Collapse Navigation Sidebar"}
                    >
                        {navCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                    </button>

                    {/* Navigation Sidebar */}
                    <div className={`nav-sidebar ${navCollapsed ? 'collapsed' : ''}`}>
                        <div className="nav-links" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <button className={`nav-item ${adminTab === 'dashboard' ? 'active' : ''}`} onClick={() => setAdminTab('dashboard')}><LayoutDashboard size={18} /> Dashboard</button>
                            
                            <div className="nav-item-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button 
                                    className={`nav-item ${adminTab === 'layouts' ? 'active' : ''}`} 
                                    onClick={() => { setAdminTab('layouts'); setLayoutsMenuExpanded(!layoutsMenuExpanded); }}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Map size={18} /> Layouts
                                    </span>
                                    {!navCollapsed && (layoutsMenuExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                                </button>
                                {!navCollapsed && layoutsMenuExpanded && (
                                    <div className="nav-sub-layout-switcher" style={{ padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sheets</span>
                                            <button 
                                                className="layouts-add-btn" 
                                                title="Create New Layout Sheet" 
                                                onClick={triggerCreateNewLayout}
                                                style={{ width: '18px', height: '18px' }}
                                            >
                                                <Plus size={10} />
                                            </button>
                                        </div>
                                        <select 
                                            value={activeLayoutId} 
                                            onChange={(e) => handleSetActiveLayoutId(e.target.value)}
                                            className="theme-selector"
                                            style={{ width: '100%', padding: '6px 8px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                        >
                                            {layouts.map(l => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-start' }}>
                                            <button 
                                                className="btn-secondary" 
                                                style={{ padding: '6px', borderRadius: 'var(--radius-sm)', flex: 1, display: 'flex', justifyContent: 'center' }} 
                                                title="Upload Reference Layout Image/PDF"
                                                onClick={() => refImageInput.current.click()}
                                            >
                                                <Upload size={12} />
                                            </button>
                                            <button 
                                                className="btn-secondary" 
                                                style={{ padding: '6px', borderRadius: 'var(--radius-sm)', flex: 1, display: 'flex', justifyContent: 'center' }} 
                                                title="Edit Layout Information (Name, State, District, Area)"
                                                onClick={triggerEditLayoutInfo}
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button 
                                                className="btn-secondary" 
                                                style={{ padding: '6px', borderRadius: 'var(--radius-sm)', flex: 1, display: 'flex', justifyContent: 'center', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }} 
                                                title="Delete Layout"
                                                onClick={triggerDeleteLayout}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>

                                        {/* OCR Progress bar within Navigation Sidebar */}
                                        {ocrLoading && (
                                            <div style={{ marginTop: '4px', padding: '10px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                                                <button 
                                                    onClick={cancelOcr}
                                                    style={{ position: 'absolute', top: '8px', right: '8px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                                    title="Cancel Scan"
                                                >
                                                    <X size={10} />
                                                </button>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '4px', color: 'var(--text-primary)', paddingRight: '14px' }}>
                                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '75%' }}>{ocrStatus}</span>
                                                    <span>{ocrProgress}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '1.5px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${ocrProgress}%`, height: '100%', background: 'linear-gradient(to right, var(--primary), var(--accent))', transition: 'width 0.2s ease-out' }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button className={`nav-item ${adminTab === 'plots' ? 'active' : ''}`} onClick={() => setAdminTab('plots')}><Landmark size={18} /> Plots</button>
                            <button className={`nav-item ${adminTab === 'bookings' ? 'active' : ''}`} onClick={() => setAdminTab('bookings')}><ClipboardList size={18} /> Bookings</button>
                            <button className={`nav-item ${adminTab === 'videos' ? 'active' : ''}`} onClick={() => setAdminTab('videos')}><Video size={18} /> Videos</button>
                            <button className={`nav-item ${adminTab === 'clients' ? 'active' : ''}`} onClick={() => setAdminTab('clients')}><Users size={18} /> Clients</button>
                            <button className={`nav-item ${adminTab === 'reports' ? 'active' : ''}`} onClick={() => setAdminTab('reports')}><BarChart3 size={18} /> Reports</button>
                            <button className={`nav-item ${adminTab === 'settings' ? 'active' : ''}`} onClick={() => setAdminTab('settings')}><Settings size={18} /> Settings</button>
                            <button className="nav-item" onClick={() => {
                                if (window.confirm("Are you sure you want to log out from BCDI Admin Panel?")) {
                                    setRole('user');
                                    window.location.href = '/';
                                }
                            }} style={{ marginTop: 'auto', marginBottom: '16px' }}><LogOut size={18} /> Logout</button>
                            
                            {/* Project Switcher Profile Card at the bottom */}
                            <div className="nav-profile-card">
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', flexShrink: 0 }}>
                                    <img src="/logo.jpg" alt="BCDI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                                </div>
                                <div className="nav-profile-info">
                                    <div className="nav-profile-title">BCDI Developers</div>
                                    <div className="nav-profile-subtitle">growth is life...</div>
                                </div>
                                <ChevronDown size={16} className="nav-profile-chevron" />
                            </div>
                        </div>
                    </div>

                    {adminTab === 'dashboard' ? (
                        <DashboardManager 
                            database={database}
                            setAdminTab={setAdminTab}
                            showToast={showToast}
                        />
                    ) : adminTab === 'bookings' ? (
                        <BookingsManager 
                            database={database}
                            setDatabase={setDatabase}
                            showToast={showToast}
                        />
                    ) : adminTab === 'videos' ? (
                        <VideosManager 
                            database={database}
                            setDatabase={setDatabase}
                            showToast={showToast}
                        />
                    ) : adminTab === 'plots' ? (
                        <PlotsManager 
                            database={database}
                            setDatabase={setDatabase}
                            showToast={showToast}
                        />
                    ) : adminTab === 'clients' ? (
                        <ClientsManager 
                            database={database}
                            showToast={showToast}
                        />
                    ) : adminTab === 'reports' ? (
                        <ReportsManager 
                            database={database}
                            showToast={showToast}
                        />
                    ) : adminTab === 'settings' ? (
                        <AdminSettings 
                            database={database}
                            setDatabase={setDatabase}
                            showToast={showToast}
                        />
                    ) : (
                        <>
                            {/* Layouts List Middle Sidebar */}
                            <SidebarLeft 
                                mapData={mapData}
                                setMapData={setMapData}
                                selectedPlotId={selectedPlotId}
                                setSelectedPlotId={setSelectedPlotId}
                                activeFilter={activeFilter}
                                setActiveFilter={setActiveFilter}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                showToast={showToast}
                                collapsed={layoutsCollapsed}
                                isLocked={isLocked}
                                runAutoVectorization={runAutoVectorization}
                                ocrWords={ocrWords}
                                vecThreshold={vecThreshold}
                                setVecThreshold={setVecThreshold}
                                vecDilation={vecDilation}
                                setVecDilation={setVecDilation}
                                vecSimplify={vecSimplify}
                                setVecSimplify={setVecSimplify}
                            />

                            <input 
                                type="file" 
                                ref={refImageInput} 
                                accept="image/*,application/pdf" 
                                style={{ display: 'none' }} 
                                onChange={handleRefImageChange} 
                            />

                            {/* Custom Modal for Naming & Confirmations */}
                            {modalConfig && (
                                <div className="custom-modal-overlay animate-fade-in">
                                    <div className="custom-modal" style={modalConfig.type === 'edit_info' ? { maxWidth: '460px', width: '90%' } : {}}>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>{modalConfig.title}</h3>
                                        {modalConfig.type === 'edit_info' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Layout Sheet Name</label>
                                                    <input 
                                                        type="text" 
                                                        id="edit-info-name"
                                                        defaultValue={modalConfig.defaultValue.name}
                                                        placeholder="e.g. BCDI Layout Sheet"
                                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>State</label>
                                                    <input 
                                                        type="text" 
                                                        id="edit-info-state"
                                                        defaultValue={modalConfig.defaultValue.state}
                                                        placeholder="e.g. Tamil Nadu"
                                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>District</label>
                                                    <input 
                                                        type="text" 
                                                        id="edit-info-district"
                                                        defaultValue={modalConfig.defaultValue.district}
                                                        placeholder="e.g. Erode"
                                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Area / Project Location</label>
                                                    <input 
                                                        type="text" 
                                                        id="edit-info-area"
                                                        defaultValue={modalConfig.defaultValue.area}
                                                        placeholder="e.g. Vijayamangalam"
                                                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                            </div>
                                        ) : modalConfig.type !== 'delete' ? (
                                            <input 
                                                type="text" 
                                                placeholder={modalConfig.placeholder} 
                                                defaultValue={modalConfig.defaultValue}
                                                id="modal-input-field"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        modalConfig.onConfirm(e.target.value);
                                                        setModalConfig(null);
                                                    }
                                                }}
                                                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                            />
                                        ) : (
                                            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '10px 0' }}>{modalConfig.message}</p>
                                        )}
                                        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                            <button className="btn-secondary" onClick={() => setModalConfig(null)} style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}>Cancel</button>
                                            <button 
                                                className="btn-primary" 
                                                onClick={() => {
                                                    if (modalConfig.type === 'edit_info') {
                                                        const name = document.getElementById("edit-info-name").value;
                                                        const state = document.getElementById("edit-info-state").value;
                                                        const district = document.getElementById("edit-info-district").value;
                                                        const area = document.getElementById("edit-info-area").value;
                                                        modalConfig.onConfirm({ name, state, district, area });
                                                    } else {
                                                        const input = document.getElementById("modal-input-field");
                                                        modalConfig.onConfirm(input ? input.value : undefined);
                                                    }
                                                    setModalConfig(null);
                                                }}
                                                style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                                            >
                                                {modalConfig.type === 'delete' ? 'Delete' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sidebar Collapse handle button */}
                            <button 
                                className="sidebar-collapse-btn" 
                                style={{ 
                                    left: `${navCollapsed ? (layoutsCollapsed ? 0 : 340) - 1 : (layoutsCollapsed ? 239 : 579)}px`
                                }}
                                onClick={() => setLayoutsCollapsed(!layoutsCollapsed)}
                                title={layoutsCollapsed ? "Expand Layouts Sidebar" : "Collapse Layouts Sidebar"}
                            >
                                {layoutsCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                            </button>
                            
                            {/* Main Workspace (Map & Header controls) */}
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
                                isLocked={isLocked}
                                setIsLocked={setIsLocked}
                            />

                            {/* Collapsible Selected Plot Inspector Drawer */}
                            <SidebarRight 
                                mapData={mapData}
                                setMapData={setMapData}
                                selectedPlotId={selectedPlotId}
                                setSelectedPlotId={setSelectedPlotId}
                                showToast={showToast}
                                editMode={editMode}
                                setEditMode={setEditMode}
                            />
                        </>
                    )}
                </div>
            )}    
            <ToastContainer toasts={toasts} />
        </div>
    );
}
