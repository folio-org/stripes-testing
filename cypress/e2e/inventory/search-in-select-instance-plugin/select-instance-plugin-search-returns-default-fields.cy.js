import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import AreYouSureModal from '../../../support/fragments/orders/modals/areYouSureModal';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import NewRequest from '../../../support/fragments/requests/newRequest';
import Requests from '../../../support/fragments/requests/requests';
import TitleLevelRequests from '../../../support/fragments/settings/circulation/titleLevelRequests';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };
    const instanceTitle = `AT_C1045414_Instance_${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id });
          Orders.createOrderViaApi(testData.order).then((order) => {
            testData.order = order;
          });
        });

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            InventoryInstances.getIdentifierTypes({ query: 'name=="ISBN"' }).then(
              (identifierType) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: instanceTypes[0].id,
                    title: instanceTitle,
                    contributors: [
                      {
                        name: `AT_C1045414_Contributor_${getRandomPostfix()}`,
                        contributorNameTypeId: contributorNameTypes[0].id,
                        primary: false,
                      },
                    ],
                    identifiers: [
                      {
                        value: `AT_C1045414_ISBN_${getRandomPostfix()}`,
                        identifierTypeId: identifierType.id,
                      },
                    ],
                    publication: [
                      {
                        publisher: `AT_C1045414_Publisher_${getRandomPostfix()}`,
                        dateOfPublication: '2024',
                      },
                    ],
                  },
                }).then((instance) => {
                  testData.instanceId = instance.instanceId;
                });
              },
            );
          });
        });

        TitleLevelRequests.enableTLRViaApi();

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrdersEdit.gui,
          Permissions.uiReceivingViewEditCreate.gui,
          Permissions.uiRequestsCreate.gui,
          Permissions.uiRequestsEdit.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          ServicePoints.getOrCreateCircDesk1ServicePointViaApi().then((servicePoint) => {
            testData.servicePointId = servicePoint.id;
            UserEdit.addServicePointViaApi(
              testData.servicePointId,
              testData.user.userId,
              testData.servicePointId,
            ).then(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: '/orders',
                waiter: Orders.waitLoading,
              });
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      TitleLevelRequests.disableTLRViaApi();
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePointId]);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1045414 Select instance plugin | Verify search instance requests return all default fields in response (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1045414'] },
      () => {
        // Step 1-3: Orders app — Add PO line → Title look-up → open plugin
        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.clickTitleLookUpButton();
        SelectInstanceModal.waitLoading();
        InventorySearchAndFilter.instanceTabIsDefault();

        // Step 4: Search on Instance tab, verify response contains default fields
        cy.intercept('/search/instances?*').as('instanceSearch');
        SelectInstanceModal.searchByName(instanceTitle);
        cy.wait('@instanceSearch').then(({ response }) => {
          SelectInstanceModal.verifyResponseContainsDefaultFields(response);
        });

        // Step 5: Holdings tab — search and verify response
        SelectInstanceModal.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        cy.intercept('/search/instances?*').as('holdingsSearch');
        SelectInstanceModal.searchByName(instanceTitle);
        cy.wait('@holdingsSearch').then(({ response }) => {
          SelectInstanceModal.verifyResponseContainsDefaultFields(response);
        });

        // Step 5 (Item tab): Item tab — search and verify response
        SelectInstanceModal.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        cy.intercept('/search/instances?*').as('itemSearch');
        SelectInstanceModal.searchByName(instanceTitle);
        cy.wait('@itemSearch').then(({ response }) => {
          SelectInstanceModal.verifyResponseContainsDefaultFields(response);
        });

        SelectInstanceModal.clickCloseButton();

        // Step 6-8: Receiving app — open edit pane → Title look-up → search and verify
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
        AreYouSureModal.clickCloseWithoutSavingButton();
        Receiving.waitLoading();
        Receiving.clickNewTitleOption();

        Receiving.clickTitleLookUpButton();
        SelectInstanceModal.waitLoading();
        InventorySearchAndFilter.instanceTabIsDefault();

        cy.intercept('/search/instances?*').as('receivingInstanceSearch');
        SelectInstanceModal.searchByName(instanceTitle);
        cy.wait('@receivingInstanceSearch').then(({ response }) => {
          SelectInstanceModal.verifyResponseContainsDefaultFields(response);
        });

        // Step 9 (Holdings):
        SelectInstanceModal.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        cy.intercept('/search/instances?*').as('receivingHoldingsSearch');
        SelectInstanceModal.searchByName(instanceTitle);
        cy.wait('@receivingHoldingsSearch').then(({ response }) => {
          SelectInstanceModal.verifyResponseContainsDefaultFields(response);
        });

        // Step 9 (Item):
        SelectInstanceModal.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        cy.intercept('/search/instances?*').as('receivingItemSearch');
        SelectInstanceModal.searchByName(instanceTitle);
        cy.wait('@receivingItemSearch').then(({ response }) => {
          SelectInstanceModal.verifyResponseContainsDefaultFields(response);
        });

        SelectInstanceModal.clickCloseButton();

        // Step 10-12: Requests app — new TLR → Title look-up → search and verify
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
        Requests.waitContentLoading();
        NewRequest.openNewRequestPane();
        NewRequest.waitLoadingNewRequestPage();
        NewRequest.enableTitleLevelRequest();

        NewRequest.openTitleLookUp();
        SelectInstanceModal.waitLoading();
        SelectInstanceModal.checkDefaultSearchOptionSelected();

        cy.intercept('/search/instances?*').as('requestInstanceSearch');
        SelectInstanceModal.searchByName(instanceTitle);
        cy.wait('@requestInstanceSearch').then(({ response }) => {
          SelectInstanceModal.verifyResponseContainsDefaultFields(response);
        });

        SelectInstanceModal.clickCloseButton();

        // Step 13-15: Inventory — edit Instance → Add preceding title → search and verify
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        AreYouSureModal.clickCloseWithoutSavingButton();
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(instanceTitle);
        InventoryInstances.selectInstance();

        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        InstanceRecordEdit.clickAddPrecedingTitleLookUpButton();
        SelectInstanceModal.waitLoading();
        InventorySearchAndFilter.instanceTabIsDefault();

        cy.intercept('/search/instances?*').as('precedingInstanceSearch');

        SelectInstanceModal.searchByName(instanceTitle);
        cy.wait('@precedingInstanceSearch').then(({ response }) => {
          SelectInstanceModal.verifyResponseContainsDefaultFields(response);
        });

        // Step 16 (Holdings):
        SelectInstanceModal.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        cy.intercept('/search/instances?*').as('precedingHoldingsSearch');
        SelectInstanceModal.searchByName(instanceTitle);
        cy.wait('@precedingHoldingsSearch').then(({ response }) => {
          SelectInstanceModal.verifyResponseContainsDefaultFields(response);
        });

        // Step 16 (Item):
        SelectInstanceModal.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        cy.intercept('/search/instances?*').as('precedingItemSearch');
        SelectInstanceModal.searchByName(instanceTitle);
        cy.wait('@precedingItemSearch').then(({ response }) => {
          SelectInstanceModal.verifyResponseContainsDefaultFields(response);
        });

        SelectInstanceModal.clickCloseButton();
      },
    );
  });
});
