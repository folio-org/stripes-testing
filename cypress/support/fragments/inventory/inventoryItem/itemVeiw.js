import { Accordion, KeyValue, Button, HTML, including, TextField, PaneHeader } from '../../../../../interactors';
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
  cy.wait(5000);
  cy.expect(Button('Actions').exists());
};

export default {
  itemStatuses,
  waitLoading,

  verifyUpdatedItemDate:() => {
    cy.do(loanAccordion.find(KeyValue('Item status')).perform(element => {
      const rawDate = element.innerText;
      const parsedDate = Date.parse(rawDate.match(/\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{1,2}\s\w{2}/gm)[0]);
      // For local run it needs to add 18000000
      dateTools.verifyDate(parsedDate, 18000000);
    }));
  },

  verifyItemStatus:(status) => {
    waitLoading();
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
  }
};
