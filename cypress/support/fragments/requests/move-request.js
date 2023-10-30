import {
  including,
  Modal,
  MultiColumnListCell,
  Pane,
  PaneHeader,
  Button,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const rootModal = Modal('Select item');

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },

  chooseItem: (barcode) => {
    cy.do(MultiColumnListCell(barcode).click());
  },

  checkIsRequestMovedSuccessfully() {
    cy.expect(Pane(including('Request queue on instance')).exists());
    InteractorsTools.checkCalloutMessage('Request has been moved successfully');
  },

  closeRequestQueue() {
    cy.wait(3000);
    cy.do(
      PaneHeader({ id: 'paneHeaderrequest-queue' })
        .find(Button({ icon: 'times' }))
        .click(),
    );
  },
};
