import moment from 'moment';

import {
  COMMON_BUTTON_LABELS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_TYPES,
  ORDER_VIEW_FIELD_LABELS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    renewalInterval: '10',
    reviewPeriod: '5',
    editedRenewalInterval: '20',
    editedReviewPeriod: '15',
    secondEditedRenewalInterval: '30',
    secondEditedReviewPeriod: '25',
    order: {},
    user: {},
  };

  before('Create test data', () => {
    const renewalDate = moment().add(1, 'days');
    const editedRenewalDate = moment().add(2, 'days');

    testData.renewalDate = renewalDate.format('MM/DD/YYYY');
    testData.editedRenewalDate = editedRenewalDate.format('MM/DD/YYYY');
    testData.ongoingNotes = `AT_C397346_ongoing_note_${getRandomPostfix()}`;
    testData.editedOngoingNotes = `AT_C397346_edited_ongoing_note_${getRandomPostfix()}`;
    testData.closureNote = `AT_C397346_closure_note_${getRandomPostfix()}`;
    testData.editedClosureNote = `AT_C397346_edited_closure_note_${getRandomPostfix()}`;

    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOngoingOrder({
          vendorId: testData.organization.id,
          ongoing: {
            isSubscription: true,
            manualRenewal: false,
            interval: Number(testData.renewalInterval),
            renewalDate: `${renewalDate.format('YYYY-MM-DD')}T12:00:00.000+0000`,
            reviewPeriod: Number(testData.reviewPeriod),
            notes: testData.ongoingNotes,
          },
        });
        testData.orderLine = BasicOrderLine.getDefaultOrderLine();

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({ ...testData.order, workflowStatus: ORDER_STATUSES.OPEN });
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
    'C397346 User is able to edit "Ongoing order information" of the  "Open" status purchase order ("Subscription" checkbox is checked) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C397346'] },
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
          { key: 'Subscription', value: { checked: true, disabled: true }, checkbox: true },
          { key: 'Renewal interval', value: testData.renewalInterval },
          { key: 'Renewal date', value: testData.renewalDate },
          { key: 'Review period', value: testData.reviewPeriod },
          { key: 'Manual renewal', value: { checked: false, disabled: true }, checkbox: true },
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
        { label: 'subscription', conditions: { checked: true, disabled: true } },
        {
          label: 'renewalInterval',
          conditions: { value: testData.renewalInterval, disabled: false },
        },
        { label: 'renewalDate', conditions: { value: testData.renewalDate, disabled: false } },
        { label: 'reviewPeriod', conditions: { value: testData.reviewPeriod, disabled: false } },
        { label: 'manualRenewal', conditions: { checked: false, disabled: true } },
        { label: 'reviewDate', conditions: { value: '', readOnly: true } },
        { label: 'notes', conditions: { value: testData.ongoingNotes, disabled: false } },
      ]);

      // Step 5: Edit "Renewal interval", "Renewal date" and "Review period" fields
      OrderEditForm.fillOngoingInformationSectionFields({
        renewalInterval: testData.editedRenewalInterval,
        renewalDate: testData.editedRenewalDate,
        reviewPeriod: testData.editedReviewPeriod,
      });
      OrderEditForm.checkOngoingOrderInformationSection([
        { label: 'subscription', conditions: { checked: true, disabled: true } },
        {
          label: 'renewalInterval',
          conditions: { value: testData.editedRenewalInterval, disabled: false },
        },
        {
          label: 'renewalDate',
          conditions: { value: testData.editedRenewalDate, disabled: false },
        },
        {
          label: 'reviewPeriod',
          conditions: { value: testData.editedReviewPeriod, disabled: false },
        },
        { label: 'manualRenewal', conditions: { checked: false, disabled: true } },
        { label: 'reviewDate', conditions: { value: '', readOnly: true } },
        { label: 'notes', conditions: { value: testData.ongoingNotes, disabled: false } },
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
          { key: 'Subscription', value: { checked: true, disabled: true }, checkbox: true },
          { key: 'Renewal interval', value: testData.editedRenewalInterval },
          { key: 'Renewal date', value: testData.editedRenewalDate },
          { key: 'Review period', value: testData.editedReviewPeriod },
          { key: 'Manual renewal', value: { checked: false, disabled: true }, checkbox: true },
          { key: 'Notes', value: testData.ongoingNotes },
        ],
      });

      // Step 8: Click "Actions" menu button in "Purchase order - <number>" pane => click "Edit" option
      OrderDetails.openOrderEditForm();
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

      // Step 9: Check information under "Ongoing order information" accordion
      OrderEditForm.checkOngoingOrderInformationSection([
        { label: 'subscription', conditions: { checked: true, disabled: true } },
        {
          label: 'renewalInterval',
          conditions: { value: testData.editedRenewalInterval, disabled: false },
        },
        {
          label: 'renewalDate',
          conditions: { value: testData.editedRenewalDate, disabled: false },
        },
        {
          label: 'reviewPeriod',
          conditions: { value: testData.editedReviewPeriod, disabled: false },
        },
        { label: 'manualRenewal', conditions: { checked: false, disabled: true } },
        { label: 'reviewDate', conditions: { value: '', readOnly: true } },
        { label: 'notes', conditions: { value: testData.ongoingNotes, disabled: false } },
      ]);

      // Step 10: Edit "Renewal interval", "Review period" and "Notes" fields
      OrderEditForm.fillOngoingInformationSectionFields({
        renewalInterval: testData.secondEditedRenewalInterval,
        reviewPeriod: testData.secondEditedReviewPeriod,
        notes: testData.editedOngoingNotes,
      });
      OrderEditForm.checkOngoingOrderInformationSection([
        { label: 'subscription', conditions: { checked: true, disabled: true } },
        {
          label: 'renewalInterval',
          conditions: { value: testData.secondEditedRenewalInterval, disabled: false },
        },
        {
          label: 'renewalDate',
          conditions: { value: testData.editedRenewalDate, disabled: false },
        },
        {
          label: 'reviewPeriod',
          conditions: { value: testData.secondEditedReviewPeriod, disabled: false },
        },
        { label: 'manualRenewal', conditions: { checked: false, disabled: true } },
        { label: 'reviewDate', conditions: { value: '', readOnly: true } },
        { label: 'notes', conditions: { value: testData.editedOngoingNotes, disabled: false } },
      ]);
      OrderEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 11: Click "Save & close" button in "Edit - <number>" page
      OrderEditForm.clickSaveButton();
      OrderDetails.checkOrderDetails({
        orderInformation: [{ key: ORDER_VIEW_FIELD_LABELS.ORDER_TYPE, value: ORDER_TYPES.ONGOING }],
        summary: [{ key: 'Workflow status', value: ORDER_STATUSES.OPEN }],
      });

      // Step 12: Check information under "Ongoing order information" accordion
      OrderDetails.checkOrderDetails({
        ongoingInformation: [
          { key: 'Subscription', value: { checked: true, disabled: true }, checkbox: true },
          { key: 'Renewal interval', value: testData.secondEditedRenewalInterval },
          { key: 'Renewal date', value: testData.editedRenewalDate },
          { key: 'Review period', value: testData.secondEditedReviewPeriod },
          { key: 'Manual renewal', value: { checked: false, disabled: true }, checkbox: true },
          { key: 'Notes', value: testData.editedOngoingNotes },
        ],
      });

      // Step 13: Close the order via "Actions" => "Close order" with reason and notes
      Orders.closeOrder(ORDER_SYSTEM_CLOSING_REASONS.CANCELLED, true, testData.closureNote);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkFieldsConditions([
        {
          label: ORDER_VIEW_FIELD_LABELS.REASON_FOR_CLOSURE,
          conditions: { value: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
        },
        {
          label: ORDER_VIEW_FIELD_LABELS.NOTES_ON_CLOSURE,
          conditions: { value: testData.closureNote },
        },
      ]);

      // Step 14: Edit "Notes on closure" field and save the order
      OrderDetails.openOrderEditForm();
      OrderEditForm.fillOrderSummarySectionFields({
        notesOnClosure: testData.editedClosureNote,
      });
      OrderEditForm.clickSaveButton();
      OrderDetails.checkFieldsConditions([
        {
          label: ORDER_VIEW_FIELD_LABELS.NOTES_ON_CLOSURE,
          conditions: { value: testData.editedClosureNote },
        },
      ]);
    },
  );
});
