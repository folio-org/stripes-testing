import uuid from 'uuid';
import { REQUEST_METHOD } from '../../constants';

const defaultNote = ({ typeId, agreementId }) => {
  return {
    domain: 'agreements',
    typeId,
    title: 'Default Note Title',
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

export default {
  defaultNote,

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
