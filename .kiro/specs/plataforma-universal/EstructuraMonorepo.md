### Estructura Monorepo

```
sync/                                    ← Monorepo principal
├── 📋 README.md                         ← Punto de entrada principal
├── 📋 package.json                      ← Root package.json con workspaces
├── 📋 pnpm-workspace.yaml               ← Configuración de workspaces
├── 📋 .gitignore                        ← Gitignore actualizado
├── 📋 CHANGELOG.md                      ← Changelog centralizado
├── 📋 CONTRIBUTING.md                   ← Guía de contribución
│
├── 📁 .github/                          ← CI/CD y templates
│   ├── workflows/
│   │   ├── credisync-deploy.yml         ← Pipeline CrediSync
│   │   ├── healthsync-deploy.yml        ← Pipeline HealthSync
│   │   ├── surveysync-deploy.yml        ← Pipeline SurveySync
│   │   └── packages-test.yml            ← Tests de packages
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── 📁 apps/                             ← APLICACIONES
│   ├── 📁 credisync/                    ← CrediSync (código actual migrado)
│   │   ├── 📋 README.md
│   │   ├── 📋 package.json              ← Dependencies específicas
│   │   ├── 📋 vite.config.ts
│   │   ├── 📋 vercel.json               ← Config deployment
│   │   ├── 📋 .env.example
│   │   ├── 📁 src/                      ← Código fuente actual
│   │   ├── 📁 public/                   ← Assets públicos
│   │   └── 📁 docs/                     ← Docs específicas
│   │       ├── 📋 business-logic.md
│   │       ├── 📋 user-guide.md
│   │       └── 📋 deployment.md
│   │
│   ├── 📁 healthsync/                   ← HealthSync (placeholder)
│   │   ├── 📋 README.md
│   │   ├── 📋 package.json
│   │   └── 📁 src/                      ← Estructura básica
│   │
│   └── 📁 surveysync/                   ← SurveySync (placeholder)
│       ├── 📋 README.md
│       ├── 📋 package.json
│       └── 📁 src/                      ← Estructura básica
│
├── 📁 packages/                         ← PACKAGES COMPARTIDOS
│   ├── 📁 @sync/core/                   ← Infraestructura offline-first
│   │   ├── 📋 README.md
│   │   ├── 📋 package.json
│   │   ├── 📋 tsconfig.json
│   │   ├── 📁 src/
│   │   │   ├── 📁 db/                   ← IndexedDB + Dexie
│   │   │   ├── 📁 sync/                 ← Sync Manager + CRDT
│   │   │   ├── 📁 storage/              ← Multi-layer storage
│   │   │   ├── 📁 audit/                ← Audit logging
│   │   │   ├── 📁 security/             ← Encryption + Auth
│   │   │   ├── 📁 validation/           ← Zod schemas
│   │   │   ├── 📁 calculations/         ← Business logic
│   │   │   └── 📋 index.ts              ← Main exports
│   │   ├── 📁 tests/
│   │   └── 📁 docs/
│   │
│   ├── 📁 @sync/ui/                     ← Componentes UI compartidos
│   │   ├── 📋 README.md
│   │   ├── 📋 package.json
│   │   ├── 📁 src/
│   │   │   ├── 📁 components/           ← Svelte components
│   │   │   ├── 📁 stores/               ← Svelte stores
│   │   │   ├── 📁 actions/              ← Svelte actions
│   │   │   ├── 📁 styles/               ← CSS compartidos
│   │   │   └── 📋 index.ts
│   │   ├── 📁 storybook/                ← Component documentation
│   │   └── 📁 tests/
│   │
│   └── 📁 @sync/types/                  ← TypeScript types compartidos
│       ├── 📋 README.md
│       ├── 📋 package.json
│       ├── 📁 src/
│       │   ├── 📋 database.ts           ← DB interfaces
│       │   ├── 📋 api.ts                ← API types
│       │   ├── 📋 business.ts           ← Business logic types
│       │   ├── 📋 ui.ts                 ← UI component types
│       │   └── 📋 index.ts
│       └── 📁 tests/
│
├── 📁 docs/                             ← DOCUMENTACIÓN PRINCIPAL
│   ├── 📋 README.md                     ← Índice de documentación
│   ├── 📁 architecture/                 ← Arquitectura del monorepo
│   │   ├── 📋 overview.md
│   │   ├── 📋 monorepo-structure.md
│   │   ├── 📋 shared-packages.md
│   │   └── 📋 deployment-strategy.md
│   ├── 📁 development/                  ← Guías de desarrollo
│   │   ├── 📋 getting-started.md
│   │   ├── 📋 monorepo-workflow.md
│   │   ├── 📋 adding-new-apps.md
│   │   └── 📋 package-development.md
│   ├── 📁 deployment/
│   │   ├── 📋 vercel-setup.md
│   │   ├── 📋 environment-variables.md
│   │   └── 📋 ci-cd-pipelines.md
│   └── 📁 migration/                    ← Documentación de migración
│       ├── 📋 migration-log.md
│       ├── 📋 rollback-procedures.md
│       └── 📋 validation-checklist.md
│
├── 📁 specs/                            ← ESPECIFICACIONES KIRO
│   ├── 📋 README.md
│   ├── 📁 platform/                     ← Specs de la plataforma
│   │   ├── 📋 requirements.md
│   │   ├── 📋 design.md
│   │   └── 📋 tasks.md
│   ├── 📁 credisync/                    ← Specs de CrediSync (migradas)
│   │   ├── 📋 requirements.md
│   │   ├── 📋 design.md
│   │   └── 📋 tasks.md
│   ├── 📁 healthsync/                   ← Specs de HealthSync (futuro)
│   │   ├── 📋 requirements.md
│   │   ├── 📋 design.md
│   │   └── 📋 tasks.md
│   ├── 📁 surveysync/                   ← Specs de SurveySync (futuro)
│   │   ├── 📋 requirements.md
│   │   ├── 📋 design.md
│   │   └── 📋 tasks.md
│   └── 📁 monorepo-migration/           ← Specs de migración (actual)
│       ├── 📋 requirements.md
│       ├── 📋 design.md
│       └── 📋 tasks.md
│
├── 📁 tools/                            ← HERRAMIENTAS Y SCRIPTS
│   ├── 📋 README.md
│   ├── 📁 scripts/
│   │   ├── 📋 create-app.js             ← Script para crear nuevas apps
│   │   ├── 📋 migrate-package.js        ← Script para extraer packages
│   │   ├── 📋 build-all.js              ← Build todas las apps
│   │   └── 📋 test-all.js               ← Test todo el monorepo
│   ├── 📁 templates/
│   │   ├── 📁 app-template/             ← Template para nuevas apps
│   │   └── 📁 package-template/         ← Template para packages
│   └── 📁 generators/
│       └── 📋 plop-config.js            ← Generadores automáticos
│
└── 📁 .archive/                         ← ARCHIVOS HISTÓRICOS
    ├── 📁 migration-backup/             ← Backup pre-migración
    ├── 📁 old-structure/                ← Estructura anterior
    └── 📁 migration-logs/               ← Logs de migración
```

