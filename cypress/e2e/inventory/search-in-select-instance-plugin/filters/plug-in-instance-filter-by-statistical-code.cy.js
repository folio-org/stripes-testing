import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { NewOrder, Orders } from '../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import OrderLineEditForm from '../../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../../support/fragments/orders/modals/selectInstanceModal';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const numberOfRecords = 11;
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476812_FolioInstance_${randomPostfix}`;
      const statisticalCodeAccordionName = 'Statistical code';
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C476812_Org_${randomPostfix}`;
      const instanceTitles = Array.from(
        { length: numberOfRecords },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      let instanceTypeId;
      let order;
      let user;
      let statisticalCodes;
      let statisticalCodeTypes;
      let statCodeForTypeAhead;
      const createdRecordIds = [];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C476812');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getStatisticalCodes({ limit: 11, query: 'source<>local' }).then((codes) => {
            statisticalCodes = codes;
          });
          cy.getStatisticalCodeTypes({ limit: 300, query: 'source=folio' }).then((codeTypes) => {
            statisticalCodeTypes = codeTypes;
          });
        })
          .then(() => {
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
            for (let i = 0; i < 11; i++) {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceTitles[i],
                  statisticalCodeIds: [statisticalCodes[i].id],
                },
              }).then((instance) => {
                createdRecordIds.push(instance.instanceId);
              });
            }
            statisticalCodes.forEach((code, index) => {
              statisticalCodes[index].uiOptionName =
                `${statisticalCodeTypes.filter((type) => type.id === code.statisticalCodeTypeId)[0].name}: ${code.code} - ${code.name}`;
            });

            const fullValue = statisticalCodes[0].uiOptionName;
            statCodeForTypeAhead = {
              notFullValue: fullValue.slice(3),
              fullValue,
            };
          })
          .then(() => {
            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiOrdersCreate.gui,
            ]).then((userProperties) => {
              user = userProperties;

              cy.login(user.username, user.password, {
                path: TopMenu.ordersPath,
                waiter: Orders.waitLoading,
                authRefresh: true,
              });
              Orders.selectOrderByPONumber(order.poNumber);
              OrderDetails.selectAddPOLine();
              OrderLineEditForm.clickTitleLookUpButton();
              InventorySearchAndFilter.instanceTabIsDefault();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdRecordIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
      });

      it(
        'C476812 "Select Instance" plugin | Filter "Instance" records by "Statistical code" filter/facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476812'] },
        () => {
          InventorySearchAndFilter.verifyAccordionExistance(statisticalCodeAccordionName, true);
          InventorySearchAndFilter.toggleAccordionByName(statisticalCodeAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(
            statisticalCodeAccordionName,
          );

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          statisticalCodes.forEach((code) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              statisticalCodeAccordionName,
              code.uiOptionName,
            );
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            statisticalCodeAccordionName,
            statisticalCodes.length,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            statisticalCodeAccordionName,
            statisticalCodes[0].uiOptionName,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            statisticalCodeAccordionName,
            statisticalCodes[0].uiOptionName,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            statisticalCodeAccordionName,
            statisticalCodes[0].uiOptionName,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            statisticalCodeAccordionName,
            statisticalCodes[1].uiOptionName,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            statisticalCodeAccordionName,
            statisticalCodes[0].uiOptionName,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            statisticalCodeAccordionName,
            statisticalCodes[1].uiOptionName,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            statisticalCodeAccordionName,
            statisticalCodes[0].uiOptionName,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            statisticalCodeAccordionName,
            statisticalCodes[0].uiOptionName,
            false,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            statisticalCodeAccordionName,
            statisticalCodes[1].uiOptionName,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          InventorySearchAndFilter.clearFilter(statisticalCodeAccordionName);
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            statisticalCodeAccordionName,
            0,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            statisticalCodeAccordionName,
            statCodeForTypeAhead.notFullValue,
            statCodeForTypeAhead.fullValue,
          );
          SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
            statisticalCodeAccordionName,
            statisticalCodes[2].uiOptionName,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            statisticalCodeAccordionName,
            statisticalCodes[2].uiOptionName,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[2]);
        },
      );
    });
  });
});
