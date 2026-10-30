import {
  Button,
  including,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiColumnListCell,
  NavListItem,
  Pane,
} from '../../../../../../interactors';

const sectionName = 'Modes of issuance';
const rootPane = Pane(sectionName);
const actionsCell = MultiColumnListCell({ columnIndex: 3 });

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};
export default {
  createViaApi: (body) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'modes-of-issuance',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
  deleteViaApi: (id) =>
    cy.okapiRequest({
      method: 'DELETE',
      path: `modes-of-issuance/${id}`,
      isDefaultSearchParamsRequired: false,
    }),
  verifyConsortiumModesOfIssuancesInTheList({ name, source = 'consortium', actions = [] }) {
    const row = MultiColumnListRow({
      content: including(name),
      isContainer: false,
    });
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

  verifyLocalModesOfIssuancesInTheList({ name, source = 'local', lastUpdated = [], actions = [] }) {
    const row = MultiColumnListRow({ content: including(name), isContainer: false });
    const rowActionsCell = row.find(MultiColumnListCell({ column: 'Actions' }));
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ column: 'Source', content: source })).exists(),
    ]);
    lastUpdated.forEach((text) => {
      cy.expect(
        row
          .find(MultiColumnListCell({ column: 'Last updated', content: including(text) }))
          .exists(),
      );
    });
    if (actions.length === 0) {
      cy.expect(rowActionsCell.has({ content: '' }));
    } else {
      Object.values(reasonsActions).forEach((action) => {
        const buttonSelector = rowActionsCell.find(Button({ icon: action }));
        if (actions.includes(action)) {
          cy.expect(buttonSelector.exists());
        } else {
          cy.expect(buttonSelector.absent());
        }
      });
    }
  },

  verifyModesOfIssuancesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForModesOfIssuances(name) {
    cy.do([
      MultiColumnListRow({ content: including(name) })
        .find(actionsCell)
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
  waitLoading() {
    ['Name', 'Source', 'Last updated', 'Actions'].forEach((header) => {
      cy.expect(rootPane.find(MultiColumnListHeader(header)).exists());
    });
  },

  verifyNewButtonActive() {
    cy.expect(rootPane.find(Button('New')).has({ disabled: false }));
  },

  choose() {
    cy.do([NavListItem(sectionName).click(), rootPane.exists()]);
  },
};
