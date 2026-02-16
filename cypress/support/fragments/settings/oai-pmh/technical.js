import { Checkbox, Pane, TextField, Button } from '../../../../../interactors';

const technicalPane = Pane('Technical');
const maxRecordPerResponseTextfield = TextField('Max records per response*');
const enableValidationCheckbox = Checkbox('Enable validation');
const formattedOutputCheckbox = Checkbox('Formatted output');
const saveButton = Button('Save');

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
