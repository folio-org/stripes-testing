import {
  ACQUISITION_METHOD_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import OrderLinesLimit from '../../../support/fragments/settings/orders/orderLinesLimit';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomTwoDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {};
    const mappingProfile = {
      name: `C375211testMappingProfile.${getRandomPostfix()}`,
      newName: `C375211testMappingProfile.${getRandomPostfix()}-edited`,
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
    const defaultPurchaseOrderLinesLimit = '1';
    const newPurchaseOrderLinesLimit = randomTwoDigitNumber();

    before('Create test data and login', () => {
      // Make sure that defaulted value is "1" in "Purchase order lines limit setting"
      cy.loginAsAdmin({
        path: SettingsMenu.ordersPath,
        waiter: SettingsOrders.waitLoadingOrderSettings,
      });
      SettingsOrders.selectContentInGeneralOrders('Purchase order lines limit');
      // First set to a random number, to make sure "Save" button is clickable
      OrderLinesLimit.setPOLLimit(defaultPurchaseOrderLinesLimit);
      SettingsOrders.verifyPurchaseOrderLinesLimit();

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.ORDERS);
        SettingsOrders.waitLoadingOrderSettings();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.newName);
    });

    it(
      'C375211 Order field mapping profile: Verify Receiving Workflow value is not deleted when default order line limit setting is changed (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C375211'] },
      () => {
        // #1 Go to "Settings" application -> Select "Orders" setting -> Select "Purchase order lines limit"
        SettingsOrders.selectContentInGeneralOrders('Purchase order lines limit');
        SettingsOrders.verifyPurchaseOrderLinesLimit();

        // #2 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Click "Actions" button -> Click "New field mapping profile" option
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.waitLoading();
        FieldMappingProfiles.openNewMappingProfileForm();

        // #3 Populate following fields:
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfile);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfile);

        // #4 Check "Purchase order lines limit setting" field in "Order information" accordion of the field mapping profile
        NewFieldMappingProfile.verifyDefaultPurchaseOrderLinesLimit(
          `"${defaultPurchaseOrderLinesLimit}"`,
        );

        // #5 Click "Save as profile & close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('New record created:');
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.clickCloseButton();

        // #6 Navigate to "Settings" application -> Select "Orders" setting -> Select "Purchase order lines limit" -> Change value to any value different from defaulted -> Click "Save" button
        SettingsMenu.selectOrders();
        SettingsOrders.selectContentInGeneralOrders('Purchase order lines limit');
        OrderLinesLimit.setPOLLimit(newPurchaseOrderLinesLimit);
        SettingsOrders.verifyPurchaseOrderLinesLimitValue(newPurchaseOrderLinesLimit);

        // #7 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Find and select the field mapping profile from step 3
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.verifyDefaultPurchaseOrderLinesLimit(
          `"${newPurchaseOrderLinesLimit}"`,
        );

        // #8 Click "Actions" button -> Select "Edit" option
        FieldMappingProfileView.edit();
        NewFieldMappingProfile.verifyDefaultPurchaseOrderLinesLimit(
          `"${newPurchaseOrderLinesLimit}"`,
        );

        // #9 Change the value in any field (e.g. change "Name" field) -> Click "Save as profile & Close" button
        NewFieldMappingProfile.addName(mappingProfile.newName);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('Record updated:');
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyProfileName(mappingProfile.newName);

        // #10 Check "Purchase order lines limit setting" field
        FieldMappingProfileView.verifyDefaultPurchaseOrderLinesLimit(
          `"${newPurchaseOrderLinesLimit}"`,
        );
      },
    );
  });
});
