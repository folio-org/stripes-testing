import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      tag852: '852',
      editedHoldingsFileName: 'C389500EditedHoldingsFile.mrc',
      holdingsHRIDPlaceholders: [
        'oo10000000000',
        'oo20000000000',
        'oo30000000000',
        'oo40000000000',
        'oo50000000000',
        'oo60000000000',
      ],
    };

    const callNumberTypes = {
      typeNLM: 'National Library of Medicine classification',
      typeDewey: 'Dewey Decimal classification',
      typeNone: '-',
      typeSuDoc: 'Superintendent of Documents classification',
      typeTitle: 'Title',
      typeShelved: 'Shelved separately',
      typeShelving: 'Shelving control number',
      typeOther: 'Other scheme',
      typeLC: 'Library of Congress classification',
      typeSubfield: 'Source specified in subfield $2',
    };

    const originalTypes = [
      callNumberTypes.typeLC,
      callNumberTypes.typeDewey,
      callNumberTypes.typeSuDoc,
      callNumberTypes.typeShelved,
      callNumberTypes.typeSubfield,
      callNumberTypes.typeNone,
    ];
    const updatedTypes = [
      callNumberTypes.typeNLM,
      callNumberTypes.typeNone,
      callNumberTypes.typeTitle,
      callNumberTypes.typeNone,
      callNumberTypes.typeOther,
      callNumberTypes.typeShelving,
    ];
    const originalIndicators = ['0', '1', '3', '6', '7', '9'];
    const updatedIndicators = ['2', 'd', '5', '\\', '8', '4'];

    const instanceFile = {
      marc: 'marcBibFileC389500.mrc',
      fileName: `testMarcFile.C389500.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const holdingsFile = {
      marc: 'marcHoldingsFileC389500.mrc',
      fileName: `testMarcFile.C389500.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
      numOfRecords: 6,
    };

    const recordIDs = [];

    before('Creating user, data', () => {
      cy.getAdminToken();
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
          testData.holdingsHRIDPlaceholders,
          [instanceHRID, instanceHRID, instanceHRID, instanceHRID, instanceHRID, instanceHRID],
        );
      });
      DataImport.uploadFileViaApi(
        testData.editedHoldingsFileName,
        holdingsFile.fileName,
        holdingsFile.jobProfileToRun,
      ).then((response) => {
        response.forEach((record) => {
          recordIDs.push(record.holding.id);
        });
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.createdUserProperties = createdUserProperties;

        cy.getHridHandlingSettingsViaApi().then((settings) => {
          const newSettings = { instances: {}, holdings: {}, items: {} };
          newSettings.instances.prefix = settings.instances.prefix;
          newSettings.holdings.prefix = settings.holdings.prefix;
          newSettings.items.prefix = settings.items.prefix;
          newSettings.instances.startNumber = settings.instances.currentNumber + 10;
          newSettings.holdings.startNumber = settings.holdings.currentNumber + 10;
          newSettings.items.startNumber = settings.items.currentNumber + 10;
          newSettings.commonRetainLeadingZeroes = true;
          cy.updateHridHandlingSettingsViaApi(newSettings);
        });

        cy.login(createdUserProperties.username, createdUserProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.createdUserProperties.userId);
      recordIDs.forEach((id, index) => {
        if (index) cy.deleteHoldingRecordViaApi(id);
      });
      InventoryInstance.deleteInstanceViaApi(recordIDs[0]);
      FileManager.deleteFile(`cypress/fixtures/${testData.editedHoldingsFileName}`);
    });

    it(
      'C389500 Verify that "Call number type" is correctly mapped after importing and editing. (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C389500'] },
      () => {
        InventoryInstances.searchByTitle(recordIDs[0]);
        for (let i = 0; i < holdingsFile.numOfRecords; i++) {
          InventoryInstance.openHoldingViewByID(recordIDs[i + 1]);
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkCallNumberType(originalTypes[i]);
          HoldingsRecordView.close();
          InventoryInstance.openHoldingViewByID(recordIDs[i + 1]);
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.verifyIndicatorValue(testData.tag852, originalIndicators[i]);
          QuickMarcEditor.updateIndicatorValue(testData.tag852, updatedIndicators[i]);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.checkCallNumberType(updatedTypes[i]);
          HoldingsRecordView.close();
        }
      },
    );
  });
});
