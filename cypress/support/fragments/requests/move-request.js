import {
  HTML,
  including,
  Modal,
  MultiColumnListCell,
  MultiColumnListHeader,
  Pane,
  PaneHeader,
  Button,
  Option,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const rootModal = Modal('Select item');

export default {
  waitLoading: () => {
    cy.wait(1000);
    cy.expect(rootModal.exists());
  },

  verifySelectItemModal: (_instanceTitle) => {
    cy.expect(rootModal.has({ header: 'Select item' }));
    cy.expect(rootModal.find(HTML(including('Other items in'))).exists());
    cy.expect(rootModal.find(HTML(including('Record found'))).exists());
    cy.expect(rootModal.find(MultiColumnListHeader('Barcode')).exists());
    cy.expect(rootModal.find(MultiColumnListHeader('Item status')).exists());
    cy.expect(rootModal.find(MultiColumnListHeader('Request queue')).exists());
    cy.expect(rootModal.find(MultiColumnListHeader('Location')).exists());
    cy.expect(rootModal.find(MultiColumnListHeader('Material type')).exists());
    cy.expect(rootModal.find(MultiColumnListHeader('Loan type')).exists());
  },

  chooseItem: (barcode) => {
    cy.do(MultiColumnListCell(barcode).click());
  },

  chooseItemByRowIndex: (rowIndex = 0) => {
    cy.do(
      Modal('Select item')
        .find(MultiColumnListCell({ row: rowIndex, columnIndex: 0 }))
        .click(),
    );
  },

  checkIsRequestMovedSuccessfully() {
    cy.wait(1000);
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

  verifyRequestTypes(...requestTypes) {
    cy.expect(Modal(including('Select request type')).exists());
    requestTypes.forEach((type) => cy.expect(Option({ value: type }).exists()));
  },

  confirmRequestTypeModal() {
    cy.wait(2000);
    cy.get('body').then(($body) => {
      if ($body.text().includes('Select request type')) {
        cy.wait(500);
        cy.do(Modal(including('Select request type')).find(Button('Confirm')).click());
        cy.wait(2000);
      }
    });
  },

  openQueueIfNotOpened() {
    cy.url().then((url) => {
      if (!url.includes('/reorder')) {
        cy.wait(1000);
        cy.do(Button('Actions').click());
        cy.do(Button('Reorder queue').click());
        cy.wait(2000);
      }
    });
    cy.url().should('include', '/reorder');
  },
};
