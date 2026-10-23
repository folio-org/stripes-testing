import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { Button, MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp from '../../consortiumManagerApp';
import ConsortiaControlledVocabularyPaneset from '../../consortiaControlledVocabularyPaneset';
import { ConsortiumUtils } from '../../../../utils';

const id = uuid();
const newButton = Button('New');

export default {
  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/instance-note-types',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
          },
        },
      }).then(() => {
        type.url = '/instance-note-types';
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

  getInstanceNoteTypeByNameAndTenant(name, tenantId) {
    return cy
      .getPublications([tenantId], '/instance-note-types?limit=2000&offset=0')
      .then((publicationId) => {
        // Wait for the publication to finish: tenant results have no response while it is in progress
        return ConsortiumUtils.getPublicationResults(publicationId).then(
          ({ publicationResults }) => {
            const instanceNoteTypes = publicationResults.find(
              (publication) => publication.tenantId === tenantId,
            ).response.instanceNoteTypes;
            return instanceNoteTypes.find((instanceNoteType) => instanceNoteType.name === name);
          },
        );
      });
  },

  deleteInstanceNoteTypeByNameAndTenant(name, tenantId) {
    this.getInstanceNoteTypeByNameAndTenant(name, tenantId).then((instanceNoteType) => {
      cy.setTenant(tenantId);
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `instance-note-types/${instanceNoteType.id}`,
        failOnStatusCode: false,
      });
      cy.resetTenant();
    });
  },

  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading('Instance note types');
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Instance note types');
    cy.expect(newButton.is({ disabled: false }));
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
