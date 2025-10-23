import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import OverdueFinePolicy from '../../support/fragments/circulation/overdue-fine-policy';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate, {
  createNoticeTemplate,
} from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import NoticePolicyApi, {
  NOTICE_CATEGORIES,
} from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Patron notices', () => {
  describe(
    'Fees/fines (Patron notices)',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let patronGroup;
      const userData = {
        personal: {
          lastname: null,
        },
      };
      let itemData;
      let testData;
      const noticeTemplates = [
        createNoticeTemplate({
          name: 'Overdue_fine_returned_upon_at',
          category: NOTICE_CATEGORIES.AutomatedFeeFineCharge,
          noticeOptions: {
            noticeName: 'FeeFine',
            noticeId: 'feeFine',
            send: 'Upon/At',
            action: 'Overdue fine, returned',
          },
        }),
        createNoticeTemplate({
          name: 'Overdue_fine_returned_after_once',
          category: NOTICE_CATEGORIES.AutomatedFeeFineCharge,
          noticeOptions: {
            noticeName: 'FeeFine',
            noticeId: 'feeFine',
            send: 'After',
            action: 'Overdue fine, returned',
            sendBy: {
              duration: '1',
              interval: 'Minute(s)',
            },
            frequency: 'One Time',
          },
        }),
        createNoticeTemplate({
          name: 'Overdue_fine_returned_after_recurring',
          category: NOTICE_CATEGORIES.AutomatedFeeFineCharge,
          noticeOptions: {
            noticeName: 'FeeFine',
            noticeId: 'feeFine',
            send: 'After',
            action: 'Overdue fine, returned',
            sendBy: {
              duration: '1',
              interval: 'Minute(s)',
            },
            frequency: 'Recurring',
            sendEvery: {
              duration: '1',
              interval: 'Minute(s)',
            },
          },
        }),
      ];
      const searchResultsData = (templateName) => {
        return {
          userBarcode: userData.barcode,
          itemBarcode: itemData.barcode,
          object: 'Notice',
          circAction: 'Send',
          // TODO: add check for date with format <C6/8/2022, 6:46 AM>
          servicePoint: testData.userServicePoint.name,
          source: 'System',
          desc: `Template: ${templateName}. Triggering event: Overdue fine returned.`,
        };
      };
      const checkNoticeIsSent = (checkParams) => {
        SearchPane.searchByUserBarcode(userData.barcode);
        SearchPane.findResultRowIndexByContent(checkParams.desc).then((rowIndex) => {
          SearchPane.checkResultSearch(checkParams, rowIndex);
        });
      };
      let noticePolicy;
      let loanPolicyBody;
      let overdueFinePolicyBody;
      let userOwnerBody;

      beforeEach('Preconditions', () => {
        patronGroup = {
          name: 'groupToTestNotices' + getRandomPostfix(),
        };
        itemData = {
          barcode: generateItemBarcode(),
          title: `Instance ${getRandomPostfix()}`,
        };
        testData = {
          userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
        };
        noticePolicy = {
          name: `Autotest ${getRandomPostfix()} Overdue fine, returned`,
          description: 'Created by autotest team',
        };
        loanPolicyBody = {
          id: uuid(),
          name: `1_minute_${getRandomPostfix()}`,
          loanable: true,
          loansPolicy: {
            closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
            period: {
              duration: 1,
              intervalId: 'Minutes',
            },
            profileId: 'Rolling',
          },
          renewable: false,
        };
        overdueFinePolicyBody = {
          id: uuid(),
          name: `automationOverdueFinePolicy${getRandomPostfix()}`,
          overdueFine: { quantity: '1.00', intervalId: 'minute' },
          countClosed: true,
          maxOverdueFine: '100.00',
        };
        userOwnerBody = {
          id: uuid(),
          owner: 'AutotestOwner' + getRandomPostfix(),
          servicePointOwner: [
            {
              value: testData.userServicePoint.id,
              label: testData.userServicePoint.name,
            },
          ],
        };

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
            cy.getDefaultMaterialType().then((materialTypes) => {
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
              itemData.instanceId = specialInstanceIds.instanceId;
              itemData.holdingId = specialInstanceIds.holdingIds[0].id;
              itemData.itemId = specialInstanceIds.holdingIds[0].itemIds;
            });
          });

        LoanPolicy.createViaApi(loanPolicyBody);
        OverdueFinePolicy.createViaApi(overdueFinePolicyBody);
        UsersOwners.createViaApi(userOwnerBody);
        PaymentMethods.createViaApi(userOwnerBody.id).then((paymentMethodRes) => {
          testData.paymentMethod = paymentMethodRes;
        });

        PatronGroups.createViaApi(patronGroup.name).then((res) => {
          patronGroup.id = res;
          cy.createTempUser(
            [
              permissions.checkinAll.gui,
              permissions.checkoutAll.gui,
              permissions.circulationLogAll.gui,
              permissions.uiCirculationSettingsNoticeTemplates.gui,
              permissions.uiCirculationSettingsNoticePolicies.gui,
              permissions.uiUsersfeefinesCRUD.gui,
              permissions.uiUserAccounts.gui,
              permissions.feesfinesCheckPay.gui,
              permissions.feesfinesPay.gui,
            ],
            patronGroup.name,
          )
            .then((userProperties) => {
              userData.username = userProperties.username;
              userData.password = userProperties.password;
              userData.userId = userProperties.userId;
              userData.barcode = userProperties.barcode;
              userData.personal.lastname = userProperties.lastName;
            })
            .then(() => {
              UserEdit.addServicePointViaApi(
                testData.userServicePoint.id,
                userData.userId,
                testData.userServicePoint.id,
              );

              cy.login(userData.username, userData.password, {
                path: SettingsMenu.circulationPatronNoticeTemplatesPath,
                waiter: NewNoticePolicyTemplate.waitLoading,
              });
            });
        });
      });

      afterEach('Deleting created entities', () => {
        cy.getAdminToken();
        cy.waitForAuthRefresh(() => {}, 20_000);
        UserEdit.changeServicePointPreferenceViaApi(userData.userId, [
          testData.userServicePoint.id,
        ]);
        CirculationRules.deleteRuleViaApi(testData.addedRule);
        ServicePoints.deleteViaApi(testData.userServicePoint.id);
        cy.deleteLoanPolicy(loanPolicyBody.id);
        NoticePolicyApi.deleteViaApi(testData.noticePolicyId);
        OverdueFinePolicy.deleteViaApi(overdueFinePolicyBody.id);
        Users.deleteViaApi(userData.userId);
        PatronGroups.deleteViaApi(patronGroup.id);
        cy.deleteItemViaApi(itemData.itemId);
        cy.deleteHoldingRecordViaApi(itemData.holdingId);
        InventoryInstance.deleteInstanceViaApi(itemData.instanceId);
        PaymentMethods.deleteViaApi(testData.paymentMethod.id);
        UsersOwners.deleteViaApi(userOwnerBody.id);
        Location.deleteInstitutionCampusLibraryLocationViaApi(
          testData.defaultLocation.institutionId,
          testData.defaultLocation.campusId,
          testData.defaultLocation.libraryId,
          testData.defaultLocation.id,
        );
        noticeTemplates.forEach((template) => {
          NoticePolicyTemplateApi.getViaApi({
            query: `name=${template.name}`,
          }).then((templateId) => {
            NoticePolicyTemplateApi.deleteViaApi(templateId);
          });
        });
        cy.deleteLoanType(testData.loanTypeId);
      });

      it(
        'C347874 Overdue fine, returned triggers (volaris)',
        { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C347874'] },
        () => {
          noticeTemplates.forEach((template, index) => {
            NewNoticePolicyTemplate.createPatronNoticeTemplate(template, !!index);
            NewNoticePolicyTemplate.checkAfterSaving(template);
          });

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          NewNoticePolicy.openTabCirculationPatronNoticePolicies();
          NewNoticePolicy.waitLoading();
          NewNoticePolicy.createPolicy({ noticePolicy, noticeTemplates });
          NewNoticePolicy.checkPolicyName(noticePolicy);

          cy.getAdminToken();
          cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
            testData.noticePolicyId = noticePolicyRes[0].id;
            CirculationRules.addRuleViaApi(
              { t: testData.loanTypeId },
              { n: testData.noticePolicyId, l: loanPolicyBody.id, o: overdueFinePolicyBody.id },
            ).then((newRule) => {
              testData.addedRule = newRule;
            });
          });

          cy.login(userData.username, userData.password, {
            path: TopMenu.checkOutPath,
            waiter: CheckOutActions.waitLoading,
          });
          CheckOutActions.checkOutUser(userData.barcode);
          CheckOutActions.checkUserInfo(userData, patronGroup.name);
          CheckOutActions.checkOutItem(itemData.barcode);
          Checkout.verifyResultsInTheRow([itemData.barcode]);
          CheckOutActions.endCheckOutSession();

          cy.getAdminToken();
          UserLoans.changeDueDateForAllOpenPatronLoans(userData.userId, -1);

          cy.login(userData.username, userData.password, {
            path: TopMenu.checkInPath,
            waiter: CheckInActions.waitLoading,
          });
          CheckInActions.checkInItem(itemData.barcode);
          CheckInActions.verifyLastCheckInItem(itemData.barcode);
          CheckInActions.endCheckInSession();

          // wait to get "Overdue fine returned after once" and "Overdue fine returned after recurring" notices
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(200000);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
          SearchPane.waitLoading();

          noticeTemplates.forEach((template) => {
            checkNoticeIsSent(searchResultsData(template.name));
          });

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersSearchPane.waitLoading();
          UsersSearchPane.searchByKeywords(userData.barcode);
          UsersCard.waitLoading();
          UsersCard.openFeeFines();
          UsersCard.showOpenedFeeFines();
          UserAllFeesFines.clickRowCheckbox(0);
          UserAllFeesFines.paySelectedFeeFines();
          PayFeeFine.setPaymentMethod(testData.paymentMethod);
          PayFeeFine.submitAndConfirm();

          // wait to check that we don't get new "Overdue fine returned after recurring" notice because fee/fine was paid
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(100000);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
          SearchPane.waitLoading();

          SearchPane.searchByUserBarcode(userData.barcode);
          SearchPane.checkResultSearch({ object: 'Fee/fine', circAction: 'Paid fully' }, 0);
        },
      );
    },
  );
});
