import moment from 'moment';
import {
  APPLICATION_NAMES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { OrderDetails, OrderEditForm, OrderLines, Orders } from '../../../support/fragments/orders';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../../support/fragments/organizations';
import ExportDetails from '../../../support/fragments/exportManager/exportDetails';
import { ExportManagerSearchPane } from '../../../support/fragments/exportManager';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Export in edifact format', () => {
    const now = moment();
    const organization = NewOrganization.getDefaultOrganization({ accounts: 1 });
    organization.accounts[0].paymentMethod = 'EFT';
    const testData = {
      organization,
      orderId: null,
      orderNumber: null,
      integration: {},
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
          }).then(({ body: { acquisitionMethods } }) => {
            const acqMethod = acquisitionMethods.find(
              ({ value }) => value === ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
            );

            now.set('second', now.second() + 60);
            const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY'];
            const currentDay = dayNames[now.day()];
            testData.integration = Integrations.getDefaultIntegration({
              vendorId: organization.id,
              acqMethodId: acqMethod.id,
              accountNoList: [organization.accounts[0].accountNo],
              scheduleTime: now.utc().format('HH:mm:ss'),
              ediSchedule: {
                enableScheduledExport: true,
                scheduleParameters: {
                  schedulePeriod: 'WEEK',
                  scheduleFrequency: 1,
                  scheduleTime: now.utc().format('HH:mm:ss'),
                  weekDays: [currentDay],
                },
              },
            });

            Integrations.createIntegrationViaApi(testData.integration);
          });
        });
      });

      // Need to wait while first scheduled job will be running
      cy.wait(70000);

      cy.createTempUser([
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.exportManagerAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      if (testData.orderId) {
        Orders.deleteOrderViaApi(testData.orderId);
      }
      Integrations.deleteIntegrationViaApi(testData.integration.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C350604 Do not export order lines where Manual is true for the PO (thunderjet) (TaaS)',
      { tags: ['criticalPath', 'thunderjet', 'C350604'] },
      () => {
        Orders.clickCreateNewOrder();
        OrderEditForm.clickManualInfoIcon();
        OrderEditForm.verifyManualInfoPopover();
        OrderEditForm.clickCancelButton();

        Orders.createOrder(
          { vendor: testData.organization.name, orderType: 'One-time' },
          true,
          true,
        ).then((orderId) => {
          testData.orderId = orderId;

          Orders.getOrderByIdViaApi(orderId).then((order) => {
            testData.orderNumber = order.poNumber;

            const OrderLineForm = OrderDetails.selectAddPOLine();

            OrderLineForm.fillPoLineDetails({
              acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
              orderFormat: 'Other',
            });

            OrderLineForm.clickAutomaticExportInfoIcon();
            OrderLineForm.verifyAutomaticExportInfoPopover();

            OrderLineForm.verifyAutomaticExportCheckboxDisabled();

            OrderLineForm.fillItemDetails({
              title: `autotest_pol_title_${getRandomPostfix()}`,
            });
            OrderLineForm.fillCostDetails({ physicalUnitPrice: '10', quantityPhysical: '1' });
            OrderLineForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });

            OrderLines.backToEditingOrder();

            OrderDetails.openOrder();

            OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.selectOrganizationsSearch();
            const integrationName =
              testData.integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig
                .configName;
            ExportManagerSearchPane.selectExportMethod(integrationName);
            ExportManagerSearchPane.selectJobByIntegrationInList(integrationName);
            ExportDetails.checkExportJobDetails({
              exportInformation: [
                { key: 'Status', value: 'Failed' },
                {
                  key: 'Error details',
                  value: 'Entities not found: PurchaseOrder (NotFoundException)',
                },
              ],
            });

            ExportManagerSearchPane.rerunJob();
            cy.reload();
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
            Orders.selectOrdersPane();
            Orders.selectOrderByPONumber(testData.orderNumber);
            Orders.checkAbsentExportDetails();
          });
        });
      },
    );
  });
});
