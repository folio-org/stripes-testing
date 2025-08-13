import {
  Button,
  including,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiColumnListHeader,
} from '../../../../../../interactors';
import SettingsPane from '../../settingsPane';

const settingsOption = 'Holdings sources';

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};
export default {
  getHoldingsSourcesViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'holdings-sources',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.holdingsRecordsSources;
      });
  },
  createViaApi: (body) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'holdings-sources',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
  deleteViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `holdings-sources/${id}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  }),
  waitLoading() {
    ['Name', 'Source', 'Last updated', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
  open() {
    SettingsPane.selectSettingsTab(settingsOption);
    this.waitLoading();
  },
  verifyConsortiumHoldingsSourcesInTheList({ name, source = 'consortium', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 3 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: source })).exists(),
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

  verifyLocalHoldingsSourcesInTheList({ name, source = '', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name), isContainer: false });
    const actionsCell = MultiColumnListCell({ columnIndex: 3 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: source })).exists(),
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

  verifyHoldingsSourcesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForHoldingsSources(name) {
    cy.do([
      MultiColumnListRow({ content: including(name) })
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
};
