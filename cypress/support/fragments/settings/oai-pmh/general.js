import uuid from 'uuid';
import { matching, including, not } from '@interactors/html';
import {
  Checkbox,
  Pane,
  Select,
  TextArea,
  TextField,
  Button,
  MessageBanner,
  Tooltip,
} from '../../../../../interactors';

const generalPane = Pane('General');
const enableOaiServiceCheckbox = Checkbox('Enable OAI service');
const repositoryNameTextfield = TextField('Repository name*');
const repositoryNameTextfieldNoAsterisk = TextField('Repository name');
const baseUrlTextfield = TextField('Base URL*');
const baseUrlTextfieldNoAsterisk = TextField('Base URL');
const timeGranularityDropdown = Select('Time granularity');
const adminEmailTextarea = TextArea('Administrator email(s)*');
const adminEmailTextareaNoAsterisk = TextArea('Administrator email(s)');
const saveButton = Button('Save');

export const GENERAL_MESSAGES = {
  CALLOUT_SUCCESS: 'Setting was successfully updated.',
  WARNING_BANNER_DISABLED:
    'OAI service is disabled. To affect OAI-PMH features by settings please Enable OAI service.',
  TOOLTIP_DISABLED: 'To enable this field, select Enable OAI service.',
  TOOLTIP_ENABLE_OAI_SERVICE:
    'Defines whether OAI-PMH module is accessible for the FOLIO repository.',
  TOOLTIP_REPOSITORY_NAME: 'The name of the FOLIO repository for harvesters.',
  TOOLTIP_BASE_URL: 'The URL of the FOLIO repository (of the edge-oai-pmh).',
  TOOLTIP_TIME_GRANULARITY: 'The finest harvesting granularity supported by the FOLIO repository.',
  TOOLTIP_ADMIN_EMAILS:
    'The e-mail address(es) of the FOLIO repository administrator. Several e-mails should be separated by comma.',
};

export default {
  verifyGeneralPane(disabled = false) {
    cy.expect([
      generalPane.exists(),
      enableOaiServiceCheckbox.has({ disabled, checked: true }),
      repositoryNameTextfield.has({ disabled, hasValue: true }),
      baseUrlTextfield.has({ disabled, value: matching(/^(https:|http:|www\.)\S*/gm) }),
      timeGranularityDropdown.has({ disabled, hasValue: true }),
      adminEmailTextarea.has({ disabled, value: matching(/^\S+@\S+\.\S+$/gm) }),
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

  verifyGeneralPaneWhenDisabled() {
    cy.expect([
      repositoryNameTextfieldNoAsterisk.has({ disabled: true, value: '' }),
      baseUrlTextfieldNoAsterisk.has({ disabled: true, value: '' }),
      timeGranularityDropdown.has({ disabled: true, hasValue: not('') }),
      adminEmailTextareaNoAsterisk.has({ disabled: true, value: '' }),
    ]);
  },

  verifyGeneralPaneWhenEnabled() {
    cy.expect([
      enableOaiServiceCheckbox.has({ disabled: false, checked: true }),
      repositoryNameTextfield.has({ disabled: false, required: true }),
      baseUrlTextfield.has({ disabled: false, required: true }),
      timeGranularityDropdown.has({ disabled: false, required: false }),
      adminEmailTextarea.has({ disabled: false, required: true }),
      saveButton.has({ disabled: true }),
    ]);
  },

  hoverAndVerifyTooltip(fieldName, tooltipText) {
    const fieldMap = {
      'Repository name': repositoryNameTextfieldNoAsterisk,
      'Repository name*': repositoryNameTextfield,
      'Base URL': baseUrlTextfieldNoAsterisk,
      'Base URL*': baseUrlTextfield,
      'Time granularity': timeGranularityDropdown,
      'Administrator email(s)': adminEmailTextareaNoAsterisk,
      'Administrator email(s)*': adminEmailTextarea,
      'Enable OAI service': enableOaiServiceCheckbox,
    };

    cy.do(fieldMap[fieldName].hoverMouse());
    cy.expect(Tooltip({ text: tooltipText }).exists());
  },

  checkEnableOaiServiceCheckbox() {
    cy.do(enableOaiServiceCheckbox.click());
  },

  verifyCheckEnableOaiServiceCheckbox(isEnabled, isChecked) {
    cy.expect(enableOaiServiceCheckbox.has({ disabled: !isEnabled, checked: isChecked }));
  },

  clickSaveButton() {
    cy.do(saveButton.click());
  },

  /**
   * Updates the OAI-PMH service availability via API
   * @param {boolean} enableOaiService - true to enable, false to disable
   */
  updateOaiServiceAvailabilityViaApi(enableOaiService = true) {
    cy.getOaiPmhConfigurations('general').then((body) => {
      let config = body.configurationSettings[0];

      if (body.configurationSettings.length === 0) {
        config = {
          configValue: {
            enableOaiService,
          },
          configName: 'general',
          id: uuid(),
        };

        cy.okapiRequest({
          method: 'POST',
          path: 'oai-pmh/configuration-settings',
          isDefaultSearchParamsRequired: false,
          body: config,
        });
      } else {
        config.configValue.enableOaiService = enableOaiService;

        cy.okapiRequest({
          method: 'PUT',
          path: `oai-pmh/configuration-settings/${config.id}`,
          isDefaultSearchParamsRequired: false,
          body: config,
        });
      }
    });
  },
};
