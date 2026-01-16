import { DEFAULT_JOB_PROFILE_NAMES, LOCATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import { CALL_NUMBER_TYPES_DEFAULT } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import inventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      instanceTitle: 'AT_C983156_Instance',
      editedHoldingsFileName: 'C983156EditedHoldingsFile.mrc',
      holdingsHRIDPlaceholder: 'in00000001039',
      statisticalCode: 'Book, print (books)',
      administrativeNote: 'C983156AdmNote',
      callNumber: 'C983156CN',
      callNumberType: CALL_NUMBER_TYPES_DEFAULT.DEWEY_DECIMAL_CLASSIFICATION,
      callNumberPrefix: 'C983156Prefix',
      callNumberSuffix: 'C983156Suffix',
      numberOfItems: 'C983156_10',
      illPolicy: 'Will lend',
      digitizationPolicy: 'C983156_digPol',
      retentionPolicy: 'C983156_retPol',
      acquisitionMethod: 'C983156_acqMethod',
      orderFormat: 'C983156_ordFormat',
      receiptStatus: 'C983156_recStatus',
      enumeration: 'C983156_enumeration',
      chronology: 'C983156_chronology',
      tag035newValue: '$a Updated field',
    };

    const instanceFile = {
      marc: 'marcBibFileC983156.mrc',
      fileName: `testMarcFile.C983156.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const holdingsFile = {
      marc: 'marcHoldingsFileC983156.mrc',
      fileName: `testMarcFile.C983156.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
      numOfRecords: 1,
    };
    const locations = {};
    const recordIDs = [];

    before('Creating user, data', () => {
      cy.getAdminToken();
      const locationQueries = [{ name: LOCATION_NAMES.ANNEX_UI, property: 'holdingsTemporary' }];
      cy.then(() => {
        locationQueries.forEach((location) => {
          cy.getLocations({ query: `name="${location.name}"` }).then((locationData) => {
            locations[location.property] = locationData;
          });
        });
      });
      DataImport.uploadFileViaApi(
        instanceFile.marc,
        instanceFile.fileName,
        instanceFile.jobProfileToRun,
      ).then((response) => {
        recordIDs.push(response[0].instance.id);
        const instanceHRID = response[0].instance.hrid;

        DataImport.editMarcFile(
          holdingsFile.marc,
          testData.editedHoldingsFileName,
          [testData.holdingsHRIDPlaceholder],
          [instanceHRID],
        );
      });
      DataImport.uploadFileViaApi(
        testData.editedHoldingsFileName,
        holdingsFile.fileName,
        holdingsFile.jobProfileToRun,
      ).then((response) => {
        recordIDs.push(response[0].holding.id);
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.createdUserProperties = createdUserProperties;

        cy.login(createdUserProperties.username, createdUserProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.createdUserProperties.userId);
      inventoryHoldings.deleteHoldingRecordViaApi(recordIDs[1]);
      InventoryInstance.deleteInstanceViaApi(recordIDs[0]);
      FileManager.deleteFile(`cypress/fixtures/${testData.editedHoldingsFileName}`);
    });

    it(
      'C983156 Folio fields are not cleared after update of "MARC holdings" record via "quickmarc" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C983156'] },
      () => {
        // User is on the detail view of imported 'MARC holdings' record opened via 'Inventory' app
        InventoryInstances.searchByTitle(recordIDs[0]);
        InventoryInstance.openHoldingViewByID(recordIDs[1]);
        HoldingsRecordView.waitLoading();

        // Step 1. Click on "Actions" button in third pane → Select "Edit" option
        HoldingsRecordView.edit();

        // Step 2. Update all folio fields
        HoldingsRecordEdit.markAsSuppressedFromDiscovery();
        HoldingsRecordEdit.addStatisticalCode(testData.statisticalCode);
        HoldingsRecordEdit.addAdministrativeNote(testData.administrativeNote);
        HoldingsRecordEdit.selectTemporaryLocation(locations.holdingsTemporary.name);
        HoldingsRecordEdit.addAdditionalCallNumberValues({
          callNumber: testData.callNumber,
          callNumberType: testData.callNumberType,
          callNumberPrefix: testData.callNumberPrefix,
          callNumberSuffix: testData.callNumberSuffix,
        });
        HoldingsRecordEdit.fillInNumberOfItems(testData.numberOfItems);
        HoldingsRecordEdit.fillPolicyFields({
          illPolicy: testData.illPolicy,
          digitizationPolicy: testData.digitizationPolicy,
          retentionPolicy: testData.retentionPolicy,
        });
        HoldingsRecordEdit.fillAcquisitionFields({
          acquisitionMethod: testData.acquisitionMethod,
          orderFormat: testData.orderFormat,
          receiptStatus: testData.receiptStatus,
        });
        HoldingsRecordEdit.addReceivingHistoryValues({
          enumeration: testData.enumeration,
          chronology: testData.chronology,
        });

        // Step 3. Click on the "Save & close" button
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
        HoldingsRecordView.checkStatisticalCode(testData.statisticalCode);
        HoldingsRecordView.checkAdministrativeNote(testData.administrativeNote);
        HoldingsRecordView.checkTemporaryLocation(locations.holdingsTemporary.name);
        HoldingsRecordView.checkAdditionalHoldingsCallNumber({
          callNumber: testData.callNumber,
          callNumberType: testData.callNumberType,
          callNumberPrefix: testData.callNumberPrefix,
          callNumberSuffix: testData.callNumberSuffix,
        });
        HoldingsRecordView.checkNumberOfItems(testData.numberOfItems);
        HoldingsRecordView.checkIllPolicy(testData.illPolicy);
        HoldingsRecordView.checkDigitizationPolicy(testData.digitizationPolicy);
        HoldingsRecordView.checkRetentionPolicy(testData.retentionPolicy);
        HoldingsRecordView.checkAcquisitionMethod(testData.acquisitionMethod);
        HoldingsRecordView.checkOrderFormat(testData.orderFormat);
        HoldingsRecordView.checkReceiptStatus(testData.receiptStatus);
        HoldingsRecordView.checkPublicDisplayCheckboxState(true);
        HoldingsRecordView.checkReceivingHistoryValues({
          enumeration: testData.enumeration,
          chronology: testData.chronology,
        });

        // Step 4. Click on "Actions" button in third pane → Select "Edit in quickMARC" option
        HoldingsRecordView.editInQuickMarc();

        // Step 5. Update any field
        QuickMarcEditor.updateExistingField('035', testData.tag035newValue);

        // Step 6. Click on the "Save & close" button and check folio fields
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
        HoldingsRecordView.checkStatisticalCode(testData.statisticalCode);
        HoldingsRecordView.checkAdministrativeNote(testData.administrativeNote);
        HoldingsRecordView.checkTemporaryLocation(locations.holdingsTemporary.name);
        HoldingsRecordView.checkAdditionalHoldingsCallNumber({
          callNumber: testData.callNumber,
          callNumberType: testData.callNumberType,
          callNumberPrefix: testData.callNumberPrefix,
          callNumberSuffix: testData.callNumberSuffix,
        });
        HoldingsRecordView.checkNumberOfItems(testData.numberOfItems);
        HoldingsRecordView.checkIllPolicy(testData.illPolicy);
        HoldingsRecordView.checkDigitizationPolicy(testData.digitizationPolicy);
        HoldingsRecordView.checkRetentionPolicy(testData.retentionPolicy);
        HoldingsRecordView.checkAcquisitionMethod(testData.acquisitionMethod);
        HoldingsRecordView.checkOrderFormat(testData.orderFormat);
        HoldingsRecordView.checkReceiptStatus(testData.receiptStatus);
        HoldingsRecordView.checkPublicDisplayCheckboxState(true);
        HoldingsRecordView.checkReceivingHistoryValues({
          enumeration: testData.enumeration,
          chronology: testData.chronology,
        });
      },
    );
  });
});
