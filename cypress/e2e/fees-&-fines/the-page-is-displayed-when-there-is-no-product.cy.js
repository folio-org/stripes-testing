import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import UsersCard from '../../support/fragments/users/usersCard';
import { getTestEntityValue } from '../../support/utils/stringTools';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ConfirmDeleteItemModal from '../../support/fragments/inventory/modals/confirmDeleteItemModal';
import Users from '../../support/fragments/users/users';

describe('Fees&Fines', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    ownerData: {},
  };
  const patronGroup = {
    name: getTestEntityValue('GroupCircLog'),
  };
  let itemBarcode;
  const ownerBody = {
    id: uuid(),
    owner: getTestEntityValue('AutotestOwner'),
    servicePointOwner: [
      {
        value: testData.servicePoint.id,
        label: testData.servicePoint.name,
      },
    ],
  };

  before('Create test data', () => {
    cy.getAdminToken();

    UsersOwners.createViaApi(ownerBody).then(({ id, owner }) => {
      testData.ownerData.id = id;
      testData.ownerData.name = owner;
    });
    ManualCharges.createViaApi({
      defaultAmount: '100.0',
      automatic: false,
      feeFineType: getTestEntityValue('FeeFineType'),
      ownerId: ownerBody.id,
    }).then((manualCharges) => {
      testData.manualChargeId = manualCharges.id;
      testData.manualChargeName = manualCharges.feeFineType;
      testData.manualChargeAmount = manualCharges.Amount;
    });

    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.servicePoint.id,
    }).location;
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    cy.getUsers({ limit: 1, query: '((barcode=" *") and active=="true")' }).then((users) => {
      testData.requester = users[0];
    });
    itemBarcode = testData.folioInstances[0].barcodes[0];
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });

    cy.createTempUser(
      [
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
        Permissions.uiFeeFines.gui,
        Permissions.checkinAll.gui,
        Permissions.checkoutAll.gui,
      ],
      patronGroup.name,
    ).then((user) => {
      testData.user = user;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.user.userId,
        testData.servicePoint.id,
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.checkOutPath,
        waiter: Checkout.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
      testData.folioInstances[0].instanceId,
    );
    NewFeeFine.getUserFeesFines(testData.user.userId).then((userFeesFines) => {
      userFeesFines.accounts.forEach(({ id }) => {
        cy.deleteFeesFinesApi(id);
      });
    });
    ManualCharges.deleteViaApi(testData.manualChargeId);
    UsersOwners.deleteViaApi(testData.ownerData.id);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C358152 Check that "Fee/fine details" page displayed if Item is missing (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C358152'] },
    () => {
      CheckOutActions.checkOutUser(testData.user.barcode);
      CheckOutActions.checkOutItem(itemBarcode);
      Checkout.verifyResultsInTheRow([itemBarcode]);

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(testData.user.username);
      UsersSearchPane.waitLoading();
      UsersSearchPane.openUser(testData.user.userId);

      UsersCard.viewCurrentLoans();
      UserLoans.createNewFeeFine(itemBarcode, testData.ownerData.name, testData.manualChargeName);
      UserLoans.openLoanDetails(itemBarcode);

      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.checkInItemGui(itemBarcode);
      CheckInPane.checkResultsInTheRow([itemBarcode, 'Available']);

      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', itemBarcode);
      ItemRecordView.waitLoading();
      ItemRecordView.clickDeleteButton();
      ConfirmDeleteItemModal.clickDeleteButton();

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(testData.user.username);
      UsersSearchPane.waitLoading();
      UsersSearchPane.openUser(testData.user.userId);

      UsersCard.openFeeFines();
      UsersCard.showOpenedFeeFines();
      UsersCard.selectFeeFines(testData.ownerData.name);
      FeeFineDetails.waitLoading();
    },
  );
});
