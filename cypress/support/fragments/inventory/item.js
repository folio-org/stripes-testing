import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../constants';

// eslint-disable-next-line import/prefer-default-export
export const getNewItem = () => ({
  id: uuid(),
  barcode: uuid(),
  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
});
