import {
  Button,
  MultiColumnListCell,
  TextField,
  Pane,
  MultiColumnListRow,
  Select,
  PaneContent,
  Form
} from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import MappingProfileDetails from './mappingProfileDetails';
import NewFieldMappingProfile from './newFieldMappingProfile';

const actionsButton = Button('Actions');
const searchButton = Button('Search');
const iconButton = Button({ icon: 'times' });
const saveProfileButton = Button('Save as profile & Close');
const mappingProfileNameField = TextField('Name*');
const mappingProfileCatalogedDateField = TextField('Cataloged date');
const mappingProfileInstanceStatusField = TextField('Instance status term');
const mappingProfileIncomingRecordTypeField = Select('Incoming record type*');
const mappingProfileFolioRecordTypeField = Select('FOLIO record type*');
const mappingProfileStaffSuppressField = Select('Staff suppress');
const mappingProfileSuppressFromDiscoveryField = Select('Suppress from discovery');

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

const searchMappingProfile = (nameForSearch) => {
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

const saveProfile = () => {
  cy.do(saveProfileButton.click());
};

export default {
  openNewMappingProfileForm,
  saveProfile,
  closeViewModeForMappingProfile,

  createMappingProfile:(mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfile(mappingProfile);
    closeViewModeForMappingProfile(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },

  createModifyMappingProfile:(mappingProfile, properties) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillModifyMappingProfile(mappingProfile, properties);
    closeViewModeForMappingProfile(mappingProfile);
    cy.expect(actionsButton.exists());
  },

  checkMappingProfilePresented: (mappingProfileName) => {
    cy.do(TextField({ id:'input-search-mapping-profiles-field' }).fillIn(mappingProfileName));
    cy.do(searchButton.click());
    cy.expect(MultiColumnListCell(mappingProfileName).exists());
  },

  createInvoiceMappingProfile:(mappingProfileName, defaultProfile, organizationName) => {
    cy.intercept('/tags?*').as('getTag');
    searchMappingProfile(defaultProfile);
    cy.wait('@getTag');
    duplicateMappingProfile();
    NewFieldMappingProfile.fillMappingProfileForInvoice(mappingProfileName, organizationName);
    closeViewModeForMappingProfile(mappingProfileName);
    cy.expect(actionsButton.exists());
  },

  createMappingProfileForMatchOnInstanceIdentifier: ({
    name,
    incomingRecordType,
    folioRecordType,
    staffSuppress,
    discoverySuppress,
    catalogedDate,
    instanceStatus,
  }) => {
    openNewMappingProfileForm();
    cy.do([
      mappingProfileNameField.fillIn(name),
      mappingProfileIncomingRecordTypeField.choose(incomingRecordType),
      mappingProfileFolioRecordTypeField.choose(folioRecordType),
    ]);
    // need to wait until selection lists are populated
    cy.wait(1200); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.do([
      staffSuppress
        ? mappingProfileStaffSuppressField.choose(staffSuppress)
        : mappingProfileSuppressFromDiscoveryField.choose(discoverySuppress),
      mappingProfileCatalogedDateField.fillIn(catalogedDate),
      mappingProfileInstanceStatusField.fillIn(instanceStatus),
      saveProfileButton.click(),
    ]);
    closeViewModeForMappingProfile(name);

    cy.expect(actionsButton.exists());
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

  createMappingProfileForUpdatesAndOverrideMarc:(mappingProfile, firstProtectedField, secondProtectedField) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfileForUpdatesMarc(mappingProfile);
    MappingProfileDetails.markFieldForProtection(firstProtectedField);
    MappingProfileDetails.markFieldForProtection(secondProtectedField);
    cy.do(saveProfileButton.click());
  },

  createMappingProfileWithNotes:(mappingProfile, note) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
    NewFieldMappingProfile.addAdministrativeNote(note);
    cy.do(saveProfileButton.click());
    closeViewModeForMappingProfile(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },

  checkListOfExistingProfilesIsDisplayed:() => {
    cy.expect(PaneContent({ id:'pane-results-content' }).exists());
  },

  checkNewMappingProfileFormIsOpened:() => {
    cy.expect(Form({ id:'mapping-profiles-form' }).exists());
  }
};
