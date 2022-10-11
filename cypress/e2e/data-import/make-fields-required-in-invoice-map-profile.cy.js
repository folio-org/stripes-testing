import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import Helper from '../../support/fragments/finance/financeHelper';
import Users from '../../support/fragments/users/users';
import MappingProfileDetails from '../../support/fragments/data_import/mapping_profiles/mappingProfileDetails';
import SettingsMenu from '../../support/fragments/settingsMenu';

describe('ui-data-import: Make some of the fields on the Invoice field mapping profile required', () => {
  let user = null;
  const mappingProfileName = `C343284 invoice mapping profile ${Helper.getRandomBarcode()}`;

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.viewOrganization.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password, { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it('C343284 Make some of the fields on the Invoice field mapping profile required (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
    FieldMappingProfiles.openNewMappingProfileForm();
    FieldMappingProfiles.checkNewMappingProfileFormIsOpened();

    NewMappingProfile.addName(mappingProfileName);
    NewMappingProfile.addIncomingRecordType('EDIFACT invoice');
    NewMappingProfile.addFolioRecordType('Invoice');
    NewMappingProfile.saveProfile();
    MappingProfileDetails.checkErrorMessageIsPresented('Batch group*');

    NewMappingProfile.fillBatchGroup('"FOLIO"');
    NewMappingProfile.saveProfile();
    MappingProfileDetails.checkErrorMessageIsPresented('Vendor invoice number*');

    NewMappingProfile.fillVendorInvoiceNumber('123');
    NewMappingProfile.saveProfile();
    MappingProfileDetails.checkErrorMessageIsPresented('Payment method*');

    NewMappingProfile.fillPaymentMethod('"Cash"');
    NewMappingProfile.saveProfile();
    MappingProfileDetails.checkErrorMessageIsPresented('Currency*');

    NewMappingProfile.fillCurrency('"USD"');
    NewMappingProfile.saveProfile();
    MappingProfileDetails.checkErrorMessageIsPresented('Description*');

    NewMappingProfile.fillDescription('abc');
    NewMappingProfile.saveProfile();
    MappingProfileDetails.checkErrorMessageIsPresented('Quantity*');

    NewMappingProfile.fillQuantity('1');
    NewMappingProfile.saveProfile();
    MappingProfileDetails.checkErrorMessageIsPresented('Sub-total*');

    NewMappingProfile.fillSubTotal('10.00');
    NewMappingProfile.saveProfile();
    MappingProfileDetails.checkErrorMessageIsPresented('Vendor name*');

    NewMappingProfile.fillVendorName('EBSCO');
    NewMappingProfile.saveProfile();
    MappingProfileDetails.checkErrorMessageIsPresented('Invoice date*');
    NewMappingProfile.fillInvoiceDate('###TODAY###');
    NewMappingProfile.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfileName);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    MappingProfileDetails.deleteMappingProfile(mappingProfileName);
  });
});
