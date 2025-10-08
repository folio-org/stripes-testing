import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const randomDigits = `442802${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };
    const randomPostfix = getRandomPostfix();
    const lccnOption = 'LCCN, normalized';
    // LCCN test data with various spacing patterns
    const lccnTestData = [
      {
        title: `AT_C442802_MarcBibInstance 1 ${randomPostfix}`,
        lccn: `n ${randomDigits}`,
      },
      {
        title: `AT_C442802_MarcBibInstance 2 ${randomPostfix}`,
        lccn: `n  ${randomDigits}`,
      },
      {
        title: `AT_C442802_MarcBibInstance 3 ${randomPostfix}`,
        lccn: ` n${randomDigits}`,
      },
      {
        title: `AT_C442802_MarcBibInstance 4 ${randomPostfix}`,
        lccn: `  n${randomDigits}`,
      },
      {
        title: `AT_C442802_MarcBibInstance 5 ${randomPostfix}`,
        lccn: `  n  ${randomDigits}  `,
      },
      {
        title: `AT_C442802_MarcBibInstance 6 ${randomPostfix}`,
        lccn: `n${randomDigits}`,
      },
      {
        title: `AT_C442802_MarcBibInstance 7 ${randomPostfix}`,
        lccn: `N ${randomDigits}`,
      },
      {
        title: `AT_C442802_MarcBibInstance 8  ${randomPostfix}`,
        lccn: `N  ${randomDigits}`,
      },
      {
        title: `AT_C442802_MarcBibInstance 9 ${randomPostfix}`,
        lccn: ` N${randomDigits}`,
      },
      {
        title: `AT_C442802_MarcBibInstance 10 ${randomPostfix}`,
        lccn: `  N${randomDigits}`,
      },
      {
        title: `AT_C442802_MarcBibInstance 11 ${randomPostfix}`,
        lccn: `  N  ${randomDigits}  `,
      },
      {
        title: `AT_C442802_MarcBibInstance 12 ${randomPostfix}`,
        lccn: `N${randomDigits}`,
      },
    ];

    // Test queries with different spacing and case variations
    const searchQueries = [
      { query: `n${randomDigits}`, description: 'lower case prefix without spaces' },
      { query: `N${randomDigits}`, description: 'upper case prefix without spaces' },
      { query: `n ${randomDigits}`, description: 'lower case prefix with one space internal' },
      { query: `N ${randomDigits}`, description: 'upper case prefix with one space internal' },
      {
        query: `  n  ${randomDigits}  `,
        description: 'lower case prefix with two spaces everywhere',
      },
      {
        query: `  N  ${randomDigits}  `,
        description: 'upper case prefix with two spaces everywhere',
      },
    ];

    const expectedTitles = lccnTestData.map((record) => record.title);
    const createdInstanceIds = [];

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({
            vendorId: testData.organization.id,
          });
          Orders.createOrderViaApi(testData.order).then((order) => {
            testData.order = order;
          });
        });

        // Delete any existing instances with the test prefix
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C442802');

        cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiOrdersCreate.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            // Create MARC instances programmatically
            lccnTestData.forEach((instanceData) => {
              const marcInstanceFields = [
                {
                  tag: '008',
                  content: QuickMarcEditor.defaultValid008Values,
                },
                {
                  tag: '245',
                  content: `$a ${instanceData.title}`,
                  indicators: ['1', '1'],
                },
                {
                  tag: '010',
                  content: `$a ${instanceData.lccn}`,
                  indicators: ['\\', '\\'],
                },
              ];

              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields,
              ).then((instanceId) => {
                createdInstanceIds.push(instanceId);
              });
            });
          },
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        createdInstanceIds.forEach((instanceId) => {
          InventoryInstance.deleteInstanceViaApi(instanceId);
        });
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Orders.deleteOrderViaApi(testData.order.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C442802 "Select instance" plug-in | Search for "MARC bibliographic" by "LCCN, normalized" option using a query with lower, UPPER case when "LCCN" (010 $a) has (leading, internal, trailing) spaces (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C442802'] },
      () => {
        // Navigate to Orders and open the Select Instance plugin
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
          authRefresh: true,
        });

        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.clickTitleLookUpButton();

        // Ensure Instance tab is selected and wait for content to load
        InventorySearchAndFilter.instanceTabIsDefault();

        searchQueries.forEach((searchData, index) => {
          cy.log(`Step ${index + 1}: Run search with query with ${searchData.description}`);
          // Reset search form if not the first iteration
          if (index > 0) {
            SelectInstanceModal.clickResetAllButton();
            SelectInstanceModal.checkDefaultSearchOptionSelected();
            SelectInstanceModal.checkTableContent();
            cy.ifConsortia(true, () => {
              InventorySearchAndFilter.toggleAccordionByName('Shared', false);
            });
          }
          // Select LCCN normalized option and perform search
          SelectInstanceModal.chooseSearchOption(lccnOption);
          SelectInstanceModal.searchByName(searchData.query);
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
          });

          // Verify all records are found
          expectedTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
        });
      },
    );
  });
});
