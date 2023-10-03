import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  PAYMENT_METHOD,
  BATCH_GROUP,
  VENDOR_NAMES,
} from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('data-import', () => {
  describe('Settings', () => {
    let user = null;
    const mappingProfile = {
      name: `C343284 invoice mapping profile ${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      existingRecordType: FOLIO_RECORD_TYPE.INVOICE,
      batchGroup: BATCH_GROUP.FOLIO,
      vendorInvoiceNumber: '123',
      paymentMethod: PAYMENT_METHOD.CASH,
      currency: '"USD"',
      invoiceLineDescription: 'abc',
      quantity: '1',
      subtotal: '10.00',
      vendorName: VENDOR_NAMES.EBSCO,
      invoiceDate: '###TODAY###',
    };
    const requiredFields = {
      batchGroup: 'Batch group*',
      vendorInvoiceNumber: 'Vendor invoice number*',
      paymentMethod: 'Payment method*',
      currency: 'Currency*',
      description: 'Description*',
      quantity: 'Quantity*',
      subtotal: 'Sub-total*',
      vendorName: 'Vendor name*',
      invoiceDate: 'Invoice date*',
    };

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

        NewFieldMappingProfile.addName(mappingProfile.name);
        NewFieldMappingProfile.addIncomingRecordType(mappingProfile.incomingRecordType);
        NewFieldMappingProfile.addFolioRecordType(mappingProfile.existingRecordType);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkErrorMessageIsPresented(requiredFields.batchGroup);

        NewFieldMappingProfile.fillBatchGroup(mappingProfile.batchGroup);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkErrorMessageIsPresented(requiredFields.vendorInvoiceNumber);

        NewFieldMappingProfile.fillVendorInvoiceNumber(mappingProfile.vendorInvoiceNumber);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkErrorMessageIsPresented(requiredFields.paymentMethod);

        NewFieldMappingProfile.fillPaymentMethod(mappingProfile.paymentMethod);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkErrorMessageIsPresented(requiredFields.currency);

        NewFieldMappingProfile.fillCurrency(mappingProfile.currency);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkErrorMessageIsPresented(requiredFields.description);

        NewFieldMappingProfile.fillInvoiceLineDescription(mappingProfile.invoiceLineDescription);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkErrorMessageIsPresented(requiredFields.quantity);

        NewFieldMappingProfile.fillQuantity(mappingProfile.quantity);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkErrorMessageIsPresented(requiredFields.subtotal);

        NewFieldMappingProfile.fillSubTotal(mappingProfile.subtotal);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkErrorMessageIsPresented(requiredFields.vendorName);

        NewFieldMappingProfile.fillVendorName(mappingProfile.vendorName);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkErrorMessageIsPresented(requiredFields.invoiceDate);
        NewFieldMappingProfile.fillInvoiceDate(mappingProfile.invoiceDate);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        FieldMappingProfileView.delete(mappingProfile.name);
      },
    );
  });
});
