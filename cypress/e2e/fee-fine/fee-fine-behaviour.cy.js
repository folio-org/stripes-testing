import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import Users from '../../support/fragments/users/users';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';

describe('Manual Fees/Fines', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const ownerBody = {
    ...UsersOwners.getDefaultNewOwner(),
    servicePointOwner: [
      {
        value: testData.servicePoint.id,
        label: testData.servicePoint.name,
      },
    ],
  };

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    UsersOwners.createViaApi(ownerBody).then((ownerResponse) => {
      testData.ownerId = ownerResponse.id;
    });
    cy.createTempUser([Permissions.uiFeeFines.gui]).then((userData) => {
      testData.user = userData;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.user.userId,
        testData.servicePoint.id,
      );
      cy.login(userData.username, userData.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    UsersOwners.deleteViaApi(testData.ownerId);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C449 Verify behavior when "Create fee/fine" button pressed within User Information (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      // Find active user in FOLIO
      UsersSearchPane.searchByKeywords(testData.user.username);
      // Go to User Information for patron
      UsersSearchPane.selectUserFromList(testData.user.username);
      UsersCard.waitLoading();
      // Expand Fee/Fine section of User Information
      UsersCard.openFeeFines();
      // Press Create fee/fine button
      UsersCard.startFeeFineAdding();
      // New fee/fine page will open as shown in attachment
      NewFeeFine.waitLoading();
      NewFeeFine.checkInitialState(
        { ...testData.user, middleName: 'testMiddleName' },
        ownerBody.name,
      );
    },
  );

  it(
    'C450 Verify behavior when "New fee/fine" button pressed within Fee/Fine History (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      // Find active user in FOLIO
      UsersSearchPane.searchByKeywords(testData.user.username);
      // Go to User Information for patron
      UsersSearchPane.selectUserFromList(testData.user.username);
      UsersCard.waitLoading();
      // Expand Fee/Fine section of User Information
      UsersCard.openFeeFines();
      // Click on "View all fees/fines" link
      UsersCard.viewAllFeesFines();
      // Click on "Actions" button > select "+ New fee/fine" action
      UserAllFeesFines.createFeeFine();
      // "New fee/fine" modal opened
      NewFeeFine.waitLoading();
      NewFeeFine.checkInitialState(
        { ...testData.user, middleName: 'testMiddleName' },
        ownerBody.name,
      );
    },
  );
});
