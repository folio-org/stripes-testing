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
    const randomNumber = randomTwoDigitNumber();
    const defaultPurchaseOrderLinesLimit = '1';
    const newPurchaseOrderLinesLimit = '15';

    before('Create test data', () => {
      // Make sure that defaulted value is "1" in "Purchase order lines limit setting"
      cy.loginAsAdmin({
        path: SettingsMenu.ordersPath,
        waiter: SettingsOrders.waitLoadingOrderSettings,
      });
      SettingsOrders.selectContentInGeneralOrders('Purchase order lines limit');
      // First set to a random number, to make sure "Save" button is clickable
      SettingsOrders.setPurchaseOrderLinesLimit(randomNumber);
      SettingsOrders.setPurchaseOrderLinesLimit(defaultPurchaseOrderLinesLimit);
      SettingsOrders.verifyPurchaseOrderLinesLimitValue(defaultPurchaseOrderLinesLimit);

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.newName);
    });

    it(
      'C375211 Order field mapping profile: Verify Receiving Workflow value is not deleted when default order line limit setting is changed (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Go to "Settings" application -> Select "Orders" setting -> Select "Purchase order lines limit"
        cy.visit(SettingsMenu.ordersPath);
        SettingsOrders.waitLoadingOrderSettings();
        SettingsOrders.selectContentInGeneralOrders('Purchase order lines limit');
        SettingsOrders.verifyPurchaseOrderLinesLimitValue(defaultPurchaseOrderLinesLimit);

        // #2 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Click "Actions" button -> Click "New field mapping profile" option
        cy.visit(SettingsMenu.mappingProfilePath);
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

        // #6 Navigate to "Settings" application -> Select "Orders" setting -> Select "Purchase order lines limit" -> Change value to any value different from defaulted -> Click "Save" button
        cy.visit(SettingsMenu.ordersPath);
        SettingsOrders.waitLoadingOrderSettings();
        SettingsOrders.selectContentInGeneralOrders('Purchase order lines limit');
        SettingsOrders.setPurchaseOrderLinesLimit(newPurchaseOrderLinesLimit);
        SettingsOrders.verifyPurchaseOrderLinesLimitValue(newPurchaseOrderLinesLimit);

        // #7 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Find and select the field mapping profile from step 3
        cy.visit(SettingsMenu.mappingProfilePath);
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
