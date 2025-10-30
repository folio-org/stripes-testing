import uuid from 'uuid';
import {
  APPLICATION_NAMES,
  HOLDINGS_SOURCE_NAMES,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        shadowInstance: {
          instanceTitle: `C411647 Autotest Instance ${getRandomPostfix()}`,
          instanceTypeId: '',
        },
        holdings: {},
        item: { barcode: uuid() },
      };

      before('Create test data and login', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;

          cy.setTenant(Affiliations.College)
            .then(() => {
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
                testData.shadowInstance.instanceTypeId = instanceTypes[0].id;
              });
              cy.getHoldingTypes({ limit: 1 }).then((res) => {
                testData.holdings.holdingTypeId = res[0].id;
              });
              cy.getLocations({ limit: 1 }).then((res) => {
                testData.holdings.locationId = res.id;
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                testData.item.loanTypeId = res[0].id;
              });
              cy.getBookMaterialType().then((res) => {
                testData.item.materialTypeId = res.id;
              });
            })
            .then(() => {
              // create shadow instance with holdings and item
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.shadowInstance.instanceTypeId,
                  title: testData.shadowInstance.instanceTitle,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdings.holdingTypeId,
                    permanentLocationId: testData.holdings.locationId,
                  },
                ],
                items: [
                  {
                    barcode: testData.item.barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.item.loanTypeId },
                    materialType: { id: testData.item.materialTypeId },
                  },
                ],
              }).then((specialInstanceIds) => {
                testData.shadowInstance.id = specialInstanceIds.instanceId;
                testData.holdings.id = specialInstanceIds.holdingIds[0].id;
                testData.item.id = specialInstanceIds.items[0].id;

                InventoryInstance.shareInstanceViaApi(
                  testData.shadowInstance.id,
                  testData.consortiaId,
                  Affiliations.College,
                  Affiliations.Consortia,
                );
              });
            });
        });
        cy.resetTenant();

        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.uiInventoryViewInstances.gui,
          ]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.uiInventoryViewInstances.gui,
          ]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryItems.deleteItemViaApi(testData.item.id);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.holdings.id);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.shadowInstance.id);
      });

      it(
        'C411647 (CONSORTIA) Verify View holdings option in Consortial holdings accordion details on shared Instance in Member Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411647'] },
        () => {
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(testData.shadowInstance.id);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
          InstanceRecordView.expandMemberSubHoldings(tenantNames.college);
          InstanceRecordView.verifyMemberSubSubHoldingsAccordion(
            tenantNames.college,
            Affiliations.College,
            testData.holdings.id,
          );
          InstanceRecordView.openHoldingView();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkSource(HOLDINGS_SOURCE_NAMES.FOLIO);
        },
      );
    });
  });
});
