import { Button, TextField, Selection, SelectionList, Accordion, Modal, Checkbox, MultiSelect, SearchField, Section } from '../../../../../interactors';
import { statusActive, statusInactive, statusFrozen } from '../financeHelper';

const createdFundNameXpath = '//*[@id="paneHeaderpane-fund-details-pane-title"]/h2/span';
const numberOfSearchResultsHeader = '//*[@id="paneHeaderfund-results-pane-subtitle"]/span';
const zeroResultsFoundText = '0 records found';
const budgetTitleXpath = '//*[@id="paneHeaderpane-budget-pane-title"]/h2/span';

export default {
  waitForFundDetailsLoading : () => {
    cy.do(Section({ id: 'pane-fund-details' }).visible());
  },

  createDefaultFund(fund) {
    cy.do([
      Button('New').click(),
      TextField('Name*').fillIn(fund.name),
      TextField('Code*').fillIn(fund.code),
      TextField('External account*').fillIn(fund.externalAccount),
      Selection('Ledger*').open(),
      SelectionList().select(fund.ledgerName),
      Button('Save & Close').click()
    ]);
    this.waitForFundDetailsLoading();
  },

  checkCreatedFund: (fundName) => {
    cy.xpath(createdFundNameXpath)
      .should('be.visible')
      .and('have.text', fundName);
  },

  tryToCreateFundWithoutMandatoryFields: (fundName) => {
    cy.do([
      Button('New').click(),
      TextField('Name*').fillIn(fundName),
      Button('Save & Close').click(),
      TextField('Code*').fillIn('some code'),
      Button('Save & Close').click(),
      TextField('External account*').fillIn('some account'),
      Button('Save & Close').click(),
      // try to navigate without saving
      Button('Agreements').click(),
      Button('Keep editing').click,
      Button('Cancel').click(),
      Button('Close without saving').click()
    ]);
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  deleteFundViaActions: () => {
    cy.do([
      cy.expect(Button('Actions').exists()),
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-fund-remove-confirmation-confirm' }).click()
    ]);
  },

  addBudget: (allocatedQuantity) => {
    cy.do(Accordion('Current budget').find(Button('New')).click());
    cy.expect(Modal('Current budget').exists());
    cy.do([
      Modal('Current budget').find(TextField({ name: 'allocated' })).fillIn(allocatedQuantity.toString()),
      Button('Save').click()
    ]);
  },

  checkCreatedBudget: (fundCode, fiscalYear) => {
    cy.expect(Accordion('Budget summary').exists());
    cy.expect(Accordion('Budget information').exists());
    cy.xpath(budgetTitleXpath)
      .should('be.visible')
      .and('have.text', fundCode.concat('-', fiscalYear));
  },

  deleteBudgetViaActions() {
    cy.do([
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-budget-remove-confirmation-confirm' }).click()
    ]);
    this.waitForFundDetailsLoading();
  },

  resetFundFilters: () => {
    cy.do([
      Button({ id: 'reset-funds-filters' }).click(),
    ]);
  },

  selectStatusInSearch: (fundStatus) => {
    cy.do(Accordion({ id: 'fundStatus' }).clickHeader());
    switch (fundStatus) {
      case statusFrozen:
        cy.do(Checkbox({ id: 'clickable-filter-fundStatus-frozen' }).click());
        break;
      case statusActive:
        cy.do(Checkbox({ id: 'clickable-filter-fundStatus-active' }).click());
        break;
      case statusInactive:
        cy.do(Checkbox({ id: 'clickable-filter-fundStatus-inactive' }).click());
        break;
      default:
        cy.log('No such status like ' + fundStatus + '. Please use frozen, active or inactive');
    }
  },

  checkFundFilters(ledgerName, fundType, fundStatus, aUnits, tags, groupName, fundName) {
    this.selectStatusInSearch(fundStatus);
    cy.do([
      Accordion({ id: 'ledgerId' }).clickHeader(),
      Selection({ id: 'ledgerId-selection' }).open(),
      SelectionList({ id: 'sl-container-ledgerId-selection' }).select(ledgerName),

      Accordion({ id: 'fundTypeId' }).clickHeader(),
      Selection({ id: 'fundTypeId-selection' }).open(),
      SelectionList({ id: 'sl-container-fundTypeId-selection' }).select(fundType),

      Accordion({ id: 'groupFundFY.groupId' }).clickHeader(),
      Selection({ id: 'groupFundFY.groupId-selection' }).open(),
      SelectionList({ id: 'sl-container-groupFundFY.groupId-selection' }).select(groupName),

      Accordion({ id: 'acqUnitIds' }).clickHeader(),
      Selection({ id: 'acqUnitIds-selection' }).open(),
      SelectionList({ id: 'sl-container-acqUnitIds-selection' }).select(aUnits),

      Accordion({ id: 'tags' }).clickHeader(),
      MultiSelect({ id: 'acq-tags-filter' }).select(tags),

      SearchField({ id: 'input-record-search' }).fillIn(fundName),
      Button('Search').click(),
    ]);
  },
};
