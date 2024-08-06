import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      tag008: '008',
      tag022: '022',
      tag035: '035',
      tag040: '040',
    };

    const testDataC490898 = {
      rowIndex022: 5,
      rowIndex035: 6,
      rowIndex040: 7,
      expected035Value: '$a 366832490898',
    };

    const testDataC490899 = {
      rowIndex008: 3,
      rowIndexNew035: 4,
      rowIndex040: 5,
      rowIndexOriginal035: 27,
      expectedNew035Value: '$a in00000000144490899',
      original035Value:
        '$a (OCoLC)1000535936 $z (OCoLC)964194444 $z (OCoLC)964760322 $z (OCoLC)999445824',
    };

    const marcFile = {
      marc: 'marcBibFileC490898.mrc',
      fileName: `testMarcFile035.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordsIDs = [];

    before('Creating user and data', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordsIDs.push(record[marcFile.propertyName].id);
          });
        });
      });
    });

    beforeEach('Login', () => {
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Deleting created user and data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordsIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C490898 Generated "035" field displays in ascending fields order in imported "MARC bibliographic" record which doesn\'t have existing "035" fields (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventoryInstances.searchByTitle(createdRecordsIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagValue(testDataC490898.rowIndex022, testData.tag022);
        QuickMarcEditor.verifyTagValue(testDataC490898.rowIndex035, testData.tag035);
        QuickMarcEditor.verifyTagValue(testDataC490898.rowIndex040, testData.tag040);
        QuickMarcEditor.checkContent(testDataC490898.expected035Value, testDataC490898.rowIndex035);
      },
    );

    it(
      'C490899 Generated "035" field displays in ascending fields order in imported "MARC bibliographic" record which has multiple existing "035" fields (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventoryInstances.searchByTitle(createdRecordsIDs[1]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagValue(testDataC490899.rowIndex008, testData.tag008);
        QuickMarcEditor.verifyTagValue(testDataC490899.rowIndexNew035, testData.tag035);
        QuickMarcEditor.verifyTagValue(testDataC490899.rowIndex040, testData.tag040);
        QuickMarcEditor.verifyTagValue(testDataC490899.rowIndexOriginal035, testData.tag035);
        QuickMarcEditor.checkContent(
          testDataC490899.expectedNew035Value,
          testDataC490899.rowIndexNew035,
        );
      },
    );
  });
});
