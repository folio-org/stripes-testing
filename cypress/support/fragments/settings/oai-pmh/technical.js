import {
  Checkbox,
  Pane,
  TextField,
  Button,
  MessageBanner,
  Tooltip,
  including,
  not,
} from '../../../../../interactors';

const technicalPane = Pane('Technical');
const maxRecordPerResponseTextfield = TextField('Max records per response*');
const maxRecordPerResponseTextfieldNotRequired = TextField('Max records per response');
const enableValidationCheckbox = Checkbox('Enable validation');
const formattedOutputCheckbox = Checkbox('Formatted output');
const saveButton = Button('Save');

export const TECHNICAL_MESSAGES = {
  WARNING_BANNER_DISABLED:
    'OAI service is disabled. To affect OAI-PMH features by settings please Enable OAI service in the General section.',
  TOOLTIP_DISABLED: 'To enable this field, select Enable OAI service in the General section.',
  TOOLTIP_MAX_RECORDS: 'The maximum number of records returned in the ListRecords response.',
  TOOLTIP_ENABLE_VALIDATION:
    'Defines if the response content should be validated against xsd schemas.',
  TOOLTIP_FORMATTED_OUTPUT:
    'Defines if the marshalled XML data is formatted with line feeds and indentation.',
};

export default {
  verifyTechnicalPane(disabled = false) {
    cy.expect([
      technicalPane.exists(),
      maxRecordPerResponseTextfield.has({ disabled, hasValue: true }),
      enableValidationCheckbox.has({ disabled, checked: false }),
      formattedOutputCheckbox.has({ disabled, checked: false }),
    ]);
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

  verifyTechnicalPaneWhenDisabled() {
    cy.expect([
      maxRecordPerResponseTextfieldNotRequired.has({ disabled: true, hasValue: not('') }),
      enableValidationCheckbox.has({ disabled: true }),
      formattedOutputCheckbox.has({ disabled: true }),
      saveButton.has({ disabled: true }),
    ]);
  },

  verifyTechnicalPaneWhenEnabled() {
    cy.expect([
      maxRecordPerResponseTextfield.has({ disabled: false, required: true }),
      enableValidationCheckbox.has({ disabled: false }),
      formattedOutputCheckbox.has({ disabled: false }),
      saveButton.has({ disabled: true }),
    ]);
  },

  hoverAndVerifyTooltip(fieldName, tooltipText) {
    const fieldMap = {
      'Max records per response*': maxRecordPerResponseTextfield,
      'Max records per response': maxRecordPerResponseTextfieldNotRequired,
    };

    cy.do(fieldMap[fieldName].hoverMouse());
    cy.expect(Tooltip({ text: tooltipText }).exists());
  },

  hoverCheckboxesAndVerifyTooltip(checkboxName, isDisabled, tooltipText) {
    const checkBoxMap = {
      'Enable validation': Checkbox('Enable validation', { disabled: isDisabled }),
      'Formatted output': Checkbox('Formatted output', { disabled: isDisabled }),
    };
    cy.do(checkBoxMap[checkboxName].hoverMouse());
    cy.expect(Tooltip({ text: tooltipText }).exists());
  },

  verifyCleanErrorsIntervalInConfig(expectedValue = '30') {
    cy.intercept('GET', '/oai-pmh/configuration-settings?name=technical').as('getTechnicalConfig');
    cy.reload();
    cy.wait('@getTechnicalConfig').then((interception) => {
      const responseBody = JSON.parse(interception.response.body);
      const configValue = responseBody.configurationSettings[0].configValue;

      expect(configValue).to.have.property('cleanErrorsInterval');
      expect(configValue.cleanErrorsInterval).to.equal(expectedValue);
    });
  },
};
