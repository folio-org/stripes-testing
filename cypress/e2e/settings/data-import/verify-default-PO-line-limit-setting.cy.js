import {
  ACQUISITION_METHOD_NAMES,
  FOLIO_RECORD_TYPE,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import OrderLinesLimit from '../../../support/fragments/settings/orders/orderLinesLimit';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      orderLinesLimit: '"1"',
    };
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

    before('Create test data and login', () => {
      // Make sure that defaulted value is "1" in "Purchase order lines limit setting"
      cy.getAdminToken();
      OrderLinesLimit.setPOLLimitViaApi(1);
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
      { tags: ['extendedPath', 'folijet', 'C374181'] },
      () => {
        // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Click "Actions" button -> Click "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();
        // #2 Populate following fields:
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfile);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfile);
        // #3 Check "Purchase order lines limit setting" field in "Order information" accordion
        NewFieldMappingProfile.verifyDefaultPurchaseOrderLinesLimit(testData.orderLinesLimit);
        // #4 Click "Save as profile & close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('New record created:');
        FieldMappingProfileView.verifyMappingProfileOpened();
        // #5 Check "Purchase order lines limit setting" field in "Order information" accordion of the Settings details view screen
        FieldMappingProfileView.verifyDefaultPurchaseOrderLinesLimit(testData.orderLinesLimit);
      },
    );
  });
});
