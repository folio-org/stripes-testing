import { Button } from '../../../../../interactors';
import exportNewFieldMappingProfile from './exportNewFieldMappingProfile';

const openNewMappingProfileForm = () => {
  cy.do(Button('New').click());
};

const deleteFieldMappingProfile = (profileName) => {
  // get all mapping profiles
  cy
    .okapiRequest({
      path: 'data-export-profiles/mappingProfiles',
      searchParams: {
        query: '(cql.allRecords=1) sortby name',
        limit: 1000
      },
    })
    .then(({ body: { mappingProfiles } }) => {
      // find profile to delete
      const profileToDelete = mappingProfiles.find(profile => profile.name === profileName);

      // delete profile with its id
      cy
        .okapiRequest({
          method: 'DELETE',
          path: `data-export-profiles/mappingProfiles/${profileToDelete.id}`,
        });
    })
    .then(({ status }) => {
      if (status === 204) cy.log('###DELETED MAPPING PROFILE###');
    });
};

export default {
  createMappingProfile:(mappingProfile) => {
    openNewMappingProfileForm();
    exportNewFieldMappingProfile.fillMappingProfile(mappingProfile);
  },

  deleteFieldMappingProfile,
};
