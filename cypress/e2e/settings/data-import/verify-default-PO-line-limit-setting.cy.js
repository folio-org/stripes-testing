import {
  FOLIO_RECORD_TYPE,
  ORDER_STATUSES,
  VENDOR_NAMES,
  ACQUISITION_METHOD_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
} from '../../../support/constants';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import getRandomPostfix, { randomTwoDigitNumber } from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';

describe('data-import', () => {
  describe('Settings', () => {
    const testData = {};
    const mappingProfile = {
      name: `C374181 testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.OPEN,
      vendor: VENDOR_NAMES.GOBI,
      title: `"Test${getRandomPostfix()}"`,
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.OTHER,
      receivingWorkflow: 'Synchronized',
      currency: 'USD',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
    };
    const randomNumber = randomTwoDigitNumber();
    const defaultPurchaseOrderLinesLimit = '"1"';

    before('Create test data', () => {
      // Make sure that defaulted value is "1" in "Purchase order lines limit setting"
      cy.loginAsAdmin({
        path: SettingsMenu.ordersPath,
        waiter: SettingsOrders.waitLoadingOrderSettings,
      });
      SettingsOrders.selectContentInGeneralOrders('Purchase order lines limit');
      // First set to a random number, to make sure "Save" button is clickable
      SettingsOrders.setPurchaseOrderLinesLimit(randomNumber);
      SettingsOrders.setPurchaseOrderLinesLimit(1);

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C374181 Verify display of defaulted value for PO line limit setting on Order Field Mapping Profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Click "Actions" button -> Click "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();
        // #2 Populate following fields:
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfile);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfile);
        // #3 Check "Purchase order lines limit setting" field in "Order information" accordion
        NewFieldMappingProfile.verifyDefaultPurchaseOrderLinesLimit(defaultPurchaseOrderLinesLimit);
        // #4 Click "Save as profile & close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('New record created:');
        FieldMappingProfileView.verifyMappingProfileOpened();
        // #5 Check "Purchase order lines limit setting" field in "Order information" accordion of the Settings details view screen
        FieldMappingProfileView.verifyDefaultPurchaseOrderLinesLimit(
          defaultPurchaseOrderLinesLimit,
        );
      },
    );
  });
});
