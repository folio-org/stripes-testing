import uuid from 'uuid';
import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        shadowInstance: {
          instanceTitle: `C411664 Autotest Instance ${getRandomPostfix()}`,
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
              cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
                testData.holdings.locationId = res.id;
                testData.holdings.locationName = res.name;
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                testData.item.loanTypeId = res[0].id;
                testData.item.loanTypeName = res[0].name;
              });
              cy.getBookMaterialType().then((res) => {
                testData.item.materialTypeId = res.id;
                testData.item.materialTypeName = res.name;
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
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.barcode);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.shadowInstance.id);
      });

      it(
        'C411664 (CONSORTIA) Verify the closing after Add item action on Consortial holdings accordion details on shared Instance in Member Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411664'] },
        () => {
          InventorySearchAndFilter.searchInstanceByTitle(testData.shadowInstance.id);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.shadowInstance.id, false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
          InstanceRecordView.expandMemberSubHoldings(tenantNames.college);
          InstanceRecordView.verifyMemberSubSubHoldingsAccordion(
            tenantNames.college,
            Affiliations.College,
            testData.holdings.id,
          );
          InstanceRecordView.clickAddItemByHoldingName({
            holdingName: testData.holdings.locationName,
          });
          ItemRecordNew.waitLoading(testData.shadowInstance.instanceTitle);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          ItemRecordNew.cancel();
          InstanceRecordView.waitLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          InstanceRecordView.clickAddItemByHoldingName({
            holdingName: testData.holdings.locationName,
          });
          ItemRecordNew.waitLoading(testData.shadowInstance.instanceTitle);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          ItemRecordNew.fillItemRecordFields({
            barcode: `C411664-${getRandomPostfix()}`,
            materialType: testData.item.materialTypeName,
            loanType: testData.item.loanTypeName,
          });
          ItemRecordNew.saveAndClose(true);
          InstanceRecordView.waitLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.shadowInstance.id, true);
        },
      );
    });
  });
});
