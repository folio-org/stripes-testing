import { APPLICATION_NAMES, FOLIO_RECORD_TYPE } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  FieldMappingProfileEditForm,
  FieldMappingProfileView,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const mappingProfile = {
      name: `C421996 Mapping profiel${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const recordTypeOptions = [
      'Instance',
      'Invoice',
      'Order',
      'MARC Bibliographic',
      'MARC Authority',
    ];

    before('Create test data', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile);

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C421996  (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C421996'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        SettingsFieldMappingProfiles.waitLoading();
        SettingsFieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.verifyFolioRecordTypeOptions(recordTypeOptions);
        NewFieldMappingProfile.clickClose();

        SettingsFieldMappingProfiles.waitLoading();
        SettingsFieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.clickEditButton(mappingProfile.name);
        FieldMappingProfileEditForm.waitLoading();
        FieldMappingProfileEditForm.verifyFolioRecordTypeOptions(recordTypeOptions);
      },
    );
  });
});
