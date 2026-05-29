import {
  Button,
  FieldSet,
  including,
  Label,
  PaneContent,
  PaneHeader,
  TextField,
} from '../../../../../interactors';
import {
  COMMON_BUTTON_LABELS,
  EXPORT_MANAGER_SETTINGS_JOBS_TYPES_LABEL,
  EXPORT_MANAGER_SETTINGS_LABELS,
} from '../../../constants';
import SettingsPane from '../settingsPane';

const JOB_DELETION_INTERVALS_DEFAULTS = [
  { name: EXPORT_MANAGER_SETTINGS_JOBS_TYPES_LABEL.AUTHORITY_CONTROL, value: '7' },
  { name: EXPORT_MANAGER_SETTINGS_JOBS_TYPES_LABEL.BURSAR, value: '7' },
  { name: EXPORT_MANAGER_SETTINGS_JOBS_TYPES_LABEL.CIRCULATION_LOG, value: '7' },
  { name: EXPORT_MANAGER_SETTINGS_JOBS_TYPES_LABEL.EHOLDINGS, value: '7' },
  { name: EXPORT_MANAGER_SETTINGS_JOBS_TYPES_LABEL.EDIFACT_ORDERS_EXPORT, value: '730' },
  { name: EXPORT_MANAGER_SETTINGS_JOBS_TYPES_LABEL.CLAIMS, value: '730' },
];

const settingsPaneHeader = PaneHeader(EXPORT_MANAGER_SETTINGS_LABELS.JOBS);
const settingsPaneContent = PaneContent({ id: 'export-manager-jobs-settings-content' });
const deletionIntervalsFieldset = FieldSet('Job deletion intervals (days)');

export default {
  jobDeletionIntervals: JOB_DELETION_INTERVALS_DEFAULTS,
  waitLoading() {
    SettingsPane.waitLoading();
    cy.expect(settingsPaneHeader.exists());
    cy.expect(deletionIntervalsFieldset.exists());
  },

  assertFieldsValues(fields = JOB_DELETION_INTERVALS_DEFAULTS, options = {}) {
    const { viewOnly = false } = options;

    fields.forEach(({ name, value }) => {
      const assertion = settingsPaneContent.find(
        TextField({
          label: name,
          value,
          name: including('retentionDays'),
        }),
      )[viewOnly ? 'absent' : 'exists'];

      cy.expect(assertion());

      if (viewOnly) {
        cy.do(
          settingsPaneContent.find(Label(name)).perform((el) => {
            const kvRoot = el.nextElementSibling.querySelector(
              '[data-test-kv-value=true]',
            )?.textContent;

            cy.expect(kvRoot).to.equal(value);
          }),
        );
      }
    });
  },

  assertSaveButtonDisabled(expectedState = true) {
    cy.expect(Button(COMMON_BUTTON_LABELS.SAVE).is({ disabled: expectedState }));
  },
};
