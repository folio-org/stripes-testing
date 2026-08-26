import {
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
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const randomPostfix = getRandomPostfix();
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.gobi;
    const testData = {
      mappingProfile: {
        name: `AT_C380420_FieldMappingProfile_${randomPostfix}`,
        incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
        typeValue: FOLIO_RECORD_TYPE.INVOICE,
        batchGroup: BATCH_GROUP.AMHERST,
        organizationName: VENDOR_NAMES.GOBI,
        paymentMethod: PAYMENT_METHOD.CASH,
        accountingCode: 123,
      },
      profileId: null,
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(testData.mappingProfile.name);
    });

    it(
      'C380420 Verify the "enabled" property for "accountingCode" after populating Accounting code field (promin)',
      { tags: ['extendedPath', 'promin', 'C380420'] },
      () => {
        // Steps 1-4: Create invoice field mapping profile via UI with accounting code populated
        cy.intercept('POST', '/data-import-profiles/mappingProfiles*').as('createProfile');
        FieldMappingProfiles.waitLoading();
        FieldMappingProfiles.createInvoiceMappingProfile(
          testData.mappingProfile,
          profileForDuplicate,
        );
        FieldMappingProfiles.checkMappingProfilePresented(testData.mappingProfile.name);

        // Step 5: Verify via API that accountingCode.enabled is "true"
        cy.wait('@createProfile').then(({ response }) => {
          testData.profileId = response.body.id;
          FieldMappingProfileView.verifyAccountingCodeEnabledViaApi({
            profileId: testData.profileId,
            accountingCode: testData.mappingProfile.accountingCode,
            isEnabled: true,
            isRequred: false,
          });
        });
      },
    );
  });
});
