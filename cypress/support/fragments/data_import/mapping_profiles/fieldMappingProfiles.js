import {
  Button,
  MultiColumnListCell,
  TextField,
  Pane,
  MultiColumnListRow,
  PaneContent,
  Form
} from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import FieldMappingProfileEdit from './fieldMappingProfileEdit';
import NewFieldMappingProfile from './newFieldMappingProfile';

const actionsButton = Button('Actions');
const searchButton = Button('Search');
const iconButton = Button({ icon: 'times' });
const saveProfileButton = Button('Save as profile & Close');
const resultsPane = Pane({ id:'pane-results' });

const openNewMappingProfileForm = () => {
  cy.do([
    actionsButton.click(),
    Button('New field mapping profile').click()
  ]);
};

const closeViewModeForMappingProfile = (profileName) => cy.do(Pane({ title: profileName }).find(iconButton).click());
const saveProfile = () => {
  // TODO need to wait until profile to be filled
  cy.wait(1500);
  cy.do(saveProfileButton.click());
};

const mappingProfileForDuplicate = {
  gobi:'GOBI monograph invoice',
  harrassowitz:'Default - Harrassowitz serials invoice',
  ebsco:'Default - EBSCO serials invoice'
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

const search = (nameForSearch) => {
  cy.do(TextField({ id:'input-search-mapping-profiles-field' }).fillIn(nameForSearch));
  cy.expect(searchButton.has({ disabled:false }));
  cy.do(searchButton.click(), getLongDelay());
};

const duplicateMappingProfile = () => {
  cy.do([
    Pane({ id:'full-screen-view' }).find(actionsButton).click(),
    Button('Duplicate').click()
  ]);
};

export default {
  openNewMappingProfileForm,
  saveProfile,
  closeViewModeForMappingProfile,
  search,

  createMappingProfile:(mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfile(mappingProfile);
    closeViewModeForMappingProfile(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },

  checkMappingProfilePresented: (mappingProfileName) => {
    cy.do(TextField({ id:'input-search-mapping-profiles-field' }).fillIn(mappingProfileName));
    cy.do(searchButton.click());
    cy.expect(MultiColumnListCell(mappingProfileName).exists());
  },

  createInvoiceMappingProfile:(mappingProfile, defaultProfile) => {
    search(defaultProfile);
    duplicateMappingProfile();
    NewFieldMappingProfile.fillInvoiceMappingProfile(mappingProfile);
    closeViewModeForMappingProfile(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },

  createOrderMappingProfile:(mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillOrderMappingProfile(mappingProfile);
    saveProfile();
    closeViewModeForMappingProfile(mappingProfile.name);
  },

  deleteFieldMappingProfile,
  mappingProfileForDuplicate,
  waitLoading: () => cy.expect(MultiColumnListRow({ index:0 }).exists()),

  createMappingProfileForMatch:(mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfileForMatch(mappingProfile);
    closeViewModeForMappingProfile(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },

  createMappingProfileForUpdatesMarc:(mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfileForUpdatesMarc(mappingProfile);
    cy.do(saveProfileButton.click());
  },

  createMappingProfileForUpdatesMarcAuthority:(mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfileForUpdatesMarcAuthority(mappingProfile);
    cy.do(saveProfileButton.click());
  },

  createMappingProfileForUpdatesAndOverrideMarc:(mappingProfile, firstProtectedField, secondProtectedField) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfileForUpdatesMarc(mappingProfile);
    FieldMappingProfileEdit.markFieldForProtection(firstProtectedField);
    FieldMappingProfileEdit.markFieldForProtection(secondProtectedField);
    cy.do(saveProfileButton.click());
  },

  createMappingProfileWithNotes:(mappingProfile, note) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
    NewFieldMappingProfile.addAdministrativeNote(note, 9);
    cy.do(saveProfileButton.click());
    closeViewModeForMappingProfile(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },
  selectMappingProfileFromList:(profileName) => cy.do(MultiColumnListCell(profileName).click()),

  checkListOfExistingProfilesIsDisplayed:() => cy.expect(PaneContent({ id:'pane-results-content' }).exists()),
  checkNewMappingProfileFormIsOpened:() => cy.expect(Form({ id:'mapping-profiles-form' }).exists()),
  verifyActionMenuAbsent:() => cy.expect(resultsPane.find(actionsButton).absent())
};
