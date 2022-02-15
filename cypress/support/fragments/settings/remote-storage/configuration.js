import { Accordion, Button, Select, TextField, Pane, MultiColumnListCell, Modal } from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import DateTools from '../../../utils/dateTools';

const successfulCreateCalloutMessage = 'Remote storage configuration was successfully created.';
const successfulDeleteCalloutMessage = 'Remote storage configuration was successfully deleted.';
const configurationPane = Pane({ title: 'Configurations' });

function deleteRemoteStorage(name) {
  cy.do([
    MultiColumnListCell({ content: name }).click(),
    Pane({ title: name }).find(Button('Actions')).click(),
    Button({ id: 'clickable-delete-storage' }).click(),
    Modal({ title: 'Remove ' + name }).find(Button('Delete')).click()
  ]);
  InteractorsTools.checkCalloutMessage(successfulDeleteCalloutMessage);
  cy.expect(configurationPane.find(MultiColumnListCell({ content: name })).absent());
}

const providers = {
  DematicEMS: {
    title: 'Dematic EMS',
    create(name) {
      cy.do([
        Button('+ New').click(),
        TextField({ name: 'name' }).fillIn(name),
        Accordion({ label: 'General information' }).find(Select()).choose('Dematic EMS'),
        Button('Save & close').click(),
        Button('Save').click()
      ]);
      InteractorsTools.checkCalloutMessage(successfulCreateCalloutMessage);
    },
    delete(name) {
      deleteRemoteStorage(name);
    }
  },
  DematicStagingDirector: {
    title: 'Dematic StagingDirector',
    create(name) {
      cy.do([
        Button('+ New').click(),
        TextField({ name: 'name' }).fillIn(name),
        Accordion({ label: 'General information' }).find(Select()).choose('Dematic StagingDirector'),
        TextField({ name: 'accessionDelay' }).fillIn('1'),
        Button('Save & close').click(),
        Button('Save').click()
      ]);
      InteractorsTools.checkCalloutMessage(successfulCreateCalloutMessage);
    },
    delete(name) {
      deleteRemoteStorage(name);
    }
  },
  CaiaSoft: {
    title: 'CaiaSoft',
    create(name) {
      cy.do([
        Button('+ New').click(),
        TextField({ name: 'name' }).fillIn(name),
        Accordion({ label: 'General information' }).find(Select()).choose('CaiaSoft'),
        Accordion({ label: 'Accession holding workflow preference' }).find(Select()).choose('Change permanent location'),
        Accordion({ label: 'Returning workflow preference' }).find(Select()).choose('Items received at remote storage scanned into FOLIO'),
        Button('Save & close').click(),
        Button('Save').click()
      ]);
      InteractorsTools.checkCalloutMessage(successfulCreateCalloutMessage);
    },
    delete(name) {
      deleteRemoteStorage(name);
    }
  }
};

export default {
  providers,

  verifyCreatedRemoteStorage(name, provider) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');

    cy.expect(configurationPane.find(MultiColumnListCell({ content: name })).exists());
    cy.expect(configurationPane.find(MultiColumnListCell({ content: provider.title })).exists());
    cy.expect(configurationPane.find(MultiColumnListCell({ content: date })).exists());
  },

  tryToEditRemoteStorage(name) {
    const testName = 'testName123';

    return cy.do([
      MultiColumnListCell({ content: name }).click(),
      Pane({ title: name }).find(Button('Actions')).click(),
      Button({ id: 'clickable-edit-storage' }).click(),
      TextField({ name: 'name' }).fillIn(testName),
      Button('Save & close').click(),
      Modal().find(Button('Cancel')).click(),
      Pane({ title: 'Edit ' + name }).find(Button({ icon: 'times' })).click(),
      Button('Close without saving').click(),
    ]);
  },
};
