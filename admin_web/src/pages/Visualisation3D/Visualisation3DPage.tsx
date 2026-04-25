
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, ArrowLeft, Search, Filter, Calendar, Info, 
  Target, RotateCcw, Flame, Layers, Map,
  ChevronRight, ChevronDown, Check, X, MousePointer2
} from 'lucide-react';
import './Visualisation3DPage.css';

interface VizPoint {
  id: string;
  label: string;
  region: string;
  epoque: string;
  date: string;
  status: 'official' | 'sas' | 'antichambre';
  x: number;
  y: number;
  z: number;
  density: number;
}

const Visualisation3DPage: React.FC = () => {
  const [data, setData] = useState<VizPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set());
  const [selectedEpoques, setSelectedEpoques] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(['official', 'sas', 'antichambre']));
  const [yearRange, setYearRange] = useState<[number, number]>([-3000, 2025]);
  const [clickedNode, setClickedNode] = useState<VizPoint | null>(null);
  const [neighbors, setNeighbors] = useState<Set<string>>(new Set());
  const [isHeatmap, setIsHeatmap] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const navigate = useNavigate();
  const fgRef = useRef<any>();

  useEffect(() => {
    fetch('/data_for_viz.json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        const regions = new Set(json.map((d: any) => d.region));
        const epoques = new Set(json.map((d: any) => d.epoque));
        setSelectedRegions(regions);
        setSelectedEpoques(epoques);
        
        const years = json.map((d: any) => getYear(d.date)).filter((y: number) => !isNaN(y));
        if (years.length > 0) {
          setYearRange([Math.min(...years), Math.max(...years)]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Erreur chargement données :", err);
        setLoading(false);
      });
  }, []);

  const getYear = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    if (dateStr.startsWith('-')) return -parseInt(parts[1]);
    return parseInt(parts[0]);
  };

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const year = getYear(d.date);
      const matchesSearch = d.label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = selectedRegions.has(d.region);
      const matchesEpoque = selectedEpoques.has(d.epoque);
      const matchesStatus = selectedStatuses.has(d.status);
      const matchesYear = year >= yearRange[0] && year <= yearRange[1];
      return matchesSearch && matchesRegion && matchesEpoque && matchesStatus && matchesYear;
    });
  }, [data, searchQuery, selectedRegions, selectedEpoques, selectedStatuses, yearRange]);

  const graphData = useMemo(() => {
    const scale = 300;
    return {
      nodes: filteredData.map(d => ({
        ...d,
        fx: d.x * scale, 
        fy: d.y * scale,
        fz: d.z * scale,
      })),
      links: []
    };
  }, [filteredData]);

  const resetCamera = () => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 800 }, { x: 0, y: 0, z: 0 }, 1000);
    }
  };

  const focusOnNode = (node: VizPoint) => {
    if (fgRef.current) {
      const scale = 300;
      const distance = 150;
      const distRatio = 1 + distance / Math.hypot(node.x * scale, node.y * scale, node.z * scale);
      
      fgRef.current.cameraPosition(
        { x: node.x * scale * distRatio, y: node.y * scale * distRatio, z: node.z * scale * distRatio },
        { x: node.x * scale, y: node.y * scale, z: node.z * scale },
        1500
      );
      setClickedNode(node);
      findNeighbors(node);
    }
  };

  const findNeighbors = useCallback((node: VizPoint) => {
    const sorted = [...data]
      .filter(d => d.id !== node.id)
      .map(d => ({
        id: d.id,
        dist: Math.hypot(d.x - node.x, d.y - node.y, d.z - node.z)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 15);
    
    setNeighbors(new Set(sorted.map(s => s.id)));
  }, [data]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'official': return '#6366f1';
      case 'sas': return '#f43f5e';
      case 'antichambre': return '#10b981';
      default: return '#ffffff';
    }
  };

  const getNodeColor = (node: any) => {
    if (clickedNode && node.id === clickedNode.id) return '#ffffff';
    if (neighbors.has(node.id)) return '#fbbf24';
    
    if (isHeatmap) {
      const maxDensity = 20; 
      const intensity = Math.min(node.density / maxDensity, 1);
      return `rgb(${Math.floor(255 * intensity)}, ${Math.floor(255 * (1 - intensity))}, 255)`;
    }

    return getStatusColor(node.status);
  };

  const getNodeSize = (node: any) => {
    if (clickedNode && node.id === clickedNode.id) return 6;
    if (neighbors.has(node.id)) return 4;
    if (isHeatmap) return 2 + (node.density / 5);
    return 2.5;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0f1117] text-white">
        <Loader2 className="animate-spin mb-4" size={48} color="#6366f1" />
        <p className="text-xl font-medium">Initialisation de la Galaxie Kiko...</p>
      </div>
    );
  }

  const allRegions = Array.from(new Set(data.map(d => d.region))).sort();
  const allEpoques = Array.from(new Set(data.map(d => d.epoque))).sort();

  return (
    <div className="viz-container">
      {/* Sidebar */}
      <aside className={`viz-sidebar ${!isSidebarOpen ? 'closed' : ''}`}>
        <div className="viz-sidebar-header">
           <div className="viz-brand">
              <div className="viz-logo">
                <Map className="text-white" size={20} />
              </div>
              <h2 className="viz-title">K-Viz 3D</h2>
           </div>
           <button onClick={() => setIsSidebarOpen(false)} className="viz-control-btn" style={{ background: 'none', border: 'none' }}>
             <ChevronRight size={20} />
           </button>
        </div>

        <div className="viz-search-container">
          <Search className="viz-search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="viz-search-input"
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {/* Sources */}
          <div className="viz-section">
            <div className="viz-section-label">
              <Layers size={14} /> Sources
            </div>
            <div className="viz-status-grid">
              {[
                { id: 'official', label: 'Officiels', color: '#6366f1' },
                { id: 'sas', label: 'Table SAS', color: '#f43f5e' },
                { id: 'antichambre', label: 'Antichambre', color: '#10b981' }
              ].map(s => (
                <div 
                  key={s.id}
                  onClick={() => {
                    const next = new Set(selectedStatuses);
                    if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                    setSelectedStatuses(next);
                  }}
                  className={`viz-status-card ${selectedStatuses.has(s.id) ? 'active' : ''}`}
                >
                  <div className="viz-status-info">
                    <div className="viz-status-dot" style={{ backgroundColor: s.color }} />
                    <span className="viz-status-text">{s.label}</span>
                  </div>
                  {selectedStatuses.has(s.id) && <Check size={16} className="text-indigo-400" />}
                </div>
              ))}
            </div>
          </div>

          {/* Période */}
          <div className="viz-section">
            <div className="viz-section-label">
              <Calendar size={14} /> Période : {yearRange[0]} à {yearRange[1]}
            </div>
            <div className="viz-year-inputs">
              <input 
                type="number" 
                value={yearRange[0]} 
                onChange={e => setYearRange([parseInt(e.target.value) || -3000, yearRange[1]])}
                className="viz-year-input"
              />
              <span style={{ color: '#475569' }}>→</span>
              <input 
                type="number" 
                value={yearRange[1]} 
                onChange={e => setYearRange([yearRange[0], parseInt(e.target.value) || 2025])}
                className="viz-year-input"
              />
            </div>
            <input 
              type="range" min="-3000" max="2025" value={yearRange[1]}
              onChange={(e) => setYearRange([yearRange[0], parseInt(e.target.value)])}
              className="viz-range-slider"
            />
          </div>

          {/* Filters */}
          <div className="viz-section">
             <CollapsibleList 
               title="Époques" 
               icon={<Filter size={14} />} 
               items={allEpoques} 
               selected={selectedEpoques} 
               onToggle={ep => {
                 const next = new Set(selectedEpoques);
                 if (next.has(ep)) next.delete(ep); else next.add(ep);
                 setSelectedEpoques(next);
               }}
             />
             <CollapsibleList 
               title="Régions" 
               icon={<Info size={14} />} 
               items={allRegions} 
               selected={selectedRegions} 
               onToggle={reg => {
                 const next = new Set(selectedRegions);
                 if (next.has(reg)) next.delete(reg); else next.add(reg);
                 setSelectedRegions(next);
               }}
             />
          </div>
        </div>

        <div className="viz-bottom">
           <SyncButton />
           <button 
            onClick={() => setIsHeatmap(!isHeatmap)}
            className={`viz-btn viz-btn-heatmap ${isHeatmap ? 'active' : ''}`}
          >
            <Flame size={16} /> Mode Heatmap {isHeatmap ? 'ON' : 'OFF'}
          </button>
          <button 
            onClick={() => navigate('/admin-option')}
            className="viz-btn viz-btn-outline"
          >
            <ArrowLeft size={16} /> Retour Admin
          </button>

          <div className="viz-legend">
             <div className="viz-legend-item"><div className="viz-legend-dot" style={{ background: '#6366f1' }} /> Officiels</div>
             <div className="viz-legend-item"><div className="viz-legend-dot" style={{ background: '#f43f5e' }} /> Table SAS</div>
             <div className="viz-legend-item"><div className="viz-legend-dot" style={{ background: '#10b981' }} /> Antichambre</div>
             <div className="viz-legend-item"><div className="viz-legend-dot" style={{ background: '#fbbf24' }} /> Similaires</div>
             <div style={{ marginTop: '0.5rem', fontSize: '8px', opacity: 0.5 }}>UMAP 3D Semantic Projection</div>
          </div>
        </div>
      </aside>

      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="viz-floating-toggle"
        >
          <Filter size={20} />
        </button>
      )}

      {/* Graph Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div className="viz-controls">
          <button onClick={resetCamera} title="Réinitialiser la caméra" className="viz-control-btn">
            <RotateCcw size={18} />
          </button>
          <button title="Mode Sélection (Bientôt)" className="viz-control-btn" style={{ opacity: 0.3, cursor: 'not-allowed' }}>
            <MousePointer2 size={18} />
          </button>
        </div>

        <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 30, pointerEvents: 'none' }}>
          {!isSidebarOpen && clickedNode && (
            <div className="viz-info-panel">
              <div className="viz-info-header">
                <span className="viz-info-tag">Focus</span>
                <button onClick={() => setClickedNode(null)} style={{ pointerEvents: 'auto' }}>
                  <X size={14} color="#fff" />
                </button>
              </div>
              <div className="viz-info-title">{clickedNode.label}</div>
              <div className="viz-badge-container">
                <span className="viz-badge">{clickedNode.region}</span>
                <span className="viz-badge">{clickedNode.epoque}</span>
                <span className="viz-badge">{clickedNode.date}</span>
              </div>
              <button 
                onClick={() => navigate(`/edit-event/${clickedNode.id}`)}
                className="viz-edit-btn"
                style={{ pointerEvents: 'auto' }}
              >
                Ouvrir l'éditeur
              </button>
            </div>
          )}
        </div>


        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          nodeColor={getNodeColor}
          nodeRelSize={2.5}
          nodeVal={getNodeSize}
          nodeLabel={node => `
            <div style="background: rgba(13, 15, 20, 0.95); padding: 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(12px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); font-family: 'Outfit', sans-serif; color: #fff;">
              <div style="font-weight: 800; font-size: 15px; margin-bottom: 6px;">${(node as VizPoint).label}</div>
              <div style="font-size: 10px; color: #818cf8; font-weight: 600;">${(node as VizPoint).region} • ${(node as VizPoint).epoque}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">📅 ${(node as VizPoint).date || 'Inconnue'}</div>
              ${isHeatmap ? `<div style="margin-top: 8px; font-size: 9px; color: #fb923c;">🔥 Densité: ${(node as VizPoint).density}</div>` : ''}
            </div>
          `}
          onNodeClick={(node: any) => {
            setClickedNode(node);
            findNeighbors(node);
          }}
          onNodeDoubleClick={(node: any) => focusOnNode(node)}
          backgroundColor="#000000"
          showNavInfo={false}
          enableNodeDrag={false}
          nodeOpacity={0.9}
          linkOpacity={0}
        />
      </div>
    </div>
  );
};

const CollapsibleList: React.FC<{ title: string, icon: any, items: string[], selected: Set<string>, onToggle: (item: string) => void }> = ({ title, icon, items, selected, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filteredItems = items.filter(i => i.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="collapsible-container">
      <button onClick={() => setIsOpen(!isOpen)} className="collapsible-trigger">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {icon} <span>{title}</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      
      {isOpen && (
        <div className="collapsible-content">
          <div className="collapsible-search">
             <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
             <input 
               type="text" 
               placeholder="Filtrer..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="collapsible-search-input"
             />
          </div>
          <div className="collapsible-list-items">
            {filteredItems.map(item => (
              <label key={item} className="collapsible-item">
                <input type="checkbox" checked={selected.has(item)} onChange={() => onToggle(item)} />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SyncButton: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setMsg(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: '✅ Sync lancée (attendre ~2min)', type: 'success' });
      } else {
        setMsg({ text: `❌ ${data.error || 'Erreur'}`, type: 'error' });
      }
    } catch (err) {
      setMsg({ text: '❌ Erreur de connexion', type: 'error' });
    } finally {
      setSyncing(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <button 
        onClick={handleSync} 
        disabled={syncing}
        className={`viz-btn ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ 
          width: '100%',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          color: 'white',
          border: 'none'
        }}
      >
        {syncing ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
        <span>{syncing ? 'Synchronisation...' : 'Synchroniser la carte'}</span>
      </button>
      {msg && (
        <div style={{ 
          fontSize: '0.65rem', 
          marginTop: '0.5rem', 
          textAlign: 'center',
          color: msg.type === 'success' ? '#10b981' : '#ef4444',
          fontWeight: 600
        }}>
          {msg.text}
        </div>
      )}
    </div>
  );
};

export default Visualisation3DPage;
