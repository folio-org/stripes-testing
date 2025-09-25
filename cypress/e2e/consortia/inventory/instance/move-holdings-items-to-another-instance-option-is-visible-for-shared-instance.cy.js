import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        itemBarcode: getRandomPostfix(),
      };

      before('Create test data and login', () => {
        cy.withinTenant(Affiliations.Consortia, () => {
          cy.getAdminToken();
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            testData.instance = instanceData;
          });
        });
        cy.withinTenant(Affiliations.College, () => {
          cy.then(() => {
            cy.getLocations({ limit: 1 }).then((res) => {
              testData.locationId = res.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.sourceId = folioSource.id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((res) => {
              testData.materialTypeId = res.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              testData.loanTypeId = res[0].id;
            });
          }).then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instance.instanceId,
              permanentLocationId: testData.locationId,
              sourceId: testData.sourceId,
            }).then((holdingData) => {
              cy.createItem({
                holdingsRecordId: holdingData.id,
                materialType: { id: testData.materialTypeId },
                permanentLoanType: { id: testData.loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                barcode: testData.itemBarcode,
              });
            });
          });
        });

        cy.resetTenant();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiInventoryMoveItems.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: [Permissions.inventoryAll.gui, Permissions.uiInventoryMoveItems.gui],
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete test data', () => {
        cy.withinTenant(Affiliations.Consortia, () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
        });
        cy.withinTenant(Affiliations.College, () => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
            testData.instance.instanceId,
          );
        });
      });

      it(
        'C594478 (CONSORTIA) "Move holdings/items to another instance" option is visible for shared instances (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C594478'] },
        () => {
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.validateOptionInActionsMenu(
            actionsMenuOptions.moveHoldingsItemsToAnotherInstance,
            false,
          );

          cy.resetTenant();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.validateOptionInActionsMenu(
            actionsMenuOptions.moveHoldingsItemsToAnotherInstance,
            true,
          );
        },
      );
    });
  });
});
