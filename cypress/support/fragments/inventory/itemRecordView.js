import { HTML, including } from '@interactors/html';
import { Accordion, KeyValue, Pane, Button, TextField, MultiColumnList, Callout } from '../../../../interactors';
import dateTools from '../../utils/dateTools';
import ConfirmItemMissingModal from './inventoryItem/confirmItemMissingModal';

const loanAccordion = Accordion('Loan and availability');
const actionsButton = Button('Actions');

const viewItem = (locator, cellContent) => {
  cy.do(Accordion(`Holdings: ${locator} >`).clickHeader());
  cy.get('[id^="list-items"]').contains(cellContent).click();
};

const verifyItemBarcode = value => {
  cy.expect(KeyValue('Item barcode').has({ value }));
};

const verifyPermanentLoanType = value => {
  cy.expect(KeyValue('Permanent loan type').has({ value }));
};

const verifyNote = value => {
  cy.expect(KeyValue('Check in note').has({ value }));
};

const verifyPermanentLocation = location => {
  // TODO: Try to add ID for div.row- for better interaction with KeyValue
  cy.expect(Accordion({ label: 'Location' })
    .find(KeyValue('Effective location for item'))
    .has({ value: location }));
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

const waitLoading = () => {
  cy.expect(Pane(including('Item')).exists());
};

const closeDetailView = () => {
  cy.expect(Pane(including('Item')).exists());
  cy.do(Button({ icon: 'times' }).click());
};

const verifyItemStatus = (itemStatus) => {
  cy.expect(loanAccordion.find(HTML(including(itemStatus))).exists());
};

export default {
  itemStatuses,
  waitLoading,
  viewItem,
  verifyItemBarcode,
  verifyPermanentLoanType,
  verifyNote,
  verifyPermanentLocation,
  closeDetailView,
  verifyItemStatus,

  editItemViaApi: (item) => {
    return cy.okapiRequest({
      method: 'PUT',
      path: `inventory/items/${item.id}`,
      body: item,
      isDefaultSearchParamsRequired: false,
    });
  },

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
    cy.do(actionsButton.click());
    cy.do(Button('Mark as missing').click());
    ConfirmItemMissingModal.confirmModal();
  },

  addPieceToItem:(numberOfPieces) => {
    cy.do([
      TextField({ name:'numberOfPieces' }).fillIn(numberOfPieces),
      Button('Save and close').click()
    ]);
  },

  checkEffectiveLocation:(location) => {
    cy.expect(Accordion('Location').find(KeyValue('Effective location for item')).has({ value: location }));
  },

  checkItemAdministrativeNote:(note) => {
    cy.expect(MultiColumnList({ id: 'administrative-note-list' }).find(HTML(including(note))).exists());
  },

  checkMaterialType:(type) => {
    cy.expect(Accordion('Item data').find(HTML(including(type))).exists());
  },

  checkItemNote:(note) => {
    cy.expect(Accordion('Item notes').find(KeyValue('Electronic bookplate')).has({ value: note }));
  },

  checkBarcode:(barcode) => {
    cy.expect(Accordion('Administrative data').find(KeyValue('Item barcode')).has({ value: barcode }));
  },

  checkStatus:(status) => {
    cy.expect(Accordion('Loan and availability').find(KeyValue('Item status')).has({ value: status }));
  },

  edit() {
    cy.do([
      actionsButton.click(),
      Button('Edit').click(),
    ]);
  },

  checkCalloutMessage: () => {
    cy.expect(Callout({ textContent: including('The item - HRID  has been successfully saved.') })
      .exists());
  },

  checkItemDetails(location, barcode, status) {
    this.checkEffectiveLocation(location);
    this.checkBarcode(barcode);
    this.checkStatus(status);
  },
};
