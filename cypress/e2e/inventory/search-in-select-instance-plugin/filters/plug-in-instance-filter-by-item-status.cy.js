import { ITEM_STATUS_NAMES } from '../../../../support/constants';
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
      const numberOfRecords = 8;
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476831_Instance_${randomPostfix}`;
      const itemStatusAccordionName = 'Item status';
      const organization = NewOrganization.getDefaultOrganization();
      const instanceTitles = Array.from(
        { length: numberOfRecords },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );
      const itemStatusNames = Object.values(ITEM_STATUS_NAMES).slice(0, numberOfRecords);

      let instanceTypeId;
      let materialTypeId;
      let locationId;
      let order;
      let loanTypeId;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C476831');
        })
          .then(() => {
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            });
            cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((loc) => {
              locationId = loc.id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
              loanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
              materialTypeId = matType.id;
            });

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
            for (let i = 0; i < numberOfRecords; i++) {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceTitles[i],
                },
                holdings: [
                  {
                    permanentLocationId: locationId,
                  },
                ],
                items: [
                  {
                    status: { name: itemStatusNames[i] },
                    permanentLoanType: { id: loanTypeId },
                    materialType: { id: materialTypeId },
                  },
                ],
              });
            }
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
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.itemTabIsDefault();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
      });

      it(
        'C476831 "Select Instance" plugin | Filter "Instance" records by Item status in "Item" segment (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476831'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(itemStatusAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(itemStatusAccordionName);

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          itemStatusNames.forEach((statusName) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              itemStatusAccordionName,
              statusName,
            );
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            itemStatusAccordionName,
            itemStatusNames.length,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            itemStatusAccordionName,
            itemStatusNames[0],
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            itemStatusAccordionName,
            itemStatusNames[0],
            1,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            itemStatusAccordionName,
            itemStatusNames[1],
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            itemStatusAccordionName,
            itemStatusNames[0],
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            itemStatusAccordionName,
            itemStatusNames[1],
          );
          InventorySearchAndFilter.checkRowsCount(2);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            itemStatusAccordionName,
            itemStatusNames[0],
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            itemStatusAccordionName,
            itemStatusNames[0],
            false,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            itemStatusAccordionName,
            itemStatusNames[1],
            1,
          );

          InventorySearchAndFilter.clearFilter(itemStatusAccordionName);
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            itemStatusAccordionName,
            0,
          );
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            itemStatusAccordionName,
            itemStatusNames.length,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            itemStatusAccordionName,
            itemStatusNames[2].slice(1),
            itemStatusNames[2],
          );
        },
      );
    });
  });
});
