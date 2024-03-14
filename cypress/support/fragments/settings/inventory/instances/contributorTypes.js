import {
  Button,
  including,
  MultiColumnListRow,
  MultiColumnListCell,
  NavListItem,
  Pane,
} from '../../../../../../interactors';

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};
export default {
  createViaApi: (body) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'contributor-types',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
  deleteViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `contributor-types/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
  verifyConsortiumContributorTypesInTheList({ name, source = 'consortium', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 2, content: source })).exists(),
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

  verifyLocalContributorTypesInTheList({ name, source = 'local', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 2, content: source })).exists(),
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

  verifyContributorTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForContributorTypes(name) {
    cy.do([
      MultiColumnListRow({ content: including(name) })
        .find(MultiColumnListCell({ columnIndex: 4 }))
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
  choose() {
    cy.do([NavListItem('Contributor types').click(), Pane('Contributor types').exists()]);
  },
};
