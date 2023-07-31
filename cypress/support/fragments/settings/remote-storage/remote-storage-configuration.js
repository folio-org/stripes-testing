import { HTML, including } from '@interactors/html';
import {
  Accordion,
  Button,
  Select,
  TextField,
  Pane,
  MultiColumnListCell,
  Modal,
  KeyValue, MultiColumnListHeader
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import DateTools from '../../../utils/dateTools';

const successfulCreateCalloutMessage = 'Remote storage configuration was successfully created.';
const successfulChangeCalloutMessage = 'Remote storage configuration was successfully changed.';
const successfulDeleteCalloutMessage = 'Remote storage configuration was successfully deleted.';
const configurationPane = Pane({ title: 'Configurations' });
const dataSynchronizationSettingsAccordion = Accordion('Data synchronization settings');
const saveAndCloseBtn = Button('Save & close');
const saveBtn = Button('Save');
const actionsBtn = Button('Actions');
const xButton = Button({ icon: 'times' });
const newButton = Button('+ New');
const generalInformationAccordion = Accordion({ label: 'General information' });
const configurationFields = {
  nameInput: TextField({ name: 'name' }),
  urlInput: TextField({ name: 'url' }),
  timingInput: TextField({ name: 'accessionDelay' }),
  provider: Select({ name: 'providerName' }),
};


function fillGeneralInfo(fileName, providerName) {
  return cy.do([
    newButton.click(),
    configurationFields.nameInput.fillIn(fileName),
    generalInformationAccordion.find(Select()).choose(including(providerName)),
  ]);
}

function saveAndCloseForm() {
  cy.do([
    saveAndCloseBtn.click(),
    saveBtn.click()
  ]);
  // time for saving on back-end side
  cy.wait(2000);
}

const configurations = {
  DematicEMS: {
    title: 'Dematic EMS',
    create(name) {
      fillGeneralInfo(name, this.title);
      saveAndCloseForm();
    }
  },
  DematicStagingDirector: {
    title: 'Dematic StagingDirector',
    create(name) {
      fillGeneralInfo(name, this.title);
      cy.do(configurationFields.timingInput.fillIn('1'));
      saveAndCloseForm();
    }
  },
  CaiaSoft: {
    title: 'CaiaSoft',
    create(name) {
      fillGeneralInfo(name, this.title);
      cy.do([
        Accordion({ label: 'Accession holding workflow preference' }).find(Select()).choose('Change permanent location'),
        Accordion({ label: 'Returning workflow preference' }).find(Select()).choose('Items received at remote storage scanned into FOLIO'),
      ]);
      saveAndCloseForm();
    }
  }
};

export default {
  configurations,

  waitLoading() {
    cy.expect(Pane('Remote storage').exists());
  },

  deleteRemoteStorage(name) {
    cy.do([
      MultiColumnListCell({ content: name }).click(),
      Pane({ title: name }).find(actionsBtn).click(),
      Button({ id: 'clickable-delete-storage' }).click(),
      Modal({ title: `Remove ${name}` }).find(Button('Delete')).click()
    ]);
    InteractorsTools.checkCalloutMessage(successfulDeleteCalloutMessage);
    cy.expect(configurationPane.find(MultiColumnListCell({ content: name })).absent());
  },

  verifyCreatedConfiguration(name, configuration) {
    InteractorsTools.checkCalloutMessage(successfulCreateCalloutMessage);

    const date = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');

    cy.expect(configurationPane.find(MultiColumnListCell({ content: name })).exists());
    cy.expect(configurationPane.find(MultiColumnListCell({ content: including(configuration.title) })).exists());
    cy.expect(configurationPane.find(MultiColumnListCell({ content: date })).exists());
  },

  editConfiguration(name, configuration) {
    // configuration keys must equals configurationFields keys
    // example { nameInput: 'test', urlInput: 'test', timingInput: '1' }
    cy.do([
      MultiColumnListCell({ content: name }).click(),
      Pane({ title: name }).find(actionsBtn).click(),
      Button({ id: 'clickable-edit-storage' }).click(),
    ]);

    for (const param in configuration) {
      if (param === 'provider') {
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
        cy.expect(paneWithConfiguration.find(KeyValue({ value: including(`Runs every ${configuration.timingInput} min`) })).exists());
      } else {
        cy.expect(paneWithConfiguration.find(KeyValue({ value: configuration[param] })).exists());
      }
    }
  },

  closeWithoutSaving() {
    return cy.do([
      Modal().find(Button('Cancel')).click(),
      Pane({ title: including('Edit ') }).find(xButton).click()
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
    cy.expect(HTML('CaiaSoft Accession tables are available after remote storage has been configured.').exists());
  },

  verifyAccessionTablePane() {
    cy.expect([
      MultiColumnListHeader('Original location').exists(),
      MultiColumnListHeader('Final location (Remote)').exists(),
      MultiColumnListHeader('Actions').exists(),
    ]);
  },

  verifyDataSynchronizationSettingsAccordion(exists) {
    if (exists) cy.expect(dataSynchronizationSettingsAccordion.exists());
    else cy.expect(dataSynchronizationSettingsAccordion.absent())
  },

  verifyProviderDataSynchronizationSettings() {
    cy.do(newButton.click());
    Object.keys(configurations).forEach(key => {
      cy.do([
        generalInformationAccordion.find(Select()).choose(including(configurations[key].title))
      ]);
      if (configurations[key].title === 'Dematic StagingDirector') this.verifyDataSynchronizationSettingsAccordion(true);
      else this.verifyDataSynchronizationSettingsAccordion(false);
    });
    this.closeCreateConfigurationWithoutSaving();
  },
};
