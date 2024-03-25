import { HTML, including } from '@interactors/html';
import { Accordion, Button, Form, Modal, TextField, matching } from '../../../../../interactors';
import ModalSelectProfile from './modalSelectProfile';
import InteractorsTools from '../../../utils/interactorsTools';
import Notifications from '../../settings/dataImport/notifications';

const saveAndCloseButton = Button('Save as profile & Close');
const actionsButton = Button('Action');
const overviewAccordion = Accordion('Overview');

export default {
  verifyScreenName: (profileName) => cy.expect(Form(including(`Edit ${profileName}`)).exists()),
  changeProfileName: (profileName) => cy.do(TextField({ name: 'profile.name' }).fillIn(profileName)),
  saveAndClose: () => {
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
  },
  linkActionProfileByName: (profileName) => {
    // TODO move to const and rewrite functions
    cy.do(
      HTML({ className: including('linker-button'), id: 'type-selector-dropdown-linker-root' })
        .find(Button())
        .click(),
    );
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(profileName);
    ModalSelectProfile.selectProfile(profileName);
    cy.expect(overviewAccordion.find(HTML(including(profileName))).exists());
  },
  unlinkProfile: (number) => {
    cy.get('[id*="branch-ROOT-MATCH-MATCH-MATCH-editable"]')
      .eq(number)
      .find('button[icon="unlink"]')
      .click();
    cy.do(Modal({ id: 'unlink-job-profile-modal' }).find(Button('Unlink')).click());
  },
  unlinkActionsProfile: (number) => {
    cy.get('[id*="branch-ROOT-editable"]').eq(number).find('button[icon="unlink"]').click();
    cy.do(Modal({ id: 'unlink-job-profile-modal' }).find(Button('Unlink')).click());
  },
  unlinkMatchProfile: (number) => {
    cy.get('[id*="branch-ROOT-MATCH-editable"]').eq(number).find('button[icon="unlink"]').click();
    cy.do(Modal({ id: 'unlink-job-profile-modal' }).find(Button('Unlink')).click());
  },
  unlinkNonMatchProfile: (number) => {
    cy.get('[id*="branch-ROOT-NON_MATCH-editable"]')
      .eq(number)
      .find('button[icon="unlink"]')
      .click();
    cy.do(Modal({ id: 'unlink-job-profile-modal' }).find(Button('Unlink')).click());
  },
  verifyLinkedProfiles(arrayOfProfileNames, numberOfProfiles) {
    const profileNames = [];

    cy.get('[id*="branch-ROOT-editable"]')
      .each(($element) => {
        cy.wrap($element)
          .invoke('text')
          .then((name) => {
            profileNames.push(name);
          });
      })
      .then(() => {
        // Iterate through each element in profileNames
        for (let i = 0; i < profileNames.length; i++) {
          expect(profileNames[i]).to.include(arrayOfProfileNames[i]);
        }
        expect(numberOfProfiles).to.equal(profileNames.length);
      });
  },
  verifyCalloutMessage: () => {
    InteractorsTools.checkCalloutMessage(
      matching(new RegExp(Notifications.jobProfileCreatedSuccessfully)),
    );
  },
};
