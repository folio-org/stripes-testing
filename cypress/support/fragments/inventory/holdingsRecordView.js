import { including, HTML } from '@interactors/html';
import {
  Accordion,
  Button,
  KeyValue,
  Modal,
  MultiColumnListCell,
  Section,
  MultiColumnList,
  Pane,
  PaneHeader,
  Select,
  TextArea,
  Link,
} from '../../../../interactors';
import HoldingsRecordEdit from './holdingsRecordEdit';
import InventoryViewSource from './inventoryViewSource';
import InventoryNewHoldings from './inventoryNewHoldings';

const holdingsRecordViewSection = Section({ id: 'ui-inventory.holdingsRecordView' });
const actionsButton = Button('Actions');
const editInQuickMarcButton = Button({ id: 'clickable-edit-marc-holdings' });
const editButton = Button({ id: 'edit-holdings' });
const viewSourceButton = Button({ id: 'clickable-view-source' });
const deleteButton = Button({ id: 'clickable-delete-holdingsrecord' });
const duplicateButton = Button({ id: 'copy-holdings' });
const deleteConfirmationModal = Modal({ id: 'delete-confirmation-modal' });
const holdingHrIdKeyValue = KeyValue('Holdings HRID');
const closeButton = Button({ icon: 'times' });
const electronicAccessAccordion = Accordion('Electronic access');
const acquisitionAccordion = Accordion('Acquisition');
const addElectronicAccessButton = Button('Add electronic access');
const relationshipSelectDropdown = Select('Relationship');
const uriTextarea = TextArea({ ariaLabel: 'URI' });
const holdingsViewPane = Pane({ id: 'ui-inventory.holdingsRecordView' });

function waitLoading() {
  cy.expect([holdingsRecordViewSection.exists(), actionsButton.exists()]);
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
    cy.do(Pane({ id: 'ui-inventory.holdingsRecordView' }).find(closeButton).click());
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
  tryToDelete: () => {
    cy.do([actionsButton.click(), deleteButton.click()]);
    cy.expect(deleteConfirmationModal.exists());
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

  openAccordion: (name) => {
    cy.do(Accordion(name).click());
  },

  // checks
  checkActionsMenuOptionsInFolioSource: () => {
    cy.do(actionsButton.click());
    cy.expect(viewSourceButton.absent());
    cy.expect(editInQuickMarcButton.absent());
    // close openned Actions
    cy.do(actionsButton.click());
  },
  checkActionsMenuOptionsInMarcSource: () => {
    cy.do(actionsButton.click());
    cy.expect(viewSourceButton.exists());
    cy.expect(editInQuickMarcButton.exists());
    // close openned Actions
    cy.do(actionsButton.click());
  },
  checkSource: (sourceValue) => cy.expect(KeyValue('Source', { value: sourceValue }).exists()),
  checkInstanceHrId: (expectedInstanceHrId) => cy.expect(
    holdingsRecordViewSection
      .find(KeyValue('Instance HRID'))
      .has({ value: expectedInstanceHrId }),
  ),
  checkHrId: (expectedHrId) => cy.expect(holdingHrIdKeyValue.has({ value: expectedHrId })),
  checkPermanentLocation: (expectedLocation) => cy.expect(KeyValue('Permanent', { value: expectedLocation }).exists()),
  checkTemporaryLocation: (expectedLocation) => cy.expect(KeyValue('Temporary', { value: expectedLocation }).exists()),
  checkEffectiveLocation: (expectedLocation) => cy.expect(KeyValue('Effective location for holdings', { value: expectedLocation }).exists()),
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
  checkHoldingsStatement: (statement) => cy.expect(
    MultiColumnList({ id: 'list-holdingsStatement' })
      .find(HTML(including(statement)))
      .exists(),
  ),
  checkStatisticalCode: (code) => cy.expect(
    MultiColumnList({ id: 'list-statistical-codes' })
      .find(MultiColumnListCell({ content: code }))
      .exists(),
  ),
  checkHoldingsNote: (value) => cy.expect(
    MultiColumnList({ id: 'list-holdings-notes-0' })
      .find(MultiColumnListCell({ content: value }))
      .exists(),
  ),
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
  checkElectronicAccess: (relationshipValue, uriValue, linkText = '-', urlPublicNote = '-') => {
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
    cy.expect(
      electronicAccessAccordion
        .find(MultiColumnListCell({ row: 0, columnIndex: 2, content: linkText }))
        .exists(),
    );
    cy.expect(
      electronicAccessAccordion
        .find(MultiColumnListCell({ row: 0, columnIndex: 4, content: urlPublicNote }))
        .exists(),
    );
  },
  checkHoldingRecordViewOpened: () => {
    cy.expect(holdingsViewPane.exists());
  },
  checkHotlinkToPOL: (number) => {
    cy.expect(acquisitionAccordion.find(MultiColumnListCell({ row: 0, content: number })).exists());
    cy.expect(acquisitionAccordion.find(Link({ href: including('/orders/lines/view') })).exists());
  },
  addElectronicAccess: (type) => {
    cy.expect(electronicAccessAccordion.exists());
    cy.do([
      addElectronicAccessButton.click(),
      relationshipSelectDropdown.choose(type),
      uriTextarea.fillIn(type),
      Button('Save & close').click(),
    ]);
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
};
