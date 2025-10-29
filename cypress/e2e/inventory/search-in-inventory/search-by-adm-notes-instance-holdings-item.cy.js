import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      admNoteText: `AT_C359151_AdmNote_${randomPostfix}`,
      instanceTitlePrefix: `AT_C359151_FolioInstance_${randomPostfix}`,
      querySearchOption: searchInstancesOptions[17],
    };

    const instanceTitles = {
      noteInInstance: `${testData.instanceTitlePrefix} Note in instance`,
      noteInHoldings: `${testData.instanceTitlePrefix}  Note in holdings`,
      noteInItem: `${testData.instanceTitlePrefix}  Note in item`,
    };

    const searchQueries = [
      `administrativeNotes all "${testData.admNoteText}"`,
      `holdings.administrativeNotes all "${testData.admNoteText}"`,
      `item.administrativeNotes all "${testData.admNoteText}"`,
    ];

    before(() => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C359151_FolioInstance');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.holdingTypeId = res[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
        }).then((res) => {
          testData.locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.materialTypeId = res.id;
        });
      }).then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: instanceTitles.noteInInstance,
            administrativeNotes: [testData.admNoteText],
          },
        });
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: instanceTitles.noteInHoldings,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
              administrativeNotes: [testData.admNoteText],
            },
          ],
        });
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: instanceTitles.noteInItem,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
            },
          ],
          items: [
            {
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
              administrativeNotes: [testData.admNoteText],
            },
          ],
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitlePrefix);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C359151 Search by "Administrative notes" considers to what type of record, note was created ("Instance"/"Holdings"/"Item") (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C359151'] },
      () => {
        InventorySearchAndFilter.selectSearchOption(testData.querySearchOption);

        searchQueries.forEach((query, index) => {
          InventorySearchAndFilter.executeSearch(query);
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.verifySearchResult(Object.values(instanceTitles)[index]);
        });
      },
    );
  });
});
