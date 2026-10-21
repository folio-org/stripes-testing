import {
  Button,
  including,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiColumnListCell,
  NavListItem,
  Pane,
  TextField,
  matching,
} from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';

const rootPane = Pane('Contributor types');

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
    failOnStatusCode: false,
  }),
  getViaApi: (searchParams) => cy
    .okapiRequest({
      path: 'contributor-types',
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => {
      return response.body.contributorTypes;
    }),
  waitLoading() {
    ['Name', 'Code', 'Source', 'Last updated', 'Actions'].forEach((header) => {
      cy.expect(rootPane.find(MultiColumnListHeader(header)).exists());
    });
  },
  verifyConsortiumContributorTypesInTheList({ name, source = 'consortium', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name), isContainer: false });
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
    const row = MultiColumnListRow({ content: including(name), isContainer: false });
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

  verifyContributorTypeShown({ name, code, source, lastUpdated = [], actions = [] }) {
    const row = MultiColumnListRow({
      innerText: matching(new RegExp(`^${name}\n`)),
      isContainer: false,
    });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.expect(row.exists());
    if (code) cy.expect(row.find(MultiColumnListCell({ columnIndex: 1, content: code })).exists());
    if (source) cy.expect(row.find(MultiColumnListCell({ columnIndex: 2, content: source })).exists());
    lastUpdated.forEach((text) => {
      cy.expect(
        row.find(MultiColumnListCell({ columnIndex: 3, content: including(text) })).exists(),
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

  verifyContributorTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  createContributorType({ name, code }) {
    cy.do([
      Button('New').click(),
      TextField({ name: 'items[0].name' }).fillIn(name),
      TextField({ name: 'items[0].code' }).fillIn(code),
      Button('Save').click(),
    ]);
  },

  verifyContributorTypeDeletedCallout(name) {
    InteractorsTools.checkCalloutMessage(`The Contributor type ${name} was successfully deleted`);
  },

  clickTrashButtonForContributorTypes(name) {
    cy.do([
      MultiColumnListRow({ content: including(name), isContainer: false })
        .find(MultiColumnListCell({ columnIndex: 4 }))
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
  verifyNewButtonActive() {
    cy.expect(rootPane.find(Button('New')).has({ disabled: false }));
  },

  choose() {
    cy.do(NavListItem('Contributor types').click());
    this.waitLoading();
  },
};
