import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import StarRating from './StarRating.jsx';

it('shows five star buttons and marks the current rating', () => {
  render(<StarRating value={3} onChange={() => {}} />);
  expect(screen.getAllByRole('button')).toHaveLength(5);
  expect(screen.getByRole('button', { name: /rate 3 of 5/i }))
    .toHaveAttribute('aria-pressed', 'true');
});

it('calls onChange with the star that was clicked', async () => {
  const onChange = vi.fn();
  render(<StarRating value={null} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: /rate 4 of 5/i }));
  expect(onChange).toHaveBeenCalledWith(4);
});

it('clears the rating when the current star is clicked again', async () => {
  const onChange = vi.fn();
  render(<StarRating value={4} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: /rate 4 of 5/i }));
  expect(onChange).toHaveBeenCalledWith(null);
});

it('has no buttons when it only displays a rating', () => {
  render(<StarRating value={2} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByLabelText('2 of 5 stars')).toBeInTheDocument();
});
