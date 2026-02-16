import uuid from 'uuid';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
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
      const randomLetters = getRandomLetters(7);
      const instanceTitlePrefix = `AT_C476830_FolioInstance_${randomPostfix}`;
      const tagsAccordionName = 'Tags';
      const tagPrefix = `at_c476830_tag_${randomLetters}`;
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C476830_Org_${randomPostfix}`;
      const instanceTitles = Array.from(
        { length: numberOfRecords },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );
      const tagValues = Array.from({ length: numberOfRecords }, (_, i) => `${tagPrefix}_${i}`);

      let instanceTypeId;
      let order;
      let user;
      const createdTagIds = [];
      let locationId;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C476830');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((types) => {
            instanceTypeId = types[0].id;
          });
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((loc) => {
            locationId = loc.id;
          });
          for (let i = 0; i < numberOfRecords; i++) {
            cy.createTagApi({
              id: uuid(),
              description: tagValues[i],
              label: tagValues[i],
            }).then((tagId) => {
              createdTagIds.push(tagId);
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
                    tags: { tagList: [tagValues[i]] },
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
              });
              Orders.selectOrderByPONumber(order.poNumber);
              OrderDetails.selectAddPOLine();
              OrderLineEditForm.clickTitleLookUpButton();
              InventorySearchAndFilter.switchToHoldings();
              InventorySearchAndFilter.holdingsTabIsDefault();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
        createdTagIds.forEach((tagId) => {
          cy.deleteTagApi(tagId, true);
        });
      });

      it(
        'C476830 "Select Instance" plugin | Filter "Instance" records by "Tags" filter in "Holdings" segment (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476830'] },
        () => {
          InventorySearchAndFilter.verifyAccordionExistance(tagsAccordionName, true);
          InventorySearchAndFilter.toggleAccordionByName(tagsAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(tagsAccordionName);

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          tagValues.forEach((tagValue) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(tagsAccordionName, tagValue);
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            tagsAccordionName,
            tagValues.length,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(tagsAccordionName, tagValues[0]);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            tagsAccordionName,
            tagValues[0],
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            tagsAccordionName,
            tagValues[0],
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

          SelectInstanceModal.selectMultiSelectFilterOption(tagsAccordionName, tagValues[1]);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            tagsAccordionName,
            tagValues[0],
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            tagsAccordionName,
            tagValues[1],
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          SelectInstanceModal.selectMultiSelectFilterOption(tagsAccordionName, tagValues[0]);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            tagsAccordionName,
            tagValues[0],
            false,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            tagsAccordionName,
            tagValues[1],
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          InventorySearchAndFilter.clearFilter(tagsAccordionName);
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            tagsAccordionName,
            0,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
            tagsAccordionName,
            tagValues[3],
          );

          SelectInstanceModal.selectMultiSelectFilterOption(tagsAccordionName, tagValues[3]);
          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            tagsAccordionName,
            '',
            '',
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[3]);
        },
      );
    });
  });
});
