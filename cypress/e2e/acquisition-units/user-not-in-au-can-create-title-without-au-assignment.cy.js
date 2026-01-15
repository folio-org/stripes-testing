import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

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
  let instanceTitle;
  let orderLineNumber;

  before(() => {
    cy.getAdminToken();

    Receiving.getExistingInstanceTitle().then((title) => {
      instanceTitle = title;
    });

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
      Permissions.uiReceivingViewEditCreate.gui,
      Permissions.uiReceivingAssignAcquisitionUnitsToNewTitle.gui,
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

      Receiving.fillTitleLookup(instanceTitle);
      Receiving.fillPOLNumberLookup(orderLineNumber);

      Receiving.clickSaveAndCloseInNewTitle(instanceTitle, orderLineNumber);

      Receiving.expandTitleInformationAccordion();
      ReceivingDetails.checkReceivingDetails({
        information: [{ key: 'Acquisition units', value: 'No value set' }],
      });
    },
  );
});
