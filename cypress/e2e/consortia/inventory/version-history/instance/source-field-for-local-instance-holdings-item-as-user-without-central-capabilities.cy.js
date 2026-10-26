import Affiliations from '../../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import { ITEM_STATUS_NAMES } from '../../../../../support/constants';
import HoldingsRecordView from '../../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import DateTools from '../../../../../support/utils/dateTools';

const capabSetsToAssign = [
  CapabilitySets.uiInventoryInstanceEdit,
  CapabilitySets.uiInventoryInstanceCreate,
  CapabilitySets.uiInventoryHoldingsEdit,
  CapabilitySets.uiInventoryHoldingsCreate,
  CapabilitySets.uiInventoryItemEdit,
  CapabilitySets.uiInventoryItemCreate,
];

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Instance', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C1434627_FolioInstance_${randomPostfix}`,
        itemBarcode: `AT_C1434627_ItemBarcode_${randomPostfix}`,
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        noteText: 'Updated by User B',
      };

      before('Create test data and users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C1434627_');

        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          testData.location = location;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.materialTypeId = res.id;
        });

        cy.then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title: testData.instanceTitle,
              instanceTypeId: testData.instanceTypeId,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.location.id,
              },
            ],
            items: [
              {
                barcode: testData.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((createdInstance) => {
            testData.instanceId = createdInstance.instanceId;
            testData.holdingId = createdInstance.holdings[0].id;
            testData.itemId = createdInstance.items[0].id;
          });

          // Both users have College-only affiliation (no Central capabilities at all) -
          // creating them directly in College, not Central, keeps it that way
          cy.createTempUser([]).then((createdUserA) => {
            testData.userA = createdUserA;
            cy.assignCapabilitiesToExistingUser(testData.userA.userId, [], capabSetsToAssign);
          });
          cy.createTempUser([]).then((createdUserB) => {
            testData.userB = createdUserB;
            cy.assignCapabilitiesToExistingUser(testData.userB.userId, [], capabSetsToAssign);
          });
        })
          .then(() => {
            // Fetch the current Instance, Holdings and Item as admin first, then switch to
            // User B's own token once to update all three in a row - so "Source" in Version
            // history attributes each change to them, not to admin - then switch back once
            cy.getInstanceById(testData.instanceId).then((instance) => {
              testData.instance = instance;
            });
            cy.getHoldings({ limit: 1, query: `instanceId==${testData.instanceId}` }).then(
              (holdings) => {
                testData.holding = holdings[0];
              },
            );
            InventoryItems.getItemByIdViaApi(testData.itemId).then((item) => {
              testData.item = item;
            });
          })
          .then(() => {
            cy.getToken(testData.userB.username, testData.userB.password);
            testData.instance.administrativeNotes = [testData.noteText];
            cy.updateInstance(testData.instance);
            testData.holding.administrativeNotes = [testData.noteText];
            cy.updateHoldingRecord(testData.holding.id, testData.holding);
            testData.item.administrativeNotes = [testData.noteText];
            cy.updateItemViaApi(testData.item);
          })
          .then(() => {
            cy.resetTenant();
            cy.getAdminToken();

            cy.setTenant(Affiliations.College);
            cy.login(testData.userA.username, testData.userA.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      });

      it(
        'C1434627 Verify "Source" field in "Version history" for Local Instance, Holdings, Item as user without Central tenant capabilities (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C1434627'] },
        () => {
          // Step 1: open the Instance, click "Version history" - top card shows User B as
          // Source (the one who updated it), marked as the current version
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.userB.firstName,
            testData.userB.lastName,
            false,
            true,
          );

          // Step 2: close Version history, open the Holdings record, check its Version
          // history card the same way
          VersionHistorySection.clickCloseButton();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.userB.firstName,
            testData.userB.lastName,
            false,
            true,
          );

          // Step 3: close Version history and the Holdings view, expand the Holdings
          // accordion on the Instance, open the Item by barcode, check its Version history
          VersionHistorySection.clickCloseButton();
          HoldingsRecordView.close();
          InventoryInstance.openHoldingsAccordion(testData.location.name);
          InventoryInstance.openItemByBarcode(testData.itemBarcode);
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.userB.firstName,
            testData.userB.lastName,
            false,
            true,
          );
        },
      );
    });
  });
});
