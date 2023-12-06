import uuid from 'uuid';
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
  PaneContent,
  matching,
} from '../../../../interactors';
import HoldingsRecordEdit from './holdingsRecordEdit';
import HoldingsRecordView from './holdingsRecordView';
import InstanceRecordEdit from './instanceRecordEdit';
import InventoryViewSource from './inventoryViewSource';
import InventoryNewHoldings from './inventoryNewHoldings';
import InventoryInstanceSelectInstanceModal from './holdingsMove/inventoryInstanceSelectInstanceModal';
import InventoryInstancesMovement from './holdingsMove/inventoryInstancesMovement';
import ItemRecordEdit from './item/itemRecordEdit';
import ItemRecordView from './item/itemRecordView';
import InteractorsTools from '../../utils/interactorsTools';
import DateTools from '../../utils/dateTools';
import getRandomPostfix from '../../utils/stringTools';
import Badge from '../../../../interactors/badge';
import NewOrderModal from './modals/newOrderModal';

const instanceDetailsSection = Section({ id: 'pane-instancedetails' });
const actionsButton = instanceDetailsSection.find(Button('Actions'));
const identifiers = MultiColumnList({ id: 'list-identifiers' });
const editMARCBibRecordButton = Button({ id: 'edit-instance-marc' });
const editInstanceButton = Button({ id: 'edit-instance' });
const moveHoldingsToAnotherInstanceButton = Button({ id: 'move-instance' });
const viewSourceButton = Button({ id: 'clickable-view-source' });
const overlaySourceBibRecord = Button({ id: 'dropdown-clickable-reimport-record' });
const deriveNewMarcBibRecord = Button({ id: 'duplicate-instance-marc' });
const addMarcHoldingRecordButton = Button({ id: 'create-holdings-marc' });
const addHoldingButton = instanceDetailsSection.find(Button('Add holdings'));
const viewHoldingsButton = Button('View holdings');
const notesSection = Section({ id: 'instance-details-notes' });
const moveItemsButton = Button({ id: 'move-instance-items' });
const identifiersAccordion = Accordion('Identifiers');
const singleRecordImportModal = Modal('Re-import');
const source = KeyValue('Source');
const tagButton = Button({ icon: 'tag' });
const closeTag = Button({ icon: 'times' });
const tagsPane = Pane('Tags');
const textFieldTagInput = MultiSelect({ ariaLabelledby: 'input-tag-label' });
const descriptiveDataAccordion = Accordion('Descriptive data');
const publisherList = descriptiveDataAccordion.find(MultiColumnList({ id: 'list-publication' }));
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
const searchInput = SearchField({ id: 'textarea-authorities-search' });
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
const marcViewPaneContent = PaneContent({ id: 'marc-view-pane-content' });
const searchButton = Button({ type: 'submit' });
const enabledSearchBtn = Button({ type: 'submit', disabled: false });
const disabledResetAllBtn = Button({ id: 'clickable-reset-all', disabled: true });
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
const mclHeadingSourceFile = MultiColumnListHeader({ id: 'list-column-authoritysource' });
const contributorsList = MultiColumnList({ id: 'list-contributors' });
const buttonPrevPageDisabled = Button({
  id: 'authority-result-list-prev-paging-button',
  disabled: true,
});
const buttonNextPageDisabled = Button({
  id: 'authority-result-list-next-paging-button',
  disabled: true,
});
const buttonNextPageEnabled = Button({
  id: 'authority-result-list-next-paging-button',
  disabled: false,
});
const buttonLink = Button('Link');
const closeDetailsView = Button({ icon: 'times' });
const quickMarcEditorPane = Section({ id: 'quick-marc-editor-pane' });
const filterPane = Section({ id: 'pane-filter' });
const inputSearchField = TextArea({ id: 'input-inventory-search' });
const holdingsPane = Pane(including('Holdings'));
const instancesButton = Button({ id: 'segment-navigation-instances' });
const newMarcBibButton = Button({ id: 'clickable-newmarcrecord' });
const quickMarcPaneHeader = PaneHeader({ id: 'paneHeaderquick-marc-editor-pane' });
const detailsPaneContent = PaneContent({ id: 'pane-instancedetails-content' });
const administrativeDataAccordion = Accordion('Administrative data');
const unlinkIconButton = Button({ icon: 'unlink' });
const itemBarcodeField = TextField({ name: 'barcode' });
const itemStatusKeyValue = KeyValue('Item status');
const viewHoldingsButtonByID = (holdingsID) => Section({ id: holdingsID }).find(viewHoldingsButton);
const marcAuthorityAppIcon = Link({ href: including('/marc-authorities/authorities/') });

const messages = {
  itemMovedSuccessfully: '1 item has been successfully moved.',
};

