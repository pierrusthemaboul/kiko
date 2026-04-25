import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ForceGraph3D } from 'react-force-graph';
import { useNavigate } from 'react-router-dom';
import { Loader2, Info, ArrowLeft } from 'lucide-react';
import * as THREE from 'three';

interface VizPoint {
  label: string;
  id: string;
  region: string;
  epoque: string;
  x: number;
  y: number;
  z: number;
}

const Visualisation3DPage: React.FC = () => {
  const [data, setData] = useState<VizPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const fgRef = useRef<any>();

  useEffect(() => {
    fetch('/data_for_viz.json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erreur lors du chargement des données :", err);
        setLoading(false);
      });
  }, []);

  const graphData = useMemo(() => {
    return {
      nodes: data.map((d, i) => ({
        ...d,
        id: d.id || `node-${i}`,
        // On force les positions pré-calculées
        fx: d.x * 200, 
        fy: d.y * 200,
        fz: d.z * 200,
        val: 2 // Taille du point
      })),
      links: [] // Pas de liens pour un scatter plot
    };
  }, [data]);

  // Palette de couleurs par époque
  const getEpoqueColor = (epoque: string) => {
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
      <div className="flex flex-col items-center justify-center h-full bg-[#0f1117] text-white">
        <Loader2 className="animate-spin mb-4" size={48} color="#6366f1" />
        <p className="text-xl font-medium">Chargement de la carte sémantique 3D...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* Overlay UI */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-4">
        <button 
          onClick={() => navigate('/admin-option')}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg transition-all border border-white/10"
        >
          <ArrowLeft size={18} /> Retour
        </button>
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-2xl max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-2">Carte Sémantique 3D</h1>
          <p className="text-gray-400 text-sm mb-4">
            Visualisation des embeddings (OpenAI) réduits par UMAP. 
            Les points proches partagent une similarité historique ou sémantique.
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries({
              'Antiquité': '#f87171',
              'Moyen Âge': '#fbbf24',
              'Renaissance': '#34d399',
              'Époque moderne': '#60a5fa',
              'Contemporain': '#a78bfa'
            }).map(([name, color]) => (
              <div key={name} className="flex items-center gap-1.5 text-[10px] text-gray-300">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-10 text-white/50 text-xs italic">
        Scroll pour zoomer • Drag pour pivoter • Clic sur un point pour éditer
      </div>

      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeColor={node => getEpoqueColor((node as VizPoint).epoque)}
        nodeLabel={node => `
          <div style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(4px);">
            <div style="font-weight: bold; color: white; margin-bottom: 4px;">${(node as VizPoint).label}</div>
            <div style="font-size: 11px; color: #a5b4fc;">${(node as VizPoint).region} • ${(node as VizPoint).epoque}</div>
          </div>
        `}
        onNodeClick={(node: any) => {
          if (node.id) {
            navigate(`/edit-event/${node.id}`);
          }
        }}
        backgroundColor="#000000"
        showNavInfo={false}
        nodeRelSize={2}
        nodeOpacity={0.9}
        linkOpacity={0} // Scatter plot
      />
    </div>
  );
};

export default Visualisation3DPage;
