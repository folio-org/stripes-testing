import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../constants';
import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  including,
  MultiColumnListHeader,
} from '../../../../../interactors';
import ConsortiumManagerApp from '../consortiumManagerApp';

const id = uuid();

export const groupsActions = {
  edit: 'edit',
  trash: 'trash',
};

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

  verifyGroupInTheList(name, members, ...actions) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 5 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 4, content: members })).exists(),
    ]);
    if (actions.length === 0) {
      cy.expect(row.find(actionsCell).has({ content: '' }));
    } else {
      Object.values(groupsActions).forEach((action) => {
        const buttonSelector = row.find(actionsCell).find(Button({ icon: action }));
        if (actions.includes(action)) {
          cy.expect(buttonSelector.exists());
        } else {
          cy.expect(buttonSelector.absent());
        }
      });
    }
  },

  verifyNoGroupInTheList(name) {
    cy.expect(MultiColumnListRow({ content: including(name) }).absent());
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
