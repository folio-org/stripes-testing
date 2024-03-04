import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../constants';
import { MultiColumnListHeader } from '../../../../../interactors';
import ConsortiumManagerApp from '../consortiumManagerApp';

const id = uuid();

export default {
  createViaApi: (group) => {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/groups',
          settingId: id,
          payload: {
            group: group.payload.group,
            id,
          },
        },
      }).then(() => {
        group.url = '/groups';
        group.settingId = id;
        return group;
      });
    });
  },

  deleteViaApi: (group) => {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${group.settingId}`,
        body: group,
      });
    });
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Patron groups');
    [
      'Patron group',
      'Description',
      'Expiration date offset (days)',
      'Last updated',
      'Member libraries',
      'Actions',
    ].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
