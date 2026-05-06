import { v4 as uuid } from 'uuid';
import {
  Link,
  Button,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  including,
  Checkbox,
  HTML,
  Accordion,
  MultiSelect,
  Selection,
  SelectionList,
} from '../../../../../interactors';
import {
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  RESULTS_PANE_NOT_FOUND_MESSAGE,
  SORT_DIRECTIONS,
  TRANSACTION_LIST_COLUMNS,
  TRANSACTION_RESULTS_FILTERS,
  TRANSACTION_SOURCE_TYPES,
  TRANSACTION_TYPES,
} from '../../../constants';
import MultiColumnListHelper from '../../multiColumnList';
import TransactionDetails from './transactionDetails';

const accordionsMapping = {
  [TRANSACTION_RESULTS_FILTERS.ENCUMBRANCE_STATUS]: 'sourcePoLineId',
  [TRANSACTION_RESULTS_FILTERS.EXPENSE_CLASS]: 'expenseClassId',
  [TRANSACTION_RESULTS_FILTERS.SOURCE]: 'filter-source',
  [TRANSACTION_RESULTS_FILTERS.SOURCE_INVOICE]: 'sourceInvoiceId',
  [TRANSACTION_RESULTS_FILTERS.SOURCE_POL]: 'filter-encumbrance.sourcePoLineId',
  [TRANSACTION_RESULTS_FILTERS.TAGS]: 'tags.tagList',
  [TRANSACTION_RESULTS_FILTERS.TYPE]: 'transactionType',
};

const transactionFiltersPane = Section({ id: 'transaction-filters-pane' });
const transactionResultsPane = Section({ id: 'transaction-results-pane' });
const transactionResultsList = MultiColumnList({ id: 'transactions-list' });
const resetAllButton = Button(COMMON_BUTTON_LABELS.RESET_ALL);
const nextButton = Button(COMMON_BUTTON_LABELS.NEXT);
const previousButton = Button(COMMON_BUTTON_LABELS.PREVIOUS);
const tagsFilterMultiSelect = MultiSelect({ id: 'acq-tags-filter' });

const filterBySelection = (selectionId, value) => {
  cy.do([
    Selection({ id: `${selectionId}-selection` }).open(),
    SelectionList().filter(value),
    SelectionList().select(including(value)),
  ]);
  MultiColumnListHelper.waitLoadingComplete(transactionResultsList);
};

const filterByDynamicSelection = (selectionId, value) => {
  filterBySelection(`${selectionId}-dynamic`, value);
};

const filterByCheckbox = (checkboxLabel) => {
  cy.do([transactionFiltersPane.find(Checkbox(checkboxLabel)).click()]);
  MultiColumnListHelper.waitLoadingComplete(transactionResultsList);
};

