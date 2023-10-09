import uuid from 'uuid';
import { REMOTE_STORAGE_PROVIDER_NAMES } from '../../../constants';
import {
  Accordion,
  Button,
  Select,
  TextField,
  Pane,
  MultiColumnListCell,
  Modal,
  KeyValue,
  HTML,
  Option,
  including,
} from '../../../../../interactors';
import Mappings from './mappings';
import getRandomPostfix from '../../../utils/stringTools';
import InteractorsTools from '../../../utils/interactorsTools';
import DateTools from '../../../utils/dateTools';

const successfulCreateCalloutMessage = 'Remote storage configuration was successfully created.';
const successfulChangeCalloutMessage = 'Remote storage configuration was successfully changed.';
const successfulDeleteCalloutMessage = 'Remote storage configuration was successfully deleted.';
const configurationPane = Pane({ title: 'Configurations' });
const editConfigurationPane = Pane({ title: including('Edit ') });
const dataSynchronizationSettingsAccordion = Accordion('Data synchronization settings');
const saveAndCloseBtn = Button('Save & close');
const saveBtn = Button('Save');
const cancelButton = Button('Cancel');
const confirmationModal = Modal({ id: 'save-confirmation-modal' });
const actionsBtn = Button('Actions');
const xButton = Button({ icon: 'times' });
const newButton = Button('+ New');
const editConfigurationButton = Button({ id: 'clickable-edit-storage' });
const generalInformationAccordion = Accordion({ label: 'General information' });
const accessionHoldingWorkflowPreferenceAccordion = Accordion({
  label: 'Accession holding workflow preference',
});
const returningWorkflowPreferenceAccordion = Accordion({
  label: 'Returning workflow preference',
});
const configurationFields = {
  nameInput: TextField({ name: 'name' }),
  urlInput: TextField({ name: 'url' }),
  timingInput: TextField({ name: 'accessionDelay' }),
  provider: Select({ name: 'providerName' }),
  accessionHoldingWorkflow: accessionHoldingWorkflowPreferenceAccordion.find(Select()),
  returningWorkflow: returningWorkflowPreferenceAccordion.find(Select()),
};

function fillGeneralInfo(fileName, providerName) {
  cy.do([
    configurationFields.nameInput.fillIn(fileName),
    generalInformationAccordion.find(Select()).choose(including(providerName)),
  ]);
}

function saveAndCloseForm() {
  cy.do([saveAndCloseBtn.click(), saveBtn.click()]);
  // time for saving on back-end side
  cy.wait(2000);
}

function openCreateConfigurationForm() {
  cy.do(newButton.click());
}

const configurations = {
  DematicEMS: {
    title: REMOTE_STORAGE_PROVIDER_NAMES.Dematic_EMS,
    create(name) {
      openCreateConfigurationForm();
      fillGeneralInfo(name, this.title);
      saveAndCloseForm();
    },
    fillRequiredFields(name) {
      fillGeneralInfo(name, this.title);
    },
  },
  DematicStagingDirector: {
    title: REMOTE_STORAGE_PROVIDER_NAMES.DDEMATIC_STAGING_DIRECTOR,
    create(name) {
      openCreateConfigurationForm();
      this.fillRequiredFields(name);
      saveAndCloseForm();
    },
    fillRequiredFields(name, timing = '1') {
      fillGeneralInfo(name, this.title);
      cy.do(configurationFields.timingInput.fillIn(timing));
    },
    verifyRequiredFields(name, timing = '1') {
      cy.expect([
        configurationFields.nameInput.has({ value: name }),
        configurationFields.timingInput.has({ value: timing }),
      ]);
    },
  },
  CaiaSoft: {
    title: REMOTE_STORAGE_PROVIDER_NAMES.CAIA_SOFT,
    // values of options to check selected item
    returningWorkflowValues: {
      'Items received at remote storage scanned into FOLIO': 'Scanned to folio',
      'Items received at remote storage scanned into CaiaSoft': 'Scanned to CaiaSoft',
    },
    create(name) {
      openCreateConfigurationForm();
      this.fillRequiredFields(name);
      saveAndCloseForm();
    },
    fillRequiredFields(
      name,
      accessionHoldingWorkflow = 'Change permanent location',
      returningWorkflow = 'Items received at remote storage scanned into FOLIO',
    ) {
      fillGeneralInfo(name, this.title);
      cy.do([
        configurationFields.accessionHoldingWorkflow.choose(accessionHoldingWorkflow),
        configurationFields.returningWorkflow.choose(returningWorkflow),
      ]);
    },
    verifyRequiredFields(
      name,
      accessionHoldingWorkflow = 'Change permanent location',
      returningWorkflow = 'Items received at remote storage scanned into FOLIO',
    ) {
      cy.expect([
        configurationFields.nameInput.has({ value: name }),
        configurationFields.accessionHoldingWorkflow.has({
          value: accessionHoldingWorkflow,
        }),
        configurationFields.returningWorkflow.has({
          value: this.returningWorkflowValues[returningWorkflow],
        }),
      ]);
    },
  },
};

const getDefaultConfiguration = ({ id = uuid(), providerName = 'CAIA_SOFT' } = {}) => ({
  id,
  providerName,
  name: `autotest_${providerName}_${getRandomPostfix()}`,
  accessionWorkflowDetails: 'Change permanent location',
  returningWorkflowDetails: 'Scanned to folio',
});

