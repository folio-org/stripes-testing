import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';

export default {
  createNoteTypeViaApi: (noteTypeName) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'item-note-types',
        body: {
          id: uuid(),
          name: noteTypeName,
          source: 'local',
        },
      })
      .then((response) => response.body.id);
  },

  deleteNoteTypeViaApi: (noteTypeId) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `item-note-types/${noteTypeId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
