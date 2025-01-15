import { REQUEST_METHOD } from '../../../constants';
import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  including,
} from '../../../../../interactors';

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};
export default {
  waitLoading: () => cy.expect(PaneHeader('Departments').exists()),

  getViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'departments',
        searchParams,
      })
      .then((response) => response.body.departments);
  },

  createViaApi: (body) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'departments',
        isDefaultSearchParamsRequired: false,
        body,
      })
      .then((response) => response.body.id);
  },

  deleteViaApi: (id) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `departments/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyDepartmentsInTheList({ name, code = '', actions = [] }) {
    cy.get('div[class*="mclCell-"]')
      .contains(name)
      .parents('div[class*="mclRow-"]')
      .then(($row) => {
        if (code) {
          cy.wrap($row).find('div[class*="mclCell-"]').eq(1).should('contain.text', code);
        }

        const actionsCell = $row.find('div[class*="mclCell-"]').eq(4);
        actions.forEach((action) => {
          if (action === 'edit') {
            cy.get(actionsCell).find('button[icon="edit"]').should('exist');
          } else if (action === 'trash') {
            cy.get(actionsCell).find('button[icon="trash"]').should('exist');
          }
        });
      });
  },

  verifyGroupAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickEditButtonForGroup(name) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.do(
      row
        .find(actionsCell)
        .find(Button({ icon: 'edit' }))
        .click(),
    );
  },

  clickTrashButtonForGroup(name) {
    cy.get('div[class*="mclCell-"]')
      .contains(name)
      .parents('div[class*="mclRow-"]')
      .find('div[class*="mclCell-"]')
      .eq(4)
      .find('button[icon="trash"]')
      .click();
    cy.do(Button('Delete').click());
  },
};
