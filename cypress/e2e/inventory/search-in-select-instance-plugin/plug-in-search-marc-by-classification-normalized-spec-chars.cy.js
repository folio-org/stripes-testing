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
    const randomFourDigits = randomFourDigitNumber();
    const randomDigits = `466169${randomFourDigits}${randomFourDigits}`;
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
      classificationNumbers: [
        `L38.s:Oc2/3/${randomDigits}`,
        `! L38sOc23${randomDigits}$`,
        `L38sOc23${randomDigits}`,
        `L38 . s : Oc2 / 3 / ${randomDigits}`,
        `L38 s Oc23 ${randomDigits}`,
      ],
      instanceTitlePrefix: `AT_C466169_MarcBibInstance_${getRandomPostfix()}`,
      searchOption: searchInstancesOptions[4],
    };
    const instanceTitles = Array.from(
      { length: testData.classificationNumbers.length },
      (_, i) => `${testData.instanceTitlePrefix}_${i}`,
    );
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

        InventoryInstances.deleteInstanceByTitleViaApi('AT_C466169');

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          testData.classificationNumbers.forEach((classificationNumber, index) => {
            const marcInstanceFields = [
              {
                tag: '008',
                content: QuickMarcEditor.defaultValid008Values,
              },
              {
                tag: '245',
                content: `$a ${instanceTitles[index]}`,
                indicators: ['1', '1'],
              },
              {
                tag: '090',
                content: `$a ${classificationNumber}`,
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
        });
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
      'C466169 Find Instance plugin | Search by "Classification, normalized" search option using queries with special characters (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C466169'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });

        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.clickTitleLookUpButton();
        InventorySearchAndFilter.instanceTabIsDefault();

        testData.classificationNumbers.forEach((number) => {
          SelectInstanceModal.chooseSearchOption(testData.searchOption);
          SelectInstanceModal.checkSearchOptionSelected(testData.searchOption);
          SelectInstanceModal.fillInSearchQuery(number);
          SelectInstanceModal.checkSearchInputFieldValue(number);
          SelectInstanceModal.clickSearchButton();

          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          SelectInstanceModal.clickResetAllButton();
          SelectInstanceModal.checkTableContent();
          SelectInstanceModal.checkSearchInputFieldValue('');
        });
      },
    );
  });
});
