import { HTML, including } from '@interactors/html';
import { FOLIO_RECORD_TYPE, EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const mappingProfileName = `AT_C366110_MappingProfile_${getRandomPostfix()}`;
    const checkUiDidNotCrash = () => {
      cy.wait(2000); // Crash may happen with a delay
      cy.expect(HTML(including('Something went wrong')).absent());
    };
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C366110 Verify no error appears after switching record types when creating new field mapping profile (promin)',
      { tags: ['extendedPath', 'promin', 'C366110'] },
      () => {
        // Step 1: Open new field mapping profile form
        FieldMappingProfiles.clickCreateNewFieldMappingProfile();
        NewFieldMappingProfile.waitLoading();

        // Step 2: Fill name, incoming record type (MARC Bibliographic), FOLIO record type (Order)
        NewFieldMappingProfile.fillSummaryInMappingProfile({
          name: mappingProfileName,
          typeValue: FOLIO_RECORD_TYPE.ORDER,
        });
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed({
          name: mappingProfileName,
          incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          recordType: EXISTING_RECORD_NAMES.ORDER,
          description: '',
        });

        // Step 3: Switch FOLIO record type to Invoice → verify no "Something went wrong" error
        NewFieldMappingProfile.fillFolioRecordType({ typeValue: FOLIO_RECORD_TYPE.INVOICE });
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed({
          name: mappingProfileName,
          incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          recordType: EXISTING_RECORD_NAMES.INVOICE,
          description: '',
        });
        checkUiDidNotCrash();

        // Step 4: Switch FOLIO record type to Instance → verify no "Something went wrong" error
        NewFieldMappingProfile.fillFolioRecordType({ typeValue: FOLIO_RECORD_TYPE.INSTANCE });
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed({
          name: mappingProfileName,
          incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          recordType: EXISTING_RECORD_NAMES.INSTANCE,
          description: '',
        });
        checkUiDidNotCrash();
      },
    );
  });
});
