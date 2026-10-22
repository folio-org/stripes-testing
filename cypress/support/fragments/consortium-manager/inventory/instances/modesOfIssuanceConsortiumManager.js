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
          url: '/modes-of-issuance',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
          },
        },
      }).then(() => {
        type.url = '/modes-of-issuance';
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

  getIssuanceModeByNameAndTenant(name, tenantId) {
    return cy
      .getPublications([tenantId], '/modes-of-issuance?limit=2000&offset=0')
      .then((publicationId) => {
        // Wait for the publication to finish: tenant results have no response while it is in progress
        return ConsortiumUtils.getPublicationResults(publicationId).then(
          ({ publicationResults }) => {
            const issuanceModes = publicationResults.find(
              (publication) => publication.tenantId === tenantId,
            ).response.issuanceModes;
            return issuanceModes.find((issuanceMode) => issuanceMode.name === name);
          },
        );
      });
  },

  deleteIssuanceModeByNameAndTenant(name, tenantId) {
    this.getIssuanceModeByNameAndTenant(name, tenantId).then((format) => {
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `modes-of-issuance/${format.id}`,
        failOnStatusCode: false,
      });
      cy.resetTenant();
    });
  },

  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading('Modes of issuance');
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Modes of issuance');
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
