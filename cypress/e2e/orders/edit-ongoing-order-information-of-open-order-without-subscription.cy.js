import moment from 'moment';

import {
  COMMON_BUTTON_LABELS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_TYPES,
  ORDER_VIEW_FIELD_LABELS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const polLimit = 2;
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    const reviewDate = moment().add(1, 'days');
    const editedReviewDate = moment().add(2, 'days');

    testData.reviewDate = reviewDate.format('MM/DD/YYYY');
    testData.editedReviewDate = editedReviewDate.format('MM/DD/YYYY');
    testData.ongoingNotes = `AT_C397351_ongoing_note_${getRandomPostfix()}`;
    testData.editedOngoingNotes = `AT_C397351_edited_ongoing_note_${getRandomPostfix()}`;
    testData.closureNote = `AT_C397351_closure_note_${getRandomPostfix()}`;

    cy.getAdminToken().then(() => {
      OrderLinesLimit.setPOLLimitViaApi(polLimit);
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOngoingOrder({
          vendorId: testData.organization.id,
          ongoing: {
            isSubscription: false,
            manualRenewal: false,
            reviewDate: `${reviewDate.format('YYYY-MM-DD')}T12:00:00.000+0000`,
            notes: testData.ongoingNotes,
          },
        });
        testData.orderLine = BasicOrderLine.getDefaultOrderLine();

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then(({ body }) => {
            const secondOrderLine = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: order.id,
              acquisitionMethod: body.acquisitionMethods[0].id,
            });

            OrderLines.createOrderLineViaApi(secondOrderLine).then(() => {
              Orders.updateOrderViaApi({ ...testData.order, workflowStatus: ORDER_STATUSES.OPEN });
            });
          });
        });
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
    'C397351 User is able to edit "Ongoing order information" of the  "Open" status purchase order ("Subscription" checkbox is unchecked) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C397351', 'nonParallel'] },
    () => {
      // Step 1: Click on PO number link for order from Preconditions #3 on "Orders" pane
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderDetails({
        orderInformation: [{ key: ORDER_VIEW_FIELD_LABELS.ORDER_TYPE, value: ORDER_TYPES.ONGOING }],
        summary: [{ key: 'Workflow status', value: ORDER_STATUSES.OPEN }],
      });

      // Step 2: Check information under "Ongoing order information" accordion
      OrderDetails.checkOrderDetails({
        ongoingInformation: [
          { key: 'Subscription', value: { checked: false, disabled: true }, checkbox: true },
          { key: 'Review date', value: testData.reviewDate },
          { key: 'Notes', value: testData.ongoingNotes },
        ],
      });

      // Step 3: Click "Actions" menu button in "Purchase order - <number>" pane => click "Edit" option
      const OrderEditForm = OrderDetails.openOrderEditForm();
      OrderEditForm.verifyOrderInformationSection([
        { label: 'orderTypeValue', conditions: { value: ORDER_TYPES.ONGOING } },
      ]);
      OrderEditForm.verifyOrderSummarySection([
        { label: 'workflowStatus', conditions: { value: ORDER_STATUSES.OPEN } },
      ]);
      OrderEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 4: Check information under "Ongoing order information" accordion
      OrderEditForm.checkOngoingOrderInformationSection([
        { label: 'subscription', conditions: { checked: false, disabled: true } },
        { label: 'renewalInterval', conditions: { readOnly: true } },
        { label: 'renewalDate', conditions: { readOnly: true } },
        { label: 'reviewPeriod', conditions: { readOnly: true } },
        { label: 'manualRenewal', conditions: { checked: false, readOnly: true } },
        { label: 'reviewDate', conditions: { value: testData.reviewDate, disabled: false } },
        { label: 'notes', conditions: { value: testData.ongoingNotes, disabled: false } },
      ]);

      // Step 5: Edit "Review date" and "Notes" fields under "Ongoing order information" accordion
      OrderEditForm.fillOngoingInformationSectionFields({
        reviewDate: testData.editedReviewDate,
        notes: testData.editedOngoingNotes,
      });
      OrderEditForm.checkOngoingOrderInformationSection([
        { label: 'subscription', conditions: { checked: false, disabled: true } },
        { label: 'renewalInterval', conditions: { value: '', readOnly: true } },
        { label: 'renewalDate', conditions: { value: '', readOnly: true } },
        { label: 'reviewPeriod', conditions: { value: '', readOnly: true } },
        { label: 'manualRenewal', conditions: { checked: false, readOnly: true } },
        { label: 'reviewDate', conditions: { value: testData.editedReviewDate, disabled: false } },
        { label: 'notes', conditions: { value: testData.editedOngoingNotes, disabled: false } },
      ]);
      OrderEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 6: Click "Save & close" button in "Edit - <number>" page
      OrderEditForm.clickSaveButton();
      OrderDetails.checkOrderDetails({
        orderInformation: [{ key: ORDER_VIEW_FIELD_LABELS.ORDER_TYPE, value: ORDER_TYPES.ONGOING }],
        summary: [{ key: 'Workflow status', value: ORDER_STATUSES.OPEN }],
      });

      // Step 7: Check information under "Ongoing order information" accordion
      OrderDetails.checkOrderDetails({
        ongoingInformation: [
          { key: 'Subscription', value: { checked: false, disabled: true }, checkbox: true },
          { key: 'Review date', value: testData.editedReviewDate },
          { key: 'Notes', value: testData.editedOngoingNotes },
        ],
      });

      // Step 8: Close the order via "Actions" => "Close order" with reason and empty notes
      Orders.closeOrder(ORDER_SYSTEM_CLOSING_REASONS.CANCELLED);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkFieldsConditions([
        {
          label: ORDER_VIEW_FIELD_LABELS.REASON_FOR_CLOSURE,
          conditions: { value: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
        },
        {
          label: ORDER_VIEW_FIELD_LABELS.NOTES_ON_CLOSURE,
          conditions: { value: 'No value set-' },
        },
      ]);

      // Step 9: Fill in "Notes on closure" field and save the order
      OrderDetails.openOrderEditForm();
      OrderEditForm.fillOrderSummarySectionFields({ notesOnClosure: testData.closureNote });
      OrderEditForm.clickSaveButton();
      OrderDetails.checkFieldsConditions([
        {
          label: ORDER_VIEW_FIELD_LABELS.NOTES_ON_CLOSURE,
          conditions: { value: testData.closureNote },
        },
      ]);
    },
  );
});
