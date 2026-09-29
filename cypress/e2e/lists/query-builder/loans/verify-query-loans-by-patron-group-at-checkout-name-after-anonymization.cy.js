import { MultiColumnListRow } from '../../../../../interactors';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { LOANS_FIELDS } from '../../../../support/constants/query-builder';
import { Lists } from '../../../../support/fragments/lists/lists';
import ListsFile, { loansCsvHeaders } from '../../../../support/fragments/lists/lists-file';
import TopMenu from '../../../../support/fragments/topMenu';
import AppPaths from '../../../../support/fragments/app-paths';
import LoanDetails from '../../../../support/fragments/users/userDefaultObjects/loanDetails';
import UserLoans from '../../../../support/fragments/users/loans/userLoans';
import Users from '../../../../support/fragments/users/users';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import Checkout from '../../../../support/fragments/checkout/checkout';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1504484';
const titlePrefix = `AT_${testCaseId}`;
const listData = {
  name: `${titlePrefix}_Loans_by_PatronGroupAtCheckout`,
};
const testData = {
  patronGroups: [
    { name: `${titlePrefix}_PatronGroup_1_${getRandomPostfix()}`, id: null },
    { name: `${titlePrefix}_PatronGroup_2_${getRandomPostfix()}`, id: null },
  ],
  users: [
    {
      username: `${titlePrefix}_user1_${getRandomPostfix()}`,
      firstName: 'User1',
      userId: null,
      barcode: null,
      loanId: null,
    },
    {
      username: `${titlePrefix}_user2_${getRandomPostfix()}`,
      firstName: 'User2',
      userId: null,
      barcode: null,
      loanId: null,
    },
  ],
  materialType: null,
  instances: [],
};

