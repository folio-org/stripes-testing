import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Settings', () => {
    let user;

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C376008 Order field mapping profile: Confirm the list of Product identifier types (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.addFolioRecordType(FOLIO_RECORD_TYPE.ORDER);
        NewFieldMappingProfile.verifyProductIdTypeDropdown(
          'ASIN',
          'CODEN',
          'DOI',
          'GPO item number',
          'ISBN',
          'ISMN',
          'ISSN',
          'Publisher or distributor number',
          'Report number',
          'Standard technical report number',
          'UPC',
          'URN',
        );
      },
    );
  });
});
