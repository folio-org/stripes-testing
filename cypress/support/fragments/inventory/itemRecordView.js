import { HTML, including } from '@interactors/html';
import { Accordion, KeyValue, Pane, Button, TextField, MultiColumnList, Callout, PaneHeader } from '../../../../interactors';
import dateTools from '../../utils/dateTools';

const loanAccordion = Accordion('Loan and availability');

const verifyItemBarcode = value => { cy.expect(KeyValue('Item barcode').has({ value })); };
const verifyPermanentLoanType = value => { cy.expect(KeyValue('Permanent loan type').has({ value })); };
const verifyNote = value => { cy.expect(KeyValue('Check in note').has({ value })); };
const waitLoading = () => { cy.expect(Pane(including('Item')).exists()); };
const verifyItemStatus = (itemStatus) => { cy.expect(loanAccordion.find(HTML(including(itemStatus))).exists()); };
const verifyItemStatusInPane = (itemStatus) => { cy.expect(PaneHeader(including(itemStatus)).exists()); };
const verifyPermanentLocation = location => {
  // TODO: Try to add ID for div.row- for better interaction with KeyValue
  cy.expect(Accordion({ label: 'Location' })
    .find(KeyValue('Effective location for item'))
    .has({ value: location }));
};
const closeDetailView = () => {
  cy.expect(Pane(including('Item')).exists());
  cy.do(Button({ icon: 'times' }).click());
};

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

export default {
  itemStatuses,
  waitLoading,
  verifyItemBarcode,
  verifyPermanentLoanType,
  verifyNote,
  verifyPermanentLocation,
  closeDetailView,
  verifyItemStatus,
  verifyItemStatusInPane,

  getAssignedHRID:() => cy.then(() => KeyValue('Item HRID').value()),

  verifyUpdatedItemDate:() => {
    cy.do(loanAccordion.find(KeyValue('Item status')).perform(element => {
      const rawDate = element.innerText;
      const parsedDate = Date.parse(rawDate.match(/\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{1,2}\s\w{2}/gm)[0]);
      // For local run it needs to add 18000000
      // The time on the server and the time on the yuai differ by 3 hours. It was experimentally found that it is necessary to add 18000000 sec
      dateTools.verifyDate(parsedDate, 18000000);
    }));
  },

  addPieceToItem:(numberOfPieces) => {
    cy.do([
      TextField({ name:'numberOfPieces' }).fillIn(numberOfPieces),
      Button('Save & close').click()
    ]);
  },

  checkEffectiveLocation:(location) => {
    cy.expect(Accordion('Location').find(KeyValue('Effective location for item')).has({ value: location }));
  },

  checkItemAdministrativeNote:(note) => {
    cy.expect(MultiColumnList({ id: 'administrative-note-list' }).find(HTML(including(note))).exists());
  },

  verifyMaterialType:(type) => {
    cy.expect(Accordion('Item data').find(HTML(including(type))).exists());
  },

  checkNoteInItem:(note) => {
    cy.expect(Accordion('Item notes').find(KeyValue('Electronic bookplate')).has({ value: note }));
  },

  checkItemNote:(note) => {
    cy.expect(Accordion('Item notes').find(KeyValue('Note')).has({ value: note }));
  },

  checkBarcode:(barcode) => {
    cy.expect(Accordion('Administrative data').find(KeyValue('Item barcode')).has({ value: barcode }));
  },

  checkCalloutMessage: () => {
    cy.expect(Callout({ textContent: including('The item - HRID  has been successfully saved.') })
      .exists());
  },

  checkStatus:(status) => {
    cy.expect(Accordion('Loan and availability').find(KeyValue('Item status')).has({ value: status }));
  },

  checkItemDetails(location, barcode, status) {
    this.checkEffectiveLocation(location);
    this.checkBarcode(barcode);
    this.checkStatus(status);
  }
};
