import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import {
  including,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  TextField,
} from '../../../../../../interactors';
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

  verifyEditRowInList({ name, source, lastUpdated = [] }) {
    const row = MultiColumnListRow({ innerHTML: including(name), isContainer: false });
    const sourceCell = row.find(MultiColumnListCell({ column: 'Source' }));
    const lastUpdatedCell = row.find(MultiColumnListCell({ column: 'Last updated' }));

    cy.expect([
      row.find(TextField({ placeholder: 'name' })).has({ value: name }),
      sourceCell.has({ content: source }),
      sourceCell.find(TextField()).absent(),
      lastUpdatedCell.find(TextField()).absent(),
    ]);
    lastUpdated.forEach((text) => {
      cy.expect(lastUpdatedCell.has({ content: including(text) }));
    });
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Holdings sources');
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
