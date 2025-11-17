import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
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
    const randomDigits = `466167${randomFourDigitNumber()}`;
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
      classificationNumber: `hd${randomDigits}92 .I6 1961${randomDigits}`,
      instanceTitle: `AT_C466167_MarcBibInstance_${getRandomPostfix()}`,
    };
    const searchOption = searchInstancesOptions[4];
    const marcInstanceFields = [
      {
        tag: '008',
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: '245',
        content: `$a ${testData.instanceTitle}`,
        indicators: ['1', '1'],
      },
      {
        tag: '090',
        content: `$a ${testData.classificationNumber}`,
        indicators: ['\\', '\\'],
      },
    ];
    const searchQueries = [`*92 .I6 1961${randomDigits}`, `hd${randomDigits}92 .I6 *`];
    let createdInstanceId;

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

        InventoryInstances.deleteInstanceByTitleViaApi('AT_C466167');

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            createdInstanceId = instanceId;
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Orders.deleteOrderViaApi(testData.order.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C466167 Find Instance plugin | Search by "Classification, normalized" search option using wildcards (truncation) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C466167'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });

        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.clickTitleLookUpButton();
        InventorySearchAndFilter.instanceTabIsDefault();

        searchQueries.forEach((query) => {
          SelectInstanceModal.chooseSearchOption(searchOption);
          SelectInstanceModal.checkSearchOptionSelected(searchOption);
          SelectInstanceModal.fillInSearchQuery(query);
          SelectInstanceModal.checkSearchInputFieldValue(query);
          SelectInstanceModal.clickSearchButton();

          InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);

          SelectInstanceModal.clickResetAllButton();
          SelectInstanceModal.checkTableContent();
          SelectInstanceModal.checkSearchInputFieldValue('');
        });
      },
    );
  });
});
