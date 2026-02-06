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

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const numberOfRecords = 11;
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476809_FolioInstance_${randomPostfix}`;
      const modeOfIssuancePrefix = `AT_C476809_modeOfIssuance_${randomPostfix}`;
      const modeOfIssuanceAccordionName = 'Mode of issuance';
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C476809_Org_${randomPostfix}`;
      const instanceTitles = Array.from(
        { length: numberOfRecords },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      const customModesOfIssuance = [];
      let instanceTypeId;
      let order;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C476809');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getAllModesOfIssuance({ limit: 200 }).then((modes) => {
            modes.forEach((mode) => {
              if (mode.name.includes('C476809')) {
                cy.deleteModesOfIssuans(mode.id);
              }
            });
          });
        })
          .then(() => {
            for (let i = 0; i < numberOfRecords; i++) {
              cy.createModesOfIssuans({
                name: `${modeOfIssuancePrefix}_${i}`,
                source: 'local',
              }).then((mode) => {
                customModesOfIssuance.push(mode);
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
            customModesOfIssuance.forEach((mode, index) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceTitles[index],
                  modeOfIssuanceId: mode.id,
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
                authRefresh: true,
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
        customModesOfIssuance.forEach((mode) => {
          cy.deleteModesOfIssuans(mode.id);
        });
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
      });

      it(
        'C476809 "Select Instance" plugin | Filter "Instance" records by "Mode of issuance" filter/facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476809'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(modeOfIssuanceAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(modeOfIssuanceAccordionName);

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          customModesOfIssuance.forEach((mode) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              modeOfIssuanceAccordionName,
              mode.name,
            );
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            modeOfIssuanceAccordionName,
            customModesOfIssuance.length,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[0].name,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[0].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[1].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[1].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[0].name,
            false,
          );
          SelectInstanceModal.selectMultiSelectFilterOption(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[1].name,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[1].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          InventorySearchAndFilter.clearFilter(modeOfIssuanceAccordionName);
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            modeOfIssuanceAccordionName,
            0,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[2].name.slice(1),
            customModesOfIssuance[2].name,
          );
          SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[3].name,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            modeOfIssuanceAccordionName,
            customModesOfIssuance[3].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[3]);
        },
      );
    });
  });
});
