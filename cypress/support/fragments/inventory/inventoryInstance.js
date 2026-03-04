import { recurse } from 'cypress-recurse';
import uuid from 'uuid';
import {
  Accordion,
  Button,
  Callout,
  Checkbox,
  Dropdown,
  DropdownMenu,
  Form,
  HTML,
  KeyValue,
  Link,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiSelect,
  Pane,
  PaneContent,
  PaneHeader,
  QuickMarcEditor,
  QuickMarcEditorRow,
  SearchField,
  Section,
  Select,
  Spinner,
  TextArea,
  TextField,
  ValueChipRoot,
  and,
  calloutTypes,
  including,
  matching,
  or,
} from '../../../../interactors';
import Badge from '../../../../interactors/badge';
import { REQUEST_METHOD, ITEM_STATUS_NAMES, INSTANCE_STATUS_TERM_NAMES } from '../../constants';
import DateTools from '../../utils/dateTools';
import InteractorsTools from '../../utils/interactorsTools';
import getRandomPostfix from '../../utils/stringTools';
import InventoryInstanceSelectInstanceModal from './modals/inventoryInstanceSelectInstanceModal';
import InventoryInstancesMovement from './holdingsMove/inventoryInstancesMovement';
import HoldingsRecordEdit from './holdingsRecordEdit';
import HoldingsRecordView from './holdingsRecordView';
import InstanceRecordEdit from './instanceRecordEdit';
import InventoryNewHoldings from './inventoryNewHoldings';
import InventoryViewSource from './inventoryViewSource';
import ItemRecordEdit from './item/itemRecordEdit';
import ItemRecordView from './item/itemRecordView';
import NewOrderModal from './modals/newOrderModal';

const instanceDetailsSection = Section({ id: 'pane-instancedetails' });
const actionsButton = instanceDetailsSection.find(Button('Actions', { disabled: or(true, false) }));
const shareInstanceModal = Modal(including('Are you sure you want to share this instance?'));
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
const textFieldTagInput = MultiSelect({ label: 'Tag text area' });
const descriptiveDataAccordion = Accordion('Descriptive data');
const publisherList = descriptiveDataAccordion.find(MultiColumnList({ id: 'list-publication' }));
const titleDataAccordion = Accordion('Title data');
const contributorAccordion = Accordion('Contributor');
const acquisitionAccordion = Accordion('Acquisition');
const subjectAccordion = Accordion('Subject');
const electronicAccessAccordion = Accordion('Electronic access');
const listInstanceAcquisitions = acquisitionAccordion.find(
  MultiColumnList({ id: 'list-instance-acquisitions' }),
);
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
const detailsViewPaneheader = PaneHeader({ id: 'paneHeaderpane-instancedetails' });
const consortiaHoldingsAccordion = Accordion({ id: including('consortialHoldings') });
const editInLdeButton = Button({ id: 'edit-resource-in-ld' });
const classificationAccordion = Accordion('Classification');
const importTypeSelect = Select({ name: 'externalIdentifierType' });
const versionHistoryButton = Button({ icon: 'clock' });

const messages = {
  itemMovedSuccessfully: '1 item has been successfully moved.',
  cannotViewAuthoritiesMessage: 'User does not have permission to search authority records.',
};

const validOCLC = {
  id: '176116217',
  // TODO: hardcoded count related with interactors getters issue. Redesign to cy.then(QuickMarkEditor().rowsCount()).then(rowsCount => {...}
  lastRowNumber: 30,
  // it should be presented in marc bib one time to correct work(applicable in update of record)
  existingTag: '100',
  ldrValue: '01799cam\\a22004094a\\4500',
  tag008BytesProperties: {
    srce: { interactor: TextField('Srce'), defaultValue: '\\' },
    lang: { interactor: TextField('Lang'), defaultValue: 'rus' },
    form: { interactor: TextField('Form'), defaultValue: '\\' },
    ctry: { interactor: TextField('Ctry'), defaultValue: 'ru\\' },
    desc: { interactor: TextField('MRec'), defaultValue: 'o' },
    dtSt: { interactor: TextField('DtSt'), defaultValue: 's' },
    startDate: { interactor: TextField('Date 1'), defaultValue: '2007' },
    endDate: { interactor: TextField('Date 2'), defaultValue: '\\\\\\\\' },
  },
};

const sharedTextInDetailView = 'Shared instance • ';
const localTextInDetailView = 'Local instance • ';

const pressAddHoldingsButton = () => {
  cy.do(addHoldingButton.click());
  HoldingsRecordEdit.waitLoading();

  return HoldingsRecordEdit;
};

const waitLoading = () => {
  cy.wait(1000);
  cy.get('#pane-instancedetails').within(() => {
    cy.contains('button', 'Action').should('exist');
  });
};

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
  cy.wait(1500);
  cy.do(
    instanceDetailsSection
      .find(MultiColumnListCell({ columnIndex: 1, content: itemBarcode }))
      .find(Button(including(itemBarcode)))
      .click(),
  );
  cy.wait(500);
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
    subjectAccordion
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
    subjectAccordion
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

const waitInstanceRecordViewOpened = () => {
  cy.expect(instanceDetailsSection.exists());
  cy.expect(Pane().exists());
  cy.expect(Spinner().absent());
};

const checkElectronicAccessValues = (relationshipValue, uriValue, linkText) => {
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
};

const validLOC = '01012052';

