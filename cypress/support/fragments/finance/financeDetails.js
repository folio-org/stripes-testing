import {
  HTML,
  KeyValue,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  Select,
  including,
} from '../../../../interactors';

const informationSection = Section({ id: 'information' });
const financialSummarySection = Section({ id: 'financial-summary' });

const ledgersSection = Section({ id: 'ledger' });
const groupsSection = Section({ id: 'group' });
const fundsSection = Section({ id: 'fund' });

export default {
  checkInformation(information = []) {
    information.forEach(({ key, value }) => {
      if (key === 'Fiscal year') {
        cy.expect(
          informationSection
            .find(Select('Fiscal year'))
            .has({ checkedOptionText: including(String(value)) }),
        );
      } else {
        cy.expect(informationSection.find(KeyValue(key)).has({ value: including(String(value)) }));
      }
    });
  },
  checkFinancialSummary(financialSummary) {
    if (financialSummary.information) {
      financialSummary.information.forEach(({ key, value }) => {
        cy.expect(
          financialSummarySection
            .find(MultiColumnListRow({ isContainer: true, content: including(key) }))
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: including(value) }),
        );
      });
    }
    if (financialSummary.balance?.cash) {
      cy.expect(
        financialSummarySection
          .find(HTML(`Cash balance: ${financialSummary.balance.cash}`))
          .exists(),
      );
    }
    if (financialSummary.balance?.available) {
      cy.expect(
        financialSummarySection
          .find(HTML(`Available balance: ${financialSummary.balance.available}`))
          .exists(),
      );
    }
  },
  checkTableContent({ section, items }) {
    items.forEach((item, index) => {
      if (item.name) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Name' }))
            .has({ content: including(item.name) }),
        );
      }
      if (item.code) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Code' }))
            .has({ content: including(item.code) }),
        );
      }
      if (item.allocated) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Allocated' }))
            .has({ content: including(item.allocated) }),
        );
      }
      if (item.unavailable) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Unavailable' }))
            .has({ content: including(item.unavailable) }),
        );
      }
      if (item.available) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Available' }))
            .has({ content: including(item.available) }),
        );
      }
    });

    if (!items.length) {
      cy.expect(section.find(HTML('The list contains no items')).exists());
    }
  },
  checkExpenseClassesTableContent({ section, items }) {
    items.forEach((item, index) => {
      if (item.name) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Expense class' }))
            .has({ content: including(item.name) }),
        );
      }
      if (item.encumbered) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Encumbered' }))
            .has({ content: including(item.encumbered) }),
        );
      }
      if (item.awaitingPayment) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Awaiting payment' }))
            .has({ content: including(item.awaitingPayment) }),
        );
      }
      if (item.expended) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Expended' }))
            .has({ content: including(item.expended) }),
        );
      }
      if (item.percentExpended) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Percent of total expended' }))
            .has({ content: including(item.percentExpended) }),
        );
      }
      if (item.status) {
        cy.expect(
          section
            .find(MultiColumnListCell({ row: index, column: 'Status' }))
            .has({ content: including(item.status) }),
        );
      }
    });
  },
  checkLedgersDetails(ledgers = []) {
    this.checkTableContent({ section: ledgersSection, items: ledgers });
  },
  checkGroupsDetails(groups = []) {
    this.checkTableContent({ section: groupsSection, items: groups });
  },
  checkFundsDetails(funds = []) {
    this.checkTableContent({ section: fundsSection, items: funds });
  },
  openItemDetails({ section, name }) {
    cy.do(section.find(MultiColumnListCell({ content: name })).click());
  },
  openLedgerDetails(name) {
    this.openItemDetails({ section: ledgersSection, name });
  },
  openGroupDetails(name) {
    this.openItemDetails({ section: groupsSection, name });
  },
  openFundDetails(name) {
    this.openItemDetails({ section: fundsSection, name });
  },
};
