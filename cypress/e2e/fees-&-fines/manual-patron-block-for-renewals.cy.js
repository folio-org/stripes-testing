import { Permissions } from '../../support/dictionary';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RenewalActions from '../../support/fragments/loans/renewals';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import InteractorsTools from '../../support/utils/interactorsTools';

function addPatronBlock(description, user) {
  return cy.createBlockApi({
    desc: description,
    borrowing: false,
    renewals: true,
    requests: false,
    type: 'Manual',
    userId: user.userId,
  });
}

describe('Fees&Fines', () => {
  describe('Manual Patron Blocks', () => {
    const testData = {
      folioInstances1: InventoryInstances.generateFolioInstances(),
      folioInstances2: InventoryInstances.generateFolioInstances(),
      folioInstances3: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const userData = {};

    const renewalsBlock = {
      title: 'Patron blocked from renewing',
      description1: 'manual patron block for Renewals 1',
      description2: 'manual patron block for Renewals 2',
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Location.createViaApi(testData.defaultLocation).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances1,
            location,
          });
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances2,
            location,
          });
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances3,
            location,
          });
        });
      });

      // user 1
      cy.createTempUser([
        Permissions.checkoutAll.gui,
        Permissions.uiUsersPatronBlocks.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.loansRenew.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.usersLoansRenewThroughOverride.gui,
      ])
        .then((userProperties) => {
          userData.user1 = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.user1.userId);
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.folioInstances1[0].barcodes[0],
            servicePointId: testData.servicePoint.id,
            userBarcode: userData.user1.barcode,
          });
          addPatronBlock(renewalsBlock.description1, userData.user1).then((body) => {
            renewalsBlock.id11 = body.id;
          });
        });

      // user 2
      cy.createTempUser([
        Permissions.checkoutAll.gui,
        Permissions.uiUsersPatronBlocks.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.loansRenew.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.usersLoansRenewThroughOverride.gui,
      ])
        .then((userProperties) => {
          userData.user2 = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.user2.userId);
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.folioInstances2[0].barcodes[0],
            servicePointId: testData.servicePoint.id,
            userBarcode: userData.user2.barcode,
          });
          addPatronBlock(renewalsBlock.description1, userData.user2).then((body) => {
            renewalsBlock.id21 = body.id;
          });
          addPatronBlock(renewalsBlock.description2, userData.user2).then((body) => {
            renewalsBlock.id22 = body.id;
          });
        });

      // user 3
      cy.createTempUser([
        Permissions.checkoutAll.gui,
        Permissions.uiUsersPatronBlocks.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.loansRenew.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.usersLoansRenewThroughOverride.gui,
      ])
        .then((userProperties) => {
          userData.user3 = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.user3.userId);
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.folioInstances3[0].barcodes[0],
            servicePointId: testData.servicePoint.id,
            userBarcode: userData.user3.barcode,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(userData.user1.userId, [
        testData.servicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(userData.user2.userId, [
        testData.servicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(userData.user3.userId, [
        testData.servicePoint.id,
      ]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      testData.folioInstances1.forEach((item) => {
        InventoryInstances.deleteInstanceViaApi({
          instance: item,
          servicePoint: testData.servicePoint,
          shouldCheckIn: true,
        });
      });
      testData.folioInstances2.forEach((item) => {
        InventoryInstances.deleteInstanceViaApi({
          instance: item,
          servicePoint: testData.servicePoint,
          shouldCheckIn: true,
        });
      });
      testData.folioInstances3.forEach((item) => {
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
      cy.deleteBlockApi(renewalsBlock.id11);
      cy.deleteBlockApi(renewalsBlock.id21);
      cy.deleteBlockApi(renewalsBlock.id22);
      Users.deleteViaApi(userData.user1.userId);
      Users.deleteViaApi(userData.user2.userId);
      Users.deleteViaApi(userData.user3.userId);
    });

    it(
      'C480 Verify that manual patron block for "Renewals" blocks renewals by patron (vega)',
      { tags: ['extendedPath', 'vega', 'C480'] },
      () => {
        cy.login(userData.user1.username, userData.user1.password);
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByKeywords(userData.user1.username);
        UsersCard.viewCurrentLoans(1, 0);
        RenewalActions.renewAllLoans();
        RenewalActions.verifyModal(renewalsBlock.title, renewalsBlock.description1);
        RenewalActions.viewBlockDetails();
        UsersCard.verifyPatronBlockDescription(1, renewalsBlock.description1);

        cy.login(userData.user2.username, userData.user2.password);
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByKeywords(userData.user2.username);
        UsersCard.viewCurrentLoans(1, 0);
        RenewalActions.renewAllLoans();
        RenewalActions.verifyModal(renewalsBlock.title, renewalsBlock.description1);
        RenewalActions.verifyModal(renewalsBlock.title, renewalsBlock.description2);
        RenewalActions.viewBlockDetails();
        UsersCard.verifyPatronBlockDescription(1, renewalsBlock.description2);
        UsersCard.verifyPatronBlockDescription(2, renewalsBlock.description1);

        cy.login(userData.user3.username, userData.user3.password);
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByKeywords(userData.user3.username);
        UsersCard.viewCurrentLoans(1, 0);
        RenewalActions.renewAllLoans();
        InteractorsTools.checkCalloutMessage(
          `The loan for ${testData.folioInstances3[0].instanceTitle} was successfully renewed.`,
        );
      },
    );
  });
});
