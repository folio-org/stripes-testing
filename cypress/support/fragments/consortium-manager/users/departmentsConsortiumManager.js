import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../constants';
import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  including,
  MultiColumnListHeader,
} from '../../../../../interactors';
import ConsortiumManagerApp from '../consortiumManagerApp';

const id = uuid();

export const departmentsActions = {
  edit: 'edit',
  trash: 'trash',
};

export default {
  createViaApi: (department) => {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/departments',
          settingId: id,
          payload: {
            name: department.payload.name,
            code: department.payload.code,
            id,
          },
        },
      }).then(() => {
        department.url = '/departments';
        department.settingId = id;
        department.id = id;
        return department;
      });
    });
  },

  deleteViaApi: (department) => {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${department.settingId}`,
        body: department,
      });
    });
  },

  verifyDepartmentInTheList(name, code, number, members, ...actions) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 5 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: code })).exists(),
      row.find(MultiColumnListCell({ columnIndex: 3, content: number })).exists(),
      row.find(MultiColumnListCell({ columnIndex: 4, content: members })).exists(),
    ]);
    if (actions.length === 0) {
      cy.expect(row.find(actionsCell).has({ content: '' }));
    } else {
      Object.values(departmentsActions).forEach((action) => {
        const buttonSelector = row.find(actionsCell).find(Button({ icon: action }));
        if (actions.includes(action)) {
          cy.expect(buttonSelector.exists());
        } else {
          cy.expect(buttonSelector.absent());
        }
      });
    }
  },

  verifyNoDepartmentInTheList(name) {
    cy.expect(MultiColumnListRow({ content: including(name) }).absent());
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Departments');
    ['Name', 'Code', 'Last updated', '# of Users', 'Member libraries', 'Actions'].forEach(
      (header) => {
        cy.expect(MultiColumnListHeader(header).exists());
      },
    );
  },
};
