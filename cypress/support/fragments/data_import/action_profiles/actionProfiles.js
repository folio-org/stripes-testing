import { Button, TextField, MultiColumnListCell, Pane } from '../../../../../interactors';
import newActionProfile from './newActionProfile';

const actionsButton = Button('Actions');
const iconButton = Button({ icon: 'times' });
const resultsPane = Pane({ id:'pane-results' });

const openNewActionProfileForm = () => {
  cy.do([
    resultsPane.find(actionsButton).click(),
    Button('New action profile').click()
  ]);
};
const closeActionProfile = profileName => {
  cy.do(Pane({ title: profileName }).find(iconButton).click());
};

const deleteActionProfile = (profileName) => {
  // get all action profiles
  cy
    .okapiRequest({
      path: 'data-import-profiles/actionProfiles',
      searchParams: {
        query: '(cql.allRecords=1) sortby name',
        limit: 1000
      },
    })
    .then(({ body: { actionProfiles } }) => {
      // find profile to delete
      const profileToDelete = actionProfiles.find(profile => profile.name === profileName);

      // delete profile with its id
      cy
        .okapiRequest({
          method: 'DELETE',
          path: `data-import-profiles/actionProfiles/${profileToDelete.id}`,
        })
        .then(({ status }) => {
          if (status === 204) cy.log('###DELETED ACTION PROFILE###');
        });
    });
};

const searchActionProfile = (profileName) => {
  // TODO: clarify with developers what should be waited
  cy.wait(1500);
  cy.do(TextField({ id:'input-search-action-profiles-field' }).fillIn(profileName));
  cy.do(Pane('Action profiles').find(Button('Search')).click());
};

export default {
  deleteActionProfile,
  closeActionProfile,
  searchActionProfile,
  createActionProfile:(actionProfile, mappingProfileName) => {
    openNewActionProfileForm();
    newActionProfile.fillActionProfile(actionProfile);
    newActionProfile.linkMappingProfile(mappingProfileName);
  },

  checkActionProfilePresented: (profileName) => {
    searchActionProfile(profileName);
    cy.expect(MultiColumnListCell(profileName).exists());
  },

  selectActionProfile:(profileName) => {
    cy.do(MultiColumnListCell(profileName).click());
  },

  verifyActionProfileOpened:() => {
    cy.expect(resultsPane.exists());
    cy.expect(Pane({ id:'view-action-profile-pane' }).exists());
  }
};
