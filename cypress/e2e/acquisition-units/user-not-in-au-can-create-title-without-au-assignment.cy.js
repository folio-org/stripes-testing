import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Receiving from '../../support/fragments/receiving/receiving';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';

describe('Acquisition Units', () => {
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = {
    ...NewOrder.getDefaultOngoingOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  let user;
  let servicePointId;
  let location;
  let orderLineTitle;
  let orderLineNumber;

  before(() => {
    cy.getAdminToken();

    AcquisitionUnits.createAcquisitionUnitViaApi({
      name: defaultAcquisitionUnit.name,
      protectRead: false,
      protectUpdate: true,
      protectCreate: true,
      protectDelete: true,
    }).then((acqUnitResponse) => {
      defaultAcquisitionUnit.id = acqUnitResponse.id;
    });

    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;

        MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
          (mtypes) => {
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((params) => {
              Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
                organization.id = responseOrganizations;
                order.vendor = organization.id;
                const orderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  cost: {
                    listUnitPrice: 100.0,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 100.0,
                  },
                  locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                  acquisitionMethod: params.body.acquisitionMethods[0].id,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: mtypes.body.id,
                    materialSupplier: responseOrganizations,
                    volumes: [],
                  },
                  isPackage: true,
                };
                Orders.createOrderViaApi(order).then((orderResponse) => {
                  order.id = orderResponse.id;
                  orderLine.purchaseOrderId = orderResponse.id;
                  OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                    orderLineNumber = orderLineResponse.poLineNumber;
                    Orders.updateOrderViaApi({
                      ...orderResponse,
                      workflowStatus: ORDER_STATUSES.OPEN,
                    });
                  });
                });
              });
            });
          },
        );
      });
    });

    cy.createTempUser([
      permissions.uiReceivingViewEditCreate.gui,
      permissions.uiReceivingAssignAcquisitionUnitsToNewTitle.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: TopMenu.receivingPath,
        waiter: Receiving.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    if (order.id) {
      Orders.deleteOrderViaApi(order.id);
    }
    if (defaultAcquisitionUnit.id) {
      AcquisitionUnits.deleteAcquisitionUnitViaApi(defaultAcquisitionUnit.id);
    }
  });

  it(
    'C430252 User not included in Acq unit is able to create a new Title but not able to assign an Acq unit to it (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C430252'] },
    () => {
      Receiving.clickNewTitleOption();
      Receiving.verifyNewTitlePageOpened();

      Receiving.checkAcquisitionUnitsDropdown(defaultAcquisitionUnit.name, false);

      Receiving.fillTitleLookup('*').then((selectedTitle) => {
        orderLineTitle = selectedTitle;
      });
      Receiving.fillPOLNumberLookup(orderLineNumber);

      Receiving.clickSaveAndCloseInNewTitle(orderLineTitle, orderLineNumber);

      Receiving.expandTitleInformationAccordion();
      Receiving.verifyAcquisitionUnitsNotSpecified();
    },
  );
});
