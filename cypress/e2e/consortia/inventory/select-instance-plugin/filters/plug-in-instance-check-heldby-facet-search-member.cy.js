import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
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
        const instancePrefix = `AT_C402360_Instance_${randomPostfix}`;
        const heldbyAccordionName = 'Held by';
        const sourceAccordionName = 'Source';
        const organization = NewOrganization.getDefaultOrganization();
        organization.name = `AT_C402360_Org_${randomPostfix}`;
        const instancesData = [
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.College, Affiliations.University],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.University],
          },
          {
            affiliation: Affiliations.College,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.University,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.University],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.College, Affiliations.University],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.University],
          },
          {
            affiliation: Affiliations.College,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.University,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.University],
          },
        ];
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const instanceIndexesHelbyCollege = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .filter(({ item }) => item.holdingsAffiliations.includes(Affiliations.College))
          .map(({ index }) => index);
        const instanceIndexesHelbyUniversity = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .filter(({ item }) => item.holdingsAffiliations.includes(Affiliations.University))
          .map(({ index }) => index);
        const folioInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .filter(({ item }) => item.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO)
          .map(({ index }) => index);
        let user;
        const locations = {
          [Affiliations.College]: null,
          [Affiliations.University]: null,
        };
        let holdingsSourceId;
        let order;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.setTenant(Affiliations.College);
          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiOrdersCreate.gui,
          ])
            .then((userProperties) => {
              user = userProperties;
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402360');

              Organizations.createOrganizationViaApi(organization).then(() => {
                const orderData = NewOrder.getDefaultOngoingOrder({
                  vendorId: organization.id,
                });
                Orders.createOrderViaApi(orderData).then((createdOrder) => {
                  order = createdOrder;
                });
              });

              cy.setTenant(Affiliations.University);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402360');

              cy.resetTenant();
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402360');
            })
            .then(() => {
              cy.resetTenant();
              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  instancesData.forEach((instanceData, index) => {
                    cy.setTenant(instanceData.affiliation);
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
                  });
                });
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(user.username, user.password, {
                path: TopMenu.ordersPath,
                waiter: Orders.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
          Organizations.deleteOrganizationViaApi(organization.id);
          Orders.deleteOrderViaApi(order.id);

          cy.setTenant(Affiliations.University);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.resetTenant();
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        });

        it(
          'C402360 "Select instance" plugin | "Orders" app: Use "Held by" facet in "Member" tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C402360'] },
          () => {
            Orders.selectOrderByPONumber(order.poNumber);
            OrderDetails.selectAddPOLine();
            OrderLineEditForm.clickTitleLookUpButton();
            InventorySearchAndFilter.verifyAccordionExistance(heldbyAccordionName);
            InventorySearchAndFilter.instanceTabIsDefault();

            InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
            SelectInstanceModal.checkOptionsWithCountersExistInAccordion(heldbyAccordionName);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );

            SelectInstanceModal.searchByName(instancePrefix);
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyCollege.length,
            );
            instanceIndexesHelbyCollege.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );

            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.college,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
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

            InventorySearchAndFilter.toggleAccordionByName(sourceAccordionName);
            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
            );
            [0, 2].forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(2);

            InventorySearchAndFilter.clearFilter(heldbyAccordionName);
            InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
              heldbyAccordionName,
              0,
            );
            folioInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(folioInstanceIndexes.length);

            cy.wait(1000);
            SelectInstanceModal.clickResetAllButton();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
              heldbyAccordionName,
              1,
            );

            SelectInstanceModal.searchByName(instancePrefix);
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyCollege.length,
            );
            instanceIndexesHelbyCollege.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );

            SelectInstanceModal.searchByName(instanceTitles[0]);
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            SelectInstanceModal.searchByName(instanceTitles[2]);
            SelectInstanceModal.checkNoRecordsFound(instanceTitles[2]);
            InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
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
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[2]);

            cy.wait(1000);
            SelectInstanceModal.clickResetAllButton();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
              heldbyAccordionName,
              1,
            );

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            SelectInstanceModal.searchByName(instancePrefix);
            instanceIndexesHelbyCollege.forEach((index) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[index]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyCollege.length,
            );
            InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );

            cy.wait(1000);
            SelectInstanceModal.clickResetAllButton();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
              heldbyAccordionName,
              1,
            );
          },
        );
      });
    });
  });
});
