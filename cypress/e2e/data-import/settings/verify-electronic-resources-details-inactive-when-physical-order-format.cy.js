import {
  FOLIO_RECORD_TYPE,
  ORDER_STATUSES,
  VENDOR_NAMES,
  ACQUISITION_METHOD_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';

describe('data-import', () => {
  describe('Settings', () => {
    const testData = {};
    const mappingProfileC380523 = {
      name: `C380523testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus1: ORDER_STATUSES.PENDING,
      orderStatus2: ORDER_STATUSES.OPEN,
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
      receivingWorkflow: 'Synchronized',
      materialTypeElectronic: '"Instance"',
      currency: 'USD',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
      orderStatus2: ORDER_STATUSES.OPEN,
    };
    const electronicResourceAccordionName = 'E-resource details';
    const orderFormatField = {
      accordion: 'PO line details',
      fieldName: 'Order format*',
    };
    const costDetailsFields = [
      {
        accordion: 'Cost details',
        fieldName: 'Electronic unit price',
      },
      {
        accordion: 'Cost details',
        fieldName: 'Quantity electronic',
      },
    ];
    const electronicResourceFields = [
      {
        accordion: 'E-resources details',
        fieldName: 'Access provider',
        type: 'TextField',
      },
      {
        accordion: 'E-resources details',
        fieldName: 'Activation status',
        type: 'Checkbox',
      },
      {
        accordion: 'E-resources details',
        fieldName: 'Activation due',
        type: 'TextField',
      },
      {
        accordion: 'E-resources details',
        fieldName: 'Create inventory',
        type: 'TextField',
      },
      {
        accordion: 'E-resources details',
        fieldName: 'Material type',
        type: 'TextField',
      },
      {
        accordion: 'E-resources details',
        fieldName: 'Trial',
        type: 'Checkbox',
      },
      {
        accordion: 'E-resources details',
        fieldName: 'Expected activation',
        type: 'TextField',
      },
      {
        accordion: 'E-resources details',
        fieldName: 'User limit',
        type: 'TextField',
      },
      {
        accordion: 'E-resources details',
        fieldName: 'URL',
        type: 'TextField',
      },
    ];
    const locationFields = {
      quantityElectronic: {
        accordion: 'Location',
        fieldName: 'Quantity electronic',
      },
    };

    before('Create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
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
      // FieldMappingProfileView.deleteViaApi(mappingProfileC380525.name);
      // FieldMappingProfileView.deleteViaApi(mappingProfileC380527.name);
    });

    it(
      'C380523 Order field mapping profile: Verify that electronic resource details are not active when Order format is Physical resource in the create screen (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Click "Actions" button -> Click "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfileC380523);
        NewFieldMappingProfile.fillPurchaseOrderStatus(mappingProfileC380523.orderStatus1);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380523);
        // #3 Go to the "PO line details" accordion -> select "Physical Resource" option in the "Order format" field
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380523.orderFormatPhysical);
        NewFieldMappingProfile.verifyFieldValue(
          orderFormatField.accordion,
          orderFormatField.fieldName,
          mappingProfileC380523.orderFormatPhysical,
        );
        // #4 Navigate to "Cost details" accordion
        costDetailsFields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
        });
        // #5 Navigate to "Location" accordion -> click "Add location" button
        NewFieldMappingProfile.clickAddLocationButton();
        NewFieldMappingProfile.verifyRowFieldEmptyAndDisabled(
          0,
          locationFields.quantityElectronic.accordion,
          locationFields.quantityElectronic.fieldName,
        );
        // #6 Navigate to "E-resources details" accordion
        electronicResourceFields.forEach(({ accordion, fieldName, type }) => {
          if (type === 'TextField') {
            NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
          } else {
            NewFieldMappingProfile.verifyCheckboxDisabled(accordion, fieldName);
          }
        });
        NewFieldMappingProfile.verifyOrganizationLookUpButtonDisabled(
          electronicResourceAccordionName,
        );
        // #7 Go to the "PO line details" accordion -> remove "Physical Resource" option in the "Order format" field
        NewFieldMappingProfile.fillOrderFormat('');
        NewFieldMappingProfile.verifyFieldValue(
          orderFormatField.accordion,
          orderFormatField.fieldName,
          '',
        );
        // #8 Navigate to "Cost details" accordion
        costDetailsFields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEnabled(accordion, fieldName);
        });
        // #9 Navigate to "Location" accordion
        NewFieldMappingProfile.verifyFieldEnabled(
          locationFields.quantityElectronic.accordion,
          locationFields.quantityElectronic.fieldName,
        );
        // #10 Navigate to "E-resources details" accordion
        electronicResourceFields.forEach(({ accordion, fieldName, type }) => {
          if (type === 'TextField') {
            NewFieldMappingProfile.verifyFieldEnabled(accordion, fieldName);
          } else {
            NewFieldMappingProfile.verifyCheckboxEnabled(accordion, fieldName);
          }
        });
        NewFieldMappingProfile.verifyOrganizationLookUpButtonEnabled(
          electronicResourceAccordionName,
        );

        // After test: Close editor window
        NewFieldMappingProfile.clickClose();
        NewFieldMappingProfile.confirmCloseWithoutSaving();
        FieldMappingProfiles.waitLoading();
      },
    );

    it(
      'C380525 Order field mapping profile: Verify that electronic resource details are not included when Order format is Physical resource in the editing page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Click "Actions" button -> Click "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();
        // #2 Populate following fields:
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfileC380525);
        NewFieldMappingProfile.fillOrderFormat(mappingProfileC380525.orderFormatElectronic);
        // * "Electronic unit price" field: enter "25"
        // * "Quantity electronic" field: enter "1"
        NewFieldMappingProfile.fillMaterialTypeForElectronicResource(
          mappingProfileC380525.materialTypeElectronic,
        );
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380525);
        // Data in the profile corresponds to the entered data
        // #3 Click "Add location" button and populate following:
        // * "Name (code)" field: select any value from the dropdown list
        // * "Quantity electronic" field: enter "1"
        // Data in the profile corresponds to the entered data
        // #4 Click "Save as profile & Close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('New record created:');
        // * Selected from previous steps values for electronic order format are displayed in the detail view page
        // #5 Click "Action" button in the top right corner of the detail view page -> Select "Edit" option
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfileC380525.name);
        // #6 In the "Order format" field select "Physical resource" option
        // "Physical resource" option is selected in the "Order format" field
        // #7 Populate following fields:
        // * In the "Cost details" accordion
        //   * "Physical unit price": enter "20"
        //   * "Quantity physical": enter "1"
        // * In the "Location" accordion:
        //   * "Quantity physical": enter "1"
        // * In the "Physical resource details" accordion":
        //   * "Create inventory": select "None" option
        //   * "Material type": select "book" option
        // Data in the profile corresponds to the entered data
        // #8 Navigate to "Cost details" accordion
        costDetailsFields.forEach(({ accordion, fieldName }) => {
          NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
        });
        // #9 Navigate to "Location" accordion -> click "Add location" button
        NewFieldMappingProfile.clickAddLocationButton();
        NewFieldMappingProfile.verifyRowFieldEmptyAndDisabled(
          0,
          locationFields.quantityElectronic.accordion,
          locationFields.quantityElectronic.fieldName,
        );
        // #10 Navigate to "E-resources details" accordion
        electronicResourceFields.forEach(({ accordion, fieldName, type }) => {
          if (type === 'TextField') {
            NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
          } else {
            NewFieldMappingProfile.verifyCheckboxDisabled(accordion, fieldName);
          }
        });
        NewFieldMappingProfile.verifyOrganizationLookUpButtonEnabled(
          electronicResourceAccordionName,
        );
        // #11 Click "Save as profile & Close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('Record updated:');
        // * Data in the profile in the detail view page corresponds to the entered data
        // * Following fields are empty and **do not contain** previously entered data in the detail view page:
        //   * "Cost details" accordion "Electronic unit price"
        //   * "Cost details" accordion "Quantity electronic"
        //   * "Location" accordion" "Quantity electronic"
        //   * any data in the "E-resources" accordion
        costDetailsFields.forEach(({ accordion, fieldName }) => {
          FieldMappingProfileView.verifyValueByAccordionAndSection(
            accordion,
            fieldName,
            'No value set-',
          );
        });
        electronicResourceFields.forEach(({ accordion, fieldName }) => {
          FieldMappingProfileView.verifyValueByAccordionAndSection(
            accordion,
            fieldName,
            'No value set-',
          );
        });
        FieldMappingProfileView.verifyValueByAccordionAndSection(
          locationFields.quantityElectronic.accordion,
          locationFields.quantityElectronic.fieldName,
          'No value set-',
        );
      },
    );

    // it(
    //   'C380527 Order field mapping profile: Verify that electronic resource details are not included when Order format is Other in the editing page (folijet) (TaaS)',
    //   { tags: ['extendedPath', 'folijet'] },
    //   () => {
    //     // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Field mapping profiles" -> Click "Actions" button -> Click "New field mapping profile" option
    //     FieldMappingProfiles.openNewMappingProfileForm();
    //     // #2 Populate following fields:
    //     // * "Name*" field - enter unique name (eg. Test Order_Other)
    //     // * "Incoming record type*" dropdown - select "MARC Bibliographic" option
    //     // * "FOLIO record type*" dropdown - select "Order" option
    //     // * "Purchase order status": select "Pending" option
    //     // * "Vendor": select "GOBI Library Solutions" option via the "Organization look-up" option link
    //     // * "Title": enter 245$a (without quotation marks)
    //     // * "Acquisition method": select any value from the dropdown list
    //     // * "Order format": select "Electronic Resource" option
    //     // * "Receiving workflow": select "Synchronized" option
    //     // * "Currency": select any value from the dropdown list
    //     // * "Electronic unit price" field: enter "25"
    //     // * "Quantity electronic" field: enter "1"
    //     // * "Material type" (E-resources accordion) - Select "electronic resource" from dropdown list
    //     NewFieldMappingProfile.fillOrderMappingProfile(mappingProfileC380527);
    //     NewFieldMappingProfile.fillOrderFormat(mappingProfileC380527.orderFormat1);
    //     NewFieldMappingProfile.fillCreateInventoryForElectronicResource(
    //       mappingProfileC380525.createInventoryElectronic,
    //     );
    //     NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380527);
    //     // Data in the profile corresponds to the entered data
    //     // #3 Click "Add location" button and populate following:
    //     // * "Name (code)" field: select any value from the dropdown list
    //     // * "Quantity electronic" field: enter "1"
    //     // Data in the profile corresponds to the entered data
    //     // #4 Click "Save as profile & Close" button
    //     NewFieldMappingProfile.save();
    //     FieldMappingProfileView.checkCalloutMessage('Record updated:');
    //     // * Selected from previous steps values for electronic order format are displayed in the detail view page
    //     // #5 Click "Action" button in the top right corner of the detail view page -> Select "Edit" option
    //     FieldMappingProfileView.edit();
    //     FieldMappingProfileEdit.verifyScreenName(mappingProfileC380525.name);
    //     // #6 Go to the "PO line details" accordion -> select "Other" option in the "Order format" field
    //     // "Other" option is selected in the "Order format" field
    //     // #7 Populate following fields:
    //     // * In the "Cost details" accordion
    //     //   * "Physical unit price": enter "20"
    //     //   * "Quantity physical": enter "1"
    //     // * In the "Location" accordion:
    //     //   * "Quantity physical": enter "1"
    //     // * In the "Physical resource details" accordion":
    //     //   * "Create inventory": select "None" option
    //     //   * "Material type": select "book" option
    //     // Data in the profile corresponds to the entered data
    //     // #8 Navigate to "Cost details" accordion
    //     costDetailsFields.forEach(({ accordion, fieldName }) => {
    //       NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
    //     });
    //     // #9 Navigate to "Location" accordion -> click "Add location" button
    //     NewFieldMappingProfile.clickAddLocationButton();
    //     NewFieldMappingProfile.verifyRowFieldEmptyAndDisabled(
    //       0,
    //       locationFields.quantityElectronic.accordion,
    //       locationFields.quantityElectronic.fieldName,
    //     );
    //     // #10 Navigate to "E-resources details" accordion
    //     // Following fields and checkboxes are greyed out and **disabled** in the "E-resources details" accordions:
    //     // * "Access provider"
    //     // * "Access provider" Organization look-up
    //     // * "Activation status"
    //     // * "Activation due"
    //     // * "Create inventory"
    //     // * "Material type"
    //     // * "Trial"
    //     // * "Expected activation"
    //     // * "User limit"
    //     // * "URL"
    //     electronicResourceFields.forEach(({ accordion, fieldName }) => {
    //       NewFieldMappingProfile.verifyFieldEmptyAndDisabled(accordion, fieldName);
    //     });
    //     NewFieldMappingProfile.verifyOrganizationLookUpButtonDisabled(
    //       electronicResourceAccordionName,
    //     );
    //     // #11 Click "Save as profile & Close" button
    //     NewFieldMappingProfile.save();
    //     FieldMappingProfileView.checkCalloutMessage('New record created:');
    //     // * Data in the profile in the detail view page corresponds to the entered data
    //     // * Following fields are empty and do not contain previously entered data in the detail view page:
    //     //   * "Cost details" accordion "Electronic unit price"
    //     //   * "Cost details" accordion "Quantity electronic"
    //     //   * "Location" accordion" "Quantity electronic"
    //     //   * any data in the "E-resources" accordion
    //   },
    // );
  });
});
