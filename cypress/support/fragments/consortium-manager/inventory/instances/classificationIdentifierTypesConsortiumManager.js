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
          url: '/classification-types',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
            source: 'local',
          },
        },
      }).then(() => {
        type.url = '/classification-types';
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

  getClassificationIdentifierTypeByNameAndTenant(name, tenantId) {
    return cy
      .getPublications([tenantId], '/classification-types?limit=2000&offset=0')
      .then((publicationId) => {
        // Wait for the publication to finish: tenant results have no response while it is in progress
        return ConsortiumUtils.getPublicationResults(publicationId).then(
          ({ publicationResults }) => {
            const classificationIdentifierTypes = publicationResults.find(
              (publication) => publication.tenantId === tenantId,
            ).response.classificationTypes;
            return classificationIdentifierTypes.find(
              (classificationIdentifierType) => classificationIdentifierType.name === name,
            );
          },
        );
      });
  },

  deleteClassificationIdentifierTypeByNameAndTenant(name, tenantId) {
    this.getClassificationIdentifierTypeByNameAndTenant(name, tenantId).then(
      (classificationIdentifierType) => {
        cy.setTenant(tenantId);
        cy.okapiRequest({
          method: REQUEST_METHOD.DELETE,
          path: `classification-types/${classificationIdentifierType.id}`,
          failOnStatusCode: false,
        });
        cy.resetTenant();
      },
    );
  },

  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading('Classification identifier types');
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Classification identifier types');
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
