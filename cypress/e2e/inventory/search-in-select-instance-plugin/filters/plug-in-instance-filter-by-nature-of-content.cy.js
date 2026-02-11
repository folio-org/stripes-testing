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
import NatureOfContent from '../../../../support/fragments/settings/inventory/instances/natureOfContent';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const numberOfRecords = 11;
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476810_FolioInstance_${randomPostfix}`;
      const natureOfContentPrefix = `AT_C476810_natureOfContent_${randomPostfix}`;
      const natureOfContentAccordionName = 'Nature of content';
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C476810_Org_${randomPostfix}`;
      const instanceTitles = Array.from(
        { length: numberOfRecords },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      const customNaturesOfContent = [];
      let instanceTypeId;
      let order;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C476810');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          NatureOfContent.getViaApi({ limit: 300 }).then(({ natureOfContentTerms }) => {
            natureOfContentTerms.forEach((nature) => {
              if (nature.name.includes('C476810')) {
                NatureOfContent.deleteViaApi(nature.id);
              }
            });
          });
        })
          .then(() => {
            for (let i = 0; i < numberOfRecords; i++) {
              NatureOfContent.createViaApi({
                name: `${natureOfContentPrefix}_${i}`,
                source: 'local',
              }).then(({ body }) => {
                customNaturesOfContent.push(body);
              });
            }

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
            customNaturesOfContent.forEach((nature, index) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceTitles[index],
                  natureOfContentTermIds: [nature.id],
                },
              });
            });
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
              });
              Orders.selectOrderByPONumber(order.poNumber);
              OrderDetails.selectAddPOLine();
              OrderLineEditForm.clickTitleLookUpButton();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
        customNaturesOfContent.forEach((nature) => {
          NatureOfContent.deleteViaApi(nature.id);
        });
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
      });

      it(
        'C476810 "Select Instance" plugin | Filter "Instance" records by "Nature of content" filter/facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476810'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(natureOfContentAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(
            natureOfContentAccordionName,
          );

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          customNaturesOfContent.forEach((mode) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              natureOfContentAccordionName,
              mode.name,
            );
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            natureOfContentAccordionName,
            customNaturesOfContent.length,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            natureOfContentAccordionName,
            customNaturesOfContent[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            natureOfContentAccordionName,
            customNaturesOfContent[0].name,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            natureOfContentAccordionName,
            customNaturesOfContent[0].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            natureOfContentAccordionName,
            customNaturesOfContent[1].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            natureOfContentAccordionName,
            customNaturesOfContent[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            natureOfContentAccordionName,
            customNaturesOfContent[1].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            natureOfContentAccordionName,
            customNaturesOfContent[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            natureOfContentAccordionName,
            customNaturesOfContent[0].name,
            false,
          );
          SelectInstanceModal.selectMultiSelectFilterOption(
            natureOfContentAccordionName,
            customNaturesOfContent[1].name,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            natureOfContentAccordionName,
            customNaturesOfContent[1].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          InventorySearchAndFilter.clearFilter(natureOfContentAccordionName);
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            natureOfContentAccordionName,
            0,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            natureOfContentAccordionName,
            customNaturesOfContent[2].name.slice(1),
            customNaturesOfContent[2].name,
          );
          SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
            natureOfContentAccordionName,
            customNaturesOfContent[3].name,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            natureOfContentAccordionName,
            customNaturesOfContent[3].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[3]);
        },
      );
    });
  });
});
