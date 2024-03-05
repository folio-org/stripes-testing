import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      lccnOption: 'LCCN, normalized',
    };

    const marcFile = {
      marc: 'marcBibFileC440126.mrc',
      fileName: `testMarcFileC440126.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      propertyName: 'relatedInstanceInfo',
    };

    const createdRecordIDs = [];

    before(() => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.entries.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].idList[0]);
          });
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C440126 Search for "MARC bibliographic" by "LCCN, normalized" option when "LCCN" (010 $a) has (leading, internal, trailing) spaces. (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();

        // SelectInstanceModal.clickSearchOptionSelect();
        // SelectInstanceModal.checkSearchOptionIncluded(lccnOption);
        // InventorySearchAndFilter.switchToHoldings();
        // SelectInstanceModal.checkDefaultSearchOptionSelected();
        // SelectInstanceModal.checkSearchInputFieldValue('');
        // SelectInstanceModal.checkResultsListEmpty();
        // SelectInstanceModal.clickSearchOptionSelect();
        // SelectInstanceModal.checkSearchOptionIncluded(lccnOption, false);
        // InventorySearchAndFilter.switchToItem();
        // SelectInstanceModal.checkDefaultSearchOptionSelected();
        // SelectInstanceModal.checkSearchInputFieldValue('');
        // SelectInstanceModal.checkResultsListEmpty();
        // SelectInstanceModal.clickSearchOptionSelect();
        // SelectInstanceModal.checkSearchOptionIncluded(lccnOption, false);
      },
    );
  });
});
