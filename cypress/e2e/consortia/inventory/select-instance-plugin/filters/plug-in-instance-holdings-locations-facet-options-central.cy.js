import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES, ITEM_STATUS_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';
import Locations from '../../../../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrder, Orders } from '../../../../../support/fragments/orders';
import { Organizations } from '../../../../../support/fragments/organizations';
import OrderLineEditForm from '../../../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instancePrefix = `AT_C423639_Instance_${randomPostfix}`;
        const locationAccordionName = 'Holdings permanent location';
        const instancesData = [
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdings: [
              { affiliation: Affiliations.College, locationIndex: 0, itemLocationIndex: null },
              { affiliation: Affiliations.University, locationIndex: 0, itemLocationIndex: null },
            ],
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdings: [
              { affiliation: Affiliations.College, locationIndex: 1, itemLocationIndex: 2 },
              { affiliation: Affiliations.University, locationIndex: 1, itemLocationIndex: 2 },
            ],
          },
        ];
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const locations = {
          [Affiliations.College]: [],
          [Affiliations.University]: [],
        };
        const loanTypeIds = {};
        const materialTypeIds = {};
        let user;
        let order;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Organizations.getOrCreateVendorOrg(Affiliations.Consortia).then((vendorOrg) => {
            const orderData = NewOrder.getDefaultOngoingOrder({ vendorId: vendorOrg.id });
            Orders.createOrderViaApi(orderData).then((createdOrder) => {
              order = createdOrder;
            });
          });
          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiOrdersCreate.gui,
            Permissions.uiOrdersEdit.gui,
          ])
            .then((userProperties) => {
              user = userProperties;
              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.assignAffiliationToUser(Affiliations.University, user.userId);

              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);
              InventoryInstances.deleteFullInstancesByTitleViaApi('C423639_');
              // Member tenants have only the default DCB location - use 3 shared AT_ locations
              [1, 2, 3].forEach((index) => {
                Locations.getOrCreateTenantLocationViaApi(Affiliations.College, index).then(
                  (location) => {
                    locations[Affiliations.College].push(location);
                  },
                );
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
                loanTypeIds[Affiliations.College] = loanTypes[0].id;
              });
              cy.getMaterialTypes({ limit: 1, query: 'source<>local' }).then((res) => {
                materialTypeIds[Affiliations.College] = res.id;
              });

              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);
              InventoryInstances.deleteFullInstancesByTitleViaApi('C423639_');
              [1, 2, 3].forEach((index) => {
                Locations.getOrCreateTenantLocationViaApi(Affiliations.University, index).then(
                  (location) => {
                    locations[Affiliations.University].push(location);
                  },
                );
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
                loanTypeIds[Affiliations.University] = loanTypes[0].id;
              });
              cy.getMaterialTypes({ limit: 1, query: 'source<>local' }).then((res) => {
                materialTypeIds[Affiliations.University] = res.id;
              });
            })
            .then(() => {
              cy.resetTenant();
              InventoryInstances.deleteFullInstancesByTitleViaApi('C423639_');

              cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
                instancesData.forEach((instanceData, index) => {
                  if (instanceData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId: instanceTypes[0].id,
                        title: `${instanceTitles[index]}`,
                      },
                    }).then((createdInstanceData) => {
                      instanceData.instanceId = createdInstanceData.instanceId;
                    });
                  } else {
                    const marcInstanceFields = [
                      { tag: '008', content: QuickMarcEditor.defaultValid008Values },
                      {
                        tag: '245',
                        content: `$a ${instanceTitles[index]}`,
                        indicators: ['1', '1'],
                      },
                    ];

                    cy.createMarcBibliographicViaAPI(
                      QuickMarcEditor.defaultValidLdr,
                      marcInstanceFields,
                    ).then((instanceId) => {
                      instanceData.instanceId = instanceId;
                    });
                  }
                });
              });
            })
            .then(() => {
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                instancesData.forEach((instanceData) => {
                  instanceData.holdings.forEach((holding) => {
                    cy.setTenant(holding.affiliation);
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instanceData.instanceId,
                      permanentLocationId: locations[holding.affiliation][holding.locationIndex].id,
                      sourceId: folioSource.id,
                    }).then((createdHoldings) => {
                      const itemData = {
                        holdingsRecordId: createdHoldings.id,
                        materialType: { id: materialTypeIds[holding.affiliation] },
                        permanentLoanType: { id: loanTypeIds[holding.affiliation] },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      };
                      if (holding.itemLocationIndex !== null) {
                        itemData.permanentLocation = {
                          id: locations[holding.affiliation][holding.itemLocationIndex].id,
                        };
                      }
                      InventoryItems.createItemViaApi(itemData);
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
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken(false);
          Users.deleteViaApi(user.userId);
          Orders.deleteOrderViaApi(order.id);

          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.setTenant(Affiliations.University);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.resetTenant();
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        });

        it(
          'C423639 Locations from all existing tenants displays in "Holdings permanent location" facet of "Select instance" plug-in opened from "Central" tenant (consortia) (promin)',
          { tags: ['extendedPathECS', 'promin', 'C423639'] },
          () => {
            const usedLocations = [
              locations[Affiliations.College][0].name,
              locations[Affiliations.College][1].name,
              locations[Affiliations.University][0].name,
              locations[Affiliations.University][1].name,
            ];

            function verifyLocationFacetOptions() {
              SelectInstanceModal.searchByName(instancePrefix);
              InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
              instanceTitles.forEach((title) => {
                InventorySearchAndFilter.verifySearchResult(title);
              });
              usedLocations.forEach((locationName) => {
                SelectInstanceModal.verifyOptionAvailableMultiselect(
                  locationAccordionName,
                  locationName,
                );
              });

              SelectInstanceModal.selectEcsLocationFilterOption(
                locationAccordionName,
                locations[Affiliations.University][1].name,
                tenantNames.university,
              );
              InventorySearchAndFilter.verifyNumberOfSearchResults(1);
              InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
            }

            // Steps 1-2: open the "Select instance" plug-in from a PO line's Title look-up
            Orders.selectOrderByPONumber(order.poNumber);
            OrderDetails.selectAddPOLine();
            OrderLineEditForm.clickTitleLookUpButton();

            // Step 3: Holdings tab, facet collapsed by default
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();

            // Step 4: expand the facet - shows Locations
            InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
            SelectInstanceModal.checkOptionsWithCountersExistInAccordion(locationAccordionName);

            // Step 5: typing any valid Member-tenant location name shows it under the input
            SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              locationAccordionName,
              locations[Affiliations.College][0].name,
              locations[Affiliations.College][0].name,
            );
            SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              locationAccordionName,
              '',
              '',
            );

            // Steps 6-8: search, verify facet options from all tenants, select one, verify result
            verifyLocationFacetOptions();

            // Step 9: switch to Item tab - search box/results cleared, facet collapsed
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();

            // Steps 10-13: same facet verification on the Item tab
            InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
            SelectInstanceModal.checkOptionsWithCountersExistInAccordion(locationAccordionName);

            verifyLocationFacetOptions();
          },
        );
      });
    });
  });
});
