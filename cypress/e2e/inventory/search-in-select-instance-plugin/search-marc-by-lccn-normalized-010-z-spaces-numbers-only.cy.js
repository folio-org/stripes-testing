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
    const randomDigits = `442822${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };
    const randomPostfix = getRandomPostfix();
    const subfieldAValue = 'C442822auto';
    const lccnOption = 'LCCN, normalized';

    // LCCN test data with various spacing patterns in 010 $z subfield (invalid LCCN)
    // Based on TestRail expected results - 9 records with "sh" prefix + 1 record with digits only
    const lccnTestData = [
      {
        title: `AT_C442822_MarcBibInstance 1 ${randomPostfix}`,
        lccn: `  sh  ${randomDigits} `,
      },
      {
        title: `AT_C442822_MarcBibInstance 2 ${randomPostfix}`,
        lccn: `sh ${randomDigits}`,
      },
      {
        title: `AT_C442822_MarcBibInstance 3 ${randomPostfix}`,
        lccn: `sh  ${randomDigits}`,
      },
      {
        title: `AT_C442822_MarcBibInstance 4 ${randomPostfix}`,
        lccn: `sh${randomDigits} `,
      },
      {
        title: `AT_C442822_MarcBibInstance 5 ${randomPostfix}`,
        lccn: `sh${randomDigits}  `,
      },
      {
        title: `AT_C442822_MarcBibInstance 6 ${randomPostfix}`,
        lccn: ` sh${randomDigits}`,
      },
      {
        title: `AT_C442822_MarcBibInstance 7 ${randomPostfix}`,
        lccn: `  sh${randomDigits}`,
      },
      {
        title: `AT_C442822_MarcBibInstance 8 ${randomPostfix}`,
        lccn: `  sh  ${randomDigits}  `,
      },
      {
        title: `AT_C442822_MarcBibInstance 9 ${randomPostfix}`,
        lccn: `sh${randomDigits}`,
      },
      {
        title: `AT_C442822_MarcBibInstance 10 ${randomPostfix}`,
        lccn: `${randomDigits}`,
      },
    ];

    const allTitles = lccnTestData.map((record) => record.title);
    const digitsOnlyTitle = [lccnTestData[9].title]; // Only the last record (digits only)
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
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C442822');

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
      'C442822 "Select instance" plug-in | Search for "MARC bibliographic" by "LCCN, normalized" option using a query without prefix (numbers only) when "LCCN" (010 $z) has (leading, internal, trailing) spaces (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C442822'] },
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

        // Step 1: Run search with query without letters (numbers only, based on "010 $z")
        cy.log('Step 1: Run search with query without letters (numbers only, based on "010 $z")');
        SelectInstanceModal.chooseSearchOption(lccnOption);
        SelectInstanceModal.searchByName(randomDigits);

        // Verify only 1 record found (digits only)
        digitsOnlyTitle.forEach((title) => {
          InventorySearchAndFilter.verifySearchResult(title);
        });
        InventorySearchAndFilter.checkRowsCount(1);

        // Step 2: Run search with query without letters (using asterisk)
        cy.log('Step 2: Run search with query without letters (using asterisk)');
        SelectInstanceModal.clickResetAllButton();
        SelectInstanceModal.checkDefaultSearchOptionSelected();
        SelectInstanceModal.checkTableContent();

        SelectInstanceModal.chooseSearchOption(lccnOption);
        SelectInstanceModal.searchByName(`*${randomDigits}`);

        // Verify all records are found (wildcard search)
        allTitles.forEach((title) => {
          InventorySearchAndFilter.verifySearchResult(title);
        });
      },
    );
  });
});
