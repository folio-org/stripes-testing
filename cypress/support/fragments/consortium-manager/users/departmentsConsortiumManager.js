import uuid from 'uuid';
import ConsortiumManagerApp from '../consortiumManagerApp';
import { REQUEST_METHOD } from '../../../constants';
import Affiliations from '../../../dictionary/affiliations';
import { MultiColumnListHeader, PaneHeader } from '../../../../../interactors';

const id = uuid();

export default {
  entityName: 'department',

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

  /*
    Create or update shared department and return its data.
   */
  upsertSharedViaApi: (department) => {
    const publication = {
      url: '/departments',
      settingId: id,
      payload: {
        id,
        ...department,
      },
    };

    return cy.sendPublishCoordinatorShareSettingPublication(publication, { method: REQUEST_METHOD.POST }).then(({ publicationResults }) => {
      return publicationResults.find((record) => record.tenantId === Affiliations.Consortia)?.response;
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
