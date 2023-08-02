import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('ui-data-import', () => {
  let user = null;
  const mappingProfileName = `C343284 invoice mapping profile ${getRandomPostfix}`;

  before('login', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiOrganizationsView.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password, { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after('delete user', () => {
    Users.deleteViaApi(user.userId);
  });

  it('C343284 Make some of the fields on the Invoice field mapping profile required (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
      FieldMappingProfiles.openNewMappingProfileForm();
      FieldMappingProfiles.checkNewMappingProfileFormIsOpened();

      NewFieldMappingProfile.addName(mappingProfileName);
      NewFieldMappingProfile.addIncomingRecordType('EDIFACT invoice');
      NewFieldMappingProfile.addFolioRecordType('Invoice');
      NewFieldMappingProfile.saveProfile();
      FieldMappingProfileView.checkErrorMessageIsPresented('Batch group*');

      NewFieldMappingProfile.fillBatchGroup('"FOLIO"');
      NewFieldMappingProfile.saveProfile();
      FieldMappingProfileView.checkErrorMessageIsPresented('Vendor invoice number*');

      NewFieldMappingProfile.fillVendorInvoiceNumber('123');
      NewFieldMappingProfile.saveProfile();
      FieldMappingProfileView.checkErrorMessageIsPresented('Payment method*');

      NewFieldMappingProfile.fillPaymentMethod('"Cash"');
      NewFieldMappingProfile.saveProfile();
      FieldMappingProfileView.checkErrorMessageIsPresented('Currency*');

      NewFieldMappingProfile.fillCurrency('"USD"');
      NewFieldMappingProfile.saveProfile();
      FieldMappingProfileView.checkErrorMessageIsPresented('Description*');

      NewFieldMappingProfile.fillDescription('abc');
      NewFieldMappingProfile.saveProfile();
      FieldMappingProfileView.checkErrorMessageIsPresented('Quantity*');

      NewFieldMappingProfile.fillQuantity('1');
      NewFieldMappingProfile.saveProfile();
      FieldMappingProfileView.checkErrorMessageIsPresented('Sub-total*');

      NewFieldMappingProfile.fillSubTotal('10.00');
      NewFieldMappingProfile.saveProfile();
      FieldMappingProfileView.checkErrorMessageIsPresented('Vendor name*');

      NewFieldMappingProfile.fillVendorName('EBSCO');
      NewFieldMappingProfile.saveProfile();
      FieldMappingProfileView.checkErrorMessageIsPresented('Invoice date*');
      NewFieldMappingProfile.fillInvoiceDate('###TODAY###');
      NewFieldMappingProfile.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfileName);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

      FieldMappingProfileView.deleteMappingProfile(mappingProfileName);
    });
});
