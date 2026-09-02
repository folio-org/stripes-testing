import uuid from 'uuid';
import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  stringStoresUuidButMillionOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { LOANS_FIELDS } from '../../../../support/constants/query-builder';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import UserDepartments from '../../../../support/fragments/settings/users/departments';
import LoanPolicy from '../../../../support/fragments/circulation/loan-policy';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import Checkout from '../../../../support/fragments/checkout/checkout';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

const testCaseId = 'C1453683';
const titlePrefix = `AT_${testCaseId}`;
const listData = {
  name: `${titlePrefix}_Loans_by_department_UUID`,
};
const testData = {
  departments: [
    {
      name: `${titlePrefix}_Dept_A_${getRandomPostfix()}`,
      code: `deptA_${randomFourDigitNumber()}`,
      id: null,
    },
    {
      name: `${titlePrefix}_Dept_B_${getRandomPostfix()}`,
      code: `deptB_${randomFourDigitNumber()}`,
      id: null,
    },
  ],
  loanPolicies: [
    {
      name: `${titlePrefix}_LoanPolicy_1_${getRandomPostfix()}`,
      id: uuid.v4(),
    },
    {
      name: `${titlePrefix}_LoanPolicy_2_${getRandomPostfix()}`,
      id: uuid.v4(),
    },
  ],
  users: [
    {
      username: `${titlePrefix}_user1_${getRandomPostfix()}`,
      firstName: 'User1',
      lastName: 'DeptA',
      departmentIds: null, // will be set to Dept A
      userId: null,
      barcode: null,
      loanId: null,
    },
    {
      username: `${titlePrefix}_user2_${getRandomPostfix()}`,
      firstName: 'User2',
      lastName: 'DeptB',
      departmentIds: null, // will be set to Dept B
      userId: null,
      barcode: null,
      loanId: null,
    },
    {
      username: `${titlePrefix}_user3_${getRandomPostfix()}`,
      firstName: 'User3',
      lastName: 'DeptAB',
      departmentIds: null, // will be set to Dept A + Dept B
      userId: null,
      barcode: null,
      loanId: null,
    },
    {
      username: `${titlePrefix}_user4_${getRandomPostfix()}`,
      firstName: 'User4',
      lastName: 'NoDept',
      departmentIds: null, // no department
      userId: null,
      barcode: null,
      loanId: null,
    },
  ],
  materialTypes: {
    book: null,
    dvd: null,
  },
  circulationRules: [],
  instances: [],
};

