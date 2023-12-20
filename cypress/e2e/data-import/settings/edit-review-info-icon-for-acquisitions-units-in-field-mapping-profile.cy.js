import {
  FOLIO_RECORD_TYPE,
  BATCH_GROUP,
  VENDOR_NAMES,
  PAYMENT_METHOD,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/genereteTextCode';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
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

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      });
    });

    it(
      'C380723 Invoice field mapping: review adjusted info icon to the "Acquisitions units" field in the editing page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const message =
          'Invoice creation will error unless the importing user is a member of the specified acquisitions unit';

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillInvoiceMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillInvoiceDate(mappingProfile.invoiceDate);
        NewFieldMappingProfile.fillVendorInvoiceNumber(mappingProfile.vendorInvoiceNumber);
        NewFieldMappingProfile.fillQuantity(mappingProfile.quantity);
        NewFieldMappingProfile.fillSubTotal(mappingProfile.subtotal);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.edit();
        NewFieldMappingProfile.verifyAcquisitionsUnitsInfoMessage(message);
      },
    );
  });
});