const api = {
  createBatchTransactionsViaApi(transactionsToCreate = []) {
    const ids = transactionsToCreate.map(() => uuid());

    return cy
      .okapiRequest({
        method: 'POST',
        path: 'finance/transactions/batch-all-or-nothing',
        body: {
          transactionsToCreate: transactionsToCreate.map((transaction, index) => ({
            ...transaction,
            id: ids[index],
          })),
        },
      })
      .then(() => ids);
  },

  createTransactionViaApi(transaction) {
    return api
      .createBatchTransactionsViaApi([{ ...transaction }])
      .then(([transactionId]) => transactionId);
  },

  createBatchAllocationsViaApi(allocationsToCreate = [], tags = []) {
    const transactions = allocationsToCreate.map((allocation) => ({
      ...allocation,
      currency: allocation.currency || 'USD',
      transactionType: TRANSACTION_TYPES.ALLOCATION,
      source: TRANSACTION_SOURCE_TYPES.USER,
      tags: { tagList: allocation.tags ? allocation.tags.tagList : tags },
    }));

    return api.createBatchTransactionsViaApi(transactions).then((transactionIds) => transactionIds);
  },

  createAllocationViaApi(transaction, tags = []) {
    return api
      .createBatchAllocationsViaApi([transaction], tags)
      .then(([transactionId]) => transactionId);
  },

  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(transactionResultsPane.exists());
  },
  checkTransactionsList({ records = [], present = true } = {}) {
    records.forEach(({ type, amount }) => {
      const content = amount ? `${type}(${amount})` : type;

      if (present) {
        cy.expect(
          transactionResultsList
            .find(MultiColumnListRow({ content: including(content), isContainer: true }))
            .exists(),
        );
      } else {
        cy.expect(
          transactionResultsList
            .find(MultiColumnListRow({ content: including(content), isContainer: true }))
            .absent(),
        );
      }
    });
  },
  checkTransactionsByTypeAndAmount({ records = [] } = {}) {
    records.forEach(({ type, amount }) => {
      cy.get('#transactions-list [class*=mclRow-]').each(($row) => {
        if ($row.text().includes(type)) {
          cy.wrap($row).should('contain', amount);
        }
      });
    });
  },
  selectTransaction(type, amount = null) {
    const searchContent = amount ? `${type}${amount}` : type;

    cy.do(
      transactionResultsList
        .find(MultiColumnListRow({ content: including(searchContent), isContainer: true }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .find(Link())
        .click(),
    );

    TransactionDetails.waitLoading();

    return TransactionDetails;
  },

  clickNthLinkInTransactionsResults(nth = 0) {
    cy.do(
      transactionResultsList
        .find(MultiColumnListRow({ index: nth }))
        .find(Link())
        .click(),
    );
    TransactionDetails.waitLoading();
  },

  closeTransactionsPage() {
    cy.wait(4000);

    cy.get('#finance-module-display button[icon=times]').first().click();
    cy.wait(4000);
  },

  clickNextPagination() {
    cy.do(nextButton.click());
  },

  clickPreviousPagination() {
    cy.do(previousButton.click());
  },

  expandTransactionTypeAccordion() {
    cy.do(Button({ id: 'accordion-toggle-button-transactionType' }).click());
  },

  toggleFilterAccordion(filterLabel) {
    cy.do([transactionFiltersPane.find(Button({ text: filterLabel })).click()]);
  },

  selectTransactionTypeFilter(transactionType) {
    cy.do(Checkbox(transactionType).click());
    MultiColumnListHelper.waitLoadingComplete(transactionResultsList);
  },

  checkTransactionDatesSorted(order = SORT_DIRECTIONS.DESCENDING) {
    MultiColumnListHelper.assertColumnSortDirection(
      TRANSACTION_LIST_COLUMNS.TRANSACTION_DATE,
      order,
    );
  },

  checkVoidedTransactionInList({ amount, tooltipText }) {
    const transactionRow = transactionResultsList.find(
      MultiColumnListRow({ content: including(amount), isContainer: true }),
    );
    const amountCell = transactionRow.find(
      MultiColumnListCell({ column: TRANSACTION_LIST_COLUMNS.AMOUNT }),
    );

    cy.expect([
      amountCell.find(HTML({ className: including('voided') })).exists(),
      amountCell.find(Button({ ariaLabel: 'info' })).exists(),
    ]);

    cy.do(amountCell.find(Button({ ariaLabel: 'info' })).click());
    cy.contains(tooltipText).should('be.visible');
  },

  assertRowCellsContent(rowsConfig = []) {
    MultiColumnListHelper.assertRowsCellsContent(transactionResultsList, rowsConfig);
  },

  assertResultsTransactionsByType(expectedTypes) {
    api.checkTransactionsList({
      records: expectedTypes.map((type) => ({ type })),
      present: true,
    });

    api.checkTransactionsList({
      records: Object.values(TRANSACTION_TYPES)
        .filter((type) => !expectedTypes.includes(type))
        .map((type) => ({ type })),
      present: false,
    });
  },

  assertNoResultsMessage() {
    cy.expect(
      transactionResultsPane.find(HTML(including(RESULTS_PANE_NOT_FOUND_MESSAGE))).exists(),
    );
  },

  filterByPOLineNumber(polNumber) {
    filterByDynamicSelection('encumbrance.sourcePoLineId', polNumber);
  },

  filterByInvoiceNumber(invoiceNumber) {
    filterByDynamicSelection('sourceInvoiceId', invoiceNumber);
  },

  filterByTags(tags = []) {
    cy.do([tagsFilterMultiSelect.open(), tagsFilterMultiSelect.choose(tags)]);
    MultiColumnListHelper.waitLoadingComplete(transactionResultsList);
  },

  filterByExpenseClass(expenseClass) {
    filterBySelection('expenseClassId', expenseClass);
  },

  filterBySource(source) {
    filterByCheckbox(source);
  },

  filterByEncumbranceStatus(status) {
    filterByCheckbox(status);
  },

  clearFilter(filterLabel) {
    cy.do([
      Accordion({ id: accordionsMapping[filterLabel] })
        .find(Button({ icon: 'times-circle-solid' }))
        .click(),
    ]);
  },

  clickResetAllButton() {
    cy.do(transactionFiltersPane.find(resetAllButton).click());
    cy.expect(resetAllButton.is({ disabled: true }));
  },
};

export default api;