let user;
let servicePoint;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Loans', () => {
      before('Create test data', () => {
        const createUserWithDepartments = (userData, departments) => {
          return cy.createTempUser([]).then((createdUser) => {
            userData.username = createdUser.username;
            userData.barcode = createdUser.barcode;
            userData.userId = createdUser.userId;
            userData.departmentIds = departments || [];

            return cy
              .getUsers({ limit: 1, query: `"username"="${createdUser.username}"` })
              .then((users) => {
                const userRecord = users[0];
                return cy.updateUser({
                  ...userRecord,
                  departments: departments || [],
                });
              });
          });
        };

        const createLoanForUser = ({ userData, materialType, isClosed = false }) => {
          return InventoryInstances.getLocations({ limit: 1 }).then((_locations) => {
            const itemBarcode = `${titlePrefix}_${userData.firstName}_${getRandomPostfix()}`;
            const instanceTitle = `${titlePrefix}_${userData.firstName}_Loan_${getRandomPostfix()}`;
            const locationId = _locations[0].id;

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
                        materialType: { id: materialType.id },
                      },
                    ],
                  }).then(({ instanceId }) => {
                    testData.instances.push(instanceId);

                    return Checkout.checkoutItemViaApi({
                      itemBarcode,
                      servicePointId: servicePoint.id,
                      userBarcode: userData.barcode,
                    }).then(() => {
                      if (isClosed) {
                        return CheckInActions.checkinItemViaApi({
                          itemBarcode,
                          servicePointId: servicePoint.id,
                          checkInDate: new Date().toISOString(),
                        });
                      }

                      return null;
                    });
                  });
                });
              });
            });
          });
        };

        cy.getAdminToken()
          .then(() => UserDepartments.createViaApi(testData.departments[0]))
          .then((deptId) => {
            testData.departments[0].id = deptId;
            return UserDepartments.createViaApi(testData.departments[1]);
          })
          .then((deptId) => {
            testData.departments[1].id = deptId;
            return cy.getBookMaterialType();
          })
          .then((bookMaterialType) => {
            testData.materialTypes.book = bookMaterialType;
            return cy.getDvdMaterialType();
          })
          .then((dvdMaterialType) => {
            testData.materialTypes.dvd = dvdMaterialType;
            return LoanPolicy.createRenewableLoanPolicyApi(testData.loanPolicies[0]);
          })
          .then(() => LoanPolicy.createRenewableLoanPolicyApi(testData.loanPolicies[1]))
          .then(() => {
            return CirculationRules.addRuleViaApi(
              { m: testData.materialTypes.book.id },
              { l: testData.loanPolicies[0].id },
            );
          })
          .then((bookAddedRule) => {
            testData.circulationRules.push(bookAddedRule);
            return CirculationRules.addRuleViaApi(
              { m: testData.materialTypes.dvd.id },
              { l: testData.loanPolicies[1].id },
            );
          })
          .then((dvdAddedRule) => {
            testData.circulationRules.push(dvdAddedRule);
          })
          .then(() => {
            servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
            return ServicePoints.createViaApi(servicePoint);
          })
          .then(() => {
            return createUserWithDepartments(testData.users[0], [testData.departments[0].id]).then(
              () => createUserWithDepartments(testData.users[1], [testData.departments[1].id]),
            );
          })
          .then(() => {
            return createUserWithDepartments(testData.users[2], [
              testData.departments[0].id,
              testData.departments[1].id,
            ]).then(() => createUserWithDepartments(testData.users[3], []));
          })
          .then(() => {
            return createLoanForUser({
              userData: testData.users[0],
              materialType: testData.materialTypes.book,
              isClosed: false,
            }).then(() => {
              return createLoanForUser({
                userData: testData.users[1],
                materialType: testData.materialTypes.book,
                isClosed: true,
              });
            });
          })
          .then(() => {
            return createLoanForUser({
              userData: testData.users[2],
              materialType: testData.materialTypes.dvd,
              isClosed: false,
            }).then(() => {
              return createLoanForUser({
                userData: testData.users[3],
                materialType: testData.materialTypes.dvd,
                isClosed: false,
              });
            });
          })
          .then(() => {
            return cy.createTempUser([
              Permissions.listsAll.gui,
              Permissions.uiUsersView.gui,
              Permissions.inventoryAll.gui,
              Permissions.circulationLogAll.gui,
              Permissions.uiUsersViewLoans.gui,
            ]);
          })
          .then((userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);

        testData.circulationRules.forEach((addedRule) => {
          if (addedRule) {
            CirculationRules.deleteRuleViaApi(addedRule);
          }
        });

        testData.users.forEach((testUser) => {
          if (testUser.userId) {
            Users.deleteViaApi(testUser.userId);
          }
        });

        testData.instances.forEach((instanceId) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
        });

        if (servicePoint && servicePoint.id) {
          ServicePoints.deleteViaApi(servicePoint.id);
        }

        testData.loanPolicies.forEach((policy) => {
          if (policy.id) {
            LoanPolicy.deleteApi(policy.id);
          }
        });

        testData.departments.forEach((dept) => {
          if (dept.id) {
            UserDepartments.deleteViaApi(dept.id);
          }
        });

        if (user && user.userId) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        "C1453683 User can build and save a Loans list queried by a user's department UUID and by loan policy UUID (athena)",
        { tags: ['extendedPath', 'athena', 'C1453683'] },
        () => {
          // Step 1: Create new list with Loans record type
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.selectRecordType(Lists.recordTypes.loans);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Build query
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 3: Query by User — Department UUIDs equals Dept-A-UUID
          QueryModal.selectField(LOANS_FIELDS.USER.DEPARTMENT_UUIDS);
          QueryModal.verifySelectedField(LOANS_FIELDS.USER.DEPARTMENT_UUIDS);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.departments[0].id);
          QueryModal.verifyQueryAreaContent(
            `(users.department_ids == ${testData.departments[0].id})`,
          );
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();

          // Verify User 1 and User 3 are returned (both have Dept A)
          QueryModal.verifyNumberOfMatchedRecords(2);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.users[0].barcode,
            LOANS_FIELDS.USER.DEPARTMENT_UUIDS,
            testData.departments[0].id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.users[2].barcode,
            LOANS_FIELDS.USER.DEPARTMENT_UUIDS,
            `${testData.departments[0].id} | ${testData.departments[1].id}`,
          );

          // Step 4: Change operator to is null/empty = False
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.chooseValueSelect('False');
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();

          // Verify User 1, 2, and 3 are returned (all have departments assigned)
          QueryModal.verifyNumberOfMatchedRecords(3);

          // Step 5: Verify Department UUIDs column displays correctly
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.users[0].barcode,
            LOANS_FIELDS.USER.DEPARTMENT_UUIDS,
            testData.departments[0].id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.users[1].barcode,
            LOANS_FIELDS.USER.DEPARTMENT_UUIDS,
            testData.departments[1].id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.users[2].barcode,
            LOANS_FIELDS.USER.DEPARTMENT_UUIDS,
            `${testData.departments[0].id} | ${testData.departments[1].id}`,
          );

          // Step 6: Run query & save
          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);
            // TODO: Uncomment after UIPQB-295 will be resolved
            //  Lists.verifyQuery('users.department_id is null/empty False');
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 7: Click "Actions" menu => "Edit list", then click "Edit query" button
            Lists.openActions();
            Lists.editList();
            Lists.editQuery();

            // TODO: Uncomment after UIPQB-295 will be resolved
            // QueryModal.verifySelectedField(LOANS_FIELDS.USER.DEPARTMENT_UUIDS);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL);
            QueryModal.verifySelectedValue('False');
            // QueryModal.verifyQueryAreaContent(
            //   `(users.department_ids == ${testData.departments[0].id})`,
            // );

            // Step 8: Change first field to Loan policy — UUID
            QueryModal.selectField(LOANS_FIELDS.LOAN_POLICY.UUID);
            QueryModal.verifySelectedField(LOANS_FIELDS.LOAN_POLICY.UUID);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.verifyOperatorsList(stringStoresUuidButMillionOperators);
            QueryModal.fillInValueTextfield(testData.loanPolicies[0].id);
            QueryModal.testQuery();
            QueryModal.waitForQueryTestToFinish();

            // Verify User 1 and User 2 are returned (both have Policy 1 loans)
            QueryModal.verifyNumberOfMatchedRecords(2);
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.users[0].barcode,
              LOANS_FIELDS.LOAN_POLICY.UUID,
              testData.loanPolicies[0].id,
            );
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.users[1].barcode,
              LOANS_FIELDS.LOAN_POLICY.UUID,
              testData.loanPolicies[0].id,
            );

            // Step 9: Change operator to in with both policies
            QueryModal.selectOperator(QUERY_OPERATIONS.IN);
            QueryModal.fillInValueTextfield(
              `${testData.loanPolicies[0].id},${testData.loanPolicies[1].id}`,
            );
            QueryModal.verifyQueryAreaContent(
              `(lpolicy.id in (${testData.loanPolicies[0].id}, ${testData.loanPolicies[1].id}))`,
            );
            QueryModal.testQuery();
            QueryModal.waitForQueryTestToFinish();

            // Verify all 4 users are returned
            QueryModal.verifyNumberOfMatchedRecords(4);

            // Step 10: Verify Loan policy — UUID column displays correctly
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.users[0].barcode,
              LOANS_FIELDS.LOAN_POLICY.UUID,
              testData.loanPolicies[0].id,
            );
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.users[1].barcode,
              LOANS_FIELDS.LOAN_POLICY.UUID,
              testData.loanPolicies[0].id,
            );
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.users[2].barcode,
              LOANS_FIELDS.LOAN_POLICY.UUID,
              testData.loanPolicies[1].id,
            );
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.users[3].barcode,
              LOANS_FIELDS.LOAN_POLICY.UUID,
              testData.loanPolicies[1].id,
            );

            // Step 11: Add second condition with AND
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(testData.loanPolicies[0].id);
            QueryModal.addNewRow();
            QueryModal.selectField(LOANS_FIELDS.USER.DEPARTMENT_UUIDS, 1);
            QueryModal.verifySelectedField(LOANS_FIELDS.USER.DEPARTMENT_UUIDS, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
            QueryModal.fillInValueTextfield(testData.departments[0].id, 1);
            QueryModal.testQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
            QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);

            // Verify only User 1 is returned (Policy 1 AND Dept A)
            QueryModal.verifyNumberOfMatchedRecords(1);
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.users[0].barcode,
              LOANS_FIELDS.LOAN_POLICY.UUID,
              testData.loanPolicies[0].id,
            );
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.users[0].barcode,
              LOANS_FIELDS.USER.DEPARTMENT_UUIDS,
              testData.departments[0].id,
            );
            QueryModal.verifyQueryAreaContent(
              `(lpolicy.id == ${testData.loanPolicies[0].id}) AND (users.department_ids == ${testData.departments[0].id})`,
            );

            // Step 12: Run query & save updated query
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);
            Lists.verifyQuery(
              `lpolicy.id == ${testData.loanPolicies[0].id}) AND (users.department_ids == ${testData.departments[0].id}`,
            );
            Lists.verifyRefreshCompleteCallout(1);
            Lists.viewUpdatedList();

            // Step 13: Edit list again and verify both conditions are preserved
            Lists.openActions();
            Lists.editList();
            Lists.editQuery();

            // Verify first row: Loan policy — UUID = Policy-1-UUID
            QueryModal.verifySelectedField(LOANS_FIELDS.LOAN_POLICY.UUID, 0);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 0);
            QueryModal.verifyTextFieldValue(testData.loanPolicies[0].id, 0);

            // Verify second row: User — Department UUIDs = Dept-A-UUID
            QueryModal.verifySelectedField(LOANS_FIELDS.USER.DEPARTMENT_UUIDS, 1);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
            QueryModal.verifyTextFieldValue(testData.departments[0].id, 1);
            QueryModal.verifyQueryAreaContent(
              `(lpolicy.id == ${testData.loanPolicies[0].id}) AND (users.department_ids == ${testData.departments[0].id})`,
            );
          });
        },
      );
    });
  });
});
