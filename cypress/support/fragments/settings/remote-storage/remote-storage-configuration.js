import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  Select,
  TextField,
  Pane,
  MultiColumnListCell,
  Modal,
  KeyValue
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import DateTools from '../../../utils/dateTools';

const successfulCreateCalloutMessage = 'Remote storage configuration was successfully created.';
const successfulChangeCalloutMessage = 'Remote storage configuration was successfully changed.';
const successfulDeleteCalloutMessage = 'Remote storage configuration was successfully deleted.';
const configurationPane = Pane({ title: 'Configurations' });
const saveAndCloseBtn = Button('Save & close');
const saveBtn = Button('Save');
const actionsBtn = Button('Actions');
const configurationFields = {
  nameInput: TextField({ name: 'name' }),
  urlInput: TextField({ name: 'url' }),
  timingInput: TextField({ name: 'accessionDelay' })
};


function fillGeneralInfo(fileName, providerName) {
  return cy.do([
    Button('+ New').click(),
    TextField({ name: 'name' }).fillIn(fileName),
    Accordion({ label: 'General information' }).find(Select()).choose(providerName),
  ]);
}

function saveAndCloseForm() {
  return cy.do([
    saveAndCloseBtn.click(),
    saveBtn.click()
  ]);
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
      cy.do(TextField({ name: 'accessionDelay' }).fillIn('1'));
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
    cy.expect(configurationPane.find(MultiColumnListCell({ content: configuration.title })).exists());
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
      cy.do(configurationFields[param].fillIn(configuration[param]));
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
      Pane({ title: including('Edit ') }).find(Button({ icon: 'times' })).click(),
      Button('Close without saving').click(),
    ]);
  },

  closeWithSaving() {
    return cy.do(Modal().find(Button('Save')).click());
  }
};
