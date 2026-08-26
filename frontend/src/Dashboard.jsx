import { useEffect, useState, useCallback } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { Activity, ShieldCheck, ShieldAlert, BarChart2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const API_BASE = 'http://localhost:5000';

const Dashboard = ({ forceRefresh }) => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/api/scan/stats`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setStats(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, forceRefresh]);

  // Framer Motion — state machine variants per animation-systems skill
  const containerVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1, y: 0,
      transition: { type: 'spring', stiffness: 90, damping: 14, staggerChildren: 0.1 }
    }
  };
  const childVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 16 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 140, damping: 12 } }
  };

  // ── Loading skeleton ────────────────────────────────────────
  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="dashboard-card">
        <div className="dashboard-header">
          <BarChart2 size={20} className="text-accent" />
          <h3>Live Scan Statistics</h3>
        </div>
        <div className="stats-numbers">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-loader stat-box-skeleton" />
          ))}
        </div>
        <div className="skeleton-loader chart-skeleton" />
      </motion.div>
    );
  }

  // ── Error state ─────────────────────────────────────────────
  if (error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="dashboard-card">
        <div className="dashboard-header">
          <BarChart2 size={20} className="text-accent" />
          <h3>Live Scan Statistics</h3>
        </div>
        <div className="no-data">
          <ShieldAlert size={36} style={{ color: 'var(--danger)', opacity: 0.7 }} />
          <p>Could not connect to the scanner server.</p>
          <button className="retry-btn" onClick={fetchStats}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </motion.div>
    );
  }

  const totalSafe    = (stats?.safeUrls || 0) + (stats?.safeEmails || 0);
  const totalThreats = (stats?.maliciousUrls || 0) + (stats?.scamEmails || 0);
  const total        = stats?.totalScanned || 0;
  const safePercent  = total > 0 ? Math.round((totalSafe / total) * 100) : 0;

  // recharts can't render slices with value 0 — filter them out
  const pieData = [
    { name: 'Safe',      value: totalSafe,    color: '#10b981' },
    { name: 'Malicious', value: totalThreats, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // If only one category exists, add a tiny ghost slice so the donut renders properly
  const chartData = pieData.length === 1
    ? [...pieData, { name: '', value: 0.001, color: 'transparent' }]
    : pieData;

  return (
    <motion.div className="dashboard-card"
      variants={containerVariants} initial="hidden"
      whileInView="visible" viewport={{ once: true, margin: '-40px' }}>

      <div className="dashboard-header">
        <BarChart2 size={20} className="text-accent" />
        <h3>Live Scan Statistics</h3>
        <motion.button className="icon-btn" onClick={fetchStats}
          whileHover={{ rotate: 180 }} transition={{ type: 'spring', stiffness: 200, damping: 10 }}>
          <RefreshCw size={16} />
        </motion.button>
      </div>

      <div className="dashboard-content">
        {/* Stat Boxes */}
        <div className="stats-numbers">
          {[
            { icon: <Activity size={20} />, val: total,        label: 'Total Scans',     cls: '' },
            { icon: <ShieldCheck size={20} />, val: totalSafe,    label: 'Safe Items',      cls: 'safe-box',   textCls: 'text-success' },
            { icon: <ShieldAlert size={20} />, val: totalThreats, label: 'Threats Blocked', cls: 'danger-box', textCls: 'text-danger' },
          ].map(({ icon, val, label, cls, textCls }) => (
            <motion.div key={label} className={`stat-box ${cls}`}
              variants={childVariants}
              whileHover={{ scale: 1.06, transition: { type: 'spring', stiffness: 300 } }}>
              <span className={`stat-icon ${textCls || 'text-accent'}`}>{icon}</span>
              <motion.span className={`stat-value ${textCls || ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 120 }}>
                {val}
              </motion.span>
              <span className="stat-label">{label}</span>
            </motion.div>
          ))}
        </div>

        {/* Pie Chart / empty state */}
        <AnimatePresence mode="wait">
          {total > 0 ? (
            <motion.div key="chart" className="chart-wrapper"
              variants={childVariants}>
              <div className="chart-label-center">
                <span className="chart-percent">{safePercent}%</span>
                <span className="chart-sublabel">Safe</span>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%"
                      innerRadius={62} outerRadius={86}
                      paddingAngle={chartData.length > 1 ? 4 : 0} dataKey="value"
                      stroke="none" animationBegin={0} animationDuration={900}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{
                      backgroundColor: 'var(--panel-bg)',
                      borderColor: 'var(--border)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      backdropFilter: 'blur(12px)',
                    }} />
                    <Legend
                      content={() => (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', paddingTop: '12px' }}>
                          {pieData.map((entry, i) => (
                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.color, display: 'inline-block', flexShrink: 0 }} />
                              {entry.name}
                            </span>
                          ))}
                        </div>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" className="no-data"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}>
              <Activity size={42} className="text-accent" style={{ opacity: 0.35 }} />
              <p>No scans yet — scan a URL or email to see statistics!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Dashboard;
