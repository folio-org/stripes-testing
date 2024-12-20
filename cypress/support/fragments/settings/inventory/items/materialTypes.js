import { REQUEST_METHOD } from '../../../../constants';
import {
  Button,
  including,
  MultiColumnListRow,
  MultiColumnListCell,
} from '../../../../../../interactors';

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

export default {
  createMaterialTypesViaApi: (body) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'material-types',
        body,
      })
      .then((response) => response.body.id);
  },

  deleteMaterialTypesViaApi: (noteTypeId) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `material-types/${noteTypeId}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyConsortiumMaterialTypesInTheList({ name, source = 'consortium', actions = [] }) {
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
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

  verifyLocalMaterialTypesInTheList({ name, source = 'local', actions = [] }) {
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
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

  verifyMaterialTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForMaterialTypes(name) {
    cy.do([
      MultiColumnListRow({ isContainer: true, content: including(name) })
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
};
