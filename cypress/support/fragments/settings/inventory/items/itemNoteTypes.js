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
    cy.get('div[class*="mclCell-"]')
      .contains(name)
      .parents('div[class*="mclRow-"]')
      .then(($row) => {
        if (source) {
          cy.wrap($row).find('div[class*="mclCell-"]').eq(1).should('contain.text', source);
        }

        const actionsCell = $row.find('div[class*="mclCell-"]').eq(3);
        actions.forEach((action) => {
          if (action === 'edit') {
            cy.get(actionsCell).find('button[icon="edit"]').should('exist');
          } else if (action === 'trash') {
            cy.get(actionsCell).find('button[icon="trash"]').should('exist');
          }
        });
      });
  },

  verifyLocalItemNoteTypesInTheList({ name, source = 'local', actions = [] }) {
    cy.get('div[class*="mclCell-"]')
      .contains(name)
      .parents('div[class*="mclRow-"]')
      .then(($row) => {
        if (source) {
          cy.wrap($row).find('div[class*="mclCell-"]').eq(1).should('contain.text', source);
        }

        const actionsCell = $row.find('div[class*="mclCell-"]').eq(3);
        actions.forEach((action) => {
          if (action === 'edit') {
            cy.get(actionsCell).find('button[icon="edit"]').should('exist');
          } else if (action === 'trash') {
            cy.get(actionsCell).find('button[icon="trash"]').should('exist');
          }
        });
      });
  },

  verifyItemNoteTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForItemNoteTypes(name) {
    cy.get('div[class*="mclCell-"]')
      .contains(name)
      .parents('div[class*="mclRow-"]')
      .find('div[class*="mclCell-"]')
      .eq(3)
      .find('button[icon="trash"]')
      .click();
    cy.do(Button('Delete').click());
  },
};
