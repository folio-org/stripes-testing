import { Permissions } from '../../support/dictionary';
import { NewOrder, Orders, BasicOrderLine } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {
    renewalNote: `autotest_renewal_note_${getRandomPostfix()}`,
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id });
        testData.orderLine = BasicOrderLine.getDefaultOrderLine();

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiOrdersView.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C353968 A user can edit "Renewal note" field on POL (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C353968'] },
    () => {
      // Click on the record with Order name from precondition
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);

      // Click on the PO line record in "PO line" accordion
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkOngoingOrderInformationSection([{ key: 'Renewal note', value: '' }]);

      // Click "Actions" button, Select "Edit" option
      const OrderLineEditForm = OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkOngoingOrderInformationSection([
        { label: 'Renewal note', conditions: { value: '' } },
      ]);

      // Edit "Renewal note" field and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        ongoingOrder: { renewalNote: testData.renewalNote },
      });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkOngoingOrderInformationSection([
        { key: 'Renewal note', value: testData.renewalNote },
      ]);
    },
  );
});
