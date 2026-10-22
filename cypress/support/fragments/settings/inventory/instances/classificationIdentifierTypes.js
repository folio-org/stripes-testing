import {
  Button,
  including,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiColumnListCell,
  NavListItem,
  Pane,
  TextField,
} from '../../../../../../interactors';

export const identifierTypesSectionName = 'Classification identifier types';

const rootPane = Pane(identifierTypesSectionName);
const actionsCell = MultiColumnListCell({ columnIndex: 3 });
const newButton = Button('+ New');

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

const API = {
  createViaApi(body) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'classification-types',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
  deleteViaApi(id, { ignoreErrors = false } = {}) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `classification-types/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: !ignoreErrors,
    });
  },
  getViaApi() {
    return cy.okapiRequest({ path: 'classification-types' }).then((response) => {
      return response.body?.classificationTypes;
    });
  },

  deleteViaApiByName(name) {
    return this.getViaApi().then((classificationIdentifierTypes) => {
      classificationIdentifierTypes
        .filter((classificationIdentifierType) => new RegExp(name).test(classificationIdentifierType.name))
        .map((classificationIdentifierType) => this.deleteViaApi(classificationIdentifierType.id));
    });
  },
};

export default {
  ...API,
  verifyConsortiumClassificationIdentifierTypesInTheList({
    name,
    source = 'consortium',
    actions = [],
  }) {
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

  verifyLocalClassificationIdentifierTypesInTheList({ name, source = 'local', actions = [] }) {
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

  verifyClassificationIdentifierTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  createClassificationIdentifierType(name) {
    cy.do([
      newButton.click(),
      TextField({ name: 'items[0].name' }).fillIn(name),
      Button('Save').click(),
    ]);
  },

  clickTrashButtonForClassificationIdentifierTypes(name) {
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
    cy.expect(rootPane.find(newButton).has({ disabled: false }));
  },

  choose() {
    cy.do([NavListItem(identifierTypesSectionName).click(), rootPane.exists()]);
  },

  getIdByName(typeName) {
    return cy
      .okapiRequest({
        path: `classification-types?query=name="${typeName}"`,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body?.classificationTypes[0].id;
      });
  },
};
