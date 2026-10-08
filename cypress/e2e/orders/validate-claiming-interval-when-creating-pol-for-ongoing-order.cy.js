import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
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
  let testData;

  before('Create test data', () => {
    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C423975_Organization_${getRandomPostfix()}`,
      },
      orderLineTitle: `AT_C423975_OrderLine_${getRandomPostfix()}`,
      renewalNote: `AT_C423975_RenewalNote_${getRandomPostfix()}`,
      order: {},
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;
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
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C423975 "Claiming interval" field validation when create PO line for ongoing order (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C423975'] },
    () => {
      // Step 1: Go to order from "Preconditions #3" details pane
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Click "Actions" button in "PO lines" accordion and select "Add PO line" option
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: false } },
        { label: 'claimingInterval', conditions: { value: '', disabled: true } },
      ]);

      // Step 3: Check "Claiming active" checkbox in "PO line details" accordion
      OrderLineEditForm.fillOrderLineFields({ poLineDetails: { claimingActive: true } });
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: true } },
        { label: 'claimingInterval', conditions: { disabled: false, required: true } },
      ]);

      // Step 4: Fill all mandatory fields (except "Claiming interval") and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: testData.orderLineTitle },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.OTHER,
        },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: '1',
        },
      });
      OrderLineEditForm.clickSaveAndCloseButton();
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'claimingInterval',
          conditions: { error: requiredErrorMessage, errorBorder: true },
        },
      ]);

      // Step 5: Enter any negative number into "Claiming interval" field
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: { claimingInterval: negativeClaimingInterval },
      });

      // Step 6: Click "Save & close" button
      OrderLineEditForm.clickSaveAndCloseButton();
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'claimingInterval',
          conditions: { error: shouldBePositiveErrorMessage, errorBorder: true },
        },
      ]);

      // Step 7: Enter "0" into "Claiming interval" field and click "Save & close" button
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

      // Step 8: Uncheck "Claiming active" checkbox in "PO line details" accordion
      OrderLineEditForm.fillOrderLineFields({ poLineDetails: { claimingActive: true } });
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: false } },
        {
          label: 'claimingInterval',
          conditions: { value: '', disabled: true, required: false },
        },
      ]);

      // Step 9: Make any other changes (add value in "Renewal note" field) and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        ongoingOrder: { renewalNote: testData.renewalNote },
      });
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
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
    },
  );
});
