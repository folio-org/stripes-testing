import { Button, NavListItem, Pane } from '../../../../../interactors';
import SettingsPane from '../settingsPane';

const circulationPane = Pane('Circulation');

export const CIRCULATION_SETTINGS = {
  CIRCULATION_RULES: 'Circulation rules',
  OTHER_SETTINGS: 'Other settings',
  STAFF_SLIPS: 'Staff slips',
  FIXED_DUE_DATE_SCHEDULES: 'Fixed due date schedules',
  LOAN_ANONYMIZATION: 'Loan anonymization',
  LOAN_POLICIES: 'Loan policies',
  OVERDUE_FINE_POLICIES: 'Overdue fine policies',
  LOST_ITEM_FEE_POLICIES: 'Lost item fee policies',
  PATRON_NOTICE_POLICIES: 'Patron notice policies',
  PATRON_NOTICE_TEMPLATES: 'Patron notice templates',
  REQUEST_CANCELLATION_REASONS: 'Request cancellation reasons',
  REQUEST_POLICIES: 'Request policies',
  TITLE_LEVEL_REQUESTS: 'Title level requests',
  PRINT_HOLD_REQUESTS: 'Print hold requests',
  VIEW_PRINT_DETAILS: 'View print details',
};

export default {
  ...SettingsPane,
  waitLoading(section = 'Circulation') {
    cy.expect(Pane(section).exists());
  },

  goToCirculationTab() {
    cy.do(NavListItem('Circulation').click());
    cy.expect(circulationPane.exists());
  },

  goToSettingsCirculation(option) {
    cy.contains('[class^=NavListItem]', option).scrollIntoView().click();
  },

  verifyPageTitle(title) {
    cy.wait(1000);
    cy.title().should('eq', title);
  },

  cancelEditing() {
    cy.do(Button({ id: 'footer-cancel-entity' }).click());
  },
};
