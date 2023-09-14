import uuid from 'uuid';
import devTeams from '../../../../support/dictionary/devTeams';
import testTypes from '../../../../support/dictionary/testTypes';
import OverdueFinePolicies from '../../../../support/fragments/settings/circulation/fee-fine/overdueFinePolicies';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenu from '../../../../support/fragments/topMenu';
import permissions from '../../../../support/dictionary/permissions';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import generateItemBarcode from '../../../../support/utils/generateItemBarcode';
import LoanPolicy from '../../../../support/fragments/circulation/loan-policy';
import OverdueFinePolicy from '../../../../support/fragments/circulation/overdue-fine-policy';
import LostItemFeePolicy from '../../../../support/fragments/circulation/lost-item-fee-policy';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import CheckOutActions from '../../../../support/fragments/check-out-actions/check-out-actions';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Checkout from '../../../../support/fragments/checkout/checkout';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import NewFeeFine from '../../../../support/fragments/users/newFeeFine';
import OtherSettings from '../../../../support/fragments/settings/circulation/otherSettings';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

// TO DO remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => {
  return false;
});

describe('ui-circulation-settings: overdue fine policies management', () => {
  let userData;
  let originalCirculationRules;
  let addedCirculationRule;
  const minutes = 5;
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const instanceData = {
    title: `Instance ${getRandomPostfix()}`,
    itemBarcode: generateItemBarcode(),
  };
  const patronGroup = {
    name: 'feeGroupTest' + getRandomPostfix(),
  };
  const loanPolicyBody = {
    id: uuid(),
    name: `renewable_${getRandomPostfix()}`,
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
  const overdueFinePolicyBody = {
    id: uuid(),
    name: `automationOverdueFinePolicy${getRandomPostfix()}`,
    overdueFine: { quantity: '1.00', intervalId: 'minute' },
    countClosed: true,
    maxOverdueFine: '999999.99',
    maxOverdueRecallFine: '999999.99',
    overdueRecallFine: { quantity: '3.00', intervalId: 'minute' },
    forgiveOverdueFine: false,
    gracePeriodRecall: true,
  };
  const lostItemFeePolicyBody = {
    name: '1_lost' + getRandomPostfix(),
    chargeAmountItem: {
      chargeType: 'anotherCost',
      amount: 100,
    },
    lostItemProcessingFee: 25,
    chargeAmountItemPatron: true,
    chargeAmountItemSystem: false,
    returnedLostItemProcessingFee: false,
    replacedLostItemProcessingFee: true,
    replacementProcessingFee: 10,
    replacementAllowed: true,
    lostItemReturned: 'Charge',
    id: uuid(),
  };
  const userOwnerBody = {
    id: uuid(),
    owner: 'AutotestOwner' + getRandomPostfix(),
    servicePointOwner: [
      {
        value: testData.userServicePoint.id,
        label: testData.userServicePoint.name,
      },
    ],
  };

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
        cy.createLoanType({
          name: `type_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: instanceData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: instanceData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
          instanceData.holdingId = specialInstanceIds.holdingIds[0].id;
          instanceData.itemId = specialInstanceIds.holdingIds[0].itemIds;
        });
      });
    OtherSettings.setOtherSettingsViaApi({ prefPatronIdentifier: 'barcode,username' });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    LostItemFeePolicy.createViaApi(lostItemFeePolicyBody);
    LoanPolicy.createViaApi(loanPolicyBody);
    OverdueFinePolicy.createViaApi(overdueFinePolicyBody);
    UsersOwners.createViaApi(userOwnerBody);
    CirculationRules.getViaApi().then((circulationRule) => {
      originalCirculationRules = circulationRule.rulesAsText;
      const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
      ruleProps.l = loanPolicyBody.id;
      ruleProps.i = lostItemFeePolicyBody.id;
      ruleProps.o = overdueFinePolicyBody.id;
      addedCirculationRule = `t ${testData.loanTypeId}: i ${ruleProps.i} l ${ruleProps.l} r ${ruleProps.r} o ${ruleProps.o} n ${ruleProps.n}`;
      CirculationRules.addRuleViaApi(
        originalCirculationRules,
        ruleProps,
        't ',
        testData.loanTypeId,
      );
    });
    cy.createTempUser(
      [
        permissions.checkoutAll.gui,
        permissions.checkinAll.gui,
        permissions.loansAll.gui,
        permissions.uiUsersfeefinesView.gui,
      ],
      patronGroup.name,
    ).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userData.userId,
        testData.userServicePoint.id,
      );
    });
  });

  after('delete test data', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    LoanPolicy.deleteApi(loanPolicyBody.id);
    OverdueFinePolicy.deleteViaApi(overdueFinePolicyBody.id);
    LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
    NewFeeFine.getUserFeesFines(userData.userId).then((userFeesFines) => {
      const feesFinesData = userFeesFines.accounts;
      feesFinesData.forEach(({ id }) => {
        cy.deleteFeesFinesApi(id);
      });
    });
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.deleteItemViaApi(instanceData.itemId);
    cy.deleteHoldingRecordViaApi(instanceData.holdingId);
    InventoryInstance.deleteInstanceViaApi(instanceData.instanceId);
    UsersOwners.deleteViaApi(userOwnerBody.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C5557: Verify that you can create/edit/delete overdue fine policies (vega)',
    { tags: [devTeams.vega, testTypes.smoke] },
    () => {
      cy.loginAsAdmin();
      // TODO add check that name is unique
      cy.visit(SettingsMenu.circulationoVerdueFinePoliciesPath);

      const overduePolicyProps = ['1.00', '2.00', '3.00', '4.00'];
      const editedOverduePolicyProps = ['5.00', '6.00', '7.00', '8.00'];

      OverdueFinePolicies.openCreatingForm();
      OverdueFinePolicies.checkCreatingForm();
      // TODO remove force option (Do not use force on click and type calls)
      OverdueFinePolicies.checkOverDueFineInCreating();
      OverdueFinePolicies.fillGeneralInformation(overduePolicyProps);
      OverdueFinePolicies.save();
      OverdueFinePolicies.verifyCreatedFines(overduePolicyProps);

      OverdueFinePolicies.openEditingForm();
      OverdueFinePolicies.checkEditingForm(overduePolicyProps);
      OverdueFinePolicies.fillGeneralInformation(editedOverduePolicyProps);
      OverdueFinePolicies.save();
      OverdueFinePolicies.verifyCreatedFines(editedOverduePolicyProps);

      OverdueFinePolicies.delete();
      OverdueFinePolicies.linkIsAbsent();
    },
  );

  it(
    'C9267: Verify that overdue fines calculated properly based on "Overdue fine" amount and interval setting (spitfire)',
    { tags: [devTeams.spitfire, testTypes.smoke, testTypes.broken] },
    () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.checkOutPath,
        waiter: Checkout.waitLoading,
      });
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.checkOutItem(instanceData.itemBarcode);
      CheckOutActions.openLoanDetails();
      CheckOutActions.changeDueDateToPast(minutes);
      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItem(instanceData.itemBarcode);
      CheckInActions.checkFeeFinesDetails(
        minutes,
        instanceData.itemBarcode,
        loanPolicyBody.name,
        overdueFinePolicyBody.name,
        lostItemFeePolicyBody.name,
      );
    },
  );
});
