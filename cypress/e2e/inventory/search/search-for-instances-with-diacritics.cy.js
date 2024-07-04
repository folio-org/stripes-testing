import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  instanceIDs: [],
  querySearchOption: 'Query search',
  titleAllSearchOption: 'Title (all)',
  searchQueriesC473260: [
    'title all "C473260 Arbeitauto und Mühe : Untersuchungenauto zur Bedeutungsgeschichte altengl. Wörter / von Klaus R. Grinda."',
    'title all "C473260 Arbeitauto und Muhe : Untersuchungenauto zur Bedeutungsgeschichte altengl. Worter / von Klaus R. Grinda."',
  ],
  searchQueriesC471498: [
    'C471498 Erzählungenauto eines Rheinishcen Chronisten von Wolfgangauto Müller von Königswinter',
    'C471498 Erzahlungenauto eines Rheinishcen Chronisten von Wolfgangauto Muller von Konigswinter',
  ],
  searchQueriesC471497: [
    'C471497 Zurauto Aktualität Maxauto Frischs',
    'C471497 Zurauto Aktualitat Maxauto Frischs',
  ],
  searchResultC473260:
    'C473260 Arbeitauto und Mühe : Untersuchungenauto zur Bedeutungsgeschichte altengl. Wörter / von Klaus R. Grinda.',
  searchResultC471498: "C471498 Aus Jacobi's Gartenauto : Furioso : aus Beethoven's Jugendauto",
  searchResultC471497: 'C471497 "Manauto will werden, nichtauto gewesen sein"',

  marcFile: {
    marc: 'marcBibFileDiacritics.mrc',
    fileName: `testMarcBibFileDiacritics.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 3,
    propertyName: 'instance',
  },

  instanceTitleTitlePrefixes: ['C473260 Arbeitauto', 'C471498 Aus', 'C471497'],
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      testData.instanceTitleTitlePrefixes.forEach((titlePrefix) => {
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: `title="${titlePrefix}"`,
        }).then((instances) => {
          if (instances) {
            instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });
      });

      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        response.forEach((record) => {
          testData.instanceIDs.push(record[testData.marcFile.propertyName].id);
        });
      });

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    beforeEach('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C473260 Search for Instance which has diacritics in "Title" field using "Query search" search option (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        testData.searchQueriesC473260.forEach((query) => {
          InventoryInstances.searchInstancesWithOption(testData.querySearchOption, query);
          InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResultC473260, true);
          InventorySearchAndFilter.checkRowsCount(1);
          InventoryInstances.resetAllFilters();
        });
      },
    );

    it(
      'C471498 Search for Instance which has diacritics in "Series" field using "Title (all)" search option (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        testData.searchQueriesC471498.forEach((query) => {
          InventoryInstances.searchInstancesWithOption(testData.titleAllSearchOption, query);
          InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResultC471498, true);
          InventorySearchAndFilter.checkRowsCount(1);
          InventoryInstances.resetAllFilters();
        });
      },
    );

    it(
      'C471497 Search for Instance which has diacritics in "Alternative title" field using "Title (all)" search option (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        testData.searchQueriesC471497.forEach((query) => {
          InventoryInstances.searchInstancesWithOption(testData.titleAllSearchOption, query);
          InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResultC471497, true);
          InventorySearchAndFilter.checkRowsCount(1);
          InventoryInstances.resetAllFilters();
        });
      },
    );
  });
});
