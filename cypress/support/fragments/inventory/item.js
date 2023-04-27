import uuid from 'uuid';
import { ITEM_STATUSES } from '../../constants';

export const getNewItem = () => ({
  id: uuid(),
  barcode: uuid(),
  status: { name: ITEM_STATUSES.AVAILABLE },
});
