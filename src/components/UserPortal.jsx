import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    Home, 
    Map, 
    MapPin, 
    Sliders, 
    User, 
    Search, 
    ChevronRight, 
    ClipboardCheck, 
    ArrowLeft, 
    Phone, 
    Mail, 
    CreditCard, 
    CheckCircle, 
    HelpCircle, 
    Ticket, 
    Info, 
    LayoutGrid, 
    Calendar, 
    Filter, 
    Percent, 
    ArrowRight, 
    ShieldCheck, 
    Building2,
    LogOut,
    Video
} from 'lucide-react';
import MapWorkspace from './MapWorkspace';

export default function UserPortal({ 
    database, 
    setDatabase, 
    showToast,
    theme,
    setRole
}) {
    const [activeTab, setActiveTab] = useState('home'); // 'home', 'layouts', 'locations', 'profile', 'settings'
    const [selectedLocation, setSelectedLocation] = useState({
        state: 'Tamil Nadu',
        district: 'Erode',
        layoutId: ''
    });
    const [isExploring, setIsExploring] = useState(false);
    const [userSelectedPlotId, setUserSelectedPlotId] = useState(null);
    const [bookingSuccess, setBookingSuccess] = useState(null);
    const [activeVideo, setActiveVideo] = useState(0);

    const promoVideos = useMemo(() => database.videos || [], [database.videos]);

    // Safely clamp active video index if playlist updates
    useEffect(() => {
        if (promoVideos.length > 0 && activeVideo >= promoVideos.length) {
            setActiveVideo(0);
        }
    }, [promoVideos, activeVideo]);

    // Reset selected plot when navigating away, switching tabs, or changing layouts
    useEffect(() => {
        setUserSelectedPlotId(null);
        setBookingSuccess(null);
    }, [activeTab, isExploring, selectedLocation.layoutId]);

    const systemSettings = useMemo(() => {
        return database.settings || {
            bookingAdvance: 50000,
            supportPhone: "+91 98765 43210",
            supportEmail: "support@bcdidevelopers.in",
            officeAddress: "BCDI Plaza, Highway Road, Vijayamangalam, Erode, Tamil Nadu - 638056"
        };
    }, [database.settings]);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all'); // 'all', 'available', 'premium'

    const [layers, setLayers] = useState({ labels: true, roads: true, grids: false, statusColors: true });
    const [currentTool, setCurrentTool] = useState("select");
    const [isLocked, setIsLocked] = useState(true);

    // User Booking form states
    const [bookingForm, setBookingForm] = useState({
        name: '',
        phone: '',
        email: '',
        advanceAmount: systemSettings.bookingAdvance,
        paymentMethod: 'upi'
    });

    // Profile Lookup state
    const [searchPhone, setSearchPhone] = useState('');
    const [activeUserPhone, setActiveUserPhone] = useState(() => {
        return localStorage.getItem('bcdi_user_session_phone') || '';
    });
    const [activeUserNameState, setActiveUserNameState] = useState(() => {
        return localStorage.getItem('bcdi_user_session_name') || '';
    });

    // Keep state / district dropdowns valid
    const uniqueStates = useMemo(() => {
        const states = database.layouts.map(l => l.state || "Tamil Nadu");
        return [...new Set(states)];
    }, [database.layouts]);

    const uniqueDistricts = useMemo(() => {
        const districts = database.layouts
            .filter(l => (l.state || "Tamil Nadu") === selectedLocation.state)
            .map(l => l.district || "Erode");
        return [...new Set(districts)];
    }, [database.layouts, selectedLocation.state]);

    const matchingLayouts = useMemo(() => {
        return database.layouts.filter(l => 
            (l.state || "Tamil Nadu") === selectedLocation.state &&
            (l.district || "Erode") === selectedLocation.district
        );
    }, [database.layouts, selectedLocation.state, selectedLocation.district]);

    // Handle dropdown transitions
    const handleStateChange = (stateName) => {
        const districts = database.layouts
            .filter(l => (l.state || "Tamil Nadu") === stateName)
            .map(l => l.district || "Erode");
        const nextDistrict = districts[0] || "";
        
        setSelectedLocation({
            state: stateName,
            district: nextDistrict,
            layoutId: ''
        });
    };

    // Auto select first matching layout when location inputs change
    useEffect(() => {
        if (matchingLayouts.length > 0 && !selectedLocation.layoutId) {
            setSelectedLocation(prev => ({ ...prev, layoutId: matchingLayouts[0].id }));
        }
    }, [matchingLayouts, selectedLocation.layoutId]);

    const activeLayout = useMemo(() => {
        return database.layouts.find(l => l.id === selectedLocation.layoutId) || database.layouts[0];
    }, [database.layouts, selectedLocation.layoutId]);

    const setMapData = useCallback((newDataOrFunc) => {
        setDatabase(prevDb => {
            const targetId = selectedLocation.layoutId || (prevDb.layouts[0] && prevDb.layouts[0].id);
            if (!targetId) return prevDb;
            
            const newLayouts = prevDb.layouts.map(l => {
                if (l.id === targetId) {
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
    }, [selectedLocation.layoutId, setDatabase]);

    // Calculate details count for active layout
    const plotsCount = useMemo(() => {
        if (!activeLayout) return { total: 0, available: 0, reserved: 0, sold: 0, premium: 0 };
        const plots = activeLayout.plots.filter(p => !p.classification || p.classification === 'plot');
        return {
            total: plots.length,
            available: plots.filter(p => p.status === 'available').length,
            reserved: plots.filter(p => p.status === 'reserved').length,
            sold: plots.filter(p => p.status === 'sold').length,
            premium: plots.filter(p => p.status === 'premium').length
        };
    }, [activeLayout]);

    // Overall global stats for counts
    const globalStats = useMemo(() => {
        let total = 0, available = 0, sold = 0;
        database.layouts.forEach(l => {
            const plots = l.plots.filter(p => !p.classification || p.classification === 'plot');
            total += plots.length;
            available += plots.filter(p => p.status === 'available' || p.status === 'premium').length;
            sold += plots.filter(p => p.status === 'sold' || p.status === 'reserved').length;
        });
        return { total, available, sold };
    }, [database.layouts]);

    const selectedPlot = useMemo(() => {
        if (!userSelectedPlotId || !activeLayout) return null;
        return activeLayout.plots.find(p => p.id === userSelectedPlotId);
    }, [userSelectedPlotId, activeLayout]);

    // Numerical sort and search filter for plots in sidebar
    const filteredPlots = useMemo(() => {
        if (!activeLayout || !activeLayout.plots) return [];
        return activeLayout.plots
            .filter(p => !p.classification || p.classification === 'plot')
            .filter(p => {
                if (filterCategory === 'available') return p.status === 'available';
                if (filterCategory === 'premium') return p.status === 'premium';
                return true;
            })
            .filter(p => {
                if (!searchQuery.trim()) return true;
                return p.id.toLowerCase().includes(searchQuery.toLowerCase().trim());
            })
            .sort((a, b) => {
                const numA = parseInt(a.id.replace(/\D/g, ''), 10);
                const numB = parseInt(b.id.replace(/\D/g, ''), 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                if (!isNaN(numA)) return -1;
                if (!isNaN(numB)) return 1;
                return a.id.localeCompare(b.id);
            });
    }, [activeLayout, filterCategory, searchQuery]);

    // Unified plot selection callback
    const handleSelectPlot = useCallback((id) => {
        if (id) {
            const plot = activeLayout.plots.find(p => p.id === id);
            if (plot) {
                if (filterCategory === 'available' && plot.status !== 'available') {
                    showToast("Plot is not Available. Filter is set to Available Only.", "warning");
                    return;
                }
                if (filterCategory === 'premium' && plot.status !== 'premium') {
                    showToast("Plot is not Premium. Filter is set to Premium Only.", "warning");
                    return;
                }
            }
        }
        setUserSelectedPlotId(id);
        setBookingSuccess(null);
    }, [activeLayout, filterCategory, showToast]);

    // Handle plot booking submission
    const handleBookPlot = (e) => {
        e.preventDefault();
        if (!selectedPlot || !activeLayout) return;

        const bookingId = `BK-${Date.now()}`;
        const newBooking = {
            id: bookingId,
            layoutId: activeLayout.id,
            layoutName: activeLayout.name,
            plotId: selectedPlot.id,
            customerName: bookingForm.name.trim(),
            customerPhone: bookingForm.phone.trim(),
            customerEmail: bookingForm.email.trim(),
            amountPaid: parseFloat(bookingForm.advanceAmount) || systemSettings.bookingAdvance,
            date: new Date().toISOString(),
            status: 'pending' // pending approval from admin
        };

        // Update database: add booking record and set plot status to reserved
        setDatabase(prev => {
            const newBookings = [...(prev.bookings || []), newBooking];
            const newLayouts = prev.layouts.map(l => {
                if (l.id === activeLayout.id) {
                    return {
                        ...l,
                        plots: l.plots.map(p => {
                            if (p.id === selectedPlot.id) {
                                return { ...p, status: 'reserved' };
                            }
                            return p;
                        })
                    };
                }
                return l;
            });
            return {
                ...prev,
                layouts: newLayouts,
                bookings: newBookings
            };
        });

        // Set active user session
        localStorage.setItem('bcdi_user_session_phone', newBooking.customerPhone);
        localStorage.setItem('bcdi_user_session_name', newBooking.customerName);
        setActiveUserPhone(newBooking.customerPhone);
        setActiveUserNameState(newBooking.customerName);

        setBookingSuccess(newBooking);
        showToast(`Plot ${selectedPlot.id} successfully reserved! Booking ID: ${bookingId}`, "success");
        
        // Reset form
        setBookingForm({
            name: '',
            phone: '',
            email: '',
            advanceAmount: systemSettings.bookingAdvance,
            paymentMethod: 'upi'
        });
    };

    // Filter bookings matching active user
    const userBookings = useMemo(() => {
        if (!activeUserPhone) return [];
        return (database.bookings || []).filter(b => b.customerPhone === activeUserPhone);
    }, [database.bookings, activeUserPhone]);

    const activeUserName = useMemo(() => {
        if (activeUserNameState) return activeUserNameState;
        if (userBookings.length > 0) {
            // Find the latest name used
            const sorted = [...userBookings].sort((a, b) => b.date.localeCompare(a.date));
            return sorted[0].customerName;
        }
        return '';
    }, [activeUserNameState, userBookings]);

    const handleSearchBookingsByPhone = (e) => {
        e.preventDefault();
        if (!searchPhone.trim()) return;
        const trimmedPhone = searchPhone.trim();
        localStorage.setItem('bcdi_user_session_phone', trimmedPhone);
        setActiveUserPhone(trimmedPhone);

        // Auto-extract name if bookings match
        const matchingBookings = (database.bookings || []).filter(b => b.customerPhone === trimmedPhone);
        if (matchingBookings.length > 0) {
            const sorted = [...matchingBookings].sort((a, b) => b.date.localeCompare(a.date));
            const name = sorted[0].customerName;
            localStorage.setItem('bcdi_user_session_name', name);
            setActiveUserNameState(name);
        } else {
            localStorage.removeItem('bcdi_user_session_name');
            setActiveUserNameState('');
        }

        showToast(`Found bookings matching ${trimmedPhone}`, "info");
    };

    const handleLogoutSession = () => {
        localStorage.removeItem('bcdi_user_session_phone');
        localStorage.removeItem('bcdi_user_session_name');
        setActiveUserPhone('');
        setActiveUserNameState('');
        setSearchPhone('');
        showToast("Logged out of session.", "info");
    };

    const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    // Switch to layout exploring from home ads
    const handleExploreLayoutFromAd = (layoutId, stateName, districtName) => {
        setSelectedLocation({
            state: stateName,
            district: districtName,
            layoutId: layoutId
        });
        setIsExploring(true);
        setActiveTab('layouts');
        setUserSelectedPlotId(null);
        setBookingSuccess(null);
    };

    return (
        <div className="user-portal-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-main)' }}>
            
            {/* Blurry Glassmorphic Consumer Navbar */}
            <nav className="user-navbar" style={{
                height: '64px',
                background: 'var(--bg-panel)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                backdropFilter: 'blur(16px)',
                zIndex: 100,
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
                            <img src="/logo.jpg" alt="BCDI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px', lineHeight: '1.2' }}>BCDI PORTAL</span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500 }}>Bharathi City Developers</span>
                        </div>
                    </div>

                    {/* Nav tabs bar */}
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                        {[
                            { id: 'home', label: 'Home', icon: <Home size={14} /> },
                            { id: 'layouts', label: 'Layout Maps', icon: <Map size={14} /> },
                            { id: 'locations', label: 'Locations', icon: <MapPin size={14} /> },
                            { id: 'profile', label: 'My Bookings', icon: <Ticket size={14} /> },
                            { id: 'settings', label: 'Settings', icon: <Sliders size={14} /> },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setActiveTab(t.id);
                                    if (t.id !== 'layouts') {
                                        setIsExploring(false);
                                    }
                                }}
                                className={`user-nav-item ${activeTab === t.id ? 'active' : ''}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: '30px',
                                    border: 'none',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    background: activeTab === t.id ? 'var(--primary)' : 'transparent',
                                    color: activeTab === t.id ? '#ffffff' : 'var(--text-secondary)'
                                }}
                            >
                                {t.icon}
                                <span>{t.label}</span>
                                {t.id === 'profile' && userBookings.length > 0 && (
                                    <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '10px', marginLeft: '4px' }}>
                                        {userBookings.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {activeUserPhone && (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            padding: '8px 16px', 
                            background: 'var(--bg-input)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '30px', 
                            fontSize: '0.8rem', 
                            fontWeight: 600,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                                <span style={{ 
                                    width: '6px', 
                                    height: '6px', 
                                    borderRadius: '50%', 
                                    background: 'var(--color-available)', 
                                    boxShadow: '0 0 8px var(--color-available)',
                                    display: 'inline-block'
                                }} title="Session Active" />
                                <User size={14} style={{ color: 'var(--primary)' }} />
                                <span>{activeUserName ? activeUserName : activeUserPhone}</span>
                            </div>
                            <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />
                            <button 
                                onClick={handleLogoutSession} 
                                style={{ 
                                    border: 'none', 
                                    background: 'transparent', 
                                    color: '#ef4444', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    padding: 0,
                                    transition: 'transform 0.2s ease'
                                }} 
                                title="Log out session"
                                className="logout-hover-effect"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* Content Tabs Workspace */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                
                {/* 1. HOME TAB */}
                {activeTab === 'home' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '40px' }} className="animate-fade-in">
                        
                        {/* Hero Section Banner */}
                        <div className="hero-banner" style={{
                            background: 'linear-gradient(135deg, rgba(118, 153, 4, 0.08) 0%, rgba(30, 41, 59, 0.5) 100%)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '60px 40px',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                            flexShrink: 0
                        }}>
                            <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '300px', height: '300px', background: 'var(--primary-glow)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 0 }} />
                            <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '300px', height: '300px', background: 'var(--accent-glow)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 0 }} />

                            <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--primary)' }}>Welcome to BCDI Developers Portal</span>
                                <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.25' }}>
                                    Find Your Perfect Plot & Build Your Dream Land
                                </h1>
                                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                    Explore authentic layout plans across South India. Check real-time plot availability, sizes, prices, and reserve your subdivision parcel instantly with a cinema-ticket style interface.
                                </p>
                                
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
                                    <button 
                                        className="btn-primary" 
                                        onClick={() => { setActiveTab('layouts'); setIsExploring(false); }}
                                        style={{ padding: '12px 24px', borderRadius: '30px', fontSize: '0.88rem', fontWeight: 600, gap: '8px' }}
                                    >
                                        Explore Map Layouts <ArrowRight size={16} />
                                    </button>
                                    <button 
                                        className="btn-secondary" 
                                        onClick={() => setActiveTab('locations')}
                                        style={{ padding: '12px 24px', borderRadius: '30px', fontSize: '0.88rem', fontWeight: 600 }}
                                    >
                                        Browse Locations
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Global Statistics KPIs Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', flexShrink: 0 }}>
                            <div className="kpi-card" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '12px', borderRadius: '50%' }}>
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{database.layouts.length}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Active Projects</span>
                                </div>
                            </div>

                            <div className="kpi-card" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-available)', padding: '12px', borderRadius: '50%' }}>
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{globalStats.available}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Available Plots</span>
                                </div>
                            </div>

                            <div className="kpi-card" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-sold)', padding: '12px', borderRadius: '50%' }}>
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{globalStats.sold}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Sold subdivisions</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Project Video Walkthroughs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>
                            <div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Building2 size={18} style={{ color: 'var(--primary)' }} /> BCDI Project Video Walkthroughs
                                </h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Take a virtual drone tour and explore the site development progress of our prime lands.</p>
                            </div>

                            {promoVideos.length > 0 ? (
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1.6fr 1fr', 
                                    gap: '24px',
                                    background: 'var(--bg-panel)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '24px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                    overflow: 'hidden'
                                }}>
                                    {/* Left: Active Video Player */}
                                    <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000000', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {promoVideos[activeVideo] && (
                                            <>
                                                <video 
                                                    key={activeVideo}
                                                    src={promoVideos[activeVideo].url}
                                                    controls
                                                    autoPlay
                                                    loop
                                                    muted
                                                    playsInline
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                                <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', color: 'var(--primary)', fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {promoVideos[activeVideo].tag}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Right: Playlist / Selection cards */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {promoVideos.map((video, idx) => {
                                            const isActive = idx === activeVideo;
                                            return (
                                                <div 
                                                    key={video.id || idx}
                                                    onClick={() => setActiveVideo(idx)}
                                                    style={{
                                                        padding: '14px',
                                                        background: isActive ? 'var(--primary-glow)' : 'rgba(255,255,255,0.01)',
                                                        border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '6px',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    className="video-playlist-item"
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: isActive ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                                                            {video.tag}
                                                        </span>
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{video.duration}</span>
                                                    </div>
                                                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>{video.title}</h4>
                                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {video.description}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    background: 'var(--bg-panel)',
                                    border: '1px dashed var(--border-color)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '48px 24px',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <Video size={48} style={{ opacity: 0.15 }} />
                                    <p style={{ fontSize: '0.85rem' }}>No promotional drone shots or walkthrough videos configured.</p>
                                </div>
                            )}
                        </div>

                        {/* Client Sliding Advertisements & Hot Listings */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Percent size={18} style={{ color: 'var(--primary)' }} /> Featured BCDI Plot Advertisements
                                    </h2>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Exclusive land listings and hot deals updated directly from our admin layouts.</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                                
                                {/* Ad 1: Vijayamangalam Main Road */}
                                <div className="ad-card" style={{
                                    background: 'linear-gradient(rgba(15,18,25,0.7), rgba(15,18,25,0.9)), url("/blank_layout.png")',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: '260px',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                    transition: 'transform 0.3s ease, border-color 0.3s ease'
                                }}>
                                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ background: '#a3c90e', color: '#000', fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>Fast Selling</span>
                                            <span style={{ color: '#ffffff', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <MapPin size={12} style={{ color: '#a3c90e' }} /> Vijayamangalam
                                            </span>
                                        </div>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>BCDI Prime Meadows - Phase 1</h3>
                                        <p style={{ fontSize: '0.78rem', color: '#9ca3af', lineHeight: '1.5' }}>
                                            Premium gated land plots starting from 150m² with 9.00m internal wide roads and dual highway access connectivity.
                                        </p>
                                        <div style={{ display: 'flex', gap: '16px', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.65rem', color: '#9ca3af' }}>Price per m²</span>
                                                <strong style={{ color: '#a3c90e', fontSize: '0.9rem' }}>₹4,500 / m²</strong>
                                            </div>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.65rem', color: '#9ca3af' }}>Availability</span>
                                                <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>Booking Open</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleExploreLayoutFromAd('default', 'Tamil Nadu', 'Erode')}
                                        style={{ width: '100%', padding: '12px', background: '#a3c90e', color: '#000', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    >
                                        Open Layout Map <ChevronRight size={14} />
                                    </button>
                                </div>

                                {/* Ad 2: Custom Layout / Luxury Zone */}
                                <div className="ad-card" style={{
                                    background: 'linear-gradient(rgba(15,18,25,0.7), rgba(15,18,25,0.9)), url("/blank_layout.png")',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'bottom',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: '260px',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                    transition: 'transform 0.3s ease, border-color 0.3s ease'
                                }}>
                                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ background: '#a855f7', color: '#ffffff', fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>Exclusive Deal</span>
                                            <span style={{ color: '#ffffff', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <MapPin size={12} style={{ color: '#a855f7' }} /> Coimbatore
                                            </span>
                                        </div>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>BCDI Green Acres - Premium Corners</h3>
                                        <p style={{ fontSize: '0.78rem', color: '#9ca3af', lineHeight: '1.5' }}>
                                            Corner plots situated in lush green surroundings with individual water connections, ready for construction.
                                        </p>
                                        <div style={{ display: 'flex', gap: '16px', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.65rem', color: '#9ca3af' }}>Price per m²</span>
                                                <strong style={{ color: '#a855f7', fontSize: '0.9rem' }}>₹6,200 / m²</strong>
                                            </div>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.65rem', color: '#9ca3af' }}>Occupancy status</span>
                                                <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>Limited Slots</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            // Fallback to first available layout or default
                                            const l = database.layouts[0];
                                            handleExploreLayoutFromAd(l.id, l.state || 'Tamil Nadu', l.district || 'Erode');
                                        }}
                                        style={{ width: '100%', padding: '12px', background: '#a855f7', color: '#ffffff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    >
                                        Open Layout Map <ChevronRight size={14} />
                                    </button>
                                </div>

                                {/* Ad 3: general booking promo */}
                                <div className="ad-card" style={{
                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: '260px',
                                    color: '#ffffff',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)'
                                }}>
                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                        <div style={{ background: 'rgba(255,255,255,0.15)', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Percent size={20} />
                                        </div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Exclusive Booking Discount</h3>
                                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5' }}>
                                            Book your plot reservation online today and secure a flat ₹10,000 off on the final land registry cost. Minimum booking advance ₹10,000.
                                        </p>
                                        <p style={{ fontSize: '0.72rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                                            *Offer valid on bookings confirmed by admins within 7 days of online submission.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => { setActiveTab('layouts'); setIsExploring(false); }}
                                        style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: 'none', borderTop: '1px solid rgba(255,255,255,0.2)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    >
                                        Explore and Reserve <ArrowRight size={14} />
                                    </button>
                                </div>

                            </div>
                        </div>

                    </div>
                )}

                {/* 2. LAYOUTS TAB */}
                {activeTab === 'layouts' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        
                        {!isExploring ? (
                            /* Selection landing page */
                            <div className="portal-landing-container" style={{ 
                                flex: 1, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                padding: '40px 20px',
                                background: 'var(--bg-main)',
                                backgroundImage: 'radial-gradient(var(--grid-minor) 1.5px, transparent 0)',
                                backgroundSize: '24px 24px',
                                overflowY: 'auto'
                            }}>
                                <div className="portal-card" style={{
                                    width: '100%',
                                    maxWidth: '600px',
                                    background: 'var(--bg-panel)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '32px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                    backdropFilter: 'blur(16px)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '24px'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'inline-flex', padding: '12px', background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: '50%', marginBottom: '16px' }}>
                                            <MapPin size={32} />
                                        </div>
                                        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Interactive Booking System</h2>
                                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Select your state and district to view matching housing layout sheets.</p>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group">
                                            <label>Select State</label>
                                            <select 
                                                value={selectedLocation.state} 
                                                onChange={e => handleStateChange(e.target.value)}
                                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '100%' }}
                                            >
                                                {uniqueStates.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Select District</label>
                                            <select 
                                                value={selectedLocation.district} 
                                                onChange={e => setSelectedLocation({...selectedLocation, district: e.target.value, layoutId: ''})}
                                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '100%' }}
                                            >
                                                {uniqueDistricts.length === 0 ? (
                                                    <option value="">No Districts Available</option>
                                                ) : uniqueDistricts.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {matchingLayouts.length === 0 ? (
                                        <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--radius-sm)', color: '#ef4444', textAlign: 'center', fontSize: '0.85rem' }}>
                                            No layouts registered in {selectedLocation.district}, {selectedLocation.state}. Please check another location.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Available Layout Projects</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {matchingLayouts.map(l => {
                                                    const total = l.plots.filter(p => !p.classification || p.classification === 'plot').length;
                                                    const avail = l.plots.filter(p => p.status === 'available' || p.status === 'premium').length;
                                                    const isSelected = selectedLocation.layoutId === l.id;
                                                    
                                                    return (
                                                        <div 
                                                            key={l.id}
                                                            onClick={() => setSelectedLocation(prev => ({ ...prev, layoutId: l.id }))}
                                                            style={{
                                                                padding: '16px',
                                                                background: isSelected ? 'var(--primary-glow)' : 'rgba(255,255,255,0.01)',
                                                                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        >
                                                            <div>
                                                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block' }}>{l.name}</strong>
                                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Location: {l.area || 'Vijayamangalam'}</span>
                                                            </div>
                                                            <div style={{ textAlign: 'right', fontSize: '0.78rem' }}>
                                                                <strong style={{ color: 'var(--color-available)' }}>{avail} / {total} Plots</strong>
                                                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Available</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        className="btn-primary" 
                                        onClick={() => {
                                            if (selectedLocation.layoutId) {
                                                setIsExploring(true);
                                            } else {
                                                showToast("Please select a layout project first.", "warning");
                                            }
                                        }}
                                        disabled={matchingLayouts.length === 0}
                                        style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '0.95rem', gap: '10px' }}
                                    >
                                        Explore Map & Book Plots <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Map Explorer page */
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                                <div style={{ 
                                    background: 'var(--bg-panel)', 
                                    borderBottom: '1px solid var(--border-color)', 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 16px',
                                    zIndex: 50,
                                    flexShrink: 0,
                                    gap: '16px',
                                    flexWrap: 'wrap'
                                }}>
                                    {/* Left: Navigation and Location info */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button 
                                            className="btn-secondary" 
                                            onClick={() => {
                                                setIsExploring(false);
                                                setUserSelectedPlotId(null);
                                                setBookingSuccess(null);
                                            }}
                                            style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '6px' }}
                                        >
                                            <ArrowLeft size={14} /> Back to Locations
                                        </button>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            <MapPin size={13} style={{ color: 'var(--primary)' }} />
                                            <span>{selectedLocation.state} / {selectedLocation.district} / {activeLayout.name}</span>
                                        </div>
                                    </div>

                                    {/* Center: Booking Occupancy Progress Bar */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                        <Building2 size={12} style={{ color: 'var(--primary)' }} />
                                        <span>Occupancy:</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>
                                            {plotsCount.total > 0 ? Math.round(((plotsCount.sold + plotsCount.reserved) / plotsCount.total) * 100) : 0}%
                                        </strong>
                                        <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ 
                                                width: `${plotsCount.total > 0 ? ((plotsCount.sold + plotsCount.reserved) / plotsCount.total) * 100 : 0}%`, 
                                                height: '100%', 
                                                background: 'linear-gradient(to right, var(--color-reserved), var(--color-sold))', 
                                                borderRadius: '3px' 
                                            }} />
                                        </div>
                                    </div>

                                    {/* Right: Status Legend Indicators & Filter Selector */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        {/* Status legends */}
                                        <div style={{ display: 'flex', gap: '10px', fontSize: '0.68rem', fontWeight: 600 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-available)' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-available)' }} /> Avail ({plotsCount.available})
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-premium)' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-premium)' }} /> Prem ({plotsCount.premium})
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-reserved)' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-reserved)' }} /> Res ({plotsCount.reserved})
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-sold)' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-sold)' }} /> Sold ({plotsCount.sold})
                                            </span>
                                        </div>

                                        {/* Filters */}
                                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                            <button 
                                                onClick={() => setFilterCategory('all')} 
                                                className={`btn-filter ${filterCategory === 'all' ? 'active' : ''}`}
                                                style={{ padding: '3px 6px', fontSize: '0.68rem', border: 'none', borderRadius: '2px', cursor: 'pointer' }}
                                            >
                                                All
                                            </button>
                                            <button 
                                                onClick={() => setFilterCategory('available')} 
                                                className={`btn-filter ${filterCategory === 'available' ? 'active' : ''}`}
                                                style={{ padding: '3px 6px', fontSize: '0.68rem', border: 'none', borderRadius: '2px', cursor: 'pointer' }}
                                            >
                                                Available
                                            </button>
                                            <button 
                                                onClick={() => setFilterCategory('premium')} 
                                                className={`btn-filter ${filterCategory === 'premium' ? 'active' : ''}`}
                                                style={{ padding: '3px 6px', fontSize: '0.68rem', border: 'none', borderRadius: '2px', cursor: 'pointer' }}
                                            >
                                                Premium
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Map and Checkout workspace split */}
                                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                                    {/* Left Sidebar: Plots Directory */}
                                    <aside className="plots-sidebar" style={{
                                        width: '280px',
                                        flexShrink: 0,
                                        borderRight: '1px solid var(--border-color)',
                                        background: 'var(--bg-panel)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                        zIndex: 40,
                                        overflow: 'hidden'
                                    }}>
                                        {/* Sidebar Header with Title & Count */}
                                        <div style={{
                                            padding: '16px 20px',
                                            borderBottom: '1px solid var(--border-color)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px', margin: 0 }}>
                                                    PLOTS DIRECTORY
                                                </h3>
                                                <span style={{ 
                                                    fontSize: '0.7rem', 
                                                    color: 'var(--primary)', 
                                                    background: 'var(--primary-glow)', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '10px',
                                                    fontWeight: 700
                                                }}>
                                                    {filteredPlots.length} Plots
                                                </span>
                                            </div>
                                            
                                            {/* Search box input */}
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                                                <input 
                                                    type="text" 
                                                    placeholder="Search plot number..." 
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px 8px 34px',
                                                        fontSize: '0.8rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: 'var(--bg-input)',
                                                        border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)',
                                                        outline: 'none',
                                                        transition: 'border-color 0.2s ease'
                                                    }}
                                                    className="sidebar-search-input"
                                                />
                                            </div>
                                        </div>

                                        {/* Scrollable Plots List */}
                                        <div style={{
                                            flex: 1,
                                            overflowY: 'auto',
                                            padding: '12px 16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }} className="custom-scrollbar">
                                            {filteredPlots.length === 0 ? (
                                                <div style={{ 
                                                    textAlign: 'center', 
                                                    padding: '40px 10px', 
                                                    color: 'var(--text-muted)', 
                                                    fontSize: '0.78rem' 
                                                }}>
                                                    No matching plots found
                                                </div>
                                            ) : (
                                                filteredPlots.map(p => {
                                                    const isSelected = userSelectedPlotId === p.id;
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => handleSelectPlot(p.id)}
                                                            className={`plot-list-item ${isSelected ? 'selected' : ''}`}
                                                            style={{
                                                                padding: '12px 14px',
                                                                background: isSelected ? 'var(--primary-glow)' : 'rgba(255,255,255,0.01)',
                                                                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <span style={{ 
                                                                    fontSize: '0.85rem', 
                                                                    fontWeight: 700, 
                                                                    color: isSelected ? 'var(--primary)' : 'var(--text-primary)' 
                                                                }}>
                                                                    {p.id}
                                                                </span>
                                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                                    {p.area ? `${p.area.toFixed(1)} m²` : 'N/A'}
                                                                </span>
                                                            </div>
                                                            
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span className={`status-badge-pill badge-${p.status}`} style={{
                                                                    fontSize: '0.62rem',
                                                                    fontWeight: 700,
                                                                    padding: '2px 8px',
                                                                    borderRadius: '20px',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.2px'
                                                                }}>
                                                                    {p.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </aside>

                                    <MapWorkspace 
                                        mapData={activeLayout}
                                        setMapData={setMapData}
                                        selectedPlotId={userSelectedPlotId}
                                        setSelectedPlotId={handleSelectPlot}
                                        currentTool={currentTool}
                                        setCurrentTool={setCurrentTool}
                                        layers={layers}
                                        setLayers={setLayers}
                                        theme={theme}
                                        editMode={false}
                                        setEditMode={() => {}}
                                        showToast={showToast}
                                        isLocked={isLocked}
                                        setIsLocked={setIsLocked}
                                        isAdmin={false}
                                    />

                                    {/* Sidebar booking details drawer */}
                                    <aside className={`editor-panel ${userSelectedPlotId ? '' : 'collapsed'}`} style={{ width: '360px', flexShrink: 0, top: 0, height: '100%' }}>
                                        {selectedPlot && (
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <div className="panel-header" style={{ padding: '16px 20px' }}>
                                                    <h2 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <ClipboardCheck size={18} style={{ color: 'var(--primary)' }} /> Booking Details
                                                    </h2>
                                                    <button className="btn-icon" onClick={() => { setUserSelectedPlotId(null); setBookingSuccess(null); }}>✕</button>
                                                </div>

                                                <div className="panel-content" style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                                                    
                                                    {bookingSuccess ? (
                                                        /* 3. BOOKING TICKET RECEIPT DESIGN - Perforated movie ticket style */
                                                        <div className="perforated-ticket" style={{
                                                            background: 'linear-gradient(135deg, #1f2330 0%, #151821 100%)',
                                                            border: '1px solid rgba(255,255,255,0.06)',
                                                            borderRadius: '12px',
                                                            overflow: 'hidden',
                                                            boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            position: 'relative'
                                                        }}>
                                                            {/* Half-circles on left & right for ticket notch */}
                                                            <div style={{ position: 'absolute', left: '-8px', top: '56%', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-panel)', zIndex: 5, borderRight: '1px solid rgba(255,255,255,0.06)' }} />
                                                            <div style={{ position: 'absolute', right: '-8px', top: '56%', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-panel)', zIndex: 5, borderLeft: '1px solid rgba(255,255,255,0.06)' }} />

                                                            {/* Ticket Header */}
                                                            <div style={{ padding: '20px', borderBottom: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                                                <div style={{ color: 'var(--color-available)', background: 'var(--color-available-glow)', padding: '10px', borderRadius: '50%', display: 'inline-flex', marginBottom: '10px' }}>
                                                                    <CheckCircle size={28} />
                                                                </div>
                                                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Reservation Logged</h3>
                                                                <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '1px' }}>Awaiting Admin Verification</span>
                                                            </div>

                                                            {/* Ticket Body */}
                                                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span style={{ color: 'var(--text-muted)' }}>Ticket ID</span>
                                                                    <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{bookingSuccess.id}</strong>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span style={{ color: 'var(--text-muted)' }}>Layout Plan</span>
                                                                    <strong style={{ color: 'var(--text-primary)' }}>{bookingSuccess.layoutName}</strong>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span style={{ color: 'var(--text-muted)' }}>Plot Reserved</span>
                                                                    <strong style={{ color: 'var(--primary)' }}>{bookingSuccess.plotId}</strong>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span style={{ color: 'var(--text-muted)' }}>Client Name</span>
                                                                    <strong style={{ color: 'var(--text-primary)' }}>{bookingSuccess.customerName}</strong>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span style={{ color: 'var(--text-muted)' }}>Phone Number</span>
                                                                    <strong style={{ color: 'var(--text-primary)' }}>{bookingSuccess.customerPhone}</strong>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span style={{ color: 'var(--text-muted)' }}>Advance paid</span>
                                                                    <strong style={{ color: 'var(--color-available)' }}>{currencyFormatter.format(bookingSuccess.amountPaid)}</strong>
                                                                </div>
                                                            </div>

                                                            {/* Ticket Stub (perforated section) */}
                                                            <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px dashed rgba(255,255,255,0.08)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                                                                
                                                                {/* Simulated Barcode */}
                                                                <div className="barcode" style={{ display: 'flex', height: '32px', background: 'transparent', gap: '2px', opacity: 0.6, width: '100%', justifyContent: 'center' }}>
                                                                    {[1,3,1,4,2,1,3,2,1,4,2,3,1,2,1,4,1,2,3,1,2,4,1,3,1,2].map((w, i) => (
                                                                        <span key={i} style={{ width: `${w}px`, height: '100%', background: 'var(--text-primary)' }} />
                                                                    ))}
                                                                </div>

                                                                <button 
                                                                    className="btn-primary" 
                                                                    onClick={() => { setUserSelectedPlotId(null); setBookingSuccess(null); }}
                                                                    style={{ width: '100%', padding: '8px' }}
                                                                >
                                                                    Close Ticket
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* Active booking layout selector details */
                                                        <>
                                                            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Plot Name</span>
                                                                    <span className={`property-badge badge-${selectedPlot.status}`}>{selectedPlot.status}</span>
                                                                </div>
                                                                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedPlot.id}</div>
                                                                
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px', fontSize: '0.78rem' }}>
                                                                    <div>
                                                                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Area (m²)</span>
                                                                        <strong style={{ color: 'var(--text-primary)' }}>{selectedPlot.area?.toFixed(1) || 'N/A'} m²</strong>
                                                                    </div>
                                                                    <div>
                                                                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Price per m²</span>
                                                                        <strong style={{ color: 'var(--text-primary)' }}>{currencyFormatter.format(selectedPlot.price || 0)}</strong>
                                                                    </div>
                                                                </div>
                                                                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '4px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ color: 'var(--text-secondary)' }}>Total Land Value</span>
                                                                    <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{currencyFormatter.format((selectedPlot.area || 0) * (selectedPlot.price || 0))}</strong>
                                                                </div>
                                                            </div>

                                                            {/* Check if plot is available or blocked */}
                                                            {selectedPlot.status !== 'available' && selectedPlot.status !== 'premium' ? (
                                                                <div style={{ 
                                                                    background: 'rgba(239, 68, 68, 0.08)', 
                                                                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                                                                    borderRadius: 'var(--radius-sm)', 
                                                                    padding: '16px', 
                                                                    textAlign: 'center', 
                                                                    color: 'var(--color-sold)',
                                                                    fontSize: '0.82rem',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '6px'
                                                                }}>
                                                                    <strong>Plot Unavailable</strong>
                                                                    <span>This plot has already been reserved or sold. Please select another plot on the map canvas.</span>
                                                                </div>
                                                            ) : (
                                                                <form onSubmit={handleBookPlot} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '4px' }}>
                                                                        Reserve Land Plot
                                                                    </h3>

                                                                    <div className="form-group">
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={12}/> Full Name</label>
                                                                        <input 
                                                                            type="text" 
                                                                            required 
                                                                            placeholder="Enter your name" 
                                                                            value={bookingForm.name} 
                                                                            onChange={e => setBookingForm({...bookingForm, name: e.target.value})} 
                                                                        />
                                                                    </div>

                                                                    <div className="form-group">
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12}/> Phone Number</label>
                                                                        <input 
                                                                            type="tel" 
                                                                            required 
                                                                            pattern="[0-9]{10}"
                                                                            placeholder="10-digit mobile number" 
                                                                            value={bookingForm.phone} 
                                                                            onChange={e => setBookingForm({...bookingForm, phone: e.target.value})} 
                                                                        />
                                                                    </div>

                                                                    <div className="form-group">
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12}/> Email Address</label>
                                                                        <input 
                                                                            type="email" 
                                                                            required 
                                                                            placeholder="Enter your email" 
                                                                            value={bookingForm.email} 
                                                                            onChange={e => setBookingForm({...bookingForm, email: e.target.value})} 
                                                                        />
                                                                    </div>

                                                                    <div className="form-group">
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={12}/> Advance booking amount (₹)</label>
                                                                        <input 
                                                                            type="number" 
                                                                            required 
                                                                            min="10000"
                                                                            max={(selectedPlot.area || 0) * (selectedPlot.price || 0)}
                                                                            placeholder="Min ₹10,000" 
                                                                            value={bookingForm.advanceAmount} 
                                                                            onChange={e => setBookingForm({...bookingForm, advanceAmount: parseInt(e.target.value) || 0})} 
                                                                        />
                                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Min ₹10,000 reservation advance required.</span>
                                                                    </div>

                                                                    <div className="form-group">
                                                                        <label>Preferred Payment Mode</label>
                                                                        <select 
                                                                            value={bookingForm.paymentMethod} 
                                                                            onChange={e => setBookingForm({...bookingForm, paymentMethod: e.target.value})}
                                                                        >
                                                                            <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                                                                            <option value="card">Credit / Debit Card</option>
                                                                            <option value="netbanking">Net Banking</option>
                                                                            <option value="cash">Direct Bank Deposit / Cash</option>
                                                                        </select>
                                                                    </div>

                                                                    <button 
                                                                        type="submit" 
                                                                        className="btn-primary" 
                                                                        style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', marginTop: '8px', fontSize: '0.9rem' }}
                                                                    >
                                                                        Confirm Plot Reservation
                                                                    </button>
                                                                </form>
                                                            )}
                                                        </>
                                                    )}

                                                </div>
                                            </div>
                                        )}
                                    </aside>
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* 3. LOCATIONS DIRECTORY TAB */}
                {activeTab === 'locations' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }} className="animate-fade-in">
                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Locations Directory</h2>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Browse land subdivision projects grouped by cities/districts in our database.</p>
                        </div>

                        {/* List out states & districts directories */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {uniqueStates.map(stateName => {
                                const districts = [...new Set(database.layouts
                                    .filter(l => (l.state || "Tamil Nadu") === stateName)
                                    .map(l => l.district || "Erode"))];

                                return (
                                    <div key={stateName} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <h3 style={{ fontSize: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            {stateName}
                                        </h3>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                            {districts.map(distName => {
                                                const layoutsInDist = database.layouts.filter(l => 
                                                    (l.state || "Tamil Nadu") === stateName && 
                                                    (l.district || "Erode") === distName
                                                );
                                                
                                                const totalPlots = layoutsInDist.reduce((sum, l) => sum + l.plots.filter(p => !p.classification || p.classification === 'plot').length, 0);
                                                const availPlots = layoutsInDist.reduce((sum, l) => sum + l.plots.filter(p => p.status === 'available' || p.status === 'premium').length, 0);

                                                return (
                                                    <div 
                                                        key={distName}
                                                        onClick={() => {
                                                            setSelectedLocation({
                                                                state: stateName,
                                                                district: distName,
                                                                layoutId: layoutsInDist[0]?.id || ''
                                                            });
                                                            setIsExploring(true);
                                                            setActiveTab('layouts');
                                                        }}
                                                        style={{
                                                            background: 'var(--bg-panel)',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: 'var(--radius-md)',
                                                            padding: '20px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '12px',
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                                        }}
                                                        className="location-directory-card"
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{distName}</h4>
                                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{layoutsInDist.length} {layoutsInDist.length === 1 ? 'Project' : 'Projects'}</span>
                                                            </div>
                                                            <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '6px', borderRadius: '50%' }}>
                                                                <MapPin size={16} />
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '0.75rem' }}>
                                                            <div>
                                                                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Total Plots</span>
                                                                <strong style={{ color: 'var(--text-primary)' }}>{totalPlots} Plots</strong>
                                                            </div>
                                                            <div>
                                                                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Available</span>
                                                                <strong style={{ color: 'var(--color-available)' }}>{availPlots} Plots</strong>
                                                            </div>
                                                        </div>
                                                        
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>
                                                            Browse layouts in {distName} <ChevronRight size={12} />
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                )}

                {/* 4. MY BOOKINGS / PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }} className="animate-fade-in">
                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>My Bookings Dashboard</h2>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>View, search, and manage your plot booking reservations and ticket receipts.</p>
                        </div>

                        {!activeUserPhone ? (
                            /* Login / Lookup Lookup session form */
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                        <div style={{ display: 'inline-flex', padding: '12px', background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: '50%', marginBottom: '12px' }}>
                                            <Ticket size={28} />
                                        </div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Retrieve Your Bookings</h3>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Enter the 10-digit mobile phone number used during plot checkout to retrieve your ticket stubs.</p>
                                    </div>

                                    <form onSubmit={handleSearchBookingsByPhone} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div className="form-group">
                                            <label>Registered Phone Number</label>
                                            <input 
                                                type="tel" 
                                                required 
                                                pattern="[0-9]{10}"
                                                placeholder="e.g. 9876543210"
                                                value={searchPhone}
                                                onChange={e => setSearchPhone(e.target.value)}
                                                style={{ width: '100%' }}
                                            />
                                        </div>

                                        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.88rem' }}>
                                            Search Reservation Receipts
                                        </button>
                                    </form>
                                    
                                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Info size={12} />
                                        <span>Your contact info is preserved securely in your active local session.</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* User Bookings results dashboard list */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '16px 20px', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '8px', borderRadius: '50%' }}>
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                                {activeUserName ? "Active Customer Profile:" : "Active Session Client Phone:"}
                                            </span>
                                            <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                                {activeUserName ? activeUserName : activeUserPhone}
                                            </strong>
                                            {activeUserName && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {activeUserPhone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn-secondary" onClick={() => { setActiveTab('layouts'); setIsExploring(false); }} style={{ fontSize: '0.75rem', padding: '8px 14px' }}>
                                            Book another Plot
                                        </button>
                                        <button className="btn-secondary" onClick={handleLogoutSession} style={{ borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.75rem', padding: '8px 14px' }}>
                                            Close Session
                                        </button>
                                    </div>
                                </div>

                                {userBookings.length === 0 ? (
                                    <div style={{ background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', padding: '60px 20px', textAlign: 'center', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
                                        <Ticket size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
                                        <h3 style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 600 }}>No Bookings Logged</h3>
                                        <p style={{ fontSize: '0.8rem', marginTop: '6px', maxWidth: '380px', margin: '6px auto 0 auto' }}>No plot reservations are registered with mobile number {activeUserPhone} in our database records. Select a plot in the Layout Maps tab to create a booking!</p>
                                    </div>
                                ) : (
                                    /* Render visual tickets list */
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                                        {userBookings.map(b => (
                                            <div 
                                                key={b.id}
                                                className="perforated-ticket"
                                                style={{
                                                    background: 'linear-gradient(135deg, #1f2330 0%, #151821 100%)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                                                    position: 'relative',
                                                    minHeight: '280px',
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}
                                            >
                                                {/* Left/right ticket notches */}
                                                <div style={{ position: 'absolute', left: '-8px', top: '60%', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-main)', zIndex: 5, borderRight: '1px solid rgba(255,255,255,0.06)' }} />
                                                <div style={{ position: 'absolute', right: '-8px', top: '60%', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-main)', zIndex: 5, borderLeft: '1px solid rgba(255,255,255,0.06)' }} />

                                                {/* Ticket Top Header */}
                                                <div style={{ padding: '16px 20px', borderBottom: '1px dashed rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>{b.layoutName}</strong>
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ID: {b.id}</span>
                                                    </div>
                                                    <span className={`property-badge badge-${b.status}`} style={{ fontSize: '0.65rem' }}>{b.status}</span>
                                                </div>

                                                {/* Ticket Info Area */}
                                                <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>Reserved Plot:</span>
                                                        <strong style={{ color: 'var(--primary)' }}>{b.plotId}</strong>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>Customer:</span>
                                                        <strong style={{ color: '#ffffff' }}>{b.customerName}</strong>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>Advance Paid:</span>
                                                        <strong style={{ color: 'var(--color-available)' }}>{currencyFormatter.format(b.amountPaid)}</strong>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>Booking Date:</span>
                                                        <strong style={{ color: 'var(--text-muted)' }}>{new Date(b.date).toLocaleDateString('en-IN')}</strong>
                                                    </div>
                                                </div>

                                                {/* Ticket Stub perforated */}
                                                <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.15)', borderTop: '1px dashed rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                                                    
                                                    {/* Simulated Barcode */}
                                                    <div className="barcode" style={{ display: 'flex', height: '24px', background: 'transparent', gap: '2px', opacity: 0.5, width: '100%', justifyContent: 'center' }}>
                                                        {[1,2,1,3,2,1,4,1,2,3,1,4,2,1,3,1,2,1,3,1].map((w, i) => (
                                                            <span key={i} style={{ width: `${w}px`, height: '100%', background: '#ffffff' }} />
                                                        ))}
                                                    </div>
                                                    
                                                    {b.status === 'pending' && (
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--color-reserved)', fontStyle: 'italic', textAlign: 'center' }}>
                                                            Awaiting verification call from BCDI Admin
                                                        </span>
                                                    )}
                                                    {b.status === 'confirmed' && (
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--color-available)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            ✓ Booking Confirmed & Land Reserved Successfully
                                                        </span>
                                                    )}
                                                    {b.status === 'cancelled' && (
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--color-sold)', fontStyle: 'italic' }}>
                                                            Booking rejected or cancelled by admin
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                )}

                {/* 5. SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }} className="animate-fade-in">
                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Preferences & Support</h2>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Customize the portal theme view and get in touch with our help desk support team.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                            {/* Theme select card */}
                            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Portal Interface Theme</h3>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label>Active Theme</label>
                                    <select 
                                        className="theme-selector" 
                                        value={theme} 
                                        onChange={(e) => {
                                            // Trigger document root rewrite as well
                                            document.documentElement.setAttribute('data-theme', e.target.value);
                                            localStorage.setItem('bcdi_active_theme', e.target.value);
                                            // Trigger parent reload through local states
                                            window.location.reload();
                                        }}
                                        style={{ width: '100%', background: 'var(--bg-input)' }}
                                    >
                                        <option value="bcdi">BCDI Brand (Lime Green - Dark)</option>
                                        <option value="bcdi-light">BCDI Brand (Lime Green - Light)</option>
                                        <option value="dark">Sleek Dark Mode</option>
                                        <option value="light">Sleek Light Mode</option>
                                        <option value="blueprint">Blueprint Grid</option>
                                        <option value="cad">Technical CAD (Light)</option>
                                        <option value="luxury">Luxury Gold</option>
                                    </select>
                                </div>
                            </div>

                            {/* Help Desk support card */}
                            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Contact BCDI Support</h3>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    Have any questions about boundaries, payments, or registrations? Get in touch with our office.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Phone size={14} style={{ color: 'var(--primary)' }} />
                                        <span>{systemSettings.supportPhone}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Mail size={14} style={{ color: 'var(--primary)' }} />
                                        <span>{systemSettings.supportEmail}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <MapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                                        <span>{systemSettings.officeAddress}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Custom styling rules scoped to the portal */}
            <style dangerouslySetInnerHTML={{__html: `
                .user-nav-item {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .user-nav-item:hover {
                    background: rgba(255,255,255,0.03) !important;
                    color: var(--text-primary) !important;
                }
                .user-nav-item.active:hover {
                    background: var(--primary) !important;
                    color: #ffffff !important;
                }
                .ad-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--primary) !important;
                }
                .location-directory-card:hover {
                    transform: translateY(-2px);
                    border-color: var(--primary) !important;
                    box-shadow: 0 6px 18px rgba(0,0,0,0.15) !important;
                }
                .video-playlist-item {
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .video-playlist-item:hover {
                    background: rgba(255,255,255,0.03) !important;
                    border-color: var(--primary) !important;
                    transform: translateX(4px);
                }
                .logout-hover-effect {
                    transition: transform 0.2s ease, filter 0.2s ease;
                }
                .logout-hover-effect:hover {
                    transform: scale(1.15);
                    filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.4));
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .kpi-card {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .kpi-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--primary) !important;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
                    background: rgba(255, 255, 255, 0.02) !important;
                }
                .plot-list-item {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .plot-list-item:hover {
                    transform: translateX(2px);
                    background: rgba(255, 255, 255, 0.03) !important;
                    border-color: var(--primary) !important;
                }
                .plot-list-item.selected {
                    background: var(--primary-glow) !important;
                    border-color: var(--primary) !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .status-badge-pill {
                    font-size: 0.62rem;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 20px;
                    text-transform: uppercase;
                }
                .status-badge-pill.badge-available {
                    background: var(--color-available-glow);
                    color: var(--color-available);
                }
                .status-badge-pill.badge-sold {
                    background: var(--color-sold-glow);
                    color: var(--color-sold);
                }
                .status-badge-pill.badge-reserved {
                    background: var(--color-reserved-glow);
                    color: var(--color-reserved);
                }
                .status-badge-pill.badge-premium {
                    background: var(--color-premium-glow);
                    color: var(--color-premium);
                }
                .sidebar-search-input:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 2px var(--primary-glow);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}} />

        </div>
    );
}
