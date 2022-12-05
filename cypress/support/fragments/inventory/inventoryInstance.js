import {
  MultiColumnList,
  HTML,
  including,
  Button,
  Section,
  QuickMarcEditor,
  KeyValue,
  MultiColumnListHeader,
  MultiColumnListCell,
  Accordion,
  Dropdown,
  Checkbox,
  MultiColumnListRow,
  Link,
  MultiSelect,
  Pane,
  TextField,
  Callout,
  calloutTypes,
  Modal
} from '../../../../interactors';
import InstanceRecordEdit from './instanceRecordEdit';
import InventoryViewSource from './inventoryViewSource';
import InventoryNewHoldings from './inventoryNewHoldings';
import InventoryInstanceSelectInstanceModal from './holdingsMove/inventoryInstanceSelectInstanceModal';
import InventoryInstancesMovement from './holdingsMove/inventoryInstancesMovement';
import ItemView from './inventoryItem/itemView';
import DateTools from '../../utils/dateTools';

const section = Section({ id: 'pane-instancedetails' });
const actionsButton = section.find(Button('Actions'));
const identifiers = MultiColumnList({ id: 'list-identifiers' });
const editMARCBibRecordButton = Button({ id:'edit-instance-marc' });
const editInstanceButton = Button({ id:'edit-instance' });
const moveHoldingsToAnotherInstanceButton = Button({ id:'move-instance' });
const viewSourceButton = Button({ id:'clickable-view-source' });
const overlaySourceBibRecord = Button({ id:'dropdown-clickable-reimport-record' });
const deriveNewMarcBibRecord = Button({ id:'duplicate-instance-marc' });
const addMarcHoldingRecordButton = Button({ id:'create-holdings-marc' });
const viewHoldingsButton = Button('View holdings');
const notesSection = Section({ id: 'instance-details-notes' });
const moveItemsButton = Button({ id: 'move-instance-items' });
const instanceDetailsPane = Pane({ id:'pane-instancedetails' });
const identifiersAccordion = Accordion('Identifiers');
const singleRecordImportModal = Modal('Single record import');
const source = KeyValue('Source');
const tagButton = Button({ icon: 'tag' });
const closeTag = Button({ icon: 'times' });
const tagsPane = Pane('Tags');
const textFieldTagInput = MultiSelect({ ariaLabelledby:'accordion-toggle-button-tag-accordion' });
const descriptiveDataAccordion = Accordion('Descriptive data');

const instanceHRID = 'Instance HRID';
const validOCLC = { id:'176116217',
  // TODO: hardcoded count related with interactors getters issue. Redesign to cy.then(QuickMarkEditor().rowsCount()).then(rowsCount => {...}
  lastRowNumber: 30,
  // it should be presented in marc bib one time to correct work(applicable in update of record)
  existingTag: '100',
  ldrValue: '01677cam\\a22003974a\\4500',
  tag008BytesProperties : {
    eLvl : { interactor:TextField('ELvl'), defaultValue:'4' },
    srce: { interactor:TextField('Srce'), defaultValue:'\\' },
    ctrl : { interactor:TextField('Ctrl'), defaultValue:'' },
    lang : { interactor:TextField('Lang'), defaultValue:'rus' },
    form : { interactor:TextField('Form'), defaultValue:'\\' },
    ctry : { interactor:TextField('Ctry'), defaultValue:'ru\\' },
    desc : { interactor:TextField('Desc'), defaultValue:'a' },
    dtSt : { interactor:TextField('DtSt'), defaultValue:'s' },
    startDate : { interactor:TextField('Start date'), defaultValue:'2007' },
    endDate : { interactor:TextField('End date'), defaultValue:'\\\\\\\\' }
  } };

const pressAddHoldingsButton = () => {
  cy.do(Button({ id:'clickable-new-holdings-record' }).click());
  InventoryNewHoldings.waitLoading();
};
const waitLoading = () => cy.expect(actionsButton.exists());
const openHoldings = (...holdingToBeOpened) => {
  const openActions = [];
  for (let i = 0; i < holdingToBeOpened.length; i++) {
    openActions.push(Accordion({ label: including(`Holdings: ${holdingToBeOpened[i]}`) }).clickHeader());
  }
  cy.do(openActions);
  // don't have elem on page for waiter
  cy.wait(2000);
};
const verifyInstanceTitle = (title) => cy.expect(Pane({ titleLabel: including(title) }).exists());
const verifyInstanceSource = (sourceValue) => cy.expect(source.has({ value: sourceValue }));
const verifyLastUpdatedDate = () => {
  const updatedDate = DateTools.getFormattedDateWithSlashes({ date: new Date() });
  cy.expect(Accordion('Administrative data').find(HTML(including(`Record last updated: ${updatedDate}`))).exists());
};
const verifyInstancePublisher = (indexRow, indexColumn, type) => {
  cy.expect(descriptiveDataAccordion.find(MultiColumnList({ id: 'list-publication' }))
    .find(MultiColumnListRow({ index: indexRow })).find(MultiColumnListCell({ columnIndex: indexColumn }))
    .has({ content: type }));
};

