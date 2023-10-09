import { including } from '@interactors/html';
import {
  Button,
  TextField,
  MultiColumnListCell,
  Pane,
  MultiColumnListRow,
  Callout,
  PaneContent,
  HTML,
} from '../../../../../interactors';
import NewActionProfile from './newActionProfile';

const actionsButton = Button('Actions');
const iconButton = Button({ icon: 'times' });
const resultsPane = Pane({ id: 'pane-results' });
const viewPane = Pane({ id: 'view-action-profile-pane' });

const openNewActionProfileForm = () => {
  cy.do([resultsPane.find(actionsButton).click(), Button('New action profile').click()]);
};
const close = (profileName) => cy.do(Pane({ title: profileName }).find(iconButton).click());

const deleteActionProfile = (profileName) => {
  // get all action profiles
  cy.okapiRequest({
    path: 'data-import-profiles/actionProfiles',
    searchParams: {
      query: '(cql.allRecords=1) sortby name',
      limit: 1000,
    },
  }).then(({ body: { actionProfiles } }) => {
    // find profile to delete
    const profileToDelete = actionProfiles.find((profile) => profile.name === profileName);

    // delete profile with its id
    cy.okapiRequest({
      method: 'DELETE',
      path: `data-import-profiles/actionProfiles/${profileToDelete.id}`,
    }).then(({ status }) => {
      if (status === 204) cy.log('###DELETED ACTION PROFILE###');
    });
  });
};

const search = (profileName) => {
  // TODO: clarify with developers what should be waited
  cy.wait(1500);
  cy.do(TextField({ id: 'input-search-action-profiles-field' }).fillIn(profileName));
  cy.do(Pane('Action profiles').find(Button('Search')).click());
};

export default {
  deleteActionProfile,
  close,
  search,
  waitLoading: () => cy.expect(MultiColumnListRow({ index: 0 }).exists()),
  create: (actionProfile, mappingProfileName) => {
    openNewActionProfileForm();
    NewActionProfile.fill(actionProfile);
    NewActionProfile.linkMappingProfile(mappingProfileName);
  },

  selectActionProfileFromList: (profileName) => cy.do(MultiColumnListCell(profileName).click()),

  checkActionProfilePresented: (profileName) => {
    search(profileName);
    cy.expect(MultiColumnListCell(profileName).exists());
  },

  verifyActionProfileOpened: () => {
    cy.expect(resultsPane.exists());
    cy.expect(viewPane.exists());
  },

  checkCalloutMessage: (profileName) => {
    cy.expect(
      Callout({
        textContent: including(`The action profile "${profileName}" was successfully updated`),
      }).exists(),
    );
  },

  checkCreateProfileCalloutMessage: (profileName) => {
    cy.expect(
      Callout({
        textContent: including(`The action profile "${profileName}" was successfully created`),
      }).exists(),
    );
  },

  createWithoutLinkedMappingProfile: (actionProfile) => {
    openNewActionProfileForm();
    NewActionProfile.fill(actionProfile);
    cy.do(Button('Save as profile & Close').click());
  },

  checkListOfExistingProfilesIsDisplayed: () => cy.expect(PaneContent({ id: 'pane-results-content' }).exists()),
  verifyActionMenuAbsent: () => cy.expect(resultsPane.find(actionsButton).absent()),
  verifyActionProfileAbsent: () => cy.expect(resultsPane.find(HTML(including('The list contains no items'))).exists()),
};
