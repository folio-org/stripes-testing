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
  subjectSearchOption: 'Subject',
  contributorSearchOption: 'Contributor',
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
  searchQueriesC471496: [
    'C473260 Arbeitauto und Mühe : Untersuchungenauto zur Bedeutungsgeschichte altengl. Wörter / von Klaus R. Grinda.',
    'C473260 Arbeitauto und Muhe : Untersuchungenauto zur Bedeutungsgeschichte altengl. Worter / von Klaus R. Grinda.',
  ],
  searchQueriesC471495: [
    'C471495 Māoriauto poetry --21st centuryauto',
    'C471495 Maoriauto poetry --21st centuryauto',
  ],
  searchQueriesC471494: ['C471494 Wærn, Hakonauto', 'C471494 Waern, Hakonauto'],
  searchResultC473260:
    'C473260 Arbeitauto und Mühe : Untersuchungenauto zur Bedeutungsgeschichte altengl. Wörter / von Klaus R. Grinda.',
  searchResultC471498: "C471498 Aus Jacobi's Gartenauto : Furioso : aus Beethoven's Jugendauto",
  searchResultC471497: 'C471497 "Manauto will werden, nichtauto gewesen sein"',
  searchResultC471495:
    "C471495 Kupuauto : a collection of contemporary Māori poetryauto / nā Hana O'Regan rāua ko Charisma Rangipunga ; Māori text edited by Timoti Karetū ; English text edited by Tipene O'Reganauto.",
  searchResultC471494:
    'C471494 Elpannanauto och dess ekonomiska förutsättningar / av Hakonauto Wærn',

  marcFile: {
    marc: 'marcBibFileDiacritics.mrc',
    fileName: `testMarcBibFileDiacritics.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 5,
    propertyName: 'instance',
  },

  instanceTitlePrefixes: [
    'C473260 Arbeitauto',
    'C471498 Aus',
    'C471497',
    'C471495 Kupuauto',
    'C471494 Elpannanauto',
  ],
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      testData.instanceTitlePrefixes.forEach((titlePrefix) => {
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
      { tags: ['criticalPathFlaky', 'spitfire'] },
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
      { tags: ['criticalPathFlaky', 'spitfire'] },
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
      { tags: ['criticalPathFlaky', 'spitfire'] },
      () => {
        testData.searchQueriesC471497.forEach((query) => {
          InventoryInstances.searchInstancesWithOption(testData.titleAllSearchOption, query);
          InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResultC471497, true);
          InventorySearchAndFilter.checkRowsCount(1);
          InventoryInstances.resetAllFilters();
        });
      },
    );

    it(
      'C471496 Search for Instance which has diacritics in "Title" field using "Title (all)" search option (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire'] },
      () => {
        testData.searchQueriesC471496.forEach((query) => {
          InventoryInstances.searchInstancesWithOption(testData.titleAllSearchOption, query);
          InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResultC473260, true);
          InventorySearchAndFilter.checkRowsCount(1);
          InventoryInstances.resetAllFilters();
        });
      },
    );

    it(
      'C471495 Search for subjects which has diacritics (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire'] },
      () => {
        testData.searchQueriesC471495.forEach((query) => {
          InventoryInstances.searchInstancesWithOption(testData.subjectSearchOption, query);
          InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResultC471495, true);
          InventorySearchAndFilter.checkRowsCount(1);
          InventoryInstances.resetAllFilters();
        });
      },
    );

    it(
      'C471494 Search for contributors which has diacritics (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire'] },
      () => {
        testData.searchQueriesC471494.forEach((query) => {
          InventoryInstances.searchInstancesWithOption(testData.contributorSearchOption, query);
          InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResultC471494, true);
          InventoryInstances.checkResultsCellContainsAnyOfValues(
            [testData.searchQueriesC471494[0]],
            2,
            0,
          );
          InventorySearchAndFilter.checkRowsCount(1);
          InventoryInstances.resetAllFilters();
        });
      },
    );
  });
});
