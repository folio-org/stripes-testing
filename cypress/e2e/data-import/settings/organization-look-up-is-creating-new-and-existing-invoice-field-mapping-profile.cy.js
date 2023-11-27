import { BATCH_GROUP, PAYMENT_METHOD } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.harrassowitz;
    const mappingProfile = {
      name: `C380521 Import Invoice_${getRandomPostfix()}`,
      description: '',
      batchGroup: BATCH_GROUP.FOLIO,
      paymentMethod: PAYMENT_METHOD.CASH,
      organization: 'Amazon.com',
      organizationForChanging: 'Alexander Street Press',
    };

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C380521 Verify that Organization look-up is active on creating new and existing Invoice field mapping profile (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const calloutMessage = `The field mapping profile "${mappingProfile.name}" was successfully updated`;

        FieldMappingProfiles.search(profileForDuplicate);
        FieldMappingProfileView.duplicate();
        NewFieldMappingProfile.addName(mappingProfile.name);
        NewFieldMappingProfile.fillSummaryDescription(mappingProfile.description);
        NewFieldMappingProfile.fillBatchGroup(mappingProfile.batchGroup);
        NewFieldMappingProfile.fillPaymentMethod(mappingProfile.paymentMethod);
        NewFieldMappingProfile.selectOrganizationByName(mappingProfile.organization);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.edit();
        NewFieldMappingProfile.selectOrganizationByName(mappingProfile.organizationForChanging);
        FieldMappingProfileEdit.save();
        FieldMappingProfileView.checkCalloutMessage(calloutMessage);
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyVendorName(mappingProfile.organizationForChanging);
      },
    );
  });
});
