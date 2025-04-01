import uuid from 'uuid';
import { MultiColumnListHeader, PaneHeader } from '../../../../../interactors';
import { REQUEST_METHOD } from '../../../constants';
import ConsortiumManagerApp from '../consortiumManagerApp';

const id = uuid();

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

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Departments');
    ['Name', 'Code', 'Last updated', '# of Users', 'Member libraries', 'Actions'].forEach(
      (header) => {
        cy.expect(MultiColumnListHeader(header).exists());
      },
    );
  },

  chooseWithEmptyList() {
    ConsortiumManagerApp.chooseSecondMenuItem('Departments');
  },

  waitLoading() {
    cy.expect(
      PaneHeader({
        id: 'paneHeaderconsortia-controlled-vocabulary-pane',
      }).exists(),
    );
  },
};
