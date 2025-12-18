import uuid from 'uuid';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstancesMovement from '../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';

describe('Inventory', () => {
  describe('Move holdings and item', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C411512_FolioInstance_${randomPostfix}`;
    const contributorValue = `AT_C411512_Contributor_${randomPostfix}`;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix: instanceTitle,
        holdingsCount: 2,
        itemsCount: 0,
      }),
    };
    const barcode = uuid();

    let user;
    let locationA;
    let locationB;
    let materialType;
    let loanType;
    let holdingsAId;
    let holdingsBId;
    let contributorNameTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411512');

      cy.then(() => {
        cy.getLocations({
          limit: 10,
          query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
        }).then(() => {
          locationA = Cypress.env('locations')[0];
          locationB = Cypress.env('locations')[1];
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
          loanType = loanTypes[0];
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          materialType = res;
        });
        BrowseContributors.getContributorNameTypes().then((nameTypes) => {
          contributorNameTypeId = nameTypes[0].id;
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location: locationA,
          });
        })
        .then(() => {
          cy.getInstanceById(testData.folioInstances[0].instanceId).then((body) => {
            const requestBody = { ...body };
            requestBody.contributors = [
              {
                name: contributorValue,
                contributorNameTypeId,
                contributorTypeId: null,
                contributorTypeText: '',
                primary: true,
              },
            ];
            cy.updateInstance(requestBody);
          });
          holdingsAId = testData.folioInstances[0].holdings[0].id;
          holdingsBId = testData.folioInstances[0].holdings[1].id;
          cy.getHoldings({
            limit: 1,
            query: `"id"="${holdingsBId}"`,
          }).then((holdings) => {
            cy.updateHoldingRecord(holdingsBId, {
              ...holdings[0],
              permanentLocationId: locationB.id,
            });
          });
        })
        .then(() => {
          cy.createItem({
            barcode,
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            holdingsRecordId: holdingsAId,
            materialType: { id: materialType.id },
            permanentLoanType: { id: loanType.id },
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiInventoryMoveItems.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstances[0].instanceId,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C411512 Verify that "Move items within an instance" option works as expected when opening record from Browse (spitfire)',
      {
        tags: ['extendedPath', 'spitfire', 'C411512'],
      },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();

        BrowseContributors.waitForContributorToAppear(contributorValue);

        BrowseContributors.select();
        BrowseContributors.browse(contributorValue);
        BrowseContributors.checkSearchResultsTable();
        BrowseContributors.checkSearchResultRecord(contributorValue);

        BrowseContributors.openInstance({ name: contributorValue });
        InventorySearchAndFilter.verifySearchResult(instanceTitle);
        InventoryInstance.waitLoading();

        InventoryInstance.openMoveItemsWithinAnInstance();
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: locationA.name,
          toHolding: locationB.name,
          shouldOpen: true,
          itemMoved: true,
        });
        InventoryInstance.openHoldings(locationB.name);
        InventoryInstancesMovement.verifyItemBarcodeInHoldings(barcode, locationB.name);
      },
    );
  });
});
