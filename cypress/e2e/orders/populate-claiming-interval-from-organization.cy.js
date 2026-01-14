import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { NewOrder, Orders, OrderLineDetails } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const claimingInterval = '35';
  const testData = {
    organization: NewOrganization.getDefaultOrganization({ claimingInterval: '20' }),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id });

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
    'C423436 Populate claiming interval in PO line from Organization record for ongoing order (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C423436'] },
    () => {
      // Go to order from "Preconditions" details pane
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Click "Actions", Select "Add PO line" option
      const OrderLineEditForm = OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: false } },
        {
          label: 'claimingInterval',
          conditions: { value: testData.organization.claimingInterval, disabled: true },
        },
      ]);

      // Fill all mandatory fields
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: 'some po line' },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.OTHER,
        },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: '1',
        },
      });

      // Click "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: 'Claiming active', value: { disabled: true, checked: false }, checkbox: true },
          { key: 'Claiming interval', value: testData.organization.claimingInterval },
        ],
      });

      // Click Actions, Edit in "PO Line details" pane
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: false } },
        {
          label: 'claimingInterval',
          conditions: { value: testData.organization.claimingInterval, disabled: true },
        },
      ]);

      // Check "Claiming active" checkbox in "PO line details" accordion
      // Enter any number different from already populated into "Claiming interval" field (e.g. 35)
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: { claimingActive: true, claimingInterval },
      });

      // Click "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineCreated: false, orderLineUpdated: true });
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: 'Claiming active', value: { disabled: true, checked: true }, checkbox: true },
          { key: 'Claiming interval', value: claimingInterval },
        ],
      });

      // Click Actions, Edit in "PO Line details" pane
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: true } },
        {
          label: 'claimingInterval',
          conditions: { value: claimingInterval, disabled: false },
        },
      ]);

      // Uncheck "Claiming active" checkbox in "PO line details" accordion
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: { claimingActive: true },
      });
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: false } },
        {
          label: 'claimingInterval',
          conditions: { value: '', disabled: true },
        },
      ]);

      // Click "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineCreated: false, orderLineUpdated: true });
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: 'Claiming active', value: { disabled: true, checked: false }, checkbox: true },
          { key: 'Claiming interval', value: 'No value set-' },
        ],
      });
    },
  );
});
