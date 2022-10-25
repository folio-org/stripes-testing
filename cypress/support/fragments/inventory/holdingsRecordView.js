import {
  Accordion,
  Button,
  KeyValue,
  Modal,
  MultiColumnListCell,
  Section,
  MultiColumnList,
  HTML,
  including
} from '../../../../interactors';
import InventoryViewSource from './inventoryViewSource';
import NewHoldingsRecord from './newHoldingsRecord';

const root = Section({ id: 'ui-inventory.holdingsRecordView' });
const actionsButton = root.find(Button('Actions'));
const editInQuickMarcButton = Button({ id: 'clickable-edit-marc-holdings' });
const editButton = Button({ id: 'edit-holdings' });
const viewSourceButton = Button({ id: 'clickable-view-source' });
const deleteButton = Button({ id: 'clickable-delete-holdingsrecord' });
const duplicateButton = Button({ id: 'copy-holdings' });
const deleteConfirmationModal = Modal({ id:'delete-confirmation-modal' });
const holdingHrIdKeyValue = root.find(KeyValue('Holdings HRID'));
const closeButton = Button({ icon: 'times' });

export default {
  newHolding : {
    rowsCountInQuickMarcEditor : 6
  },
  waitLoading: () => cy.expect(actionsButton.exists()),
  close: () => {
    cy.do(closeButton.click());
    cy.expect(root.absent());
  },
  editInQuickMarc: () => {
    cy.do(actionsButton.click());
    cy.do(editInQuickMarcButton.click());
  },
  viewSource: () => {
    cy.do(actionsButton.click());
    cy.do(viewSourceButton.click());
    InventoryViewSource.waitHoldingLoading();
  },
  checkActionsMenuOptionsInFolioSource:() => {
    cy.do(actionsButton.click());
    cy.expect(viewSourceButton.absent());
    cy.expect(editInQuickMarcButton.absent());
    // close openned Actions
    cy.do(actionsButton.click());
  },
  checkActionsMenuOptionsInMarcSource:() => {
    cy.do(actionsButton.click());
    cy.expect(viewSourceButton.exists());
    cy.expect(editInQuickMarcButton.exists());
    // close openned Actions
    cy.do(actionsButton.click());
  },
  tryToDelete:() => {
    cy.do(actionsButton.click());
    cy.do(deleteButton.click());
    cy.expect(deleteConfirmationModal.exists());
    cy.do(deleteConfirmationModal.find(Button('Cancel')).click());
    cy.expect(deleteConfirmationModal.absent());
  },
  duplicate:() => {
    cy.do(actionsButton.click());
    cy.do(duplicateButton.click());
    NewHoldingsRecord.waitLoading();
  },
  delete:() => {
    cy.do(actionsButton.click());
    cy.do(deleteButton.click());
    cy.expect(deleteConfirmationModal.exists());
    cy.do(deleteConfirmationModal.find(Button('Delete')).click());
  },
  checkSource:sourceValue => cy.expect(KeyValue('Source', { value:sourceValue }).exists()),
  getHoldingsHrId: () => cy.then(() => holdingHrIdKeyValue.value()),
  checkInstanceHrId: expectedInstanceHrId => cy.expect(root.find(KeyValue('Instance HRID')).has({ value:expectedInstanceHrId })),
  checkHrId: expectedHrId => cy.expect(holdingHrIdKeyValue.has({ value: expectedHrId })),
  checkPermanentLocation:expectedLocation => cy.expect(KeyValue('Permanent', { value: expectedLocation }).exists()),
  getId:() => {
    // parse hodling record id from current url
    cy.url().then(url => cy.wrap(url.split('?')[0].split('/').at(-1)).as('holdingsRecorId'));
    return cy.get('@holdingsRecorId');
  },
  checkReadOnlyFields:() => {},
  edit:() => {
    cy.do(actionsButton.click());
    cy.do(editButton.click());
  },
  checkHoldingsType:type => cy.expect(KeyValue('Holdings type').has({ value: type })),
  checkCallNumberType: number => cy.expect(KeyValue('Call number type').has({ value: number })),
  checkURIIsNotEmpty:() => {
    cy.expect(Accordion('Electronic access').find(MultiColumnListCell({ row: 0, columnIndex: 1, content: '-' }))
      .absent());
  },
  checkCallNumber:(callNumber) => cy.expect(KeyValue('Call number').has({ value: callNumber })),
  checkAdministrativeNote:(note) => {
    cy.expect(MultiColumnList({ id: 'administrative-note-list' }).find(HTML(including(note))).exists());
  },
  checkHoldingsStatement:(statement) => {
    cy.expect(MultiColumnList({ id: 'list-holdingsStatement' }).find(HTML(including(statement))).exists());
  },
  checkStatisticalCode:(code) => {
    cy.expect(MultiColumnList({ id: 'list-statistical-codes' }).find(HTML(including(code))).exists());
  }
};
