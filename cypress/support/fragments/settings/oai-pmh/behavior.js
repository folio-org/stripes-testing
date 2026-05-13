import uuid from 'uuid';
import {
  Pane,
  Button,
  Select,
  Option,
  MessageBanner,
  Tooltip,
  including,
} from '../../../../../interactors';

const behaviorPane = Pane('Behavior');
const deletedRecordsSupportDropdown = Select('Deleted records support*');
const deletedRecordsSupportDropdownNotRequired = Select('Deleted records support');
const suppressedRecordsProcessingDropdown = Select('Suppressed records processing*');
const suppressedRecordsProcessingDropdownNotRequired = Select('Suppressed records processing');
const oaipmhErrorsProcessingDropdown = Select('OAI-PMH errors processing*');
const oaipmhErrorsProcessingDropdownNotRequired = Select('OAI-PMH errors processing');
const recordSourceDropdown = Select('Record source*');
const recordSourceDropdownNotRequired = Select('Record source');
const saveButton = Button('Save');

export const BEHAVIOR_MESSAGES = {
  WARNING_BANNER_DISABLED:
    'OAI service is disabled. To affect OAI-PMH features by settings please Enable OAI service in the General section.',
  TOOLTIP_DISABLED: 'To enable this field, select Enable OAI service in the General section.',
  TOOLTIP_DELETED_RECORDS:
    'The manner in which the repository supports the notion of deleted records.',
  TOOLTIP_SUPPRESSED_RECORDS:
    'Defines if suppressed records should be skipped or added into OAI response with discovery flag value.',
  TOOLTIP_OAI_PMH_ERRORS: 'Defines which HTTP statuses should OAI-level errors be associated with.',
  TOOLTIP_RECORD_SOURCE: 'Record source',
};

export const BEHAVIOR_SETTINGS_OPTIONS_UI = {
  DELETED_RECORDS_SUPPORT: {
    PERSISTENT: 'Persistent',
    NO: 'No',
    TRANSIENT: 'Transient',
  },
  SUPPRESSED_RECORDS_PROCESSING: {
    TRANSFER: 'Transfer suppressed records with discovery flag value',
    SKIP: 'Skip suppressed from discovery records',
  },
  RECORD_SOURCE: {
    SOURCE_RECORD_STORAGE: 'Source records storage',
    INVENTORY: 'Inventory',
    SOURCE_RECORD_STORAGE_AND_INVENTORY: 'Source records storage and Inventory',
  },
};

export const BEHAVIOR_SETTINGS_OPTIONS_API = {
  DELETED_RECORDS_SUPPORT: {
    PERSISTENT: 'persistent',
    NO: 'no',
    TRANSIENT: 'transient',
  },
  SUPPRESSED_RECORDS_PROCESSING: {
    TRUE: true,
    FALSE: false,
  },
  RECORD_SOURCE: {
    SOURCE_RECORD_STORAGE: 'Source record storage',
    INVENTORY: 'Inventory',
    SOURCE_RECORD_STORAGE_AND_INVENTORY: 'Source record storage and Inventory',
  },
  ERRORS_PROCESSING: {
    OK_200: '200',
    SERVER_ERROR_500: '500',
  },
};

