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
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { INVENTORY_008_FIELD_DTST_DROPDOWN } from '../../../../support/constants';
import ArrayUtils from '../../../../support/utils/arrays';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C553060_MarcBibInstance_${randomPostfix}`;
      const dateRangeAccordionName = 'Date range';
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C553060_Org_${randomPostfix}`;
      const date1ValuesOriginal = [
        '0000',
        '\\\\\\1',
        '___2',
        'd\\#3',
        '!()4',
        'uuu5',
        'abc6',
        '0007',
        'ddd9',
        '0037',
        'dd99',
        '0337',
        '\\677',
        'u678',
        'c679',
        'd999',
        '1\\\\\\',
        '1uu1',
        '1ab2',
        '1\\77',
        '1u78',
        '1d79',
        '16\\\\',
        '16u1',
        '16a2',
        '167\\',
        '1678',
        '168u',
        '169b',
        '9999',
      ];
      const date1ValuesDisplayed = date1ValuesOriginal.map((date) => date.replace(/\\/g, ' '));
      const instanceTitles = Array.from(
        { length: date1ValuesOriginal.length },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );
      const getExpectedDates = (from, to) => date1ValuesDisplayed.filter((date) => {
        const dateInt = parseInt(date.replace(/[^\d]/g, '0'), 10);
        const fromInt = parseInt(from, 10);
        const toInt = parseInt(to, 10);
        if (!Number.isNaN(fromInt) && !Number.isNaN(toInt)) return dateInt >= fromInt && dateInt <= toInt;
        else if (!Number.isNaN(fromInt)) return dateInt >= fromInt;
        else return dateInt <= toInt;
      });
      const searchData = [
        { from: '0000', to: '9999' },
        { from: '0035', to: '1078' },
        { from: '1670', to: '1670' },
        { from: '1670', to: '' },
        { from: '', to: '1670' },
      ];

      let order;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C553060');
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
            date1ValuesOriginal.forEach((date1, index) => {
              const dtst = ArrayUtils.getRandomElement(
                Object.values(INVENTORY_008_FIELD_DTST_DROPDOWN),
              )[0];
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
                {
                  tag: '008',
                  content: {
                    ...QuickMarcEditor.valid008ValuesInstance,
                    Date1: date1,
                    DtSt: dtst,
                  },
                },
                {
                  tag: '245',
                  content: `$a ${instanceTitles[index]}`,
                  indicators: ['1', '1'],
                },
              ]);
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
              InventorySearchAndFilter.instanceTabIsDefault();
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
        'C553060 "Select Instance" plugin | Verify that "Date range" filter is working on computed field from "Date 1" field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C553060'] },
        () => {
          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          searchData.forEach((search) => {
            InventorySearchAndFilter.filterByDateRange(search.from, search.to);
            const expectedDates = getExpectedDates(search.from, search.to);
            expectedDates.forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(expectedDates.length);
            InventorySearchAndFilter.toggleAccordionByName(dateRangeAccordionName, false);
          });
        },
      );
    });
  });
});
