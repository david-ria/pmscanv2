import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../button';

describe('Button component', () => {
  it('renders provided children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Press</Button>);

    fireEvent.click(screen.getByRole('button', { name: /press/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    fireEvent.click(screen.getByRole('button', { name: /disabled/i }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards custom className', () => {
    render(<Button className="test-class">With class</Button>);
    const btn = screen.getByRole('button', { name: /with class/i });
    expect(btn).toHaveClass('test-class');
  });

  // If your Button supports asChild (shadcn/ui pattern), this verifies it renders non-button children.
  // Keep it if your component exposes `asChild`; otherwise you can remove this test.
  it('supports asChild when provided (if implemented)', () => {
    // @ts-expect-error — test only if Button supports asChild prop
    render(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      <Button asChild>
        <a href="#go">Go link</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: /go link/i });
    expect(link).toBeInTheDocument();
  });
});
