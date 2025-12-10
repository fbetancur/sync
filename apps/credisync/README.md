# CrediSync

> Offline-first microcredit management application

[![Build Status](https://github.com/fbetancur/sync/workflows/CrediSync%20Deploy/badge.svg)](https://github.com/fbetancur/sync/actions)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://credisync-green.vercel.app)

## 🚀 Status

✅ **Production Ready** - Fully functional offline-first microcredit management system.

## ✨ Features

- 📱 **PWA Support**: Install as native app on mobile and desktop
- 🔄 **Offline-First**: Works completely offline with intelligent sync
- 🛡️ **Secure**: End-to-end encryption and audit logging
- 📊 **Analytics**: Real-time dashboards and reporting
- 🎯 **User-Friendly**: Intuitive interface designed for field workers
- 🔐 **Multi-tenant**: Support for multiple organizations

## 🏗️ Architecture

CrediSync is built using the shared Sync Platform infrastructure:

- **@sync/core**: Offline-first data management and sync
- **@sync/types**: Shared TypeScript interfaces
- **@sync/ui**: Reusable UI components
- **SvelteKit 5**: Modern web framework
- **IndexedDB**: Local data storage
- **Supabase**: Backend and real-time sync

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+

### Development

```bash
# From monorepo root
pnpm install

# Start development server
pnpm dev:credisync

# Build for production
pnpm build:credisync

# Run tests
pnpm test:credisync
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Configure required variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📱 Core Functionality

### Tenant Management
- Create and manage organizations
- User roles and permissions
- Multi-tenant data isolation

### Client Management
- Client registration and profiles
- Document management
- Credit history tracking

### Loan Management
- Loan application and approval
- Payment tracking and schedules
- Interest calculations
- Overdue management

### Offline Capabilities
- Full functionality without internet
- Intelligent conflict resolution
- Automatic sync when online
- Data integrity guarantees

### Security Features
- End-to-end encryption
- Audit logging
- Secure authentication
- Data validation

## 🛠️ Development

### Project Structure

```
apps/credisync/
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   ├── stores/         # Svelte stores
│   │   └── utils/          # Utility functions
│   ├── routes/             # SvelteKit routes
│   └── app.html            # HTML template
├── static/                 # Static assets
├── tests/                  # Test files
└── package.json
```

### Key Technologies

- **Frontend**: SvelteKit 5, TailwindCSS, DaisyUI
- **State Management**: Svelte stores + @sync/core
- **Database**: IndexedDB (Dexie.js) + Supabase
- **Testing**: Vitest, Testing Library
- **Build**: Vite, TypeScript
- **PWA**: Workbox, Service Workers

### Available Scripts

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm preview                # Preview production build

# Testing
pnpm test                   # Run tests
pnpm test:ui                # Run tests with UI
pnpm coverage               # Generate coverage report

# Quality
pnpm lint                   # Lint code
pnpm format                 # Format code
pnpm type-check             # TypeScript check

# Deployment
pnpm deploy                 # Deploy to Vercel
```

## 🌐 Deployment

### Production

- **URL**: https://credisync-green.vercel.app
- **Platform**: Vercel
- **Auto-deploy**: On push to `main` branch
- **Environment**: Production variables configured in Vercel

### Staging

- **Preview deployments**: Automatic on pull requests
- **Testing**: Full feature testing before merge

## 📊 Performance

- **Bundle Size**: ~347KB (optimized)
- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **Offline Support**: 100% functional offline
- **PWA Score**: 100% compliant

## 🧪 Testing

### Test Coverage

- **Unit Tests**: Core business logic
- **Integration Tests**: Component interactions
- **E2E Tests**: Full user workflows
- **Performance Tests**: Load and stress testing

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# E2E tests
pnpm test:e2e
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `VITE_APP_NAME` | Application name | ❌ |
| `VITE_APP_VERSION` | Application version | ❌ |

### Build Configuration

- **Vite**: Modern build tool with HMR
- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **PostCSS**: CSS processing with TailwindCSS

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**: Check TypeScript configuration
2. **Sync Issues**: Verify Supabase connection
3. **PWA Issues**: Check service worker registration
4. **Performance**: Use bundle analyzer

### Debug Mode

```bash
# Enable debug logging
VITE_DEBUG=true pnpm dev

# Verbose logging
VITE_LOG_LEVEL=debug pnpm dev
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Update documentation
- Follow conventional commits
- Ensure PWA compliance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev/)
- Powered by [Supabase](https://supabase.com/)
- Styled with [TailwindCSS](https://tailwindcss.com/)
- Icons by [Heroicons](https://heroicons.com/)

---

**CrediSync** - Empowering financial inclusion through technology 💳✨