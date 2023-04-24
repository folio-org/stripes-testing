import { HTML, including } from '@interactors/html';
import { Accordion, Button, Select, TextField, Pane } from '../../../../../interactors';
import ModalSelectProfile from './modalSelectProfile';

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
    cy.do(TextField({ name:'profile.name' }).fillIn(specialJobProfile.profileName));
    cy.expect(TextField({ name:'profile.name' }).has({ value: specialJobProfile.profileName }));
    cy.do(Select({ name:'profile.dataType' }).choose(specialJobProfile.acceptedType));
    cy.expect(Select({ name:'profile.dataType' }).has({ value: specialJobProfile.acceptedType }));
  },

  linkActionProfileByName(profileName) {
    // TODO move to const and rewrite functions
    cy.do(HTML({ className: including('linker-button'), id:'type-selector-dropdown-linker-root' }).find(Button()).click());
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(profileName);
    ModalSelectProfile.selectProfile(profileName);
    cy.expect(Accordion('Overview').find(HTML(including(profileName))).exists());
  },

  linkActionProfile(specialActionProfile) {
    cy.do(HTML({ className: including('linker-button'), id:'type-selector-dropdown-linker-root' }).find(Button()).click());
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(specialActionProfile.name);
    ModalSelectProfile.selectProfile(specialActionProfile.name);
    cy.expect(Accordion('Overview').find(HTML(including(specialActionProfile.name))).exists());
  },

  linkMatchProfile(matchProfileName) {
    cy.do(HTML({ className: including('linker-button'), id:'type-selector-dropdown-linker-root' }).find(Button()).click());
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
  },

  linkProfileForNonMatches(actionProfileName, forMatchesOrder = 1) {
    // TODO move to const
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(actionProfileName);
    ModalSelectProfile.selectProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkActionProfileForMatches(actionProfileName, forMatchesOrder = 0) {
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(actionProfileName);
    ModalSelectProfile.selectProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchProfileForMatches(matchProfileName, forMatchesOrder = 0) {
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
  },

  linkMatchAndActionProfiles(matchProfileName, actionProfileName, forMatchesOrder = 0) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(actionProfileName);
    ModalSelectProfile.selectProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndActionProfilesForInstance(actionProfileName, matchProfileName, buttonIndex = 0) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(buttonIndex).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(actionProfileName);
    ModalSelectProfile.selectProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndActionProfilesForHoldings(actionProfileName, matchProfileName, buttonIndex = 2) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(buttonIndex).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(actionProfileName);
    ModalSelectProfile.selectProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndActionProfilesForItem(actionProfileName, matchProfileName, buttonIndex = 4) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(buttonIndex).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(actionProfileName);
    ModalSelectProfile.selectProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndTwoActionProfiles(matchProfileName, firstActionProfileName, secondActionProfileName, forMatchesOrder = 0) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(matchProfileName))).exists());
    // link first action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(firstActionProfileName);
    ModalSelectProfile.selectProfile(firstActionProfileName);
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(firstActionProfileName))).exists());
    // link second action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(secondActionProfileName);
    ModalSelectProfile.selectProfile(secondActionProfileName);
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(secondActionProfileName))).exists());
  },

  linkMatchAndThreeActionProfiles(matchProfileName, firstActionProfileName, secondActionProfileName, thirdActionProfileName, forMatchesOrder = 0) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(matchProfileName))).exists());
    // link first action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(firstActionProfileName);
    ModalSelectProfile.selectProfile(firstActionProfileName);
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(firstActionProfileName))).exists());
    // link second action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(secondActionProfileName);
    ModalSelectProfile.selectProfile(secondActionProfileName);
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(secondActionProfileName))).exists());
    // link third action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(thirdActionProfileName);
    ModalSelectProfile.selectProfile(thirdActionProfileName);
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(thirdActionProfileName))).exists());
  },

  saveAndClose: () => {
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
  },

  createMatchProfileViaApi:(nameProfile, matchProfileId, actProfileId) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/jobProfiles',
        body: {
          profile:{
            name: nameProfile,
            dataType:'MARC'
          },
          addedRelations:[{
            masterProfileId:null,
            masterProfileType:'JOB_PROFILE',
            detailProfileId:matchProfileId,
            detailProfileType:'MATCH_PROFILE',
            order:0
          },
          { masterProfileId:null,
            masterProfileType:'JOB_PROFILE',
            detailProfileId:actProfileId,
            detailProfileType:'ACTION_PROFILE',
            order:1 }],
          deletedRelations:[]
        },
        isDefaultSearchParamsRequired: false,
      });
  }
};
