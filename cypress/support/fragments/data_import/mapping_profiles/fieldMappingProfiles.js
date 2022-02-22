import { Button, MultiColumnListCell, TextField, Pane } from '../../../../../interactors';
import newMappingProfile from './newMappingProfile';

const actionsButton = Button('Actions');

const iconButton = Button({ icon: 'times' });

const openNewMappingProfileForm = () => {
  cy.do([
    actionsButton.click(),
    Button('New field mapping profile').click()
  ]);
};

const closeViewModeForMappingProfile = () => {
  cy.do(iconButton.click());
};

const deleteFieldMappingProfile = (profileName) => {
  // get all mapping profiles
  cy
    .okapiRequest({
      path: 'data-import-profiles/mappingProfiles',
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
          path: `data-import-profiles/mappingProfiles/${profileToDelete.id}`,
        });
    })
    .then(({ status }) => {
      if (status === 204) cy.log('###DELETED MAPPING PROFILE###');
    });
};

const searchMappingProfileForDuplicate = (nameForSearch) => {
  cy.do([TextField({ id:'input-search-mapping-profiles-field' }).fillIn(nameForSearch),
    Button('Search').click()
  ]);
};

const duplicateMappingProfile = () => {
  cy.do([
    Pane({ id:'full-screen-view' }).find(actionsButton).click(),
    Button('Duplicate').click()
  ]);
};

export default {
  createMappingProfile:(mappingProfile) => {
    openNewMappingProfileForm();
    newMappingProfile.fillMappingProfile(mappingProfile);
    closeViewModeForMappingProfile();
    cy.expect(actionsButton.exists());
  },

  createMappingProfileForUpdate:(mappingProfile) => {
    openNewMappingProfileForm();
    newMappingProfile.fillMappingProfileForUpdate(mappingProfile);
    closeViewModeForMappingProfile();
    cy.expect(actionsButton.exists());
  },

  createModifyMappingProfile:(mappingProfile, properties) => {
    openNewMappingProfileForm();
    newMappingProfile.fillModifyMappingProfile(mappingProfile, properties);
    closeViewModeForMappingProfile();
    cy.expect(actionsButton.exists());
  },

  checkMappingProfilePresented: (mappingProfileName) => {
    cy.do(TextField({ id:'input-search-mapping-profiles-field' }).fillIn(mappingProfileName));
    cy.do(Button('Search').click());
    cy.expect(MultiColumnListCell(mappingProfileName).exists());
  },

  createInvoiceMappingProfile:(mappingProfileName) => {
    cy.intercept(
      {
        method: 'GET',
        url: '/tags?*',
      }
    ).as('getTag');
    searchMappingProfileForDuplicate('GOBI monograph invoice');
    cy.wait('@getTag');
    duplicateMappingProfile();
    newMappingProfile.fillMappingProfileForInvoice(mappingProfileName);
    closeViewModeForMappingProfile();
    cy.expect(actionsButton.exists());
  },

  deleteFieldMappingProfile
};
