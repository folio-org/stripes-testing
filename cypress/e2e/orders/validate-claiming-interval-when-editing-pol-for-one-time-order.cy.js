import {
  COMMON_BUTTON_LABELS,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const requiredErrorMessage = 'Required!';
  const shouldBePositiveErrorMessage = 'Should be positive';
  const negativeClaimingInterval = '-35';
  const zeroClaimingInterval = '0';
  const positiveClaimingInterval = '35';
  let testData;

  before('Create test data', () => {
    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C423973_Organization_${getRandomPostfix()}`,
      },
      orderLineTitle: `AT_C423973_OrderLine_${getRandomPostfix()}`,
      internalNote: `AT_C423973_InternalNote_${getRandomPostfix()}`,
      order: {},
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      Orders.createOrderWithOrderLineViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        BasicOrderLine.getDefaultOrderLine({ title: testData.orderLineTitle }),
      ).then((order) => {
        testData.order = order;
      });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C423973 Validation for claiming interval when edit PO line for one-time order (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C423973'] },
    () => {
      // Step 1: Go to order from "Preconditions #3" details pane
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Click on PO line record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.orderLineTitle);
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.CLAIMING_ACTIVE,
            value: { disabled: true, checked: false },
            checkbox: true,
          },
        ],
      });

      // Step 3: Click "Actions" button on PO line details pane and select "Edit" option
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: false } },
        { label: 'claimingInterval', conditions: { disabled: true } },
      ]);

      // Step 4: Check "Claiming active" checkbox in "PO line details" accordion
      OrderLineEditForm.fillOrderLineFields({ poLineDetails: { claimingActive: true } });
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: true } },
        { label: 'claimingInterval', conditions: { disabled: false, required: true } },
      ]);

      // Step 5: Click "Save & close" button
      OrderLineEditForm.clickSaveAndCloseButton();
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'claimingInterval',
          conditions: { error: requiredErrorMessage, errorBorder: true },
        },
      ]);

      // Step 6: Enter negative number into "Claiming interval" field and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: { claimingInterval: negativeClaimingInterval },
      });
      OrderLineEditForm.clickSaveAndCloseButton();
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'claimingInterval',
          conditions: { error: shouldBePositiveErrorMessage, errorBorder: true },
        },
      ]);

      // Step 7: Uncheck "Claiming active" checkbox in "PO line details" accordion
      OrderLineEditForm.fillOrderLineFields({ poLineDetails: { claimingActive: true } });
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: false } },
        {
          label: 'claimingInterval',
          conditions: { value: '', disabled: true, required: false },
        },
      ]);

      // Step 8: Make any other changes (add value in "Internal note" field)
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { internalNote: testData.internalNote },
      });
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 9: Click "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.CLAIMING_ACTIVE,
            value: { disabled: true, checked: false },
            checkbox: true,
          },
          { key: POLINE_DETAILS_FIELDS.CLAIMING_INTERVAL, value: 'No value set-' },
        ],
      });

      // Step 10: Click "Actions" button in "PO Line details" pane and select "Edit" option
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: false } },
        { label: 'claimingInterval', conditions: { disabled: true } },
      ]);

      // Step 11: Check "Claiming active" checkbox in "PO line details" accordion
      OrderLineEditForm.fillOrderLineFields({ poLineDetails: { claimingActive: true } });
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: true } },
        { label: 'claimingInterval', conditions: { disabled: false, required: true } },
      ]);

      // Step 12: Enter "0" value in "Claiming interval" field and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: { claimingInterval: zeroClaimingInterval },
      });
      OrderLineEditForm.clickSaveAndCloseButton();
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'claimingInterval',
          conditions: { error: shouldBePositiveErrorMessage, errorBorder: true },
        },
      ]);

      // Step 13: Enter positive number in "Claiming interval" field and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: { claimingInterval: positiveClaimingInterval },
      });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.CLAIMING_ACTIVE,
            value: { disabled: true, checked: true },
            checkbox: true,
          },
          { key: POLINE_DETAILS_FIELDS.CLAIMING_INTERVAL, value: positiveClaimingInterval },
        ],
      });
    },
  );
});
