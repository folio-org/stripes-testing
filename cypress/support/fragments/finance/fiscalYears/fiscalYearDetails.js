import {
  Button,
  HTML,
  KeyValue,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  Section,
  including,
} from '../../../../../interactors';

const fiscalYearDetailsSection = Section({ id: 'pane-fiscal-year-details' });
const fiscalYearDetailsHeader = PaneHeader({ id: 'paneHeaderpane-fiscal-year-details' });

const informationSection = Section({ id: 'information' });
const financialSummarySection = Section({ id: 'financial-summary' });
const fundsSection = Section({ id: 'fund' });

export default {
  waitLoading() {
    cy.expect(fiscalYearDetailsSection.exists());
  },
  checkFiscalYearDetails({ information = [], financialSummary, funds } = {}) {
    information.forEach(({ key, value }) => {
      cy.expect(informationSection.find(KeyValue(key)).has({ value: including(value) }));
    });
    if (financialSummary) {
      this.checkFinancialSummary(financialSummary);
    }
    if (funds) {
      this.checkFundsDetails(funds);
    }
  },
  checkFinancialSummary(financialSummary) {
    if (financialSummary.expended) {
      cy.expect(
        financialSummarySection
          .find(MultiColumnListRow({ isContainer: true, content: including('Expended') }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(financialSummary.expended) }),
      );
    }
    if (financialSummary.unavailable) {
      cy.expect(
        financialSummarySection
          .find(MultiColumnListRow({ isContainer: true, content: including('Unavailable') }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(financialSummary.unavailable) }),
      );
    }
    if (financialSummary.overExpended) {
      cy.expect(
        financialSummarySection
          .find(MultiColumnListRow({ isContainer: true, content: including('Over expended') }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(financialSummary.overExpended) }),
      );
    }
    if (financialSummary.availableBalance) {
      cy.expect(
        financialSummarySection
          .find(HTML(`Available balance: ${financialSummary.availableBalance}`))
          .exists(),
      );
    }
  },
  checkFundsDetails(funds = []) {
    funds.forEach((fund, index) => {
      if (fund.name) {
        cy.expect(
          fundsSection
            .find(MultiColumnListCell({ row: index, column: 'Name' }))
            .has({ content: including(fund.name) }),
        );
      }
      if (fund.code) {
        cy.expect(
          fundsSection
            .find(MultiColumnListCell({ row: index, column: 'Code' }))
            .has({ content: including(fund.code) }),
        );
      }
      if (fund.allocated) {
        cy.expect(
          fundsSection
            .find(MultiColumnListCell({ row: index, column: 'Allocated' }))
            .has({ content: including(fund.allocated) }),
        );
      }
      if (fund.unavailable) {
        cy.expect(
          fundsSection
            .find(MultiColumnListCell({ row: index, column: 'Unavailable' }))
            .has({ content: including(fund.unavailable) }),
        );
      }
      if (fund.available) {
        cy.expect(
          fundsSection
            .find(MultiColumnListCell({ row: index, column: 'Available' }))
            .has({ content: including(fund.available) }),
        );
      }
    });

    if (!funds.length) {
      cy.expect(fundsSection.find(HTML('The list contains no items')).exists());
    }
  },
  closeFiscalYearDetails() {
    cy.do(fiscalYearDetailsHeader.find(Button({ icon: 'times' })).click());
  },
};
