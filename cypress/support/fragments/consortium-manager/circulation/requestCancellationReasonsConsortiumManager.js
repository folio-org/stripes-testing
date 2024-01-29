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

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

export default {
  createViaApi: (reason) => {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/cancellation-reason-storage/cancellation-reasons',
          settingId: id,
          payload: {
            id,
            name: reason.payload.name,
          },
        },
      }).then(() => {
        reason.url = '/cancellation-reason-storage/cancellation-reasons';
        reason.settingId = id;
        reason.id = id;
        reason.source = 'consortium';
        return reason;
      });
    });
  },

  deleteViaApi: (reason) => {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${reason.settingId}`,
        body: reason,
      });
    });
  },

  verifyReasonInTheList(name, members, ...actions) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 3, content: members })).exists(),
    ]);
    if (actions.length === 0) {
      cy.expect(row.find(actionsCell).has({ content: '' }));
    } else {
      Object.values(reasonsActions).forEach((action) => {
        const buttonSelector = row.find(actionsCell).find(Button({ icon: action }));
        if (actions.includes(action)) {
          cy.expect(buttonSelector.exists());
        } else {
          cy.expect(buttonSelector.absent());
        }
      });
    }
  },

  verifyNoReasonInTheList(name) {
    cy.expect(MultiColumnListRow({ content: including(name) }).absent());
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Request cancellation reasons');
    [
      'Cancel reason',
      'Description (internal)',
      'Description (public)',
      'Member libraries',
      'Actions',
    ].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
