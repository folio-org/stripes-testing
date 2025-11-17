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
      instanceTitlePrefix: `AT_C552985_MarcBibInstance_${getRandomPostfix()}`,
      dateColumnName: INVENTORY_COLUMN_HEADERS.DATE,
    };
    const getDateTypeLetter = (dateTypeValue) => dateTypeValue.split(' - ')[0];
    const datesData = [
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.B), date1: '1921' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.C), date1: '1922-' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.D), date1: '1923-' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.E), date1: '1924' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.I), date1: '1925-' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.K), date1: '1926-' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.M), date1: '1927' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.N), date1: '1928' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.P), date1: '1929' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.Q), date1: '1930' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.R), date1: '1931' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.S), date1: '1932' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.T), date1: '1933' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.U), date1: '1934-' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.NO), date1: '1935' },
      { type: '\\', date1: '1936' }, // Not specified
    ];
    const instanceTitles = Array.from(
      { length: datesData.length },
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

        InventoryInstances.deleteInstanceByTitleViaApi('AT_C552985');

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          datesData.forEach((data, index) => {
            const marcInstanceFields = [
              {
                tag: '008',
                content: {
                  ...QuickMarcEditor.valid008ValuesInstance,
                  DtSt: data.type,
                  Date1: data.date1.replace('-', ''),
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
      'C552985 Select Instance plugin | Check "Date" column in the result list for each date type when only Date 1 is specified in MARC bib record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C552985'] },
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
        datesData.forEach((data, index) => {
          InventoryInstances.verifyValueInColumnForTitle(
            instanceTitles[index],
            testData.dateColumnName,
            data.date1,
          );
        });
      },
    );
  });
});