export default {
  configurations,
  openCreateConfigurationForm,

  waitLoading() {
    cy.expect(Pane('Configurations').exists());
  },
  createViaApi(configuration = getDefaultConfiguration()) {
    return cy
      .okapiRequest({
        path: 'remote-storage/configurations',
        body: configuration,
        method: 'POST',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
  deleteViaApi(configurationId) {
    return cy.okapiRequest({
      path: `remote-storage/configurations/${configurationId}`,
      method: 'DELETE',
      isDefaultSearchParamsRequired: false,
    });
  },
  createConfigurationWithMapping({ folioLocationId } = {}) {
    const configuration = getDefaultConfiguration();
    this.createViaApi(configuration).then(({ id: configurationId }) => {
      Mappings.createViaApi({ configurationId, folioLocationId });
    });

    return configuration;
  },
  deleteRemoteStorage(name) {
    cy.do([
      MultiColumnListCell({ content: name }).click(),
      Pane({ title: name }).find(actionsBtn).click(),
      Button({ id: 'clickable-delete-storage' }).click(),
      Modal({ title: `Remove ${name}` })
        .find(Button('Delete'))
        .click(),
    ]);
    InteractorsTools.checkCalloutMessage(successfulDeleteCalloutMessage);
    cy.expect(configurationPane.find(MultiColumnListCell({ content: name })).absent());
  },

  verifyCreatedConfiguration(name, configuration) {
    InteractorsTools.checkCalloutMessage(successfulCreateCalloutMessage);

    const date = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');

    cy.expect(configurationPane.find(MultiColumnListCell({ content: name })).exists());
    cy.expect(
      configurationPane
        .find(MultiColumnListCell({ content: including(configuration.title) }))
        .exists(),
    );
    cy.expect(configurationPane.find(MultiColumnListCell({ content: date })).exists());
  },

  editConfiguration(name, configuration) {
    // configuration keys must equals configurationFields keys
    // example { nameInput: 'test', urlInput: 'test', timingInput: '1' }
    this.opentEditConfigurationForm(name);

    for (const param in configuration) {
      if (
        param === 'provider' ||
        param === 'accessionHoldingWorkflow' ||
        param === 'returningWorkflow'
      ) {
        cy.do(configurationFields[param].choose(including(configuration[param])));
      } else {
        cy.do(configurationFields[param].fillIn(configuration[param]));
      }
    }
    cy.do(saveAndCloseBtn.click());
  },

  verifyEditedConfiguration(name, configuration) {
    // configuration keys must equals configurationFields keys
    // example { nameInput: 'test', urlInput: 'test', timingInput: '1' }
    InteractorsTools.checkCalloutMessage(successfulChangeCalloutMessage);

    const paneWithConfiguration = Pane({ title: name });

    cy.do(MultiColumnListCell({ content: name }).click());

    for (const param in configuration) {
      if (param === 'timingInput') {
        cy.expect(
          paneWithConfiguration
            .find(KeyValue({ value: including(`Runs every ${configuration.timingInput} min`) }))
            .exists(),
        );
      } else {
        cy.expect(paneWithConfiguration.find(KeyValue({ value: configuration[param] })).exists());
      }
    }
  },

  closeWithoutSaving() {
    return cy.do([
      Modal().find(Button('Cancel')).click(),
      editConfigurationPane.find(xButton).click(),
    ]);
  },

  closeCreateConfigurationWithoutSaving() {
    return cy.do([
      Pane('Create configuration').find(xButton).click(),
      Modal('Are you sure?').find(Button('Close without saving')).click(),
    ]);
  },

  closeWithSaving() {
    return cy.do(Modal().find(Button('Save')).click());
  },

  verifyCaiaSoftWarning() {
    cy.expect(
      HTML(
        'CaiaSoft Accession tables are available after remote storage has been configured.',
      ).exists(),
    );
  },

  verifyDataSynchronizationSettingsAccordion(exists) {
    if (exists) cy.expect(dataSynchronizationSettingsAccordion.exists());
    else cy.expect(dataSynchronizationSettingsAccordion.absent());
  },

  verifyProviderDataSynchronizationSettings() {
    cy.do(newButton.click());
    Object.keys(configurations).forEach((key) => {
      cy.do([
        generalInformationAccordion.find(Select()).choose(including(configurations[key].title)),
      ]);
      if (configurations[key].title === 'Dematic StagingDirector') this.verifyDataSynchronizationSettingsAccordion(true);
      else this.verifyDataSynchronizationSettingsAccordion(false);
    });
    this.closeCreateConfigurationWithoutSaving();
  },
  checkProviderNameDropdownValues() {
    cy.do(configurationFields.provider.click());
    Object.values(REMOTE_STORAGE_PROVIDER_NAMES).forEach((name) => {
      cy.expect(configurationFields.provider.find(Option(name)).exists());
    });
  },
  clickSaveAndCloseThenCheck() {
    cy.do(saveAndCloseBtn.click());
    cy.expect([
      confirmationModal.exists(),
      confirmationModal.has({
        content: including('Are you sure you want to create the remote storage configuration?'),
      }),
      confirmationModal.find(saveBtn).exists(),
      confirmationModal.find(cancelButton).exists(),
    ]);
  },
  cancelConfirmation() {
    cy.do(confirmationModal.find(cancelButton).click());
  },
  confirmCreateRemoteStorage() {
    cy.do(confirmationModal.find(saveBtn).click());
  },
  opentEditConfigurationForm(name) {
    cy.do([
      MultiColumnListCell({ content: name }).click(),
      Pane({ title: name }).find(actionsBtn).click(),
      editConfigurationButton.click(),
    ]);
  },
  closeEditConfiguration() {
    cy.do([editConfigurationPane.find(xButton).click()]);
  },
};
