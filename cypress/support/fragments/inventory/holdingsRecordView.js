import { HTML, including } from '@interactors/html';
import {
  Accordion,
  Button,
  KeyValue,
  Link,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  Section,
  matching,
} from '../../../../interactors';
import HoldingsRecordEdit from './holdingsRecordEdit';
import InventoryNewHoldings from './inventoryNewHoldings';
import InventoryViewSource from './inventoryViewSource';
import SelectLocationModal from './modals/selectLocationModal';
import InteractorsTools from '../../utils/interactorsTools';

const holdingsRecordViewSection = Section({ id: 'view-holdings-record-pane' });
const actionsButton = Button('Actions');
const editInQuickMarcButton = Button({ id: 'clickable-edit-marc-holdings' });
const editButton = Button({ id: 'edit-holdings' });
const viewSourceButton = Button({ id: 'clickable-view-source' });
const deleteButton = Button({ id: 'clickable-delete-holdingsrecord' });
const duplicateButton = Button({ id: 'copy-holdings' });
const deleteConfirmationModal = Modal('Confirm deletion of holdings record');
const holdingHrIdKeyValue = KeyValue('Holdings HRID');
const closeButton = Button({ icon: 'times' });
const electronicAccessAccordion = Accordion('Electronic access');
const acquisitionAccordion = Accordion('Acquisition');
const numberOfItemsKeyValue = KeyValue('Number of items');

function waitLoading() {
  cy.expect([holdingsRecordViewSection.exists()]);
}
function checkCopyNumber(number) {
  cy.expect(KeyValue('Copy number').has({ value: number }));
}
function checkCallNumberType(number) {
  cy.expect(KeyValue('Call number type').has({ value: number }));
}
function checkCallNumber(callNumber) {
  cy.expect(KeyValue('Call number').has({ value: callNumber }));
}
function checkCallNumberPrefix(prefix) {
  cy.expect(KeyValue('Call number prefix').has({ value: prefix }));
}
function checkCallNumberSuffix(prefix) {
  cy.expect(KeyValue('Call number suffix').has({ value: prefix }));
}

export const actionsMenuOptions = {
  viewSource: 'View source',
  editMarcBibliographicRecord: 'Edit in quickMARC',
  updateOwnership: 'Update ownership',
};

