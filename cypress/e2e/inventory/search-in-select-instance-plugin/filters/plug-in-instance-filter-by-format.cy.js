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
import Formats from '../../../../support/fragments/settings/inventory/instances/formats';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const numberOfRecords = 11;
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const instanceTitlePrefix = `AT_C476808_FolioInstance_${randomPostfix}`;
      const formatPrefix = `AT_C476808_format_${randomPostfix}`;
      const formatCodePrefix = `C476808format${randomLetters}`;
      const formatAccordionName = 'Format';
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C476808_Org_${randomPostfix}`;
      const instanceTitles = Array.from(
        { length: numberOfRecords },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      const formats = [];
      const customFormats = [];
      let instanceTypeId;
      let order;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C476808');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          Formats.getViaApi({ limit: 200 }).then((allFormats) => {
            allFormats.forEach((format) => {
              if (format.name.includes('C476808')) {
                Formats.deleteViaApi(format.id);
              }
            });
          });
        })
          .then(() => {
            Formats.getViaApi({ limit: numberOfRecords - 2, query: 'source=rdacarrier' }).then(
              (allFormats) => {
                formats.push(...allFormats);

                for (let i = 0; i < 2; i++) {
                  Formats.createViaApi({
                    code: `${formatCodePrefix}_${i}`,
                    name: `${formatPrefix}_${i}`,
                    source: 'local',
                  }).then(({ body }) => {
                    formats.push(body);
                    customFormats.push(body);
                  });
                }
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
            formats.forEach((format, index) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceTitles[index],
                  instanceFormatIds: [format.id],
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
        customFormats.forEach((format) => {
          Formats.deleteViaApi(format.id);
        });
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
      });

      it(
        'C476808 "Select Instance" plugin | Filter "Instance" records by "Format" filter/facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476808'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(formatAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(formatAccordionName);

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          formats.forEach((format) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(formatAccordionName, format.name);
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            formatAccordionName,
            formats.length,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(formatAccordionName, formats[0].name);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            formatAccordionName,
            formats[0].name,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            formatAccordionName,
            formats[0].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

          SelectInstanceModal.selectMultiSelectFilterOption(formatAccordionName, formats[1].name);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            formatAccordionName,
            formats[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            formatAccordionName,
            formats[1].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          SelectInstanceModal.selectMultiSelectFilterOption(formatAccordionName, formats[0].name);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            formatAccordionName,
            formats[0].name,
            false,
          );
          SelectInstanceModal.selectMultiSelectFilterOption(formatAccordionName, formats[1].name);
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            formatAccordionName,
            formats[1].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          InventorySearchAndFilter.clearFilter(formatAccordionName);
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            formatAccordionName,
            0,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            formatAccordionName,
            customFormats[0].name.slice(1),
            customFormats[0].name,
          );
          SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
            formatAccordionName,
            customFormats[1].name,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            formatAccordionName,
            customFormats[1].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles.at(-1));
        },
      );
    });
  });
});
