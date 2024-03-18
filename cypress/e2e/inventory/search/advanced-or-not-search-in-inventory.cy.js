import uuid from 'uuid';
import { JOB_STATUS_NAMES, RECORD_STATUSES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('inventory', () => {
  describe('Advanced search', () => {
    let user;
    const testData = {
      callNumberValue: `CN${getRandomPostfix()}`,
      itemBarcode: uuid(),
      advSearchOption: 'Advanced search',
      searchResults: ['Roma council. Adv search title 002', 'Clarinet concerto no. 1, op. 73'],
      rowsCount: 2,
      defaultSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
    };

    const marcFile = {
      marc: 'marcBibFileC400613.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 2,
    };

    before('Creating data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      cy.getAdminToken();
      DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun);
      Logs.waitFileIsImported(marcFile.fileName);
      Logs.checkJobStatus(marcFile.fileName, JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(marcFile.fileName);
      FileDetails.openItemInInventoryByTitle(testData.searchResults[1], 3, RECORD_STATUSES.CREATED);
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        testData.instanceHrid = initialInstanceHrId;
        testData.instanceHridForSearching = initialInstanceHrId.replace(/[^\d]/g, '');
      });
      cy.go('back');
      FileDetails.openItemInInventoryByTitle(testData.searchResults[0], 3, RECORD_STATUSES.CREATED);
      InventoryInstance.pressAddHoldingsButton();
      InventoryNewHoldings.fillRequiredFields();
      HoldingsRecordEdit.fillCallNumber(testData.callNumberValue);
      InventoryNewHoldings.saveAndClose();
      InventoryInstance.waitLoading();
      // wait to make sure holdings created - otherwise added item might not be saved
      cy.wait(1500);
      InventoryInstance.addItem();
      InventoryInstance.fillItemRequiredFields();
      InventoryInstance.fillItemBarcode(testData.itemBarcode);
      InventoryInstance.saveItemDataAndVerifyExistence('-');

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"hrid"=="${testData.instanceHrid}"`,
      }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C422016 Search Instances using advanced search with "OR", "NOT" operators (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.searchResults[0],
          'Starts with',
          'Title (all)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          testData.searchResults[0],
          'Starts with',
          'Title (all)',
        );
        InventoryInstances.fillAdvSearchRow(
          1,
          testData.instanceHridForSearching,
          'Contains all',
          'Instance HRID',
          'OR',
        );
        InventoryInstances.checkAdvSearchModalValues(
          1,
          testData.instanceHridForSearching,
          'Contains all',
          'Instance HRID',
          'OR',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        testData.searchResults.forEach((expectedResult) => InventorySearchAndFilter.verifySearchResult(expectedResult));
        InventorySearchAndFilter.checkRowsCount(testData.rowsCount);

        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.checkAdvSearchModalValues(
          0,
          testData.searchResults[0],
          'Starts with',
          'Title (all)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          1,
          testData.instanceHridForSearching,
          'Contains all',
          'Instance HRID',
          'OR',
        );
        InventoryInstances.closeAdvancedSearchModal();
        InventoryInstances.resetAllFilters();
        InventoryInstances.verifySelectedSearchOption(testData.defaultSearchOption);
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.checkAdvSearchModalValues(
          0,
          '',
          'Contains all',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        cy.wrap([1, 2, 3, 4]).each((rowNumber) => {
          InventoryInstances.checkAdvSearchModalValues(
            rowNumber,
            '',
            'Contains all',
            'Keyword (title, contributor, identifier, HRID, UUID)',
            'AND',
          );
        });
        InventoryInstances.fillAdvSearchRow(
          0,
          '(OCoLC)20752060400613',
          'Exact phrase',
          'Identifier (all)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          '(OCoLC)20752060400613',
          'Exact phrase',
          'Identifier (all)',
        );
        InventoryInstances.fillAdvSearchRow(
          1,
          testData.callNumberValue,
          'Contains all',
          'Effective call number (item), shelving order',
          'NOT',
        );
        InventoryInstances.checkAdvSearchModalValues(
          1,
          testData.callNumberValue,
          'Contains all',
          'Effective call number (item), shelving order',
          'NOT',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        InventorySearchAndFilter.verifySearchResult(testData.searchResults[1]);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );
  });
});
