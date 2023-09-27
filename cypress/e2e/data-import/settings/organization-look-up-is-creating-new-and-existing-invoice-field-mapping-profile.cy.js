import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { BATCH_GROUP, PAYMENT_METHOD } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';

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

    it(
      'C380521 Verify that Organization look-up is active on creating new and existing Invoice field mapping profile (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        FieldMappingProfiles.search(profileForDuplicate);
        FieldMappingProfileView.duplicate();
        NewFieldMappingProfile.addName(mappingProfile.name);
        NewFieldMappingProfile.fillDescription(mappingProfile.description);
        NewFieldMappingProfile.fillBatchGroup(mappingProfile.batchGroup);
        NewFieldMappingProfile.fillPaymentMethod(mappingProfile.paymentMethod);
        NewFieldMappingProfile.selectOrganizationByName(mappingProfile.organization);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.edit();
        NewFieldMappingProfile.selectOrganizationByName(mappingProfile.organizationForChanging);
        FieldMappingProfileEdit.save();
        FieldMappingProfileView.checkCalloutMessage(mappingProfile.name);
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyVendorName(mappingProfile.organizationForChanging);
      },
    );
  });
});
