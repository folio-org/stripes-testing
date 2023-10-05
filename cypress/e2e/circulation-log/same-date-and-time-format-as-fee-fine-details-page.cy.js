import uuid from 'uuid';
import moment from 'moment';
import { TestTypes } from '../../support/dictionary';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import servicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import manualCharges from '../../support/fragments/settings/users/manualCharges';
import transferAccounts from '../../support/fragments/settings/users/transferAccounts';
import usersOwners from '../../support/fragments/settings/users/usersOwners';
import topMenu from '../../support/fragments/topMenu';
import newFeeFine from '../../support/fragments/users/newFeeFine';
import users from '../../support/fragments/users/users';
import userEdit from '../../support/fragments/users/userEdit';
import searchPane from '../../support/fragments/circulation-log/searchPane';
import searchResults from '../../support/fragments/circulation-log/searchResults';
import feeFineDetails from '../../support/fragments/users/feeFineDetails';
import paymentMethods from '../../support/fragments/settings/users/paymentMethods';

describe('circulation-log', () => {
  const userData = {};
  const ownerData = {};
  const feeFineType = {};
  const transferAccount = transferAccounts.getDefaultNewTransferAccount(uuid());
  let feeFineAccount;
  let servicePointId;

  before('Create test data', () => {
    cy.getAdminToken();
    servicePoints.getViaApi({ limit: 1 }).then((servicePoint) => {
      servicePointId = servicePoint[0].id;
    });

    usersOwners
      .createViaApi(usersOwners.getDefaultNewOwner())
      .then(({ id, owner }) => {
        ownerData.name = owner;
        ownerData.id = id;
      })
      .then(() => {
        transferAccounts.createViaApi({ ...transferAccount, ownerId: ownerData.id });
        manualCharges
          .createViaApi({
            ...manualCharges.defaultFeeFineType,
            ownerId: ownerData.id,
          })
          .then((manualCharge) => {
            feeFineType.id = manualCharge.id;
            feeFineType.name = manualCharge.feeFineType;
            feeFineType.amount = manualCharge.amount;
          });
        paymentMethods.createViaApi(ownerData.id).then(({ name, id }) => {
          paymentMethods.name = name;
          paymentMethods.id = id;
        });

        cy.createTempUser([
          permissions.uiUsersView.gui,
          permissions.uiUsersfeefinesCRUD.gui,
          permissions.uiUsersViewServicePoints.gui,
          permissions.uiUsersfeefinesView.gui,
          permissions.uiUsersManualCharge.gui,
          permissions.uiUsersManualPay.gui,
          permissions.uiUserAccounts.gui,
          permissions.circulationLogAll.gui,
        ])
          .then((userProperties) => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
            userData.barcode = userProperties.barcode;
            userData.firstName = userProperties.firstName;
          })
          .then(() => {
            userEdit.addServicePointViaApi(servicePointId, userData.userId);
            feeFineAccount = {
              id: uuid(),
              ownerId: ownerData.id,
              feeFineId: feeFineType.id,
              amount: 1,
              userId: userData.userId,
              feeFineType: feeFineType.name,
              feeFineOwner: ownerData.name,
              createdAt: servicePointId,
              dateAction: moment.utc().format(),
              source: 'ADMINISTRATOR, DIKU',
            };
            newFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
              feeFineAccount.id = feeFineAccountId;
              cy.login(userData.username, userData.password);
            });
          });
      });
  });

  after('Delete owner, transfer account, feeFineType, paymentMethod, user', () => {
    transferAccounts.deleteViaApi(transferAccount.id);
    manualCharges.deleteViaApi(feeFineType.id);
    paymentMethods.deleteViaApi(paymentMethods.id);
    newFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
    usersOwners.deleteViaApi(ownerData.id);
    users.deleteViaApi(userData.userId);
  });

  it(
    'C350712 Check date and time --fee/fines (Firebird)',
    { tags: [TestTypes.extendedPath, devTeams.firebird] },
    () => {
      cy.visit(topMenu.circulationLogPath);
      searchPane.searchByBilled();
      // Get Billed Date value for the first row
      searchResults.getBilledDate(0).then((expectedBilledDate) => {
        searchResults.chooseActionByRow(0, 'Fee/fine details');
        feeFineDetails.verifyBilledDateValue(expectedBilledDate);
      });
    },
  );
});
