import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    before('Create user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C365127 Verify no error appears after populating new calendar date in Invoice date (promin)',
      { tags: ['extendedPath', 'promin', 'C365127'] },
      () => {
        // Step 1: Settings > Data import > Field mapping profiles > Actions > New field mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.waitLoading();

        // Step 2: Set incoming record type = EDIFACT invoice, FOLIO record type = Invoice,
        // and Invoice date action = Choose date
        NewFieldMappingProfile.addIncomingRecordType(
          NewFieldMappingProfile.incomingRecordType.edifact,
        );
        NewFieldMappingProfile.addFolioRecordType(FOLIO_RECORD_TYPE.INVOICE);
        NewFieldMappingProfile.setInvoiceDateToChooseDate();

        // Steps 3-4: Click calendar icon; select a date
        NewFieldMappingProfile.openInvoiceDateCalendar();
        NewFieldMappingProfile.selectCalendarActiveDay('01');

        // Steps 5-6: Click calendar icon again; select a different date; verify no error
        NewFieldMappingProfile.openInvoiceDateCalendar();
        NewFieldMappingProfile.selectCalendarActiveDay('15');
        NewFieldMappingProfile.verifyInvoiceDateHasNoError();
      },
    );
  });
});
