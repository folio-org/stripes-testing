import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { NewOrder, OrderLineDetails, Orders } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization({ accounts: 2 }),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

        Orders.createOrderViaApi(testData.order).then((order) => {
          testData.order = order;
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersCreate.gui, Permissions.uiOrdersEdit.gui]).then(
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
    'C358545 A user can select account number when creating/editing PO line (Organization-vendor has more than one active account number) (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C358545'] },
    () => {
      // Click on order from Preconditions
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Click Actions, Add PO line in "PO lines accordion" on "Purchase order" pane
      const OrderLineEditForm = OrderDetails.selectAddPOLine();

      // Choose account number from "Account number" dropdown
      // Fill all mandatory fields and click "Save & close" button
      // * "Vendor" accordion contains account number chosen in Step 3
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: 'some po line' },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.OTHER,
        },
        vendorDetails: { accountNumber: testData.organization.accounts[0].name },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: '1',
        },
      });
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.checkOrderLineDetails({
        vendorDetails: [{ key: 'Account number', value: testData.organization.accounts[0].name }],
      });

      // Click Actions, Edit in "PO Line details" pane
      OrderLineDetails.openOrderLineEditForm();

      // Choose different account number, Click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        vendorDetails: { accountNumber: testData.organization.accounts[1].name },
      });
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.checkOrderLineDetails({
        vendorDetails: [{ key: 'Account number', value: testData.organization.accounts[1].name }],
      });
    },
  );
});
