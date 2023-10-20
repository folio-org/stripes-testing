import uuid from 'uuid';
import moment from 'moment';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TransferAccounts from '../../support/fragments/settings/users/transferAccounts';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import AddNewStaffInfo from '../../support/fragments/users/addNewStaffInfo';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

let userData = {};
const ownerData = {};
const feeFineType = {};
const paymentMethod = {};
const transferAccount = TransferAccounts.getDefaultNewTransferAccount(uuid());
let servicePointId;
let feeFineAccount;
const newStaffInfoMessage = 'information to check';
const item = {
  instanceName: `test_${getRandomPostfix()}`,
  barcode: getRandomPostfix(),
};

describe('circulation-log', () => {
  before('create test data', () => {
    cy.getAdminToken();
    ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
      servicePointId = servicePoints[0].id;
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
          paymentMethod.name = name;
          paymentMethod.id = id;
        });

        item.instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            item.itemId = res.id;
          },
        );

        cy.createTempUser([permissions.circulationLogAll.gui])
          .then((userProperties) => {
            userData = userProperties;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePointId, userData.userId);
            feeFineAccount = {
              id: uuid(),
              ownerId: ownerData.id,
              feeFineId: feeFineType.id,
              amount: 9,
              userId: userData.userId,
              feeFineType: feeFineType.name,
              feeFineOwner: ownerData.name,
              createdAt: servicePointId,
              dateAction: moment.utc().format(),
              source: 'ADMINISTRATOR, DIKU',
              instanceId: item.instanceId,
              itemId: item.itemId,
            };
            NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
              feeFineAccount.id = feeFineAccountId;
              AddNewStaffInfo.addNewStaffInfoViaApi(userData.userId, newStaffInfoMessage);
              cy.login(userData.username, userData.password, {
                path: TopMenu.circulationLogPath,
                waiter: SearchPane.waitLoading,
              });
            });
          });
      });
  });

  after('delete test data', () => {
    TransferAccounts.deleteViaApi(transferAccount.id);
    ManualCharges.deleteViaApi(feeFineType.id);
    PaymentMethods.deleteViaApi(paymentMethod.id);
    NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
    UsersOwners.deleteViaApi(ownerData.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C17047 Filter circulation log by staff information only added (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      const searchResultsData = {
        userBarcode: userData.barcode,
        itemBarcode: item.barcode,
        object: 'Fee/fine',
        circAction: 'Staff information only added',
        source: 'ADMINISTRATOR, Diku_admin',
      };

      SearchPane.setFilterOptionFromAccordion('fee', 'Staff information only added');
      SearchPane.verifyResultCells();
      SearchPane.checkResultSearch(searchResultsData);

      SearchPane.searchByItemBarcode(item.barcode);
      SearchPane.verifyResultCells();
      SearchPane.checkResultSearch(searchResultsData);
    },
  );

  it(
    'C17048 Check the Actions button from filtering Circulation log by Staff only information added (volaris)',
    { tags: [testTypes.criticalPath, devTeams.volaris] },
    () => {
      cy.loginAsAdmin({ path: TopMenu.circulationLogPath, waiter: SearchPane.waitLoading });
      SearchPane.setFilterOptionFromAccordion('fee', 'Staff information only added');
      SearchPane.findResultRowIndexByContent(userData.barcode).then((rowIndex) => {
        SearchResults.chooseActionByRow(rowIndex, 'Fee/fine details');
        FeeFineDetails.waitLoading();
        TopMenuNavigation.navigateToApp('Circulation log');
        SearchResults.chooseActionByRow(rowIndex, 'User details');
        Users.verifyFirstNameOnUserDetailsPane(userData.firstName);
        TopMenuNavigation.navigateToApp('Circulation log');
        SearchResults.clickOnCell(item.barcode, Number(rowIndex));
        ItemRecordView.waitLoading();
      });
    },
  );
});
