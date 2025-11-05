import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader, Spinner } from '../../../../../../interactors';
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
          url: '/contributor-types',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
            code: type.payload.code,
          },
        },
      }).then(() => {
        type.url = '/contributor-types';
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

  getContibutorTypeByNameAndTenant(name, tenantId) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.getPublications([tenantId], '/contributor-types?limit=2000&offset=0').then(
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

  deleteContibutorTitleTypeByNameAndTenant(name, tenantId) {
    this.getContibutorTitleTypeByNameAndTenant(name, tenantId).then((alternativeTitleType) => {
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
    ConsortiaControlledVocabularyPaneset.waitLoading('Contributor types');
  },

  choose() {
    cy.expect(Spinner().absent());
    ConsortiumManagerApp.chooseSecondMenuItem('Contributor types');
    this.waitLoading();
    ['Name', 'Code', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
