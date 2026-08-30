# Tendering IA — Frontend

Interface web du projet **Tendering IA**, construite avec **React 19**, **TypeScript** et **Vite**.

## Stack technique

- **React 19** + **TypeScript**
- **Vite** — bundler & serveur de développement
- **Tailwind CSS 4** + **shadcn/ui** — styles et composants UI
- **React Router** — routing
- **TanStack Query** & **TanStack Table** — données & tableaux
- **Zustand** — gestion d'état
- **Axios** — appels API
- **React Hook Form** — formulaires
- **Recharts** — graphiques

## Prérequis

- **Node.js** ≥ 18 ([télécharger](https://nodejs.org/))
- **pnpm** ≥ 9 — gestionnaire de paquets utilisé par le projet

  ```bash
  npm install -g pnpm
  ```

## Installation

1. Cloner le dépôt :

   ```bash
   git clone https://github.com/<ton-utilisateur>/tendering-ia-ui.git
   cd tendering-ia-ui
   ```

2. Installer les dépendances :

   ```bash
   pnpm install
   ```

3. Configurer les variables d'environnement — copier le fichier d'exemple :

   ```bash
   cp .env.example .env
   ```

   Puis adapter `.env` selon ton environnement :

   | Variable       | Description                | Valeur par défaut       |
   | -------------- | -------------------------- | ----------------------- |
   | `VITE_API_URL` | URL de l'API backend       | `http://localhost:8000` |

## Lancer le projet

Serveur de développement (avec rechargement à chaud) :

```bash
pnpm dev
```

L'application est ensuite disponible sur **http://localhost:5173**.

## Scripts disponibles

| Commande        | Description                                              |
| --------------- | ------------------------------------------------------- |
| `pnpm dev`      | Lance le serveur de développement (HMR)                 |
| `pnpm build`    | Compile TypeScript et génère le build de production      |
| `pnpm preview`  | Prévisualise localement le build de production           |
| `pnpm lint`     | Analyse le code avec ESLint                             |
| `pnpm test`     | Exécute les tests unitaires et les contrats API         |
| `pnpm test:coverage` | Exécute les tests et génère la couverture V8       |

## Build de production

```bash
pnpm build
```

Les fichiers optimisés sont générés dans le dossier `dist/`. Pour les prévisualiser :

```bash
pnpm preview
```

## Structure du projet

```
tendering-ia-ui/
├── public/            # Fichiers statiques
├── src/               # Code source de l'application
├── index.html         # Point d'entrée HTML
├── vite.config.ts     # Configuration Vite
├── components.json    # Configuration shadcn/ui
├── .env.example       # Modèle de variables d'environnement
└── package.json
```
