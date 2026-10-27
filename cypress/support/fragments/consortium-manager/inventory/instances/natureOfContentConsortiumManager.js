import uuid from 'uuid';
import { MultiColumnListHeader } from '../../../../../../interactors';
import { REQUEST_METHOD } from '../../../../constants';
import ConsortiumManagerApp from '../../consortiumManagerApp';
import ConsortiaControlledVocabularyPaneset from '../../consortiaControlledVocabularyPaneset';
import { ConsortiumUtils } from '../../../../utils';

const id = uuid();

export default {
  getNatureOfContentByNameAndTenant(name, tenantId) {
    return cy
      .getPublications([tenantId], '/nature-of-content-terms?limit=2000&offset=0')
      .then((publicationId) => {
        // Wait for the publication to finish: tenant results have no response while it is in progress
        return ConsortiumUtils.getPublicationResults(publicationId).then(
          ({ publicationResults }) => {
            const natureOfContentTerms = publicationResults.find(
              (publication) => publication.tenantId === tenantId,
            ).response.natureOfContentTerms;
            return natureOfContentTerms.find(
              (natureOfContentTerm) => natureOfContentTerm.name === name,
            );
          },
        );
      });
  },

  deleteNatureOfContentByNameAndTenant(name, tenantId) {
    this.getNatureOfContentByNameAndTenant(name, tenantId).then((natureOfContentTerm) => {
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `nature-of-content-terms/${natureOfContentTerm.id}`,
        failOnStatusCode: false,
      });
      cy.resetTenant();
    });
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Nature of content');
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },

  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading('Nature of content');
  },

  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/nature-of-content-terms',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
          },
        },
      }).then(() => {
        type.url = '/nature-of-content-terms';
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
};
