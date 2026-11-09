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
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
// TO DO: uncomment when https://folio-org.atlassian.net/browse/UIDATIMP-1773 is fixed
// import { Addresses } from '../../../support/fragments/settings/tenant/general';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {};
    const mappingProfile = {
      name: `AT_C353548_MappingProfile_${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      existingRecordType: FOLIO_RECORD_TYPE.INVOICE,
      // the same value that "Today" in the Invoice date dropdown inserts
      invoiceDate: '###TODAY###',
      batchGroup: BATCH_GROUP.FOLIO,
      vendorInvoiceNumber: '12345',
      vendorName: VENDOR_NAMES.EBSCO,
      paymentMethod: PAYMENT_METHOD.CASH,
      currency: '"USD"',
      invoiceLineDescription: 'test',
      quantity: '1',
      subtotal: '1',
    };
    // TO DO: uncomment when https://folio-org.atlassian.net/browse/UIDATIMP-1773 is fixed
    // const billToNameField = 'Invoice information -> Bill to name';
    // TO DO: uncomment when https://folio-org.atlassian.net/browse/UIDATIMP-1773 is fixed
    // const billToAddress = Addresses.generateAddressConfig();
    const invoiceFields = {
      acquisitionsUnits: 'Invoice information -> Acquisitions units',
      batchGroup: 'Invoice information -> Batch group',
      proRate: 'Invoice adjustments -> Pro rate',
      relationToTotal: 'Invoice adjustments -> Relation to total',
      paymentMethod: 'Extended information -> Payment method',
      currency: 'Extended information -> Currency',
      lineRelationToTotal: 'Invoice line adjustments -> Relation to total',
    };
    // in the order they are placed on the form
    const quotedValueFields = Object.values(invoiceFields);
    const invalidValue = `"AT_C353548_${getRandomLetters(10)}"`;
    const saveButtonIsActive = [
      { label: 'Save as profile & Close', conditions: { disabled: false } },
    ];

    before('Create test data and login', () => {
      cy.getAdminToken();
      // Guarantees the "Acquisitions units" accepted values list is not empty
      AcquisitionUnits.createAcquisitionUnitViaApi(
        AcquisitionUnits.getDefaultAcquisitionUnit(),
      ).then((acquisitionUnit) => {
        testData.acquisitionUnit = acquisitionUnit;
      });
      // TO DO: uncomment when https://folio-org.atlassian.net/browse/UIDATIMP-1773 is fixed
      // Addresses.createAddressViaApi(billToAddress);

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnit.id, false);
      // TO DO: uncomment when https://folio-org.atlassian.net/browse/UIDATIMP-1773 is fixed
      // Addresses.deleteAddressViaApi(billToAddress);
    });

    // Commented steps will fail due to https://folio-org.atlassian.net/browse/UIDATIMP-1773
    it(
      'C353548 Check UI validation for some additional Invoice field mapping profile fields (promin)',
      { tags: ['extendedPath', 'promin', 'C353548'] },
      () => {
        // Step 1: Settings > Data import > Field mapping profiles - list of profiles is shown
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();

        // Step 2: Actions > New; fill the required invoice fields; save the profile
        FieldMappingProfiles.openNewMappingProfileForm();
        FieldMappingProfiles.checkNewMappingProfileFormIsOpened();
        NewFieldMappingProfile.addName(mappingProfile.name);
        NewFieldMappingProfile.addIncomingRecordType(mappingProfile.incomingRecordType);
        NewFieldMappingProfile.addFolioRecordType(mappingProfile.existingRecordType);
        NewFieldMappingProfile.fillInvoiceDate(mappingProfile.invoiceDate);
        NewFieldMappingProfile.fillBatchGroup(mappingProfile.batchGroup);
        NewFieldMappingProfile.fillVendorInvoiceNumber(mappingProfile.vendorInvoiceNumber);
        NewFieldMappingProfile.fillVendorName(mappingProfile.vendorName);
        NewFieldMappingProfile.fillPaymentMethod(mappingProfile.paymentMethod);
        NewFieldMappingProfile.fillCurrency(mappingProfile.currency);
        NewFieldMappingProfile.fillInvoiceLineDescription(mappingProfile.invoiceLineDescription);
        NewFieldMappingProfile.fillQuantity(mappingProfile.quantity);
        NewFieldMappingProfile.fillSubTotal(mappingProfile.subtotal);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.verifyMappingProfileOpened();

        // Step 3: Actions > Edit - the profile is shown in edit mode
        const editForm = FieldMappingProfileView.clickEditButton();

        // Step 4: Delete data from a required field (Name) and save - the form is not saved,
        // the field is focused and the browser asks to fill it out; Save stays active
        editForm.clearProfileName();
        editForm.clickSaveAndCloseButton({ profileCreated: false });
        editForm.checkProfileNameRequiredError();

        // Step 5: Fill the field with a valid value - it is shown as a regular field again
        editForm.fillMappingProfileFields({ summary: { name: mappingProfile.name } });
        editForm.checkProfileNameIsValid();

        // Step 6: Assign an unknown quoted value to the fields accepting quoted values - each of
        // them is outlined in red with a syntax error message; Save stays active
        editForm.addInvoiceAdjustment();
        editForm.addInvoiceLineAdjustment();
        editForm.fillInvoiceFields(quotedValueFields, invalidValue);
        editForm.checkInvoiceFieldsSyntaxError(quotedValueFields);
        // TO DO: uncomment when https://folio-org.atlassian.net/browse/UIDATIMP-1773 is fixed
        // editForm.fillInvoiceFields([billToNameField], invalidValue);
        // TO DO: uncomment when https://folio-org.atlassian.net/browse/UIDATIMP-1773 is fixed
        // editForm.checkInvoiceFieldsSyntaxError([billToNameField]);
        editForm.checkButtonsConditions(saveButtonIsActive);

        // Step 7: Save - the form is not saved, the first field with an invalid value is focused
        editForm.clickSaveAndCloseButton({ profileCreated: false });
        editForm.verifyFormView();
        editForm.checkInvoiceFieldIsFocused(invoiceFields.acquisitionsUnits);

        // Step 8: Replace the invalid values with values from the dropdown lists - errors disappear
        editForm.selectFirstAcceptedValueInInvoiceFields(quotedValueFields);
        editForm.checkInvoiceFieldsAreValid(quotedValueFields);
        // TO DO: uncomment when https://folio-org.atlassian.net/browse/UIDATIMP-1773 is fixed
        // editForm.selectFirstAcceptedValueInInvoiceFields([billToNameField]);
        // TO DO: uncomment when https://folio-org.atlassian.net/browse/UIDATIMP-1773 is fixed
        // editForm.checkInvoiceFieldsAreValid([billToNameField]);
        editForm.checkButtonsConditions(saveButtonIsActive);

        // Step 9: Save the updated profile
        editForm.clickSaveAndCloseButton({ profileCreated: false, profileUpdated: true });
      },
    );
  });
});
