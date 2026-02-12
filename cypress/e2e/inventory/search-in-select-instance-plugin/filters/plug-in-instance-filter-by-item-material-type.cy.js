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
import MaterialTypes from '../../../../support/fragments/settings/inventory/materialTypes';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const numberOfRecords = 11;
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476832_Instance_${randomPostfix}`;
      const materialTypePrefix = `AT_C476832_MaterialType_${randomPostfix}`;
      const materialTypeAccordionName = 'Material type';
      const organization = NewOrganization.getDefaultOrganization();
      const instanceTitles = Array.from(
        { length: numberOfRecords },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      let instanceTypeId;
      const materialTypes = [];
      let locationId;
      let order;
      let loanTypeId;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C476832');
        })
          .then(() => {
            MaterialTypes.getMaterialTypesViaApi({ limit: 200 }).then((body) => {
              body.mtypes.forEach((type) => {
                if (type.name.includes('C476832')) {
                  MaterialTypes.deleteViaApi(type.id);
                }
              });
            });
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

            for (let i = 0; i < numberOfRecords; i++) {
              MaterialTypes.createMaterialTypeViaApi({
                name: `${materialTypePrefix}_${i}`,
                source: 'local',
              }).then(({ body }) => {
                materialTypes.push(body);
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
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: loanTypeId },
                    materialType: { id: materialTypes[i].id },
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
        materialTypes.forEach((type) => {
          MaterialTypes.deleteViaApi(type.id);
        });
      });

      it(
        'C476832 "Select Instance" plugin | Filter "Instance" records by "Material type" facet on "Item" tab (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476832'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(materialTypeAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(materialTypeAccordionName);

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          materialTypes.forEach((materialType) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              materialTypeAccordionName,
              materialType.name,
            );
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            materialTypeAccordionName,
            materialTypes.length,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            materialTypeAccordionName,
            materialTypes[0].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            materialTypeAccordionName,
            materialTypes[0].name,
            1,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            materialTypeAccordionName,
            materialTypes[1].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            materialTypeAccordionName,
            materialTypes[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            materialTypeAccordionName,
            materialTypes[1].name,
          );
          InventorySearchAndFilter.checkRowsCount(2);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            materialTypeAccordionName,
            materialTypes[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            materialTypeAccordionName,
            materialTypes[0].name,
            false,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            materialTypeAccordionName,
            materialTypes[1].name,
            1,
          );

          InventorySearchAndFilter.clearFilter(materialTypeAccordionName);
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            materialTypeAccordionName,
            0,
          );
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            materialTypeAccordionName,
            materialTypes.length,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            materialTypeAccordionName,
            materialTypes[2].name.slice(1),
            materialTypes[2].name,
          );

          SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
            materialTypeAccordionName,
            materialTypes[3].name,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            materialTypeAccordionName,
            materialTypes[3].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[3]);
        },
      );
    });
  });
});
