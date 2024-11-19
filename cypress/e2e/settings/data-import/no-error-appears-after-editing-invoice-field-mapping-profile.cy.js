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
    let user;
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.gobi;
    const mappingProfile = {
      name: `C491301 autoTestMappingProf.${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      description: '',
      batchGroup: BATCH_GROUP.FOLIO,
      organizationName: VENDOR_NAMES.GOBI,
      paymentMethod: PAYMENT_METHOD.CASH,
    };
    const newMappingProfileName = `C491301 newAutoTestMappingProf.${getRandomPostfix()}`;

    before('Create user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(newMappingProfileName);
      });
    });

    it(
      'C491301 Verify that no error appears after editing Invoice field mapping profile (folijet)',
      { tags: ['criticalPath', 'folijet', 'C491301'] },
      () => {
        // create Field mapping profile
        FieldMappingProfiles.waitLoading();
        FieldMappingProfiles.createInvoiceMappingProfile(mappingProfile, profileForDuplicate);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);
        FieldMappingProfiles.searchByName(mappingProfile.name);

        const FieldMappingProfileEditForm = FieldMappingProfileView.clickEditButton();
        FieldMappingProfileEditForm.fillMappingProfileFields({
          summary: { name: newMappingProfileName },
        });
        FieldMappingProfileEditForm.verifyFormView();
        FieldMappingProfileEditForm.clickSaveAndCloseButton({
          profileCreated: false,
        });
        FieldMappingProfileView.checkSummaryFieldsConditions([
          { label: 'Name', conditions: { value: newMappingProfileName } },
        ]);
      },
    );
  });
});
