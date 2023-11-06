import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  BATCH_GROUP,
  VENDOR_NAMES,
  PAYMENT_METHOD,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
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

    before('login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C353959 Validation added for Currency field causes duplicated default invoice profiles not to be saved (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        FieldMappingProfiles.search(profileForDuplicate);
        FieldMappingProfileView.duplicate();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillDescription(mappingProfile.description);
        NewFieldMappingProfile.fillBatchGroup(mappingProfile.batchGroup);
        NewFieldMappingProfile.fillVendorName(mappingProfile.organizationName);
        NewFieldMappingProfile.fillPaymentMethod(mappingProfile.paymentMethod);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCreateProfileCalloutMessage(mappingProfile.name);
        FieldMappingProfileView.verifyCurrency(currencyValue);
      },
    );
  });
});
