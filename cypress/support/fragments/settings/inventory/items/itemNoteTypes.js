import uuid from 'uuid';
import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  including,
} from '../../../../../../interactors';
import { REQUEST_METHOD } from '../../../../constants';

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

export default {
  createItemNoteTypeViaApi: (typeName) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'item-note-types',
        body: {
          id: uuid(),
          name: typeName,
          source: 'local',
        },
      })
      .then((response) => response.body.id);
  },

  deleteItemNoteTypeViaApi: (noteTypeId) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `item-note-types/${noteTypeId}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyConsortiumItemNoteTypesInTheList({ name, source = 'consortium', actions = [] }) {
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

  verifyLocalItemNoteTypesInTheList({ name, source = 'local', actions = [] }) {
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

  verifyItemNoteTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForItemNoteTypes(name) {
    cy.do([
      MultiColumnListRow({ isContainer: true, content: including(name) })
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
};
