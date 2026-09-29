import uuid from 'uuid';
import {
  Accordion,
  Button,
  Checkbox,
  HTML,
  MultiColumnList,
  MultiColumnListCell,
  Section,
  TextField,
  including,
} from '../../../../../interactors';
import {
  COMMON_BUTTON_LABELS,
  DATE_RANGE_FIELD_LABELS,
  LEDGER_ROLLOVER_LOGS_COLUMNS,
} from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import States from '../states';

const ledgerRolloversResultsSection = Section({ id: 'rollover-logs-results-pane' });
const ledgerRolloversTableRoot = ledgerRolloversResultsSection.find(
  HTML({ id: 'rollover-logs-list' }),
);
const ledgerRolloversList = MultiColumnList({ id: 'rollover-logs-list' });
const resetFiltersButton = Button(COMMON_BUTTON_LABELS.RESET_ALL);

const expandFilterAccordion = (accordion) => {
  cy.then(() => accordion.open()).then((isOpen) => {
    if (!isOpen) {
      cy.do(accordion.clickHeader());
    }
  });
};

export default {
  waitLoading() {
    cy.expect(ledgerRolloversResultsSection.exists());
  },
  checkFiltersPane({ dateFilters = [], checkboxFilters = [] } = {}) {
    cy.expect(resetFiltersButton.has({ disabled: true }));

    dateFilters.forEach((label) => {
      const accordion = Accordion(label);

      expandFilterAccordion(accordion);
      cy.expect([
        accordion.find(TextField(DATE_RANGE_FIELD_LABELS.FROM)).exists(),
        accordion.find(TextField(DATE_RANGE_FIELD_LABELS.TO)).exists(),
        accordion.find(Button(COMMON_BUTTON_LABELS.APPLY)).exists(),
      ]);
    });

    checkboxFilters.forEach(({ label, options = [] }) => {
      const accordion = Accordion(label);

      expandFilterAccordion(accordion);
      options.forEach((option) => {
        cy.expect(accordion.find(Checkbox(option)).has({ checked: false }));
      });
    });
  },
  checkTableContent({ records = [], columns } = {}) {
    if (columns) {
      cy.expect(ledgerRolloversList.has({ columns }));
    }

    records.forEach((record, index) => {
      if (record.startTime) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(
              MultiColumnListCell({ row: index, column: LEDGER_ROLLOVER_LOGS_COLUMNS.START_TIME }),
            )
            .has({ content: including(record.startTime) }),
        );
      }

      if (record.endTime) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(
              MultiColumnListCell({ row: index, column: LEDGER_ROLLOVER_LOGS_COLUMNS.END_TIME }),
            )
            .has({ content: including(record.endTime) }),
        );
      }

      if (record.status) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(MultiColumnListCell({ row: index, column: LEDGER_ROLLOVER_LOGS_COLUMNS.STATUS }))
            .has({ content: including(record.status) }),
        );
      }

      if (record.errors) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(MultiColumnListCell({ row: index, column: LEDGER_ROLLOVER_LOGS_COLUMNS.ERRORS }))
            .has({ content: including(record.errors) }),
        );
      }

      if (record.results) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(MultiColumnListCell({ row: index, column: LEDGER_ROLLOVER_LOGS_COLUMNS.RESULTS }))
            .has({ content: including(record.results) }),
        );
      }

      if (record.settings) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(
              MultiColumnListCell({ row: index, column: LEDGER_ROLLOVER_LOGS_COLUMNS.SETTINGS }),
            )
            .has({ content: including(record.settings) }),
        );
      }

      if (record.source) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(MultiColumnListCell({ row: index, column: LEDGER_ROLLOVER_LOGS_COLUMNS.SOURCE }))
            .has({ content: including(record.source) }),
        );
      }
    });
  },
  exportRolloverResult({ row = 0, exportStarted = true } = {}) {
    cy.do(
      ledgerRolloversTableRoot
        .find(MultiColumnListCell({ column: LEDGER_ROLLOVER_LOGS_COLUMNS.RESULTS, row }))
        .hrefClick(),
    );

    if (exportStarted) {
      InteractorsTools.checkCalloutMessage(States.rolloverExportStartedSuccessfully);
    }
  },
  generateLedgerRollover({
    ledger,
    fromFiscalYear,
    toFiscalYear,
    budgetsRollover = [
      { addAvailableTo: 'Allocation', rolloverBudgetValue: 'None', rolloverAllocation: true },
    ],
    encumbrancesRollover = [{ orderType: 'Ongoing', basedOn: 'InitialAmount' }],
    needCloseBudgets = true,
  }) {
    return {
      ledgerId: ledger.id,
      budgetsRollover,
      encumbrancesRollover,
      needCloseBudgets,
      fromFiscalYearId: fromFiscalYear.id,
      restrictEncumbrance: true,
      restrictExpenditures: true,
      toFiscalYearId: toFiscalYear.id,
      rolloverType: 'Commit',
      id: uuid(),
    };
  },
  getLedgerRolloverViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'finance/ledger-rollovers',
        method: 'GET',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body.ledgerFiscalYearRollovers);
  },
  createLedgerRolloverViaApi(ledgersProperties) {
    return cy
      .okapiRequest({
        path: 'finance/ledger-rollovers',
        body: ledgersProperties,
        method: 'POST',
      })
      .then((response) => {
        return response.body;
      });
  },
  deleteLedgerRolloverViaApi(ledgerId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `finance-storage/ledger-rollovers/${ledgerId}`,
    });
  },
};
