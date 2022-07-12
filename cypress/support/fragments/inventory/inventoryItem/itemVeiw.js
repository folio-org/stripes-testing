import { Accordion, KeyValue, Button, HTML, including, TextField } from '../../../../../interactors';
import dateTools from '../../../utils/dateTools';
import ConfirmItemMissingModal from './confirmItemMissingModal';

const itemStatuses = {
  onOrder: 'On order',
  inProcess: 'In process',
  available: 'Available',
  missing: 'Missing',
  inTransit: 'In transit',
  paged: 'Paged',
  awaitingPickup: 'Awaiting pickup',
  checkedOut: 'Checked out',
  declaredLost: 'Declared lost',
  awaitingDelivery: 'Awaiting delivery'
};

const loanAccordion = Accordion('Loan and availability');

const waitLoading = () => {
  cy.expect(Button('Actions').exists());
};

const closeDetailView = () => {
  cy.do(Button({ icon: 'times' }).click());
};

export default {
  itemStatuses,
  waitLoading,
  closeDetailView,

  verifyUpdatedItemDate:() => {
    cy.do(loanAccordion.find(KeyValue('Item status')).perform(element => {
      const rawDate = element.innerText;
      const parsedDate = Date.parse(rawDate.match(/\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{1,2}\s\w{2}/gm)[0]);
      // For local run it needs to add 18000000
      // The time on the server and the time on the yuai differ by 3 hours. It was experimentally found that it is necessary to add 18000000 sec
      dateTools.verifyDate(parsedDate, 18000000);
    }));
  },

  verifyItemStatus:(status) => {
    cy.expect(loanAccordion.find(HTML(including(status))).exists());
  },

  clickMarkAsMissing:() => {
    cy.do(Button('Actions').click());
    cy.do(Button('Mark as missing').click());
    ConfirmItemMissingModal.confirmModal();
  },

  addPieceToItem:(numberOfPieces) => {
    cy.do(TextField({ name:'numberOfPieces' }).fillIn(numberOfPieces));
    cy.do(Button('Save and close').click());
  },

  checkIsItemUpdated() {
    cy.do([
      Button(including('Holdings: Main Library')).click(),
      // Link(itemBarcode).click(),
    ]);
    cy.expect(KeyValue('Item status').has({ value: 'On Order' }));
    //cy.expect(KeyValue('Item barcode').has({ value: itemBarcode }));

    closeDetailView();
  }
};
