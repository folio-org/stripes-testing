import { Permissions } from '../../../support/dictionary';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Renewals from '../../../support/fragments/loans/renewals';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import UserLoans from '../../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  describe('Loans: Renewals', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      folioInstance: InventoryInstances.generateFolioInstances({ count: 1 }),
    };

    const userData = {};
    const blockData = {
      description: 'Manual patron block for renewal override test',
      title: 'Patron blocked from renewing',
    };
    const overrideComment = 'Override patron block for testing';

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Location.createViaApi(testData.defaultLocation).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstance,
            location,
          });
        });
      });

      cy.createTempUser([
        Permissions.uiUsersView.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.loansRenew.gui,
        Permissions.overridePatronBlock.gui,
        Permissions.checkoutAll.gui,
        Permissions.uiUsersPatronBlocks.gui,
      ])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
          userData.barcode = userProperties.barcode;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.folioInstance[0].barcodes[0],
            servicePointId: testData.servicePoint.id,
            userBarcode: userData.barcode,
          });
          cy.createBlockApi({
            desc: blockData.description,
            borrowing: false,
            renewals: true,
            requests: false,
            type: 'Manual',
            userId: userData.userId,
          }).then((body) => {
            blockData.id = body.id;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      testData.folioInstance.forEach((item) => {
        InventoryInstances.deleteInstanceViaApi({
          instance: item,
          servicePoint: testData.servicePoint,
          shouldCheckIn: true,
        });
      });
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
      cy.deleteBlockApi(blockData.id);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C170386 Renewal: Override patron block (vega)',
      { tags: ['smoke', 'vega', 'C170386'] },
      () => {
        const itemBarcode = testData.folioInstance[0].barcodes[0];

        // Steps 1-3: Navigate to User app and search for patron with block
        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
        UsersSearchPane.searchByKeywords(userData.username);
        UsersCard.waitLoading();
        cy.wait(2000);

        // Steps 4-5: Open loans accordion and view open loans
        UsersCard.viewCurrentLoans();
        cy.wait(1000);

        // Step 6: Attempt to renew - verify block modal appears
        UserLoans.openLoanDetails(itemBarcode);
        UserLoans.renewItem(itemBarcode, true);
        Renewals.verifyModal(blockData.title, blockData.description);
        Renewals.verifyBlockModalButtons();

        // Step 7: Click Close button - verify modal closes
        Renewals.closeBlockModal();
        Renewals.verifyBlockModalClosed(blockData.title);

        // Step 8: Repeat renewal attempt
        UserLoans.renewItem(itemBarcode, true);
        Renewals.verifyModal(blockData.title, blockData.description);

        // Step 9: Close without acting on renewal
        Renewals.closeBlockModal();
        Renewals.verifyBlockModalClosed(blockData.title);

        // Step 10: Repeat renewal attempt again
        UserLoans.renewItem(itemBarcode, true);
        Renewals.verifyModal(blockData.title, blockData.description);

        // Step 11: Click Override button - verify override modal appears
        Renewals.clickOverrideButton();
        Renewals.verifyOverridePatronBlockModal();

        // Step 12: Fill comment and save override
        Renewals.fillOverrideCommentAndSave(overrideComment);
        Renewals.verifyOverrideModalClosed();

        // Verify renewal completed with override
        LoanDetails.checkAction(0, 'Renewed through override');
      },
    );
  });
});