const validOCLC = {
  id: '176116217',
  // TODO: hardcoded count related with interactors getters issue. Redesign to cy.then(QuickMarkEditor().rowsCount()).then(rowsCount => {...}
  lastRowNumber: 30,
  // it should be presented in marc bib one time to correct work(applicable in update of record)
  existingTag: '100',
  ldrValue: '01677cam\\a22003974a\\4500',
  tag008BytesProperties: {
    srce: { interactor: TextField('Srce'), defaultValue: '\\' },
    lang: { interactor: TextField('Lang'), defaultValue: 'rus' },
    form: { interactor: TextField('Form'), defaultValue: '\\' },
    ctry: { interactor: TextField('Ctry'), defaultValue: 'ru\\' },
    desc: { interactor: TextField('MRec'), defaultValue: 'o' },
    dtSt: { interactor: TextField('DtSt'), defaultValue: 's' },
    startDate: { interactor: TextField('Start date'), defaultValue: '2007' },
    endDate: { interactor: TextField('End date'), defaultValue: '\\\\\\\\' },
  },
};

const pressAddHoldingsButton = () => {
  cy.do(addHoldingButton.click());
  HoldingsRecordEdit.waitLoading();

  return HoldingsRecordEdit;
};

const waitLoading = () => cy.expect(actionsButton.exists());

const openHoldings = (...holdingToBeOpened) => {
  const openActions = [];
  for (let i = 0; i < holdingToBeOpened.length; i++) {
    openActions.push(
      Accordion({ label: including(`Holdings: ${holdingToBeOpened[i]}`) }).clickHeader(),
    );
  }
  cy.do(openActions);
  // don't have elem on page for waiter
  cy.wait(2000);
};

const openItemByBarcode = (itemBarcode) => {
  cy.do(
    instanceDetailsSection
      .find(MultiColumnListCell({ columnIndex: 0, content: itemBarcode }))
      .find(Button(including(itemBarcode)))
      .click(),
  );
  ItemRecordView.waitLoading();
};

const verifyInstanceTitle = (title) => {
  // don't have elem on page for waiter
  cy.wait(3000);
  cy.expect(Pane({ titleLabel: including(title) }).exists());
};

const verifyLastUpdatedDate = () => {
  const updatedDate = DateTools.getFormattedDateWithSlashes({ date: new Date() });
  cy.expect(
    Accordion('Administrative data')
      .find(HTML(including(`Record last updated: ${updatedDate}`)))
      .exists(),
  );
};

const verifyLastUpdatedUser = (userName) => {
  cy.do(administrativeDataAccordion.find(Button(including('Record last updated'))).click());
  cy.expect(
    Accordion('Administrative data')
      .find(HTML(including(userName)))
      .exists(),
  );
};

const verifyInstancePublisher = ({ publisher, role, place, date }, row = 0) => {
  if (publisher) {
    cy.expect(
      publisherList
        .find(MultiColumnListCell({ row, column: 'Publisher' }))
        .has({ content: publisher }),
    );
  }
  if (role) {
    cy.expect(
      publisherList
        .find(MultiColumnListCell({ row, column: 'Publisher role' }))
        .has({ content: role }),
    );
  }
  if (place) {
    cy.expect(
      publisherList
        .find(MultiColumnListCell({ row, column: 'Place of publication' }))
        .has({ content: place }),
    );
  }
  if (date) {
    cy.expect(
      publisherList
        .find(MultiColumnListCell({ row, column: 'Publication date' }))
        .has({ content: date }),
    );
  }
};

const verifyAlternativeTitle = (indexRow, indexColumn, value) => {
  cy.expect(
    titleDataAccordion
      .find(MultiColumnList({ id: 'list-alternative-titles' }))
      .find(MultiColumnListRow({ index: indexRow }))
      .find(MultiColumnListCell({ columnIndex: indexColumn }))
      .has({ content: value }),
  );
};

const verifySeriesStatement = (indexRow, value) => {
  cy.expect(
    titleDataAccordion
      .find(MultiColumnList({ id: 'list-series-statement' }))
      .find(MultiColumnListRow({ index: indexRow }))
      .find(MultiColumnListCell())
      .has({ content: value }),
  );
};

const verifySubjectHeading = (value) => {
  cy.expect(
    Accordion('Subject')
      .find(MultiColumnList({ id: 'list-subject' }))
      .find(MultiColumnListCell({ content: value }))
      .exists(),
  );
};

const verifyContributor = (indexRow, indexColumn, value) => {
  cy.expect(
    contributorAccordion
      .find(contributorsList)
      .find(MultiColumnListRow({ index: indexRow }))
      .find(MultiColumnListCell({ columnIndex: indexColumn }))
      .has({ content: value }),
  );
};

const verifyContributorWithMarcAppLink = (indexRow, indexColumn, value) => {
  cy.expect(
    contributorAccordion
      .find(contributorsList)
      .find(MultiColumnListRow({ index: indexRow }))
      .find(MultiColumnListCell({ columnIndex: indexColumn }))
      .has({ content: including(value) }),
  );
};

const verifyInstanceSubject = (indexRow, indexColumn, value) => {
  cy.expect(
    Accordion('Subject')
      .find(MultiColumnList({ id: 'list-subject' }))
      .find(MultiColumnListRow({ index: indexRow }))
      .find(MultiColumnListCell({ columnIndex: indexColumn }))
      .has({ content: value }),
  );
};

