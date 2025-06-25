import { HTML, including } from '@interactors/html';
import {
  Button,
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiSelect,
  MultiSelectOption,
  RepeatableFieldItem,
  Select,
  Selection,
  Spinner,
  TextField,
} from '../../../../interactors';

const buildQueryModal = Modal('Build query');
const buildQueryButton = Button('Build query');
const testQueryButton = Button('Test query');
const cancelButton = Button('Cancel');
const runQueryButton = Button('Run query');
const runQueryAndSave = Button('Run query & save');
const xButton = Button({ icon: 'times' });
const plusButton = Button({ icon: 'plus-sign' });
const trashButton = Button({ icon: 'trash' });
const selectFieldButton = Button(including('Select field'));

const booleanValues = ['AND'];

export const holdingsFieldValues = {
  instanceUuid: 'Holdings — Instance UUID',
  callNumber: 'Holdings — Call number',
  callNumberPrefix: 'Holdings — Call number prefix',
  permanentLocation: 'Permanent location — Name',
};
export const instanceFieldValues = {
  instanceId: 'Instance — Instance UUID',
  instanceHrid: 'Instance — Instance HRID',
  instanceResourceTitle: 'Instance — Resource title',
  instanceSource: 'Instance — Source',
  staffSuppress: 'Instance — Staff suppress',
  createdDate: 'Instance — Created date',
  catalogedDate: 'Instance — Cataloged date',
  date1: 'Instance — Date 1',
  statisticalCodeNames: 'Instance — Statistical code names',
};
export const itemFieldValues = {
  instanceId: 'Instances — Instance UUID',
  instanceTitle: 'Instances — Resource title',
  itemStatus: 'Items — Status',
  itemUuid: 'Items — Item UUID',
  holdingsId: 'Holdings — UUID',
  temporaryLocation: 'Temporary location — Name',
  itemDiscoverySuppress: 'Items — Suppress from discovery',
};
export const usersFieldValues = {
  expirationDate: 'User — Expiration date',
  firstName: 'User — First name',
  lastName: 'User — Last name',
  patronGroup: 'Patron group — Name',
  preferredContactType: 'User — Preferred contact type',
  userActive: 'User — Active',
  userBarcode: 'User — Barcode',
  userId: 'User — User UUID',
  userType: 'User — Type',
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
    cy.do(selectFieldButton.click());
    cy.get('[class^=selectionListRoot] [role="listbox"] [role="option"]')
      .children()
      .then((optionsText) => {
        const textArray = optionsText.get().map((el) => el.innerText);
        const sortedArray = [...textArray].sort((a, b) => a - b);
        expect(sortedArray).to.eql(textArray);
      });
  },

  selectField(selection, row = 0) {
    cy.do(RepeatableFieldItem({ index: row }).find(Selection()).choose(selection));
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
    cy.do(
      RepeatableFieldItem({ index: row })
        .find(Select({ dataTestID: including('operator-option') }))
        .choose(selection),
    );
  },

  verifyOperatorsList(operators, row = 0) {
    cy.get(`[data-testid="row-${row}"] [class^="col-sm-2"] [class^="selectControl"] option`).then(
      (options) => {
        const textArray = options.get().map((el) => el.label);
        expect(textArray).to.eql(Object.values(operators));
      },
    );
  },

  verifyQueryAreaContent(content) {
    cy.get('[class^="queryArea"]').should('have.text', content);
  },

  verifyValueColumn() {
    cy.get('[class^="col-sm-4"][class*="headerCell"]').contains('Value');
  },

  pickDate(date, row = 0) {
    cy.get(`[data-testid="row-${row}"] [class^="col-sm-4"] [placeholder="MM/DD/YYYY"]`).should(
      'exist',
    );
    cy.get(`[data-testid="row-${row}"] [class^="col-sm-4"] [icon="calendar"]`).should('exist');
    cy.do(RepeatableFieldItem({ index: row }).find(TextField()).fillIn(date));
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

  chooseValueSelect(choice, row = 0) {
    cy.do(
      RepeatableFieldItem({ index: row })
        .find(Select({ content: including('Select value') }))
        .choose(choice),
    );
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
  },

  removeValueFromMultiselect(text) {
    cy.contains('[data-test-selection-option-segment="true"]', text)
      .parent()
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
    cy.do(testQueryButton.click());
    cy.expect([HTML('Test query in progress').exists(), Spinner().exists()]);
    this.runQueryDisabled();
    this.cancelDisabled(false);
  },

  testQuery() {
    cy.do(testQueryButton.click());
    cy.expect([HTML('Test query in progress').exists(), Spinner().exists()]);
  },

  verifyPreviewOfRecordsMatched() {
    cy.expect([MultiColumnList().exists(), Button('Show columns').exists()]);
    this.testQueryDisabled(false);
    this.cancelDisabled(false);
    this.runQueryDisabled(false);
    cy.get('[class^="col-xs-10"]').then(($element) => {
      cy.wrap($element)
        .invoke('text')
        .then((text) => {
          const [totalRecords, previewRecords] = text.match(/\d+/g).map(Number);
          const previewLabel = `Preview of first ${Math.min(previewRecords, 100)} records.`;
          expect(text.startsWith(`Query would return ${totalRecords} records.`)).to.equal(true);
          expect(previewLabel).to.equal(
            `Preview of first ${Math.min(previewRecords, 100)} records.`,
          );
        });
    });
  },

  clickRunQueryAndSave() {
    cy.do(runQueryAndSave.click());
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
            expect(text).to.equal(
              `Query would return ${numberOfMatchedRecords} records. Preview of first ${numberOfMatchedRecords} records.`,
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
};
