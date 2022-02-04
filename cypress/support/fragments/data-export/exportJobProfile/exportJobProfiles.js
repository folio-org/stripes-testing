import { Button } from '../../../../../interactors';
import exportNewJobProfile from './exportNewJobProfile';

const openNewJobProfileForm = () => {
  cy.do(Button('New').click());
};

const deleteJobProfile = (profileName) => {
  // get all job profiles
  cy
    .okapiRequest({
      path: 'data-importexport-profiles/jobProfiles',
      searchParams: {
        query:'cql.allRecords=1   ',
        limit: 1000
      },
    })
    .then(({ body: { jobProfiles } }) => {
      // find profile to delete
      const profileToDelete = jobProfiles.find(profile => profile.name === profileName);

      // delete profile with its id
      cy
        .okapiRequest({
          method: 'DELETE',
          path: `data-export-profiles/jobProfiles/${profileToDelete.id}`,
          searchParams: {
            query:'cql.allRecords=1   sortBy name',
          },
        })
        .then(({ status }) => {
          if (status === 204) cy.log('###DELETED JOB PROFILE###');
        });
    });
};

export default {
  createJobProfile:(profileName, mappingProfile) => {
    openNewJobProfileForm();
    exportNewJobProfile.fillJobProfile(profileName, mappingProfile);
    exportNewJobProfile.saveJobProfile();
  },

  deleteJobProfile,
};
