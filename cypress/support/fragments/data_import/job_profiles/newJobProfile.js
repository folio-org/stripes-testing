import { HTML, including } from '@interactors/html';
import { Accordion, Button, Select, TextField, Pane } from '../../../../../interactors';
import ModalSelectProfile from './modalSelectProfile';
import { ACCEPTED_DATA_TYPE_NAMES, PROFILE_TYPE_NAMES } from '../../../constants';

const defaultJobProfile = {
  profileName:  '',
  acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC
};

const getDefaultJobProfile = (name) => {
  const defaultjobProfile = {
    profile: {
      name,
      dataType: ACCEPTED_DATA_TYPE_NAMES.MARC
    },
    addedRelations: [],
    deletedRelations: []
  };
  return defaultjobProfile;
};

const actionsButton = Button('Action');
const matchButton = Button('Match');
const saveAndCloseButton = Button('Save as profile & Close');

function linkActionProfileByName(profileName) {
  // TODO move to const and rewrite functions
  cy.do(HTML({ className: including('linker-button'), id:'type-selector-dropdown-linker-root' }).find(Button()).click());
  cy.do(actionsButton.click());
  ModalSelectProfile.searchProfileByName(profileName);
  ModalSelectProfile.selectProfile(profileName);
  cy.expect(Accordion('Overview').find(HTML(including(profileName))).exists());
}

function linkMatchProfileForMatches(matchProfileName, forMatchesOrder = 0) {
  cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
  cy.do(matchButton.click());
  ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
  ModalSelectProfile.selectProfile(matchProfileName);
  cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
}

function linkMatchProfileForSubMatches(matchProfileName, forMatchesOrder = 0) {
  cy.get('[id*="type-selector-dropdown-ROOT-MATCH"]').eq(forMatchesOrder).click();
  cy.do(matchButton.click());
  ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
  ModalSelectProfile.selectProfile(matchProfileName);
  cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
}

function linkActionProfileForMatches(actionProfileName, forMatchesOrder = 0) {
  cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
  cy.do(actionsButton.click());
  ModalSelectProfile.searchProfileByName(actionProfileName);
  ModalSelectProfile.selectProfile(actionProfileName);
  cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
}

function linkActionProfileForSubMatches(actionProfileName, forMatchesOrder = 0) {
  cy.get('[id*="type-selector-dropdown-ROOT-MATCH-MATCH"]').eq(forMatchesOrder).click();
  cy.do(actionsButton.click());
  ModalSelectProfile.searchProfileByName(actionProfileName);
  ModalSelectProfile.selectProfile(actionProfileName);
  cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
}

export default {
  getDefaultJobProfile,
  linkActionProfileByName,
  linkMatchProfileForMatches,
  linkActionProfileForMatches,
  linkMatchProfileForSubMatches,
  linkActionProfileForSubMatches,
  defaultJobProfile,

  fillJobProfile: (specialJobProfile = defaultJobProfile) => {
    cy.do(TextField({ name:'profile.name' }).fillIn(specialJobProfile.profileName));
    cy.expect(TextField({ name:'profile.name' }).has({ value: specialJobProfile.profileName }));
    cy.do(Select({ name:'profile.dataType' }).choose(specialJobProfile.acceptedType));
    cy.expect(Select({ name:'profile.dataType' }).has({ value: specialJobProfile.acceptedType }));
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

  linkProfileForNonMatches(profileName, forMatchesOrder = 1) {
    // TODO move to const
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(profileName);
    ModalSelectProfile.selectProfile(profileName);
    cy.expect(Accordion('Overview').find(HTML(including(profileName))).exists());
  },

  linkMatchAndActionProfilesForSubMatches(matchProfileName, actionProfileName, forMatchesOrder = 0) {
    linkMatchProfileForMatches(matchProfileName);
    cy.wait(3000);
    cy.get('[id*="type-selector-dropdown-ROOT-MATCH"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(actionProfileName);
    ModalSelectProfile.selectProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndTwoActionProfilesForSubMatches(matchProfileName, firstActionProfileName, secondActionProfileName) {
    linkMatchProfileForSubMatches(matchProfileName);
    cy.wait(3000);
    linkActionProfileForSubMatches(firstActionProfileName);
    cy.wait(3000);
    linkActionProfileForSubMatches(secondActionProfileName);
  },

  linkMatchAndActionProfiles(matchProfileName, actionProfileName, forMatchesOrder = 0) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    cy.wait(3000);
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
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
    cy.wait(3000);
    // link first action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(firstActionProfileName);
    ModalSelectProfile.selectProfile(firstActionProfileName);
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(firstActionProfileName))).exists());
    cy.wait(3000);
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
    cy.wait(3000);
    // link first action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(firstActionProfileName);
    ModalSelectProfile.selectProfile(firstActionProfileName);
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(firstActionProfileName))).exists());
    cy.wait(3000);
    // link second action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(secondActionProfileName);
    ModalSelectProfile.selectProfile(secondActionProfileName);
    cy.expect(Pane('New job profile').find(Accordion('Overview')).find(HTML(including(secondActionProfileName))).exists());
    cy.wait(3000);
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

  createJobProfileViaApi:(nameProfile, matchProfileId, actProfileId) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/jobProfiles',
        body: {
          profile:{
            name: nameProfile,
            dataType: ACCEPTED_DATA_TYPE_NAMES.MARC
          },
          addedRelations:[{
            masterProfileId:null,
            masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
            detailProfileId:matchProfileId,
            detailProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
            order:0
          },
          { masterProfileId:null,
            masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
            detailProfileId:actProfileId,
            detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
            order:1 }],
          deletedRelations:[]
        },
        isDefaultSearchParamsRequired: false,
      });
  },

  createJobProfileWithLinkedActionProfileViaApi:(nameProfile, actProfileId) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/jobProfiles',
        body: {
          profile:{
            name: nameProfile,
            dataType: ACCEPTED_DATA_TYPE_NAMES.MARC
          },
          addedRelations:[
            { masterProfileId:null,
              masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
              detailProfileId:actProfileId,
              detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
              order:0 }],
          deletedRelations:[]
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((responce) => {
        return responce.body.id;
      });
  }
};
