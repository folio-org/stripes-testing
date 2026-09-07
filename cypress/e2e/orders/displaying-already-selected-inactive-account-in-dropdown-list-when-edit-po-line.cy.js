import {
  ACCOUNT_STATUSES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  COMMON_BUTTON_LABELS,
  INVOICE_PAYMENT_METHODS,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import OrderLineEditForm, {
  vendorDetailsFields,
} from '../../support/fragments/orders/orderLineEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const accounts = [
    {
      accountNo: getRandomPostfix(),
      accountStatus: ACCOUNT_STATUSES.ACTIVE,
      name: `autotest_account_A_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
    },
    {
      accountNo: getRandomPostfix(),
      accountStatus: ACCOUNT_STATUSES.ACTIVE,
      name: `autotest_account_B_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
    },
  ];
  const [inactiveAccount, activeAccount] = accounts;
  const activeAccountLabel = `${activeAccount.name} (${activeAccount.accountNo}) `;
  const inactiveAccountLabel = `${inactiveAccount.name} (${inactiveAccount.accountNo})  - ${ACCOUNT_STATUSES.INACTIVE}`;

  const testData = {
    organization: { ...NewOrganization.getDefaultOrganization(), accounts },
    order: {},
    orderLine: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization, {
      returnBody: true,
    }).then((organization) => {
      testData.organization = organization;
    });
  };

  const createOrderWithLine = () => {
    testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

    return Orders.createOrderViaApi(testData.order)
      .then((order) => {
        testData.order = order;

        return cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        });
      })
      .then(({ body }) => {
        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          acquisitionMethod: body.acquisitionMethods[0].id,
          purchaseOrderId: testData.order.id,
          vendorAccount: inactiveAccount.accountNo,
        });

        return OrderLines.createOrderLineViaApi(testData.orderLine);
      })
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const makeUsedAccountInactive = () => {
    const updatedOrganization = {
      ...testData.organization,
      accounts: testData.organization.accounts.map((account) => (account.accountNo === inactiveAccount.accountNo
        ? { ...account, accountStatus: ACCOUNT_STATUSES.INACTIVE }
        : account)),
    };

    return Organizations.addDonorInfoViaApi(testData.organization.id, updatedOrganization).then(
      () => {
        testData.organization = updatedOrganization;
      },
    );
  };

  const createUserAndLogin = () => {
    return cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createOrganization()
      .then(createOrderWithLine)
      .then(makeUsedAccountInactive)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id, false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C411755 Displaying already selected inactive account in dropdown list when edit PO line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C411755'] },
    () => {
      // Step 1: Open order details
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Select PO line record
      OrderDetails.selectPOLInOrder();
      OrderLineDetails.waitLoading();

      // Step 3: Edit PO line and check the selected inactive account and warning
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkAccountNumberMarkedInactive();
      OrderLineEditForm.checkAccountNumberWarning();
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 4: Verify options in the Account number dropdown
      OrderLineEditForm.checkSelectOptions(vendorDetailsFields.accountNumber, [
        ' ',
        inactiveAccountLabel,
        activeAccountLabel,
      ]);

      // Step 5: Select active account number and verify warning disappears
      OrderLineEditForm.fillVendorDetails({ accountNumber: activeAccount.name });
      OrderLineEditForm.checkAccountNumberWarning(false);
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 6:Sace PO line and verify the selected account
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        vendorDetails: [
          { key: POLINE_DETAILS_FIELDS.ACCOUNT_NUMBER, value: activeAccountLabel.trim() },
        ],
      });

      // Step 7: Edit PO line and verify the Account number dropdown
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkAccountNumberWarning(false);
      OrderLineEditForm.checkAccountNumberSelected(activeAccount.name);
      OrderLineEditForm.checkSelectOptions(vendorDetailsFields.accountNumber, [
        ' ',
        activeAccountLabel,
      ]);
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);
    },
  );
});
