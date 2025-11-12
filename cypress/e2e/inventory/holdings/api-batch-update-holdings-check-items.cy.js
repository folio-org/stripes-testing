import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import HoldingsSources from '../../../support/fragments/settings/inventory/holdings/holdingsSources';
import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';

describe('Inventory', () => {
  describe('Holdings', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C825322_FolioInstance_${randomPostfix}`;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix,
        holdingsCount: 2,
        itemsCount: 0,
      }),
    };
    const searchOption = 'Item UUID';
    const callNumberValues = {
      callNumber: `AT_C825322_CallNumber_${randomPostfix}`,
      callNumberPrefix: 'AT_C825322_PREFIX',
      callNumberSuffix: 'AT_C825322_POSTFIX',
      callNumberTypeId: null,
      copyNumber: 'AT_C825322_COPY_NUMBER',
    };

    let user;
    let locationA;
    let locationB;
    let materialType;
    let loanType;
    let holdingsAId;
    let holdingsBId;
    let holdingsSourceId;
    let callNumberType;
    const itemIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C825322_FolioInstance');

      cy.then(() => {
        // Get required reference data
        cy.getLocations({
          limit: 2,
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
        HoldingsSources.getHoldingsSourcesViaApi({
          query: 'name="folio"',
        }).then((holdingsSources) => {
          holdingsSourceId = holdingsSources[0].id;
        });
        CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
          callNumberType = res.filter((type) => type.source === 'system')[0];
          callNumberValues.callNumberTypeId = callNumberType.id;
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location: locationA,
            sourceId: holdingsSourceId,
          });
          holdingsAId = testData.folioInstances[0].holdings[0].id;
          holdingsBId = testData.folioInstances[0].holdings[1].id;

          for (let i = 0; i < 2; i++) {
            cy.createItem({
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId: holdingsAId,
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
            }).then((response) => {
              itemIds.push(response.body.id);
            });
          }

          for (let i = 0; i < 2; i++) {
            cy.createItem({
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId: holdingsBId,
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
            }).then((response) => {
              itemIds.push(response.body.id);
            });
          }
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.inventoryStorageHoldingsBatchUpdate.gui,
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
      'C825322 API | Update multiple holdings using POST /holdings-storage/batch/synchronous and check items fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C825322'] },
      () => {
        const holdingsRecords1 = [
          {
            _version: 1,
            id: holdingsAId,
            instanceId: testData.folioInstances[0].instanceId,
            permanentLocationId: locationB.id,
            sourceId: holdingsSourceId,
          },
          {
            _version: 1,
            id: holdingsBId,
            instanceId: testData.folioInstances[0].instanceId,
            permanentLocationId: locationB.id,
            sourceId: holdingsSourceId,
          },
        ];
        const holdingsRecords2 = [
          {
            _version: 2,
            id: holdingsAId,
            instanceId: testData.folioInstances[0].instanceId,
            permanentLocationId: locationA.id,
            sourceId: holdingsSourceId,
            ...callNumberValues,
          },
          {
            _version: 2,
            id: holdingsBId,
            instanceId: testData.folioInstances[0].instanceId,
            permanentLocationId: locationA.id,
            sourceId: holdingsSourceId,
            ...callNumberValues,
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchUpdateHoldingsViaApi(holdingsRecords1).then((batchResponse1) => {
          expect(batchResponse1.status).to.eq(201);

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          itemIds.forEach((itemId) => {
            InventorySearchAndFilter.searchByParameter(searchOption, itemId);
            ItemRecordView.waitLoading();
            ItemRecordView.verifyEffectiveLocation(locationB.name);
            ItemRecordView.closeDetailView();
          });

          cy.batchUpdateHoldingsViaApi(holdingsRecords2).then((batchResponse2) => {
            expect(batchResponse2.status).to.eq(201);

            itemIds.forEach((itemId) => {
              InventorySearchAndFilter.searchByParameter(searchOption, itemId);
              ItemRecordView.waitLoading();
              ItemRecordView.verifyEffectiveCallNumber(
                `${callNumberValues.callNumberPrefix} ${callNumberValues.callNumber} ${callNumberValues.callNumberSuffix}`,
              );
              ItemRecordView.closeDetailView();
            });
          });
        });
      },
    );
  });
});
