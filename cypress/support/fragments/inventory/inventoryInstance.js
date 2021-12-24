import { MultiColumnList, HTML, including, Button, Section, QuickMarcEditor, KeyValue, MultiColumnListHeader, MultiColumnListCell } from '../../../../interactors';
import QuickMarcEditorFragment from '../quickMarcEditor';
import inventoryActions from './inventoryActions';
import InventoryInstanceEdit from './InventoryInstanceEdit';
import HoldingsRecordView from './holdingsRecordView';

const _section = Section({ id: 'pane-instancedetails' });
const actionsButton = _section.find(Button('Actions'));
const identifiers = MultiColumnList({ id:'list-identifiers' });
const editMARCBibRecordButton = Button({ id:'edit-instance-marc' });
const editInstanceButton = Button({ id:'edit-instance' });
const viewSourceButton = Button({ id:'clickable-view-source' });
const overlaySourceBibRecord = Button({ id:'dropdown-clickable-reimport-record' });
const deriveNewMarcBibRecord = Button({ id:'duplicate-instance-marc' });
const addMarcHoldingRecordButton = Button({ id:'create-holdings-marc' });
const viewHoldingsButton = Button('View holdings');
const notesSection = Section({ id: 'instance-details-notes' });

const instanceHRID = 'Instance HRID';
const validOCLC = { id:'176116217',
  // TODO: hardcoded count related with interactors getters issue. Redesign to cy.then(QuickMarkEditor().rowsCount()).then(rowsCount => {...}
  getLastRowNumber:() => 31,
  // it should be presented in marc bib one time to correct work(applicable in update of record)
  existingTag: '100' };

export default {
  validOCLC,

  checkExpectedOCLCPresence: (OCLCNumber = validOCLC.id) => {
    cy.expect(identifiers.find(HTML(including(OCLCNumber))).exists());
  },

  checkExpectedMARCSource: () => {
    cy.expect(_section.find(HTML(including('MARC'))).exists());
    cy.expect(_section.find(HTML(including('FOLIO'))).absent());
  },

  goToEditMARCBiblRecord:() => {
    cy.do(actionsButton.click());
    cy.do(editMARCBibRecordButton.click());
  },

  viewSource: () => {
    cy.do(actionsButton.click());
    cy.do(viewSourceButton.click());
  },

  waitLoading:() => cy.expect(actionsButton.exists()),

  overlaySourceBibRecord:(specialOCLCWorldCatidentifier = validOCLC.id) => {
    cy.do(actionsButton.click());
    cy.do(overlaySourceBibRecord.click());
    inventoryActions.fillImportFields(specialOCLCWorldCatidentifier);
    const startTime = Date.now();
    inventoryActions.pressImportInModal();
    return startTime;
  },

  editInstance:() => {
    cy.do(actionsButton.click());
    cy.do(editInstanceButton.click());
    InventoryInstanceEdit.waitLoading();
  },
  checkInstanceNotes:(noteType, noteContent) => {
    cy.expect(Button({ id: 'accordion-toggle-button-instance-details-notes' }).exists());
    cy.expect(notesSection.find(MultiColumnListHeader(noteType)).exists());
    cy.expect(notesSection.find(MultiColumnListCell(noteContent)).exists());
  },

  deriveNewMarcBib:() => {
    cy.do(actionsButton.click());
    cy.do(deriveNewMarcBibRecord.click());
    cy.expect(QuickMarcEditor().exists());
  },

  getAssignedHRID:() => {
    return cy.then(() => KeyValue(instanceHRID).value());
  },

  checkUpdatedHRID: (oldHRID) => {
    cy.expect(KeyValue(instanceHRID, { value: oldHRID }).absent());
  },

  checkPresentedText: (expectedText) => {
    cy.expect(_section.find(HTML(including(expectedText))).exists());
  },

  addMarcHoldingRecord:() => {
    cy.do(actionsButton.click());
    cy.do(addMarcHoldingRecordButton.click());
    QuickMarcEditorFragment.waitLoading();
    QuickMarcEditorFragment.updateExistingField('852', QuickMarcEditorFragment.getExistingLocation());
    QuickMarcEditorFragment.pressSaveAndClose();
    HoldingsRecordView.waitLoading();
  },

  goToHoldingView: () => {
    cy.do(viewHoldingsButton.click());
    HoldingsRecordView.waitLoading();
  }

};
