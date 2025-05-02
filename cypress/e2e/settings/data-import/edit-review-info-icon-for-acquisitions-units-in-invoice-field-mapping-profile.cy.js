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
import getRandomStringCode from '../../../support/utils/generateTextCode';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfileInvoice = {
      name: `C380723 Info icon AcqUnits ${getRandomStringCode(160)}`,
      incomingRecordType: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      invoiceLinePOlDescription: 'This is the Description',
      invoiceDate: '###TODAY###',
      batchGroup: BATCH_GROUP.FOLIO,
      vendorInvoiceNumber: '1',
      organizationName: VENDOR_NAMES.GOBI,
      paymentMethod: PAYMENT_METHOD.CASH,
      currency: 'USD',
      quantity: '1',
      subtotal: '1',
    };

    before('Create test user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileInvoice.name);
      });
    });

    it(
      'C380723 Invoice field mapping: review adjusted info icon to the "Acquisitions units" field in the editing page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380723'] },
      () => {
        const message =
          'Invoice creation will error unless the importing user is a member of the specified acquisitions unit';

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillInvoiceMappingProfile(mappingProfileInvoice);
        NewFieldMappingProfile.fillInvoiceDate(mappingProfileInvoice.invoiceDate);
        NewFieldMappingProfile.fillVendorInvoiceNumber(mappingProfileInvoice.vendorInvoiceNumber);
        NewFieldMappingProfile.fillQuantity(mappingProfileInvoice.quantity);
        NewFieldMappingProfile.fillSubTotal(mappingProfileInvoice.subtotal);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.edit();
        NewFieldMappingProfile.verifyAcquisitionsUnitsInfoMessage(message);
      },
    );
  });
});
