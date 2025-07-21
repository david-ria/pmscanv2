# Shared Components

This directory contains reusable UI components that are used across multiple parts of the application.

## Components

### BaseCard
A fundamental card component that provides consistent styling and structure for content containers.

### BaseFormDialog
A standardized dialog component for forms with consistent button layouts and validation.

### DataDisplay
Components for displaying PM sensor data with consistent formatting and styling.

### LoadingStates
Reusable loading components for consistent user feedback during data operations.

## Usage Guidelines

- All shared components should follow the design system defined in `src/index.css`
- Use semantic color tokens instead of hardcoded colors
- Ensure mobile responsiveness with proper touch targets (minimum 44px)
- Include proper TypeScript interfaces for all props