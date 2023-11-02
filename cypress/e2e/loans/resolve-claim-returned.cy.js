import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import TopMenu from '../../support/fragments/topMenu';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import Checkout from '../../support/fragments/checkout/checkout';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';

describe('Loans: Claim returned', () => {
  const testData = {
    user: {},
    owner: UsersOwners.getDefaultNewOwner(),
    folioInstances: InventoryInstances.generateFolioInstances({
      count: 4,
    }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  let defaultLocation;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      UsersOwners.createViaApi({
        ...testData.owner,
        servicePointOwner: [{ value: testData.servicePoint.id, label: testData.servicePoint.name }],
      });
      ServicePoints.createViaApi(testData.servicePoint);
      defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
      Location.createViaApi(defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
    });

    cy.createTempUser([
      Permissions.uiUsersViewLoans.gui,
      Permissions.uiUsersLoansClaimReturnedMissing.gui,
      Permissions.uiUsersDeclareItemLost.gui,
      Permissions.uiNotesItemView.gui,
    ])
      .then((userProperties) => {
        testData.user = userProperties;
        UserEdit.addServicePointsViaApi(
          [testData.servicePoint.id],
          userProperties.userId,
          testData.servicePoint.id,
        );
        testData.folioInstances.forEach((item) => {
          item.barcodes.forEach((barcode) => {
            Checkout.checkoutItemViaApi({
              itemBarcode: barcode,
              servicePointId: testData.servicePoint.id,
              userBarcode: testData.user.barcode,
            }).then((resp) => {
              UserLoans.claimItemReturnedViaApi({ id: item.itemIds[0] }, resp.id);
            });
          });
        });
      })
      .then(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    UsersOwners.deleteViaApi(testData.owner.id);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    testData.folioInstances.forEach((item) => {
      InventoryInstances.deleteInstanceViaApi({
        instance: item,
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
    });
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C10960 Loans: Resolve claimed returned item (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      // Navigate to loan details for a loan where the item is claim returned
      UsersSearchPane.openUserCard(testData.user.username);
      UsersCard.viewCurrentLoans({
        openLoans: testData.folioInstances.length,
        returnedLoans: testData.folioInstances.length,
      });
      let selectedItem = testData.folioInstances[0];
      const LoansPage = UserLoans.openLoanDetails(selectedItem.barcodes[0]);

      // Open resolve claim dropdown & Select "Declare lost" & Click "Cancel"
      const ConfirmItemStatusModal = LoansPage.openDeclareLostModal();
      ConfirmItemStatusModal.verifyModalView({
        action: ITEM_STATUS_NAMES.DECLARED_LOST,
        item: selectedItem.instanceTitle,
      });
      ConfirmItemStatusModal.closeModal();
      LoansPage.verifyResultsInTheRow([ITEM_STATUS_NAMES.CLAIMED_RETURNED]);

      // Open resolve claim dropdown and select declare lost again. Fill out additional information text field.
      LoansPage.openDeclareLostModal();
      ConfirmItemStatusModal.confirmItemStatus();
      LoansPage.claimResolveButtonIsAbsent();
      LoansPage.verifyResultsInTheRow([ITEM_STATUS_NAMES.DECLARED_LOST]);

      // Close loan details.
      LoansPage.closeLoanDetails();
      UserLoans.closeLoansHistory();

      // Navigate to user's profile. Open Notes accordion
      UsersCard.expandNotesSection({ details: 'Claimed returned item marked declared lost' });
      UsersCard.viewCurrentLoans({
        openLoans: testData.folioInstances.length,
        returnedLoans: testData.folioInstances.length - 1,
      });

      // For a item status that is claimed returned, open the action menu.
      // Select declare lost for that item & Click "Confirm"
      selectedItem = testData.folioInstances[1];
      UserLoans.declareLoanLost(selectedItem.barcodes[0]);
      ConfirmItemStatusModal.confirmItemStatus();

      // Navigate to loan details for that loan.
      UserLoans.openLoanDetails(selectedItem.barcodes[0]);
      LoansPage.verifyResultsInTheRow([ITEM_STATUS_NAMES.DECLARED_LOST]);

      // Navigate to loan details for a loan with the item status claimed returned.
      LoansPage.closeLoanDetails();
      UserLoans.closeLoansHistory();
      UsersCard.viewCurrentLoans({
        openLoans: testData.folioInstances.length,
        returnedLoans: testData.folioInstances.length - 2,
      });

      // Open resolve claim dropdown and select mark as missing.
      selectedItem = testData.folioInstances[2];
      UserLoans.openLoanDetails(selectedItem.barcodes[0]);
      LoansPage.openMarkAsMissingModal();
      ConfirmItemStatusModal.verifyModalView({
        action: ITEM_STATUS_NAMES.MISSING,
        item: selectedItem.instanceTitle,
      });
      ConfirmItemStatusModal.closeModal();
      LoansPage.verifyResultsInTheRow([ITEM_STATUS_NAMES.CLAIMED_RETURNED]);

      // Reopen resolve claim dropdown and select mark as missing. Enter required information and select confirm.
      LoansPage.openMarkAsMissingModal();
      ConfirmItemStatusModal.confirmItemStatus();
      LoansPage.claimResolveButtonIsAbsent();
      LoansPage.verifyResultsInTheRow([ITEM_STATUS_NAMES.MARKED_AS_MISSING]);

      // Close loan details.
      LoansPage.closeLoanDetails();
      UserLoans.closeLoansHistory();

      // Navigate to user's profile. Open Notes accordion // TODO: need to check Notes
      UsersCard.viewCurrentLoans({
        openLoans: testData.folioInstances.length - 1,
        returnedLoans: testData.folioInstances.length - 3,
      });

      // For a item status that is claimed returned, open the action menu.
      // Select "Mark as missing" for that item & Click "Confirm"
      selectedItem = testData.folioInstances[3];
      UserLoans.markAsMissing(selectedItem.barcodes[0]);
      ConfirmItemStatusModal.confirmItemStatus();

      // Navigate to loan details for that loan.
      UserLoans.openLoanDetails(selectedItem.barcodes[0]);
      LoansPage.verifyResultsInTheRow([ITEM_STATUS_NAMES.MARKED_AS_MISSING]);

      // Navigate to user's profile. Open Notes accordion
      LoansPage.closeLoanDetails();
      UserLoans.closeLoansHistory();
      UsersCard.expandNotesSection({ details: 'Claimed returned item marked missing' });
      UsersCard.viewCurrentLoans({
        openLoans: testData.folioInstances.length - 2,
      });
    },
  );
});
