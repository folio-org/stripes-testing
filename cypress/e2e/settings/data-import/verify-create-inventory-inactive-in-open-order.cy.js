import {
  ACQUISITION_METHOD_NAMES,
  FOLIO_RECORD_TYPE,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfileEdit from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileEditForm';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {};
    const mappingProfileC380444 = {
      name: `C380444testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus1: ORDER_STATUSES.PENDING,
      orderStatus2: ORDER_STATUSES.OPEN,
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
    };
    const mappingProfileC380445 = {
      name: `C380445testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PE_MIX,
      receivingWorkflow: 'Synchronized',
      currency: 'USD',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
      orderStatus2: ORDER_STATUSES.OPEN,
    };
    const fields = {
      createInventoryPhysical: {
        accordion: 'Physical resource details',
        fieldName: 'Create inventory',
        value: '"Instance"',
      },
      createInventoryElectronic: {
        accordion: 'E-resources details',
        fieldName: 'Create inventory',
        value: '"Instance"',
      },
    };

    before('Create test user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    beforeEach('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileC380445.name);
    });

    it(
      'C380444 Order field mapping profile: "Create Inventory" fields are inactivated when Order status is Open (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380444'] },
      () => {
        // #1 Select "Field mapping profiles" -> Click "Actions" button -> Select "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #2 Fill in the following fields:
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfileC380444);
        NewFieldMappingProfile.fillPurchaseOrderStatus(mappingProfileC380444.orderStatus1);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380444);

        // // #3 Navigate to the "Create inventory" field in the "Physical resource details" accordion
        NewFieldMappingProfile.verifyFieldEnabled(
          fields.createInventoryPhysical.accordion,
          fields.createInventoryPhysical.fieldName,
        );

        // #4 Select a value from the dropdown list of the "Create inventory" field
        NewFieldMappingProfile.fillCreateInventoryForPhysicalResource(
          fields.createInventoryPhysical.value,
        );
        NewFieldMappingProfile.verifyFieldValue(
          fields.createInventoryPhysical.accordion,
          fields.createInventoryPhysical.fieldName,
          fields.createInventoryPhysical.value,
        );

        // #5 Navigate to the "Create inventory" field in the "E-resources details" accordion
        NewFieldMappingProfile.verifyFieldEnabled(
          fields.createInventoryElectronic.accordion,
          fields.createInventoryElectronic.fieldName,
        );

        // #6 Select a value from the dropdown list of the "Create inventory" field
        NewFieldMappingProfile.fillCreateInventoryForElectronicResource(
          fields.createInventoryElectronic.value,
        );
        NewFieldMappingProfile.verifyFieldValue(
          fields.createInventoryElectronic.accordion,
          fields.createInventoryElectronic.fieldName,
          fields.createInventoryElectronic.value,
        );

        // #7 Return to the "Purchase order status" in the "Order information" accordion: select "Open" option
        NewFieldMappingProfile.fillPurchaseOrderStatus(mappingProfileC380444.orderStatus2);

        // #8 Navigate back to the "Create inventory" field in the "Physical resource details" accordion
        NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
          fields.createInventoryPhysical.accordion,
          fields.createInventoryPhysical.fieldName,
        );
        NewFieldMappingProfile.verifyInfoIconClickable(
          fields.createInventoryPhysical.accordion,
          fields.createInventoryPhysical.fieldName,
        );

        // #9 Navigate back to the "Create inventory" field in the "E-resources details" accordion
        NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
          fields.createInventoryElectronic.accordion,
          fields.createInventoryElectronic.fieldName,
        );
        NewFieldMappingProfile.verifyInfoIconClickable(
          fields.createInventoryElectronic.accordion,
          fields.createInventoryElectronic.fieldName,
        );

        // After test: Close editor window
        NewFieldMappingProfile.clickClose();
        NewFieldMappingProfile.confirmCloseWithoutSaving();
        FieldMappingProfiles.waitLoading();
      },
    );

    it(
      'C380445 Order field mapping profile: "Create Inventory" fields are inactivated when Order status is Open in editing page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380445'] },
      () => {
        // #1 Select "Field mapping profiles" -> Click "Actions" button -> Select "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #2 Populate the following fields:
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfileC380445);
        NewFieldMappingProfile.fillCreateInventoryForPhysicalResource(
          fields.createInventoryPhysical.value,
        );
        NewFieldMappingProfile.fillCreateInventoryForElectronicResource(
          fields.createInventoryElectronic.value,
        );
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380445);
        NewFieldMappingProfile.verifyFieldValue(
          fields.createInventoryElectronic.accordion,
          fields.createInventoryElectronic.fieldName,
          fields.createInventoryElectronic.value,
        );
        NewFieldMappingProfile.verifyFieldValue(
          fields.createInventoryElectronic.accordion,
          fields.createInventoryElectronic.fieldName,
          fields.createInventoryElectronic.value,
        );

        // #3 Click "Save as profile & Close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('New record created:');
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyValueByAccordionAndSection(
          fields.createInventoryPhysical.accordion,
          fields.createInventoryPhysical.fieldName,
          fields.createInventoryPhysical.value,
        );
        FieldMappingProfileView.verifyValueByAccordionAndSection(
          fields.createInventoryElectronic.accordion,
          fields.createInventoryElectronic.fieldName,
          fields.createInventoryElectronic.value,
        );

        // #4 Click "Action" button in the top right corner of the detail view page -> Select "Edit" option
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfileC380445.name);

        // #5 In the "Purchase order status" field select "Open" option
        NewFieldMappingProfile.fillPurchaseOrderStatus(mappingProfileC380445.orderStatus2);

        // #6 Navigate to the "Create inventory" field in the "Physical resource details" accordion
        NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
          fields.createInventoryPhysical.accordion,
          fields.createInventoryPhysical.fieldName,
        );
        NewFieldMappingProfile.verifyInfoIconClickable(
          fields.createInventoryPhysical.accordion,
          fields.createInventoryPhysical.fieldName,
        );

        // #7 Navigate to the "Create inventory" field in the "E-resources details" accordion
        NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
          fields.createInventoryElectronic.accordion,
          fields.createInventoryElectronic.fieldName,
        );
        NewFieldMappingProfile.verifyInfoIconClickable(
          fields.createInventoryElectronic.accordion,
          fields.createInventoryElectronic.fieldName,
        );

        // #8 Click "Save as profile & Close" button
        FieldMappingProfileEdit.save();
        FieldMappingProfileView.checkCalloutMessage('Record updated:');
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyValueByAccordionAndSection(
          fields.createInventoryPhysical.accordion,
          fields.createInventoryPhysical.fieldName,
          'No value set-',
        );
        FieldMappingProfileView.verifyValueByAccordionAndSection(
          fields.createInventoryElectronic.accordion,
          fields.createInventoryElectronic.fieldName,
          'No value set-',
        );
      },
    );
  });
});
