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
      instanceTitlePrefix: `AT_C552984_MarcBibInstance_${getRandomPostfix()}`,
      dateColumnName: INVENTORY_COLUMN_HEADERS.DATE,
    };
    const getDateTypeLetter = (dateTypeValue) => dateTypeValue.split(' - ')[0];
    const datesData = [
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.B),
        date1: '1901',
        date2: '2001',
        expectedDates: '1901, 2001',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.C),
        date1: '1902',
        date2: '2002',
        expectedDates: '1902-2002',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.D),
        date1: '1903',
        date2: '2003',
        expectedDates: '1903-2003',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.E),
        date1: '1904',
        date2: '2004',
        expectedDates: '1904, 2004',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.I),
        date1: '1905',
        date2: '2005',
        expectedDates: '1905-2005',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.K),
        date1: '1906',
        date2: '2006',
        expectedDates: '1906-2006',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.M),
        date1: '1907',
        date2: '2007',
        expectedDates: '1907, 2007',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.N),
        date1: '1908',
        date2: '2008',
        expectedDates: '1908, 2008',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.P),
        date1: '1909',
        date2: '2009',
        expectedDates: '1909, 2009',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.Q),
        date1: '1910',
        date2: '2010',
        expectedDates: '1910, 2010',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.R),
        date1: '1911',
        date2: '2011',
        expectedDates: '1911, 2011',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.S),
        date1: '1912',
        date2: '2012',
        expectedDates: '1912, 2012',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.T),
        date1: '1913',
        date2: '2013',
        expectedDates: '1913, 2013',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.U),
        date1: '1914',
        date2: '2014',
        expectedDates: '1914-2014',
      },
      {
        type: getDateTypeLetter(INVENTORY_008_FIELD_DTST_DROPDOWN.NO),
        date1: '1915',
        date2: '2015',
        expectedDates: '1915, 2015',
      },
      { type: '\\', date1: '1916', date2: '2016', expectedDates: '1916, 2016' }, // Not specified
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

        InventoryInstances.deleteInstanceByTitleViaApi('AT_C552984');

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
                  Date1: data.date1,
                  Date2: data.date2,
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
      'C552984 Select Instance plugin | Check "Date" column in the result list for each date type when both dates are specified in MARC bib record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C552984'] },
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
            data.expectedDates,
          );
        });
      },
    );
  });
});
