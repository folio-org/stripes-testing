import moment from 'moment';

import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import { BasicOrderLine, NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { Receivings } from '../../../support/fragments/receiving';
import ReceivingEditForm from '../../../support/fragments/receiving/receivingEditForm';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const today = moment().format('YYYY/MM/DD');
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      servicePoint: ServicePoints.getDefaultServicePoint(),
      materialType: MaterialTypes.getDefaultMaterialType(),
      location: {},
      order: {},
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint).then(() => {
          testData.location = Locations.getDefaultLocation({
            servicePointId: testData.servicePoint.id,
          }).location;

          Locations.createViaApi(testData.location);
        });

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          MaterialTypes.createMaterialTypeViaApi(testData.materialType);

          testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
            receiptStatus: 'Awaiting Receipt',
            orderFormat: 'Instance, holdings, item',
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
            },
          );
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.receivingPath,
          waiter: Receivings.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Orders.deleteOrderViaApi(testData.order.id);
        InventoryHoldings.deleteHoldingRecordByLocationIdViaApi(testData.location.id);
        Locations.deleteViaApi(testData.location);
        MaterialTypes.deleteViaApi(testData.materialType.id);
        ServicePoints.deleteViaApi(testData.servicePoint.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C374122 Editing title in "Receiving" app (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C374122'] },
      () => {
        // Search for selected title from Preconditions item #2
        Receivings.searchByParameter({
          parameter: 'Title (Receiving titles)',
          value: testData.orderLine.titleOrPackage,
        });

        // Click on <Title name> link
        const ReceivingDetails = Receivings.selectFromResultsList(
          testData.orderLine.titleOrPackage,
        );
        ReceivingDetails.checkButtonsConditions([
          { label: 'Collapse all', conditions: { disabled: false } },
        ]);
        ReceivingDetails.checkReceivingDetails({
          orderLineDetails: [{ key: 'POL number', value: `${testData.order.poNumber}-1` }],
          expected: [{ format: 'Physical' }],
          received: [],
        });

        // Click "Edit" button on the third pane
        ReceivingDetails.editReceivingItem();
        ReceivingEditForm.checkReceivingFormContent({
          itemDetails: { title: testData.orderLine.titleOrPackage },
          lineDetails: { poLineNumber: `${testData.order.poNumber}-1` },
        });

        // Make some changes (f.e. change "Publication date" filed)
        ReceivingEditForm.fillReceivingsFields({
          itemDetails: { publishedDate: today },
        });

        // Click "Save & close" button
        ReceivingEditForm.clickSaveButton();

        // Click "<Title name>" link on the third pane
        const InventoryInstance = ReceivingDetails.openInstanceDetails();
        InventoryInstance.verifyInstancePublisher({
          publisher: 'No value set-',
          role: 'No value set-',
          place: 'No value set-',
          date: 'No value set-',
        });
      },
    );
  });
});
