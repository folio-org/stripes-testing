import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../constants';
import { MultiColumnListHeader } from '../../../../../interactors';
import ConsortiumManagerApp from '../consortiumManagerApp';
import ConsortiaControlledVocabularyPaneset from '../consortiaControlledVocabularyPaneset';

const id = uuid();

export default {
  createViaApi(reason) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/cancellation-reason-storage/cancellation-reasons',
          settingId: id,
          payload: {
            id,
            name: reason.payload.name,
          },
        },
      }).then(() => {
        reason.url = '/cancellation-reason-storage/cancellation-reasons';
        reason.settingId = id;
        return reason;
      });
    });
  },

  deleteViaApi(reason) {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${reason.settingId}`,
        body: reason,
      });
    });
  },

  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading('Request cancellation reasons');
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Request cancellation reasons');
    [
      'Cancel reason',
      'Description (internal)',
      'Description (public)',
      'Member libraries',
      'Actions',
    ].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
    cy.wait(4000);
  },
};
