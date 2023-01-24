import { Button, TextField, MultiColumnListCell, Pane } from '../../../../../interactors';
import newActionProfile from './newActionProfile';

const actionsButton = Button('Actions');
const iconButton = Button({ icon: 'times' });

const openNewActionProfileForm = () => {
  cy.do([
    Pane({ id:'pane-results' }).find(actionsButton).click(),
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
        limit: 2000
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

export default {
  createActionProfile:(actionProfile, mappingProfileName) => {
    openNewActionProfileForm();
    newActionProfile.fillActionProfile(actionProfile);
    newActionProfile.linkMappingProfile(mappingProfileName);
  },

  checkActionProfilePresented: (actionProfileName) => {
    // TODO: clarify with developers what should be waited
    cy.wait(1500);
    cy.do(TextField({ id:'input-search-action-profiles-field' }).fillIn(actionProfileName));
    cy.do(Pane('Action profiles').find(Button('Search')).click());
    cy.expect(MultiColumnListCell(actionProfileName).exists());
  },

  deleteActionProfile,
  closeActionProfile,
};
