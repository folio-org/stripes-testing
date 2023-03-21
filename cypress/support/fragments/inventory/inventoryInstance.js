/* eslint-disable cypress/no-unnecessary-waiting */
import {
  MultiColumnList,
  Select,
  Form,
  HTML,
  including,
  Button,
  Section,
  QuickMarcEditor,
  QuickMarcEditorRow,
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
  TextArea,
  SearchField,
  Callout,
  calloutTypes,
  Modal,
  PaneHeader,
  or,
} from '../../../../interactors';
import InstanceRecordEdit from './instanceRecordEdit';
import InventoryViewSource from './inventoryViewSource';
import InventoryNewHoldings from './inventoryNewHoldings';
import InventoryInstanceSelectInstanceModal from './holdingsMove/inventoryInstanceSelectInstanceModal';
import InventoryInstancesMovement from './holdingsMove/inventoryInstancesMovement';
import ItemRecordView from './itemRecordView';
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
const singleRecordImportModal = Modal('Re-import');
const source = KeyValue('Source');
const tagButton = Button({ icon: 'tag' });
const closeTag = Button({ icon: 'times' });
const tagsPane = Pane('Tags');
const textFieldTagInput = MultiSelect({ ariaLabelledby:'accordion-toggle-button-tag-accordion' });
const descriptiveDataAccordion = Accordion('Descriptive data');
const titleDataAccordion = Accordion('Title data');
const contributorAccordion = Accordion('Contributor');
const callNumberTextField = TextArea('Call number');
const copyNumberTextField = TextField('Copy number');
const callNumSuffixTextField = TextArea('Call number suffix');
const volumeTextField = TextField('Volume');
const enumerationTextField = TextArea('Enumeration');
const chronologyTextField = TextArea('Chronology');
const addItemButton = Button('Add item');
const enabledSaveButton = Button({ id: 'clickable-save-item', disabled: false });
const saveAndCloseButton = Button({ id: 'clickable-save-item' });
const linkIconButton = Button({ ariaLabel: 'link' });
const searchInput = SearchField({ id:'textarea-authorities-search' });
const selectField = Select({ id: 'textarea-authorities-search-qindex' });
const searchOptionBtn = Button({ id: 'segment-navigation-search' });
const browseOptionBtn = Button({ id: 'segment-navigation-browse' });
const findAuthorityModal = Modal({ id: 'find-authority-modal' });
const closeModalFindAuthority = Button({ id: 'find-authority-modal-close-button' });
const sourceFileAccordion = Section({ id: 'sourceFileId' });
const subjectHeadingAccordion = Section({ id: 'subjectHeadings' });
const headingTypeAccordion = Section({ id: 'headingType' });
const createdDateAccordion = Section({ id: 'createdDate' });
const updatedDateAccordion = Section({ id: 'updatedDate' });
const searchTextArea = TextArea({ id: 'textarea-authorities-search' });
const marcViewPane = Section({ id: 'marc-view-pane' });
const searchButton = Button({ type: 'submit' });
const enabledSearchBtn = Button({ type: 'submit', disabled: false });
const resetAllButton = Button('Reset all');
const searchButtonDisabled = Button({ type: 'submit', disabled: true });
const instanceHRID = 'Instance HRID';
const paneResultsSection = Section({ id: 'pane-results' });
const actionsBtn = Button('Actions');
const actionsMenuSection = Section({ id: 'actions-menu-section' });
const importRecord = Button({ id: 'dropdown-clickable-import-record' });
const importRecordModal = Modal({ id: 'import-record-modal' });
const importButton = Button('Import');
const closeSourceFile = Button({ icon: 'times-circle-solid' });
const authoritySearchResults = Section({ id: 'authority-search-results-pane' });
const mclLinkHeader = MultiColumnListHeader({ id: 'list-column-link' });
const mclAuthRefTypeHeader = MultiColumnListHeader({ id: 'list-column-authreftype' });
const mclHeadingRef = MultiColumnListHeader({ id: 'list-column-headingref' });
const mclHeadingType = MultiColumnListHeader({ id: 'list-column-headingtype' });
const buttonPrevPageDisabled = Button({ id: 'authority-result-list-prev-paging-button', disabled: true });
const buttonNextPageDisabled = Button({ id: 'authority-result-list-next-paging-button', disabled: true });
const buttonNextPageEnabled = Button({ id: 'authority-result-list-next-paging-button', disabled: false });
const buttonLink = Button('Link');
const closeDetailsView = Button({ icon: 'times' });
const quickMarcEditorPane = Section({ id: 'quick-marc-editor-pane' });
const filterPane = Section({ id: 'pane-filter' });
const inputSearchField = TextField({ id: 'input-inventory-search' });

