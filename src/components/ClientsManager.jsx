import React, { useState, useMemo } from 'react';
import { Users, Search, Phone, Mail, FileText, Landmark, BadgeAlert } from 'lucide-react';

export default function ClientsManager({ 
    database,
    showToast
}) {
    const bookings = database.bookings || [];
    const [searchQuery, setSearchQuery] = useState("");

    // Aggregate clients by phone number
    const clients = useMemo(() => {
        const clientsMap = {};

        bookings.forEach(b => {
            const phone = (b.customerPhone || "").trim();
            if (!phone) return;

            if (!clientsMap[phone]) {
                clientsMap[phone] = {
                    name: b.customerName,
                    phone: phone,
                    email: b.customerEmail || '—',
                    bookedPlots: [],
                    totalPaid: 0,
                    bookingsCount: 0,
                    pendingCount: 0,
                    confirmedCount: 0,
                    cancelledCount: 0
                };
            }

            // Update details (use latest booking name if exists)
            clientsMap[phone].name = b.customerName || clientsMap[phone].name;
            clientsMap[phone].email = b.customerEmail || clientsMap[phone].email;
            
            // Add plot ID if not already added
            const plotDescriptor = `${b.plotId} (${database.layouts.find(l => l.id === b.layoutId)?.name || 'Layout'})`;
            if (!clientsMap[phone].bookedPlots.includes(plotDescriptor)) {
                clientsMap[phone].bookedPlots.push(plotDescriptor);
            }

            // Summarize transactions
            clientsMap[phone].bookingsCount++;
            if (b.status === 'confirmed') {
                clientsMap[phone].confirmedCount++;
                clientsMap[phone].totalPaid += Number(b.amountPaid) || 0;
            } else if (b.status === 'pending') {
                clientsMap[phone].pendingCount++;
            } else if (b.status === 'cancelled') {
                clientsMap[phone].cancelledCount++;
            }
        });

        return Object.values(clientsMap);
    }, [bookings, database.layouts]);

    // Filtered clients list
    const filteredClients = useMemo(() => {
        return clients.filter(c => {
            return c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   c.phone.includes(searchQuery) ||
                   c.email.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [clients, searchQuery]);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="clients-dashboard" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
            
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={24} style={{ color: 'var(--primary)' }} /> Customer & Buyer Directory
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>View contact information, total bookings, payment ledger, and purchased plots for all clients.</p>
            </div>

            {/* Metrics block */}
            <div style={{ maxWidth: '240px' }}>
                <div className="metric-card" style={{ padding: '16px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <h3 style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Unique Clients</h3>
                    <div className="metric-value" style={{ fontSize: '1.8rem', marginTop: '6px', fontWeight: 800, color: 'var(--text-primary)' }}>{clients.length}</div>
                    <span className="metric-sub" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Registered buyers with booking logs</span>
                </div>
            </div>

            {/* Filter controls */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text"
                        placeholder="Search clients by name, phone number, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 36px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                </div>
            </div>

            {/* Clients Grid Directory */}
            {filteredClients.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                    <Users size={40} style={{ opacity: 0.15 }} />
                    <h3>No customers listed</h3>
                    <p style={{ fontSize: '0.8rem' }}>Buyers will automatically appear in this directory once plot reservation logs are registered.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                    {filteredClients.map((client) => (
                        <div 
                            key={client.phone}
                            style={{
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                        >
                            {/* Header card banner */}
                            <div style={{ padding: '18px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                                    {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{client.name}</h3>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Registered Client</span>
                                </div>
                            </div>

                            {/* Contact details */}
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                                    <span>{client.phone}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                                    <span>{client.email}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                                    <span>
                                        Total Booking Ledger: <strong>{client.bookingsCount}</strong> ({client.confirmedCount} confirmed)
                                    </span>
                                </div>
                            </div>

                            {/* Booked Plots Tag Chips */}
                            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Booked Plots & Estates</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {client.bookedPlots.map((plot, idx) => (
                                        <span 
                                            key={idx}
                                            style={{
                                                fontSize: '0.68rem',
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid var(--border-color)',
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                color: 'var(--text-primary)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Landmark size={10} style={{ color: 'var(--primary)' }} />
                                            {plot}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Ledger statistics footer */}
                            <div style={{ padding: '12px 18px', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Deposit</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(client.totalPaid)}</span>
                                </div>
                                {client.pendingCount > 0 && (
                                    <span style={{
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        background: 'rgba(245,158,11,0.12)',
                                        color: '#f59e0b',
                                        border: '1px solid rgba(245,158,11,0.2)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <BadgeAlert size={10} />
                                        {client.pendingCount} Pending Approval
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
