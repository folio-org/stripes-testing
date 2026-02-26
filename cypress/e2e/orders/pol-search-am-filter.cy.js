import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
  VENDOR_NAMES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { BasicOrderLine, OrderLines, Orders } from '../../support/fragments/orders';
import Organizations from '../../support/fragments/organizations/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    describe('Orders Export to a Vendor', () => {
      let user;
      let orderNumber;
      let purchaseOrderId;
      const order = {
        id: uuid(),
        vendor: '',
        orderType: 'One-Time',
        approved: true,
        reEncumber: true,
      };
      const acquisitionMethodNames = [
        ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER,
        ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM,
        ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
      ];
      const poLines = [
        {
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
        },
        {
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
        },
        {
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
        },
      ];

      before(() => {
        cy.getAdminToken();
        Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` }).then(
          (organization) => {
            order.vendor = organization.id;

            Orders.createOrderViaApi(order).then((orderResponse) => {
              purchaseOrderId = orderResponse.id;
              orderNumber = orderResponse.poNumber;

              cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
                (location) => {
                  cy.getDefaultMaterialType().then((materialType) => {
                    acquisitionMethodNames.forEach((method, index) => {
                      cy.getAcquisitionMethodsApi({ query: `value="${method}"` }).then((resp) => {
                        poLines[index].locations = [
                          {
                            locationId: location.id,
                            quantity: 2,
                            quantityPhysical: 2,
                          },
                        ];
                        poLines[index].acquisitionMethod = resp.body.acquisitionMethods[0].id;
                        poLines[index].physical.materialType = materialType.id;
                        poLines[index].purchaseOrderId = purchaseOrderId;
                        poLines[index].physical.materialSupplier = order.vendor;

                        OrderLinesLimit.setPOLLimit(3);
                        OrderLines.createOrderLineViaApi(poLines[index]);
                      });
                    });
                  });
                },
              );
            });
          },
        );

        cy.createTempUser([
          Permissions.uiOrdersView.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrdersEdit.gui,
          Permissions.uiOrdersApprovePurchaseOrders.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
          Permissions.uiOrganizationsView.gui,
          Permissions.uiExportOrders.gui,
          Permissions.exportManagerAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
          Orders.selectOrdersPane();
          Orders.waitLoading();
        });
      });

      after(() => {
        cy.getAdminToken();
        Orders.deleteOrderViaApi(order.id);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C350603 Searching POL by specifying acquisition method (thunderjet)',
        { tags: ['criticalPath', 'thunderjet', 'C350603'] },
        () => {
          Orders.selectOrderLines();
          Orders.resetFiltersIfActive();
          acquisitionMethodNames.forEach((method, index) => {
            Orders.selectFilterAcquisitionMethod(method);
            Orders.checkOrderlineSearchResults(`${orderNumber}-${index + 1}`);
            Orders.resetFilters();
            cy.wait(2000);
          });
        },
      );
    });
  });
});
