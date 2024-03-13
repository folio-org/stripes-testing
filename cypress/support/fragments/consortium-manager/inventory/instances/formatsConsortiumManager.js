import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { Button, MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';
import ConsortiaControlledVocabularyPaneset from '../../consortiaControlledVocabularyPaneset';

const id = uuid();
const newButton = Button('+ New');

export default {
  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/formats',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
            code: type.payload.code,
          },
        },
      }).then(() => {
        type.url = '/formats';
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

  getFormatsByNameAndTenant(name, tenantId) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.getPublications([tenantId], '/formats?limit=2000&offset=0').then((publicationId) => {
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
      });
    });
  },

  deleteFormatByNameAndTenant(name, tenantId) {
    this.getFormatByNameAndTenant(name, tenantId).then((alternativeTitleType) => {
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `formats/${alternativeTitleType.id}`,
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
    cy.expect(newButton.is({ disabled: false }));
    ['Name', 'Code', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
