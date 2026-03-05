import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import { ITEM_STATUS_NAMES } from '../../../../../support/constants';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';
import ServicePoints from '../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrder, Orders } from '../../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../../support/fragments/organizations';
import OrderLineEditForm from '../../../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instancePrefix = `AT_C436891_Instance_${randomPostfix}`;
        const locationPrefix = `AT_C436891_Location_${randomPostfix}`;
        const organization = NewOrganization.getDefaultOrganization();
        organization.name = `AT_C436891_Org_${randomPostfix}`;
        const locationAccordionName = 'Effective location (item)';
        const instancesData = [
          {
            affiliation: Affiliations.Consortia,
            holdingsAffiliation: Affiliations.College,
            locationIndex: 0,
          },
          {
            affiliation: Affiliations.Consortia,
            holdingsAffiliation: Affiliations.University,
            locationIndex: 0,
          },
          {
            affiliation: Affiliations.Consortia,
            holdingsAffiliation: Affiliations.College,
            locationIndex: 1,
          },
          {
            affiliation: Affiliations.Consortia,
            holdingsAffiliation: Affiliations.University,
            locationIndex: 1,
          },
          {
            affiliation: Affiliations.College,
            holdingsAffiliation: Affiliations.College,
            locationIndex: 0,
          },
          {
            affiliation: Affiliations.University,
            holdingsAffiliation: Affiliations.University,
            locationIndex: 0,
          },
          {
            affiliation: Affiliations.College,
            holdingsAffiliation: Affiliations.College,
            locationIndex: 1,
          },
          {
            affiliation: Affiliations.University,
            holdingsAffiliation: Affiliations.University,
            locationIndex: 1,
          },
        ];
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const instanceIndexesShared = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.Consortia)
          .map(({ index }) => index);
        const locations = {
          [Affiliations.College]: [],
          [Affiliations.University]: [],
        };
        const loanTypeIds = {};
        const materialTypeIds = {};
        let collegeServicePoint;
        let universityServicePoint;
        let commonLocationDataCollege;
        let uniqueLocationDataCollege;
        let commonLocationDataUniversity;
        let uniqueLocationDataUniversity;
        let user;
        let order;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiOrdersCreate.gui,
            Permissions.uiOrdersEdit.gui,
          ])
            .then((userProperties) => {
              user = userProperties;
              cy.assignAffiliationToUser(Affiliations.College, user.userId);

              Organizations.createOrganizationViaApi(organization).then(() => {
                const orderData = NewOrder.getDefaultOngoingOrder({
                  vendorId: organization.id,
                });
                Orders.createOrderViaApi(orderData).then((createdOrder) => {
                  order = createdOrder;
                });
              });

              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);

              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C436891');
              collegeServicePoint = ServicePoints.getDefaultServicePoint();
              ServicePoints.createViaApi(collegeServicePoint);
              uniqueLocationDataCollege = Locations.getDefaultLocation({
                locationName: `${locationPrefix}_College_Unique`,
                servicePointId: collegeServicePoint.id,
              }).location;
              Locations.createViaApi(uniqueLocationDataCollege).then((loc) => {
                locations[Affiliations.College].push(loc);
              });
              commonLocationDataCollege = Locations.getDefaultLocation({
                locationName: `${locationPrefix}_Common`,
                servicePointId: collegeServicePoint.id,
              }).location;
              Locations.createViaApi(commonLocationDataCollege).then((loc) => {
                locations[Affiliations.College].push(loc);
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
                loanTypeIds[Affiliations.College] = loanTypes[0].id;
              });
              cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
                materialTypeIds[Affiliations.College] = res.id;
              });

              cy.setTenant(Affiliations.University);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C436891');
              universityServicePoint = ServicePoints.getDefaultServicePoint();
              ServicePoints.createViaApi(universityServicePoint);
              uniqueLocationDataUniversity = Locations.getDefaultLocation({
                locationName: `${locationPrefix}_University_Unique`,
                servicePointId: universityServicePoint.id,
              }).location;
              Locations.createViaApi(uniqueLocationDataUniversity).then((loc) => {
                locations[Affiliations.University].push(loc);
              });
              commonLocationDataUniversity = Locations.getDefaultLocation({
                locationName: `${locationPrefix}_Common`,
                servicePointId: universityServicePoint.id,
              }).location;
              Locations.createViaApi(commonLocationDataUniversity).then((loc) => {
                locations[Affiliations.University].push(loc);
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
                loanTypeIds[Affiliations.University] = loanTypes[0].id;
              });
              cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
                materialTypeIds[Affiliations.University] = res.id;
              });
            })
            .then(() => {
              cy.resetTenant();
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C436891');

              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  instancesData.forEach((instanceData, index) => {
                    cy.setTenant(instanceData.affiliation);
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId: instanceTypes[0].id,
                        title: `${instanceTitles[index]}`,
                      },
                    }).then((createdInstanceData) => {
                      instanceData.instanceId = createdInstanceData.instanceId;
                    });
                  });
                },
              );
            })
            .then(() => {
              cy.resetTenant();
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                instancesData.forEach((instanceData) => {
                  cy.setTenant(instanceData.holdingsAffiliation);
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instanceData.instanceId,
                    permanentLocationId:
                      locations[instanceData.holdingsAffiliation][instanceData.locationIndex].id,
                    sourceId: folioSource.id,
                  }).then((createdHoldings) => {
                    InventoryItems.createItemViaApi({
                      holdingsRecordId: createdHoldings.id,
                      materialType: { id: materialTypeIds[instanceData.holdingsAffiliation] },
                      permanentLoanType: { id: loanTypeIds[instanceData.holdingsAffiliation] },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    });
                  });
                });
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.ordersPath,
                waiter: Orders.waitLoading,
                authRefresh: true,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
          Locations.deleteViaApi(commonLocationDataCollege);
          Locations.deleteViaApi(uniqueLocationDataCollege);
          ServicePoints.deleteViaApi(collegeServicePoint.id);

          cy.setTenant(Affiliations.University);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
          Locations.deleteViaApi(commonLocationDataUniversity);
          Locations.deleteViaApi(uniqueLocationDataUniversity);
          ServicePoints.deleteViaApi(universityServicePoint.id);

          cy.resetTenant();
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
          Organizations.deleteOrganizationViaApi(organization.id);
          Orders.deleteOrderViaApi(order.id);
          Users.deleteViaApi(user.userId);
        });

        it(
          'C436891 Select instance plugin | Verify Tenant name displays next to location in "Effective location" facet during searching in Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C436891'] },
          () => {
            Orders.selectOrderByPONumber(order.poNumber);
            OrderDetails.selectAddPOLine();
            OrderLineEditForm.clickTitleLookUpButton();
            InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
            SelectInstanceModal.checkOptionsWithCountersExistInAccordion(locationAccordionName);

            SelectInstanceModal.searchByName(instancePrefix);
            instanceIndexesShared.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              locationAccordionName,
              locations[Affiliations.College][1].name,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
            );

            SelectInstanceModal.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[3]);

            SelectInstanceModal.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
              false,
            );
            instanceIndexesShared.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            SelectInstanceModal.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][0].name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][0].name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();

            InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
            SelectInstanceModal.checkOptionsWithCountersExistInAccordion(locationAccordionName);

            SelectInstanceModal.searchByName(instancePrefix);
            instanceIndexesShared.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              locationAccordionName,
              locations[Affiliations.College][1].name,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
            );

            SelectInstanceModal.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[2]);

            SelectInstanceModal.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
              false,
            );
            instanceIndexesShared.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            SelectInstanceModal.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.University][0].name} (${tenantNames.university})`,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.University][0].name} (${tenantNames.university})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();

            InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
            SelectInstanceModal.checkOptionsWithCountersExistInAccordion(locationAccordionName);
            SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              locationAccordionName,
              locations[Affiliations.College][1].name,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.university})`,
            );

            SelectInstanceModal.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][1].name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[2]);

            SelectInstanceModal.selectMultiSelectFilterOption(
              locationAccordionName,
              `${locations[Affiliations.College][0].name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              `${locations[Affiliations.College][0].name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(2);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[2]);
          },
        );
      });
    });
  });
});
