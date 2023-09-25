import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('data-import', () => {
  describe('Settings', () => {
    let user = null;
    const mappingProfileName = `C343284 invoice mapping profile ${getRandomPostfix()}`;

    before('login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete user', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C343284 Make some of the fields on the Invoice field mapping profile required (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        FieldMappingProfiles.openNewMappingProfileForm();
        FieldMappingProfiles.checkNewMappingProfileFormIsOpened();

        NewFieldMappingProfile.addName(mappingProfileName);
        NewFieldMappingProfile.addIncomingRecordType('EDIFACT invoice');
        NewFieldMappingProfile.addFolioRecordType('Invoice');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkErrorMessageIsPresented('Batch group*');

        NewFieldMappingProfile.fillBatchGroup('"FOLIO"');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkErrorMessageIsPresented('Vendor invoice number*');

        NewFieldMappingProfile.fillVendorInvoiceNumber('123');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkErrorMessageIsPresented('Payment method*');

        NewFieldMappingProfile.fillPaymentMethod('"Cash"');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkErrorMessageIsPresented('Currency*');

        NewFieldMappingProfile.fillCurrency('"USD"');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkErrorMessageIsPresented('Description*');

        NewFieldMappingProfile.fillDescription('abc');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkErrorMessageIsPresented('Quantity*');

        NewFieldMappingProfile.fillQuantity('1');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkErrorMessageIsPresented('Sub-total*');

        NewFieldMappingProfile.fillSubTotal('10.00');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkErrorMessageIsPresented('Vendor name*');

        NewFieldMappingProfile.fillVendorName('EBSCO');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkErrorMessageIsPresented('Invoice date*');
        NewFieldMappingProfile.fillInvoiceDate('###TODAY###');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewModeForMappingProfile(mappingProfileName);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

        FieldMappingProfileView.delete(mappingProfileName);
      },
    );
  });
});
