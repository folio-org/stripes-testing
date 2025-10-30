import uuid from 'uuid';
import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        shadowInstance: {
          instanceTitle: `C411654 Autotest Instance ${getRandomPostfix()}`,
        },
        shadowHoldings: {},
        shadowItem: { barcode: uuid() },
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;

          cy.setTenant(Affiliations.College)
            .then(() => {
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
                testData.shadowInstance.instanceTypeId = instanceTypes[0].id;
              });
              cy.getHoldingTypes({ limit: 1 }).then((res) => {
                testData.shadowHoldings.holdingTypeId = res[0].id;
              });
              cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
                testData.shadowHoldings.locationId = res.id;
                testData.shadowHoldings.locationName = res.name;
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                testData.shadowItem.loanTypeId = res[0].id;
              });
              cy.getBookMaterialType().then((res) => {
                testData.shadowItem.materialTypeId = res.id;
              });
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.shadowInstance.instanceTypeId,
                  title: testData.shadowInstance.instanceTitle,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.shadowHoldings.holdingTypeId,
                    permanentLocationId: testData.shadowHoldings.locationId,
                  },
                ],
                items: [
                  {
                    barcode: testData.shadowItem.barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.shadowItem.loanTypeId },
                    materialType: { id: testData.shadowItem.materialTypeId },
                  },
                ],
              }).then((specialInstanceIds) => {
                testData.instanceId = specialInstanceIds.instanceId;
                testData.collegeHoldingId = specialInstanceIds.holdings[0].id;
                testData.collegeItemId = specialInstanceIds.items[0].id;

                InventoryInstance.shareInstanceViaApi(
                  testData.instanceId,
                  testData.consortiaId,
                  Affiliations.College,
                  Affiliations.Consortia,
                );
              });
            });
        });
        cy.resetTenant();

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
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
        cy.deleteItemViaApi(testData.collegeItemId);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.collegeHoldingId);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C411654 (CONSORTIA) Verify Add item button on Consortial holdings accordion details on shared Instance in Member Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411654'] },
        () => {
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitInstanceRecordViewOpened();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
          InstanceRecordView.expandMemberSubHoldings(tenantNames.college);
          InstanceRecordView.verifyMemberSubSubHoldingsAccordion(
            tenantNames.college,
            Affiliations.College,
            testData.collegeHoldingId,
          );
          InstanceRecordView.verifyAddItemButtonVisibility({
            holdingName: testData.shadowHoldings.locationName,
            shouldBePresent: true,
          });
        },
      );
    });
  });
});
