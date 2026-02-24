import { HTML, including } from '@interactors/html';
import {
  Button,
  MultiColumnList,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiSelect,
  MultiSelectOption,
  RepeatableFieldItem,
  Select,
  Selection,
  Spinner,
  TextField,
  Checkbox,
  Calendar,
  Pane,
} from '../../../../interactors';
import { pluralize } from '../../utils/stringTools';

const buildQueryModal = Pane('Build query');
const buildQueryButton = Button('Build query');
const testQueryButton = Button('Test query');
const cancelButton = Button('Cancel');
const runQueryButton = Button('Run query');
const runQueryAndSave = Button('Run query & save');
const xButton = Button({ icon: 'times' });
const plusButton = Button({ icon: 'plus-sign' });
const trashButton = Button({ icon: 'trash' });
const selectFieldButton = Button({ id: 'field-option-0' });
const showColumnsButton = Button('Show columns');

const booleanValues = ['AND'];

// Embedded table headers mapping for different table types
const embeddedTableHeadersMap = {
  electronicAccess: [
    'URL relationship',
    'URI',
    'Link text',
    'Material specified',
    'URL public note',
  ],
  notes: ['Note type', 'Note', 'Staff only'],
  publications: ['Publisher', 'Publisher role', 'Place of publication', 'Publication date'],
  statements: ['Statement', 'Statement public note', 'Statement staff note'],
  statementsForSupplements: [
    'Statement for supplement',
    'Statement for supplement public note',
    'Statement for supplement staff note',
  ],
  statementsForIndexes: [
    'Statement for indexes',
    'Statement for indexes public note',
    'Statement for indexes staff note',
  ],
  receivingHistory: ['Public display', 'Enumeration', 'Chronology'],
  contributors: ['Name', 'Name type', 'Type', 'Type, free text', 'Primary'],
  alternativeTitles: ['Alternative title', 'Alternative title type'],
  subjects: ['Subject headings', 'Subject source', 'Subject type'],
  identifiers: ['Type', 'Identifier'],
  classifications: ['Classification identifier type', 'Classification'],
};

export const embeddedFields = {
  receivingHistory: ['Public display', 'Enumeration', 'Chronology'],
  contributors: [
    'Contributor name',
    'Contributor name type',
    'Contributor type',
    'Contributor type, free text',
    'Primary',
  ],
  alternativeTitles: ['Alternative title', 'Alternative title type'],
  subjects: ['Subject headings', 'Subject source', 'Subject type'],
  identifiers: ['Identifier', 'Identifier type'],
  classifications: ['Classification', 'Classification identifier type'],
};

