import { Button, MultiColumnListCell, TextField, Pane, MultiColumnListRow } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import newMappingProfile from './newMappingProfile';

const actionsButton = Button('Actions');

const iconButton = Button({ icon: 'times' });

const openNewMappingProfileForm = () => {
  cy.do([
    actionsButton.click(),
    Button('New field mapping profile').click()
  ]);
};

const closeViewModeForMappingProfile = (profileName) => {
  cy.do(Pane({ title: profileName }).find(iconButton).click());
};

const mappingProfileForDuplicate = {
  gobi: 'GOBI monograph invoice',
  harrassowitz: 'Default - Harrassowitz serials invoice',
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
  cy.do(TextField({ id:'input-search-mapping-profiles-field' }).fillIn(nameForSearch));
  cy.expect(Button('Search').has({ disabled:false }));
  cy.do(Button('Search').click(), getLongDelay());
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
    closeViewModeForMappingProfile(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },

  createMappingProfileForUpdate:(mappingProfile) => {
    openNewMappingProfileForm();
    newMappingProfile.fillMappingProfileForUpdate(mappingProfile);
    closeViewModeForMappingProfile(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },

  createModifyMappingProfile:(mappingProfile, properties) => {
    openNewMappingProfileForm();
    newMappingProfile.fillModifyMappingProfile(mappingProfile, properties);
    closeViewModeForMappingProfile(mappingProfile);
    cy.expect(actionsButton.exists());
  },

  checkMappingProfilePresented: (mappingProfileName) => {
    cy.do(TextField({ id:'input-search-mapping-profiles-field' }).fillIn(mappingProfileName));
    cy.do(Button('Search').click());
    cy.expect(MultiColumnListCell(mappingProfileName).exists());
  },

  createInvoiceMappingProfile:(mappingProfileName, defaultProfile, organizationName) => {
    cy.intercept('/tags?*').as('getTag');
    searchMappingProfileForDuplicate(defaultProfile);
    cy.wait('@getTag');
    duplicateMappingProfile();
    newMappingProfile.fillMappingProfileForInvoice(mappingProfileName, organizationName);
    closeViewModeForMappingProfile(mappingProfileName);
    cy.expect(actionsButton.exists());
  },

  deleteFieldMappingProfile,
  mappingProfileForDuplicate,
  waitLoading: () => cy.expect(MultiColumnListRow({ index:0 }).exists())
};
