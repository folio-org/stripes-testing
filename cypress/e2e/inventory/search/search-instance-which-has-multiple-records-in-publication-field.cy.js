import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      searchOption: ['Place of publication', 'All', 'Query search'],
      searchValue: ['Petrozavodsk', 'Петрозаводск'],
      searchResult:
        '"Kalevala" v kontekste regionalʹnoĭ i mirovoĭ kulʹtury : materialy Mezhdunarodnoĭ nauchnoĭ konferent͡sii, posvi͡ashchennoĭ 160-letii͡u polnogo izdanii͡a "Kalevaly" / redakt͡sionnai͡a kollegii͡a, I. I͡U. Vinokurova ... [and six others].',
    };

    const marcFile = {
      marc: 'marcBibFileForC494367.mrc',
      fileName: `testMarcFileC494367.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
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
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
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
      'C494367 Search for Instance which has multiple records in "Place of publication" field (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();

        testData.searchOption.forEach((option) => {
          testData.searchValue.forEach((value) => {
            InventorySearchAndFilter.selectSearchOption(option);
            if (option === 'Query search') {
              InventorySearchAndFilter.executeSearch(`publication.place=${value}`);
            } else {
              InventorySearchAndFilter.executeSearch(value);
            }
            InventorySearchAndFilter.verifySearchResult(testData.searchResult);
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
        });
      },
    );
  });
});