export const holdingsFieldValues = {
  holdingsAdminNotes: 'Holdings — Administrative notes',
  instanceUuid: 'Holdings — Instance UUID',
  holdingsHrid: 'Holdings — HRID',
  holdingsUuid: 'Holdings — UUID',
  formerIds: 'Holdings — Former identifiers',
  callNumber: 'Holdings — Call number',
  callNumberPrefix: 'Holdings — Call number prefix',
  permanentLocation: 'Holdings permanent location — Name',
  temporaryLocation: 'Holdings temporary location — Name',
  notes: 'Holdings — Notes — Note',
  notesNoteType: 'Holdings — Notes — Note type',
  notesStaffOnly: 'Holdings — Notes — Staff only',
  statementsStatement: 'Holdings — Statements — Statement',
  statementsPublicNote: 'Holdings — Statements — Statement public note',
  statementsStaffNote: 'Holdings — Statements — Statement staff note',
  statementsForSupplementsStatement:
    'Holdings — Statements for supplements — Statement for supplement',
  statementsForSupplementsPublicNote:
    'Holdings — Statements for supplements — Statement for supplement public note',
  statementsForSupplementsStaffNote:
    'Holdings — Statements for supplements — Statement for supplement staff note',
  statementsForIndexesStatement: 'Holdings — Statements for indexes — Statement for indexes',
  statementsForIndexesPublicNote:
    'Holdings — Statements for indexes — Statement for indexes public note',
  statementsForIndexesStaffNote:
    'Holdings — Statements for indexes — Statement for indexes staff note',
  suppressFromDiscovery: 'Holdings — Suppress from discovery',
  electronicAccessLinkText: 'Holdings — Electronic access — Link text',
  electronicAccessMaterialSpecified: 'Holdings — Electronic access — Material specified',
  electronicAccessURI: 'Holdings — Electronic access — URI',
  electronicAccessURLPublicNote: 'Holdings — Electronic access — URL public note',
  electronicAccessURLRelationship: 'Holdings — Electronic access — URL relationship',
  receivingHistoryChronology: 'Holdings — Receiving history — Chronology',
  receivingHistoryEnumeration: 'Holdings — Receiving history — Enumeration',
  receivingHistoryPublicDisplay: 'Holdings — Receiving history — Public display',
  holdingsStatisticalCodeNames: 'Holdings — Statistical codes',
  holdingsTags: 'Holdings — Tags',
  affiliationName: 'Holdings — Affiliation name',
};
export const instanceFieldValues = {
  administrativeNotes: 'Instance — Administrative notes',
  instanceId: 'Instance — Instance UUID',
  instanceHrid: 'Instance — Instance HRID',
  instanceResourceTitle: 'Instance — Resource title',
  instanceSource: 'Instance — Source',
  staffSuppress: 'Instance — Staff suppress',
  suppressFromDiscovery: 'Instance — Suppress from discovery',
  flagForDeletion: 'Instance — Flag for deletion',
  createdDate: 'Instance — Created date',
  updatedDate: 'Instance — Updated date',
  catalogedDate: 'Instance — Cataloged date',
  date1: 'Instance — Date 1',
  statisticalCodeNames: 'Instance — Statistical codes',
  languages: 'Instance — Languages',
  formatNames: 'Instance — Format names',
  noteType: 'Instance — Notes — Note type',
  note: 'Instance — Notes — Note',
  noteStaffOnly: 'Instance — Notes — Staff only',
  publicationsPublisher: 'Instance — Publications — Publisher',
  publicationsRole: 'Instance — Publications — Publisher role',
  publicationsPlace: 'Instance — Publications — Place of publication',
  publicationsDate: 'Instance — Publications — Publication date',
  contributorName: 'Instance — Contributors — Name',
  contributorNameType: 'Instance — Contributors — Name type',
  contributorType: 'Instance — Contributors — Type',
  contributorTypeFreeText: 'Instance — Contributors — Type, free text',
  contributorPrimary: 'Instance — Contributors — Primary',
  publicationRange: 'Instance — Publication range',
  publicationFrequency: 'Instance — Publication frequency',
  natureOfContent: 'Instance — Nature of content',
  editions: 'Instance — Editions',
  physicalDescriptions: 'Instance — Physical descriptions',
  alternativeTitlesAlternativeTitle: 'Instance — Alternative titles — Alternative title',
  alternativeTitlesAlternativeTitleType: 'Instance — Alternative titles — Alternative title type',
  subjectsSubjectHeadings: 'Instance — Subjects — Subject headings',
  subjectsSubjectSource: 'Instance — Subjects — Subject source',
  subjectsSubjectType: 'Instance — Subjects — Subject type',
  identifiersIdentifier: 'Instance — Identifiers — Identifier',
  identifiersIdentifierType: 'Instance — Identifiers — Identifier type',
  classificationsClassification: 'Instance — Classifications — Classification',
  classificationsClassificationIdentifierType:
    'Instance — Classifications — Classification identifier type',
  electronicAccessLinkText: 'Instance — Electronic access — Link text',
  electronicAccessMaterialSpecified: 'Instance — Electronic access — Material specified',
  electronicAccessURI: 'Instance — Electronic access — URI',
  electronicAccessURLPublicNote: 'Instance — Electronic access — URL public note',
  electronicAccessURLRelationship: 'Instance — Electronic access — URL relationship',
  tags: 'Instance — Tags',
  series: 'Instance — Series',
};
export const itemFieldValues = {
  instanceId: 'Instance — Instance UUID',
  instanceHrid: 'Instance — Instance HRID',
  instanceTitle: 'Instance — Resource title',
  instanceLanguages: 'Instance — Languages',
  itemAccessionNumber: 'Item — Accession number',
  itemBarcode: 'Item — Barcode',
  itemCheckOutNotesNote: 'Item — Check out notes — Note',
  itemCheckOutNotesStaffOnly: 'Item — Check out notes — Staff only',
  itemCheckInNotesNote: 'Item — Check in notes — Note',
  itemCheckInNotesStaffOnly: 'Item — Check in notes — Staff only',
  itemStatus: 'Item — Status',
  itemHrid: 'Item — Item HRID',
  itemUuid: 'Item — Item UUID',
  holdingsId: 'Holdings — UUID',
  holdingsHrid: 'Holdings — HRID',
  temporaryLocation: 'Item temporary location — Name',
  itemDiscoverySuppress: 'Item — Suppress from discovery',
  materialTypeName: 'Material type — Name',
  itemAdministrativeNotes: 'Item — Administrative notes',
  itemNotesNoteType: 'Item — Notes — Note type',
  itemNotesNote: 'Item — Notes — Note',
  itemNotesStaffOnly: 'Item — Notes — Staff only',
  electronicAccessLinkText: 'Item — Electronic access — Link text',
  electronicAccessMaterialSpecified: 'Item — Electronic access — Material specified',
  electronicAccessURI: 'Item — Electronic access — URI',
  electronicAccessURLPublicNote: 'Item — Electronic access — URL public note',
  electronicAccessURLRelationship: 'Item — Electronic access — URL relationship',
  yearCaption: 'Item — Year, caption',
  itemStatisticalCodeNames: 'Item — Statistical codes',
  itemTags: 'Item — Tags',
  itemFormerIdentifiers: 'Item — Former identifiers',
  affiliationName: 'Item — Affiliation name',
  instanceShared: 'Instance — Shared',
};
export const usersFieldValues = {
  expirationDate: 'User — Expiration date',
  externalSystemId: 'User — External system ID',
  firstName: 'User — First name',
  lastName: 'User — Last name',
  patronGroup: 'Patron group — Name',
  preferredContactType: 'User — Preferred contact type',
  userActive: 'User — Active',
  userBarcode: 'User — Barcode',
  userId: 'User — User UUID',
  userName: 'User — Username',
  userType: 'User — Type',
  userEmail: 'User — Email',
};
export const dateTimeOperators = [
  'Select operator',
  'equals',
  'not equal to',
  'greater than',
  'less than',
  'greater than or equal to',
  'less than or equal to',
  'is null/empty',
];
export const stringStoresUuidButMillionOperators = [
  'Select operator',
  'equals',
  'in',
  'not in',
  'is null/empty',
];
export const enumOperators = [
  'Select operator',
  'equals',
  'not equal to',
  'in',
  'not in',
  'is null/empty',
];
export const booleanOperators = ['Select operator', 'equals', 'not equal to', 'is null/empty'];
export const booleanOperatorsInRepeatableFields = ['Select operator', 'equals', 'is null/empty'];

