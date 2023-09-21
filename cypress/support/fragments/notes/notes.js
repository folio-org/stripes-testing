import uuid from 'uuid';
import { REQUEST_METHOD } from '../../constants';
import { randomFourDigitNumber } from '../../utils/stringTools';

const defaultNote = ({ typeId, agreementId }) => {
  return {
    domain: 'agreements',
    typeId,
    title: `Default Note Title ${randomFourDigitNumber()}`,
    content: 'Default Note Details',
    links: [
      {
        type: 'agreement',
        id: agreementId,
      },
    ],
    id: uuid(),
  };
};

const defaultUnassignedNote = ({ typeId }) => {
  return {
    domain: 'agreements',
    typeId,
    title: `Default  Unassigned Note Title ${randomFourDigitNumber()}`,
    content: 'Default Note Details',
    id: uuid(),
  };
};

export default {
  defaultNote,
  defaultUnassignedNote,

  createViaApi: (note) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'notes',
        body: note,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },
};
