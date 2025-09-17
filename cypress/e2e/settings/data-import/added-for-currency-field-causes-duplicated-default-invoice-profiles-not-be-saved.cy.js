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
      name: `C353959 autoTestMappingProf.${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      description: '',
      batchGroup: BATCH_GROUP.FOLIO,
      organizationName: VENDOR_NAMES.GOBI,
      paymentMethod: PAYMENT_METHOD.CASH,
    };
    const currencyValue = 'CUX+2[2]';

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C353959 Validation added for Currency field causes duplicated default invoice profiles not to be saved (folijet)',
      { tags: ['extendedPath', 'folijet', 'C353959'] },
      () => {
        const calloutMessage = `The field mapping profile "${mappingProfile.name}" was successfully created`;

        FieldMappingProfiles.search(profileForDuplicate);
        FieldMappingProfileView.duplicate();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillSummaryDescription(mappingProfile.description);
        NewFieldMappingProfile.fillBatchGroup(mappingProfile.batchGroup);
        NewFieldMappingProfile.fillVendorName(mappingProfile.organizationName);
        NewFieldMappingProfile.fillPaymentMethod(mappingProfile.paymentMethod);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage(calloutMessage);
        FieldMappingProfileView.verifyCurrency(currencyValue);
      },
    );
  });
});
