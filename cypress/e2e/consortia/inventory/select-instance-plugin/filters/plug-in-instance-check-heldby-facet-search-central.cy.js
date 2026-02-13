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
import { NewOrder, Orders } from '../../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../../support/fragments/organizations';
import OrderLineEditForm from '../../../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../../../support/fragments/orders/modals/selectInstanceModal';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instancePrefix = `AT_C402358_Instance_${randomPostfix}`;
        const nonExistingTitle = `AT_C402358_NonExistingTitle_${randomPostfix}`;
        const heldbyAccordionName = 'Held by';
        const sharedAccordionName = 'Shared';
        const materialTypeAccordionName = 'Material type';
        const bookMaterialTypeName = 'book';
        const organization = NewOrganization.getDefaultOrganization();
        organization.name = `AT_C402358_Org_${randomPostfix}`;
        const instancesData = [
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.College, Affiliations.University],
            itemsAreBooks: true,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.College],
            itemsAreBooks: true,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.College, Affiliations.University],
            itemsAreBooks: true,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.University],
            itemsAreBooks: false,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.College],
            itemsAreBooks: false,
          },
        ];
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const instanceIndexesHelbyCollege = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.holdingsAffiliations.includes(Affiliations.College))
          .map(({ index }) => index);
        const instanceIndexesHelbyUniversity = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.holdingsAffiliations.includes(Affiliations.University))
          .map(({ index }) => index);
        let user;
        const locations = {
          [Affiliations.College]: null,
          [Affiliations.University]: null,
        };
        let holdingsSourceId;
        let loanTypeId;
        let materialTypeId;
        let bookMaterialTypeId;
        let order;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiOrdersCreate.gui,
          ])
            .then((userProperties) => {
              user = userProperties;

              cy.setTenant(Affiliations.College);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402358');

              cy.setTenant(Affiliations.University);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402358');

              cy.resetTenant();
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402358');
            })
            .then(() => {
              cy.resetTenant();
              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
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
                        {
                          tag: '008',
                          content: QuickMarcEditor.defaultValid008Values,
                        },
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
                },
              );
              Organizations.createOrganizationViaApi(organization).then(() => {
                const orderData = NewOrder.getDefaultOngoingOrder({
                  vendorId: organization.id,
                });
                Orders.createOrderViaApi(orderData).then((createdOrder) => {
                  order = createdOrder;
                });
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                locations[Affiliations.College] = res;
              });
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                holdingsSourceId = folioSource.id;
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
                loanTypeId = loanTypes[0].id;
              });
              cy.getAllMaterialTypes({ limit: 200, query: 'source=folio' }).then((mtypes) => {
                const bookTypeIndex = mtypes.findIndex(
                  (type) => type.name === bookMaterialTypeName,
                );
                materialTypeId = mtypes.filter((_, index) => index !== bookTypeIndex)[0].id;
                bookMaterialTypeId = mtypes[bookTypeIndex].id;
              });
              cy.setTenant(Affiliations.University);
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                locations[Affiliations.University] = res;
              });
            })
            .then(() => {
              instancesData.forEach((instanceData) => {
                instanceData.holdingsAffiliations.forEach((holdingsAffiliation) => {
                  cy.setTenant(holdingsAffiliation);
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instanceData.instanceId,
                    permanentLocationId: locations[holdingsAffiliation].id,
                    sourceId: holdingsSourceId,
                  }).then((holding) => {
                    InventoryItems.createItemViaApi({
                      holdingsRecordId: holding.id,
                      materialType: {
                        id: instanceData.itemsAreBooks ? bookMaterialTypeId : materialTypeId,
                      },
                      permanentLoanType: { id: loanTypeId },
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

          cy.setTenant(Affiliations.University);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.resetTenant();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
          Organizations.deleteOrganizationViaApi(organization.id);
          Orders.deleteOrderViaApi(order.id);
        });

        it(
          'C402358 "Select instance" plugin | Check the "Held by" facet for search from "Central" tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C402358'] },
          () => {
            Orders.selectOrderByPONumber(order.poNumber);
            OrderDetails.selectAddPOLine();
            OrderLineEditForm.clickTitleLookUpButton();
            InventorySearchAndFilter.verifyAccordionExistance(heldbyAccordionName);
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);
            InventorySearchAndFilter.instanceTabIsDefault();

            InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );

            SelectInstanceModal.searchByName(instancePrefix);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
            });
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );

            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.college,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            instanceIndexesHelbyCollege.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyCollege.length,
            );
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });

            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.college,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });

            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.university,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              true,
            );
            instanceIndexesHelbyUniversity.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyUniversity.length,
            );
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });

            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.college,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });

            SelectInstanceModal.searchByName(nonExistingTitle);
            InventorySearchAndFilter.verifyResultListExists(false);
            SelectInstanceModal.checkNoRecordsFound(nonExistingTitle);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              true,
            );

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();
            InventorySearchAndFilter.verifyAccordionExistance(heldbyAccordionName);
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);

            InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );

            SelectInstanceModal.searchByName(instancePrefix);
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });

            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.college,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            instanceIndexesHelbyCollege.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyCollege.length,
            );
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });

            InventorySearchAndFilter.clearFilter(heldbyAccordionName);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();
            InventorySearchAndFilter.verifyAccordionExistance(heldbyAccordionName);
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);

            SelectInstanceModal.searchByName(instancePrefix);
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });

            InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );

            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.university,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              true,
            );
            instanceIndexesHelbyUniversity.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyUniversity.length,
            );
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });

            InventorySearchAndFilter.toggleAccordionByName(materialTypeAccordionName);
            SelectInstanceModal.selectMultiSelectFilterOption(
              materialTypeAccordionName,
              bookMaterialTypeName,
            );
            [0, 2].forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(2);
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              true,
            );

            SelectInstanceModal.searchByName(instanceTitles[2]);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[2]);
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              true,
            );

            cy.wait(1000);
            SelectInstanceModal.clickResetAllButton();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();
            InventorySearchAndFilter.itemTabIsDefault();
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );
          },
        );
      });
    });
  });
});