export default {
  validOCLC,
  validLOC,
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
  checkElectronicAccessValues,

  waitInventoryLoading() {
    cy.expect(instanceDetailsSection.exists());
    // Wait for the title to gain focus. There is a slight delay before focus is achieved,
    // and if you open any dropdown before then, it will immediately close, and the test will fail.
    cy.wait(1000);
  },

  openSubjectAccordion: () => cy.do(subjectAccordion.clickHeader()),
  openInstanceNotesAccordion: () => cy.do(Button({ id: 'accordion-toggle-button-instance-details-notes' }).click()),
  checkAuthorityAppIconInSection: (sectionId, value, isPresent) => {
    if (isPresent) {
      cy.expect(
        MultiColumnList(sectionId)
          .find(MultiColumnListCell({ content: `Linked to MARC authority${value}` }))
          .find(marcAuthorityAppIcon)
          .exists(),
      );
    } else {
      cy.expect(
        MultiColumnList(sectionId)
          .find(MultiColumnListCell({ content: value }))
          .find(marcAuthorityAppIcon)
          .absent(),
      );
    }
  },

  checkAuthorityAppIconLink: (sectionId, title, authorityId) => {
    cy.expect(
      MultiColumnList(sectionId)
        .find(MultiColumnListCell({ content: `Linked to MARC authority${title}` }))
        .find(Button())
        .has({
          href: `/marc-authorities/authorities/${authorityId}?authRefType=Authorized&segment=search`,
          target: '_blank',
        }),
    );
  },

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
    cy.expect(actionsButton.has({ ariaExpanded: 'true' }));
    cy.wait(500);
    cy.do(editMARCBibRecordButton.click());
    cy.wait(500);
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
    cy.wait(2000);
    cy.do(actionsButton.click());
    cy.do(viewSourceButton.click());
    cy.wait(1000);
    InventoryViewSource.waitLoading();
  },

  newMarcBibRecord() {
    cy.do([paneResultsSection.find(actionsBtn).click(), newMarcBibButton.click()]);
    this.verifyNewQuickMarcEditorPaneExists();
  },

  verifyNewQuickMarcEditorPaneExists() {
    cy.expect([quickMarcEditorPane.exists(), quickMarcPaneHeader.has({ text: matching(/new/i) })]);
  },

  checkInstanceTitle(title) {
    cy.expect(detailsPaneContent.has({ text: including(title) }));
  },

  checkHoldingTitle({ title, count, absent = false }) {
    if (!absent) {
      const holdingTitleRegExp = `Holdings: ${title} ${
        count !== undefined ? '>\\nView holdings(?:\\nAdd item)*\\n' + count : ''
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
    cy.wait(1000);
    cy.do(actionsButton.click());
    cy.wait(1000);
    cy.do(editInstanceButton.click());
    cy.expect(Pane({ id: 'instance-form' }).exists());

    return InstanceRecordEdit;
  },

  editMarcBibliographicRecord: () => {
    cy.wait(2000);
    cy.do(actionsButton.click());
    cy.wait(1000);
    cy.do(editMARCBibRecordButton.click());
    cy.wait(1000);
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

  clickViewAuthorityIconDisplayedInTagField(tag) {
    cy.do(
      QuickMarcEditorRow({ tagValue: tag })
        .find(Link())
        .perform((element) => {
          if (element.hasAttribute('target') && element.getAttribute('target') === '_blank') {
            element.removeAttribute('target');
          }
          element.click();
        }),
    );
  },

  verifyAndClickUnlinkIcon(tag) {
    // Waiter needed for the link to be loaded properly.
    cy.wait(1000);
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(unlinkIconButton).click());
  },

  clickViewAuthorityIconDisplayedInInstanceDetailsPane(accordion) {
    cy.do(
      Accordion(accordion)
        .find(Link())
        .perform((element) => {
          if (element.hasAttribute('target') && element.getAttribute('target') === '_blank') {
            element.removeAttribute('target');
          }
          element.click();
        }),
    );
  },

  clickViewAuthorityIconDisplayedInMarcViewPane() {
    cy.wrap(
      marcViewPaneContent.find(Link()).perform((element) => {
        if (element.hasAttribute('target') && element.getAttribute('target') === '_blank') {
          element.removeAttribute('target');
        }
        element.click();
      }),
    );
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

  verifyRecordAndMarcAuthIconAbsence(accordion, expectedText) {
    cy.expect(
      Accordion(accordion)
        .find(HTML(including(expectedText)))
        .absent(),
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

  verifyNoResultFoundMessage(absenceMessage) {
    cy.expect(paneResultsSection.find(HTML(including(absenceMessage))).exists());
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

  checkElectronicAccess: (value = 'No value set-') => {
    cy.expect(
      Accordion('Electronic access')
        .find(MultiColumnList({ id: 'list-electronic-access' }))
        .find(MultiColumnListCell({ row: 0, columnIndex: 0, content: value }))
        .exists(),
    );
  },

  deriveNewMarcBib: () => {
    cy.do(actionsButton.click());
    cy.do(deriveNewMarcBibRecord.click());
    cy.expect(QuickMarcEditor().exists());
  },

  getAssignedHRID: () => cy.then(() => KeyValue(instanceHRID).value()),
  checkUpdatedHRID: (oldHRID) => cy.expect(KeyValue(instanceHRID, { value: oldHRID }).absent()),
  checkPresentedText: (expectedText, isPresent = true) => {
    if (isPresent) cy.expect(instanceDetailsSection.find(HTML(including(expectedText))).exists());
    else cy.expect(instanceDetailsSection.find(HTML(including(expectedText))).absent());
  },

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

  clickAddItemByHoldingId({ holdingId, instanceTitle = '' } = {}) {
    cy.do(Button({ id: `clickable-new-item-${holdingId}` }).click());
    ItemRecordEdit.waitLoading(instanceTitle);
  },

  fillItemRequiredFields(permanentLoanType = 'Can circulate', materialType = 'book') {
    cy.do(Select({ id: 'additem_materialType' }).choose(materialType));
    cy.do(Select({ id: 'additem_loanTypePerm' }).choose(permanentLoanType));
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
    cy.wait(500);
    cy.do(viewHoldingsButton.click());
    HoldingsRecordView.waitLoading();
    cy.wait(2000);

    return HoldingsRecordView;
  },

  viewHoldings: () => {
    cy.do(viewHoldingsButton.click());
  },

  expandConsortiaHoldings() {
    cy.wait(2000);
    cy.do(consortiaHoldingsAccordion.clickHeader());
    cy.wait(2000);
    cy.expect(consortiaHoldingsAccordion.has({ open: true }));
  },

  expandMemberSubHoldings(memberTenantName) {
    cy.wait(4000);
    cy.do(Accordion(memberTenantName).focus());
    cy.do(Accordion(memberTenantName).clickHeader());
    cy.wait(2000);
    cy.expect(Accordion(memberTenantName).has({ open: true }));
  },

  expandMemberSubSubHoldings(memberId, holdingsId) {
    cy.wait(2000);
    cy.do(Accordion({ id: `consortialHoldings.${memberId}.${holdingsId}` }).clickHeader());
  },

  createHoldingsRecord: (permanentLocation) => {
    pressAddHoldingsButton();
    InventoryNewHoldings.fillRequiredFields(permanentLocation);
    InventoryNewHoldings.saveAndClose();
    waitLoading();
  },
  createHoldingsRecordForTemporaryLocation: (permanentLocation, temporaryLocation) => {
    pressAddHoldingsButton();
    InventoryNewHoldings.fillRequiredFields(permanentLocation);
    InventoryNewHoldings.fillRequiredFieldsForTemporaryLocation(temporaryLocation);
    InventoryNewHoldings.saveAndClose();
    waitLoading();
  },
  checkHoldingsTable: (
    locationName,
    rowNumber,
    loanType,
    barcode,
    status,
    effectiveLocation = null,
  ) => {
    const accordionHeader = `Holdings: ${locationName} >`;
    const indexRowNumber = `row-${rowNumber}`;
    cy.do(Accordion(accordionHeader).clickHeader());

    const row = Accordion(accordionHeader).find(
      MultiColumnListRow({ rowIndexInParent: indexRowNumber }),
    );

    cy.expect([
      row.find(MultiColumnListCell({ content: barcode })).exists(),
      row.find(MultiColumnListCell({ content: loanType })).exists(),
      row.find(MultiColumnListCell({ content: status })).exists(),
    ]);

    if (effectiveLocation) {
      cy.expect(row.find(MultiColumnListCell({ content: effectiveLocation })).exists());
    }
  },

  checkHoldingsStatus: (rowNumber, status, languageAccordionValue = 'Holdings: Main Library >') => {
    const indexRowNumber = `row-${rowNumber}`;
    cy.do(Accordion({ label: including(languageAccordionValue) }).clickHeader());
    const row = Accordion({ label: including(languageAccordionValue) }).find(
      MultiColumnListRow({ rowIndexInParent: indexRowNumber }),
    );
    cy.expect([row.find(MultiColumnListCell({ content: status })).exists()]);
  },

  moveItemToAnotherHolding({
    fromHolding,
    toHolding,
    shouldOpen = true,
    itemMoved = false,
    itemIndex = 0,
  } = {}) {
    if (shouldOpen) {
      openHoldings(fromHolding, toHolding);
    }

    cy.do(
      Accordion({ label: including(`Holdings: ${fromHolding}`) })
        .find(MultiColumnListRow({ index: itemIndex }))
        .find(Checkbox())
        .click(),
    );
    cy.wait(500);
    cy.do(
      Accordion({ label: including(`Holdings: ${fromHolding}`) })
        .find(Button('Move to'))
        .click(),
    );
    cy.wait(500);
    cy.do(
      DropdownMenu()
        .find(Button(including(toHolding)))
        .click(),
    );

    if (itemMoved) {
      InteractorsTools.checkCalloutMessage(messages.itemMovedSuccessfully);
    }

    cy.wait(1000);
  },

  moveItemBackToInstance(fromHolding, toInstance, shouldOpen = true, itemIndex = 0) {
    cy.wait(5000);
    if (shouldOpen) {
      openHoldings(fromHolding);
    }
    cy.wait(5000);
    cy.do([
      Accordion({ label: including(`Holdings: ${fromHolding}`) })
        .find(MultiColumnListRow({ index: itemIndex }))
        .find(Checkbox())
        .click(),
      Accordion({ label: including(`Holdings: ${fromHolding}`) })
        .find(Dropdown({ label: 'Move to' }))
        .choose(including(toInstance)),
    ]);
    this.confirmOrCancel('Continue');
    InteractorsTools.checkCalloutMessage(messages.itemMovedSuccessfully);
  },

  moveItemToAnotherInstance({ fromHolding, toInstance, shouldOpen = true, itemIndex = 0 } = {}) {
    cy.wait(1000);
    cy.do(actionsButton.click());
    cy.wait(1000);
    cy.do(moveHoldingsToAnotherInstanceButton.click());
    InventoryInstanceSelectInstanceModal.waitLoading();
    InventoryInstanceSelectInstanceModal.searchByTitle(toInstance);
    InventoryInstanceSelectInstanceModal.selectInstance();
    this.moveItemBackToInstance(fromHolding, toInstance, shouldOpen, itemIndex);
  },

  confirmOrCancel(action) {
    cy.do(Modal('Confirm move').find(Button(action)).click());
  },

  returnItemToFirstHolding(firstHoldingName, secondHoldingName) {
    cy.do([
      Accordion({ label: including(`Holdings: ${secondHoldingName}`) })
        .find(MultiColumnListRow({ index: 0 }))
        .find(Checkbox())
        .click(),
      Accordion({ label: including(`Holdings: ${secondHoldingName}`) })
        .find(Button('Move to'))
        .click(),
      DropdownMenu()
        .find(Button(including(firstHoldingName)))
        .click(),
    ]);
  },

  openMoveItemsWithinAnInstance() {
    this.waitInventoryLoading();
    cy.expect(actionsButton.exists());
    cy.do(actionsButton.click());
    cy.wait(1000);
    cy.expect(moveItemsButton.exists());
    cy.do(moveItemsButton.click());
  },

  moveHoldingsToAnotherInstance: (newInstanceHrId) => {
    cy.do(actionsButton.click());
    cy.do(moveHoldingsToAnotherInstanceButton.click());
    InventoryInstanceSelectInstanceModal.waitLoading();
    InventoryInstanceSelectInstanceModal.searchByHrId(newInstanceHrId);
    InventoryInstanceSelectInstanceModal.selectInstance();
    // cypress clicks too fast
    cy.wait(5000);
    InventoryInstancesMovement.move();
  },

  moveHoldingsToAnotherInstanceByItemTitle: (holdingName, title) => {
    cy.do(actionsButton.click());
    cy.do(moveHoldingsToAnotherInstanceButton.click());
    InventoryInstanceSelectInstanceModal.waitLoading();
    InventoryInstanceSelectInstanceModal.searchByTitle(title);
    InventoryInstanceSelectInstanceModal.selectInstance();
    // cypress clicks too fast
    cy.wait(5000);
    InventoryInstancesMovement.moveFromMultiple(holdingName, title);
  },

  checkAddItem: (holdingsRecordId) => {
    cy.expect(
      instanceDetailsSection
        .find(Section({ id: `holdings.${holdingsRecordId}` }))
        .find(Button({ id: `clickable-new-item-${holdingsRecordId}` }))
        .exists(),
    );
  },

  checkInstanceIdentifier: (identifier, rowIndex = 0) => {
    cy.expect(
      identifiersAccordion
        .find(identifiers.find(MultiColumnListRow({ index: rowIndex })))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: identifier }),
    );
  },

  checkPrecedingTitle: (title, isbn, issn) => {
    cy.expect(
      instanceDetailsSection.find(MultiColumnListCell({ content: including(title) })).exists(),
    );
    cy.expect(instanceDetailsSection.find(MultiColumnListCell({ content: isbn })).exists());
    cy.expect(instanceDetailsSection.find(MultiColumnListCell({ content: issn })).exists());
  },

  edit() {
    cy.expect(Button('Actions').exists());
    cy.do(Button('Actions').click());
    cy.expect(Button('Edit').exists());
    cy.do(Button('Edit').click());
  },

  closeInstancePage() {
    cy.do(Button({ ariaLabel: 'Close ' }).click());
    cy.expect(instanceDetailsSection.exists());
  },

  addTag: (tagName) => {
    cy.do(tagButton.click());
    cy.intercept('PUT', '**/inventory/instances/*').as('addTag');
    cy.do(tagsPane.find(textFieldTagInput).choose(tagName));
    cy.wait('@addTag');
    cy.wait(1000);
  },

  checkTagSelectedInDropdown(tag, isShown = true) {
    if (isShown) cy.expect(ValueChipRoot(tag).exists());
    else cy.expect(ValueChipRoot(tag).absent());
  },

  checkAddedTag(tagName, instanceTitle) {
    cy.do(MultiColumnListCell(instanceTitle).click());
    cy.wait(1500);
    cy.do(tagButton.click());
    cy.wait(1500);
    this.checkTagSelectedInDropdown(tagName);
  },

  addMultipleTags(tagNames) {
    cy.wait(1500);
    tagNames.forEach((tag) => {
      cy.expect(textFieldTagInput.find(Spinner()).absent());
      this.addTag(tag);
      this.checkTagSelectedInDropdown(tag);
      cy.expect(textFieldTagInput.find(Spinner()).absent());
    });
    cy.wait(1500);
    tagNames.forEach((tag) => {
      this.checkTagSelectedInDropdown(tag);
    });
  },

  deleteMultipleTags(tagNames) {
    cy.wait(1500);
    cy.intercept('PUT', '**/inventory/instances/*').as('removeTag');
    tagNames.forEach((tag) => {
      this.checkTagSelectedInDropdown(tag);
      cy.expect(textFieldTagInput.find(Spinner()).absent());
      cy.do(ValueChipRoot(tag).find(closeTag).click());
      cy.wait('@removeTag');
      cy.wait(1000);
      this.checkTagSelectedInDropdown(tag, false);
      cy.expect(textFieldTagInput.find(Spinner()).absent());
    });
    cy.wait(1500);
    tagNames.forEach((tag) => {
      this.checkTagSelectedInDropdown(tag, false);
    });
  },

  deleteTag: (tagName) => {
    cy.intercept('PUT', '**/inventory/instances/*').as('removeTag');
    cy.do(MultiSelect({ id: 'input-tag' }).find(closeTag).click());
    cy.wait('@removeTag');
    cy.wait(1000);
    cy.expect(
      MultiSelect({ id: 'input-tag' })
        .find(HTML(including(tagName)))
        .absent(),
    );
    cy.expect(tagButton.find(HTML(including('0'))).exists());
  },

  checkIsInstancePresented: (title, location, status = ITEM_STATUS_NAMES.ON_ORDER) => {
    cy.expect(Pane({ titleLabel: including(title) }).exists());
    cy.expect(instanceDetailsSection.find(HTML(including(location))).exists());
    openHoldings([location]);
    cy.expect(instanceDetailsSection.find(MultiColumnListCell(status)).exists());
  },

  createInstanceViaApi({
    instanceTitle = `Instance Autotest ${getRandomPostfix()}`,
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
            ...instanceData,
          },
        });
      })
      .then(() => ({ instanceData }));
  },
  deleteInstanceViaApi: (id) => {
    cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `instance-storage/instances/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  shareInstanceViaApi(instanceIdentifier, consortiaId, sourceTenantId, targetTenantId) {
    cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: `consortia/${consortiaId}/sharing/instances`,
      body: {
        id: uuid(),
        instanceIdentifier,
        sourceTenantId,
        targetTenantId,
      },
      isDefaultSearchParamsRequired: false,
    });

    recurse(
      () => this.getInstanceViaApi(instanceIdentifier, consortiaId, sourceTenantId),
      (response) => response.body.sharingInstances[0].status === 'COMPLETE',
      {
        limit: 12,
        timeout: 60000,
        delay: 5000,
      },
    );
  },

  getInstanceViaApi: (instanceIdentifier, consortiaId, sourceTenantId) => {
    const queryString = new URLSearchParams({
      instanceIdentifier,
      sourceTenantId,
    });
    return cy.okapiRequest({
      method: REQUEST_METHOD.GET,
      path: `consortia/${consortiaId}/sharing/instances?${queryString}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyResourceIdentifierAbsent: (value) => cy.expect(identifiersAccordion.find(MultiColumnListCell(including(value))).absent()),
  verifyInstanceLanguage: (language) => cy.expect(
    descriptiveDataAccordion.find(KeyValue('Language')).has({ value: including(language) }),
  ),
  verifyInstancePhysicalcyDescription: (description) => {
    cy.expect(
      descriptiveDataAccordion.find(KeyValue('Physical description')).has({ value: description }),
    );
  },

  checkIsInstanceUpdated: () => {
    const instanceStatusTerm = KeyValue('Instance status term');

    cy.expect(instanceStatusTerm.has({ value: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED }));
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
  checkAllInstanceDetails(
    instanceInformation,
    statisticalCode,
    adminNote,
    instanceTitle,
    instanceIdentifiers,
    contributor,
    publication,
    formatUI,
    instanceNote,
    subjects,
    electronicAccess,
    classifications,
  ) {
    instanceInformation.forEach(({ key, value }) => {
      cy.expect(instanceDetailsSection.find(KeyValue(key)).has({ value: including(value) }));
    });
    instanceIdentifiers.forEach((ident) => {
      this.checkIdentifier(ident.value);
    });
    this.verifyContributor(0, 0, contributor.nameType);
    verifyInstancePublisher(publication);
    checkInstanceNotes(instanceNote.type, instanceNote.value);
    subjects.forEach((subject) => {
      verifySubjectHeading(subject);
    });
    checkElectronicAccessValues(
      electronicAccess.relationship,
      electronicAccess.uri,
      electronicAccess.linkText,
    );
    cy.expect([
      Pane({ titleLabel: including(instanceTitle) }).exists(),
      MultiColumnList({ id: 'list-statistical-codes' })
        .find(MultiColumnListCell({ content: statisticalCode }))
        .exists(),
      MultiColumnList({ id: 'administrative-note-list' })
        .find(MultiColumnListCell({ content: adminNote }))
        .exists(),
    ]);
    formatUI.forEach((format) => {
      cy.expect(
        MultiColumnList({ id: 'list-formats' })
          .find(MultiColumnListCell({ content: format }))
          .exists(),
      );
    });
    classifications.forEach((classification) => {
      cy.expect([
        MultiColumnList({ id: 'list-classifications' })
          .find(MultiColumnListCell({ content: classification.type }))
          .exists(),
        MultiColumnList({ id: 'list-classifications' })
          .find(MultiColumnListCell({ content: classification.value }))
          .exists(),
      ]);
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
    cy.wait(2000);
    cy.do(Button(including(location)).click());
    cy.wait(6000);
  },

  openAccordion: (name) => {
    cy.do(Accordion(name).clickHeader());
  },

  verifyHoldingLocation(content) {
    cy.expect(MultiColumnListCell({ content: including(content) }).exists());
  },
  openHoldingItem({ name = '', barcode = 'No barcode', shouldOpen = true }) {
    const holdingsSection = Accordion({ label: including(`Holdings: ${name}`) });

    if (shouldOpen) {
      cy.do(holdingsSection.clickHeader());
    }

    cy.do(
      holdingsSection
        .find(MultiColumnListCell({ column: 'Item: barcode' }))
        .find(Button(barcode))
        .click(),
    );

    ItemRecordView.waitLoading();

    return ItemRecordView;
  },
  checkHoldingsTableContent({ name, records = [], shouldOpen = true } = {}) {
    const holdingsSection = Accordion({ label: including(`Holdings: ${name}`) });

    if (shouldOpen) {
      cy.do(holdingsSection.clickHeader());
    }

    records.forEach((record, index) => {
      if (record.barcode) {
        cy.expect(
          holdingsSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ column: 'Item: barcode' }))
            .has({ content: including(record.barcode) }),
        );
      }

      if (record.status) {
        cy.expect(
          holdingsSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ column: 'Status' }))
            .has({ content: including(record.status) }),
        );
      }

      if (record.location) {
        cy.expect(
          holdingsSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ column: 'Effective location' }))
            .has({ content: including(record.location) }),
        );
      }
    });
  },

  verifyHoldingsPermanentLocation(permanentLocation) {
    cy.expect(
      holdingsPane.find(KeyValue('Permanent')).has({ value: including(permanentLocation) }),
    );
  },

  verifyHoldingsTemporaryLocation(temporaryLocation) {
    cy.expect(
      holdingsPane.find(KeyValue('Temporary')).has({ value: including(temporaryLocation) }),
    );
  },

  closeHoldingsView() {
    cy.expect(holdingsPane.exists());
    cy.do(Button({ icon: 'times' }).click());
  },

  checkIsItemCreated: (itemBarcode) => {
    cy.expect(
      instanceDetailsSection
        .find(MultiColumnListCell({ columnIndex: 1, content: itemBarcode }))
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
      editMARCBibRecordButton.absent(),
    ]);
    cy.do(Button({ id: 'clickable-view-source' }).click());
    cy.expect(HTML('MARC bibliographic record').exists());
  },

  checkNewRequestAtNewPane() {
    cy.do(actionsButton.click());
    cy.expect([Button({ id: 'edit-instance' }).exists(), Button({ id: 'copy-instance' }).exists()]);
    cy.do(Button('New request').click());
    cy.wait(2000);
  },

  checkInstanceHeader(header) {
    cy.get('#paneHeaderpane-instancedetails-pane-title > h2').should('have.text', header);
  },

  checkEditInstanceButtonIsAbsent() {
    cy.do(actionsButton.click());
    cy.expect([Button('Edit instance').absent()]);
  },

  clickShareLocalInstanceButton() {
    cy.do(actionsButton.click());
    cy.do(Button({ id: 'share-local-instance' }).click());
  },

  verifyShareInstanceModal(message) {
    cy.expect(shareInstanceModal.exists());
    cy.expect(
      shareInstanceModal
        .find(
          HTML(
            including(
              `You have chosen to share the local instance ${message} with other member libraries in your consortium`,
            ),
          ),
        )
        .exists(),
    );
    cy.expect(shareInstanceModal.find(Button('Cancel')).exists());
    cy.expect(shareInstanceModal.find(Button('Share')).exists());
  },

  closeShareInstanceModal() {
    cy.do(shareInstanceModal.find(Button('Cancel')).click());
    cy.wait(1500);
  },

  clickShareInstance() {
    cy.do(shareInstanceModal.find(Button('Share')).click());
  },

  shareInstance() {
    cy.intercept('POST', '/consortia/*/sharing/instances').as('postSharingInstances');
    this.clickShareLocalInstanceButton();
    this.clickShareInstance();
    cy.wait('@postSharingInstances', { timeout: 60000 }).then((interception) => {
      const sharingInstanceId = interception.response.body.instanceIdentifier;
      const consortiaId = interception.request.url.split('/consortia/')[1].split('/')[0];
      return cy.recurse(
        () => cy.okapiRequest({
          path: `consortia/${consortiaId}/sharing/instances`,
          searchParams: {
            instanceIdentifier: sharingInstanceId,
          },
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
        }),
        (response) => response.body.sharingInstances[0].status === 'COMPLETE',
        {
          limit: 30,
          delay: 2000,
        },
      );
    });
  },

  verifyCalloutMessage(message) {
    cy.expect(Callout({ type: calloutTypes.success }).is({ textContent: message }));
  },

  openCreateNewOrderModal() {
    cy.do([actionsButton.click(), Button('New order').click()]);
    NewOrderModal.waitLoading();
    NewOrderModal.verifyModalView();

    return NewOrderModal;
  },

  singleOverlaySourceBibRecordModalIsPresented: () => cy.expect(singleRecordImportModal.exists()),

  overlayWithOclc: (oclc, externalTarget = 'OCLC WorldCat') => {
    cy.getSingleImportProfilesViaAPI().then((importProfiles) => {
      if (importProfiles.filter((importProfile) => importProfile.enabled === true).length > 1) {
        cy.wait(3000);
        cy.do(singleRecordImportModal.find(importTypeSelect).choose(externalTarget));
        cy.wait(1500);
      }
      cy.do(
        singleRecordImportModal
          .find(Select({ name: 'selectedJobProfileId' }))
          .choose('Inventory Single Record - Default Update Instance (Default)'),
      );
      cy.do(singleRecordImportModal.find(TextField({ name: 'externalIdentifier' })).fillIn(oclc));
      cy.do(singleRecordImportModal.find(Button('Import')).click());
    });
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

  checkContributor: (name, index = 0, contributorType) => {
    cy.expect(instanceDetailsSection.find(Button(including('Contributor'))).exists());
    if (contributorType) {
      cy.expect([
        Accordion('Contributor')
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: name }),
        Accordion('Contributor')
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: contributorType }),
      ]);
    } else {
      cy.expect(
        Accordion('Contributor')
          .find(contributorsList)
          .find(MultiColumnListCell(including(name)))
          .exists(),
      );
    }
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
    cy.expect(KeyValue('Temporary loan type').has({ value: including(value) }));
    cy.do(Button({ icon: 'times' }).click());
  },

  verifyItemBarcode(barcode, isExist = true) {
    if (isExist) {
      cy.expect(MultiColumnListCell({ content: barcode }).exists());
    } else {
      cy.expect(MultiColumnListCell({ content: barcode }).absent());
    }
  },

  openItemByBarcodeAndIndex: (barcode) => {
    cy.get('div[class^="mclCell-"]')
      .contains(barcode)
      .then((cell) => {
        const row = cell.closest('div[class^="mclRow-"]');
        cy.wrap(row).find('a').first().click();
      });
  },

  openItemByStatus: (status) => {
    cy.get('div[class^="mclRowContainer-"]')
      .find('div[class^="mclCell-"]')
      .contains(status)
      .then((elem) => {
        elem.parent()[0].querySelector('a[href]').click();
      });
    cy.wait(2000);
  },

  verifyCellsContent: (...content) => {
    content.forEach((itemContent) => {
      cy.expect(MultiColumnListCell({ content: including(itemContent) }).exists());
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
    cy.do(viewHoldingsButtonByID(`holdings.${holdingsID}`).click());
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
  checkItemStatusByBarcode: (barcode, expectedStatus) => {
    cy.get('div[class^="mclCell-"]')
      .contains(barcode)
      .then((barcodeCell) => {
        const row = barcodeCell.closest('div[class^="mclRow-"]');
        cy.wrap(row).find('div[class^="mclCell-"]').should('contain.text', expectedStatus);
      });
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

  verifySharedIcon(row = 0) {
    cy.expect(
      paneResultsSection
        .find(MultiColumnListCell({ row, innerHTML: including('sharedIcon') }))
        .exists(),
    );
  },

  verifySharedIconAbsent(row = 0) {
    cy.expect(
      paneResultsSection
        .find(MultiColumnListCell({ row, innerHTML: including('sharedIcon') }))
        .absent(),
    );
  },

  verifyLastUpdatedSource: (userFirstName, userLastName) => {
    cy.do(Accordion('Administrative data').click());
    cy.get('div[data-test-updated-by="true"]')
      .find('a')
      .should('include.text', `${userLastName}, ${userFirstName}`);
  },

  verifyRecordCreatedSource: (userFirsttName, userLastName) => {
    cy.get('div[data-test-created-by="true"]')
      .find('a')
      .should('include.text', `${userLastName}, ${userFirsttName}`);
  },

  checkSharedTextInDetailView(isShared = true) {
    const expectedText = isShared ? sharedTextInDetailView : localTextInDetailView;
    cy.expect(detailsViewPaneheader.has({ title: including(expectedText) }));
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
      cy.expect(listInstanceAcquisitions.absent());
    } else {
      cy.expect(listInstanceAcquisitions.has({ rowCount: ordersCount }));
    }
  },
  checkAcquisitionsDetails(orderLines = []) {
    orderLines.forEach((item, index) => {
      if (item.polNumber) {
        cy.expect(
          acquisitionAccordion
            .find(MultiColumnListCell({ row: index, column: 'POL number' }))
            .has({ content: including(item.polNumber) }),
        );
      }
      if (item.orderStatus) {
        cy.expect(
          acquisitionAccordion
            .find(MultiColumnListCell({ row: index, column: 'Order status' }))
            .has({ content: including(item.orderStatus) }),
        );
      }
      if (item.receiptStatus) {
        cy.expect(
          acquisitionAccordion
            .find(MultiColumnListCell({ row: index, column: 'POL receipt status' }))
            .has({ content: including(item.receiptStatus) }),
        );
      }
      if (item.unit) {
        cy.expect(
          acquisitionAccordion
            .find(MultiColumnListCell({ row: index, column: 'Acquisition unit' }))
            .has({ content: including(item.unit) }),
        );
      }
      if (item.orderType) {
        cy.expect(
          acquisitionAccordion
            .find(MultiColumnListCell({ row: index, column: 'Order type' }))
            .has({ content: including(item.orderType) }),
        );
      }
    });
  },
  checkInstanceHrId: (expectedInstanceHrId) => cy.expect(
    instanceDetailsSection
      .find(KeyValue('Instance HRID'))
      .has({ value: including(expectedInstanceHrId) }),
  ),

  verifySharedIconByTitle(title) {
    cy.expect(
      paneResultsSection
        .find(MultiColumnListCell(title, { innerHTML: including('sharedIcon') }))
        .exists(),
    );
  },

  verifySharedIconAbsentByTitle(title) {
    cy.expect(
      paneResultsSection
        .find(MultiColumnListCell(title, { innerHTML: including('sharedIcon') }))
        .absent(),
    );
  },

  createAlternativeTitleTypeViaAPI(alternativeTitleTypeName, sourceName = 'local', id = uuid()) {
    const body = {
      id,
      name: alternativeTitleTypeName,
      source: sourceName,
    };

    return cy.createAlternativeTitleTypes(body);
  },

  createClassificationTypeViaApi(classificationTypeName, sourceName = 'local', id = uuid()) {
    const body = {
      id,
      name: classificationTypeName,
      source: sourceName,
    };

    return cy.createClassifierIdentifierTypes(body);
  },

  createInstanceNoteTypeViaApi(instanceNoteTypeName, sourceName = 'local', id = uuid()) {
    const body = {
      id,
      name: instanceNoteTypeName,
      source: sourceName,
    };

    return cy.createInstanceNoteTypes(body);
  },

  createModesOfIssuanceViaApi(modesOfIssuanceName, sourceName = 'local', id = uuid()) {
    const body = {
      id,
      name: modesOfIssuanceName,
      source: sourceName,
    };

    return cy.createModesOfIssuance(body);
  },

  verifyConsortiaHoldingsAccordion(isOpen = false) {
    cy.expect([
      Section({ id: including('consortialHoldings') }).exists(),
      consortiaHoldingsAccordion.has({ open: isOpen }),
    ]);
  },

  verifyConsortiaHoldingsAccordionAbsent() {
    cy.expect(instanceDetailsSection.find(Section({ id: 'consortialHoldings' })).absent());
  },

  verifyMemberSubHoldingsAccordion(memberId, isOpen = true) {
    cy.wait(2000);
    cy.expect([
      consortiaHoldingsAccordion.has({ open: isOpen }),
      Accordion({ id: including(memberId) }).exists(),
    ]);
  },

  verifyMemberSubHoldingsAccordionAbsent(memberId) {
    cy.wait(2000);
    cy.expect(Accordion({ id: including(memberId) }).absent());
  },

  verifyMemberSubSubHoldingsAccordion(memberId, holdingsId, isOpen = true) {
    cy.wait(2000);
    cy.expect([
      Accordion({ id: memberId }).has({ open: isOpen }),
      Accordion({ id: `consortialHoldings.${memberId}.${holdingsId}` }).exists(),
    ]);
  },

  verifyStaffSuppress() {
    cy.expect(HTML(including('Warning: Instance is marked staff suppressed')).exists());
  },

  verifyNoStaffSuppress() {
    cy.expect(HTML(including('Warning: Instance is marked staff suppressed')).absent());
  },

  verifyHoldingsAbsent(holdingsLocation) {
    cy.expect(Accordion({ label: including(`Holdings: ${holdingsLocation}`) }).absent());
  },

  verifySourceInAdministrativeData(sourceValue) {
    cy.expect(
      Accordion('Administrative data')
        .find(HTML(including(sourceValue)))
        .exists(),
    );
  },

  editInstanceInLde: () => {
    cy.wait(2000);
    cy.do(actionsButton.click());
    cy.do(editInLdeButton.click());
    cy.wait(2000);
  },

  checkEditInstanceInLdeButtonNotDisplayed: () => {
    cy.wait(2000);
    cy.do(actionsButton.click());
    cy.expect(editInLdeButton.absent());
    cy.wait(1000);
  },

  verifyClassificationValueInView: (identifierType, value, isPresent = true) => {
    const targetRow = classificationAccordion.find(
      MultiColumnListRow({ content: and(including(identifierType), including(value)) }),
    );
    if (isPresent) cy.expect(targetRow.exists());
    else cy.expect(targetRow.absent());
  },

  clickVersionHistoryButton() {
    this.waitLoading();
    cy.do(versionHistoryButton.click());
    cy.expect(Spinner().exists());
    cy.expect(Spinner().absent());
  },

  checkButtonsShown({ actions, addHoldings, addItem }) {
    if (actions) cy.expect(actionsButton.exists());
    if (actions === false) cy.expect(actionsButton.absent());
    if (addHoldings) cy.expect(addHoldingButton.exists());
    if (addHoldings === false) cy.expect(addHoldingButton.absent());
    if (addItem) cy.expect(addItemButton.exists());
    if (addItem === false) cy.expect(addItemButton.absent());
  },

  verifyActionsMenuEmpty() {
    cy.do(actionsButton.click());
    cy.wait(1000);
    cy.expect(Section({ id: 'inventory-menu-section' }).absent());
  },

  checkCloseButtonInFocus() {
    cy.expect(instanceDetailsSection.find(Button({ icon: 'times' })).has({ focused: true }));
  },

  verifyPermissionMessageInSelectAuthorityModal(isShown = true) {
    const targetMessage = findAuthorityModal.find(HTML(messages.cannotViewAuthoritiesMessage));
    cy.expect(isShown ? targetMessage.exists() : targetMessage.absent());
  },

  verifyEditButtonsShown({ folioEdit = true, marcEdit = true } = {}) {
    cy.do(actionsButton.click());
    cy.wait(1000);
    if (folioEdit) cy.expect(editInstanceButton.exists());
    else cy.expect(editInstanceButton.absent());
    if (marcEdit) cy.expect(editMARCBibRecordButton.exists());
    else cy.expect(editMARCBibRecordButton.absent());
  },

  checkItemOrderValueInHoldings(holdingsLocation, itemIndex, orderValue, whileMoving = false) {
    const holdingSection = Accordion(including(holdingsLocation));
    const targetEl = whileMoving
      ? holdingSection
        .find(MultiColumnListCell({ columnIndex: 1, row: itemIndex }))
        .find(TextField({ value: `${orderValue}` }))
      : holdingSection.find(
        MultiColumnListCell({ columnIndex: 0, row: itemIndex, content: `${orderValue}` }),
      );
    cy.expect(targetEl.exists());
  },

  copyItemBarcode(itemIndex = 0, holdingsLocation, whileMoving = false) {
    const holdingSection = Accordion(including(holdingsLocation));
    cy.do(
      holdingSection
        .find(MultiColumnListCell({ columnIndex: whileMoving ? 3 : 1, row: itemIndex }))
        .find(Button({ icon: 'clipboard' }))
        .click(),
    );

    InteractorsTools.checkCalloutMessage(
      matching(/The item barcode .+ was successfully copied to the clipboard/),
    );
  },
};
