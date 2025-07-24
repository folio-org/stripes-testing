import { APPLICATION_NAMES, FOLIO_RECORD_TYPE } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
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
      name: `C421997 Mapping profile${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const recordTypeOptions = [
      'Instance',
      'Holdings',
      'Item',
      'Order',
      'Invoice',
      'MARC Bibliographic',
      'MARC Holdings (disabled)',
      'MARC Authority',
    ];

    before('Create test data', () => {
      cy.getAdminToken();
      cy.setTenant(Affiliations.College);
      NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile);
      cy.resetTenant();

      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [
          Permissions.settingsDataImportEnabled.gui,
        ]);
        cy.resetTenant();

        cy.login(user.username, user.password);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        SettingsFieldMappingProfiles.waitLoading();
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C421997 (CONSORTIA) Verify the field mapping profile options on Member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C421997'] },
      () => {
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
