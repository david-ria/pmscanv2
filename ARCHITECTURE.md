# PMScan V2 - Architecture Documentation

## Project Overview

PMScan V2 is a progressive web application for air quality monitoring using Bluetooth-connected PM sensors. Built with React, TypeScript, and Tailwind CSS, the app provides real-time monitoring, data logging, and analysis capabilities.

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context + Custom Hooks
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **Mobile**: Capacitor for native capabilities
- **Build Tool**: Vite

## Architecture Principles

### 1. Mobile-First Design
- All components optimized for touch interfaces
- Minimum touch target size: 44px
- Responsive breakpoints aligned with Tailwind standards
- Progressive enhancement for larger screens

### 2. Design System Consistency
- Semantic color tokens defined in `src/index.css`
- All colors use HSL format for better manipulation
- Professional color palette focused on environmental themes
- Consistent spacing, typography, and component variants

### 3. Component Architecture
```
src/components/
├── shared/          # Reusable components
├── ui/             # Shadcn/ui components
├── MobileNavigation/ # Mobile-specific navigation
├── Analysis/       # Data analysis components
├── Groups/         # Group management
└── ...             # Feature-specific components
```

### 4. Hook-Based Logic
- Custom hooks encapsulate business logic
- Separation of concerns between UI and data
- Reusable state management patterns
- Proper cleanup and error handling

## Key Features

### Real-Time Monitoring
- Bluetooth PM sensor connectivity
- Live data visualization
- Location-based context awareness

### Data Management
- Local storage with Supabase sync
- Background recording capabilities
- Export functionality (CSV, PDF)

### Group Collaboration
- Multi-user group management
- Shared thresholds and settings
- Invitation system

### Analysis Tools
- Statistical analysis
- WHO compliance tracking
- Pollution source breakdown

## Code Quality Standards

### TypeScript
- Strict type checking enabled
- Proper interface definitions
- Generic types for reusability

### Performance
- Lazy loading for routes
- Optimized re-renders with proper deps
- Efficient state updates

### Accessibility
- Semantic HTML structure
- Proper ARIA labels
- Keyboard navigation support
- Color contrast compliance

### Mobile Optimization
- Touch-friendly interactions
- Responsive design patterns
- Performance considerations for mobile devices

## Development Guidelines

### Component Creation
1. Start with TypeScript interfaces for props
2. Use semantic design tokens, not hardcoded colors
3. Add proper JSDoc documentation
4. Ensure mobile responsiveness
5. Include error boundaries where needed

### Styling Guidelines
1. Use Tailwind utility classes
2. Leverage design system tokens from `index.css`
3. Avoid inline styles unless dynamic
4. Follow mobile-first responsive patterns

### State Management
1. Use custom hooks for complex logic
2. Implement proper error handling
3. Include loading states
4. Add cleanup functions for subscriptions

## File Organization

```
src/
├── components/     # UI components
├── hooks/         # Custom React hooks
├── contexts/      # React contexts
├── pages/         # Route components
├── lib/           # Utility functions
├── types/         # TypeScript definitions
├── integrations/  # External service integrations
└── i18n/          # Internationalization
```

## Performance Considerations

### Bundle Optimization
- Tree-shaking enabled
- Code splitting by routes
- Optimized imports

### Runtime Performance
- Proper dependency arrays in hooks
- Memoization where appropriate
- Efficient re-render patterns

### Mobile Performance
- Touch event optimization
- Reduced bundle size for mobile
- Efficient background processing

## Security

### Data Protection
- Supabase RLS policies
- Secure authentication flows
- Encrypted data transmission

### Code Security
- No hardcoded secrets
- Proper environment variable usage
- Input validation and sanitization

## Future Considerations

### Scalability
- Modular component architecture
- Extensible hook patterns
- Flexible theming system

### Maintainability
- Comprehensive documentation
- Type safety throughout
- Consistent code patterns
- Automated testing setup ready