const verifyInstanceSubject = (indexRow, indexColumn, value) => {
  cy.expect(Accordion('Subject')
    .find(MultiColumnList({ id: 'list-subject' }))
    .find(MultiColumnListRow({ index: indexRow })).find(MultiColumnListCell({ columnIndex: indexColumn }))
    .has({ content: value }));
};

const verifyResourceIdentifier = (type, value, rowIndex) => {
  const identifierRow = identifiersAccordion
    .find(identifiers
      .find(MultiColumnListRow({ index: rowIndex })));

  cy.expect(identifierRow.find(MultiColumnListCell({ columnIndex: 0 })).has({ content: type }));
  cy.expect(identifierRow.find(MultiColumnListCell({ columnIndex: 1 })).has({ content: value }));
};

const checkInstanceNotes = (noteType, noteContent) => {
  cy.expect(Button({ id: 'accordion-toggle-button-instance-details-notes' }).exists());
  cy.expect(notesSection.find(MultiColumnListHeader(noteType)).exists());
  cy.expect(notesSection.find(MultiColumnListCell(noteContent)).exists());
};

const waitInstanceRecordViewOpened = (title) => {
  cy.expect(Pane({ id:'pane-instancedetails' }).exists());
  cy.expect(Pane({ titleLabel: including(title) }).exists());
};

