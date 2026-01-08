import uuid from 'uuid';
import { Pane, Button, Select, Option } from '../../../../../interactors';

const behaviorPane = Pane('Behavior');
const deletedRecordsSupportDropdown = Select('Deleted records support');
const suppressedRecordsProcessingDropdown = Select('Suppressed records processing');
const oaipmhErrorsProcessingDropdown = Select('OAI-PMH errors processing');
const recordSourceDropdown = Select('Record source');
const saveButton = Button('Save');

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
    const newValue = `{"suppressedRecordsProcessing":"${suppressedRecordsProcessing}","recordsSource":"${recordsSource}","deletedRecordsSupport":"${deletedRecordsSupport}","errorsProcessing":"${errorsProcessing}"}`;

    cy.getConfigByName('OAIPMH', 'behavior').then((body) => {
      let config = body.configs[0];

      if (body.configs.length === 0) {
        config = {
          value: newValue,
          module: 'OAIPMH',
          configName: 'behavior',
          id: uuid(),
          enabled: true,
        };

        cy.okapiRequest({
          method: 'POST',
          path: 'configurations/entries',
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
          body: config,
        });
      } else {
        config.value = newValue;

        cy.okapiRequest({
          method: 'PUT',
          path: `configurations/entries/${config.id}`,
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
          body: config,
        });
      }
    });
  },
};
