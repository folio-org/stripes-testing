import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../constants';
import { MultiColumnListHeader } from '../../../../../interactors';
import ConsortiumManagerApp from '../consortiumManagerApp';
import { ConsortiumUtils } from '../../../utils';

const id = uuid();

export default {
  createViaApi: (group) => {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/groups',
          settingId: id,
          payload: {
            group: group.payload.group,
            id,
          },
        },
      }).then(() => {
        group.url = '/groups';
        group.settingId = id;
        return group;
      });
    });
  },

  deleteViaApi: (group) => {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${group.settingId}`,
        body: group,
      });
    });
  },

  getPatronGroupByNameAndTenant(groupName, tenantId) {
    return cy.getPublications([tenantId], '/groups?limit=2000&offset=0').then((publicationId) => {
      // Wait for the publication to finish: tenant results have no response while it is in progress
      return ConsortiumUtils.getPublicationResults(publicationId).then(({ publicationResults }) => {
        const groups = publicationResults.find((publication) => publication.tenantId === tenantId)
          .response.usergroups;
        return groups.find((group) => group.group === groupName);
      });
    });
  },

  deletePatronGroupByNameAndTenant(groupName, tenantId) {
    this.getPatronGroupByNameAndTenant(groupName, tenantId).then((group) => {
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `groups/${group.id}`,
        failOnStatusCode: false,
      });
      cy.resetTenant();
    });
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Patron groups');
    [
      'Patron group',
      'Description',
      'Expiration date offset (days)',
      'Last updated',
      'Member libraries',
      'Actions',
    ].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
