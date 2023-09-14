import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../constants';

export default {
  createNoteTypeViaApi: (noteTypeName) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'note-types',
        body: {
          id: uuid(),
          name: noteTypeName,
        },
      })
      .then((response) => response.body);
  },

  deleteNoteTypeViaApi: (noteTypeId) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `note-types/${noteTypeId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
