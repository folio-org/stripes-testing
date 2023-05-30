import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import { getTestEntityValue } from '../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import RefundReasons from '../../support/fragments/settings/users/refundReasons';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFaine from '../../support/fragments/users/payFeeFaine';
import RefundFeeFine from '../../support/fragments/users/refundFeeFine';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ItemRecordView from '../../support/fragments/inventory/itemRecordView';

describe('Circulation log', () => {
  const patronGroup = {
    name: getTestEntityValue('GroupCircLog'),
  };
  let userData;
  const itemData = {
    barcode: generateItemBarcode(),
    title: getTestEntityValue('InstanceCircLog'),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('autotestCircLog', uuid()),
  };
  const userOwnerBody = {
    id: uuid(),
    owner: getTestEntityValue('OwnerCircLog'),
    servicePointOwner: [
      {
        value: testData.userServicePoint.id,
        label: testData.userServicePoint.name,
      },
    ],
  };
  const refundReason = RefundReasons.getDefaultNewRefundReason(uuid());

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: itemData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: itemData.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          itemData.itemId = specialInstanceIds.holdingIds[0].itemIds;
        });
      });

    UsersOwners.createViaApi(userOwnerBody);
    ManualCharges.createViaApi({
      defaultAmount: '5',
      automatic: false,
      feeFineType: getTestEntityValue('ChargeCircLog'),
      ownerId: userOwnerBody.id,
    }).then((chargeRes) => {
      testData.manualChargeId = chargeRes.id;
      testData.manualChargeName = chargeRes.feeFineType;
    });
    PaymentMethods.createViaApi(userOwnerBody.id).then((paymentRes) => {
      testData.paymentMethodId = paymentRes.id;
      testData.paymentMethodName = paymentRes.name;
    });
    RefundReasons.createViaApi(refundReason);

    PatronGroups.createViaApi(patronGroup.name)
      .then((group) => {
        patronGroup.id = group;
        cy.createTempUser([permissions.circulationLogAll.gui], patronGroup.name)
          .then((userProperties) => {
            userData = userProperties;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              userData.userId,
              testData.userServicePoint.id
            );
          });
      })
      .then(() => {
        NewFeeFine.createViaApi({
          id: uuid(),
          ownerId: userOwnerBody.id,
          feeFineId: testData.manualChargeId,
          amount: 5,
          feeFineType: testData.manualChargeName,
          feeFineOwner: userOwnerBody.owner,
          userId: userData.userId,
          itemId: itemData.itemId[0],
          barcode: itemData.barcode,
          title: itemData.title,
        }).then((feeFineId) => {
          testData.feeFineId = feeFineId;
          PayFeeFaine.payFeeFineViaApi(
            {
              amount: '5.00',
              paymentMethod: testData.paymentMethodName,
              notifyPatron: false,
              servicePointId: testData.userServicePoint.id,
              userName: 'ADMINISTRATOR, DIKU',
            },
            feeFineId
          );
          RefundFeeFine.refundFeeFineViaApi(
            {
              amount: '5.00',
              paymentMethod: refundReason.nameReason,
              notifyPatron: false,
              servicePointId: testData.userServicePoint.id,
              userName: 'ADMINISTRATOR, DIKU',
            },
            feeFineId
          );
        });
      });

    cy.loginAsAdmin({
      path: TopMenu.circulationLogPath,
      waiter: SearchPane.waitLoading,
    });
  });

  after('Deleting created entities', () => {
    NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    RefundReasons.deleteViaApi(refundReason.id);
    ManualCharges.deleteViaApi(testData.manualChargeId);
    PaymentMethods.deleteViaApi(testData.paymentMethodId);
    UsersOwners.deleteViaApi(userOwnerBody.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id
    );
  });

  it(
    'C17058 Check the Actions button from filtering Circulation log by refunded fully (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      SearchPane.setFilterOptionFromAccordion('fee', 'Refunded fully');
      SearchPane.searchByItemBarcode(itemData.barcode);
      SearchPane.findResultRowIndexByContent('Refunded fully').then((rowIndex) => {
        SearchResults.chooseActionByRow(rowIndex, 'Fee/fine details');
        FeeFineDetails.waitLoading();
      });

      cy.visit(TopMenu.circulationLogPath);
      SearchPane.waitLoading();
      SearchPane.setFilterOptionFromAccordion('fee', 'Refunded fully');
      SearchPane.searchByItemBarcode(itemData.barcode);
      SearchPane.findResultRowIndexByContent('Refunded fully').then((rowIndex) => {
        SearchResults.chooseActionByRow(rowIndex, 'User details');
        Users.verifyFirstNameOnUserDetailsPane(userData.firstName);
      });

      cy.visit(TopMenu.circulationLogPath);
      SearchPane.waitLoading();
      SearchPane.setFilterOptionFromAccordion('fee', 'Refunded fully');
      SearchPane.searchByItemBarcode(itemData.barcode);
      SearchResults.clickOnCell(itemData.barcode, 0);
      ItemRecordView.waitLoading();
    }
  );
});