export default {
  validOCLC,
  pressAddHoldingsButton,
  waitLoading,
  openHoldings,
  verifyInstanceTitle,
  verifyInstanceSource,
  verifyLastUpdatedDate,
  verifyInstancePublisher,
  verifyInstanceSubject,
  verifyResourceIdentifier,
  checkInstanceNotes,
  waitInstanceRecordViewOpened,
  checkExpectedOCLCPresence: (OCLCNumber = validOCLC.id) => {
    cy.expect(identifiers.find(HTML(including(OCLCNumber))).exists());
  },
  checkExpectedMARCSource: () => {
    cy.expect(section.find(HTML(including('MARC'))).exists());
    cy.expect(section.find(HTML(including('FOLIO'))).absent());
  },
  goToEditMARCBiblRecord:() => {
    cy.do(actionsButton.click());
    cy.do(editMARCBibRecordButton.click());
  },
  viewSource: () => {
    cy.do(actionsButton.click());
    cy.do(viewSourceButton.click());
    InventoryViewSource.waitLoading();
  },
  startOverlaySourceBibRecord:() => {
    cy.do(actionsButton.click());
    cy.do(overlaySourceBibRecord.click());
  },
  editInstance:() => {
    cy.do(actionsButton.click());
    cy.do(editInstanceButton.click());
    InstanceRecordEdit.waitLoading();
  },
  editMarcBibliographicRecord:() => {
    cy.do(actionsButton.click());
    cy.do(editMARCBibRecordButton.click());
    cy.expect(Pane({ id: 'quick-marc-editor-pane' }).exists());
  },

  checkElectronicAccess:() => {
    cy.expect(Accordion('Electronic access')
      .find(MultiColumnList({ id: 'list-electronic-access' }))
      .find(MultiColumnListCell({ row: 0, columnIndex: 0, content: 'No value set-' }))
      .exists());
  },

  deriveNewMarcBib:() => {
    cy.do(actionsButton.click());
    cy.do(deriveNewMarcBibRecord.click());
    cy.expect(QuickMarcEditor().exists());
  },

  getAssignedHRID:() => cy.then(() => KeyValue(instanceHRID).value()),
  checkUpdatedHRID: (oldHRID) => cy.expect(KeyValue(instanceHRID, { value: oldHRID }).absent()),
  checkPresentedText: (expectedText) => cy.expect(section.find(HTML(including(expectedText))).exists()),

  goToMarcHoldingRecordAdding:() => {
    cy.do(actionsButton.click());
    cy.do(addMarcHoldingRecordButton.click());
  },

  openHoldingView: () => {
    cy.do(viewHoldingsButton.click());
    cy.expect(Button('Actions').exists());
  },
  createHoldingsRecord:(permanentLocation) => {
    pressAddHoldingsButton();
    InventoryNewHoldings.fillRequiredFields(permanentLocation);
    InventoryNewHoldings.saveAndClose();
    waitLoading();
  },

  checkHoldingsTable: (locationName, rowNumber, caption, barcode, status, effectiveLocation = null) => {
    const accordionHeader = `Holdings: ${locationName} >`;
    const indexRowNumber = `row-${rowNumber}`;
    // wait for data to be loaded
    cy.intercept('/inventory/items?*').as('getItems');
    cy.wait('@getItems');
    cy.do(Accordion(accordionHeader).clickHeader());

    cy.expect(Accordion(accordionHeader)
      .find(MultiColumnListRow({ indexRow: indexRowNumber }))
      .find(MultiColumnListCell({ content: barcode })).exists());
    // TODO: uncomment once MODORDERS-569 will be implemented
    // cy.expect(Accordion(accordionHeader)
    //   .find(MultiColumnListRow({ rowNumber }))
    //   .find(MultiColumnListCell({ content: caption })).exists());
    cy.expect(Accordion(accordionHeader)
      .find(MultiColumnListRow({ indexRow: indexRowNumber }))
      .find(MultiColumnListCell({ content: status })).exists());
    if (effectiveLocation) {
      cy.expect(Accordion(accordionHeader)
        .find(MultiColumnListRow({ indexRow: indexRowNumber }))
        .find(MultiColumnListCell({ content: effectiveLocation })).exists());
    }
  },

  moveItemToAnotherHolding(firstHoldingName, secondHoldingName) {
    openHoldings(firstHoldingName, secondHoldingName);

    cy.do([
      Accordion({ label: including(`Holdings: ${firstHoldingName}`) }).find(MultiColumnListRow({ indexRow: 'row-0' })).find(Checkbox()).click(),
      Accordion({ label: including(`Holdings: ${firstHoldingName}`) }).find(Dropdown({ label: 'Move to' })).choose(including(secondHoldingName)),
    ]);
  },

  returnItemToFirstHolding(firstHoldingName, secondHoldingName) {
    this.openHoldings(firstHoldingName, secondHoldingName);

    cy.do([
      Accordion({ label: including(`Holdings: ${secondHoldingName}`) }).find(MultiColumnListRow({ indexRow: 'row-0' })).find(Checkbox()).click(),
      Accordion({ label: including(`Holdings: ${secondHoldingName}`) }).find(Dropdown({ label: 'Move to' })).choose(including(firstHoldingName))
    ]);
  },

  openMoveItemsWithinAnInstance: () => {
    return cy.do([
      actionsButton.click(),
      moveItemsButton.click()
    ]);
  },
  moveHoldingsToAnotherInstance:(newInstanceHrId) => {
    cy.do(actionsButton.click());
    cy.do(moveHoldingsToAnotherInstanceButton.click());
    InventoryInstanceSelectInstanceModal.waitLoading();
    InventoryInstanceSelectInstanceModal.searchByHrId(newInstanceHrId);
    InventoryInstanceSelectInstanceModal.selectInstance();
    InventoryInstancesMovement.move();
  },
  checkAddItem:(holdingsRecrodId) => {
    cy.expect(section.find(Section({ id:holdingsRecrodId }))
      .find(Button({ id: `clickable-new-item-${holdingsRecrodId}` }))
      .exists());
  },
  checkInstanceIdentifier: (identifier) => {
    cy.expect(identifiersAccordion.find(identifiers
      .find(MultiColumnListRow({ index: 0 })))
      .find(MultiColumnListCell({ columnIndex: 1 }))
      .has({ content: identifier }));
  },
  checkPrecedingTitle:(rowNumber, title, isbn, issn) => {
    cy.expect(MultiColumnList({ id: 'precedingTitles' })
      .find(MultiColumnListRow({ index: rowNumber }))
      .find(MultiColumnListCell({ content: title }))
      .exists());
    cy.expect(MultiColumnList({ id: 'precedingTitles' })
      .find(MultiColumnListRow({ index: rowNumber }))
      .find(MultiColumnListCell({ content: isbn }))
      .exists());
    cy.expect(MultiColumnList({ id: 'precedingTitles' })
      .find(MultiColumnListRow({ index: rowNumber }))
      .find(MultiColumnListCell({ content: issn }))
      .exists());
  },
  openItemView: (itemBarcode) => {
    cy.do(Link(including(itemBarcode)).click());
    ItemView.waitLoading();
  },
  openEditItemPage() {
    cy.do([
      Button('Actions').click(),
      Button('Edit').click(),
    ]);
  },
  closeInstancePage() {
    cy.do(Button({ ariaLabel: 'Close ' }).click());
    cy.expect(section.exists());
  },

  addTag:(tagName) => {
    cy.intercept('/tags?limit=10000').as('getTags');
    cy.do(tagButton.click());
    cy.wait(['@getTags']);
    // TODO: clarify with developers what should be waited
    cy.wait(1000);
    cy.do(tagsPane.find(textFieldTagInput).choose(tagName));
  },

  checkAddedTag:(tagName, instanceTitle) => {
    cy.do(MultiColumnListCell(instanceTitle).click());
    cy.do(tagButton.click());
    cy.expect(MultiSelect().exists(tagName));
  },

  deleteTag:(tagName) => {
    cy.do(MultiSelect().find(closeTag).click());
    cy.expect(MultiSelect().find(HTML(including(tagName))).absent());
    cy.expect(tagButton.find(HTML(including('0'))).exists());
  },

  checkIsInstancePresented:(title, location, content = 'On order') => {
    cy.expect(Pane({ titleLabel: including(title) }).exists());
    cy.expect(instanceDetailsPane.find(HTML(including(location))).exists());
    openHoldings([location]);
    cy.expect(instanceDetailsPane.find(MultiColumnListCell(content)).exists());
  },

  deleteInstanceViaApi: (id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `instance-storage/instances/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyResourceIdentifierAbsent:() => cy.expect(identifiersAccordion.find(identifiers).absent()),
  verifyInstanceLanguage:(language) => cy.expect(descriptiveDataAccordion.find(KeyValue('Language')).has({ value: language })),
  verifyInstancePhisicalcyDescription:(description) => {
    cy.expect(descriptiveDataAccordion.find(KeyValue('Physical description')).has({ value: description }));
  },

  checkIsInstanceUpdated:() => {
    const instanceStatusTerm = KeyValue('Instance status term');

    cy.expect(instanceStatusTerm.has({ value: 'Batch Loaded' }));
    cy.expect(source.has({ value: 'MARC' }));
    cy.expect(KeyValue('Cataloged date').has({ value: DateTools.getFormattedDate({ date: new Date() }) }));
  },

  getId() {
    cy.url().then(url => cy.wrap(url.split('?')[0].split('/').at(-1))).as('instanceId');
    return cy.get('@instanceId');
  },

  checkIsHoldingsCreated:(...holdingToBeOpened) => {
    cy.expect(Accordion({ label: including(`Holdings: ${holdingToBeOpened}`) }).exists());
  },

  openHoldingsAccordion:(location) => {
    cy.do(Button(including(location)).click());
  },

  checkIsItemCreated:(itemBarcode) => {
    cy.expect(Link(itemBarcode).exists());
  },

  checkMARCSourceAtNewPane() {
    cy.do(actionsButton.click());
    cy.expect([
      Button({ id: 'edit-instance' }).exists(),
      Button({ id: 'copy-instance' }).exists(),
      Button({ id: 'clickable-view-source' }).exists(),
      Button({ id: 'view-requests' }).exists(),
      editMARCBibRecordButton.absent(),
    ]);
    cy.do(Button({ id: 'clickable-view-source' }).click());
    cy.expect(HTML('MARC bibliographic record').exists());
  },

  singleRecordImportModalIsPresented:() => {
    cy.expect(singleRecordImportModal.exists());
  },

  importWithOclc:(oclc) => {
    cy.do(singleRecordImportModal.find(TextField({ name:'externalIdentifier' })).fillIn(oclc));
    cy.do(singleRecordImportModal.find(Button('Import')).click());
  },

  checkCalloutMessage: (text, calloutType = calloutTypes.success) => {
    cy.expect(Callout({ type: calloutType }).is({ textContent: text }));
  },

  checkIdentifier: (text) => {
    cy.expect(Accordion('Identifiers')
      .find(MultiColumnList({ id: 'list-identifiers' }))
      .find(MultiColumnListCell(including(text))).exists());
  },

  verifyLoan(content) {
    cy.expect(MultiColumnListCell({ content }).exists());
  },

  verifyLoanInItemPage(barcode, value) {
    cy.do(MultiColumnListCell({ content: barcode }).find(Link()).click());
    cy.expect(KeyValue('Temporary loan type').has({ value: value}));
    cy.do(Button({ icon: 'times'}).click());
  },
};
