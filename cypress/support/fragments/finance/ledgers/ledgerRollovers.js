import uuid from 'uuid';
import { HTML, MultiColumnListCell, Section, including } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import States from '../states';

const ledgerRolloversResultsSection = Section({ id: 'rollover-logs-results-pane' });
const ledgerRolloversTableRoot = ledgerRolloversResultsSection.find(
  HTML({ id: 'rollover-logs-list' }),
);

export default {
  waitLoading() {
    cy.expect(ledgerRolloversResultsSection.exists());
  },
  checkTableContent({ records = [] } = {}) {
    records.forEach((record, index) => {
      if (record.status) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(MultiColumnListCell({ row: index, column: 'Status' }))
            .has({ content: including(record.status) }),
        );
      }

      if (record.errors) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(MultiColumnListCell({ row: index, column: 'Errors' }))
            .has({ content: including(record.errors) }),
        );
      }

      if (record.results) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(MultiColumnListCell({ row: index, column: 'Results' }))
            .has({ content: including(record.results) }),
        );
      }

      if (record.settings) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(MultiColumnListCell({ row: index, column: 'Settings' }))
            .has({ content: including(record.settings) }),
        );
      }

      if (record.source) {
        cy.expect(
          ledgerRolloversTableRoot
            .find(MultiColumnListCell({ row: index, column: 'Source' }))
            .has({ content: including(record.source) }),
        );
      }
    });
  },
  exportRolloverResult({ row = 0, exportStarted = true } = {}) {
    cy.do(
      ledgerRolloversTableRoot.find(MultiColumnListCell({ column: 'Results', row })).hrefClick(),
    );

    if (exportStarted) {
      InteractorsTools.checkCalloutMessage(States.rolloverExportStartedSuccessfully);
    }
  },
  generateLedgerRollover({
    ledger,
    fromFiscalYear,
    toFiscalYear,
    encumbrancesRollover = [{ orderType: 'Ongoing', basedOn: 'InitialAmount' }],
    needCloseBudgets = true,
  }) {
    return {
      ledgerId: ledger.id,
      budgetsRollover: [
        { addAvailableTo: 'Allocation', rolloverBudgetValue: 'None', rolloverAllocation: true },
      ],
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
      path: `finance/ledger-rollovers/${ledgerId}`,
    });
  },
};
