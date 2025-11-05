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
    const randomDigits = `442824${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };
    const randomPostfix = getRandomPostfix();
    const subfieldAValue = 'C442824auto';
    const lccnOption = 'LCCN, normalized';

    // LCCN test data with various spacing patterns in 010 $z subfield (invalid LCCN)
    // Both upper and lower case prefix variations
    const lccnTestData = [
      // Upper case prefix records
      {
        title: `AT_C442824_MarcBibInstance 1 ${randomPostfix}`,
        lccn: `N ${randomDigits}`,
      },
      {
        title: `AT_C442824_MarcBibInstance 2 ${randomPostfix}`,
        lccn: `N  ${randomDigits}`,
      },
      {
        title: `AT_C442824_MarcBibInstance 3 ${randomPostfix}`,
        lccn: ` N${randomDigits}`,
      },
      {
        title: `AT_C442824_MarcBibInstance 4 ${randomPostfix}`,
        lccn: `  N${randomDigits}`,
      },
      {
        title: `AT_C442824_MarcBibInstance 5 ${randomPostfix}`,
        lccn: `  N  ${randomDigits}  `,
      },
      {
        title: `AT_C442824_MarcBibInstance 6 ${randomPostfix}`,
        lccn: `N${randomDigits}`,
      },
      // Lower case prefix records
      {
        title: `AT_C442824_MarcBibInstance 7 ${randomPostfix}`,
        lccn: `n ${randomDigits}`,
      },
      {
        title: `AT_C442824_MarcBibInstance 8 ${randomPostfix}`,
        lccn: `n  ${randomDigits}`,
      },
      {
        title: `AT_C442824_MarcBibInstance 9 ${randomPostfix}`,
        lccn: ` n${randomDigits}`,
      },
      {
        title: `AT_C442824_MarcBibInstance 10 ${randomPostfix}`,
        lccn: `  n${randomDigits}`,
      },
      {
        title: `AT_C442824_MarcBibInstance 11 ${randomPostfix}`,
        lccn: `  n  ${randomDigits}  `,
      },
      {
        title: `AT_C442824_MarcBibInstance 12 ${randomPostfix}`,
        lccn: `n${randomDigits}`,
      },
    ];

    // Test queries with different spacing and case variations (based on TestRail steps)
    const searchQueries = [
      { query: `n${randomDigits}`, description: 'lower case prefix without spaces' },
      { query: `N${randomDigits}`, description: 'upper case prefix without spaces' },
      { query: `n ${randomDigits}`, description: 'one space internal and lower case prefix' },
      { query: `N ${randomDigits}`, description: 'one space internal and upper case prefix' },
      {
        query: `  n  ${randomDigits}  `,
        description: 'two spaces everywhere and lower case prefix',
      },
      {
        query: `  N  ${randomDigits}  `,
        description: 'two spaces everywhere and upper case prefix',
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
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C442824');

        cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiOrdersCreate.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            // Create MARC instances programmatically with LCCN in 010 $z subfield
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
                  content: `$a ${subfieldAValue} $z ${instanceData.lccn}`,
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
      'C442824 "Select instance" plug-in | Search for "MARC bibliographic" by "LCCN, normalized" option using a query with lower, UPPER case when "LCCN" (010 $z) has (leading, internal, trailing) spaces (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C442824'] },
      () => {
        // Navigate to Orders and open the Select Instance plugin
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });

        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.clickTitleLookUpButton();

        // Ensure Instance tab is selected and wait for content to load
        InventorySearchAndFilter.instanceTabIsDefault();

        searchQueries.forEach((searchData, index) => {
          cy.log(
            `Step ${index + 1}: Run search with query with ${searchData.description} (based on "010 $z")`,
          );

          // Reset search form if not the first iteration
          if (index > 0) {
            SelectInstanceModal.clickResetAllButton();
            SelectInstanceModal.checkDefaultSearchOptionSelected();
            SelectInstanceModal.checkTableContent();
          }

          // Select LCCN normalized option and perform search
          SelectInstanceModal.chooseSearchOption(lccnOption);
          SelectInstanceModal.searchByName(searchData.query);

          // Verify all records are found (case insensitive search should find all 12 records)
          expectedTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.checkRowsCount(12);
        });
      },
    );
  });
});