export default {
  checkCopyNumber,
  checkCallNumberType,
  checkCallNumber,
  checkCallNumberPrefix,
  checkCallNumberSuffix,
  waitLoading,
  newHolding: {
    rowsCountInQuickMarcEditor: 6,
  },

  // actions
  close: () => {
    cy.do(holdingsRecordViewSection.find(closeButton).click());
    cy.expect(holdingsRecordViewSection.absent());
  },
  editInQuickMarc: () => {
    cy.wait(1000);
    cy.do(actionsButton.click());
    cy.wait(2000);
    cy.do(editInQuickMarcButton.click());
  },
  viewSource: () => {
    cy.wait(1000);
    cy.do(actionsButton.click());
    cy.wait(2000);
    cy.do(viewSourceButton.click());
    InventoryViewSource.waitHoldingLoading();
  },
  tryToDelete: ({ deleteButtonShown = true } = {}) => {
    cy.do([actionsButton.click(), deleteButton.click()]);
    cy.expect(deleteConfirmationModal.exists());
    if (!deleteButtonShown) cy.expect(deleteConfirmationModal.find(Button('Delete')).absent());
    else cy.expect(deleteConfirmationModal.find(Button('Delete')).exists());
    cy.do(deleteConfirmationModal.find(Button('Cancel')).click());
    cy.expect(deleteConfirmationModal.absent());
  },
  duplicate: () => {
    cy.do([actionsButton.click(), duplicateButton.click()]);
    InventoryNewHoldings.waitLoading();
  },
  delete: () => {
    cy.do([actionsButton.click(), deleteButton.click()]);
    cy.expect(deleteConfirmationModal.exists());
    cy.do(deleteConfirmationModal.find(Button('Delete')).click());
  },
  edit: () => {
    cy.do([actionsButton.click(), editButton.click()]);

    HoldingsRecordEdit.waitLoading();

    return HoldingsRecordEdit;
  },
  updateOwnership: (secondMember, action, holdingsHrid, firstMember, locationName) => {
    cy.do(actionsButton.click());
    cy.wait(1000);
    cy.do(Button('Update ownership').click());
    SelectLocationModal.validateSelectLocationModalView(secondMember);
    SelectLocationModal.selectLocation(
      action,
      holdingsHrid,
      firstMember,
      secondMember,
      locationName,
    );
  },

  openAccordion: (name) => {
    cy.do(Accordion(name).click());
  },

  // checks
  checkSource: (sourceValue) => cy.expect(KeyValue('Source', { value: sourceValue }).exists()),
  checkHrId: (expectedHrId) => cy.expect(holdingHrIdKeyValue.has({ value: expectedHrId })),
  checkPermanentLocation: (expectedLocation) => cy.expect(KeyValue('Permanent', { value: including(expectedLocation) }).exists()),
  checkTemporaryLocation: (expectedLocation) => cy.expect(KeyValue('Temporary', { value: including(expectedLocation) }).exists()),
  checkEffectiveLocation: (expectedLocation) => cy.expect(
    KeyValue('Effective location for holdings', { value: including(expectedLocation) }).exists(),
  ),
  checkReadOnlyFields: () => {},
  checkHoldingsType: (type) => cy.expect(KeyValue('Holdings type').has({ value: type })),
  checkFormerHoldingsId: (value) => cy.expect(KeyValue('Former holdings ID', { value }).exists()),
  checkIllPolicy: (value) => cy.expect(KeyValue('ILL policy', { value }).exists()),
  checkDigitizationPolicy: (expectedPolicy) => cy.expect(KeyValue('Digitization policy', { value: expectedPolicy }).exists()),
  checkURIIsNotEmpty: () => cy.expect(
    electronicAccessAccordion
      .find(MultiColumnListCell({ row: 0, columnIndex: 1, content: '-' }))
      .absent(),
  ),
  checkAdministrativeNote: (note) => cy.expect(
    MultiColumnList({ id: 'administrative-note-list' })
      .find(HTML(including(note)))
      .exists(),
  ),
  checkExactContentInAdministrativeNote: (note, row = 0) => cy.expect(
    MultiColumnList({ id: 'administrative-note-list' })
      .find(MultiColumnListCell({ row, content: note }))
      .exists(),
  ),
  checkHoldingsStatement: (statement) => cy.expect(
    MultiColumnList({ id: 'list-holdingsStatement' })
      .find(HTML(including(statement)))
      .exists(),
  ),
  checkHoldingsStatementForIndexes: (statement) => cy.expect(
    MultiColumnList({ id: 'list-holdingsStatementForIndexes' })
      .find(HTML(including(statement)))
      .exists(),
  ),
  checkStatisticalCode: (code) => cy.expect(
    MultiColumnList({ id: 'list-statistical-codes' })
      .find(MultiColumnListCell({ content: code }))
      .exists(),
  ),
  checkHoldingsNote: (value, row = 0) => cy.expect(
    MultiColumnList({ id: `list-holdings-notes-${row}` })
      .find(MultiColumnListCell({ content: value }))
      .exists(),
  ),
  checkHoldingsNoteByRow: (value = [], row = 0) => value.forEach((text) => {
    cy.expect(
      MultiColumnList({ id: 'list-holdings-notes-0' })
        .find(MultiColumnListRow({ index: row }))
        .find(MultiColumnListCell({ content: text }))
        .exists(),
    );
  }),
  checkHoldingsNoteByRowForDifferentNoteTypes: (value = [], row = 0) => value.forEach((text) => {
    cy.expect(
      MultiColumnList({ id: `list-holdings-notes-${row}` })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ content: text }))
        .exists(),
    );
  }),
  checkMarkAsSuppressedFromDiscovery: () => cy.expect(
    holdingsRecordViewSection
      .find(HTML(including('Warning: Holdings is marked suppressed from discovery')))
      .exists(),
  ),
  checkMarkAsSuppressedFromDiscoveryAbsent: () => cy.expect(
    holdingsRecordViewSection
      .find(HTML(including('Warning: Holdings is marked suppressed from discovery')))
      .absent(),
  ),
  checkElectronicAccess: (
    relationshipValue,
    uriValue,
    linkText = '-',
    materialsSpecified = '-',
    urlPublicNote = '-',
    rowIndex = 0,
  ) => {
    cy.expect(
      electronicAccessAccordion
        .find(MultiColumnListCell({ row: rowIndex, columnIndex: 0, content: relationshipValue }))
        .exists(),
    );
    cy.expect(
      electronicAccessAccordion
        .find(MultiColumnListCell({ row: rowIndex, columnIndex: 1, content: uriValue }))
        .exists(),
    );
    cy.expect(
      electronicAccessAccordion
        .find(MultiColumnListCell({ row: rowIndex, columnIndex: 2, content: linkText }))
        .exists(),
    );
    cy.expect(
      electronicAccessAccordion
        .find(MultiColumnListCell({ row: rowIndex, columnIndex: 3, content: materialsSpecified }))
        .exists(),
    );
    cy.expect(
      electronicAccessAccordion
        .find(MultiColumnListCell({ row: rowIndex, columnIndex: 4, content: urlPublicNote }))
        .exists(),
    );
  },
  checkHoldingRecordViewOpened: () => {
    cy.expect(holdingsRecordViewSection.exists());
  },
  checkHotlinkToPOL: (number) => {
    cy.expect(acquisitionAccordion.find(MultiColumnListCell({ row: 0, content: number })).exists());
    cy.expect(acquisitionAccordion.find(Link({ href: including('/orders/lines/view') })).exists());
  },
  verifyElectronicAccess: (uri) => {
    cy.expect(electronicAccessAccordion.find(HTML(uri)).exists());
  },
  verifyElectronicAccessByElementIndex: (columnIndex, content, electronicAccessIndex = 0) => {
    cy.expect(
      electronicAccessAccordion
        .find(MultiColumnListRow({ index: electronicAccessIndex }))
        .find(MultiColumnListCell({ columnIndex, content }))
        .exists(),
    );
  },
  getHoldingsHrId: () => cy.then(() => holdingHrIdKeyValue.value()),
  getRecordLastUpdatedDate: () => cy.then(() => {
    return cy
      .get('div[class^="metaHeaderLabel-"]')
      .invoke('text')
      .then((text) => {
        // extract only date and time
        const colonIndex = text.indexOf(':');
        const lastUpdatedDate = text.substring(colonIndex + 2).trim();
        return lastUpdatedDate;
      });
  }),
  getId: () => {
    // parse hodling record id from current url
    cy.url().then((url) => cy.wrap(url.split('?')[0].split('/').at(-1)).as('holdingsRecorId'));
    return cy.get('@holdingsRecorId');
  },
  getHoldingsIDInDetailView() {
    cy.url().then((url) => {
      const holdingsID = url.split('/')[6].split('?')[0];
      cy.wrap(holdingsID).as('holdingsID');
    });
    return cy.get('@holdingsID');
  },
  closeSourceView() {
    cy.do(PaneHeader().find(closeButton).click());
    cy.expect(holdingsRecordViewSection.exists());
    this.waitLoading();
  },
  checkHoldingsStatementAbsent: (statement) => cy.expect(
    MultiColumnList({ id: 'list-holdingsStatement' })
      .find(HTML(including(statement)))
      .absent(),
  ),
  checkInstanceTitle: (title) => {
    cy.expect(HTML(including(`Instance: ${title}`)).exists());
  },
  checkLastUpdatedDate: (userName) => {
    cy.do(Button(including('Record last updated:')).click());
    cy.expect(HTML(including(`Source: ${userName}`)).exists());
  },
  checkHoldingsCallNumber: ({
    copyNumber,
    callNumberType,
    callNumberPrefix,
    callNumber,
    callNumberSuffix,
  }) => {
    checkCopyNumber(copyNumber);
    checkCallNumberType(callNumberType);
    checkCallNumber(callNumber);
    checkCallNumberPrefix(callNumberPrefix);
    checkCallNumberSuffix(callNumberSuffix);
  },
  checkTitle: (title) => {
    cy.expect(holdingsRecordViewSection.find(HTML(including(title))).exists());
  },
  checkPublicDisplayCheckboxState(expectedState) {
    const accordionSection = document.querySelector('#receiving-history-accordion');
    if (!accordionSection) {
      return false;
    }

    const checkboxElement = accordionSection.querySelector(
      'div[data-test-checkbox="true"] input[type="checkbox"]',
    );
    if (!checkboxElement) {
      return false;
    }

    return checkboxElement.checked === expectedState;
  },

  checkAbsentRecordInReceivingHistory(record) {
    cy.expect(
      Section({ id: 'receiving-history-accordion' }).find(MultiColumnListCell(record)).absent(),
    );
  },

  checkReceivingHistoryForTenant(tenantName, receiptDate, source) {
    const accordionConfigs = {
      member: {
        sectionId: 'receiving-history-accordion',
        listId: 'college-receiving-history-list',
      },
      central: {
        sectionId: 'central-receivings-accordion',
        listId: 'consortium-receiving-history-list',
      },
    };

    const config = accordionConfigs[tenantName];
    const receivingHistoryList = Section({ id: config.sectionId }).find(
      MultiColumnList({ id: config.listId }),
    );

    cy.expect(
      receivingHistoryList
        .find(MultiColumnListCell({ column: 'Receipt date', content: receiptDate }))
        .exists(),
    );
    cy.expect(
      receivingHistoryList
        .find(MultiColumnListCell({ column: 'Source', content: source }))
        .exists(),
    );
  },

  checkReceivingHistoryAccordionForMemberTenant(receiptDate, source) {
    this.checkReceivingHistoryForTenant('member', receiptDate, source);
  },

  checkReceivingHistoryAccordionForCentralTenant(receiptDate, source) {
    this.checkReceivingHistoryForTenant('central', receiptDate, source);
  },

  checkNotesByType(
    noteTypeRowIndex,
    columnHeader,
    noteValue,
    staffOnlyValue = 'No',
    noteRecordRowIndexInNoteType = 0,
  ) {
    cy.expect(
      MultiColumnList({ id: `list-holdings-notes-${noteTypeRowIndex}` })
        .find(
          MultiColumnListCell({
            column: 'Staff only',
            content: staffOnlyValue,
            row: noteRecordRowIndexInNoteType,
          }),
        )
        .exists(),
    );
    cy.expect(
      MultiColumnList({ id: `list-holdings-notes-${noteTypeRowIndex}` })
        .find(
          MultiColumnListCell({
            column: columnHeader,
            content: noteValue,
            row: noteRecordRowIndexInNoteType,
          }),
        )
        .exists(),
    );
  },

  checkHoldingNoteTypeAbsent(columnHeader, noteValue) {
    cy.expect(
      Accordion({ label: 'Holdings notes' })
        .find(
          MultiColumnListCell({
            column: columnHeader,
            content: noteValue,
          }),
        )
        .absent(),
    );
  },

  validateOptionInActionsMenu(options) {
    cy.do(actionsButton.click());
    options.forEach(({ optionName, shouldExist }) => {
      if (shouldExist) {
        cy.expect(Button(optionName).exists());
      } else {
        cy.expect(Button(optionName).absent());
      }
    });
    cy.do(actionsButton.click());
  },

  checkActionsButtonShown(isShown = true) {
    if (isShown) cy.expect(actionsButton.exists());
    else cy.expect(actionsButton.absent());
  },

  checkNumberOfItems: (numberOfItems) => cy.expect(numberOfItemsKeyValue.has({ value: numberOfItems })),

  copyHoldingsHrid() {
    cy.do(holdingHrIdKeyValue.find(Button({ icon: 'clipboard' })).click());
    InteractorsTools.checkCalloutMessage(matching(/Successfully copied ".*" to clipboard./));
  },
};
