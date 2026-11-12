import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';
import ConsortiaControlledVocabularyPaneset from '../../consortiaControlledVocabularyPaneset';
import { getPublicationResults } from '../../../../utils/consortium';

const id = uuid();

export default {
  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/instance-formats',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
            code: type.payload.code,
          },
        },
      }).then(() => {
        type.url = '/instance-formats';
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

  getFormatByNameAndTenant(name, tenantId) {
    return cy
      .getPublications([tenantId], '/instance-formats?limit=2000&offset=0')
      .then((publicationId) => getPublicationResults(publicationId))
      .then(({ publicationResults }) => {
        const tenantResult = publicationResults.find(
          (publication) => publication.tenantId === tenantId,
        );
        // null (not undefined) so Cypress doesn't yield the previous subject
        return (
          tenantResult?.response.instanceFormats.find((format) => format.name === name) || null
        );
      });
  },

  deleteFormatByNameAndTenant(name, tenantId) {
    this.getFormatByNameAndTenant(name, tenantId).then((format) => {
      if (!format) return;
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `instance-formats/${format.id}`,
        failOnStatusCode: false,
      });
      cy.resetTenant();
    });
  },

  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading('Formats');
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Formats');
    ['Name', 'Code', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
