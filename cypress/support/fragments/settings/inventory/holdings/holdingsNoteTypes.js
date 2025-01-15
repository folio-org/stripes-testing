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
  createViaApi: (body) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'holdings-note-types',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
  deleteViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `holdings-note-types/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
  verifyConsortiumHoldingsNoteTypesInTheList({ name, source = 'consortium', actions = [] }) {
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

  verifyLocalHoldingsNoteTypesInTheList({ name, source = 'local', actions = [] }) {
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

  verifyHoldingsNoteTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForHoldingsNoteTypes(name) {
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
