import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LIST_ASSERTION_MODES,
  ORDER_LINE_FILTER_LABELS,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import SelectDonorModal from '../../support/fragments/orders/modals/selectDonorModal';
import SelectOrganizationModal from '../../support/fragments/orders/modals/selectOrganizationModal';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const LINES_LIMIT = 2;

describe('Orders', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    organizationType: {
      ...SettingsOrganizations.getDefaultOrganizationType(),
      name: `AT_C423428_Type_${randomPostfix}`,
    },
    donorA: {
      ...NewOrganization.getDefaultOrganization({ isDonor: true, isVendor: false }),
      name: `AT_C423428_DonorA_${randomPostfix}`,
    },
    donorB: {
      ...NewOrganization.getDefaultOrganization({ isDonor: true, isVendor: false }),
      name: `AT_C423428_DonorB_${randomPostfix}`,
    },
    vendor: {
      ...NewOrganization.getDefaultOrganization({ isDonor: false, isVendor: true }),
      name: `AT_C423428_Vendor_${randomPostfix}`,
    },
    orderLineTitles: {
      line1A: `AT_C423428_Line1A_${randomPostfix}`,
      line1B: `AT_C423428_Line1B_${randomPostfix}`,
      line2: `AT_C423428_Line2_${randomPostfix}`,
      line3: `AT_C423428_Line3_${randomPostfix}`,
      line4: `AT_C423428_Line4_${randomPostfix}`,
      line5: `AT_C423428_Line5_${randomPostfix}`,
    },
    orders: [],
    user: {},
  };

  const createOrderWithLines = (orderLinesParams = []) => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.vendor.id }),
    ).then((order) => {
      testData.orders.push(order);

      return cy.wrap(orderLinesParams).each((orderLineParams) => {
        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            acquisitionMethod: testData.acquisitionMethodId,
            purchaseOrderId: order.id,
          }),
          ...orderLineParams,
        });
      });
    });
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();

    // Precondition: "Purchase order lines limit" should allow more than one PO line per order
    OrderLinesLimit.setPOLLimitViaApi(LINES_LIMIT);

    // Precondition 1: Organization type
    SettingsOrganizations.createTypesViaApi(testData.organizationType);

    // Precondition 2: Two active organizations-donors
    Organizations.createOrganizationViaApi(testData.donorA).then((donorAId) => {
      testData.donorA.id = donorAId;
    });
    Organizations.createOrganizationViaApi(testData.donorB).then((donorBId) => {
      testData.donorB.id = donorBId;
    });

    // Precondition 3: Active organization-vendor (NOT a donor) with type from Precondition 1
    Organizations.createOrganizationViaApi({
      ...testData.vendor,
      organizationTypes: [testData.organizationType.id],
    }).then((vendorId) => {
      testData.vendor.id = vendorId;

      cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      }).then((acquisitionMethodResponse) => {
        testData.acquisitionMethodId = acquisitionMethodResponse.body.acquisitionMethods[0].id;

        // Precondition 4: Order #1 with two PO lines - one with "Org A", another with "Org B"
        createOrderWithLines([
          {
            titleOrPackage: testData.orderLineTitles.line1A,
            donorOrganizationIds: [testData.donorA.id],
          },
          {
            titleOrPackage: testData.orderLineTitles.line1B,
            donorOrganizationIds: [testData.donorB.id],
          },
        ])
          .then(() => {
            // Precondition 5: Order #2 with one PO line assigned "Org A"
            return createOrderWithLines([
              {
                titleOrPackage: testData.orderLineTitles.line2,
                donorOrganizationIds: [testData.donorA.id],
              },
            ]);
          })
          .then(() => {
            // Precondition 6: Order #3 with one PO line assigned "Org B"
            return createOrderWithLines([
              {
                titleOrPackage: testData.orderLineTitles.line3,
                donorOrganizationIds: [testData.donorB.id],
              },
            ]);
          })
          .then(() => {
            // Precondition 7: Order #4 with one PO line assigned "Org A" and "Org B"
            return createOrderWithLines([
              {
                titleOrPackage: testData.orderLineTitles.line4,
                donorOrganizationIds: [testData.donorA.id, testData.donorB.id],
              },
            ]);
          })
          .then(() => {
            // Precondition 8: Order #5 with one PO line without donors
            return createOrderWithLines([
              {
                titleOrPackage: testData.orderLineTitles.line5,
                donorOrganizationIds: [],
              },
            ]);
          });
      });
    });

    // Precondition 9: User with "Orders: Can view Orders and Order lines" permission
    cy.createTempUser([permissions.uiOrdersView.gui]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 10: User is on "Orders" app with search toggle on "Order lines" option
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.selectOrderLines();
      OrderLines.waitLoading();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    OrderLinesLimit.setPOLLimitViaApi(1);
    testData.orders.forEach((order) => Orders.deleteOrderViaApi(order.id));
    Organizations.deleteOrganizationViaApi(testData.vendor.id);
    Organizations.deleteOrganizationViaApi(testData.donorA.id);
    Organizations.deleteOrganizationViaApi(testData.donorB.id);
    SettingsOrganizations.deleteOrganizationTypeViaApi(testData.organizationType.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C423428 Filter PO lines by "Donor" filter and Order by Organization type (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423428', 'nonParallel'] },
    () => {
      // Step 1: Check that "Search & filter" pane contains "Donor" accordion
      OrderLines.verifyDonorFilterAccordionExpanded(false);

      // Step 2: Expand "Donor" accordion on "Search & filter" pane
      OrderLines.expandDonorFilter();
      OrderLines.verifyDonorFilterValues([]);

      // Step 3: Click "Donor look-up" link in "Donor" accordion
      OrderLines.clickDonorLookUp();
      SelectDonorModal.waitLoading();
      SelectDonorModal.assertDonorsListIncludes([testData.donorA.name, testData.donorB.name]);
      SelectDonorModal.assertDonorsListIncludes([testData.vendor.name], {
        mode: LIST_ASSERTION_MODES.ABSENT,
      });

      // Step 4: Select "Org A" from the donor's list and click "Save" button
      SelectDonorModal.selectDonors([testData.donorA.name]);
      SelectDonorModal.submitSelectedDonors();
      SelectDonorModal.assertModalClosed();
      OrderLines.verifyDonorFilterValues([testData.donorA.name]);
      OrderLines.assertTitlesInResults([
        testData.orderLineTitles.line1A,
        testData.orderLineTitles.line2,
        testData.orderLineTitles.line4,
      ]);
      OrderLines.verifyTitlesAbsentInResults([
        testData.orderLineTitles.line1B,
        testData.orderLineTitles.line3,
        testData.orderLineTitles.line5,
      ]);

      // Step 5: Clear "Donor" field by clicking "X" button next to "Donor" accordion
      OrderLines.clearFilter(ORDER_LINE_FILTER_LABELS.DONOR);
      OrderLines.verifyDonorFilterValues([]);
      OrderLines.assertNoFiltersApplied();

      // Step 6: Click "Donor look-up" link in "Donor" accordion
      OrderLines.clickDonorLookUp();
      SelectDonorModal.waitLoading();
      SelectDonorModal.assertDonorsListIncludes([testData.donorA.name, testData.donorB.name]);
      SelectDonorModal.assertDonorsListIncludes([testData.vendor.name], {
        mode: LIST_ASSERTION_MODES.ABSENT,
      });

      // Step 7: Select "Org B" from the donor's list and click "Save" button
      SelectDonorModal.selectDonors([testData.donorB.name]);
      SelectDonorModal.submitSelectedDonors();
      SelectDonorModal.assertModalClosed();
      OrderLines.verifyDonorFilterValues([testData.donorB.name]);
      OrderLines.assertTitlesInResults([
        testData.orderLineTitles.line1B,
        testData.orderLineTitles.line3,
        testData.orderLineTitles.line4,
      ]);
      OrderLines.verifyTitlesAbsentInResults([
        testData.orderLineTitles.line1A,
        testData.orderLineTitles.line2,
        testData.orderLineTitles.line5,
      ]);

      // Step 8: Click "Donor look-up" link in "Donor" accordion
      OrderLines.clickDonorLookUp();
      SelectDonorModal.waitLoading();
      SelectDonorModal.assertDonorsListIncludes([testData.donorA.name, testData.donorB.name]);
      SelectDonorModal.assertDonorsListIncludes([testData.vendor.name], {
        mode: LIST_ASSERTION_MODES.ABSENT,
      });

      // Step 9: Check the checkbox next to "Org A" and click "Save" button
      SelectDonorModal.selectDonors([testData.donorA.name]);
      SelectDonorModal.submitSelectedDonors();
      SelectDonorModal.assertModalClosed();
      OrderLines.verifyDonorFilterValues([testData.donorA.name, testData.donorB.name]);
      OrderLines.assertTitlesInResults([
        testData.orderLineTitles.line1A,
        testData.orderLineTitles.line1B,
        testData.orderLineTitles.line2,
        testData.orderLineTitles.line3,
        testData.orderLineTitles.line4,
      ]);
      OrderLines.verifyTitlesAbsentInResults([testData.orderLineTitles.line5]);

      // Step 10: Select "Orders" option, expand "Vendor" accordion and click "Organization look-up"
      Orders.selectOrdersPane();
      Orders.waitLoading();
      Orders.clickVendorLookUp();
      SelectOrganizationModal.verifyModalView();

      // Step 11: Expand "Types" accordion and expand the dropdown
      SelectOrganizationModal.expandTypesAccordion();
      SelectOrganizationModal.openTypesDropdown();
      SelectOrganizationModal.verifyTypesDropdownOptions([testData.organizationType.name]);

      // Step 12: Select type from Preconditions item #1 from appeared dropdown
      SelectOrganizationModal.selectOrganizationType(testData.organizationType.name);
      SelectOrganizationModal.verifySelectedOrganizationType(testData.organizationType.name);
      SelectOrganizationModal.verifyOrganizationInResultsList(testData.vendor.name);

      // Step 13: Click organization from Preconditions item #3 in "Organizations" pane
      SelectOrganizationModal.selectOrganizationByName(testData.vendor.name);
      SelectOrganizationModal.verifyClosed();
      Orders.verifyVendorFilterValue(testData.vendor.name);
      testData.orders.forEach((order) => Orders.checkSearchResults(order.poNumber));
    },
  );
});
