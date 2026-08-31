import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
} from '../../../support/constants';
import { BasicOrderLine, OrderLineEditForm } from '../../../support/fragments/orders';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import Organizations from '../../../support/fragments/organizations/organizations';
import { Permissions } from '../../../support/dictionary';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

Cypress.on('uncaught:exception', () => false);

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      location: {},
      materialType: {},
      acquisitionMethod: {},
      order: {},
      orderLine: {},
      user: {},
    };

    const polData = {
      itemDetails: {
        title: `autotest_pol_title_${getRandomPostfix()}`,
      },
      poLineDetails: {
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
        orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        materialType: MATERIAL_TYPE_NAMES.TEXT,
      },
      costDetails: {
        physicalUnitPrice: '20',
        quantityPhysical: '1',
      },
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then(
        (organizationId) => {
          testData.organization.id = organizationId;
        },
      );
    };

    const fetchReferenceData = () => {
      return cy
        .getLocations({ limit: 1, query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` })
        .then((location) => {
          testData.location = location;
        })
        .then(() => cy.getBookMaterialType())
        .then((materialType) => {
          testData.materialType = materialType;
        })
        .then(() => cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        }))
        .then(({ body }) => {
          testData.acquisitionMethod = body.acquisitionMethods[0];
        });
    };

    const createOrderWithOrderLine = () => {
      return Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
      })
        .then((orderResponse) => {
          testData.order = orderResponse;

          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: orderResponse.id,
              acquisitionMethod: testData.acquisitionMethod.id,
              specialLocationId: testData.location.id,
              specialMaterialTypeId: testData.materialType.id,
            }),
          );
        })
        .then((orderLineResponse) => {
          testData.orderLine = orderLineResponse;
        });
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        createOrganization().then(fetchReferenceData).then(createOrderWithOrderLine);
      });

      cy.createTempUser([
        Permissions.uiOrdersCreate.gui,
        Permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.ordersPurchaseOrderLinesLimit,
          waiter: SettingsOrders.waitLoadingPurchaseOrderLinesLimit,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C15497 Increase purchase order lines limit (items for receiving includes "Order closed" statuses) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C15497', 'nonParallel'] },
      () => {
        // Step 1-2: Increase purchase order lines limit to 2
        SettingsOrders.setPurchaseOrderLinesLimit(2);

        // Step 3: Add PO line
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
        Orders.selectFromResultsList(testData.order.poNumber);
        OrderLines.addPOLine();
        OrderLineEditForm.fillOrderLineFields(polData);
        OrderLineEditForm.clickAddLocationButton();
        OrderLineEditForm.expandLocationDropdown(0);
        OrderLineEditForm.selectLocationFromDropdown(testData.location.name);
        OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1' }]);
        OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });

        // Step 4: Add another PO line
        OrderLines.backToEditingOrder();
        Orders.createPOLineViaActions();

        // Step 5: Check that the modal appears
        Orders.checkPurchaseOrderLineLimitReachedModal();
        Orders.clickOkinPOLLimitModal();
        Orders.createPOLineViaActions();
        Orders.clickCreateNewOrderInPOLLimitModal();
      },
    );
  });
});
