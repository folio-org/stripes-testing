import uuid from 'uuid';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import browseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      instanceTitle: 'C877082 Instance',
      editedHoldingsFileName: 'C877082EditedHoldingsFile.mrc',
      holdingsHRIDPlaceholder: 'in00000001039',
      holdingsCallnumber: 'C877082BR\\140 .J\\\\86',
      holdingsCallnumberEscaped: 'C877082BR\\\\140 .J\\\\\\\\86',
      holdingsStatement: '\\v.54-68\\ (2003\\2017)',
      holdingsStatementForIndexes: 'v. \\150\\\\ (1950\\\\1999)',
      itemBarcode: uuid(),
    };

    const instanceFile = {
      marc: 'marcBibFileC877082.mrc',
      fileName: `testMarcFile.C877082.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const holdingsFile = {
      marc: 'marcHoldingsFileC877082.mrc',
      fileName: `testMarcFile.C877082.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
      numOfRecords: 1,
    };

    const recordIDs = [];

    before('Creating user, data', () => {
      cy.getAdminToken().then(() => {
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getDefaultMaterialType().then((res) => {
          testData.materialTypeId = res.id;
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

        ItemRecordNew.createViaApi({
          holdingsId: recordIDs[1],
          itemBarcode: testData.itemBarcode,
          materialTypeId: testData.materialTypeId,
          permanentLoanTypeId: testData.loanTypeId,
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${testData.editedHoldingsFileName}`);
    });

    it(
      'C877082 Check detail view and browse results for import MARC holdings record with backslash character (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C877082'] },
      () => {
        // Steps 1-2 in Before all block
        // Step 3. Open detail view pane of MARC holdings record and check some fields
        InventoryInstances.searchByTitle(recordIDs[0]);
        InventoryInstance.openHoldingViewByID(recordIDs[1]);
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkCallNumber(testData.holdingsCallnumber);
        HoldingsRecordView.checkHoldingsStatement(testData.holdingsStatement);
        HoldingsRecordView.checkHoldingsStatementForIndexes(testData.holdingsStatementForIndexes);

        // Step 4. Close "Holdings" detail view pane
        HoldingsRecordView.close();

        // Step 5. Add 1 item to imported "Holdings" record in Before all block

        // Step 6. Go to "Inventory" > "Browse" and browse for Call number from imported record
        InventorySearchAndFilter.switchToBrowseTab();
        browseCallNumber.waitForCallNumberToAppear(testData.holdingsCallnumber);
        InventorySearchAndFilter.selectBrowseOption('Call numbers (all)');
        InventorySearchAndFilter.browseSearch(testData.holdingsCallnumber);
        InventorySearchAndFilter.verifySearchResultIncludingValue(testData.holdingsCallnumber);
        browseCallNumber.selectFoundCallNumber(testData.holdingsCallnumber);

        // Step 7. Click on the found result
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          'Query search',
          `itemFullCallNumbers="${testData.holdingsCallnumberEscaped}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
      },
    );
  });
});
