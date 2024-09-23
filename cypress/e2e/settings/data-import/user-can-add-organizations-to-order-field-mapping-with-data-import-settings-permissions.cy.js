import { FOLIO_RECORD_TYPE, VENDOR_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C376994 mapping profile_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      vendor: VENDOR_NAMES.GOBI,
      materialSupplier: VENDOR_NAMES.HARRASSOWITZ,
      accessProvider: VENDOR_NAMES.EBSCO,
    };

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C376994 A user can add organizations to Order field mapping with "Settings (Data import): Can view, create, edit, and remove" (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addVendor(mappingProfile);
        NewFieldMappingProfile.addMaterialSupplier(mappingProfile);
        NewFieldMappingProfile.addAccessProvider(mappingProfile);
        NewFieldMappingProfile.checkOrganizationsAddedToFields(mappingProfile);
      },
    );
  });
});
