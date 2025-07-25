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
    const mappingProfileC380506 = {
      name: `C380506testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus1: ORDER_STATUSES.PENDING,
      orderStatus2: ORDER_STATUSES.OPEN,
      orderFormat1: '"Electronic Resource"',
      orderFormat2: '"Physical Resource"',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
    };
    const mappingProfileC380508 = {
      name: `C380508testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      orderFormat1: '"Electronic Resource"',
      orderFormat2: '"Physical Resource"',
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PE_MIX,
      receivingWorkflow: 'Synchronized',
      createInventoryElectronic: '"Instance"',
      currency: 'USD',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
      orderStatus2: ORDER_STATUSES.OPEN,
    };
    const physicalResourceAccordionName = 'Physical resource details';
    const orderFormatField = {
      accordion: 'PO line details',
      fieldName: 'Order format*',
    };
    const costDetailsFields = [
      {
        accordion: 'Cost details',
        fieldName: 'Physical unit price',
      },
      {
        accordion: 'Cost details',
        fieldName: 'Quantity physical',
      },
    ];
    const physicalResourceFields = [
      {
        accordion: 'Physical resource details',
        fieldName: 'Material supplier',
      },
      {
        accordion: 'Physical resource details',
        fieldName: 'Receipt due',
      },
      {
        accordion: 'Physical resource details',
        fieldName: 'Expected receipt date',
      },
      {
        accordion: 'Physical resource details',
        fieldName: 'Create inventory',
      },
      {
        accordion: 'Physical resource details',
        fieldName: 'Material type',
      },
    ];
    const locationFields = {
      quantityPhysical: {
        accordion: 'Location',
        fieldName: 'Quantity physical',
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
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileC380508.name);
    });

    it(
      'C380506 Order field mapping profile: "Create Inventory" physical resource fields are inactivated when Electronic order format is selected on Create screen (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380506'] },
      () => {
        // #1 Select "Field mapping profiles" -> Click "Actions" button -> Select "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #2 Fill in the following fields
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfileC380506);
        NewFieldMappingProfile.fillPurchaseOrderStatus(mappingProfileC380506.orderStatus1);
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380506.orderFormat1);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380506);

        // #3 Navigate to the "Physical unit price" and "Quantity physical" fields in "Cost details" accordion
        costDetailsFields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
        });

        // #4 Navigate to the "Physical resource details" accordion
        physicalResourceFields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
        });
        NewFieldMappingProfile.verifyOrganizationLookUpButtonDisabled('Physical resource details');
        NewFieldMappingProfile.verifyAddVolumeButtonDisabled();

        // #5 Click "Add location" button -> Check "Quantity physical" field
        NewFieldMappingProfile.clickAddLocationButton();
        NewFieldMappingProfile.verifyRowFieldEmptyAndDisabled(
          0,
          locationFields.quantityPhysical.accordion,
          locationFields.quantityPhysical.fieldName,
        );

        // #6 Return to the "Order format" field -> Change the value to the "Physical resource" option
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380506.orderFormat2);
        NewFieldMappingProfile.verifyFieldValue(
          orderFormatField.accordion,
          orderFormatField.fieldName,
          mappingProfileC380506.orderFormat2,
        );

        // #7 Change "Order format" field one more time to the "Electronic resource" option
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380506.orderFormat1);
        NewFieldMappingProfile.verifyFieldValue(
          orderFormatField.accordion,
          orderFormatField.fieldName,
          mappingProfileC380506.orderFormat1,
        );

        // #8 Repeat steps 3-5
        costDetailsFields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
        });
        physicalResourceFields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
        });
        NewFieldMappingProfile.clickAddLocationButton();
        NewFieldMappingProfile.verifyRowFieldEmptyAndDisabled(
          1,
          locationFields.quantityPhysical.accordion,
          locationFields.quantityPhysical.fieldName,
        );

        // After test: Close editor window
        NewFieldMappingProfile.clickClose();
        NewFieldMappingProfile.confirmCloseWithoutSaving();
        FieldMappingProfiles.waitLoading();
      },
    );

    it(
      'C380508 Order field mapping profile: "Create Inventory" physical resource fields are inactivated when Electronic order format is selected on Edit screen (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380508'] },
      () => {
        // #1 Select "Field mapping profiles" -> Click "Actions" button -> Select "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #2 Populate the following fields:
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfileC380508);
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380508.orderFormat1);
        NewFieldMappingProfile.fillCreateInventoryForElectronicResource(
          mappingProfileC380508.createInventoryElectronic,
        );
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380508);

        // #3 Click "Save as profile & Close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('New record created:');

        // #4 Click "Action" button in the top right corner of the detail view page -> Select "Edit" option
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfileC380508.name);

        // #5 Navigate to the "Physical unit price" and "Quantity physical" fields in "Cost details" accordion
        costDetailsFields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
        });

        // #6 Navigate to the "Physical resource details" accordion
        physicalResourceFields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
        });
        NewFieldMappingProfile.verifyOrganizationLookUpButtonDisabled(
          physicalResourceAccordionName,
        );
        NewFieldMappingProfile.verifyAddVolumeButtonDisabled();

        // #7 Click "Add location" button -> Check "Quantity physical" field
        NewFieldMappingProfile.clickAddLocationButton();
        NewFieldMappingProfile.verifyRowFieldEmptyAndDisabled(
          0,
          locationFields.quantityPhysical.accordion,
          locationFields.quantityPhysical.fieldName,
        );

        // #8 Navigate to the "Order format" field -> Change the value to the "Physical resource" option
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380508.orderFormat2);
        NewFieldMappingProfile.verifyFieldValue(
          orderFormatField.accordion,
          orderFormatField.fieldName,
          mappingProfileC380508.orderFormat2,
        );

        // #9 Change "Order format" field one more time to the "Electronic resource" option
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380508.orderFormat1);
        NewFieldMappingProfile.verifyFieldValue(
          orderFormatField.accordion,
          orderFormatField.fieldName,
          mappingProfileC380508.orderFormat1,
        );

        // #10 Repeat steps 5-7
        costDetailsFields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
        });
        physicalResourceFields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
        });
        NewFieldMappingProfile.clickAddLocationButton();
        NewFieldMappingProfile.verifyRowFieldEmptyAndDisabled(
          1,
          locationFields.quantityPhysical.accordion,
          locationFields.quantityPhysical.fieldName,
        );
      },
    );
  });
});
