import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import { INVENTORY_DEFAULT_SORT_OPTIONS } from '../../../../support/constants';
import { randomizeArray } from '../../../../support/utils/arrays';
import { NewOrder, Orders } from '../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import OrderLineEditForm from '../../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const testData = {
        organizationCentral: NewOrganization.getDefaultOrganization(),
        organizationMember: NewOrganization.getDefaultOrganization(),
        order: {},
        user: {},
      };
      const titlePrefix = `AT_C543879_Instance ${getRandomPostfix()}`;
      const contributorPrefix = `C543879_Contrib ${getRandomPostfix()}`;
      const instancesData = [];
      const createdInstanceIds = [];
      const contributorIndexes = randomizeArray(Array.from(Array(10).keys()));

      contributorIndexes.forEach((contributorIndex, index) => {
        instancesData.push({
          title: `${titlePrefix} ${index}`,
          contributors: [
            {
              name: `${contributorPrefix} ${contributorIndexes[contributorIndex]}`,
            },
          ],
        });
      });

      before('Set display settings, create orders', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.then(() => {
          Organizations.createOrganizationViaApi(testData.organizationCentral).then(() => {
            testData.orderCentral = NewOrder.getDefaultOngoingOrder({
              vendorId: testData.organizationCentral.id,
            });
            Orders.createOrderViaApi(testData.orderCentral).then((order) => {
              testData.orderCentral = order;
            });
          });
        }).then(() => {
          cy.setupInventoryDefaultSortViaAPI(
            INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS.toLowerCase(),
          );
          cy.setTenant(Affiliations.College);
          cy.then(() => {
            Organizations.createOrganizationViaApi(testData.organizationMember).then(() => {
              testData.orderMember = NewOrder.getDefaultOngoingOrder({
                vendorId: testData.organizationMember.id,
              });
              Orders.createOrderViaApi(testData.orderMember).then((order) => {
                testData.orderMember = order;
              });
            });
          }).then(() => {
            cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
          });
        });
      });

      before('Create instances, user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi(`${titlePrefix.split(' ')[0]}*`);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiOrdersCreate.gui,
            ]).then((userProperties) => {
              testData.userProperties = userProperties;
              instancesData.forEach((instance) => {
                instance.instanceTypeId = instanceTypes[0].id;
                instance.contributors[0].contributorNameTypeId = contributorNameTypes[0].id;
                InventoryInstances.createFolioInstanceViaApi({
                  instance,
                }).then((instanceData) => {
                  createdInstanceIds.push(instanceData.instanceId);
                });
              });
              cy.wait(10_000);
              cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
                Permissions.uiInventoryViewInstances.gui,
                Permissions.uiOrdersCreate.gui,
              ]);
            });
          });
        });
      });

      after('Reset settings, delete data, users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
        createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
        Organizations.deleteOrganizationViaApi(testData.organizationCentral.id);
        Orders.deleteOrderViaApi(testData.orderCentral.id);
        cy.setTenant(Affiliations.College);
        cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
        Organizations.deleteOrganizationViaApi(testData.organizationMember.id);
        Orders.deleteOrderViaApi(testData.orderMember.id);
      });

      it(
        'C543879 Select Instance plugin | Default sort changed on Central tenant does not impact Member tenant search result list (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C543879'] },
        () => {
          cy.resetTenant();
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          }).then(() => {
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            Orders.selectOrderByPONumber(testData.orderCentral.poNumber);
            OrderDetails.selectAddPOLine();
            OrderLineEditForm.clickTitleLookUpButton();

            SelectInstanceModal.searchByName(titlePrefix);
            InventoryInstances.checkResultListSortedByColumn(2);
            InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
            InventoryInstances.clickColumnHeader(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
            InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
            InventoryInstances.checkResultListSortedByColumn(1);
            InventorySearchAndFilter.resetAll();
            SelectInstanceModal.checkResultsListEmpty();
            SelectInstanceModal.searchByName(titlePrefix);
            InventoryInstances.checkResultListSortedByColumn(2);
            InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);

            cy.waitForAuthRefresh(() => {
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              Orders.waitLoading();
              cy.reload();
              Orders.waitLoading();
            }, 20_000);
            Orders.selectOrderByPONumber(testData.orderMember.poNumber);
            OrderDetails.selectAddPOLine();
            OrderLineEditForm.clickTitleLookUpButton();

            SelectInstanceModal.searchByName(titlePrefix);
            InventoryInstances.checkResultListSortedByColumn(1);
            InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
            InventoryInstances.clickColumnHeader(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
            InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
            InventoryInstances.checkResultListSortedByColumn(2);
            InventorySearchAndFilter.resetAll();
            SelectInstanceModal.checkResultsListEmpty();
            SelectInstanceModal.searchByName(titlePrefix);
            InventoryInstances.checkResultListSortedByColumn(1);
            InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
          });
        },
      );
    });
  });
});
