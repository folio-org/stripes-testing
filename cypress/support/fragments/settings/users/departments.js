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
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: code })).exists(),
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

  verifyGroupAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
    cy.expect(row.absent());
  },

  clickEditButtonForGroup(name) {
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.do(
      row
        .find(actionsCell)
        .find(Button({ icon: 'edit' }))
        .click(),
    );
  },

  clickTrashButtonForGroup(name) {
    const row = MultiColumnListRow({ isContainer: true, content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.do([
      row
        .find(actionsCell)
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
};
