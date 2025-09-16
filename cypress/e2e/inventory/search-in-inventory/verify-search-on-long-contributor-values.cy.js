import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('inventory', () => {
  describe('Search', () => {
    describe('Search in Inventory', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceData: {
          first: {
            title: `AT_C380395_FolioInstance_${randomPostfix}_1`,
            longContributor100: `AT_C380395_${randomPostfix} Moscovitch, Allan, 1944- editor, author of introduction, compiler of statistical data, researcher, primary investigator, project director, senior researcher`,
          },
          second: {
            title: `AT_C380395_FolioInstance_${randomPostfix}_2`,
            longContributor710: `AT_C380395_${randomPostfix} Penguin Random House Audio Publishing Group. HarperCollins Publishers. Macmillan Audio. Blackstone Audio, Inc. Recorded Books, LLC. Simon & Schuster Audio. Hachette Audio. Books on Tape. Random House Audio Publishing Group. Brilliance Audio. Tantor Media. HighBridge Audio`,
          },
        },
      };
      const createdRecordIDs = [];
      let user;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C380395_FolioInstance');

        cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
          user = createdUserProperties;

          // Create first MARC bib record with long contributor values
          const firstMarcFields = [
            {
              tag: '245',
              content: `$a ${testData.instanceData.first.title}`,
              indicators: ['1', '1'],
            },
            {
              tag: '100',
              content: `$a ${testData.instanceData.first.longContributor100}`,
              indicators: ['\\', '\\'],
            },
            { tag: '008', content: QuickMarcEditor.defaultValid008Values },
          ];
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, firstMarcFields).then(
            (instanceId) => {
              createdRecordIDs.push(instanceId);
            },
          );

          // Create second MARC bib record with long contributor values
          const secondMarcFields = [
            {
              tag: '245',
              content: `$a ${testData.instanceData.second.title}`,
              indicators: ['1', '1'],
            },
            {
              tag: '710',
              content: `$a ${testData.instanceData.second.longContributor710}`,
              indicators: ['\\', '\\'],
            },
            { tag: '008', content: QuickMarcEditor.defaultValid008Values },
          ];
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, secondMarcFields).then(
            (instanceId) => {
              createdRecordIDs.push(instanceId);
            },
          );
        });
      });

      beforeEach('Login', () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        createdRecordIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C380395 Search for "MARC bib" record with long Contributor value (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C380395'] },
        () => {
          // Search for the first record
          InventoryInstances.searchByTitle(testData.instanceData.first.title);
          InventorySearchAndFilter.verifySearchResult(testData.instanceData.first.title);
          InventorySearchAndFilter.checkContributorsColumResult(
            testData.instanceData.first.longContributor100,
          );
          InventoryInstance.checkInstanceTitle(testData.instanceData.first.title);
          InventorySearchAndFilter.closeInstanceDetailPane();
          InventorySearchAndFilter.validateSearchTableColumnsShown();

          // Search for the second record
          InventoryInstances.searchByTitle(testData.instanceData.second.title);
          InventorySearchAndFilter.verifySearchResult(testData.instanceData.second.title);
          InventorySearchAndFilter.checkContributorsColumResult(
            testData.instanceData.second.longContributor710,
          );
          InventoryInstance.checkInstanceTitle(testData.instanceData.second.title);

          // Click on the "Search" tab at toggle placed on the "Search & filter" pane
          InventorySearchAndFilter.switchToSearchTab();
          InventorySearchAndFilter.verifyInstanceDetailsViewAbsent();
          InventorySearchAndFilter.verifySearchResult(testData.instanceData.second.title);
          InventorySearchAndFilter.checkContributorsColumResult(
            testData.instanceData.second.longContributor710,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown();
        },
      );
    });
  });
});
