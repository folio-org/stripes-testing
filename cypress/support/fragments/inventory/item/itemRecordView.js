import { HTML, including } from '@interactors/html';
import {
  Accordion,
  KeyValue,
  Pane,
  Button,
  TextField,
  MultiColumnList,
  Callout,
  PaneHeader,
  Link,
  MultiColumnListCell,
} from '../../../../../interactors';
import dateTools from '../../../utils/dateTools';

const loanAccordion = Accordion('Loan and availability');
const administrativeDataAccordion = Accordion('Administrative data');
const acquisitionAccordion = Accordion('Acquisition');
const itemDataAccordion = Accordion('Item data');
const itemNotesAccordion = Accordion('Item notes');
const circulationHistoryAccordion = Accordion('Circulation history');
const saveAndCloseBtn = Button('Save & close');
const electronicAccessAccordion = Accordion('Electronic access');

const verifyItemBarcode = (value) => {
  cy.expect(KeyValue('Item barcode').has({ value }));
};
const verifyItemIdentifier = (value) => {
  cy.expect(KeyValue('Item identifier').has({ value }));
};
const verifyPermanentLoanType = (value) => {
  cy.expect(KeyValue('Permanent loan type').has({ value }));
};
const verifyTemporaryLoanType = (value) => {
  cy.expect(KeyValue('Temporary loan type').has({ value }));
};
const verifyNote = (value) => {
  cy.expect(KeyValue('Check in note').has({ value }));
};
const waitLoading = () => {
  cy.expect(Pane(including('Item')).exists());
};
const verifyItemStatus = (itemStatus) => {
  cy.expect(loanAccordion.find(KeyValue('Item status')).has({ value: itemStatus }));
};
const verifyItemStatusInPane = (itemStatus) => {
  cy.expect(PaneHeader(including(itemStatus)).exists());
};
const closeDetailView = () => {
  cy.expect(Pane(including('Item')).exists());
  cy.do(Button({ icon: 'times' }).click());
  cy.expect(Pane(including('Item')).absent());
};
const findRowAndClickLink = (enumerationValue) => {
  cy.get(`div[class^="mclCell-"]:contains('${enumerationValue}')`).then((cell) => {
    const row = cell.closest('div[class^="mclRow-"]');
    row.find('button').click();
  });
};
const getAssignedHRID = () => cy.then(() => KeyValue('Item HRID').value());

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
  awaitingDelivery: 'Awaiting delivery',
};

