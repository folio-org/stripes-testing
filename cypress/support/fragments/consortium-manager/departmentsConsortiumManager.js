import { REQUEST_METHOD } from '../../constants';
import uuid from 'uuid';
import { Button, MultiColumnListCell, MultiColumnListRow, including } from '../../../../interactors';

const id = uuid();

export default {
  createViaApi: (department) => {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: "/departments",
          settingId: id,
          payload: {
            name: department.payload.name,
            code: department.payload.code,
            id: id
          }
        }
      }).then(() => {
        department.url = "/departments",
          department.settingId = id,
          department.id = id;
        return department;
      });
    })
  },

  deleteViaApi: (department) => {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${department.settingId}`,
        body: department
      });
    });
  },

  verifyDepartmentInTheList(name, code, number, members, ...actions) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: code })).exists(),
      row.find(MultiColumnListCell({ columnIndex: 3, content: number })).exists(),
      row.find(MultiColumnListCell({ columnIndex: 4, content: members })).exists(),
    ]);
    if (!actions) {
      row.find(MultiColumnListCell({ columnIndex: 5, content: '' })).exists();
    }
    else {
      actions.forEach((action) => {
        cy.expect([
          row.find(Button({ icon: action })).exists(),
        ]);
      });
    }
  },
  verifyDepartmentInTheList(name, code, number, members, ...actions) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: code })).exists(),
      row.find(MultiColumnListCell({ columnIndex: 3, content: number })).exists(),
      row.find(MultiColumnListCell({ columnIndex: 4, content: members })).exists(),
    ]);
    if (!actions) {
      row.find(MultiColumnListCell({ columnIndex: 5, content: '' })).exists();
    }
    else {
      actions.forEach((action) => {
        cy.expect([
          row.find(Button({ icon: action })).exists(),
        ]);
      });
    }
  },

  verifyNoDepartmentInTheList(name) {
    cy.expect(MultiColumnListRow({ content: including(name) }).absent());
  },
};
