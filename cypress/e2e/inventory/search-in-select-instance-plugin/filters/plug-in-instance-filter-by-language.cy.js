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
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476779_FolioInstance_${randomPostfix}`;
      const languageAccordionName = 'Language';
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C476779_Org_${randomPostfix}`;
      const languages = [
        { code: 'eng', name: 'English' },
        { code: 'ita', name: 'Italian' },
        { code: 'ger', name: 'German' },
        { code: 'fre', name: 'French' },
        { code: 'spa', name: 'Spanish; Castilian' },
        { code: 'rus', name: 'Russian' },
        { code: 'chi', name: 'Chinese' },
        { code: 'jpn', name: 'Japanese' },
        { code: 'ara', name: 'Arabic' },
        { code: 'hin', name: 'Hindi' },
        { code: 'lat', name: 'Latin' },
      ];
      const instanceTitles = Array.from(
        { length: languages.length },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      let instanceTypeId;
      let order;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C476779');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
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
            languages.forEach((lang, index) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceTitles[index],
                  languages: [lang.code],
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
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
      });

      it(
        'C476779 "Select Instance" plugin | Filter "Instance" records by "Language" facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476779'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(languageAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(languageAccordionName);

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          languages.forEach((lang) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(languageAccordionName, lang.name);
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            languageAccordionName,
            languages.length,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            languageAccordionName,
            languages[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            languageAccordionName,
            languages[0].name,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            languageAccordionName,
            languages[0].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            languageAccordionName,
            languages[1].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            languageAccordionName,
            languages[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            languageAccordionName,
            languages[1].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            languageAccordionName,
            languages[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            languageAccordionName,
            languages[0].name,
            false,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            languageAccordionName,
            languages[1].name,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            languageAccordionName,
            languages[1].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          InventorySearchAndFilter.clearFilter(languageAccordionName);
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            languageAccordionName,
            0,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
            languageAccordionName,
            languages[2].name,
          );
          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            languageAccordionName,
            languages[4].name.split('; ')[1],
            languages[4].name,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            languageAccordionName,
            languages[4].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[4]);
        },
      );
    });
  });
});
