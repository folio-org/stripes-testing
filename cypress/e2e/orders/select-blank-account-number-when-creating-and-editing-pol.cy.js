import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { NewOrder, OrderDetails, OrderLineDetails, Orders } from '../../support/fragments/orders';
import OrderLineEditForm, {
  vendorDetailsFields,
} from '../../support/fragments/orders/orderLineEditForm';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
    order: {},
    user: {},
    poLineTitle: `AT_C422040_PoLineTitle_${getRandomPostfix()}`,
  };
  const activeAccount = testData.organization.accounts[0];
  const accountNumberOptions = [' ', `${activeAccount.name} (${activeAccount.accountNo}) `];

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
    'C422040 A user can select blank value in "Account number" field when creating/editing PO line (Organization-vendor has only one active account number) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C422040'] },
    () => {
      // Step 1: Click on order from Preconditions
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Add PO line - Click "Actions" button in "PO lines" accordion, select "Add PO line"
      OrderDetails.selectAddPOLine();

      // Step 3: Expand "Account number" dropdown in "Vendor" accordion
      OrderLineEditForm.checkSelectOptions(vendorDetailsFields.accountNumber, accountNumberOptions);

      // Step 4: Choose blank option from "Account number" dropdown
      OrderLineEditForm.selectBlankAccountNumber();
      OrderLineEditForm.checkAccountNumberIsBlank();

      // Step 5: Fill all mandatory fields and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: testData.poLineTitle },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.OTHER,
        },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: '1',
        },
      });
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.checkOrderLineDetails({
        vendorDetails: [{ key: 'Account number', value: '-' }],
      });

      // Step 6: Edit PO line - Click "Actions" button in "PO Line details" pane, select "Edit"
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkAccountNumberIsBlank();

      // Step 7: Choose the existing account from "Account number" dropdown
      OrderLineEditForm.fillOrderLineFields({
        vendorDetails: { accountNumber: activeAccount.name },
      });
      OrderLineEditForm.checkAccountNumberSelected(activeAccount.name);

      // Step 8: Click "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.checkOrderLineDetails({
        vendorDetails: [{ key: 'Account number', value: activeAccount.name }],
      });

      // Step 9: Edit PO line - Click "Actions" button in "PO Line details" pane, select "Edit"
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkAccountNumberSelected(activeAccount.name);

      // Step 10: Choose blank option from "Account number" dropdown
      OrderLineEditForm.selectBlankAccountNumber();
      OrderLineEditForm.checkAccountNumberIsBlank();

      // Step 11: Click "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.checkOrderLineDetails({
        vendorDetails: [{ key: 'Account number', value: '-' }],
      });
    },
  );
});
