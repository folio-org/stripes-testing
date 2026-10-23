import {
  Button,
  including,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiColumnListCell,
  NavListItem,
  Pane,
} from '../../../../../../interactors';

const sectionName = 'Resource identifier types';
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
        path: 'identifier-types',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
  deleteViaApi: (id, { failOnStatusCode } = {}) => cy.okapiRequest({
    method: 'DELETE',
    path: `identifier-types/${id}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode,
  }),
  verifyConsortiumResourceIdentifierTypesInTheList({ name, source = 'consortium', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name), isContainer: false });
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

  verifyLocalResourceIdentifierTypesInTheList({
    name,
    source = 'local',
    lastUpdated = [],
    actions = [],
  }) {
    const row = MultiColumnListRow({ content: including(name), isContainer: false });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: source })).exists(),
    ]);
    lastUpdated.forEach((text) => {
      cy.expect(
        row.find(MultiColumnListCell({ columnIndex: 2, content: including(text) })).exists(),
      );
    });
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

  verifyResourceIdentifierTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForResourceIdentifierTypes(name) {
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
