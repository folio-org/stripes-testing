import {
  APPLICATION_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  PAYMENT_METHOD,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.erasmus;
    const mappingProfile = {
      name: `C358133 autoTestMappingProf.${getRandomPostfix()}`,
      description: '',
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      batchGroup: BATCH_GROUP.FOLIO,
      organizationName: VENDOR_NAMES.GOBI,
      paymentMethod: PAYMENT_METHOD.CASH,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        SettingsFieldMappingProfiles.waitLoading();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C358133 Confirm that a duplicated import profile has enabled indicator set to TRUE (folijet)',
      { tags: ['extendedPath', 'folijet', 'C358133'] },
      () => {
        FieldMappingProfiles.waitLoading();
        FieldMappingProfiles.createInvoiceMappingProfile(mappingProfile, profileForDuplicate);
        cy.getAdminToken().then(() => {
          SettingsFieldMappingProfiles.getMappingProfilesViaApi({
            query: `name="${mappingProfile.name}"`,
          }).then(({ mappingProfiles }) => {
            const { id: profileId } = mappingProfiles[0];
            FieldMappingProfileView.verifyEnabledIndicatorSetToTrueViaApi(profileId);
          });
        });
      },
    );
  });
});
