import {
  Button,
  including,
  MultiColumnListRow,
  MultiColumnListCell,
  NavListItem,
  Pane,
} from '../../../../../../interactors';

export const identifierTypesSectionName = 'Classification identifier types';

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
  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `classification-types/${id}`,
      isDefaultSearchParamsRequired: false,
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

  verifyLocalClassificationIdentifierTypesInTheList({ name, source = 'local', actions = [] }) {
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

  verifyClassificationIdentifierTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForClassificationIdentifierTypes(name) {
    cy.do([
      MultiColumnListRow({ content: including(name) })
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
  choose() {
    cy.do([
      NavListItem(identifierTypesSectionName).click(),
      Pane(identifierTypesSectionName).exists(),
    ]);
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
