import { Accordion, Button, HTML, including, Select, TextField, Pane } from '../../../../../interactors';
import ModalSelectActionProfile from './modalSelectActionProfile';

const acceptedDataType = {
  marc:'MARC',
  edifact:'EDIFACT'
};

const defaultJobProfile = {
  profileName:  '',
  acceptedType: acceptedDataType.marc,
};

const actionsButton = Button('Action');
const matchButton = Button('Match');
const saveAndCloseButton = Button('Save as profile & Close');

export default {
  defaultJobProfile,

  acceptedDataType,

  fillJobProfile: (specialJobProfile = defaultJobProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialJobProfile.profileName),
      Select({ name:'profile.dataType' }).choose(specialJobProfile.acceptedType),
    ]);
  },

  linkActionProfile(specialActionProfile) {
    cy.do(HTML({ className: including('linker-button'), id:'type-selector-dropdown-linker-root' }).find(Button()).click());
    cy.do(actionsButton.click());
    ModalSelectActionProfile.searchActionProfileByName(specialActionProfile.name);
    ModalSelectActionProfile.selectActionProfile(specialActionProfile.name);
    cy.expect(Accordion('Overview').find(HTML(including(specialActionProfile.name))).exists());
  },

  linkMatchAndActionProfiles(matchProfileName, actionProfileName, forMatchesOrder = 0) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectActionProfile.searchActionProfileByName(matchProfileName, 'match');
    ModalSelectActionProfile.selectActionProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectActionProfile.searchActionProfileByName(actionProfileName);
    ModalSelectActionProfile.selectActionProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndActionProfilesForInstance(actionProfileName, matchProfileName, buttonIndex = 0) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectActionProfile.searchActionProfileByName(matchProfileName, 'match');
    ModalSelectActionProfile.selectActionProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(buttonIndex).click();
    cy.do(actionsButton.click());
    ModalSelectActionProfile.searchActionProfileByName(actionProfileName);
    ModalSelectActionProfile.selectActionProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndActionProfilesForHoldings(actionProfileName, matchProfileName) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectActionProfile.searchActionProfileByName(matchProfileName, 'match');
    ModalSelectActionProfile.selectActionProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(2).click();
    cy.do(actionsButton.click());
    ModalSelectActionProfile.searchActionProfileByName(actionProfileName);
    ModalSelectActionProfile.selectActionProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndActionProfilesForItem(actionProfileName, matchProfileName) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectActionProfile.searchActionProfileByName(matchProfileName, 'match');
    ModalSelectActionProfile.selectActionProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(4).click();
    cy.do(actionsButton.click());
    ModalSelectActionProfile.searchActionProfileByName(actionProfileName);
    ModalSelectActionProfile.selectActionProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndTwoActionProfiles(matchProfileName, firstActionProfileName, secondActionProfileName, forMatchesOrder = 0) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectActionProfile.searchActionProfileByName(matchProfileName, 'match');
    ModalSelectActionProfile.selectActionProfile(matchProfileName, 'match');
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(matchProfileName))).exists());
    // link first action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectActionProfile.searchActionProfileByName(firstActionProfileName);
    ModalSelectActionProfile.selectActionProfile(firstActionProfileName);
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(firstActionProfileName))).exists());
    // link second action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectActionProfile.searchActionProfileByName(secondActionProfileName);
    ModalSelectActionProfile.selectActionProfile(secondActionProfileName);
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(secondActionProfileName))).exists());
  },

  saveAndClose: () => {
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
  },
};
