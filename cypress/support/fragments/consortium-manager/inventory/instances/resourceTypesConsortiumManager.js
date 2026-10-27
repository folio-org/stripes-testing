import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';
import ConsortiaControlledVocabularyPaneset from '../../consortiaControlledVocabularyPaneset';
import { ConsortiumUtils } from '../../../../utils';

const id = uuid();

export default {
  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/instance-types',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
            code: type.payload.code,
          },
        },
      }).then(() => {
        type.url = '/instance-types';
        type.settingId = id;
        return type;
      });
    });
  },

  deleteViaApi(type) {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${type.settingId}`,
        body: type,
      });
    });
  },

  getResourceTypesByNameAndTenant(name, tenantId) {
    return cy
      .getPublications([tenantId], '/instance-types?limit=2000&offset=0')
      .then((publicationId) => {
        // Wait for the publication to finish: tenant results have no response while it is in progress
        return ConsortiumUtils.getPublicationResults(publicationId).then(
          ({ publicationResults }) => {
            const alternativeTitleTypes = publicationResults.find(
              (publication) => publication.tenantId === tenantId,
            ).response.instanceTypes;
            return alternativeTitleTypes.find(
              (alternativeTitleType) => alternativeTitleType.name === name,
            );
          },
        );
      });
  },

  deleteResourceTypesByNameAndTenant(name, tenantId) {
    this.getResourceTypesByNameAndTenant(name, tenantId).then((alternativeTitleType) => {
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `contributor-types/${alternativeTitleType.id}`,
        failOnStatusCode: false,
      });
      cy.resetTenant();
    });
  },

  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading('Resource types');
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Resource types');
    ['Name', 'Code', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
