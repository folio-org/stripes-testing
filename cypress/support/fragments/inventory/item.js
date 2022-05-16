import uuid from 'uuid';

export const getNewItem = () => ({
  id: uuid(),
  barcode: uuid(),
  status: { name: 'Available' },
});
