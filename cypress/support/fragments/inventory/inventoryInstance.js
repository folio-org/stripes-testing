import { MultiColumnList, HTML, including, Button, Section, QuickMarcEditor, KeyValue } from '../../../../interactors';
import inventoryActions from './inventoryActions';
import { getLongDelay } from '../../utils/cypressTools';
import InventoryInstanceEdit from './InventoryInstanceEdit';

const _section = Section({ id: 'pane-instancedetails' });
const actionsButton = _section.find(Button('Actions'));
const identifiers = MultiColumnList({ id:'list-identifiers' });
const editMARCBibRecordButton = Button({ id:'edit-instance-marc' });
const editInstanceButton = Button({ id:'edit-instance' });
const viewSourceButton = Button({ id:'clickable-view-source' });
const overlaySourceBibRecord = Button({ id:'dropdown-clickable-reimport-record' });
const deriveNewMarcBibRecord = Button({ id:'duplicate-instance-marc' });

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
  // TODO: add id to section with Instance notes and redesign to interactors
  checkInstanceNotes:(noteType, noteContent) => {
    const instanceNotesXpath = '//div[.="Instance notes"]';
    cy.xpath(instanceNotesXpath, getLongDelay()).should('be.exist');
    const instatnceNotesValuesXpath = `${instanceNotesXpath}/../../../../../..`;
    cy.xpath(`${instatnceNotesValuesXpath}//div[@role="columnheader"][.="${noteType}"]`).should('be.exist');
    cy.xpath(`${instatnceNotesValuesXpath}//div[@role="gridcell"][.="${noteContent}"]`).should('be.exist');
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
  }

};
