import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from '../button';

describe('Button component', () => {
  it('renders provided children', () => {
    render(<Button>Click me</Button>);
    // uses jest-dom matcher we installed in setup.ts
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
