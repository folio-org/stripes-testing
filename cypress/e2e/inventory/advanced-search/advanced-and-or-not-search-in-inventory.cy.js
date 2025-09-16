import uuid from 'uuid';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const testData = {
      advSearchOption: 'Advanced search',
      instances: [
        {
          instanceTitle: `C400621 Instance title${getRandomPostfix()}`,
          note: 'Adv search note 006',
        },
        {
          instanceTitle: `C400621 Instance title${getRandomPostfix()}`,
          note: 'Adv search note 006',
          adminNote: 'Adv search adm note 006',
        },
        {
          instanceTitle: `C400621 Instance title${getRandomPostfix()}`,
          holdingsCallNumber: `IYCN${getRandomPostfix()}`,
          barcode: uuid(),
        },
        {
          instanceTitle: `C400621 Instance title${getRandomPostfix()}`,
          adminNote: 'Adm note NOT 6 006',
          holdingsCallNumber: `IYCN${getRandomPostfix()}`,
          barcode: uuid(),
        },
      ],
    };

    before('Creating data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('C400621');
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingsType) => {
            testData.holdingTypeId = holdingsType[0].id;
          });
          InventoryInstances.getHoldingsNotesTypes({ limit: 1 }).then((res) => {
            testData.holdingNoteTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (locations) => {
              testData.locationsId = locations.id;
            },
          );
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          // create first instance and holdings
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instances[0].instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
                notes: [
                  {
                    holdingsNoteTypeId: testData.holdingNoteTypeId,
                    note: testData.instances[0].note,
                  },
                ],
              },
            ],
            items: [],
          }).then((specialInstanceIds) => {
            testData.instances[0].instanceIds = specialInstanceIds;
          });
          // create second instance and holdings
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instances[1].instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
                notes: [
                  {
                    holdingsNoteTypeId: testData.holdingNoteTypeId,
                    note: testData.instances[1].note,
                  },
                ],
                administrativeNotes: [testData.instances[1].adminNote],
              },
            ],
            items: [],
          }).then((specialInstanceIds) => {
            testData.instances[1].instanceIds = specialInstanceIds;
          });
          // create third instance and holdings and item
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instances[2].instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
                callNumber: testData.instances[2].holdingsCallNumber,
              },
            ],
            items: [
              {
                barcode: testData.instances[2].barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          });
          // create forth instance and holdings and item
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instances[3].instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
                callNumber: testData.instances[3].holdingsCallNumber,
                administrativeNotes: [testData.instances[3].adminNote],
              },
            ],
            items: [
              {
                barcode: testData.instances[3].barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          });
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

    after('Deleting data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          testData.instances[2].barcode,
        );
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          testData.instances[3].barcode,
        );
        cy.deleteHoldingRecordViaApi(testData.instances[0].instanceIds.holdingIds[0].id);
        InventoryInstance.deleteInstanceViaApi(testData.instances[0].instanceIds.instanceId);
        cy.deleteHoldingRecordViaApi(testData.instances[1].instanceIds.holdingIds[0].id);
        InventoryInstance.deleteInstanceViaApi(testData.instances[1].instanceIds.instanceId);
      });
    });

    it(
      'C400621 Search Holdings using advanced search with a combination of operators (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C400621', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToHoldings();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.instances[0].note,
          'Exact phrase',
          'Holdings notes (all)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          testData.instances[0].note,
          'Exact phrase',
          'Holdings notes (all)',
        );
        InventoryInstances.fillAdvSearchRow(
          1,
          'search adm note 006',
          'Contains all',
          'Holdings administrative notes',
          'AND',
        );
        InventoryInstances.checkAdvSearchModalValues(
          1,
          'search adm note 006',
          'Contains all',
          'Holdings administrative notes',
          'AND',
        );
        InventoryInstances.fillAdvSearchRow(
          2,
          testData.instances[2].holdingsCallNumber,
          'Exact phrase',
          'Call number, normalized',
          'OR',
        );
        InventoryInstances.checkAdvSearchModalValues(
          2,
          testData.instances[2].holdingsCallNumber,
          'Exact phrase',
          'Call number, normalized',
          'OR',
        );
        InventoryInstances.fillAdvSearchRow(3, 'Adm note NOT 6', 'Starts with', 'All', 'NOT');
        InventoryInstances.checkAdvSearchModalValues(
          3,
          'Adm note NOT 6',
          'Starts with',
          'All',
          'NOT',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        InventorySearchAndFilter.verifySearchResult(testData.instances[1].instanceTitle);
        InventorySearchAndFilter.verifySearchResult(testData.instances[2].instanceTitle);
        InventorySearchAndFilter.checkRowsCount(2);
      },
    );
  });
});
