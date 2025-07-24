import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';
import ConsortiaControlledVocabularyPaneset from '../../consortiaControlledVocabularyPaneset';

const id = uuid();

export default {
  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/alternative-title-types',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
          },
        },
      }).then(() => {
        type.url = '/alternative-title-types';
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

  getAlternativeTitleTypeByNameAndTenant(name, tenantId) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.getPublications([tenantId], '/alternative-title-types?limit=2000&offset=0').then(
        (publicationId) => {
          cy.okapiRequest({
            method: REQUEST_METHOD.GET,
            path: `consortia/${consortiaId}/publications/${publicationId}/results`,
          }).then(({ body }) => {
            const alternativeTitleTypes = JSON.parse(
              body.publicationResults.find((publication) => publication.tenantId === tenantId)
                .response,
            ).alternativeTitleTypes;
            return alternativeTitleTypes.find(
              (alternativeTitleType) => alternativeTitleType.name === name,
            );
          });
        },
      );
    });
  },

  deleteAlternativeTitleTypeByNameAndTenant(name, tenantId) {
    this.getAlternativeTitleTypeByNameAndTenant(name, tenantId).then((alternativeTitleType) => {
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `alternative-title-types/${alternativeTitleType.id}`,
        failOnStatusCode: false,
      });
      cy.resetTenant();
    });
  },

  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading('Alternative title types');
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Alternative title types');
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
