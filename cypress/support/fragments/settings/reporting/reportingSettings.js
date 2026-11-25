import { including, NavListItem, Pane, Select } from '../../../../../interactors';

const settingsPane = Pane('Reporting');
const recordLimitsPane = Pane('Record limits');

export const REPORTING_SETTINGS_OPTIONS = {
  RECORD_LIMITS: 'Record limits',
  TABLE_AVAILABILITY: 'Table availability',
  DATABASE_CONFIGURATION: 'Database configuration',
  REPORT_REPOSITORIES: 'Report repositories',
};

export const RECORD_LIMITS_FIELDS = [
  'Default number to show',
  'Maximum number to show',
  'Maximum number to export',
];

export default {
  waitLoading() {
    cy.expect(settingsPane.exists());
  },

  verifySettingsOptions(options = Object.values(REPORTING_SETTINGS_OPTIONS)) {
    options.forEach((option) => {
      cy.expect(settingsPane.find(NavListItem(including(option))).exists());
    });
  },

  openRecordLimits() {
    cy.do(
      settingsPane.find(NavListItem(including(REPORTING_SETTINGS_OPTIONS.RECORD_LIMITS))).click(),
    );
    cy.expect(recordLimitsPane.exists());
  },

  // read-only check: values are not changed
  verifyRecordLimitsFields(fields = RECORD_LIMITS_FIELDS) {
    fields.forEach((field) => {
      cy.expect(recordLimitsPane.find(Select(including(field))).exists());
    });
  },
};
