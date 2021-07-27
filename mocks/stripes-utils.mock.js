import React from 'react';

jest.mock('@folio/stripes/util', () => ({
  exportCsv: jest.fn(),
}));
