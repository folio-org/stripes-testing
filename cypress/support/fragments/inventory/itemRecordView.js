import { HTML, including } from '@interactors/html';
import { Accordion, KeyValue, Pane, Button, TextField, MultiColumnList, Callout, PaneHeader, Link } from '../../../../interactors';
import dateTools from '../../utils/dateTools';

const loanAccordion = Accordion('Loan and availability');
const administrativeDataAccordion = Accordion('Administrative data');
const itemDataAccordion = Accordion('Item data');
const itemNotesAccordion = Accordion('Item notes');

const verifyItemBarcode = value => { cy.expect(KeyValue('Item barcode').has({ value })); };
const verifyPermanentLoanType = value => { cy.expect(KeyValue('Permanent loan type').has({ value })); };
const verifyTemporaryLoanType = value => { cy.expect(KeyValue('Temporary loan type').has({ value })); };
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
const findRowAndClickLink = (enumerationValue) => {
  cy.get('div[class^="mclRow-"]').contains('div[class^="mclCell-"]', enumerationValue).then(elem => {
    elem.parent()[0].querySelector('a').click();
  });
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
  verifyTemporaryLoanType,
  verifyNote,
  verifyPermanentLocation,
  closeDetailView,
  verifyItemStatus,
  verifyItemStatusInPane,
  findRowAndClickLink,
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

  // findItemInLocation:(enumeration) => {
  //   cy.do(() => {
  //     const cell = MultiColumnListCell(enumeration);
  //     const row = cell.closest(MultiColumnListRow());
  //     const link = row.find(Link('No barcode'));
  //     link.click();
  //   });
  // },

  checkEffectiveLocation:(location) => {
    cy.expect(Accordion('Location').find(KeyValue('Effective location for item')).has({ value: location }));
  },

  checkItemAdministrativeNote:(note) => {
    cy.expect(MultiColumnList({ id: 'administrative-note-list' }).find(HTML(including(note))).exists());
  },

  verifyMaterialType:(type) => {
    cy.expect(itemDataAccordion.find(HTML(including(type))).exists());
  },

  checkItemNote:(note, staffValue = 'Yes', value = 'Note') => {
    cy.expect(itemNotesAccordion.find(KeyValue(value)).has({ value: note }));
    cy.expect(itemNotesAccordion.find(KeyValue('Staff only')).has({ value: staffValue }));
  },

  checkCheckInNote:(note, staffValue = 'Yes') => {
    cy.expect(loanAccordion.find(KeyValue('Check in note')).has({ value: note }));
    cy.expect(HTML(staffValue).exists());
  },

  checkCheckOutNote:(note, staffValue = 'Yes') => {
    cy.expect(loanAccordion.find(KeyValue('Check out note')).has({ value: note }));
    cy.expect(HTML(staffValue).exists());
  },

  checkElectronicBookplateNote:(note) => {
    cy.expect(itemNotesAccordion.find(KeyValue('Electronic bookplate')).has({ value: note }));
  },

  checkBindingNote:(note) => {
    cy.expect(itemNotesAccordion.find(KeyValue('Binding')).has({ value: note }));
  },

  checkBarcode:(barcode) => {
    cy.expect(administrativeDataAccordion.find(KeyValue('Item barcode')).has({ value: barcode }));
  },

  checkCalloutMessage: () => {
    cy.expect(Callout({ textContent: including('The item - HRID  has been successfully saved.') })
      .exists());
  },

  checkStatus:(status) => {
    cy.expect(loanAccordion.find(KeyValue('Item status')).has({ value: status }));
  },

  checkItemDetails(location, barcode, status) {
    this.checkEffectiveLocation(location);
    this.checkBarcode(barcode);
    this.checkStatus(status);
  },

  checkAccessionNumber:(number) => {
    cy.expect(administrativeDataAccordion.find(KeyValue('Accession number')).has({ value: number }));
  },

  checkNumberOfPieces:(number) => {
    cy.expect(itemDataAccordion.find(KeyValue('Number of pieces')).has({ value: number }));
  },

  checkHotlinksToCreatedPOL:(number) => {
    cy.expect(Accordion('Acquisition').find(KeyValue('POL number')).has({ value: number }));
    cy.expect(Accordion('Acquisition').find(Link({ href: including('/orders/lines/view') })).exists());
  }
};