let user;
let servicePoint;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Loans', () => {
      before('Create test data', () => {
        const createLoanForUser = ({ userData, isClosed = false }) => {
          return InventoryInstances.getLocations({ limit: 1 }).then((locations) => {
            const itemBarcode = `${titlePrefix}_${userData.firstName}_${getRandomPostfix()}`;
            const instanceTitle = `${titlePrefix}_${userData.firstName}_Loan_${getRandomPostfix()}`;
            const locationId = locations[0].id;
            userData.itemBarcode = itemBarcode;

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
                    testData.instances.push(instanceId);

                    return Checkout.checkoutItemViaApi({
                      itemBarcode,
                      servicePointId: servicePoint.id,
                      userBarcode: userData.barcode,
                    }).then((loan) => {
                      userData.loanId = loan.id;

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

        const changeUserPatronGroup = (userData, patronGroupId) => {
          return cy
            .getUsers({ limit: 1, query: `"username"="${userData.username}"` })
            .then((users) => {
              return cy.updateUser({ ...users[0], patronGroup: patronGroupId });
            });
        };

        cy.getAdminToken()
          .then(() => cy.getBookMaterialType())
          .then((bookMaterialType) => {
            testData.materialType = bookMaterialType;
          })
          .then(() => PatronGroups.createViaApi(testData.patronGroups[0].name))
          .then((groupId) => {
            testData.patronGroups[0].id = groupId;
            return PatronGroups.createViaApi(testData.patronGroups[1].name);
          })
          .then((groupId) => {
            testData.patronGroups[1].id = groupId;
            servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
            return ServicePoints.createViaApi(servicePoint);
          })
          .then(() => {
            return cy.createTempUser([], testData.patronGroups[0].name).then((createdUser) => {
              testData.users[0].username = createdUser.username;
              testData.users[0].userId = createdUser.userId;
              testData.users[0].barcode = createdUser.barcode;
            });
          })
          .then(() => {
            return cy.createTempUser([], testData.patronGroups[1].name).then((createdUser) => {
              testData.users[1].username = createdUser.username;
              testData.users[1].userId = createdUser.userId;
              testData.users[1].barcode = createdUser.barcode;
            });
          })
          .then(() => {
            // User 1: Item 1 checked out while patron group is 1 (open Loan 1),
            // then patron group changed to 2 so it no longer matches the checkout-time group.
            return createLoanForUser({ userData: testData.users[0], isClosed: false }).then(() => {
              return changeUserPatronGroup(testData.users[0], testData.patronGroups[1].id);
            });
          })
          .then(() => {
            // User 2: Item 2 checked out and checked in while patron group is 2 (closed Loan 2).
            // Loan 2 is anonymized manually via UI below.
            return createLoanForUser({ userData: testData.users[1], isClosed: true });
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

              cy.loginAsAdmin({
                path: AppPaths.getClosedLoansPath(testData.users[1].userId),
                waiter: LoanDetails.waitLoading,
              });

              LoanDetails.anonymizeAllLoans();
              LoanDetails.checkAnonymizeAllLoansModalOpen();
              LoanDetails.confirmAnonymizeAllLoans();

              cy.expect(MultiColumnListRow({ rowIndexInParent: 'row-0' }).absent());
              UserLoans.closeLoansHistory();

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
        Lists.deleteDownloadedFile(listData.name);

        testData.instances.forEach((instanceId) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
        });

        if (servicePoint && servicePoint.id) {
          ServicePoints.deleteViaApi(servicePoint.id);
        }

        testData.users.forEach((testUser) => {
          if (testUser.userId) {
            Users.deleteViaApi(testUser.userId);
          }
        });

        testData.patronGroups.forEach((patronGroup) => {
          if (patronGroup.id) {
            PatronGroups.deleteViaApi(patronGroup.id);
          }
        });

        if (user && user.userId) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        'C1504484 Verify query by "Patron group at checkout — Name" on Loans after anonymization',
        { tags: ['extendedPath', 'athena', 'C1504484'] },
        () => {
          // Step 1: Click "New" button, enter list name, select "Loans" recor type and click "Build query" button
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.selectRecordType(Lists.recordTypes.loans);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 2: Click the "Select field" dropdown
          QueryModal.verifyFieldOptionExists([LOANS_FIELDS.PATRON_GROUP_AT_CHECKOUT.NAME]);

          // Step 3: Select field "Patron group at checkout — Name", operator "in", verify Value control
          QueryModal.selectField(LOANS_FIELDS.PATRON_GROUP_AT_CHECKOUT.NAME);
          QueryModal.verifySelectedField(LOANS_FIELDS.PATRON_GROUP_AT_CHECKOUT.NAME);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifyValueMultiselectMenuIncludesOption(testData.patronGroups[0].name);
          QueryModal.verifyValueMultiselectMenuIncludesOption(testData.patronGroups[1].name);

          // Step 4: In "Value" dropdown select patron group 1 and patron group 2, click "Test query"
          QueryModal.chooseFromValueMultiselect(testData.patronGroups[0].name, 0, {
            exactMatch: true,
          });
          QueryModal.chooseFromValueMultiselect(testData.patronGroups[1].name, 0, {
            exactMatch: true,
          });
          QueryModal.verifySelectedMultiselectValue([
            testData.patronGroups[0].name,
            testData.patronGroups[1].name,
          ]);
          QueryModal.verifyQueryAreaContent(
            `(groups_at_checkout.group in [${testData.patronGroups[0].name}, ${testData.patronGroups[1].name}])`,
          );
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            expect(recordCount).to.be.at.least(2);
          });

          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns(LOANS_FIELDS.ITEM.BARCODE);
          QueryModal.clickCheckboxInShowColumns(LOANS_FIELDS.LOAN.STATUS_NAME);

          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.users[0].itemBarcode,
            LOANS_FIELDS.LOAN.STATUS_NAME,
            'Open',
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.users[1].itemBarcode,
            LOANS_FIELDS.LOAN.STATUS_NAME,
            'Closed',
          );

          // Step 5: Check "Patron group at checkout — Name" and "Patron group — Name" columns for Loan 1 and Loan 2
          QueryModal.verifyMatchedRecordInMultipleColumnsByIdentifier(
            testData.users[0].itemBarcode,
            [
              {
                header: LOANS_FIELDS.PATRON_GROUP_AT_CHECKOUT.NAME,
                value: testData.patronGroups[0].name,
              },
              { header: LOANS_FIELDS.PATRON_GROUP.NAME, value: testData.patronGroups[1].name },
            ],
          );
          QueryModal.verifyMatchedRecordInMultipleColumnsByIdentifier(
            testData.users[1].itemBarcode,
            [
              {
                header: LOANS_FIELDS.PATRON_GROUP_AT_CHECKOUT.NAME,
                value: testData.patronGroups[1].name,
              },
              { header: LOANS_FIELDS.PATRON_GROUP.NAME, value: '' },
            ],
          );

          QueryModal.runQueryAndSaveDisabled(false);

          // Step 6: Click "Run query & save" button
          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);
            Lists.verifyQuery(
              `groups_at_checkout.group in [${testData.patronGroups[0].name}, ${testData.patronGroups[1].name}]`,
            );
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 7: Click "View updated list" link, check result table row for Loan 1 and Loan 2
            Lists.viewUpdatedList();

            Lists.verifyResultCellByIdentifier(
              testData.users[0].itemBarcode,
              LOANS_FIELDS.PATRON_GROUP_AT_CHECKOUT.NAME,
              testData.patronGroups[0].name,
            );
            Lists.verifyResultCellByIdentifier(
              testData.users[0].itemBarcode,
              LOANS_FIELDS.PATRON_GROUP.NAME,
              testData.patronGroups[1].name,
            );
            Lists.verifyResultCellByIdentifier(
              testData.users[1].itemBarcode,
              LOANS_FIELDS.PATRON_GROUP_AT_CHECKOUT.NAME,
              testData.patronGroups[1].name,
            );
            Lists.verifyResultCellByIdentifier(
              testData.users[1].itemBarcode,
              LOANS_FIELDS.PATRON_GROUP.NAME,
              '',
            );

            // Step 8: Click "Actions" > "Export selected columns (CSV)"
            Lists.openActions();
            Lists.exportListVisibleColumns();
            Lists.verifyExportCallouts(listData.name);

            // Check the exported CSV contains "Patron group at checkout — Name" and
            // "Patron group — Name" columns populated with appropriate values for Loan 1 and Loan 2
            ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
              listData.name,
              loansCsvHeaders.ITEM.BARCODE,
              testData.users[0].itemBarcode,
              [
                {
                  header: loansCsvHeaders.PATRON_GROUP_AT_CHECKOUT.NAME,
                  value: testData.patronGroups[0].name,
                },
                { header: loansCsvHeaders.PATRON_GROUP.NAME, value: testData.patronGroups[1].name },
              ],
            );
            ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
              listData.name,
              loansCsvHeaders.ITEM.BARCODE,
              testData.users[1].itemBarcode,
              [
                {
                  header: loansCsvHeaders.PATRON_GROUP_AT_CHECKOUT.NAME,
                  value: testData.patronGroups[1].name,
                },
                { header: loansCsvHeaders.PATRON_GROUP.NAME, value: '' },
              ],
            );
          });
        },
      );
    });
  });
});
