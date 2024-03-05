import { HTML, including } from '@interactors/html';
import {
  Accordion,
  Button,
  Select,
  TextField,
  Pane,
  TextArea,
  Callout,
  Modal,
} from '../../../../../interactors';
import ModalSelectProfile from './modalSelectProfile';
import { ACCEPTED_DATA_TYPE_NAMES, PROFILE_TYPE_NAMES } from '../../../constants';

const defaultJobProfile = {
  profileName: '',
  acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
};

const getDefaultJobProfile = (name) => {
  const defaultjobProfile = {
    profile: {
      name,
      dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    },
    addedRelations: [],
    deletedRelations: [],
  };
  return defaultjobProfile;
};

const actionsButton = Button('Action');
const matchButton = Button('Match');
const saveAndCloseButton = Button('Save as profile & Close');
const overviewAccordion = Accordion('Overview');
const dataTypeSelect = Select({ name: 'profile.dataType' });
const nameField = TextField({ name: 'profile.name' });

function linkActionProfileByName(profileName) {
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
}

function linkMatchProfileForMatches(matchProfileName, forMatchesOrder = 0) {
  cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
  cy.do(matchButton.click());
  ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
  ModalSelectProfile.selectProfile(matchProfileName);
  cy.expect(overviewAccordion.find(HTML(including(matchProfileName))).exists());
}

function linkMatchProfileForSubMatches(matchProfileName, forMatchesOrder = 0) {
  cy.get('[id*="type-selector-dropdown-ROOT-MATCH"]').eq(forMatchesOrder).click();
  cy.do(matchButton.click());
  ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
  ModalSelectProfile.selectProfile(matchProfileName);
  cy.expect(overviewAccordion.find(HTML(including(matchProfileName))).exists());
}

function linkActionProfileForMatches(actionProfileName, forMatchesOrder = 0) {
  cy.wait(3000);
  cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
  cy.do(actionsButton.click());
  ModalSelectProfile.searchProfileByName(actionProfileName);
  ModalSelectProfile.selectProfile(actionProfileName);
  cy.expect(overviewAccordion.find(HTML(including(actionProfileName))).exists());
}

function linkActionProfileForSubMatches(actionProfileName, forMatchesOrder = 0) {
  cy.get('[id*="type-selector-dropdown-ROOT-MATCH-MATCH"]').eq(forMatchesOrder).click();
  cy.do(actionsButton.click());
  ModalSelectProfile.searchProfileByName(actionProfileName);
  ModalSelectProfile.selectProfile(actionProfileName);
  cy.expect(overviewAccordion.find(HTML(including(actionProfileName))).exists());
}

function waitLoading() {
  // wait for the page to be fully loaded
  cy.wait(3000);
}

