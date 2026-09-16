import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_LINE_FILTER_LABELS,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const randomPostfix = getRandomPostfix();
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const testData = {
    packageTitle1: `AT_C414960_Package1_${randomPostfix}`,
    linkedTitle: `AT_C414960_LinkedTitle_${randomPostfix}`,
    packageTitle3: `AT_C414960_Package3_${randomPostfix}`,
    orders: [],
    user: {},
  };

  const createOrderWithLine = (orderLineParams) => {
    return Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: organization.id })).then(
      (order) => {
        testData.orders.push(order);

        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            acquisitionMethod: testData.acquisitionMethodId,
            purchaseOrderId: order.id,
          }),
          ...orderLineParams,
        });
      },
    );
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(organization).then((orgResponse) => {
      organization.id = orgResponse;

      cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      }).then((acquisitionMethodResponse) => {
        testData.acquisitionMethodId = acquisitionMethodResponse.body.acquisitionMethods[0].id;

        // Precondition 1: Order #1 with package PO line
        createOrderWithLine({ isPackage: true, titleOrPackage: testData.packageTitle1 })
          .then((packageLine1) => {
            testData.packageLine1 = packageLine1;

            // Precondition 2: Order #2 with NOT package PO line linked to package PO line from Order #1
            return createOrderWithLine({
              isPackage: false,
              titleOrPackage: testData.linkedTitle,
              packagePoLineId: packageLine1.id,
            });
          })
          .then((linkedLine) => {
            testData.linkedLine = linkedLine;

            // Precondition 3: Order #3 with package PO line NOT linked to any PO lines
            return createOrderWithLine({ isPackage: true, titleOrPackage: testData.packageTitle3 });
          })
          .then((packageLine3) => {
            testData.packageLine3 = packageLine3;
          });
      });
    });

    // Precondition 4: User with "Orders: Can view Orders and Order lines" permission
    cy.createTempUser([permissions.uiOrdersView.gui]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 5: User is on "Orders" app
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    testData.orders.forEach((order) => Orders.deleteOrderViaApi(order.id));
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C414960 Filter PO lines by "Linked package POL" (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C414960'] },
    () => {
      // Step 1: Click "Order line" toggle on "Search & filter" pane
      Orders.selectOrderLines();
      OrderLines.waitLoading();
      OrderLines.verifyLinkedPackagePolFilterAccordionExpanded(false);

      // Step 2: Expand "Linked package POL" accordion
      OrderLines.expandLinkedPackagePolFilter();
      OrderLines.verifyLinkedPackagePolFilterValue('');

      // Step 3: Click "Linked package POL lookup" hyperlink
      OrderLines.clickLinkedPackagePolLookUp();
      SelectOrderLinesModal.verifyModalView({ multiselect: false });
      SelectOrderLinesModal.assertSearchResults([testData.packageTitle1, testData.packageTitle3], {
        verifyRowCount: false,
      });

      // Step 4: Select Order #1 PO line
      SelectOrderLinesModal.selectOrderLineByNumber(testData.packageLine1.poLineNumber, {
        multiselect: false,
      });
      OrderLines.verifyLinkedPackagePolFilterValue(testData.packageLine1.poLineNumber);
      OrderLines.verifyOrderLineInResultsList(testData.linkedLine.poLineNumber);
      OrderLines.assertResultsCount(1);

      // Step 5: Click "x" button next to "Linked package POL" accordion
      OrderLines.clearFilter(ORDER_LINE_FILTER_LABELS.LINKED_PACKAGE_POL);
      OrderLines.verifyLinkedPackagePolFilterValue('');
      OrderLines.verifySearchCriteriaMessage();
      OrderLines.assertNoFiltersApplied();

      // Step 6: Click "Linked package POL lookup" hyperlink
      OrderLines.clickLinkedPackagePolLookUp();
      SelectOrderLinesModal.verifyModalView({ multiselect: false });
      SelectOrderLinesModal.assertSearchResults([testData.packageTitle1, testData.packageTitle3], {
        verifyRowCount: false,
      });

      // Step 7: Select Order #3 PO line (not linked to any other PO lines)
      SelectOrderLinesModal.selectOrderLineByNumber(testData.packageLine3.poLineNumber, {
        multiselect: false,
      });
      OrderLines.verifyLinkedPackagePolFilterValue(testData.packageLine3.poLineNumber);
      OrderLines.verifyNoResultsFoundMessage();
      OrderLines.assertResultsCount(0);

      // Step 8: Click "Reset all" button
      OrderLines.resetFilters();
      OrderLines.verifyLinkedPackagePolFilterValue('');
      OrderLines.verifySearchCriteriaMessage();
      OrderLines.assertNoFiltersApplied();
    },
  );
});
