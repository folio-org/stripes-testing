import { v4 as uuid } from 'uuid';

import { RECEIVING_PIECE_FORMATS, RECEIVING_PIECE_STATUSES } from '../../../constants';

const defaultPiece = {
  id: uuid(),
  format: RECEIVING_PIECE_FORMATS.PHYSICAL,
  receivingStatus: RECEIVING_PIECE_STATUSES.EXPECTED,
};

export default {
  defaultPiece,
};
