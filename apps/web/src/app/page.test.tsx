import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './page';

test('renders homepage text', () => {
  render(<Home />);
  expect(screen.getByText(/place one sovereign per row/i)).toBeInTheDocument();
});
