# 📊 Timalaus Corp - Organigramme Visuel

> **K-HIVE SYSTEM** : Représentation dynamique de notre Entreprise Virtuelle.

```mermaid
graph TD
    %% Styles
    classDef n2 fill:#ff4757,color:white,stroke:#333,stroke-width:2px;
    classDef n1 fill:#5352ed,color:white,stroke:#333,stroke-width:2px;
    classDef n0 fill:#2ed573,color:white,stroke:#333,stroke-width:2px;

    %% NIVEAU N+2 : DIRECTION
    subgraph STRATEGIC_BOARD [N+2 : DIRECTION STRATÉGIQUE]
        direction TB
        Pierre[👤 PIERRE<br/>CEO & Vision]
        Nexus[🤖 NEXUS<br/>Superviseur IA]
    end

    %% NIVEAU N+1 : MANAGEMENT
    subgraph MANAGEMENT [N+1 : PÔLE MANAGEMENT]
        direction LR
        Alpha[🧠 ALPHA<br/>Lead Stratégie]
        Beta[🎨 BETA<br/>Directeur Créatif]
        Gamma[📢 GAMMA<br/>Head of Social]
        Delta[📊 DELTA<br/>Chief Data Officer]
    end

    %% NIVEAU N : OPÉRATIONNEL
    subgraph OPS [N : AGENTS OPÉRATIONNELS]
        direction TB
        
        %% Équipe Stratégie (Alpha)
        Planner[📅 Planner Bot]
        
        %% Équipe Créa (Beta)
        CopyBot[✍️ Copywriter]
        VisualBot[🖼️ Visual Maker]
        
        %% Équipe Social (Gamma)
        ReplyBot[💬 Reply Bot]
        TrendBot[📈 Trend Hunter]
        
        %% Équipe Data (Delta)
        Scraper[🕷️ Scraper GK]
        Analyst[📉 Analyst Bot]
    end

    %% LIENS HIÉRARCHIQUES
    Pierre --> Nexus
    Nexus --> Alpha & Beta & Gamma & Delta
    
    Alpha --> Planner
    Beta --> CopyBot & VisualBot
    Gamma --> ReplyBot & TrendBot
    Delta --> Scraper & Analyst

    %% Classes
    class Pierre,Nexus n2;
    class Alpha,Beta,Gamma,Delta n1;
    class Planner,CopyBot,VisualBot,ReplyBot,TrendBot,Scraper,Analyst n0;
```

## 🗺️ Légende
*   🔴 **Rouge** : Décideurs (Vous & Nexus)
*   🔵 **Bleu** : Managers (Coordinateurs)
*   🟢 **Vert** : Exécutants (Agents spécialisés)
