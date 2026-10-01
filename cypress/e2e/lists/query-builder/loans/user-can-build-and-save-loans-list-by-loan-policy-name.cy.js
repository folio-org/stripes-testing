import uuid from 'uuid';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { LOANS_FIELDS } from '../../../../support/constants/query-builder';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import LoanPolicy from '../../../../support/fragments/circulation/loan-policy';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import Checkout from '../../../../support/fragments/checkout/checkout';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1464126';
const titlePrefix = `AT_${testCaseId}`;
const listData = {
  name: `${titlePrefix}_Loans_by_loan_policy_name`,
};
const testData = {
  loanPolicy: {
    name: `${titlePrefix}_LoanPolicy_${getRandomPostfix()}`,
    id: uuid.v4(),
  },
  user: {
    username: `${titlePrefix}_user_${getRandomPostfix()}`,
    firstName: 'User',
    userId: null,
    barcode: null,
  },
  materialType: null,
  circulationRule: null,
  instanceId: null,
};

let user;
let servicePoint;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Loans', () => {
      before('Create test data', () => {
        const createOpenLoanForUser = () => {
          return InventoryInstances.getLocations({ limit: 1 }).then((locations) => {
            const itemBarcode = `${titlePrefix}_${testData.user.firstName}_${getRandomPostfix()}`;
            const instanceTitle = `${titlePrefix}_${testData.user.firstName}_Loan_${getRandomPostfix()}`;
            const locationId = locations[0].id;

            return InventoryInstances.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              return InventoryInstances.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                return InventoryInstances.getLoanTypes({ limit: 1 }).then((loanTypes) => {
                  return InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: instanceTitle,
                    },
                    holdings: [
                      {
                        holdingsTypeId: holdingTypes[0].id,
                        permanentLocationId: locationId,
                      },
                    ],
                    items: [
                      {
                        barcode: itemBarcode,
                        status: { name: 'Available' },
                        permanentLoanType: { id: loanTypes[0].id },
                        materialType: { id: testData.materialType.id },
                      },
                    ],
                  }).then(({ instanceId }) => {
                    testData.instanceId = instanceId;

                    return Checkout.checkoutItemViaApi({
                      itemBarcode,
                      servicePointId: servicePoint.id,
                      userBarcode: testData.user.barcode,
                    });
                  });
                });
              });
            });
          });
        };

        cy.getAdminToken()
          .then(() => cy.getBookMaterialType())
          .then((bookMaterialType) => {
            testData.materialType = bookMaterialType;
            return LoanPolicy.createRenewableLoanPolicyApi(testData.loanPolicy);
          })
          .then(() => {
            servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
            return ServicePoints.createViaApi(servicePoint);
          })
          .then(() => {
            CirculationRules.addRuleViaApi(
              { m: testData.materialType.id },
              { l: testData.loanPolicy.id },
            );
          })
          .then((addedRule) => {
            testData.circulationRule = addedRule;
            return cy.createTempUser([]);
          })
          .then((createdUser) => {
            testData.user.username = createdUser.username;
            testData.user.userId = createdUser.userId;
            testData.user.barcode = createdUser.barcode;
            return createOpenLoanForUser();
          })
          .then(() => {
            return cy.createTempUser([]).then((userProperties) => {
              user = userProperties;

              cy.assignCapabilitiesToExistingUser(
                userProperties.userId,
                [],
                [
                  CapabilitySets.moduleListsManage,
                  CapabilitySets.uiUsersView,
                  CapabilitySets.uiInventory,
                  CapabilitySets.circulationStorageManage,
                ],
              );

              cy.login(user.username, user.password, {
                path: TopMenu.listsPath,
                waiter: Lists.waitLoading,
              });
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);

        if (testData.circulationRule) {
          CirculationRules.deleteRuleViaApi(testData.circulationRule);
        }

        if (testData.instanceId) {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        }

        if (servicePoint && servicePoint.id) {
          ServicePoints.deleteViaApi(servicePoint.id);
        }

        if (testData.loanPolicy && testData.loanPolicy.id) {
          LoanPolicy.deleteApi(testData.loanPolicy.id);
        }

        if (testData.user && testData.user.userId) {
          Users.deleteViaApi(testData.user.userId);
        }

        if (user && user.userId) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        'C1464126 User can build and save a Loans list queried by Loan policy — Name (athena)',
        { tags: ['extendedPath', 'athena', 'C1464126'] },
        () => {
          // Step 1: Click "New" button at the top-right of the page
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.selectRecordType(Lists.recordTypes.loans);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click "Build query" button
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 3: Click "Select field" dropdown and select the field "Loan policy — Name"
          QueryModal.selectField(LOANS_FIELDS.LOAN_POLICY.NAME);
          QueryModal.verifySelectedField(LOANS_FIELDS.LOAN_POLICY.NAME);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(testData.loanPolicy.name);
          QueryModal.verifyQueryAreaContent(`(lpolicy.name == ${testData.loanPolicy.name})`);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.user.barcode,
            LOANS_FIELDS.LOAN_POLICY.NAME,
            testData.loanPolicy.name,
          );

          // Step 4-7: Click "Run query & save" button
          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);
            Lists.verifyQuery(`lpolicy.name == ${testData.loanPolicy.name}`);
            Lists.verifyRefreshCompleteCallout(recordCount);

            Lists.viewUpdatedList();
            Lists.verifyResultCellByIdentifier(
              testData.user.barcode,
              LOANS_FIELDS.LOAN_POLICY.NAME,
              testData.loanPolicy.name,
            );
          });
        },
      );
    });
  });
});
