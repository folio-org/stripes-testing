import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';

const id = uuid();

export const typeActions = {
  edit: 'edit',
  trash: 'trash',
};

export default {
  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/holdings-sources',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
          },
        },
      }).then(() => {
        type.url = '/holdings-sources';
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
    ConsortiumManagerApp.chooseSecondMenuItem('Holdings sources');
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
