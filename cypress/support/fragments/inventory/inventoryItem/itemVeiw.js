import { Accordion, KeyValue, Button, HTML, including, TextField, Link } from '../../../../../interactors';
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

const verifyItemStatus = (itemStatus) => {
  cy.expect(loanAccordion.find(HTML(including(itemStatus))).exists());
};

export default {
  itemStatuses,
  waitLoading,
  closeDetailView,
  verifyItemStatus,

  verifyUpdatedItemDate:() => {
    cy.do(loanAccordion.find(KeyValue('Item status')).perform(element => {
      const rawDate = element.innerText;
      const parsedDate = Date.parse(rawDate.match(/\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{1,2}\s\w{2}/gm)[0]);
      // For local run it needs to add 18000000
      // The time on the server and the time on the yuai differ by 3 hours. It was experimentally found that it is necessary to add 18000000 sec
      dateTools.verifyDate(parsedDate, 18000000);
    }));
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

  checkIsItemUpdated(itemBarcode) {
    cy.do([
      Button(including('Holdings: Main Library > GV706.5')).click(),
      Link(itemBarcode).click()
    ]);
    verifyItemStatus('In process');
    cy.expect(Accordion('Location').find(KeyValue('Effective location for item')).has({ value: 'Main Library' }));
    closeDetailView();
  }
};
