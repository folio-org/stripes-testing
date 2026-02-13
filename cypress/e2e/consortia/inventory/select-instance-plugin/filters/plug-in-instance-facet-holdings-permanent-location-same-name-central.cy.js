import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import Location from '../../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { ITEM_STATUS_NAMES } from '../../../../../support/constants';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import { NewOrder, Orders } from '../../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../../support/fragments/organizations';
import OrderLineEditForm from '../../../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../../../support/fragments/orders/modals/selectInstanceModal';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const titlePrefix = `AT_C436893_${randomPostfix}`;
        const organization = NewOrganization.getDefaultOrganization();
        organization.name = `AT_C436893_Org_${randomPostfix}`;
        const testData = {
          locations: {},
          instances: {},
          user: {},
        };
        const tenants = {
          central: Affiliations.Consortia,
          member1: Affiliations.College,
          member2: Affiliations.University,
        };
        const tenantDisplayNames = {
          central: tenantNames.central,
          member1: tenantNames.college,
          member2: tenantNames.university,
        };
        const userPermissions = [
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrdersEdit.gui,
        ];
        const locationsAccordionName = 'Holdings permanent location';
        let loanTypeId;
        let materialTypeId;
        let order;

        before('Create test data and user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Organizations.createOrganizationViaApi(organization).then(() => {
            const orderData = NewOrder.getDefaultOngoingOrder({
              vendorId: organization.id,
            });
            Orders.createOrderViaApi(orderData).then((createdOrder) => {
              order = createdOrder;
            });
          });
          cy.then(() => {
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              testData.instanceTypeIdCentral = instanceTypes[0].id;
            });
            cy.setTenant(tenants.member1);
            cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
              testData.holdingTypeIdMember1 = holdingTypes[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdingsSourceIdMember1 = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeId = loanTypes[0].id;
            });
            cy.getAllMaterialTypes({ limit: 1, query: 'source=folio' }).then((mtypes) => {
              materialTypeId = mtypes[0].id;
            });
            cy.setTenant(tenants.member2);
            cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
              testData.holdingTypeIdMember2 = holdingTypes[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdingsSourceIdMember2 = folioSource.id;
            });
            // Create locations in both member tenants
            cy.setTenant(tenants.member1);
            testData.servicePointMember1 = ServicePoints.getDefaultServicePoint();
            ServicePoints.createViaApi(testData.servicePointMember1);
            testData.locations.testLocation_member1 = Location.getDefaultLocation(
              testData.servicePointMember1.id,
              `${titlePrefix}_TestLocation`,
              `${titlePrefix}_T`,
            );
            Location.createViaApi(testData.locations.testLocation_member1).then((loc) => {
              testData.locations.testLocation_member1.id = loc.id;
            });
            cy.setTenant(tenants.member2);
            testData.servicePointMember2 = ServicePoints.getDefaultServicePoint();
            ServicePoints.createViaApi(testData.servicePointMember2);
            testData.locations.testLocation_member2 = Location.getDefaultLocation(
              testData.servicePointMember2.id,
              `${titlePrefix}_TestLocation`,
              `${titlePrefix}_T`,
            );
            Location.createViaApi(testData.locations.testLocation_member2).then((loc) => {
              testData.locations.testLocation_member2.id = loc.id;
            });
          }).then(() => {
            // Create shared instance in Central
            cy.setTenant(tenants.central);
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: titlePrefix,
                instanceTypeId: testData.instanceTypeIdCentral,
              },
            })
              .then((createdInstance) => {
                // Holdings/item in Member 1
                cy.setTenant(tenants.member1);
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: createdInstance.instanceId,
                  permanentLocationId: testData.locations.testLocation_member1.id,
                  sourceId: testData.holdingsSourceIdMember1,
                }).then((holding) => {
                  InventoryItems.createItemViaApi({
                    holdingsRecordId: holding.id,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLocation: {
                      id: testData.locations.testLocation_member1.id,
                    },
                  }).then(() => {
                    // Holdings/item in Member 2
                    cy.setTenant(tenants.member2);
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: createdInstance.instanceId,
                      permanentLocationId: testData.locations.testLocation_member2.id,
                      sourceId: testData.holdingsSourceIdMember2,
                    }).then((holding2) => {
                      InventoryItems.createItemViaApi({
                        holdingsRecordId: holding2.id,
                        materialType: { id: materialTypeId },
                        permanentLoanType: { id: loanTypeId },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        permanentLocation: {
                          id: testData.locations.testLocation_member2.id,
                        },
                      });
                    });
                  });
                });
              })
              .then(() => {
                // Create and affiliate user
                cy.resetTenant();
                cy.getAdminToken();
                cy.createTempUser(userPermissions).then((userProps) => {
                  testData.user = userProps;
                  cy.affiliateUserToTenant({
                    tenantId: tenants.member1,
                    userId: testData.user.userId,
                    permissions: userPermissions,
                  });
                  cy.affiliateUserToTenant({
                    tenantId: tenants.member2,
                    userId: testData.user.userId,
                    permissions: userPermissions,
                  });
                });
              });
          });
        });

        after('Cleanup test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          Organizations.deleteOrganizationViaApi(organization.id);
          Orders.deleteOrderViaApi(order.id);

          cy.setTenant(tenants.member1);
          InventoryInstances.deleteFullInstancesByTitleViaApi(titlePrefix);
          Location.deleteInstitutionCampusLibraryLocationViaApi(
            testData.locations.testLocation_member1.institutionId,
            testData.locations.testLocation_member1.campusId,
            testData.locations.testLocation_member1.libraryId,
            testData.locations.testLocation_member1.id,
          );
          ServicePoints.deleteViaApi(testData.servicePointMember1.id);

          cy.setTenant(tenants.member2);
          InventoryInstances.deleteFullInstancesByTitleViaApi(titlePrefix);
          Location.deleteInstitutionCampusLibraryLocationViaApi(
            testData.locations.testLocation_member2.institutionId,
            testData.locations.testLocation_member2.campusId,
            testData.locations.testLocation_member2.libraryId,
            testData.locations.testLocation_member2.id,
          );
          ServicePoints.deleteViaApi(testData.servicePointMember2.id);

          cy.resetTenant();
          InventoryInstances.deleteFullInstancesByTitleViaApi(titlePrefix);
        });

        it(
          'C436893 Locations with same names could be found using "Holdings permanent location" facet of "Select instance" plug-in opened from "Central" tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C436893'] },
          () => {
            cy.resetTenant();
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.ordersPath,
              waiter: Orders.waitLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            Orders.selectOrderByPONumber(order.poNumber);
            OrderDetails.selectAddPOLine();
            OrderLineEditForm.clickTitleLookUpButton();

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();

            InventorySearchAndFilter.toggleAccordionByName(locationsAccordionName);
            SelectInstanceModal.checkOptionsWithCountersExistInAccordion(locationsAccordionName);

            SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.locations.testLocation_member1.name,
              true,
              2,
            );
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member1})`,
            );
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member2})`,
            );

            SelectInstanceModal.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member1})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(titlePrefix);

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();

            InventorySearchAndFilter.toggleAccordionByName(locationsAccordionName);
            SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.locations.testLocation_member1.name,
              true,
              2,
            );
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member1})`,
            );
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member2})`,
            );

            SelectInstanceModal.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member2})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifyInstanceDisplayed(titlePrefix);
          },
        );
      });
    });
  });
});
