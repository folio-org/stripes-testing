import uuid from 'uuid';
import devTeams from '../../../../support/dictionary/devTeams';
import testTypes from '../../../../support/dictionary/testTypes';
import OverdueFinePolicies from '../../../../support/fragments/settings/circulation/fee-fine/overdueFinePolicies';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenu from '../../../../support/fragments/topMenu';
import Permissions from '../../../../support/dictionary/permissions';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import generateItemBarcode from '../../../../support/utils/generateItemBarcode';
import LoanPolicy from '../../../../support/fragments/circulation/loan-policy';

import FixedDueDateSchedules from '../../../../support/fragments/circulation/fixedDueDateSchedules';
import OverdueFinePolicy from '../../../../support/fragments/circulation/overdue-fine-policy';
import LostItemFeePolicy from '../../../../support/fragments/circulation/lost-item-fee-policy';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import CheckOutActions from '../../../../support/fragments/check-out-actions/check-out-actions';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';

// TO DO remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => {
  return false;
});

describe('ui-circulation-settings: overdue fine policies management', () => {
  const minutes = 5;
  const patronGroup = {
    name: 'feeGroupTest' + getRandomPostfix()
  };
  const userData = {};
  const instance = {
    instanceName: `feeInstanceTest_${getRandomPostfix()}`,
    instanceBarcode: generateItemBarcode(),
  };
  const loanPolicyBody = (scheduleId) => {
    return {
      id: uuid(),
      name: getTestEntityValue(),
      loanable: true,
      loansPolicy: {
        profileId: 'Rolling',
        period: { duration: 1, intervalId: 'Minutes' },
        itemLimit: 1,
        closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE',
        fixedDueDateScheduleId: scheduleId
      },
      renewable: false,
    };
  };
  const ownerData = {};
  let loanPolicy;
  const overdueFinePolicyBody = {
    countClosed: true,
    forgiveOverdueFine: true,
    gracePeriodRecall: true,
    maxOverdueFine: '99999.00',
    maxOverdueRecallFine: '99999.00',
    name: getTestEntityValue(),
    description: 'description',
    id: uuid(),
    'overdueFine': { 'quantity': '1.00', 'intervalId': 'minute' },
    'overdueRecallFine': { 'quantity': '3.00', 'intervalId': 'minute' }
  };
  let overdueFinePolicy;
  let lostItemFeePolicy;
  let originalCirculationRules;
  let servicePoint;

  before('create test data', () => {
    cy.getAdminToken();

    PatronGroups.createViaApi(patronGroup.name)
      .then(res => {
        patronGroup.id = res;
        cy.createTempUser([
          Permissions.requestsAll.gui
        ], patronGroup.name)
          .then(userProperties => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
            userData.barcode = userProperties.barcode;
            userData.lastname = userProperties.lastName;
          });
      }).then(() => {
        InventoryInstances.createInstanceViaApi(instance.instanceName, instance.instanceBarcode);
      }).then(() => {
        FixedDueDateSchedules.createViaApi()
          .then((schedule) => {
            LoanPolicy.createViaApi(loanPolicyBody(schedule.id))
              .then((policy) => {
                loanPolicy = policy;
              });
          }).then(() => {
            OverdueFinePolicy.createApi(overdueFinePolicyBody).then((overdueBody) => {
              overdueFinePolicy = overdueBody;
            });
          }).then(() => {
            LostItemFeePolicy.createViaApi().then((lostItemFeeBody) => {
              lostItemFeePolicy = lostItemFeeBody;
            });
          })
          .then(() => {
            CirculationRules.getViaApi().then((circulationRules) => {
              originalCirculationRules = circulationRules;
            }).then(() => {
              const positionReqPolicyId = originalCirculationRules.rulesAsText.search('r ');
              const positionPatronNoticePolicyId = originalCirculationRules.rulesAsText.search('n ');
              const positionOverdueFinePolicyId = originalCirculationRules.rulesAsText.search('o ');
              const newRule = {
                id: originalCirculationRules.id,
                rulesAsText: originalCirculationRules.rulesAsText + `\nm all: l ${loanPolicy.id} ${originalCirculationRules.rulesAsText.substring(positionReqPolicyId, positionPatronNoticePolicyId)}${originalCirculationRules.rulesAsText.substring(positionPatronNoticePolicyId, positionOverdueFinePolicyId)}o ${overdueFinePolicy.id} i ${lostItemFeePolicy.id}`,
              };
              CirculationRules.updateViaApi(newRule);

              ServicePoints.getViaApi().then((res) => {
                servicePoint = res;
              }).then(() => {
                UsersOwners.createViaApi({ ...UsersOwners.getDefaultNewOwner(uuid(), 'owner'), servicePointOwner: [{ value: servicePoint[1].id, label: servicePoint[1].name }] }).then(({ id, ownerName }) => {
                  ownerData.name = ownerName;
                  ownerData.id = id;
                });
              });
            });
          });
      });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.instanceBarcode);
    LoanPolicy.deleteApi(loanPolicy.id);
    OverdueFinePolicy.deleteApi(overdueFinePolicy.id);
    LostItemFeePolicy.deleteViaApi(lostItemFeePolicy.id);
    CirculationRules.updateViaApi(originalCirculationRules);
    UsersOwners.deleteViaApi(ownerData.id);
  });

  beforeEach('Log in', () => {
    cy.loginAsAdmin();
  });

  it('C5557: Verify that you can create/edit/delete overdue fine policies (spitfire)', { tags: [devTeams.spitfire, testTypes.smoke] }, () => {
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
  });

  it('C9267: Verify that overdue fines calculated properly based on "Overdue fine" amount and interval setting (spitfire)', { tags: [devTeams.spitfire, testTypes.smoke, testTypes.broken] }, function () {
    cy.visit(TopMenu.checkOutPath);
    CheckOutActions.checkOutUser(userData.barcode);
    CheckOutActions.checkOutItem(instance.instanceBarcode);
    CheckOutActions.confirmMultipieceCheckOut(instance.instanceBarcode);
    CheckOutActions.openLoanDetails();
    CheckOutActions.changeDueDateToPast(minutes);

    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(instance.instanceBarcode);
    CheckInActions.confirmMultipleItemsCheckin(instance.instanceBarcode);
    CheckInActions.checkFeeFinesDetails(minutes, instance.instanceBarcode, loanPolicy.name, overdueFinePolicy.name, lostItemFeePolicy.name);
  });
});