export const QUERY_OPERATIONS = {
  PLACEHOLDER: 'Select operator',
  EQUAL: 'equals',
  NOT_EQUAL: 'not equal to',
  IN: 'in',
  NOT_IN: 'not in',
  IS_NULL: 'is null/empty',
  CONTAINS: 'contains',
  CONTAINS_ANY: 'contains any',
  START_WITH: 'starts with',
  GREATER_THAN: 'greater than',
  LESS_THAN: 'less than',
  GREATER_THAN_OR_EQUAL_TO: 'greater than or equal to',
  LESS_THAN_OR_EQUAL_TO: 'less than or equal to',
};

export const STRING_OPERATORS = {
  PLACEHOLDER: 'Select operator',
  EQUAL: 'equals',
  NOT_EQUAL: 'not equal to',
  CONTAINS: 'contains',
  START_WITH: 'starts with',
  IS_NULL: 'is null/empty',
};

export const STRING_STORES_UUID_OPERATORS = {
  PLACEHOLDER: 'Select operator',
  EQUAL: 'equals',
  NOT_EQUAL: 'not equal to',
  IN: 'in',
  NOT_IN: 'not in',
  IS_NULL: 'is null/empty',
};

export default {
  exists() {
    cy.expect(buildQueryModal.exists());
  },

  absent() {
    cy.expect(buildQueryModal.absent());
  },

  verify(firstline = true) {
    this.exists();
    this.testQueryDisabled();
    this.cancelDisabled(false);
    this.runQueryDisabled();
    this.xButttonDisabled(false);
    this.verifyModalContent(firstline);
  },

  verifyBuildQueryInFullScreenMode() {
    cy.get('[class^="LayerRoot"]')
      .should('have.css', 'top', '0px')
      .and('have.css', 'left', '0px')
      .and('have.css', 'width', '1920px')
      .and('have.css', 'height', '1024px');
  },

  verifyModalContent(firstline) {
    cy.get('[class^="headline"]').contains('Query');
    cy.get('[class^="queryArea"]').should('exist');
    cy.get('[class^="col-sm-4"][class*="headerCell"]').should('have.text', 'Field');
    cy.get('[class^="col-sm-1"][class*="headerCell"]').should('have.text', 'Actions');
    this.verifyEmptyField();
    cy.get('[class^="col-sm-1-"] [icon="plus-sign"]:not([disabled])');
    cy.get(`[class^="col-sm-1-"] [icon="trash"]${firstline ? '[disabled]' : ':not([disabled])'}`);
  },

  verifyEmptyField(row = 0) {
    cy.get(
      `[data-testid="row-${row}"] [class^="col-sm-4"] [class^="selectionControl"] [class^="singleValue"]`,
    ).should('have.text', 'Select field');
  },

  verifyEmptyOperator(row = 0) {
    cy.get(`[data-testid="row-${row}"] [class^="col-sm-2"]`).children().should('not.exist');
  },

  verifyEmptyValue(row = 0) {
    cy.get(`[data-testid="row-${row}"] [class^="col-sm-4"]`).eq(1).children().should('not.exist');
  },

  verifyFieldsSortedAlphabetically() {
    this.clickSelectFieldButton();
    cy.get('[class^=selectionListRoot] [role="listbox"] [role="option"]')
      .children()
      .then((optionsText) => {
        const textArray = optionsText.get().map((el) => el.innerText);
        const sortedArray = [...textArray].sort((a, b) => a - b);
        expect(sortedArray).to.eql(textArray);
      });
  },

  verifySubsetOfFieldsSortedAlphabetically(expectedAlphabeticalOptions) {
    this.clickSelectFieldButton();
    cy.get('[class^=selectionListRoot] [role="listbox"] [role="option"]')
      .children()
      .then((optionsText) => {
        const actualOptionsArray = optionsText.get().map((el) => el.innerText);

        // Find the indices of expected options in the actual array
        const foundIndices = expectedAlphabeticalOptions.map((option) => {
          const index = actualOptionsArray.indexOf(option);
          if (index === -1) {
            throw new Error(`Expected option "${option}" not found in actual options`);
          }
          return index;
        });

        // Verify that the indices are consecutive (each index should be previous index + 1)
        for (let i = 1; i < foundIndices.length; i++) {
          if (foundIndices[i] !== foundIndices[i - 1] + 1) {
            throw new Error(
              `Options "${expectedAlphabeticalOptions[i]}" are not consecutive in alphabetical order.`,
            );
          }
        }
      });
  },

  selectField(selection, row = 0) {
    cy.do(RepeatableFieldItem({ index: row }).find(Selection()).choose(selection));
    cy.wait(1000);
  },

  clickSelectFieldButton() {
    cy.do(selectFieldButton.click());
  },

  typeInAndSelectField(string, row = 0) {
    cy.wait(1000);
    cy.do([
      RepeatableFieldItem({ index: row }).find(Selection()).open(),
      RepeatableFieldItem({ index: row }).find(Selection()).filter(string),
    ]);
    cy.do(RepeatableFieldItem({ index: row }).find(Selection()).chooseWithoutVerification(string));
  },

  verifySelectedField(selection, row = 0) {
    cy.get(
      `[data-testid="row-${row}"] [class^="col-sm-4"] [class^="selectionControl"] [class^="singleValue"]`,
    ).should('have.text', selection);
  },

  verifyOperatorColumn() {
    cy.get('[class^="col-sm-2"][class*="headerCell"]').should('have.text', 'Operator');
    cy.get(
      '[class^="col-sm-2"] [class^="selectControl"] option:contains("Select operator"):disabled',
    );
  },

  selectOperator(selection, row = 0) {
    cy.wait(1000);
    cy.do(
      RepeatableFieldItem({ index: row })
        .find(Select({ dataTestID: including('operator-option') }))
        .choose(selection),
    );
    cy.wait(1000);
  },

  verifyOperatorsList(operators, row = 0) {
    cy.get(`[data-testid="row-${row}"] [class^="col-sm-2"] [class^="selectControl"] option`).then(
      (options) => {
        const textArray = options.get().map((el) => el.label);
        const expectedOperators = Object.values(operators);
        expect(textArray).to.eql(
          expectedOperators,
          `Expected operators list to match for row ${row}.\nExpected: [${expectedOperators.join(', ')}]\nActual: [${textArray.join(', ')}]`,
        );
      },
    );
  },

  verifyQueryAreaContent(content) {
    cy.get('[class^="queryArea"]').should('have.text', content);
  },

  verifyQueryTextboxReadOnly() {
    cy.get('[class^="queryArea"]').should('exist');
    cy.get('[class^="queryArea"] input').should('not.exist');
  },

  verifyQueryTextboxResizable() {
    cy.get('[class^="queryArea"]').should('have.css', 'resize', 'vertical');
  },

  verifyValueColumn() {
    cy.get('[class^="col-sm-4"][class*="headerCell"]').contains('Value');
  },

  verifyOptionsInValueSelect(expectedOptions, row = 0) {
    cy.expect([
      RepeatableFieldItem({ index: row })
        .find(Select('input-value-0'))
        .has({ optionsText: expectedOptions }),
    ]);
  },

  pickDate(date, row = 0) {
    cy.get(`[data-testid="row-${row}"] [class^="col-sm-4"] [placeholder="MM/DD/YYYY"]`).should(
      'exist',
    );
    cy.get(`[data-testid="row-${row}"] [class^="col-sm-4"] [icon="calendar"]`).should('exist');
    cy.do(RepeatableFieldItem({ index: row }).find(TextField()).fillIn(date));
  },

  verifyDatePlaceholder(row = 0) {
    cy.expect([
      RepeatableFieldItem({ index: row })
        .find(TextField({ placeholder: 'MM/DD/YYYY' }))
        .exists(),
    ]);
  },

  openCalendar(row = 0) {
    cy.do(
      RepeatableFieldItem({ index: row })
        .find(Button({ icon: 'calendar' }))
        .click(),
    );
  },

  verifyCalendarOpenedDate(date) {
    // date is expected to be in format MM/DD/YYYY, e.g. 12/31/2024
    const [month, day, year] = date.split('/');
    const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });

    cy.expect(Calendar().has({ day, month: monthName, year }));
  },

  selectDayFromCalendar(date) {
    // date is expected to be in format MM/DD/YYYY, e.g. 12/31/2024
    const day = date.split('/')[1];

    cy.do(Calendar().clickDay(day));
  },

  verifySelectedDateInCalendar(date, row = 0) {
    cy.expect(
      RepeatableFieldItem({ index: row })
        .find(TextField({ placeholder: 'MM/DD/YYYY' }))
        .has({ value: date }),
    );
  },

  populateFiled(filedType, value) {
    switch (filedType) {
      case 'input':
        this.fillInValueTextfield(value);
        break;
      case 'select':
        this.chooseValueSelect(value);
        break;
      default:
        cy.log('No such type');
        break;
    }
  },

  fillInValueTextfield(text, row = 0) {
    cy.do(RepeatableFieldItem({ index: row }).find(TextField()).fillIn(text));
  },

  verifyTextFieldValue(expectedValue, row = 0) {
    cy.expect(RepeatableFieldItem({ index: row }).find(TextField()).has({ value: expectedValue }));
  },

  chooseValueSelect(choice, row = 0) {
    cy.do(
      RepeatableFieldItem({ index: row })
        .find(Select({ content: including('Select value') }))
        .choose(choice),
    );
    cy.wait(1000);
  },

  verifySelectedValue(expectedValue, row = 0) {
    cy.expect(
      RepeatableFieldItem({ index: row })
        .find(Select({ content: including('Select value') }))
        .has({ checkedOptionText: expectedValue }),
    );
  },

  chooseValueSelectByValue(value, row = 0) {
    cy.get(`[data-testid="row-${row}"] [class^="col-sm-4"] [class^="selectControl"]`).select(value);
    cy.wait(1000);
  },

  fillInValueMultiselect(text, row = 0) {
    cy.do([RepeatableFieldItem({ index: row }).find(MultiSelect()).fillIn(text)]);
    cy.wait(2000);
    cy.do([MultiSelectOption(including(text)).click()]);
    cy.do(buildQueryModal.click());
  },

  chooseFromValueMultiselect(text, row = 0) {
    cy.do([RepeatableFieldItem({ index: row }).find(MultiSelect()).toggle()]);
    cy.do([MultiSelectOption(including(text)).click(), buildQueryModal.click()]);
    cy.wait(1000);
  },

  verifySelectedMultiselectValue(text, row = 0) {
    cy.expect(RepeatableFieldItem({ index: row }).find(MultiSelect()).has({ selected: text }));
  },

  selectAllMatchingFromMultiselect(text, row = 0) {
    cy.do([RepeatableFieldItem({ index: row }).find(MultiSelect()).toggle()]);
    cy.wait(1500);

    const clickNext = () => {
      cy.get('body').then(($body) => {
        const $unselected = $body.find(
          '[role="listbox"]:visible [role="option"][aria-selected="false"]',
        );

        let found = false;
        $unselected.each((i, el) => {
          if (!found && Cypress.$(el).text().trim().includes(text)) {
            found = true;
            cy.wrap(el).click();
            cy.wait(1000);
            clickNext();
            return false; // break the loop
          }
          return true; // continue the loop
        });
      });
    };

    clickNext();
    cy.wait(500);
    cy.do(buildQueryModal.click());
    cy.wait(1000);
  },

  removeValueFromMultiselect(text) {
    cy.get(`[id^="${text}-0_multiselect_selected_label"]`)
      .siblings('[icon="times"]')
      .focus()
      .click();
  },

  selectValueFromSelect(selection, row = 0) {
    cy.do(
      RepeatableFieldItem({ index: row })
        .find(Select({ dataTestID: 'data-input-select-boolType' }))
        .choose(selection),
    );
  },

  cancelDisabled(disabled = true) {
    cy.expect(cancelButton.has({ disabled }));
  },

  clickCancel() {
    cy.do(cancelButton.click());
  },

  testQueryDisabled(disabled = true) {
    cy.expect(testQueryButton.has({ disabled }));
  },

  runQueryDisabled(disabled = true) {
    cy.expect(runQueryButton.has({ disabled }));
  },

  xButttonDisabled(disabled = true) {
    cy.expect(xButton.has({ disabled }));
  },

  clickXButtton() {
    cy.do(xButton.click());
  },

  addNewRow(row = 0) {
    cy.do(RepeatableFieldItem({ index: row }).find(plusButton).click());
  },

  verifyBooleanColumn(row = 1) {
    cy.get('[class^="col-sm-1"][class*="headerCell"]').contains('Boolean');
    cy.get(`[data-testid="row-${row}"] [class^="col-sm-1"] [class^="selectControl"]`)
      .find('option')
      .should('have.length', 1)
      .and('have.text', ...booleanValues);
  },

  verifyPlusAndTrashButtonsDisabled(row = 0, plusDisabled = true, trashDisabled = true) {
    cy.expect([
      RepeatableFieldItem({ index: row }).find(plusButton).has({ disabled: plusDisabled }),
      RepeatableFieldItem({ index: row }).find(trashButton).has({ disabled: trashDisabled }),
    ]);
  },

  clickGarbage(row = 1) {
    cy.do(RepeatableFieldItem({ index: row }).find(trashButton).click());
  },

  clickTestQuery() {
    cy.wait(1000);
    cy.do(testQueryButton.click());
    cy.expect([HTML('Executing test query...').exists(), Spinner().exists()]);
    this.runQueryDisabled();
    this.cancelDisabled(false);
  },

  testQuery() {
    cy.do(testQueryButton.click());
    cy.expect([HTML('Executing test query...').exists(), Spinner().exists()]);
  },

  verifyPreviewOfRecordsMatched() {
    cy.expect([MultiColumnList().exists(), showColumnsButton.exists()]);
    this.testQueryDisabled(false);
    this.cancelDisabled(false);
    this.runQueryDisabled(false);
    cy.get('[class^="col-xs-10"]').then(($element) => {
      cy.wrap($element)
        .invoke('text')
        .then((text) => {
          const [totalRecords, previewRecords] = text.match(/\d+/g).map(Number);
          expect(
            text.startsWith(
              `Query returns ${totalRecords} ${pluralize(totalRecords, 'record')}. Previewing the first ${previewRecords} ${pluralize(previewRecords, 'record')}`,
            ),
          ).to.equal(true);
        });
    });
  },

  clickRunQueryAndSave() {
    cy.wait(1000);
    cy.do(runQueryAndSave.click());
    cy.wait(3000);
  },

  clickRunQuery() {
    cy.do(runQueryButton.click());
  },

  verifyClosed() {
    cy.do(buildQueryModal.absent());
  },

  buildQueryButtonDisabled(disabled = true) {
    cy.do(buildQueryButton.has({ disabled }));
  },

  waitForQueryCompleted(allias, maxRetries = 60) {
    let retries = 0;

    function checkResponse() {
      return cy.wait(allias, { timeout: 20000 }).then((interception) => {
        if (interception.response.body.totalRecords === 0) {
          retries++;
          if (retries > maxRetries) {
            throw new Error(
              'Exceeded maximum retry attempts waiting for totalRecords to not equal 0',
            );
          }
          cy.wait(1000);
          checkResponse();
        }
      });
    }
    checkResponse();
  },

  verifyNumberOfMatchedRecords(numberOfMatchedRecords) {
    cy.wait(3000);
    cy.get('[class^="col-xs-10"]').then(($element) => {
      cy.wrap($element)
        .invoke('text')
        .then((text) => {
          if (numberOfMatchedRecords) {
            const recordText = pluralize(numberOfMatchedRecords, 'record');

            expect(text).to.equal(
              `Query returns ${numberOfMatchedRecords} ${recordText}. Previewing the first ${numberOfMatchedRecords} ${recordText}:`,
            );
          } else {
            expect(text).to.equal('Query returns no records.');
            cy.get('[class^="emptyMessage--"]').should('have.text', 'The list contains no items');
          }
        });
    });
  },

  verifyMatchedRecordsByIdentifier(identifier, columnName, value) {
    cy.then(() => buildQueryModal.find(MultiColumnListCell(identifier)).row()).then((index) => {
      cy.expect(
        buildQueryModal
          .find(MultiColumnListRow({ indexRow: `row-${index}` }))
          .find(MultiColumnListCell({ column: columnName, content: value }))
          .exists(),
      );
    });
  },

  verifyRecordWithIdentifierAbsentInResultTable(identifier, timeout = 2000) {
    cy.wait(timeout);
    cy.expect(buildQueryModal.find(MultiColumnListCell(identifier)).absent());
  },

  verifyResultsTableAbsent() {
    cy.expect(buildQueryModal.find(MultiColumnList({ id: 'results-viewer-table' })).absent());
  },

  verifyEmbeddedTableInQueryModal(
    tableType,
    identifier,
    expectedData, // Can be a single object or array of objects
  ) {
    const headers = embeddedTableHeadersMap[tableType];
    if (!headers) {
      throw new Error(
        `Unknown table type: ${tableType}. Available types: ${Object.keys(embeddedTableHeadersMap).join(', ')}`,
      );
    }

    // Normalize input to always be an array
    const dataToVerify = Array.isArray(expectedData) ? expectedData : [expectedData];

    cy.then(() => buildQueryModal.find(MultiColumnListCell(identifier)).row()).then((rowIndex) => {
      // Find the DynamicTable specifically within this row
      cy.get(`[data-row-index="row-${rowIndex}"]`).within(() => {
        // Verify table headers
        cy.get('[class^="DynamicTable-"]')
          .find('tr')
          .eq(0)
          .then((headerRow) => {
            const headerCells = headerRow.find('th');

            headers.forEach((header, index) => {
              cy.wrap(headerCells.eq(index)).should('have.text', header);
            });
          });

        // Verify each expected row exists by finding a row containing all expected values
        dataToVerify.forEach((dataObj) => {
          const expectedValues = this.extractValuesForTableType(tableType, dataObj);

          // Find a table row that contains all expected values for this data object
          cy.get('[class^="DynamicTable-"]')
            .find('tbody tr')
            .should(($rows) => {
              // Check if any row contains all our expected values
              const matchingRow = Array.from($rows).find((row) => {
                const rowText = Cypress.$(row).text().trim();
                const expectedRowText = expectedValues.join('').trim();
                return rowText === expectedRowText;
              });

              if (!matchingRow) {
                throw new Error(
                  `Could not find a row in table "${tableType}" containing all values: [${expectedValues.join(', ')}] for entity with identifier "${identifier}"`,
                );
              }
            });
        });
      });
    });
  },

  extractValuesForTableType(tableType, dataObj) {
    switch (tableType) {
      case 'electronicAccess':
        return [
          dataObj.relationship,
          dataObj.uri,
          dataObj.linkText,
          dataObj.materialsSpecification,
          dataObj.publicNote,
        ];
      case 'notes':
        return [dataObj.noteType, dataObj.note, dataObj.staffOnly];
      case 'statements':
      case 'statementsForSupplements':
      case 'statementsForIndexes':
        return [dataObj.statement, dataObj.note, dataObj.staffNote];
      case 'receivingHistory':
        return [dataObj.publicDisplay, dataObj.enumeration, dataObj.chronology];
      case 'contributors':
        return [
          dataObj.name,
          dataObj.contributorNameType,
          dataObj.contributorType,
          dataObj.contributorTypeFreeText,
          dataObj.primary,
        ];
      case 'alternativeTitles':
        return [dataObj.alternativeTitle, dataObj.alternativeTitleType];
      case 'subjects':
        return [dataObj.subjectHeadings, dataObj.subjectSource, dataObj.subjectType];
      case 'publications':
        return [dataObj.publisher, dataObj.role, dataObj.place, dataObj.dateOfPublication];
      case 'identifiers':
        return [dataObj.identifierType, dataObj.identifier];
      case 'classifications':
        return [dataObj.classificationIdentifierType, dataObj.classification];
      default:
        throw new Error(`Unknown table type: ${tableType}`);
    }
  },

  verifyElectronicAccessEmbeddedTableInQueryModal(
    instanceIdentifier,
    expectedElectronicAccess, // Can be a single electronic access object or array of objects
  ) {
    this.verifyEmbeddedTableInQueryModal(
      'electronicAccess',
      instanceIdentifier,
      expectedElectronicAccess,
    );
  },

  verifyNotesEmbeddedTableInQueryModal(
    instanceIdentifier,
    expectedNotes, // Can be a single note object or array of note objects, ex: { noteType: 'action', note: 'test note', staffOnly: false }
  ) {
    this.verifyEmbeddedTableInQueryModal('notes', instanceIdentifier, expectedNotes);
  },

  verifyStatementsEmbeddedTableInQueryModal(
    instanceIdentifier,
    expectedStatements, // Can be a single statement object or array of statement objects, ex: { statement: 'test statement', note: 'test note', staffNote: 'test staff note' }
  ) {
    this.verifyEmbeddedTableInQueryModal('statements', instanceIdentifier, expectedStatements);
  },

  verifyStatementsForSupplementsEmbeddedTableInQueryModal(
    instanceIdentifier,
    expectedStatements, // Can be a single statement object or array of statement objects, ex: { statement: 'test statement', note: 'test note', staffNote: 'test staff note' }
  ) {
    this.verifyEmbeddedTableInQueryModal(
      'statementsForSupplements',
      instanceIdentifier,
      expectedStatements,
    );
  },

  verifyStatementsForIndexesEmbeddedTableInQueryModal(
    instanceIdentifier,
    expectedStatements, // Can be a single statement object or array of statement objects, ex: { statement: 'test statement', note: 'test note', staffNote: 'test staff note' }
  ) {
    this.verifyEmbeddedTableInQueryModal(
      'statementsForIndexes',
      instanceIdentifier,
      expectedStatements,
    );
  },

  verifyReceivingHistoryEmbeddedTableInQueryModal(instanceIdentifier, expectedReceivingHistory) {
    this.verifyEmbeddedTableInQueryModal(
      'receivingHistory',
      instanceIdentifier,
      expectedReceivingHistory,
    );
  },

  verifyContributorsEmbeddedTableInQueryModal(instanceIdentifier, expectedContributors) {
    this.verifyEmbeddedTableInQueryModal('contributors', instanceIdentifier, expectedContributors);
  },

  verifyAlternativeTitlesEmbeddedTableInQueryModal(instanceIdentifier, expectedAlternativeTitles) {
    this.verifyEmbeddedTableInQueryModal(
      'alternativeTitles',
      instanceIdentifier,
      expectedAlternativeTitles,
    );
  },

  verifySubjectsEmbeddedTableInQueryModal(instanceIdentifier, expectedSubjects) {
    this.verifyEmbeddedTableInQueryModal('subjects', instanceIdentifier, expectedSubjects);
  },

  verifyPublicationsEmbeddedTableInQueryModal(
    instanceIdentifier,
    expectedPublications, // Can be a single publication object or array of publication objects, ex: { publisher: 'test publisher', role: 'test role', place: 'test place', dateOfPublication: 'test date' }
  ) {
    this.verifyEmbeddedTableInQueryModal('publications', instanceIdentifier, expectedPublications);
  },

  verifyIdentifiersEmbeddedTableInQueryModal(instanceIdentifier, expectedIdentifiers) {
    this.verifyEmbeddedTableInQueryModal('identifiers', instanceIdentifier, expectedIdentifiers);
  },

  verifyClassificationsEmbeddedTableInQueryModal(instanceIdentifier, expectedClassifications) {
    this.verifyEmbeddedTableInQueryModal(
      'classifications',
      instanceIdentifier,
      expectedClassifications,
    );
  },

  clickShowColumnsButton() {
    cy.do(showColumnsButton.click());
  },

  clickCheckboxInShowColumns(columnName) {
    cy.do(Checkbox(columnName).click());
    cy.wait(2000);
  },

  verifyColumnDisplayed(columnName) {
    cy.expect(MultiColumnListHeader(columnName).exists());
  },

  scrollResultTable(direction) {
    cy.get('div[class^="mclScrollable"]').scrollTo(direction);
  },

  verifyRecordTypeLabel(recordType) {
    cy.expect(HTML(`Record type: ${recordType}`).exists());
  },

  verifyHeadlineQueryWouldReturnAbsent() {
    cy.get('[class^="col-xs-10"]').should('not.exist');
    cy.expect(HTML(including('Query would return')).absent());
  },
};
