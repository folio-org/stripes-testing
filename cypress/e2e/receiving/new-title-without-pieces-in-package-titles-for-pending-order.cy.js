import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingEditForm from '../../support/fragments/receiving/receivingEditForm';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  const testData = {};

  before('Create test data', () => {
    const randomPostfix = getRandomPostfix();
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C466284_Organization_${randomPostfix}`,
    };
    testData.packageName = `AT_C466284_PackagePOL_${randomPostfix}`;
    testData.titleName = `AT_C466284_Title_${randomPostfix}`;

    cy.getAdminToken();
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialTypeId = materialType.id;
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then(({ body }) => {
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });
    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.packageName,
            checkinItems: true,
            purchaseOrderId: order.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialTypeId,
            acquisitionMethod: testData.acquisitionMethodId,
          }),
          isPackage: true,
        }).then((orderLine) => {
          testData.orderLine = orderLine;
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiReceivingCreate,
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiInventoryInstanceView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receiving.verifyPageDisplayed,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Receiving.getTitleByPoLineIdViaApi(testData.orderLine.id).then((title) => {
      Orders.deleteOrderViaApi(testData.order.id);
      if (title?.instanceId) {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(title.instanceId);
      }
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C466284 Newly created title without added pieces appears in "Package titles" for pending ongoing "Package" order (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C466284'] },
    () => {
      const polNumber = testData.orderLine.poLineNumber;

      // Step 1: Click "Actions" button and select "New" option
      Receiving.clickNewTitleOption();
      Receiving.verifyNewTitlePageOpened();
      ReceivingEditForm.verifyTitleFieldEnabled(false);

      // Step 2: Click on "POL number look-up" link
      Receiving.clickPOLNumberLookUpButton();
      SelectOrderLinesModal.verifyModalView({ multiselect: false });

      // Step 3: Search for PO line from precondition #1 and select it
      SelectOrderLinesModal.searchByName(polNumber);
      SelectOrderLinesModal.selectOrderLineByNumber(polNumber, { multiselect: false });
      ReceivingEditForm.checkReceivingFormContent({ lineDetails: { poLineNumber: polNumber } });
      ReceivingEditForm.verifyTitleFieldEnabled(true);

      // Step 4: Enter any suitable name in "Title" field (not using "Title look-up" link)
      ReceivingEditForm.fillItemDetailsFields({ title: testData.titleName });

      // Step 5: Click "Save & close" button
      Receiving.clickSaveAndCloseInNewTitle(testData.titleName, polNumber);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.titleName);

      // Step 6: Click on the PO line number hyperlink
      Receiving.clickOnPOLnumber(polNumber);
      OrderLineDetails.waitLoading();
      OrderLines.verifyPackageTitlesAccordionExists();

      // Step 7: Expand "Package titles" accordion
      OrderLines.expandPackageTitles();
      OrderLines.verifyPackageTitlesCount(1);
      OrderLines.verifyPackageTitleExists(testData.titleName);

      // Step 8: Click on the link in "Title" column
      OrderLines.selectInstanceInPackageTitles(testData.titleName);
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.checkInstanceTitle(testData.titleName);
      InventoryInstance.verifyHoldingsAccordionsCount(0);
    },
  );
});
