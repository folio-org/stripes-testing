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
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';

describe('data-import', () => {
  describe('Settings', () => {
    const testData = {};
    const mappingProfileC380560 = {
      name: `C380560testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.OPEN,
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
    };
    const mappingProfileC380561 = {
      name: `C380561testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.OPEN,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PE_MIX,
      receivingWorkflow: 'Synchronized',
      currency: 'USD',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
    };
    const fields = {
      purchaseOrderStatus: { accordion: 'Order information', fieldName: 'Purchase order status*' },
      materialTypePhysical: { accordion: 'Physical resource details', fieldName: 'Material type' },
      materialTypeElectronic: { accordion: 'E-resources details', fieldName: 'Material type' },
    };

    before('Create test data', () => {
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
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileC380561.name);
    });

    it(
      'C380560 Order field mapping profile: Material type field is inactive when Order status is Open in the Create page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Select "Field mapping profiles" -> Click "Actions" button -> Select "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #2 Populate the following fields:
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfileC380560);
        NewFieldMappingProfile.fillPurchaseOrderStatus(mappingProfileC380560.orderStatus);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380560);

        // #3 Navigate to the "Material type" field in the "Physical resource details" accordion
        NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
          fields.materialTypePhysical.accordion,
          fields.materialTypePhysical.fieldName,
        );
        NewFieldMappingProfile.verifyInfoIconClickable(
          fields.materialTypePhysical.accordion,
          fields.materialTypePhysical.fieldName,
        );

        // #4 Navigate to the "Material type" field in the "E-resources details" accordion
        NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
          fields.materialTypeElectronic.accordion,
          fields.materialTypeElectronic.fieldName,
        );
        NewFieldMappingProfile.verifyInfoIconClickable(
          fields.materialTypeElectronic.accordion,
          fields.materialTypeElectronic.fieldName,
        );

        // #5 Navigate to the "Location" accordion
        NewFieldMappingProfile.verifyAddLocationButtonEnabled();

        // After test: Close editor window
        NewFieldMappingProfile.clickClose();
        NewFieldMappingProfile.confirmCloseWithoutSaving();
        FieldMappingProfiles.waitLoading();
      },
    );

    it(
      'C380561 Order field mapping profile: Material type field is inactive when Order status is Open in the editing page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Select "Field mapping profiles" -> Click "Actions" button -> Select "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #2 Populate the following fields:
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfileC380561);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfileC380561);

        // #3 Click "Save as profile & Close" button
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage('New record created:');
        FieldMappingProfileView.verifyMappingProfileOpened();

        // #4 Click "Action" button in the top right corner of the detail view page -> Select "Edit" option
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfileC380561.name);

        // #5 Navigate to the "Material type" field in the "Physical resource details" accordion
        NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
          fields.materialTypePhysical.accordion,
          fields.materialTypePhysical.fieldName,
        );
        NewFieldMappingProfile.verifyInfoIconClickable(
          fields.materialTypePhysical.accordion,
          fields.materialTypePhysical.fieldName,
        );

        // #6 Navigate to the "Material type" field in the "E-resources details" accordion
        NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
          fields.materialTypeElectronic.accordion,
          fields.materialTypeElectronic.fieldName,
        );
        NewFieldMappingProfile.verifyInfoIconClickable(
          fields.materialTypeElectronic.accordion,
          fields.materialTypeElectronic.fieldName,
        );
        // #7 Navigate to the "Location" accordion
        NewFieldMappingProfile.verifyAddLocationButtonEnabled();
      },
    );
  });
});