export default {
  itemStatuses,
  waitLoading,
  verifyItemBarcode,
  verifyItemIdentifier,
  verifyPermanentLoanType,
  verifyTemporaryLoanType,
  verifyNote,
  closeDetailView,
  verifyItemStatus,
  verifyItemStatusInPane,
  getAssignedHRID,
  findRowAndClickLink,

  suppressedAsDiscoveryIsAbsent() {
    cy.expect(HTML(including('Warning: Item is marked suppressed from discovery')).absent());
  },

  suppressedAsDiscoveryIsPresent() {
    cy.expect(HTML(including('Warning: Item is marked suppressed from discovery')).exists());
  },

  verifyUpdatedItemDate: () => {
    cy.do(
      loanAccordion.find(KeyValue('Item status')).perform((element) => {
        const rawDate = element.innerText;
        const parsedDate = Date.parse(
          rawDate.match(/\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{1,2}\s\w{2}/gm)[0],
        );
        // For local run it needs to add 18000000
        // The time on the server and the time on the yuai differ by 3 hours. It was experimentally found that it is necessary to add 18000000 sec
        dateTools.verifyDate(parsedDate, 18000000);
      }),
    );
  },

  addPieceToItem: (numberOfPieces) => {
    cy.do([TextField({ name: 'numberOfPieces' }).fillIn(numberOfPieces), saveAndCloseBtn.click()]);
  },

  duplicateItem() {
    cy.do([Button('Actions').click(), Button('Duplicate').click()]);
  },

  createNewRequest() {
    cy.do([Button('Actions').click(), Button('New request').click()]);
  },

  openRequest() {
    cy.do(loanAccordion.find(Link({ href: including('/requests?filters=requestStatus') })).click());
  },

  openBorrowerPage() {
    cy.do(
      KeyValue('Borrower')
        .find(Link({ href: including('/users/view') }))
        .click(),
    );
  },

  verifyEffectiveLocation: (location) => {
    cy.expect(
      Accordion('Location').find(KeyValue('Effective location for item')).has({ value: location }),
    );
  },

  verifyPermanentLocation: (location) => {
    cy.expect(
      Accordion({ label: 'Location' })
        .find(KeyValue({ dataTestId: 'item-permanent-location', value: location }))
        .exists(),
    );
  },

  verifyTemporaryLocation: (location) => {
    cy.expect(
      Accordion({ label: 'Location' })
        .find(KeyValue({ dataTestId: 'item-temporary-location', value: location }))
        .exists(),
    );
  },

  checkItemAdministrativeNote: (note) => {
    cy.expect(
      MultiColumnList({ id: 'administrative-note-list' })
        .find(HTML(including(note)))
        .exists(),
    );
  },

  verifyMaterialType: (type) => {
    cy.expect(itemDataAccordion.find(HTML(including(type))).exists());
  },

  checkItemNote: (note, staffValue = 'Yes', value = 'Note') => {
    cy.expect(itemNotesAccordion.find(KeyValue(value)).has({ value: note }));
    cy.expect(itemNotesAccordion.find(KeyValue('Staff only')).has({ value: staffValue }));
  },

  checkMultipleItemNotes: (...itemNotes) => {
    itemNotes.forEach((itemNote) => {
      cy.expect([KeyValue(itemNote.type).has({ value: itemNote.note })]);
    });
  },

  checkCheckInNote: (note, staffValue = 'Yes') => {
    cy.expect(loanAccordion.find(KeyValue('Check in note')).has({ value: note }));
    cy.expect(HTML(staffValue).exists());
  },

  checkCheckOutNote: (note, staffValue = 'Yes') => {
    cy.expect(loanAccordion.find(KeyValue('Check out note')).has({ value: note }));
    cy.expect(HTML(staffValue).exists());
  },

  checkElectronicBookplateNote: (note) => {
    cy.expect(itemNotesAccordion.find(KeyValue('Electronic bookplate')).has({ value: note }));
  },

  checkBindingNote: (note) => {
    cy.expect(itemNotesAccordion.find(KeyValue('Binding')).has({ value: note }));
  },

  checkBarcode: (barcode) => {
    cy.expect(administrativeDataAccordion.find(KeyValue('Item barcode')).has({ value: barcode }));
  },

  checkCalloutMessage: () => {
    cy.expect(
      Callout({ textContent: including('The item - HRID  has been successfully saved.') }).exists(),
    );
  },

  checkItemDetails(location, barcode, status) {
    this.verifyEffectiveLocation(location);
    this.checkBarcode(barcode);
    this.verifyItemStatus(status);
  },

  checkAccessionNumber: (number) => {
    cy.expect(
      administrativeDataAccordion.find(KeyValue('Accession number')).has({ value: number }),
    );
  },

  verifyNumberOfPieces: (number) => {
    cy.expect(itemDataAccordion.find(KeyValue('Number of pieces')).has({ value: number }));
  },

  verifyNumberOfMissingPieces: (number) => {
    cy.expect(Accordion('Condition').find(KeyValue('Missing pieces')).has({ value: number }));
  },

  checkHotlinksToCreatedPOL: (number) => {
    cy.expect(acquisitionAccordion.find(KeyValue('POL number')).has({ value: number }));
    cy.expect(acquisitionAccordion.find(Link({ href: including('/orders/lines/view') })).exists());
  },

  checkItemCirculationHistory: (date, servicePointName, userName) => {
    cy.expect([
      circulationHistoryAccordion.find(KeyValue('Check in date')).has({ value: including(date) }),
      circulationHistoryAccordion.find(KeyValue('Service point')).has({ value: servicePointName }),
      circulationHistoryAccordion.find(KeyValue('Source')).has({ value: including(userName) }),
    ]);
  },

  verifyCalloutMessage: () => {
    cy.expect(Callout({ textContent: including('has been successfully saved.') }).exists());
  },

  changeItemBarcode: (barcode) => {
    cy.do([TextField({ id: 'additem_barcode' }).fillIn(barcode), saveAndCloseBtn.click()]);
  },

  verifyStatisticalCode: (code) => cy.expect(
    MultiColumnList({ id: 'item-list-statistical-codes' })
      .find(MultiColumnListCell({ content: code }))
      .exists(),
  ),

  verifyLoanAndAvailabilitySection: (data) => {
    verifyPermanentLoanType(data.permanentLoanType);
    verifyTemporaryLoanType(data.temporaryLoanType);
    verifyItemStatus(data.itemStatus);
    cy.expect([
      loanAccordion.find(KeyValue('Requests', { value: data.requestQuantity })).exists(),
      loanAccordion.find(KeyValue('Borrower', { value: data.borrower })).exists(),
      loanAccordion.find(KeyValue('Loan date', { value: data.loanDate })).exists(),
      loanAccordion.find(KeyValue('Due date', { value: data.dueDate })).exists(),
      loanAccordion.find(KeyValue('Staff only', { value: data.staffOnly })).exists(),
      loanAccordion.find(KeyValue('Note', { value: data.note })).exists(),
    ]);
  },

  verifyFormerIdentifiers: (identifier) => cy.expect(KeyValue('Former identifier').has({ value: identifier })),
  verifyShelvingOrder: (orderValue) => cy.expect(KeyValue('Shelving order').has({ value: orderValue })),
  verifyCallNumber: (callNumber) => cy.expect(KeyValue('Call number').has({ value: callNumber })),
  verifyItemPermanentLocation: (value) => {
    cy.get('div[data-testid="item-permanent-location"]')
      .find('div[class*=kvValue]')
      .should('have.text', value);
  },
  verifyItemMetadata: (updatedHoldingsDate, updatedItemData, userId) => {
    const convertedHoldingsDate = new Date(updatedHoldingsDate).getTime();
    const convertedItemsDate = new Date(updatedItemData.updatedDate).getTime();
    const timeDifference = (convertedItemsDate - convertedHoldingsDate) / 1000;

    // check that difference in time is less than 1 minute
    expect(timeDifference).to.be.lessThan(60000);
    expect(userId).to.eq(updatedItemData.updatedByUserId);
  },
  verifyItemCallNumberChangedAfterChangedInHoldings: (
    createdItemData,
    updatedItemData,
    updatedCallNumber,
  ) => {
    const updatedEffectiveCallNumberComponents = {
      callNumber: updatedItemData.effectiveCallNumberComponents.callNumber,
      prefix: updatedItemData.effectiveCallNumberComponents.prefix,
      suffix: updatedItemData.effectiveCallNumberComponents.suffix,
      typeId: updatedItemData.effectiveCallNumberComponents.typeId,
    };
    const createdEffectiveCallNumberComponents = {
      prefix: createdItemData.effectiveCallNumberComponents.prefix,
      suffix: createdItemData.effectiveCallNumberComponents.suffix,
      typeId: createdItemData.effectiveCallNumberComponents.typeId,
    };

    expect(updatedEffectiveCallNumberComponents.callNumber).to.eq(updatedCallNumber);
    expect(updatedEffectiveCallNumberComponents.prefix).to.eq(
      createdEffectiveCallNumberComponents.prefix,
    );
    expect(updatedEffectiveCallNumberComponents.suffix).to.eq(
      createdEffectiveCallNumberComponents.suffix,
    );
    expect(updatedEffectiveCallNumberComponents.typeId).to.eq(
      createdEffectiveCallNumberComponents.typeId,
    );
  },
  verifyItemPrefixChangedAfterChangedInHoldings: (
    createdItemData,
    updatedItemData,
    updatedPrefix,
  ) => {
    const updatedEffectiveCallNumberComponents = {
      callNumber: updatedItemData.effectiveCallNumberComponents.callNumber,
      prefix: updatedItemData.effectiveCallNumberComponents.prefix,
      suffix: updatedItemData.effectiveCallNumberComponents.suffix,
      typeId: updatedItemData.effectiveCallNumberComponents.typeId,
    };
    const createdEffectiveCallNumberComponents = {
      callNumber: createdItemData.effectiveCallNumberComponents.callNumber,
      suffix: createdItemData.effectiveCallNumberComponents.suffix,
      typeId: createdItemData.effectiveCallNumberComponents.typeId,
    };

    expect(updatedEffectiveCallNumberComponents.callNumber).to.eq(
      createdEffectiveCallNumberComponents.callNumber,
    );
    expect(updatedEffectiveCallNumberComponents.prefix).to.eq(updatedPrefix);
    expect(updatedEffectiveCallNumberComponents.suffix).to.eq(
      createdEffectiveCallNumberComponents.suffix,
    );
    expect(updatedEffectiveCallNumberComponents.typeId).to.eq(
      createdEffectiveCallNumberComponents.typeId,
    );
  },
  verifyItemSuffixChangedAfterChangedInHoldings: (
    createdItemData,
    updatedItemData,
    updatedSuffix,
  ) => {
    const updatedEffectiveCallNumberComponents = {
      callNumber: updatedItemData.effectiveCallNumberComponents.callNumber,
      prefix: updatedItemData.effectiveCallNumberComponents.prefix,
      suffix: updatedItemData.effectiveCallNumberComponents.suffix,
      typeId: updatedItemData.effectiveCallNumberComponents.typeId,
    };
    const createdEffectiveCallNumberComponents = {
      callNumber: createdItemData.effectiveCallNumberComponents.callNumber,
      prefix: createdItemData.effectiveCallNumberComponents.prefix,
      typeId: createdItemData.effectiveCallNumberComponents.typeId,
    };

    expect(updatedEffectiveCallNumberComponents.callNumber).to.eq(
      createdEffectiveCallNumberComponents.callNumber,
    );
    expect(updatedEffectiveCallNumberComponents.prefix).to.eq(
      createdEffectiveCallNumberComponents.prefix,
    );
    expect(updatedEffectiveCallNumberComponents.suffix).to.eq(updatedSuffix);
    expect(updatedEffectiveCallNumberComponents.typeId).to.eq(
      createdEffectiveCallNumberComponents.typeId,
    );
  },

  checkElectronicAccess: (relationshipValue, uriValue) => {
    cy.expect(
      electronicAccessAccordion
        .find(MultiColumnListCell({ row: 0, columnIndex: 0, content: relationshipValue }))
        .exists(),
    );
    cy.expect(
      electronicAccessAccordion
        .find(MultiColumnListCell({ row: 0, columnIndex: 1, content: uriValue }))
        .exists(),
    );
  },

  verifyLastUpdatedDate(date, userName) {
    cy.get('button[class^="metaHeaderButton-"]').click();
    cy.expect([
      administrativeDataAccordion.find(HTML(including(`Record last updated: ${date}`))).exists(),
      administrativeDataAccordion.find(HTML(including(`Source: ${userName}`))).exists(),
    ]);
  },
};
