import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import HoldingsSources from '../../../support/fragments/settings/inventory/holdings/holdingsSources';
import inventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Instances', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C959220_FolioInstance_${randomPostfix}`;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix,
        holdingsCount: 1,
        itemsCount: 0,
      }),
    };
    let user;
    let location;
    let materialType;
    let loanType;
    let holdingsId;
    let holdingsSourceId;

    before('Get reference data and create user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C959220_FolioInstance');

      cy.then(() => {
        // Get required reference data
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
        }).then(() => {
          location = Cypress.env('locations')[0];
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
      })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
            sourceId: holdingsSourceId,
          });
          holdingsId = testData.folioInstances[0].holdings[0].id;
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.inventoryStorageItemsBatchUpdate.gui,
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
      'C959220 API | Create multiple Items using POST /item-storage/batch/synchronous with empty fields',
      { tags: ['criticalPath', 'spitfire', 'C959220'] },
      () => {
        // Step 1. Send POST ‘/items-storage/batch/synchronous’ with following body (with empty fields):
        const itemRecordsWithoutIdsOne = [
          {
            holdingsRecordId: holdingsId,
            barcode: `C959220_1_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
            administrativeNotes: [''],
            formerIds: [''],
            statisticalCodeIds: [''],
            yearCaption: [''],
            tags: {
              tagList: [''],
            },
          },
          {
            holdingsRecordId: holdingsId,
            barcode: `C959220_2_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
            administrativeNotes: [''],
            formerIds: [''],
            statisticalCodeIds: [''],
            yearCaption: [''],
            tags: {
              tagList: [''],
            },
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchCreateItemsViaApi(itemRecordsWithoutIdsOne).then((batchResponse) => {
          expect(batchResponse.status).to.eq(201);
        });

        // Step 2. Verify that created Item (any) has empty arrays (without "")
        inventoryItems.getItemsInHoldingsViaApi(holdingsId).then((items) => {
          expect(items[0].barcode).to.eq(itemRecordsWithoutIdsOne[0].barcode);
          expect(items[0].administrativeNotes).to.deep.equal([]);
          expect(items[0].statisticalCodeIds).to.deep.equal([]);
          expect(items[0].formerIds).to.deep.equal([]);
          expect(items[0].tags.tagList).to.deep.equal([]);
        });
      },
    );
  });
});