export default {
  verifyBehaviorPane(disabled = false) {
    const hasValue = true;
    cy.expect([
      behaviorPane.exists(),
      behaviorPane.find(deletedRecordsSupportDropdown).has({ disabled, hasValue }),
      behaviorPane.find(suppressedRecordsProcessingDropdown).has({ disabled, hasValue }),
      behaviorPane.find(oaipmhErrorsProcessingDropdown).has({ disabled, hasValue }),
      behaviorPane.find(recordSourceDropdown).has({ disabled, hasValue }),
    ]);
  },

  verifyRecordSourceDropdown() {
    cy.expect([
      recordSourceDropdown.find(Option('Source records storage')).exists(),
      recordSourceDropdown.find(Option('Inventory')).exists(),
      recordSourceDropdown.find(Option('Source records storage and Inventory')).exists(),
    ]);
  },

  pickFromRecordSourceDropdown(option) {
    cy.wait(2000);
    cy.do(recordSourceDropdown.choose(option));
    cy.wait(2000);
  },

  pickSuppressedRecordsProcessing(option) {
    cy.wait(2000);
    cy.do(suppressedRecordsProcessingDropdown.choose(option));
    cy.wait(2000);
  },

  verifyRecordSourceDropdownDefaultValue(value) {
    cy.expect(recordSourceDropdown.has({ value }));
  },

  clickSave() {
    cy.do(saveButton.click());
  },

  verifySaveButton(disabled = false) {
    cy.expect(saveButton.has({ disabled }));
  },

  verifyWarningBanner(message = null) {
    if (message) {
      cy.expect(MessageBanner({ textContent: including(message) }).exists());
    } else {
      cy.expect(MessageBanner().absent());
    }
  },

  verifyBehaviorPaneWhenDisabled() {
    cy.expect([
      deletedRecordsSupportDropdownNotRequired.has({ disabled: true }),
      suppressedRecordsProcessingDropdownNotRequired.has({ disabled: true }),
      oaipmhErrorsProcessingDropdownNotRequired.has({ disabled: true }),
      recordSourceDropdownNotRequired.has({ disabled: true }),
      saveButton.has({ disabled: true }),
    ]);
  },

  verifyBehaviorPaneWhenEnabled() {
    cy.expect([
      deletedRecordsSupportDropdown.has({ disabled: false, required: true }),
      suppressedRecordsProcessingDropdown.has({ disabled: false, required: true }),
      oaipmhErrorsProcessingDropdown.has({ disabled: false, required: true }),
      recordSourceDropdown.has({ disabled: false, required: true }),
      saveButton.has({ disabled: true }),
    ]);
  },

  hoverAndVerifyTooltip(fieldName, tooltipText) {
    const fieldMap = {
      'Deleted records support*': deletedRecordsSupportDropdown,
      'Deleted records support': deletedRecordsSupportDropdownNotRequired,
      'Suppressed records processing*': suppressedRecordsProcessingDropdown,
      'Suppressed records processing': suppressedRecordsProcessingDropdownNotRequired,
      'OAI-PMH errors processing*': oaipmhErrorsProcessingDropdown,
      'OAI-PMH errors processing': oaipmhErrorsProcessingDropdownNotRequired,
      'Record source*': recordSourceDropdown,
      'Record source': recordSourceDropdownNotRequired,
    };

    cy.do(fieldMap[fieldName].hoverMouse());
    cy.expect(Tooltip({ text: tooltipText }).exists());
  },

  /**
   * Updates the OAI-PMH behavior configuration via API
   * @param {string} suppressedRecordsProcessing - How suppressed records should be processed
   *   Possible values: "true", "false"
   * @param {string} recordsSource - Source for record retrieval
   *   Possible values: "Source record storage", "Inventory", "Source record storage and Inventory"
   * @param {string} deletedRecordsSupport - How deleted records should be handled
   *   Possible values: "persistent", "no", "transient"
   * @param {string} errorsProcessing - How errors should be processed
   *   Possible values: "200", "500",
   */
  updateBehaviorConfigViaApi(
    suppressedRecordsProcessing = true,
    recordsSource = 'Source record storage',
    deletedRecordsSupport = 'persistent',
    errorsProcessing = '200',
  ) {
    const configValue = {
      suppressedRecordsProcessing,
      recordsSource,
      deletedRecordsSupport,
      errorsProcessing,
    };

    cy.getOaiPmhConfigurations('behavior').then((body) => {
      let config = body.configurationSettings[0];

      if (body.configurationSettings.length === 0) {
        config = {
          configValue,
          configName: 'behavior',
          id: uuid(),
        };

        cy.okapiRequest({
          method: 'POST',
          path: 'oai-pmh/configuration-settings',
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
          body: config,
        });
      } else {
        config.configValue = configValue;

        cy.okapiRequest({
          method: 'PUT',
          path: `oai-pmh/configuration-settings/${config.id}`,
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
          body: config,
        });
      }
    });
  },
};
