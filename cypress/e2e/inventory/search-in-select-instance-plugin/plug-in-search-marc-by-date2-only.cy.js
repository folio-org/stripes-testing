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
      instanceTitlePrefix: `AT_C552986_MarcBibInstance_${getRandomPostfix()}`,
      dateColumnName: INVENTORY_COLUMN_HEADERS.DATE,
    };
    const getDateTypeLetter = (dateTypeValue) => dateTypeValue.split(' - ')[0];
    const datesData = [
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.B), date2: '1981' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.C), date2: '-1982' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.D), date2: '-1983' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.E), date2: '1984' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.I), date2: '-1985' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.K), date2: '-1986' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.M), date2: '1987' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.N), date2: '1988' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.P), date2: '1989' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.Q), date2: '1990' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.R), date2: '1991' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.S), date2: '1992' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.T), date2: '1993' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.U), date2: '-1994' },
      { type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.NO), date2: '1995' },
      { type: '\\', date2: '1996' }, // Not specified
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

        InventoryInstances.deleteInstanceByTitleViaApi('AT_C552986');

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
                  Date1: '\\\\\\\\',
                  Date2: data.date2.replace('-', ''),
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
      'C552986 Select Instance plugin | Check "Date" column in the result list for each date type when only Date 2 is specified in MARC bib record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C552986'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
          authRefresh: true,
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
            data.date2,
          );
        });
      },
    );
  });
});
