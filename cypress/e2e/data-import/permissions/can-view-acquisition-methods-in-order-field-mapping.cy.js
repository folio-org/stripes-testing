import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';

describe('data-import', () => {
  describe('Permissions', () => {
    let user;
    before('create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C377031 A user can view Acquisition Methods in Order field mapping with "Settings (Data import): Can view, create, edit, and remove" (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.waitLoading();
        NewFieldMappingProfile.addIncomingRecordType(FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC);
        NewFieldMappingProfile.addFolioRecordType(FOLIO_RECORD_TYPE.ORDER);
        NewFieldMappingProfile.acquisitionMethodsDropdownListIsVisible();
      },
    );
  });
});