const validOCLC = { id:'176116217',
  // TODO: hardcoded count related with interactors getters issue. Redesign to cy.then(QuickMarkEditor().rowsCount()).then(rowsCount => {...}
  lastRowNumber: 30,
  // it should be presented in marc bib one time to correct work(applicable in update of record)
  existingTag: '100',
  ldrValue: '01677cam\\a22003974a\\4500',
  tag008BytesProperties : {
    srce: { interactor:TextField('Srce'), defaultValue:'\\' },
    ctrl : { interactor:TextField('Ctrl'), defaultValue:'' },
    lang : { interactor:TextField('Lang'), defaultValue:'rus' },
    form : { interactor:TextField('Form'), defaultValue:'\\' },
    ctry : { interactor:TextField('Ctry'), defaultValue:'ru\\' },
    desc : { interactor:TextField('MRec'), defaultValue:'o' },
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

const openItemByBarcode = (itemBarcode) => {
  cy.do(Link(including(itemBarcode)).click());
  ItemRecordView.waitLoading();
};

const verifyInstanceTitle = (title) => {
  // don't have elem on page for waiter
  cy.wait(3000);
  cy.expect(Pane({ titleLabel: including(title) }).exists());
};

const verifyLastUpdatedDate = () => {
  const updatedDate = DateTools.getFormattedDateWithSlashes({ date: new Date() });
  cy.expect(Accordion('Administrative data').find(HTML(including(`Record last updated: ${updatedDate}`))).exists());
};

const verifyInstancePublisher = (indexRow, indexColumn, type) => {
  cy.expect(descriptiveDataAccordion.find(MultiColumnList({ id: 'list-publication' }))
    .find(MultiColumnListRow({ index: indexRow })).find(MultiColumnListCell({ columnIndex: indexColumn }))
    .has({ content: type }));
};

const verifyAlternativeTitle = (indexRow, indexColumn, value) => {
  cy.expect(titleDataAccordion.find(MultiColumnList({ id: 'list-alternative-titles' }))
    .find(MultiColumnListRow({ index: indexRow })).find(MultiColumnListCell({ columnIndex: indexColumn }))
    .has({ content: value }));
};

const verifyContributor = (indexRow, indexColumn, value) => {
  cy.expect(contributorAccordion.find(MultiColumnList({ id: 'list-contributors' }))
    .find(MultiColumnListRow({ index: indexRow })).find(MultiColumnListCell({ columnIndex: indexColumn }))
    .has({ content: value }));
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
  verifyLastUpdatedDate,
  verifyInstancePublisher,
  verifyInstanceSubject,
  verifyResourceIdentifier,
  checkInstanceNotes,
  waitInstanceRecordViewOpened,
  openItemByBarcode,
  verifyAlternativeTitle,
  verifyContributor,

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

  importInstance() {
    cy.do(paneResultsSection.find(actionsBtn).click());
    cy.do(actionsMenuSection.find(importRecord).click());
    cy.expect(importRecordModal.exists());
    cy.do(TextField({ label: including('Enter the OCLC WorldCat identifier') }).fillIn(validOCLC.id));
    cy.do(importRecordModal.find(importButton).click());
    cy.expect(section.exists());
  },

  searchByTitle(title) {
    cy.do([
      filterPane.find(inputSearchField).fillIn(title),
      filterPane.find(searchButton).click(),
    ]);
    cy.expect(MultiColumnListRow({ index: 0 }).exists());
  },

  verifyAndClickLinkIcon() {
    // Waiter needed for the link to be loaded properly.
    cy.wait(1000);
    cy.expect(QuickMarcEditorRow({ tagValue: '700' }).find(linkIconButton).exists());
    cy.do(QuickMarcEditorRow({ tagValue: '700' }).find(linkIconButton).click());
  },

  verifySelectMarcAuthorityModal() {
    cy.expect([
      findAuthorityModal.exists(),
      findAuthorityModal.has({ title: 'Select MARC authority' }),
      closeModalFindAuthority.exists(),
    ]);
  },

  verifySearchAndFilterDisplay() {
    cy.get('#textarea-authorities-search-qindex').then((elem) => { expect(elem.text()).to.include('Personal name'); });
    cy.expect([
      searchOptionBtn.exists(),
      browseOptionBtn.exists(),
      searchTextArea.exists(),
      searchButtonDisabled.exists(),
      resetAllButton.exists(),
      sourceFileAccordion.find(MultiSelect({ label: including('Authority source') })).exists(),
      sourceFileAccordion.find(MultiSelect({ selected: including('LC Name Authority file (LCNAF)') })).exists(),
      subjectHeadingAccordion.find(Button('Thesaurus')).has({ ariaExpanded: 'false' }),
      headingTypeAccordion.find(Button('Type of heading')).has({ ariaExpanded: 'false' }),
      createdDateAccordion.find(Button('Date created')).has({ ariaExpanded: 'false' }),
      updatedDateAccordion.find(Button('Date updated')).has({ ariaExpanded: 'false' }),
    ]);
  },

  closeAuthoritySource() {
    cy.do(sourceFileAccordion.find(closeSourceFile).click());
    cy.expect(sourceFileAccordion.find(MultiSelect({ selected: including('LC Name Authority file (LCNAF)') })).absent());
  },

  verifySearchOptions() {
    cy.do(selectField.click());
    cy.expect([
      selectField.has({ content: including('Keyword') }),
      selectField.has({ content: including('Identifier (all)') }),
      selectField.has({ content: including('Personal name') }),
      selectField.has({ content: including('Corporate/Conference name') }),
      selectField.has({ content: including('Geographic name') }),
      selectField.has({ content: including('Name-title') }),
      selectField.has({ content: including('Uniform title') }),
      selectField.has({ content: including('Subject') }),
      selectField.has({ content: including('Children\'s subject heading') }),
      selectField.has({ content: including('Genre') }),
      selectField.has({ content: including('Advanced search') }),
    ]);
  },

  fillInAndSearchResults(value) {
    cy.do(searchInput.fillIn(value));
    cy.expect(searchInput.has({ value }));
    cy.expect(enabledSearchBtn.exists());
    cy.do(searchButton.click());
    cy.expect(authoritySearchResults.exists());
  },

  checkResultsListPaneHeader() {
    cy.expect(PaneHeader('MARC authority').exists()),
    cy.intercept('GET', '/search/authorities?*').as('getItems');
    cy.wait('@getItems', { timeout: 10000 }).then(item => {
      cy.expect(Pane({ subtitle: `${item.response.body.totalRecords} results found` }).exists());
      expect(item.response.body.totalRecords < 100).to.be.true;
    });
  },

  checkSearchResultsTable() {
    cy.expect([
      mclLinkHeader.has({ content: 'Link' }),
      mclAuthRefTypeHeader.has({ content: 'Authorized' }),
      mclHeadingRef.has({ content: 'Heading/Reference' }),
      mclHeadingType.has({ content: 'Type of heading' }),
      MultiColumnListRow({ index: 0 }).find(Button({ ariaLabel: 'Link' })).exists(),
      MultiColumnListCell({ row: 0, innerHTML: including('<b>Authorized</b>') }).exists(),
    ]);
    cy.expect([
      buttonPrevPageDisabled.exists(),
      or(
        buttonNextPageDisabled.exists(),
        buttonNextPageEnabled.exists(),
      ),
    ]);
  },

  selectRecord() {
    cy.do(MultiColumnListRow({ index: 0 }).find(MultiColumnListCell({ columnIndex: 2 })).find(Button()).click());
  },

  checkRecordDetailPage() {
    cy.expect([
      marcViewPane.exists(),
      marcViewPane.find(buttonLink).exists(),
      marcViewPane.has({ mark: 'Starr, Lisa' }),
    ]);
  },

  closeDetailsView() {
    cy.do(marcViewPane.find(closeDetailsView).click());
    cy.expect(authoritySearchResults.exists());
  },

  closeFindAuthorityModal() {
    cy.do(closeModalFindAuthority.click());
    cy.expect([
      findAuthorityModal.absent(),
      quickMarcEditorPane.exists(),
    ]);
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
    cy.reload();
  },

  getAssignedHRID:() => cy.then(() => KeyValue(instanceHRID).value()),
  checkUpdatedHRID: (oldHRID) => cy.expect(KeyValue(instanceHRID, { value: oldHRID }).absent()),
  checkPresentedText: (expectedText) => cy.expect(section.find(HTML(including(expectedText))).exists()),

  goToMarcHoldingRecordAdding:() => {
    cy.do(actionsButton.click());
    cy.do(addMarcHoldingRecordButton.click());
  },

  addItem() {
    cy.expect(addItemButton.exists());
    cy.do(addItemButton.click());
    cy.expect(Section({ id: 'acc01' }).exists());
  },

  fillItemRequiredFields() {
    cy.do(Select({ id: 'additem_materialType' }).choose('book'));
    cy.do(Select({ id: 'additem_loanTypePerm' }).choose('Can circulate'));
    cy.expect(Form().find(enabledSaveButton).exists());
  },

  addItemData(callNumber, copyNumber, callNamberSuffix) {
    cy.expect(Accordion({ id: 'acc02' }).exists());
    cy.do(callNumberTextField.fillIn(callNumber));
    cy.do(copyNumberTextField.fillIn(copyNumber));
    cy.do(callNumSuffixTextField.fillIn(callNamberSuffix));
  },

  addEnumerationData(volume, enumeration, chronology) {
    cy.expect(Accordion({ id: 'acc03' }).exists());
    cy.do(volumeTextField.fillIn(volume));
    cy.do(enumerationTextField.fillIn(enumeration));
    cy.do(chronologyTextField.fillIn(chronology));
  },

  saveItemDataAndVerifyExistence(copyNumber) {
    cy.do(saveAndCloseButton.click());
    cy.expect(Section({ id: 'pane-instancedetails' }).exists());
    cy.do(Button(including('Holdings:')).click());
    cy.expect(Section({ id: 'pane-instancedetails' }).find(MultiColumnListCell({ row: 0, content: copyNumber })).exists());
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

    const row = Accordion(accordionHeader).find(MultiColumnListRow({ indexRow: indexRowNumber }));

    cy.expect([
      row.find(MultiColumnListCell({ content: barcode })).exists(),
      row.find(MultiColumnListCell({ content: caption })).exists(),
      row.find(MultiColumnListCell({ content: status })).exists(),
    ]);

    if (effectiveLocation) {
      cy.expect(row.find(MultiColumnListCell({ content: effectiveLocation })).exists());
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
  moveHoldingsToAnotherInstanceByItemTitle: (holdingName, title) => {
    cy.do(actionsButton.click());
    cy.do(moveHoldingsToAnotherInstanceButton.click());
    InventoryInstanceSelectInstanceModal.waitLoading();
    InventoryInstanceSelectInstanceModal.searchByTitle(title);
    InventoryInstanceSelectInstanceModal.selectInstance();
    InventoryInstancesMovement.moveFromMultiple(holdingName, title);
  },
  checkAddItem:(holdingsRecordId) => {
    cy.expect(section.find(Section({ id:holdingsRecordId }))
      .find(Button({ id: `clickable-new-item-${holdingsRecordId}` }))
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

  edit() {
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

  verifyResourceIdentifierAbsent:(value) => cy.expect(identifiersAccordion.find(MultiColumnListCell(including(value))).absent()),
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

  singleOverlaySourceBibRecordModalIsPresented:() => cy.expect(singleRecordImportModal.exists()),

  importWithOclc:(oclc) => {
    cy.do(singleRecordImportModal.find(TextField({ name:'externalIdentifier' })).fillIn(oclc));
    cy.do(singleRecordImportModal.find(Button('Import')).click());
  },

  checkCalloutMessage: (text, calloutType = calloutTypes.success) => {
    cy.expect(Callout({ type: calloutType }).is({ textContent: text }));
  },

  checkIdentifier: (text) => {
    cy.expect(section.find(Button(including('Identifiers'))).exists());
    cy.expect(Accordion('Identifiers')
      .find(MultiColumnList({ id: 'list-identifiers' }))
      .find(MultiColumnListCell(including(text))).exists());
  },

  verifyLoan: (content) => cy.expect(MultiColumnListCell({ content }).exists()),

  verifyLoanInItemPage(barcode, value) {
    cy.do(MultiColumnListCell({ content: barcode }).find(Link()).click());
    cy.expect(KeyValue('Temporary loan type').has({ value }));
    cy.do(Button({ icon: 'times' }).click());
  },

  verifyItemBarcode(barcode) {
    cy.expect(MultiColumnListCell({ content: barcode }).exists());
  },

  openItemByBarcodeAndIndex: (barcode, indexRowNumber, rowCountInList) => {
    cy.do([
      Button('Collapse all').click(),
      Button('Acquisition').click(),
      MultiColumnList({ columnCount: rowCountInList })
        .find(MultiColumnListRow({ indexRow: indexRowNumber }))
        .find(Link(barcode)).click()
    ]);
  },

  verifyHoldingLocation(content) {
    cy.expect(MultiColumnListCell({ content }).exists());
  },
};
