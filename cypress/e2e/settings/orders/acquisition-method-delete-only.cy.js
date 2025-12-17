import { v4 as uuid } from 'uuid';
import AcquisitionMethods from '../../../support/fragments/settings/orders/acquisitionMethods';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import OrderLines from '../../../support/fragments/orders/orderLines';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const testData = {
      acquisitionMethod1: {
        id: uuid(),
        value: `AU_name_${getRandomPostfix()}`,
      },
      acquisitionMethod2: {
        id: uuid(),
        value: `AU_name_${getRandomPostfix()}`,
      },
      organization: {},
      order: {},
      location: {},
      user: {},
    };

    const createOrderWithAcquisitionMethod = (
      vendorId,
      locationId,
      materialTypeId,
      acquisitionMethodId,
    ) => {
      const order = {
        ...NewOrder.getDefaultOrder({ vendorId }),
        orderType: 'One-Time',
      };

      return Orders.createOrderViaApi(order).then((orderResponse) => {
        testData.order = orderResponse;

        const orderLine = {
          ...BasicOrderLine.defaultOrderLine,
          purchaseOrderId: orderResponse.id,
          acquisitionMethod: acquisitionMethodId,
          locations: [{ locationId, quantity: 1, quantityPhysical: 1 }],
          cost: {
            listUnitPrice: 10.0,
            currency: 'USD',
            discountType: 'percentage',
            quantityPhysical: 1,
            poLineEstimatedPrice: 10.0,
          },
          physical: {
            createInventory: 'Instance, Holding, Item',
            materialType: materialTypeId,
            materialSupplier: vendorId,
            volumes: [],
          },
        };

        return OrderLines.createOrderLineViaApi(orderLine);
      });
    };

    before(() => {
      cy.getAdminToken();
      AcquisitionMethods.createNewAcquisitionMethodViaAPI(testData.acquisitionMethod1);
      AcquisitionMethods.createNewAcquisitionMethodViaAPI(testData.acquisitionMethod2);
      Organizations.createOrganizationViaApi({
        ...NewOrganization.defaultUiOrganizations,
        isVendor: true,
      })
        .then((organizationResponse) => {
          testData.organization = { id: organizationResponse };

          return ServicePoints.getViaApi().then((servicePoint) => {
            return NewLocation.createViaApi(
              NewLocation.getDefaultLocation(servicePoint[0].id),
            ).then((locationResponse) => {
              testData.location = locationResponse;

              return cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
                return createOrderWithAcquisitionMethod(
                  testData.organization.id,
                  testData.location.id,
                  materialType.id,
                  testData.acquisitionMethod2.id,
                );
              });
            });
          });
        })
        .then(() => {
          cy.createTempUser([permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
            (userProps) => {
              testData.user = userProps;
              cy.login(testData.user.username, testData.user.password, {
                path: SettingsMenu.acquisitionMethodsPath,
                waiter: AcquisitionMethods.waitLoading,
              });
            },
          );
        });
    });

    after(() => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Orders.deleteOrderViaApi(testData.order.id);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        AcquisitionMethods.deleteAcquisitionMethodViaAPI(testData.acquisitionMethod2.id);
      });
    });

    it(
      'C411608 A user with only "Settings (Orders): Can view and edit all settings" permission can create and delete acquisition method (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C411608'] },
      () => {
        AcquisitionMethods.checkcreatedAM(testData.acquisitionMethod1.value);
        AcquisitionMethods.checkcreatedAM(testData.acquisitionMethod2.value);
        AcquisitionMethods.deleteAcquisitionMethod(testData.acquisitionMethod1.value);
        AcquisitionMethods.deleteAcquisitionMethod(testData.acquisitionMethod2.value, false);
        AcquisitionMethods.checkSystemAcquisitionMethodCannotBeDeleted('Purchase');
      },
    );
  });
});
