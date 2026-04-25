import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Search, Filter, Calendar, Info, Target } from 'lucide-react';
import * as THREE from 'three';

interface VizPoint {
  id: string;
  label: string;
  region: string;
  epoque: string;
  date: string;
  x: number;
  y: number;
  z: number;
}

const Visualisation3DPage: React.FC = () => {
  const [data, setData] = useState<VizPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set());
  const [selectedEpoques, setSelectedEpoques] = useState<Set<string>>(new Set());
  const [yearRange, setYearRange] = useState<[number, number]>([-2000, 2025]);
  const [clickedNode, setClickedNode] = useState<VizPoint | null>(null);
  const [neighbors, setNeighbors] = useState<Set<string>>(new Set());
  
  const navigate = useNavigate();
  const fgRef = useRef<any>();

  useEffect(() => {
    fetch('/data_for_viz.json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        // Initialiser les filtres avec toutes les valeurs
        const regions = new Set(json.map((d: any) => d.region));
        const epoques = new Set(json.map((d: any) => d.epoque));
        setSelectedRegions(regions);
        setSelectedEpoques(epoques);
        
        // Calculer les années min/max
        const years = json.map((d: any) => {
          if (!d.date) return 2025;
          const parts = d.date.split('-');
          return d.date.startsWith('-') ? -parseInt(parts[1]) : parseInt(parts[0]);
        }).filter((y: number) => !isNaN(y));
        
        if (years.length > 0) {
          setYearRange([Math.min(...years), Math.max(...years)]);
        }

        setLoading(false);
      })
      .catch(err => {
        console.error("Erreur lors du chargement des données :", err);
        setLoading(false);
      });
  }, []);

  const getYear = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    return dateStr.startsWith('-') ? -parseInt(parts[1]) : parseInt(parts[0]);
  };

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const year = getYear(d.date);
      const matchesSearch = d.label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = selectedRegions.has(d.region);
      const matchesEpoque = selectedEpoques.has(d.epoque);
      const matchesYear = year >= yearRange[0] && year <= yearRange[1];
      return matchesSearch && matchesRegion && matchesEpoque && matchesYear;
    });
  }, [data, searchQuery, selectedRegions, selectedEpoques, yearRange]);

  const graphData = useMemo(() => {
    return {
      nodes: filteredData.map(d => ({
        ...d,
        fx: d.x * 200, 
        fy: d.y * 200,
        fz: d.z * 200,
        val: clickedNode?.id === d.id ? 8 : (neighbors.has(d.id) ? 5 : 2)
      })),
      links: []
    };
  }, [filteredData, clickedNode, neighbors]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = data.find(d => d.label.toLowerCase().includes(searchQuery.toLowerCase()));
    if (found && fgRef.current) {
      const distance = 400;
      const distRatio = 1 + distance / Math.hypot(found.x * 200, found.y * 200, found.z * 200);
      fgRef.current.cameraPosition(
        { x: found.x * 200 * distRatio, y: found.y * 200 * distRatio, z: found.z * 200 * distRatio },
        { x: found.x * 200, y: found.y * 200, z: found.z * 200 },
        2000
      );
      setClickedNode(found);
      findNeighbors(found);
    }
  };

  const findNeighbors = useCallback((node: VizPoint) => {
    // On cherche les 10 points les plus proches en distance Euclidienne (proxy de similarité)
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

  const toggleRegion = (region: string) => {
    const next = new Set(selectedRegions);
    if (next.has(region)) next.delete(region);
    else next.add(region);
    setSelectedRegions(next);
  };

  const toggleEpoque = (epoque: string) => {
    const next = new Set(selectedEpoques);
    if (next.has(epoque)) next.delete(epoque);
    else next.add(epoque);
    setSelectedEpoques(next);
  };

  const getEpoqueColor = (epoque: string, node: any) => {
    if (clickedNode && node.id === clickedNode.id) return '#ffffff';
    if (neighbors.has(node.id)) return '#fbbf24'; // Jaune pour les voisins

    const colors: Record<string, string> = {
      'Antiquité': '#f87171',
      'Moyen Âge': '#fbbf24',
      'Renaissance': '#34d399',
      'Époque moderne': '#60a5fa',
      'Époque contemporaine': '#a78bfa',
      'Préhistoire': '#9ca3af'
    };
    return colors[epoque] || '#ffffff';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0f1117] text-white">
        <Loader2 className="animate-spin mb-4" size={48} color="#6366f1" />
        <p className="text-xl font-medium">Chargement de la carte sémantique...</p>
      </div>
    );
  }

  const allRegions = Array.from(new Set(data.map(d => d.region))).sort();
  const allEpoques = Array.from(new Set(data.map(d => d.epoque))).sort();

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden flex">
      {/* Sidebar de Filtres */}
      <div className="w-80 h-full bg-[#11131a] border-r border-white/10 z-20 flex flex-col p-6 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <Target className="text-white" size={20} />
           </div>
           <h2 className="text-xl font-bold text-white tracking-tight">K-Viz 3D</h2>
        </div>

        <form onSubmit={handleSearch} className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un événement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </form>

        <div className="space-y-8">
          {/* Section Époques */}
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-4 text-xs font-bold uppercase tracking-wider">
              <Filter size={14} /> Époques
            </div>
            <div className="space-y-2">
              {allEpoques.map(ep => (
                <label key={ep} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={selectedEpoques.has(ep)}
                    onChange={() => toggleEpoque(ep)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{ep}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section Régions */}
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-4 text-xs font-bold uppercase tracking-wider">
              <Info size={14} /> Régions
            </div>
            <div className="space-y-2">
              {allRegions.map(reg => (
                <label key={reg} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={selectedRegions.has(reg)}
                    onChange={() => toggleRegion(reg)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{reg}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Slider Temporel */}
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-4 text-xs font-bold uppercase tracking-wider">
              <Calendar size={14} /> Période : {yearRange[0]} à {yearRange[1]}
            </div>
            <input 
              type="range" 
              min="-3000" 
              max="2025" 
              value={yearRange[1]}
              onChange={(e) => setYearRange([yearRange[0], parseInt(e.target.value)])}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-white/10">
          <button 
            onClick={() => navigate('/admin-option')}
            className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white py-3 rounded-xl transition-all border border-white/10"
          >
            <ArrowLeft size={16} /> Retour Admin
          </button>
        </div>
      </div>

      {/* Zone Graph 3D */}
      <div className="flex-1 relative">
        <div className="absolute top-6 left-6 z-10 pointer-events-none">
          {clickedNode && (
            <div className="bg-indigo-600/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-indigo-400/30 animate-in fade-in slide-in-from-left-4 duration-300 pointer-events-auto">
              <div className="text-[10px] font-bold text-indigo-100 uppercase mb-1">Sélection actuelle</div>
              <div className="text-lg font-bold text-white leading-tight mb-2">{clickedNode.label}</div>
              <div className="flex gap-2">
                <span className="bg-black/20 text-white text-[10px] px-2 py-1 rounded-md">{clickedNode.region}</span>
                <span className="bg-black/20 text-white text-[10px] px-2 py-1 rounded-md">{clickedNode.epoque}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-white/80">
                1 clic pour voir les voisins • Double clic pour éditer
              </div>
            </div>
          )}
        </div>

        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          nodeColor={node => getEpoqueColor((node as VizPoint).epoque, node)}
          nodeLabel={node => `
            <div style="background: rgba(0,0,0,0.9); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(8px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
              <div style="font-weight: 800; color: white; font-size: 14px; margin-bottom: 4px;">${(node as VizPoint).label}</div>
              <div style="font-size: 11px; color: #818cf8; font-weight: 600;">${(node as VizPoint).region} • ${(node as VizPoint).epoque}</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Date: ${(node as VizPoint).date || 'Inconnue'}</div>
            </div>
          `}
          onNodeClick={(node: any) => {
            setClickedNode(node);
            findNeighbors(node);
          }}
          onNodeDoubleClick={(node: any) => {
            if (node.id) {
              navigate(`/edit-event/${node.id}`);
            }
          }}
          backgroundColor="#000000"
          showNavInfo={false}
          nodeRelSize={2}
          nodeOpacity={0.9}
          linkOpacity={0}
        />
      </div>
    </div>
  );
};

export default Visualisation3DPage;