export default {
  getDefaultJobProfile,
  linkActionProfileByName,
  linkMatchProfileForMatches,
  linkActionProfileForMatches,
  linkMatchProfileForSubMatches,
  linkActionProfileForSubMatches,
  waitLoading,
  defaultJobProfile,

  fillProfileName: (profileName) => cy.do(nameField.fillIn(profileName)),
  fillDescription: (description) => cy.do(TextArea({ name: 'profile.description' }).fillIn(description)),

  fillJobProfile: (specialJobProfile = defaultJobProfile) => {
    cy.do(nameField.fillIn(specialJobProfile.profileName));
    cy.expect(nameField.has({ value: specialJobProfile.profileName }));
    cy.do(Select({ name: 'profile.dataType' }).choose(specialJobProfile.acceptedType));
    cy.expect(Select({ name: 'profile.dataType' }).has({ value: specialJobProfile.acceptedType }));
  },

  linkActionProfile(specialActionProfile) {
    cy.do(
      HTML({ className: including('linker-button'), id: 'type-selector-dropdown-linker-root' })
        .find(Button())
        .click(),
    );
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(specialActionProfile.name);
    ModalSelectProfile.selectProfile(specialActionProfile.name);
    cy.expect(overviewAccordion.find(HTML(including(specialActionProfile.name))).exists());
  },

  linkMatchProfile(matchProfileName) {
    cy.do(
      HTML({ className: including('linker-button'), id: 'type-selector-dropdown-linker-root' })
        .find(Button())
        .click(),
    );
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(overviewAccordion.find(HTML(including(matchProfileName))).exists());
  },

  linkActionProfileForNonMatches(profileName, forMatchesOrder = 1) {
    // TODO move to const
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(profileName);
    ModalSelectProfile.selectProfile(profileName);
    cy.expect(overviewAccordion.find(HTML(including(profileName))).exists());
  },

  linkMatchProfileForNonMatches(profileName, forMatchesOrder = 1) {
    // TODO move to const
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(profileName, 'match');
    ModalSelectProfile.selectProfile(profileName, 'match');
    cy.expect(overviewAccordion.find(HTML(including(profileName))).exists());
  },

  linkMatchAndActionProfilesForSubMatches(
    matchProfileName,
    actionProfileName,
    forMatchesOrder = 0,
  ) {
    linkMatchProfileForMatches(matchProfileName);
    waitLoading();
    cy.get('[id*="type-selector-dropdown-ROOT-MATCH"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(actionProfileName);
    ModalSelectProfile.selectProfile(actionProfileName);
    cy.expect(overviewAccordion.find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndTwoActionProfilesForSubMatches(
    matchProfileName,
    firstActionProfileName,
    secondActionProfileName,
  ) {
    linkMatchProfileForSubMatches(matchProfileName);
    waitLoading();
    linkActionProfileForSubMatches(firstActionProfileName);
    waitLoading();
    linkActionProfileForSubMatches(secondActionProfileName);
  },

  linkMatchAndActionProfiles(matchProfileName, actionProfileName, forMatchesOrder = 0) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(overviewAccordion.find(HTML(including(matchProfileName))).exists());
    waitLoading();
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(actionProfileName);
    ModalSelectProfile.selectProfile(actionProfileName);
    cy.expect(overviewAccordion.find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndTwoActionProfiles(
    matchProfileName,
    firstActionProfileName,
    secondActionProfileName,
    forMatchesOrder = 0,
  ) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(
      Pane('New job profile')
        .find(overviewAccordion)
        .find(HTML(including(matchProfileName)))
        .exists(),
    );
    waitLoading();
    // link first action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(firstActionProfileName);
    ModalSelectProfile.selectProfile(firstActionProfileName);
    cy.expect(
      Pane('New job profile')
        .find(overviewAccordion)
        .find(HTML(including(firstActionProfileName)))
        .exists(),
    );
    waitLoading();
    // link second action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(secondActionProfileName);
    ModalSelectProfile.selectProfile(secondActionProfileName);
    cy.expect(
      Pane('New job profile')
        .find(overviewAccordion)
        .find(HTML(including(secondActionProfileName)))
        .exists(),
    );
  },

  linkMatchAndThreeActionProfiles(
    matchProfileName,
    firstActionProfileName,
    secondActionProfileName,
    thirdActionProfileName,
    forMatchesOrder = 0,
  ) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do(matchButton.click());
    ModalSelectProfile.searchProfileByName(matchProfileName, 'match');
    ModalSelectProfile.selectProfile(matchProfileName, 'match');
    cy.expect(
      Pane('New job profile')
        .find(overviewAccordion)
        .find(HTML(including(matchProfileName)))
        .exists(),
    );
    waitLoading();
    // link first action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(firstActionProfileName);
    ModalSelectProfile.selectProfile(firstActionProfileName);
    cy.expect(
      Pane('New job profile')
        .find(overviewAccordion)
        .find(HTML(including(firstActionProfileName)))
        .exists(),
    );
    waitLoading();
    // link second action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(secondActionProfileName);
    ModalSelectProfile.selectProfile(secondActionProfileName);
    cy.expect(
      Pane('New job profile')
        .find(overviewAccordion)
        .find(HTML(including(secondActionProfileName)))
        .exists(),
    );
    waitLoading();
    // link third action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(forMatchesOrder).click();
    cy.do(actionsButton.click());
    ModalSelectProfile.searchProfileByName(thirdActionProfileName);
    ModalSelectProfile.selectProfile(thirdActionProfileName);
    cy.expect(
      Pane('New job profile')
        .find(overviewAccordion)
        .find(HTML(including(thirdActionProfileName)))
        .exists(),
    );
  },

  saveAndClose: () => {
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
  },

  createJobProfileViaApi: (nameProfile, matchProfileId, actProfileId) => {
    return cy.okapiRequest({
      method: 'POST',
      path: 'data-import-profiles/jobProfiles',
      body: {
        profile: {
          name: nameProfile,
          dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        },
        addedRelations: [
          {
            masterProfileId: null,
            masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
            detailProfileId: matchProfileId,
            detailProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
            order: 0,
          },
          {
            masterProfileId: null,
            masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
            detailProfileId: actProfileId,
            detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
            order: 1,
          },
        ],
        deletedRelations: [],
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  createJobProfileWithLinkedActionProfileViaApi: (nameProfile, actProfileId) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/jobProfiles',
        body: {
          profile: {
            name: nameProfile,
            dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
          },
          addedRelations: [
            {
              masterProfileId: null,
              masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
              detailProfileId: actProfileId,
              detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
              order: 0,
            },
          ],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((responce) => {
        return responce.body.id;
      });
  },

  createJobProfileWithLinkedMatchProfileViaApi: (nameProfile, matchProfileId) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/jobProfiles',
        body: {
          profile: {
            name: nameProfile,
            dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
          },
          addedRelations: [
            {
              masterProfileId: null,
              masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
              detailProfileId: matchProfileId,
              detailProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
              order: 0,
            },
          ],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((responce) => {
        return responce.body.id;
      });
  },

  createJobProfileWithLinkedMatchAndActionProfilesViaApi: (
    nameProfile,
    matchProfileId,
    actionProfileId,
  ) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/jobProfiles',
        body: {
          profile: {
            name: nameProfile,
            dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
          },
          addedRelations: [
            {
              masterProfileId: null,
              masterWrapperId: null,
              masterProfileType: 'JOB_PROFILE',
              detailProfileId: matchProfileId,
              detailWrapperId: null,
              detailProfileType: 'MATCH_PROFILE',
              order: 0,
            },
            {
              masterProfileId: matchProfileId,
              masterWrapperId: null,
              masterProfileType: 'MATCH_PROFILE',
              detailProfileId: actionProfileId,
              detailWrapperId: null,
              detailProfileType: 'ACTION_PROFILE',
              order: 0,
              reactTo: 'MATCH',
            },
          ],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((responce) => {
        return responce.body.id;
      });
  },

  unlinkProfile: (number) => {
    cy.get('[id*="branch-ROOT-MATCH-MATCH-MATCH-editable"]')
      .eq(number)
      .find('button[icon="unlink"]')
      .click();
    cy.do(Modal({ id: 'unlink-job-profile-modal' }).find(Button('Unlink')).click());
    cy.wait(7000);
  },

  checkCalloutMessage: (message) => {
    cy.expect(Callout({ textContent: including(message) }).exists());
    cy.do(
      Callout()
        .find(Button({ icon: 'times' }))
        .click(),
    );
  },

  checkPreviouslyPopulatedDataIsDisplayed: (profile, actionProfileName) => {
    cy.expect([
      nameField.has({ value: profile.profileName }),
      dataTypeSelect.has({ value: profile.acceptedType }),
      overviewAccordion.find(HTML(including(actionProfileName))).exists(),
    ]);
  },
};
