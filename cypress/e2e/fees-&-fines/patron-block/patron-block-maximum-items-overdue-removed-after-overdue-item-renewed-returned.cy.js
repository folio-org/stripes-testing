import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../support/fragments/checkout/checkout';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../../support/fragments/circulation/loan-policy';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Renewals from '../../../support/fragments/loans/renewals';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Conditions from '../../../support/fragments/settings/users/conditions';
import Limits from '../../../support/fragments/settings/users/limits';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import PaymentMethods from '../../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserLoans from '../../../support/fragments/users/loans/userLoans';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import generateUniqueItemBarcodeWithShift from '../../../support/utils/generateUniqueItemBarcodeWithShift';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe('Automated Patron Blocks', () => {
    const renewComment = `AutotestText${getRandomPostfix()}`;
    const blockMessage = `You have reached maximum number of overdue items as set by patron group${getRandomPostfix()}`;
    const patronGroup = {
      name: 'groupToPatronBlock' + getRandomPostfix(),
    };
    const userData = {};
    const itemsData = {
      itemsWithSeparateInstance: [
        { instanceTitle: `AT_C350654_Instance_${getRandomPostfix()}` },
        { instanceTitle: `AT_C350654_Instance_${getRandomPostfix()}` },
        { instanceTitle: `AT_C350654_Instance_${getRandomPostfix()}` },
        { instanceTitle: `AT_C350654_Instance_${getRandomPostfix()}` },
        { instanceTitle: `AT_C350654_Instance_${getRandomPostfix()}` },
      ],
    };
    const testData = {
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const owner = {
      body: {
        owner: 'AutotestOwner' + getRandomPostfix(),
        servicePointOwner: [
          {
            value: testData.userServicePoint.id,
            label: testData.userServicePoint.name,
          },
        ],
      },
      data: {},
    };
    const loanPolicyBody = {
      id: uuid(),
      name: `1_loan_${getRandomPostfix()}`,
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
        period: {
          duration: 1,
          intervalId: 'Minutes',
        },
        profileId: 'Rolling',
      },
      renewable: true,
      renewalsPolicy: {
        unlimited: true,
        renewFromId: 'SYSTEM_DATE',
      },
    };

    const findPatron = () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
    };

    before('Preconditions', () => {
      itemsData.itemsWithSeparateInstance.forEach((item, index) => {
        item.barcode = generateUniqueItemBarcodeWithShift(index);
      });

      cy.getAdminToken()
        .then(() => {
          ServicePoints.createViaApi(testData.userServicePoint);
          testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
          Location.createViaApi(testData.defaultLocation);
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.createLoanType({
            name: `type_${getRandomPostfix()}`,
          }).then((res) => {
            testData.loanTypeId = res.id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          itemsData.itemsWithSeparateInstance.forEach((item, index) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: item.instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocation.id,
                },
              ],
              items: [
                {
                  barcode: item.barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
              ],
            }).then((specialInstanceIds) => {
              itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
              itemsData.itemsWithSeparateInstance[index].holdingId =
                specialInstanceIds.holdingIds[0].id;
              itemsData.itemsWithSeparateInstance[index].itemId =
                specialInstanceIds.holdingIds[0].itemIds;
            });
          });
        })
        .then(() => {
          LoanPolicy.createViaApi(loanPolicyBody);
          CirculationRules.addRuleViaApi({ t: testData.loanTypeId }, { l: loanPolicyBody.id }).then(
            (newRule) => {
              testData.addedRule = newRule;
            },
          );
        });

      UsersOwners.createViaApi(owner.body).then((response) => {
        owner.data = response;
        PaymentMethods.createViaApi(response.id).then((resp) => {
          testData.paymentMethodId = resp.id;
        });
      });
      PatronGroups.createViaApi(patronGroup.name).then((res) => {
        patronGroup.id = res;
      });
      cy.createTempUser(
        [
          permissions.uiUsersSettingsOwners.gui,
          permissions.loansAll.gui,
          permissions.overridePatronBlock.gui,
          permissions.uiUsersCreatePatronConditions.gui,
          permissions.uiUsersCreatePatronLimits.gui,
          permissions.checkinAll.gui,
          permissions.checkoutAll.gui,
          permissions.uiUsersView.gui,
          permissions.uiCirculationCreateViewOverdueFinesPolicies.gui,
        ],
        patronGroup.name,
      )
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
          userData.barcode = userProperties.barcode;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id,
          );
          cy.login(userData.username, userData.password,
            { path: SettingsMenu.conditionsPath, waiter: Conditions.waitLoading });
          Conditions.select('Maximum number of overdue items');
          Conditions.setConditionState(blockMessage);
          cy.visit(SettingsMenu.limitsPath);
          cy.wait(3000);
          Limits.selectGroup(patronGroup.name);
          Limits.setLimit('Maximum number of overdue items', '4');
        });
    });

    beforeEach('Assign lost status to items', () => {
      cy.wrap(itemsData.itemsWithSeparateInstance).as('items');
      cy.get('@items').each((item) => {
        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: item.barcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.userServicePoint.id,
          userBarcode: userData.barcode,
        });
      });

      UserLoans.changeDueDateForAllOpenPatronLoans(userData.userId, -1);
      Users.waitForAutomatedPatronBlocksForUser(userData.userId, 4 * 60);
    });

    afterEach('Returning items to original state', () => {
      cy.get('@items').each((item) => {
        CheckInActions.checkinItemViaApi({
          itemBarcode: item.barcode,
          servicePointId: testData.userServicePoint.id,
          checkInDate: new Date().toISOString(),
        });
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      PaymentMethods.deleteViaApi(testData.paymentMethodId);
      UsersOwners.deleteViaApi(owner.data.id);
      cy.deleteLoanPolicy(loanPolicyBody.id);
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      Users.deleteViaApi(userData.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
      cy.get('@items').each((item, index) => {
        cy.deleteItemViaApi(item.itemId);
        cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
        InventoryInstance.deleteInstanceViaApi(
          itemsData.itemsWithSeparateInstance[index].instanceId,
        );
      });
      Conditions.resetConditionViaApi('Maximum number of overdue items');

      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
      cy.deleteLoanType(testData.loanTypeId);
    });
    it(
      'C350654 Verify automated patron block "Maximum number of overdue items" removed after overdue item renewed (vega)',
      { tags: ['criticalPath', 'vega', 'C350654'] },
      () => {
        findPatron();
        UsersCard.waitLoading();
        cy.wait(2000);
        Users.checkIsPatronBlocked(blockMessage, 'Borrowing, Renewals, Requests');

        const itemForRenew = itemsData.itemsWithSeparateInstance[0];
        UsersCard.viewCurrentLoans();
        UserLoans.openLoanDetails(itemForRenew.barcode);
        UserLoans.renewItem(itemForRenew.barcode, true);
        Renewals.renewBlockedPatron(renewComment);

        cy.wait(10000);
        findPatron();
        cy.wait(2000);
        Users.checkPatronIsNotBlocked(userData.userId);
        Users.checkPatronIsNotBlockedViaApi(userData.userId);
      },
    );

    it(
      'C350649 Verify automated patron block "Maximum number of overdue items" removed after overdue item returned (vega)',
      { tags: ['criticalPath', 'vega', 'C350649'] },
      () => {
        findPatron();
        UsersCard.waitLoading();
        cy.wait(2000);
        Users.checkIsPatronBlocked(blockMessage, 'Borrowing, Renewals, Requests');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
        const itemForCheckIn = itemsData.itemsWithSeparateInstance[0];
        CheckInActions.checkInItemGui(itemForCheckIn.barcode);
        CheckInActions.verifyLastCheckInItem(itemForCheckIn.barcode);

        cy.wait(10000);
        findPatron();
        cy.wait(2000);
        Users.checkPatronIsNotBlocked(userData.userId);
        Users.checkPatronIsNotBlockedViaApi(userData.userId);
      },
    );
  });
});
