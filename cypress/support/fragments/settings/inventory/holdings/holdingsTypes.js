import {
  Button,
  including,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiColumnListCell,
  Pane,
} from '../../../../../../interactors';

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

const rootPane = Pane('Holdings types');

export default {
  createViaApi: (body) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'holdings-types',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
  deleteViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `holdings-types/${id}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  }),
  getViaApi: (searchParams = { limit: 1 }) => {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'holdings-types',
        searchParams,
      })
      .then(({ body }) => {
        return body.holdingsTypes;
      });
  },

  waitLoading() {
    ['Name', 'Source', 'Last updated', 'Actions'].forEach((header) => {
      cy.expect(rootPane.find(MultiColumnListHeader(header)).exists());
    });
  },

  verifyConsortiumHoldingsTypeInTheList({ name, source = 'consortium', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name), isContainer: true });
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

  verifyLocalHoldingsTypeInTheList({ name, source = 'local', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name), isContainer: true });
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

  verifyHoldingsTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name), isContainer: true });
    cy.expect(row.absent());
  },

  clickTrashButtonForHoldingsType(name) {
    cy.do([
      MultiColumnListRow({ content: including(name), isContainer: true })
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
};
