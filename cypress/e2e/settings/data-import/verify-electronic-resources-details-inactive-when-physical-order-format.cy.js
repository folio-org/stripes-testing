import {
  ACQUISITION_METHOD_NAMES,
  FOLIO_RECORD_TYPE,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileEdit from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileEditForm';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const mappingProfileC380523 = {
      name: `C380523testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderFormatElectronic: '"Electronic Resource"',
      orderFormatPhysical: '"Physical Resource"',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
    };
    const mappingProfileC380525 = {
      name: `C380525testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      orderFormatElectronic: '"Electronic Resource"',
      orderFormatPhysical: '"Physical Resource"',
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PE_MIX,
      electronicUnitPrice: '"25"',
      quantityElectronic: '"1"',
      receivingWorkflow: 'Synchronized',
      materialTypeElectronic: '"electronic resource"',
      currency: 'USD',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
    };
    const mappingProfileC380527 = {
      name: `C380527testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.ELECTRONIC_RESOURCE,
      electronicUnitPrice: '"25"',
      quantityElectronic: '"1"',
      receivingWorkflow: 'Synchronized',
      materialTypeElectronic: 'electronic resource',
      currency: 'USD',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
      orderFormatOther: '"Other"',
      orderFormatPhysical: '"Physical Resource"',
    };
    const orderFormatField = {
      accordion: 'PO line details',
      fieldName: 'Order format*',
    };
    const costDetailsFields = {
      accordion: 'Cost details',
      electronicFields: ['Electronic unit price', 'Quantity electronic'],
      physicalFields: [
        { fieldName: 'Physical unit price', value: '"20"' },
        { fieldName: 'Quantity physical', value: '"1"' },
      ],
    };
    const electronicResourceFields = {
      accordion: 'E-resources details',
      fieldNames: [
        'Access provider',
        'Activation due',
        'Create inventory',
        'Material type',
        'Expected activation',
        'User limit',
        'URL',
      ],
      checkboxNames: ['Activation status', 'Trial'],
    };
    const locationFields = {
      locationQuantityElectronic: '"1"',
      accordion: 'Location',
      fieldNames: {
        locationName: 'Name (code)',
        locationQuantityElectronic: 'Quantity electronic',
      },
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Location.createViaApi(testData.defaultLocation).then((createdLocation) => {
          locationFields.locationName = `"${createdLocation.name} (${createdLocation.code})"`;
        });
      });
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
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileC380525.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileC380527.name);
      Locations.deleteViaApi(testData.defaultLocation);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
    });

    it(
      'C380523 Order field mapping profile: Verify that electronic resource details are not active when Order format is Physical resource in the create screen (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380523'] },
      () => {
        // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Click "Actions" button -> Click "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();
        // #2 Populate following fields
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfileC380523);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380523);
        // #3 Go to the "PO line details" accordion -> select "Physical Resource" option in the "Order format" field
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380523.orderFormatPhysical);
        NewFieldMappingProfile.verifyFieldValue(
          orderFormatField.accordion,
          orderFormatField.fieldName,
          mappingProfileC380523.orderFormatPhysical,
        );
        // #4 Navigate to "Cost details" accordion
        costDetailsFields.electronicFields.forEach((fieldName) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
            costDetailsFields.accordion,
            fieldName,
          );
        });
        // #5 Navigate to "Location" accordion -> click "Add location" button
        NewFieldMappingProfile.clickAddLocationButton();
        NewFieldMappingProfile.verifyRowFieldEmptyAndDisabled(
          0,
          locationFields.accordion,
          locationFields.fieldNames.locationQuantityElectronic,
        );
        // #6 Navigate to "E-resources details" accordion
        electronicResourceFields.fieldNames.forEach((fieldName) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
            electronicResourceFields.accordion,
            fieldName,
          );
        });
        electronicResourceFields.checkboxNames.forEach((fieldName) => {
          NewFieldMappingProfile.verifyCheckboxEmptyAndDisabled(
            electronicResourceFields.accordion,
            fieldName,
          );
        });
        NewFieldMappingProfile.verifyOrganizationLookUpButtonDisabled(
          electronicResourceFields.accordion,
        );
        // #7 Go to the "PO line details" accordion -> remove "Physical Resource" option in the "Order format" field
        NewFieldMappingProfile.fillOrderFormat('');
        NewFieldMappingProfile.verifyFieldValue(
          orderFormatField.accordion,
          orderFormatField.fieldName,
          '',
        );
        // #8 Navigate to "Cost details" accordion
        costDetailsFields.electronicFields.forEach((fieldName) => {
          NewFieldMappingProfile.verifyFieldEnabled(costDetailsFields.accordion, fieldName);
        });
        // #9 Navigate to "Location" accordion
        NewFieldMappingProfile.verifyFieldEnabled(
          locationFields.accordion,
          locationFields.fieldNames.locationQuantityElectronic,
        );
        // #10 Navigate to "E-resources details" accordion
        electronicResourceFields.fieldNames.forEach((fieldName) => {
          NewFieldMappingProfile.verifyFieldEnabled(electronicResourceFields.accordion, fieldName);
        });
        electronicResourceFields.checkboxNames.forEach((fieldName) => {
          NewFieldMappingProfile.verifyCheckboxEnabled(
            electronicResourceFields.accordion,
            fieldName,
          );
        });
        NewFieldMappingProfile.verifyOrganizationLookUpButtonEnabled(
          electronicResourceFields.accordion,
        );
      },
    );

    it(
      'C380525 Order field mapping profile: Verify that electronic resource details are not included when Order format is Physical resource in the editing page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380525'] },
      () => {
        // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Click "Actions" button -> Click "New field mapping profile" option
        FieldMappingProfiles.waitLoading();
        FieldMappingProfiles.openNewMappingProfileForm();
        // #2 Populate following fields
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfileC380525);
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380525.orderFormatElectronic);
        NewFieldMappingProfile.fillMaterialTypeForElectronicResource(
          mappingProfileC380525.materialTypeElectronic,
        );
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380525);
        // #3 Click "Add location" button and populate following:
        NewFieldMappingProfile.addLocation(locationFields);
        NewFieldMappingProfile.verifyRowFieldValue(
          0,
          locationFields.accordion,
          locationFields.fieldNames.locationName,
          locationFields.locationName,
        );
        NewFieldMappingProfile.verifyRowFieldValue(
          0,
          locationFields.accordion,
          locationFields.fieldNames.locationQuantityElectronic,
          locationFields.locationQuantityElectronic,
        );
        // #4 Click "Save as profile & Close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('New record created:');
        FieldMappingProfileView.verifyValueByAccordionAndSection(
          orderFormatField.accordion,
          'Order format',
          mappingProfileC380525.orderFormatElectronic,
        );
        FieldMappingProfileView.verifyValueByAccordionAndSection(
          electronicResourceFields.accordion,
          'Material type',
          mappingProfileC380525.materialTypeElectronic,
        );
        FieldMappingProfileView.verifyLocationFieldValue(
          0,
          locationFields.fieldNames.locationQuantityElectronic,
          locationFields.locationQuantityElectronic,
        );
        // #5 Click "Action" button in the top right corner of the detail view page -> Select "Edit" option
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfileC380525.name);
        // #6 In the "Order format" field select "Physical resource" option
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380525.orderFormatPhysical);
        NewFieldMappingProfile.verifyFieldValue(
          orderFormatField.accordion,
          orderFormatField.fieldName,
          mappingProfileC380525.orderFormatPhysical,
        );
        NewFieldMappingProfile.verifyFieldValue(
          orderFormatField.accordion,
          orderFormatField.fieldName,
          mappingProfileC380525.orderFormatPhysical,
        );
        // #7 Populate following fields:
        costDetailsFields.physicalFields.forEach(({ fieldName, value }) => {
          NewFieldMappingProfile.fillTextFieldInAccordion(
            costDetailsFields.accordion,
            fieldName,
            value,
          );
        });
        NewFieldMappingProfile.fillTextFieldInAccordion('Location', 'Quantity physical', '"1"');
        NewFieldMappingProfile.fillCreateInventoryForPhysicalResource('"None"');
        NewFieldMappingProfile.fillMaterialTypeForPhysicalResource('"book"');
        // #8 Navigate to "Cost details" accordion
        costDetailsFields.electronicFields.forEach((fieldName) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
            costDetailsFields.accordion,
            fieldName,
          );
        });
        // #9 Navigate to "Location" accordion -> click "Add location" button
        NewFieldMappingProfile.clickAddLocationButton();
        NewFieldMappingProfile.verifyRowFieldEmptyAndDisabled(
          0,
          locationFields.accordion,
          locationFields.fieldNames.locationQuantityElectronic,
        );
        // #10 Navigate to "E-resources details" accordion
        electronicResourceFields.fieldNames.forEach((fieldName) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
            electronicResourceFields.accordion,
            fieldName,
          );
        });
        electronicResourceFields.checkboxNames.forEach((fieldName) => {
          NewFieldMappingProfile.verifyCheckboxEmptyAndDisabled(
            electronicResourceFields.accordion,
            fieldName,
          );
        });
        NewFieldMappingProfile.verifyOrganizationLookUpButtonDisabled(
          electronicResourceFields.accordion,
        );
        // #11 Click "Save as profile & Close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('Record updated:');
        costDetailsFields.electronicFields.forEach((fieldName) => {
          FieldMappingProfileView.verifyValueByAccordionAndSection(
            costDetailsFields.accordion,
            fieldName,
            'No value set-',
          );
        });
        electronicResourceFields.fieldNames.forEach((fieldName) => {
          FieldMappingProfileView.verifyValueByAccordionAndSection(
            electronicResourceFields.accordion,
            fieldName,
            'No value set-',
          );
        });
        electronicResourceFields.checkboxNames.forEach((fieldName) => {
          FieldMappingProfileView.verifyValueByAccordionAndSection(
            electronicResourceFields.accordion,
            fieldName,
            '',
          );
        });
        FieldMappingProfileView.verifyLocationFieldValue(0, 'Quantity electronic', 'No value set-');
      },
    );

    it(
      'C380527 Order field mapping profile: Verify that electronic resource details are not included when Order format is Other in the editing page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380527'] },
      () => {
        // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Click "Actions" button -> Click "New field mapping profile" option
        FieldMappingProfiles.waitLoading();
        FieldMappingProfiles.openNewMappingProfileForm();
        // #2 Populate following fields
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfileC380527);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380527);
        // #3 Click "Add location" button and populate following
        NewFieldMappingProfile.addLocation(locationFields);
        NewFieldMappingProfile.verifyRowFieldValue(
          0,
          locationFields.accordion,
          locationFields.fieldNames.locationName,
          locationFields.locationName,
        );
        NewFieldMappingProfile.verifyRowFieldValue(
          0,
          locationFields.accordion,
          locationFields.fieldNames.locationQuantityElectronic,
          locationFields.locationQuantityElectronic,
        );
        // #4 Click "Save as profile & Close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('New record created:');
        FieldMappingProfileView.verifyValueByAccordionAndSection(
          orderFormatField.accordion,
          'Order format',
          `"${mappingProfileC380527.orderFormat}"`,
        );
        FieldMappingProfileView.verifyValueByAccordionAndSection(
          electronicResourceFields.accordion,
          'Material type',
          `"${mappingProfileC380527.materialTypeElectronic}"`,
        );
        FieldMappingProfileView.verifyLocationFieldValue(
          0,
          locationFields.fieldNames.locationQuantityElectronic,
          locationFields.locationQuantityElectronic,
        );
        // #5 Click "Action" button in the top right corner of the detail view page -> Select "Edit" option
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfileC380527.name);
        // #6 Go to the "PO line details" accordion -> select "Other" option in the "Order format" field
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380527.orderFormatOther);
        NewFieldMappingProfile.verifyFieldValue(
          orderFormatField.accordion,
          orderFormatField.fieldName,
          mappingProfileC380527.orderFormatOther,
        );
        // #7 Populate following fields:
        costDetailsFields.physicalFields.forEach(({ fieldName, value }) => {
          NewFieldMappingProfile.fillTextFieldInAccordion(
            costDetailsFields.accordion,
            fieldName,
            value,
          );
        });
        NewFieldMappingProfile.fillTextFieldInAccordion('Location', 'Quantity physical', '"1"');
        NewFieldMappingProfile.fillCreateInventoryForPhysicalResource('"None"');
        NewFieldMappingProfile.fillMaterialTypeForPhysicalResource('"book"');
        // #8 Navigate to "Cost details" accordion
        costDetailsFields.electronicFields.forEach((fieldName) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
            costDetailsFields.accordion,
            fieldName,
          );
        });
        // #9 Navigate to "Location" accordion -> click "Add location" button
        NewFieldMappingProfile.clickAddLocationButton();
        NewFieldMappingProfile.verifyRowFieldEmptyAndDisabled(
          0,
          locationFields.accordion,
          locationFields.fieldNames.locationQuantityElectronic,
        );
        // #10 Navigate to "E-resources details" accordion
        electronicResourceFields.fieldNames.forEach((fieldName) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
            electronicResourceFields.accordion,
            fieldName,
          );
        });
        electronicResourceFields.checkboxNames.forEach((fieldName) => {
          NewFieldMappingProfile.verifyCheckboxEmptyAndDisabled(
            electronicResourceFields.accordion,
            fieldName,
          );
        });
        NewFieldMappingProfile.verifyOrganizationLookUpButtonDisabled(
          electronicResourceFields.accordion,
        );
        // #11 Click "Save as profile & Close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('Record updated:');
        costDetailsFields.electronicFields.forEach((fieldName) => {
          FieldMappingProfileView.verifyValueByAccordionAndSection(
            costDetailsFields.accordion,
            fieldName,
            'No value set-',
          );
        });
        electronicResourceFields.fieldNames.forEach((fieldName) => {
          FieldMappingProfileView.verifyValueByAccordionAndSection(
            electronicResourceFields.accordion,
            fieldName,
            'No value set-',
          );
        });
        electronicResourceFields.checkboxNames.forEach((fieldName) => {
          FieldMappingProfileView.verifyValueByAccordionAndSection(
            electronicResourceFields.accordion,
            fieldName,
            '',
          );
        });
        FieldMappingProfileView.verifyLocationFieldValue(0, 'Quantity electronic', 'No value set-');
      },
    );
  });
});
