import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { Button, MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';

const id = uuid();
const newButton = Button('+ New');

export default {
  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/alternative-title-types',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
          },
        },
      }).then(() => {
        type.url = '/alternative-title-types';
        type.settingId = id;
        return type;
      });
    });
  },

  deleteViaApi(type) {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${type.settingId}`,
        body: type,
      });
    });
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Alternative title types');
    cy.expect(newButton.is({ disabled: false }));
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};