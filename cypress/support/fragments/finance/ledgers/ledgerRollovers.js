import uuid from 'uuid';

export default {
  generateLedgerRollover({ ledger, fromFiscalYear, toFiscalYear }) {
    return {
      ledgerId: ledger.id,
      budgetsRollover: [
        { addAvailableTo: 'Allocation', rolloverBudgetValue: 'None', rolloverAllocation: true },
      ],
      encumbrancesRollover: [{ orderType: 'Ongoing', basedOn: 'InitialAmount' }],
      needCloseBudgets: true,
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
      isDefaultSearchParamsRequired: false,
    });
  },
};
