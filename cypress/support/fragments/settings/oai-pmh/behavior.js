import uuid from 'uuid';
import { Pane, Button, Select, Option } from '../../../../../interactors';

const behaviorPane = Pane('Behavior');
const deletedRecordsSupportDropdown = Select('Deleted records support');
const suppressedRecordsProcessingDropdown = Select('Suppressed records processing');
const oaipmhErrorsProcessingDropdown = Select('OAI-PMH errors processing');
const recordSourceDropdown = Select('Record source');
const saveButton = Button('Save');

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
    suppressedRecordsProcessing,
    recordsSource,
    deletedRecordsSupport,
    errorsProcessing,
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
