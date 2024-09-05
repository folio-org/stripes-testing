import {
  Button,
  HTML,
  Modal,
  MultiColumnList,
  MultiSelect,
  MultiSelectOption,
  RepeatableFieldItem,
  Select,
  Selection,
  Spinner,
  TextField,
  including,
} from '../../../../interactors';

const buildQueryModal = Modal('Build query');
const buildQueryButton = Button('Build query');
const testQueryButton = Button('Test query');
const cancelButton = Button('Cancel');
const runQueryButton = Button('Run query');
const xButton = Button({ icon: 'times' });
const plusButton = Button({ icon: 'plus-sign' });
const trashButton = Button({ icon: 'trash' });

const booleanValues = ['AND'];

export const holdingsFieldValues = {
  instanceUuid: 'Holdings — Holding — Instance UUID',
};
export const instanceFieldValues = {
  instanceHrid: 'Instances — Instance — Instance HRID',
  instanceResourceTitle: 'Instances — Instance — Title',
};
export const itemFieldValues = {
  instanceId: 'Instances — Instance UUID',
  itemStatus: 'Items — Items — Status',
  itemUuid: 'Items — Item UUID',
  holdingsId: 'Items — Holdings — UUID',
  temporaryLocation: 'Items — Temporary location — Name',
};
export const usersFieldValues = {
  expirationDate: 'Users — User — Expiration date',
  firstName: 'Users — User — First name',
  lastName: 'Users — User — Last name',
  patronGroup: 'Users — Group — Group',
  preferredContactType: 'Users — User — Preferred contact type',
  userActive: 'Users — User — Active',
  userBarcode: 'Users — User — Barcode',
};
export const dateTimeOperators = [
  'Select operator',
  'equals',
  'not equal to',
  '>',
  '<',
  '>=',
  '<=',
  'is null/empty',
];
export const stringStoresUuidButMillionOperators = [
  'Select operator',
  'equals',
  'not equal to',
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
  START_WITH: 'starts with',
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
    cy.get('[class^="col-sm-4"] [role="listbox"] [role="option"]')
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
    cy.do([
      RepeatableFieldItem({ index: row })
        .find(MultiSelectOption(including(text)))
        .click(),
    ]);
    cy.do(buildQueryModal.click());
  },

  chooseFromValueMultiselect(text, row = 0) {
    cy.do([RepeatableFieldItem({ index: row }).find(MultiSelect()).toggle()]);
    cy.do([
      RepeatableFieldItem({ index: row })
        .find(MultiSelectOption(including(text)))
        .click(),
      buildQueryModal.click(),
    ]);
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

  clickRunQuery() {
    cy.do(runQueryButton.click());
  },

  verifyClosed() {
    cy.do(buildQueryModal.absent());
  },

  buildQueryButtonDisabled(disabled = true) {
    cy.do(buildQueryButton.has({ disabled }));
  },
};
