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
        path: 'holdings-types',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
  deleteViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `holdings-types/${id}`,
    isDefaultSearchParamsRequired: false,
  }),

  verifyConsortiumHoldingsTypeInTheList({ name, source = 'consortium', actions = [] }) {
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

  verifyLocalHoldingsTypeInTheList({ name, source = 'local', actions = [] }) {
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

  verifyHoldingsTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForHoldingsType(name) {
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
