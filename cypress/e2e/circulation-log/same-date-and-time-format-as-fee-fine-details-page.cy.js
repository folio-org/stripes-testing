import uuid from 'uuid';
import moment from 'moment';
import { TestTypes, DevTeams, Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import TransferAccounts from '../../support/fragments/settings/users/transferAccounts';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';

describe('circulation-log', () => {
  const userData = {};
  const ownerData = {};
  const feeFineType = {};
  const transferAccount = TransferAccounts.getDefaultNewTransferAccount(uuid());
  let feeFineAccount;
  let servicePointId;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.getViaApi({ limit: 1 }).then((servicePoint) => {
      servicePointId = servicePoint[0].id;
    });

    UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner())
      .then(({ id, owner }) => {
        ownerData.name = owner;
        ownerData.id = id;
      })
      .then(() => {
        TransferAccounts.createViaApi({ ...transferAccount, ownerId: ownerData.id });
        ManualCharges.createViaApi({
          ...ManualCharges.defaultFeeFineType,
          ownerId: ownerData.id,
        }).then((manualCharge) => {
          feeFineType.id = manualCharge.id;
          feeFineType.name = manualCharge.feeFineType;
          feeFineType.amount = manualCharge.amount;
        });
        PaymentMethods.createViaApi(ownerData.id).then(({ name, id }) => {
          PaymentMethods.name = name;
          PaymentMethods.id = id;
        });

        cy.createTempUser([
          Permissions.circulationLogAll.gui,
          Permissions.uiUsersfeefinesView.gui,
          Permissions.uiUsersfeefinesCRUD.gui,
        ])
          .then((userProperties) => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePointId, userData.userId);
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
            NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
              feeFineAccount.id = feeFineAccountId;
              cy.login(userData.username, userData.password);
            });
          });
      });
  });

  after('Delete owner, transfer account, feeFineType, paymentMethod, user', () => {
    TransferAccounts.deleteViaApi(transferAccount.id);
    ManualCharges.deleteViaApi(feeFineType.id);
    PaymentMethods.deleteViaApi(PaymentMethods.id);
    NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
    UsersOwners.deleteViaApi(ownerData.id);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C350712 Check date and time --fee/fines (Firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      cy.visit(TopMenu.circulationLogPath);
      SearchPane.setFilterOptionFromAccordion('fee', 'Billed');
      // Get Billed Date value for the first row
      SearchResults.getBilledDate(0).then((expectedBilledDate) => {
        SearchResults.chooseActionByRow(0, 'Fee/fine details');
        FeeFineDetails.verifyBilledDateValue(expectedBilledDate);
      });
    },
  );
});
