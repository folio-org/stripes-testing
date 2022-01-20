import { Button, TextField, MultiColumnListCell } from '../../../../../interactors';
import newActionProfile from './newActionProfile';

const actionsButton = Button('Actions');

const openNewActionProfileForm = () => {
  cy.do([
    actionsButton.click(),
    Button('New action profile').click()
  ]);
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

export default {
  createActionProfile:(actionProfile, mappingProfile) => {
    openNewActionProfileForm();
    newActionProfile.fillActionProfile(actionProfile);
    newActionProfile.linkMappingProfile(mappingProfile);
  },

  checkActionProfilePresented: (actionProfile) => {
    cy.do(TextField({ id:'input-search-action-profiles-field' }).fillIn(actionProfile));
    cy.do(Button('Search').click());
    cy.expect(MultiColumnListCell(actionProfile).exists());
  },

  deleteActionProfile,
};
