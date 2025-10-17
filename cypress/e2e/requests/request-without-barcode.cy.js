import { ITEM_STATUS_NAMES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordEdit from '../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import RequestsSearchResultsPane from '../../support/fragments/requests/requestsSearchResultsPane';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Choose requester without a barcode', () => {
  let userData = {};
  let servicePoint = {};
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `AT_C10956_Instance1_${getRandomPostfix()}`,
  };

  let requestId;
  let defaultLocation;
  let instanceId;

  before('Prepare test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi();
      })
      .then((circDesk1ServicePoint) => {
        servicePoint = circDesk1ServicePoint;
        itemData.servicePointId = servicePoint.id;
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
        Location.createViaApi(defaultLocation);
      })
      .then((location) => {
        defaultLocation = location;
        cy.getInstanceTypes({ limit: 1 });
      })
      .then((instanceTypes) => {
        itemData.instanceTypeId = instanceTypes[0].id;
        cy.getHoldingTypes({ limit: 1 });
      })
      .then((res) => {
        itemData.holdingTypeId = res[0].id;
        cy.getLoanTypes({ limit: 1 });
      })
      .then((res) => {
        itemData.loanTypeId = res[0].id;
        cy.getDefaultMaterialType();
      })
      .then((res) => {
        itemData.materialTypeId = res.id;
        itemData.materialTypeName = res.name;
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: itemData.instanceTypeId,
            title: itemData.instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: itemData.holdingTypeId,
              permanentLocationId: defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: itemData.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
            },
          ],
        });
      })
      .then((instance) => {
        instanceId = instance.instanceId;
        cy.createTempUser([Permissions.uiRequestsAll.gui, Permissions.inventoryAll.gui]);
      })
      .then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointsViaApi(
          [itemData.servicePointId],
          userData.userId,
          itemData.servicePointId,
        );
      })
      .then(() => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.requestsPath,
          waiter: RequestsSearchResultsPane.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(requestId);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    Users.deleteViaApi(userData.userId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
  });

  it(
    'C745 C10956 Request without barcode (vega)',
    { tags: ['extendedPath', 'vega', 'C745', 'C10956'] },
    () => {
      // Click "Actions" button => "+New request" option
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage();
      NewRequest.verifyItemBarcodeFieldValue('');
      NewRequest.enterItemInfo(itemData.barcode);
      NewRequest.verifyItemInformation([itemData.barcode, ITEM_STATUS_NAMES.AVAILABLE]);

      // Fill out remaining data and click "Save and close" button
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.verifyRequesterInformation(userData.username, userData.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      NewRequest.choosePickupServicePoint(servicePoint.name);
      NewRequest.saveRequestAndClose();
      cy.wait('@createRequest').then((intercept) => {
        requestId = intercept.response.body.id;
        cy.location('pathname').should('eq', `/requests/view/${requestId}`);
      });

      NewRequest.verifyRequestSuccessfullyCreated(userData.username);
      RequestDetail.waitLoading();
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: 'Open - Not yet filled',
        level: REQUEST_LEVELS.ITEM,
      });

      // Go to inventory and find the item
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.waitLoading();
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', itemData.barcode);
      ItemRecordView.waitLoading();

      // Verify requests count is 1
      ItemRecordView.verifyRequestsCount(1);

      // Remove barcode and save
      ItemRecordView.openItemEditForm(itemData.instanceTitle);
      ItemRecordEdit.addBarcode('');
      ItemRecordEdit.saveAndClose({});

      // Verify item no longer has a barcode
      ItemRecordView.checkBarcode('No value set-');

      // Navigate to inventory instance to access the item without barcode
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.waitLoading();
      InventorySearchAndFilter.searchByParameter('Title (all)', itemData.instanceTitle);
      InventoryInstance.waitLoading();
      InventoryInstance.openHoldingsAccordion(defaultLocation.name);
      InventoryInstance.openItemByBarcode('No barcode');
    },
  );
});
