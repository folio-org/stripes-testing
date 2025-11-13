import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import {
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_COLUMN_HEADERS,
} from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
      instanceTitlePrefix: `AT_C552987_MarcBibInstance_${getRandomPostfix()}`,
      dateColumnName: INVENTORY_COLUMN_HEADERS.DATE,
    };
    const getDateTypeLetter = (dateTypeValue) => dateTypeValue.split(' - ')[0];
    const dateTypeLetters = [
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.B),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.C),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.D),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.E),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.I),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.K),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.M),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.N),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.P),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.Q),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.R),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.S),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.T),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.U),
      getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.NO),
      '\\', // Not specified
    ];
    const instanceTitles = Array.from(
      { length: dateTypeLetters.length },
      (_, i) => `${testData.instanceTitlePrefix}_${i}_Record`,
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

        InventoryInstances.deleteInstanceByTitleViaApi('AT_C552987');

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          dateTypeLetters.forEach((dateTypeLetter, index) => {
            const marcInstanceFields = [
              {
                tag: '008',
                content: {
                  ...QuickMarcEditor.valid008ValuesInstance,
                  DtSt: dateTypeLetter,
                  Date1: '\\\\\\\\',
                  Date2: '\\\\\\\\',
                },
              },
              {
                tag: '245',
                content: `$a ${instanceTitles[index]}`,
                indicators: ['1', '1'],
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
      'C552987 Select Instance plugin | Check "Date" column in the result list for each date type when dates are not specified in MARC bib record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C552987'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });

        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.clickTitleLookUpButton();
        InventorySearchAndFilter.instanceTabIsDefault();

        SelectInstanceModal.searchByName(testData.instanceTitlePrefix);
        instanceTitles.forEach((title) => {
          InventoryInstances.verifyValueInColumnForTitle(title, testData.dateColumnName, '');
        });
      },
    );
  });
});
