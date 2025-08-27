import moment from 'moment';
import uuid from 'uuid';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import UserEdit from '../../../support/fragments/users/userEdit';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import permissions from '../../../support/dictionary/permissions';
import Checkout from '../../../support/fragments/checkout/checkout';
import AppPaths from '../../../support/fragments/app-paths';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import checkInActions from '../../../support/fragments/check-in-actions/checkInActions';
import LostItemFeePolicy from '../../../support/fragments/circulation/lost-item-fee-policy';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import NewFeeFine from '../../../support/fragments/users/newFeeFine';
import Users from '../../../support/fragments/users/users';
import UserLoans from '../../../support/fragments/users/loans/userLoans';
import LoansPage from '../../../support/fragments/loans/loansPage';
import SearchPane from '../../../support/fragments/circulation-log/searchPane';
import TopMenu from '../../../support/fragments/topMenu';

describe('Loans', () => {
  describe('Loans: Anonymization', () => {
    let userData;
    const ownerData = UsersOwners.getDefaultNewOwner();
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const lostItemFeePolicyBody = {
      name: getTestEntityValue('1_lost'),
      itemAgedLostOverdue: {
        duration: 1,
        intervalId: 'Minutes',
      },
      patronBilledAfterAgedLost: {
        duration: 1,
        intervalId: 'Minutes',
      },
      chargeAmountItem: {
        amount: '0.00',
        chargeType: 'actualCost',
      },
      lostItemProcessingFee: '10.00',
      chargeAmountItemPatron: true,
      chargeAmountItemSystem: true,
      lostItemChargeFeeFine: {
        duration: 6,
        intervalId: 'Weeks',
      },
      returnedLostItemProcessingFee: false,
      replacedLostItemProcessingFee: false,
      replacementProcessingFee: '0.00',
      replacementAllowed: false,
      feesFinesShallRefunded: {
        duration: 6,
        intervalId: 'Months',
      },
      lostItemReturned: 'Charge',
      id: uuid(),
    };

    before(() => {
      cy.getAdminToken()
        .then(() => {
          cy.getAdminSourceRecord().then((record) => {
            testData.adminSourceRecord = record;
          });
          ServicePoints.createViaApi(testData.servicePoint);
          testData.defaultLocation = Locations.getDefaultLocation({
            servicePointId: testData.servicePoint.id,
          }).location;
          cy.createLoanType({
            name: getTestEntityValue('loanType'),
          }).then((loanType) => {
            testData.loanTypeId = loanType.id;
            testData.folioInstances = InventoryInstances.generateFolioInstances({
              itemsProperties: { permanentLoanType: { id: testData.loanTypeId } },
              itemsCount: 2,
            });
          });
        })
        .then(() => {
          Locations.createViaApi(testData.defaultLocation).then((location) => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstances,
              location,
            });
          });
        })
        .then(() => {
          UsersOwners.createViaApi({
            ...ownerData,
            servicePointOwner: [
              {
                value: testData.servicePoint.id,
                label: testData.servicePoint.name,
              },
            ],
          }).then((ownerResponse) => {
            testData.ownerId = ownerResponse.id;
          });
        })
        .then(() => {
          LostItemFeePolicy.createViaApi(lostItemFeePolicyBody);
          CirculationRules.addRuleViaApi(
            { t: testData.loanTypeId },
            { i: lostItemFeePolicyBody.id },
          ).then((newRule) => {
            testData.addedRule = newRule;
          });
        })
        .then(() => {
          cy.createTempUser([
            permissions.uiUsersViewLoans.gui,
            permissions.uiUserLoansAnonymize.gui,
          ]).then((userProperties) => {
            userData = userProperties;
            UserEdit.addServicePointViaApi(
              testData.servicePoint.id,
              userData.userId,
              testData.servicePoint.id,
            );
          });
        })
        .then(() => {
          testData.itemBarcodes = testData.folioInstances[0].barcodes;
          testData.itemIds = testData.folioInstances[0].itemIds;
          cy.wrap(testData.itemBarcodes).each((itemBarcode) => {
            Checkout.checkoutItemViaApi({
              itemBarcode,
              userBarcode: userData.barcode,
              servicePointId: testData.servicePoint.id,
            });
          });
          UserLoans.getUserLoansIdViaApi(userData.userId).then((userLoans) => {
            UserLoans.declareLoanLostViaApi(
              {
                servicePointId: testData.servicePoint.id,
                declaredLostDateTime: moment.utc().format(),
              },
              userLoans.loans.filter(({ itemId }) => itemId === testData.itemIds[0])[0].id,
            );
          });
          cy.wrap(testData.itemBarcodes).each((itemBarcode) => {
            checkInActions.checkinItemViaApi({
              itemBarcode,
              servicePointId: testData.servicePoint.id,
              checkInDate: moment.utc().format(),
            });
          });
          cy.login(userData.username, userData.password, {
            path: AppPaths.getClosedLoansPath(userData.userId),
            waiter: LoanDetails.waitLoading,
          });
        });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
      NewFeeFine.getUserFeesFines(userData.userId).then((userFeesFines) => {
        const feesFinesData = userFeesFines.accounts;
        feesFinesData.forEach(({ id }) => {
          cy.deleteFeesFinesApi(id);
        });
      });
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(userData.userId);
      UsersOwners.deleteViaApi(ownerData.id);
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      cy.deleteLoanType(testData.loanTypeId);
      Locations.deleteViaApi(testData.defaultLocation);
    });

    it(
      'C9217 Manual anonymization in closed loans (volaris)',
      { tags: ['smoke', 'volaris', 'C9217', 'eurekaPhase1'] },
      () => {
        LoanDetails.anonymizeAllLoans();
        LoanDetails.checkAnonymizeAllLoansModalOpen();
        LoanDetails.confirmAnonymizeAllLoans();
        LoanDetails.checkAnonymizeModalOpen();
        LoanDetails.closeAnonymizeModal();
        LoansPage.verifyResultsInTheRow([
          testData.itemBarcodes[0],
          lostItemFeePolicyBody.lostItemProcessingFee,
        ]);
      },
    );

    it(
      'C17136 Filter circulation log by Anonymized (volaris)',
      { tags: ['criticalPath', 'volaris', 'C17136', 'eurekaPhase1'] },
      () => {
        const searchResultsData = {
          userBarcode: '-',
          itemBarcode: testData.itemBarcodes[1],
          object: 'Loan',
          circAction: 'Anonymized',
          source: 'System',
        };
        cy.loginAsAdmin({
          path: TopMenu.circulationLogPath,
          waiter: SearchPane.waitLoading,
        });
        SearchPane.setFilterOptionFromAccordion('loan', searchResultsData.circAction);
        SearchPane.findResultRowIndexByContent(searchResultsData.itemBarcode).then((rowIndex) => {
          SearchPane.checkResultSearch(searchResultsData, rowIndex);
        });
        SearchPane.resetResults();
        SearchPane.searchByItemBarcode(testData.itemBarcodes[1]);
        SearchPane.findResultRowIndexByContent(searchResultsData.itemBarcode).then((rowIndex) => {
          SearchPane.checkResultSearch(searchResultsData, rowIndex);
        });
      },
    );
  });
});