const verifyResourceIdentifier = (type, value, rowIndex) => {
  const identifierRow = identifiersAccordion.find(
    identifiers.find(MultiColumnListRow({ index: rowIndex })),
  );

  cy.expect(identifierRow.find(MultiColumnListCell({ columnIndex: 0 })).has({ content: type }));
  cy.expect(identifierRow.find(MultiColumnListCell({ columnIndex: 1 })).has({ content: value }));
};

const checkInstanceNotes = (noteType, noteContent) => {
  cy.expect(Button({ id: 'accordion-toggle-button-instance-details-notes' }).exists());
  cy.expect(notesSection.find(MultiColumnListHeader(noteType)).exists());
  cy.expect(notesSection.find(MultiColumnListCell(noteContent)).exists());
};

const waitInstanceRecordViewOpened = (title) => {
  cy.wait(1500);
  cy.expect(instanceDetailsSection.exists());
  cy.expect(Pane({ titleLabel: including(title) }).exists());
};

export default {
  validOCLC,
  pressAddHoldingsButton,
  waitLoading,
  openHoldings,
  verifyInstanceTitle,
  verifyLastUpdatedDate,
  verifyLastUpdatedUser,
  verifyInstancePublisher,
  verifyInstanceSubject,
  verifyResourceIdentifier,
  checkInstanceNotes,
  waitInstanceRecordViewOpened,
  openItemByBarcode,
  verifyAlternativeTitle,
  verifySeriesStatement,
  verifySubjectHeading,
  verifyContributor,
  verifyContributorWithMarcAppLink,

  waitInventoryLoading() {
    cy.expect(instanceDetailsSection.exists());
  },

  openSubjectAccordion: () => cy.do(Accordion('Subject').click()),

  checkExpectedOCLCPresence: (OCLCNumber = validOCLC.id) => {
    cy.expect(identifiers.find(HTML(including(OCLCNumber))).exists());
  },

  checkExpectedMARCSource: () => {
    cy.expect(instanceDetailsSection.find(HTML(including('MARC'))).exists());
    cy.expect(instanceDetailsSection.find(HTML(including('FOLIO'))).absent());
  },

  verifyUnlinkIcon(tag) {
    // Waiter needed for the link to be loaded properly.
    cy.expect(QuickMarcEditorRow({ tagValue: tag }).find(unlinkIconButton).exists());
  },

  verifyLinkIcon(tag) {
    // Waiter needed for the link to be loaded properly.
    cy.expect(QuickMarcEditorRow({ tagValue: tag }).find(linkIconButton).exists());
  },

  goToEditMARCBiblRecord: () => {
    cy.do(actionsButton.click());
    cy.do(editMARCBibRecordButton.click());
  },

  selectTopRecord() {
    cy.do(
      MultiColumnListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .find(Button())
        .click(),
    );
  },

  deriveNewMarcBibRecord: () => {
    cy.do(actionsButton.click());
    cy.wait(2000);
    cy.do(deriveNewMarcBibRecord.click());
    cy.expect([QuickMarcEditor().exists(), QuickMarcEditorRow({ tagValue: '999' }).exists()]);
  },

  viewSource: () => {
    cy.do(actionsButton.click());
    cy.wait(2000);
    cy.do(viewSourceButton.click());
    InventoryViewSource.waitLoading();
  },

  newMarcBibRecord() {
    cy.do([paneResultsSection.find(actionsBtn).click(), newMarcBibButton.click()]);
    cy.expect([quickMarcEditorPane.exists(), quickMarcPaneHeader.has({ text: including('new') })]);
  },

  verifyNewQuickMarcEditorPaneExists() {
    cy.expect([quickMarcEditorPane.exists(), quickMarcPaneHeader.has({ text: including('new') })]);
  },

  checkAbsenceOfNewMarcBibRecordOption() {
    cy.do(paneResultsSection.find(actionsBtn).click());
    cy.expect(newMarcBibButton.absent());
  },

  checkInstanceTitle(title) {
    cy.expect(detailsPaneContent.has({ text: including(title) }));
  },

  checkHoldingTitle({ title, count, absent = false }) {
    if (!absent) {
      const holdingTitleRegExp = `Holdings: ${title} ${
        count !== undefined ? '>\\nView holdings\\n' + count : ''
      }`;
      cy.expect(detailsPaneContent.has({ text: matching(new RegExp(holdingTitleRegExp)) }));
    } else {
      cy.expect(detailsPaneContent.find(HTML({ text: including(`Holdings: ${title}`) })).absent());
    }
  },

  startOverlaySourceBibRecord: () => {
    cy.do(actionsButton.click());
    cy.do(overlaySourceBibRecord.click());
  },

  editInstance: () => {
    cy.do(actionsButton.click());
    cy.do(editInstanceButton.click());
    InstanceRecordEdit.waitLoading();
  },

  editMarcBibliographicRecord: () => {
    cy.do(actionsButton.click());
    cy.do(editMARCBibRecordButton.click());
    cy.expect(QuickMarcEditorRow({ tagValue: '999' }).exists());
  },

  importInstance() {
    cy.do(paneResultsSection.find(actionsBtn).click());
    cy.do(actionsMenuSection.find(importRecord).click());
    cy.expect(importRecordModal.exists());
    cy.do(
      TextField({ label: including('Enter the OCLC WorldCat identifier') }).fillIn(validOCLC.id),
    );
    cy.do(importRecordModal.find(importButton).click());
    cy.expect(instanceDetailsSection.exists());
  },

  searchByTitle(title, result = true) {
    cy.do([filterPane.find(inputSearchField).fillIn(title), filterPane.find(searchButton).click()]);
    if (result) {
      cy.expect(MultiColumnListRow({ index: 0 }).exists());
    }
  },

  clickViewAuthorityIconDisplayedInTagField(tag) {
    cy.wrap(QuickMarcEditorRow({ tagValue: tag }).find(Link()).href()).as('link');
    cy.get('@link').then((link) => {
      cy.visit(link);
    });
  },

  verifyAndClickUnlinkIcon(tag) {
    // Waiter needed for the link to be loaded properly.
    cy.wait(1000);
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(unlinkIconButton).click());
  },

  clickViewAuthorityIconDisplayedInInstanceDetailsPane(accordion) {
    cy.wrap(Accordion(accordion).find(Link()).href()).as('link');
    cy.get('@link').then((link) => {
      cy.visit(link);
    });
  },

  clickViewAuthorityIconDisplayedInMarcViewPane() {
    cy.wrap(marcViewPaneContent.find(Link()).href()).as('link');
    cy.get('@link').then((link) => {
      cy.visit(link);
    });
  },

  marcAuthViewIconClickUsingId(id) {
    cy.do(Link({ href: including(`/${id}`) }).click());
  },

  goToPreviousPage() {
    cy.go('back');
  },

  verifyRecordAndMarcAuthIcon(accordion, expectedText) {
    cy.expect(
      Accordion(accordion)
        .find(HTML(including(expectedText)))
        .exists(),
    );
  },

  checkExistanceOfAuthorityIconInInstanceDetailPane(accordion) {
    cy.expect(Accordion(accordion).find(Link()).exists());
  },

  checkAbsenceOfAuthorityIconInInstanceDetailPane(accordion) {
    cy.expect(Accordion(accordion).find(Link()).absent());
  },

  checkAbsenceOfAuthorityIconInMarcViewPane() {
    cy.expect(marcViewPaneContent.find(Link()).absent());
  },

  checkExistanceOfAuthorityIconInMarcViewPane() {
    cy.expect(marcViewPaneContent.find(Link()).exists());
  },

  verifyAndClickLinkIcon(tag) {
    // Waiter needed for the link to be loaded properly.
    cy.wait(1000);
    cy.expect(QuickMarcEditorRow({ tagValue: tag }).find(linkIconButton).exists());
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(linkIconButton).click());
  },

  verifySelectMarcAuthorityModal() {
    cy.expect([
      findAuthorityModal.exists(),
      findAuthorityModal.has({ title: 'Select MARC authority' }),
      closeModalFindAuthority.exists(),
    ]);
  },

  verifySearchAndFilterDisplay() {
    cy.get('#textarea-authorities-search-qindex').then((elem) => {
      expect(elem.text()).to.include('Personal name');
    });
    cy.expect([
      searchOptionBtn.exists(),
      browseOptionBtn.exists(),
      searchTextArea.exists(),
      searchButtonDisabled.exists(),
      disabledResetAllBtn.exists(),
      sourceFileAccordion.find(MultiSelect({ label: including('Authority source') })).exists(),
      sourceFileAccordion.find(MultiSelect({ selectedCount: 0 })).exists(),
      subjectHeadingAccordion.find(Button('Thesaurus')).has({ ariaExpanded: 'false' }),
      headingTypeAccordion.find(Button('Type of heading')).has({ ariaExpanded: 'false' }),
      createdDateAccordion.find(Button('Date created')).has({ ariaExpanded: 'false' }),
      updatedDateAccordion.find(Button('Date updated')).has({ ariaExpanded: 'false' }),
    ]);
  },

  closeAuthoritySource() {
    cy.do(sourceFileAccordion.find(closeSourceFile).click());
    cy.expect(
      sourceFileAccordion
        .find(MultiSelect({ selected: including('LC Name Authority file (LCNAF)') }))
        .absent(),
    );
  },

  verifySearchOptions() {
    cy.do(selectField.click());
    cy.expect([
      selectField.has({ content: including('Keyword') }),
      selectField.has({ content: including('Identifier (all)') }),
      selectField.has({ content: including('LCCN') }),
      selectField.has({ content: including('Personal name') }),
      selectField.has({ content: including('Corporate/Conference name') }),
      selectField.has({ content: including('Geographic name') }),
      selectField.has({ content: including('Name-title') }),
      selectField.has({ content: including('Uniform title') }),
      selectField.has({ content: including('Subject') }),
      selectField.has({ content: including("Children's subject heading") }),
      selectField.has({ content: including('Genre') }),
      selectField.has({ content: including('Advanced search') }),
    ]);
  },

  searchResults(value) {
    cy.do(selectField.choose(including('Keyword')));
    cy.do(searchInput.fillIn(value));
    cy.expect(searchInput.has({ value }));
    cy.expect(enabledSearchBtn.exists());
    cy.do(searchButton.click());
    cy.expect(authoritySearchResults.exists());
  },

  searchResultsWithOption(option, value) {
    cy.do([selectField.choose(including(option)), searchInput.fillIn(value)]);
    cy.expect([searchInput.has({ value }), enabledSearchBtn.exists()]);
    cy.do(searchButton.click());
    cy.expect(authoritySearchResults.exists());
  },

  fillInAndSearchResults(value) {
    cy.do(searchInput.fillIn(value));
    cy.expect(searchInput.has({ value }));
    cy.expect(enabledSearchBtn.exists());
    cy.do(searchButton.click());
    cy.expect(authoritySearchResults.exists());
  },

  checkResultsListPaneHeader() {
    cy.expect(PaneHeader('MARC authority').exists());
    cy.intercept('GET', '/search/authorities?*').as('getItems');
    cy.wait('@getItems', { timeout: 10000 }).then((item) => {
      const numberOfRecords = item.response.body.totalRecords;
      const paneHeaderSubtitle =
        numberOfRecords === 1
          ? `${numberOfRecords} result found`
          : `${numberOfRecords} results found`;
      cy.expect(Pane({ subtitle: paneHeaderSubtitle }).exists());
      // eslint-disable-next-line no-unused-expressions
      expect(item.response.body.totalRecords < 100).to.be.true;
    });
  },

  checkSearchResultsTable() {
    cy.expect([
      mclLinkHeader.has({ content: 'Link' }),
      mclAuthRefTypeHeader.has({ content: 'Authorized/Reference' }),
      mclHeadingRef.has({ content: 'Heading/Reference' }),
      mclHeadingType.has({ content: 'Type of heading' }),
      mclHeadingSourceFile.has({ content: 'Authority source' }),
      MultiColumnListRow({ index: 0 })
        .find(Button({ ariaLabel: 'Link' }))
        .exists(),
      MultiColumnListCell({ row: 0, innerHTML: including('<b>Authorized</b>') }).exists(),
    ]);
    cy.expect([
      buttonPrevPageDisabled.exists(),
      or(buttonNextPageDisabled.exists(), buttonNextPageEnabled.exists()),
    ]);
  },

  selectRecord() {
    cy.do(
      MultiColumnListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .find(Button())
        .click(),
    );
  },

  checkRecordDetailPage(markedValue) {
    cy.expect([
      marcViewPane.exists(),
      marcViewPane.find(buttonLink).exists(),
      marcViewPane.has({ mark: markedValue }),
      marcViewPane.find(HTML({ text: including('$') })).exists(),
      marcViewPane.find(HTML({ text: including('‡') })).absent(),
    ]);
  },

  clickLinkButton() {
    cy.expect(marcViewPane.find(buttonLink).exists());
    cy.do(marcViewPane.find(buttonLink).click());
  },

  closeDetailsView() {
    cy.do(marcViewPane.find(closeDetailsView).click());
    cy.expect(authoritySearchResults.exists());
  },

  closeFindAuthorityModal() {
    cy.do(closeModalFindAuthority.click());
    cy.expect([findAuthorityModal.absent(), quickMarcEditorPane.exists()]);
  },

  checkElectronicAccess: () => {
    cy.expect(
      Accordion('Electronic access')
        .find(MultiColumnList({ id: 'list-electronic-access' }))
        .find(MultiColumnListCell({ row: 0, columnIndex: 0, content: 'No value set-' }))
        .exists(),
    );
  },

  deriveNewMarcBib: () => {
    cy.do(actionsButton.click());
    cy.do(deriveNewMarcBibRecord.click());
    cy.expect(QuickMarcEditor().exists());
    cy.reload();
  },

  getAssignedHRID: () => cy.then(() => KeyValue(instanceHRID).value()),
  checkUpdatedHRID: (oldHRID) => cy.expect(KeyValue(instanceHRID, { value: oldHRID }).absent()),
  checkPresentedText: (expectedText) => cy.expect(instanceDetailsSection.find(HTML(including(expectedText))).exists()),

  goToMarcHoldingRecordAdding: () => {
    cy.do(actionsButton.click());
    cy.do(addMarcHoldingRecordButton.click());
  },

  addItem() {
    cy.expect(addItemButton.exists());
    cy.do(addItemButton.click());
    cy.expect(Section({ id: 'acc01' }).exists());
  },

  clickAddItemByHoldingName({ holdingName, instanceTitle = '' } = {}) {
    const holdingSection = instanceDetailsSection.find(Accordion(including(holdingName)));
    cy.do(holdingSection.find(addItemButton).click());

    ItemRecordEdit.waitLoading(instanceTitle);

    return ItemRecordEdit;
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
    cy.expect(instanceDetailsSection.exists());
    cy.do(Button(including('Holdings:')).click());
    cy.expect(
      instanceDetailsSection.find(MultiColumnListCell({ row: 0, content: copyNumber })).exists(),
    );
  },

  openHoldingView: () => {
    cy.do(viewHoldingsButton.click());

    HoldingsRecordView.waitLoading();

    return HoldingsRecordView;
  },
  createHoldingsRecord: (permanentLocation) => {
    pressAddHoldingsButton();
    InventoryNewHoldings.fillRequiredFields(permanentLocation);
    InventoryNewHoldings.saveAndClose();
    waitLoading();
  },

  checkHoldingsTable: (
    locationName,
    rowNumber,
    caption,
    barcode,
    status,
    effectiveLocation = null,
  ) => {
    const accordionHeader = `Holdings: ${locationName} >`;
    const indexRowNumber = `row-${rowNumber}`;
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

  moveItemToAnotherHolding({ fromHolding, toHolding, shouldOpen = true, itemMoved = false }) {
    if (shouldOpen) {
      openHoldings(fromHolding, toHolding);
    }

    cy.do([
      Accordion({ label: including(`Holdings: ${fromHolding}`) })
        .find(MultiColumnListRow({ indexRow: 'row-0' }))
        .find(Checkbox())
        .click(),
      Accordion({ label: including(`Holdings: ${fromHolding}`) })
        .find(Dropdown({ label: 'Move to' }))
        .choose(including(toHolding)),
    ]);

    if (itemMoved) {
      InteractorsTools.checkCalloutMessage(messages.itemMovedSuccessfully);
    }
  },

  confirmOrCancel(action) {
    cy.do(Modal('Confirm move').find(Button(action)).click());
  },

  returnItemToFirstHolding(firstHoldingName, secondHoldingName) {
    this.openHoldings(firstHoldingName, secondHoldingName);

    cy.do([
      Accordion({ label: including(`Holdings: ${secondHoldingName}`) })
        .find(MultiColumnListRow({ indexRow: 'row-0' }))
        .find(Checkbox())
        .click(),
      Accordion({ label: including(`Holdings: ${secondHoldingName}`) })
        .find(Dropdown({ label: 'Move to' }))
        .choose(including(firstHoldingName)),
    ]);
  },

  openMoveItemsWithinAnInstance: () => {
    return cy.do([actionsButton.click(), moveItemsButton.click()]);
  },

  moveHoldingsToAnotherInstance: (newInstanceHrId) => {
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
    // cypress clicks too fast
    cy.wait(2000);
    InventoryInstancesMovement.moveFromMultiple(holdingName, title);
  },

  checkAddItem: (holdingsRecordId) => {
    cy.expect(
      instanceDetailsSection
        .find(Section({ id: holdingsRecordId }))
        .find(Button({ id: `clickable-new-item-${holdingsRecordId}` }))
        .exists(),
    );
  },

  checkInstanceIdentifier: (identifier) => {
    cy.expect(
      identifiersAccordion
        .find(identifiers.find(MultiColumnListRow({ index: 0 })))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: identifier }),
    );
  },

  checkPrecedingTitle: (rowNumber, title, isbn, issn) => {
    cy.expect(
      MultiColumnList({ id: 'precedingTitles' })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: title }))
        .exists(),
    );
    cy.expect(
      MultiColumnList({ id: 'precedingTitles' })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: isbn }))
        .exists(),
    );
    cy.expect(
      MultiColumnList({ id: 'precedingTitles' })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: issn }))
        .exists(),
    );
  },

  edit() {
    cy.do([Button('Actions').click(), Button('Edit').click()]);
  },

  closeInstancePage() {
    cy.do(Button({ ariaLabel: 'Close ' }).click());
    cy.expect(instanceDetailsSection.exists());
  },

  addTag: (tagName) => {
    cy.do(tagButton.click());
    // TODO: clarify with developers what should be waited
    cy.wait(1500);
    cy.do(tagsPane.find(textFieldTagInput).choose(tagName));
  },

  checkAddedTag: (tagName, instanceTitle) => {
    cy.do(MultiColumnListCell(instanceTitle).click());
    cy.do(tagButton.click());
    cy.expect(MultiSelect().exists(tagName));
  },

  deleteTag: (tagName) => {
    cy.do(MultiSelect().find(closeTag).click());
    cy.expect(
      MultiSelect()
        .find(HTML(including(tagName)))
        .absent(),
    );
    cy.expect(tagButton.find(HTML(including('0'))).exists());
  },

  checkIsInstancePresented: (title, location, status = 'On order') => {
    cy.expect(Pane({ titleLabel: including(title) }).exists());
    cy.expect(instanceDetailsSection.find(HTML(including(location))).exists());
    openHoldings([location]);
    cy.expect(instanceDetailsSection.find(MultiColumnListCell(status)).exists());
  },

  createInstanceViaApi({
    instanceTitle = `Instance ${getRandomPostfix()}`,
    instanceId = uuid(),
    instanceTypeId,
    contributors,
  } = {}) {
    const instanceData = {
      instanceTitle,
      instanceId,
      instanceTypeId,
      contributors,
    };

    return cy
      .getInstanceTypes({ limit: 1 })
      .then((instanceTypes) => {
        instanceData.instanceTypeId = instanceTypes[0].id;
      })
      .then(() => {
        cy.createInstance({
          instance: {
            instanceId: instanceData.instanceId,
            instanceTypeId: instanceData.instanceTypeId,
            title: instanceData.instanceTitle,
          },
        });
      })
      .then(() => ({ instanceData }));
  },
  deleteInstanceViaApi: (id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `instance-storage/instances/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyResourceIdentifierAbsent: (value) => cy.expect(identifiersAccordion.find(MultiColumnListCell(including(value))).absent()),
  verifyInstanceLanguage: (language) => cy.expect(descriptiveDataAccordion.find(KeyValue('Language')).has({ value: language })),
  verifyInstancePhysicalcyDescription: (description) => {
    cy.expect(
      descriptiveDataAccordion.find(KeyValue('Physical description')).has({ value: description }),
    );
  },

  checkIsInstanceUpdated: () => {
    const instanceStatusTerm = KeyValue('Instance status term');

    cy.expect(instanceStatusTerm.has({ value: 'Batch Loaded' }));
    cy.expect(source.has({ value: 'MARC' }));
    cy.expect(
      KeyValue('Cataloged date').has({ value: DateTools.getFormattedDate({ date: new Date() }) }),
    );
  },
  checkInstanceDetails({ instanceInformation = [] } = {}) {
    instanceInformation.forEach(({ key, value }) => {
      cy.expect(instanceDetailsSection.find(KeyValue(key)).has({ value: including(value) }));
    });
  },
  getId() {
    cy.url()
      .then((url) => cy.wrap(url.split('?')[0].split('/').at(-1)))
      .as('instanceId');
    return cy.get('@instanceId');
  },

  checkIsHoldingsCreated(holdings = []) {
    holdings.forEach((holding) => {
      cy.expect(Accordion({ label: including(`Holdings: ${holding}`) }).exists());
    });
  },

  openHoldingsAccordion: (location) => {
    cy.do(Button(including(location)).click());
    cy.wait(6000);
  },

  verifyHoldingLocation(content) {
    cy.expect(MultiColumnListCell({ content }).exists());
  },

  checkHoldingsTableContent({ name, records = [], columnIndex = 0, shouldOpen = true } = {}) {
    const holdingsSection = Accordion({ label: including(`Holdings: ${name}`) });

    if (shouldOpen) {
      cy.do(holdingsSection.clickHeader());
    }

    records.forEach((record, index) => {
      if (record.barcode) {
        cy.expect(
          holdingsSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex }))
            .has({ content: including(record.barcode) }),
        );
      }

      if (record.status) {
        cy.expect(
          holdingsSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: columnIndex + 1 }))
            .has({ content: including(record.status) }),
        );
      }
    });
  },

  verifyHoldingsPermanentLocation(permanentLocation) {
    cy.expect(holdingsPane.find(KeyValue('Permanent')).has({ value: `${permanentLocation}` }));
  },

  verifyHoldingsTemporaryLocation(temporaryLocation) {
    cy.expect(holdingsPane.find(KeyValue('Temporary')).has({ value: `${temporaryLocation}` }));
  },

  closeHoldingsView() {
    cy.expect(holdingsPane.exists());
    cy.do(Button({ icon: 'times' }).click());
  },

  checkIsItemCreated: (itemBarcode) => {
    cy.expect(
      instanceDetailsSection
        .find(MultiColumnListCell({ columnIndex: 0, content: itemBarcode }))
        .find(Button(including(itemBarcode)))
        .exists(),
    );
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

  checkNewRequestAtNewPane() {
    cy.do(actionsButton.click());
    cy.expect([Button({ id: 'edit-instance' }).exists(), Button({ id: 'copy-instance' }).exists()]);
    cy.do(Button('New request').click());
  },

  newOrder() {
    cy.do(actionsButton.click());
    cy.do(Button('New order').click());
    return NewOrderModal;
  },

  singleOverlaySourceBibRecordModalIsPresented: () => cy.expect(singleRecordImportModal.exists()),

  overlayWithOclc: (oclc) => {
    cy.do(
      Select({ name: 'selectedJobProfileId' }).choose(
        'Inventory Single Record - Default Update Instance (Default)',
      ),
    );
    cy.do(singleRecordImportModal.find(TextField({ name: 'externalIdentifier' })).fillIn(oclc));
    cy.do(singleRecordImportModal.find(Button('Import')).click());
  },

  checkCalloutMessage: (text, calloutType = calloutTypes.success) => {
    cy.expect(Callout({ type: calloutType }).is({ textContent: text }));
  },

  checkIdentifier: (text) => {
    cy.expect(instanceDetailsSection.find(Button(including('Identifiers'))).exists());
    cy.expect(
      Accordion('Identifiers')
        .find(MultiColumnList({ id: 'list-identifiers' }))
        .find(MultiColumnListCell(including(text)))
        .exists(),
    );
  },

  checkContributor: (text) => {
    cy.expect(instanceDetailsSection.find(Button(including('Contributor'))).exists());
    cy.expect(
      Accordion('Contributor')
        .find(contributorsList)
        .find(MultiColumnListCell(including(text)))
        .exists(),
    );
  },

  checkDetailViewOfInstance(accordion, value) {
    cy.expect(instanceDetailsSection.find(Button(including(accordion))).exists());
    cy.expect(
      Accordion(accordion)
        .find(MultiColumnListCell(including(value)))
        .exists(),
    );
  },

  verifyLoan: (content) => cy.expect(MultiColumnListCell({ content }).exists()),

  verifyLoanInItemPage(barcode, value) {
    cy.do(MultiColumnListCell({ content: barcode }).find(Button(barcode)).click());
    cy.expect(KeyValue('Temporary loan type').has({ value }));
    cy.do(Button({ icon: 'times' }).click());
  },

  verifyItemBarcode(barcode) {
    cy.expect(MultiColumnListCell({ content: barcode }).exists());
  },

  openItemByBarcodeAndIndex: (barcode) => {
    cy.wait(4000);
    cy.get(`div[class^="mclCell-"]:contains('${barcode}')`).then((cell) => {
      const row = cell.closest('div[class^="mclRow-"]');
      row.find('button').first().click();
    });
  },

  openItemByStatus: (status) => {
    cy.get('div[class^="mclRowContainer-"]')
      .find('div[class^="mclCell-"]')
      .contains(status)
      .then((elem) => {
        elem.parent()[0].querySelector('button[type="button"]').click();
      });
  },

  verifyCellsContent: (...content) => {
    content.forEach((itemContent) => {
      cy.expect(MultiColumnListCell({ content: itemContent }).exists());
    });
  },

  checkInstanceButtonExistence() {
    cy.expect(filterPane.find(instancesButton).exists());
  },

  verifyRecordStatus(text) {
    cy.do(administrativeDataAccordion.find(Button(including('Record last updated'))).click());
    cy.expect(administrativeDataAccordion.find(HTML(including(text))).exists());
  },

  checkValueAbsenceInDetailView(accordion, value) {
    cy.expect(instanceDetailsSection.find(Button(including(accordion))).exists());
    cy.expect(
      Accordion(accordion)
        .find(MultiColumnListCell(including(value)))
        .absent(),
    );
  },

  fillItemBarcode(barcodeValue) {
    cy.do(itemBarcodeField.fillIn(barcodeValue));
  },

  verifyAndClickLinkIconByIndex(rowIndex) {
    // Waiter needed for the link to be loaded properly.
    cy.wait(1000);
    cy.expect(QuickMarcEditorRow({ index: rowIndex }).find(linkIconButton).exists());
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(linkIconButton).click());
  },

  openHoldingViewByID: (holdingsID) => {
    cy.do(viewHoldingsButtonByID(holdingsID).click());
    cy.expect(Button('Actions').exists());
  },

  checkMarcAppIconExist: (indexRow) => {
    cy.expect(
      contributorAccordion
        .find(contributorsList)
        .find(MultiColumnListRow({ index: indexRow }))
        .find(marcAuthorityAppIcon)
        .exists(),
    );
  },

  checkMarcAppIconAbsent: (indexRow) => {
    cy.expect(
      contributorAccordion
        .find(contributorsList)
        .find(MultiColumnListRow({ index: indexRow }))
        .find(marcAuthorityAppIcon)
        .absent(),
    );
  },
  verifyCheckedOutDate: (date) => {
    cy.expect(itemStatusKeyValue.has({ subValue: including(date) }));
  },

  verifyNumberOfItemsInHoldingByName(holdingName, numOfItems) {
    const holdingSection = instanceDetailsSection.find(Accordion(including(holdingName)));
    cy.expect(holdingSection.find(Badge()).has({ value: `${numOfItems}` }));
  },

  verifyItemStatus: (itemStatus) => {
    cy.expect(MultiColumnListCell({ content: itemStatus }).exists());
  },

  verifyContributorAbsent: (text) => {
    cy.expect(instanceDetailsSection.find(Button(including('Contributor'))).exists());
    cy.expect(
      Accordion('Contributor')
        .find(contributorsList)
        .find(MultiColumnListCell(including(text)))
        .absent(),
    );
  },

  verifyOrdersCount(ordersCount) {
    if (ordersCount === 0) {
      cy.expect(
        Accordion({ label: including('Acquisition') })
          .find(MultiColumnList({ id: 'list-instance-acquisitions' }))
          .absent(),
      );
    } else {
      cy.expect(
        Accordion({ label: including('Acquisition') })
          .find(MultiColumnList({ id: 'list-instance-acquisitions' }))
          .has({ rowCount: ordersCount }),
      );
    }
  },
};
