import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import LoansPage from '../../support/fragments/loans/loansPage';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate, {
  createNoticeTemplate,
} from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import NoticePolicyApi from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import SettingsPane from '../../support/fragments/settings/settingsPane';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';

describe('Patron notices', () => {
  describe(
    'Loan notice triggers (Patron notices)',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      const noticeTemplates = [
        {
          ...createNoticeTemplate({
            name: 'Check_out',
            noticeOptions: {
              action: 'Check out',
            },
          }),
        },
        {
          ...createNoticeTemplate({
            name: 'Loan_due_date_change',
            noticeOptions: {
              action: 'Loan due date change',
            },
          }),
        },
        {
          ...createNoticeTemplate({
            name: 'Check_in',
            noticeOptions: {
              action: 'Check in',
            },
          }),
        },
      ];
      let noticePolicy;
      let loanPolicyId;
      let patronGroup;
      let userData;
      let itemsData;
      let testData;
      let searchResultsData;

      const checkNoticeIsSent = (checkParams) => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
        SearchPane.searchByUserBarcode(userData.barcode);
        SearchPane.checkResultSearch(checkParams);
      };

      beforeEach('Preconditions', () => {
        noticePolicy = {
          name: getTestEntityValue('Overdue fine, returned'),
          description: 'Created by autotest team',
        };
        patronGroup = {
          name: 'groupToTestNoticeCheckout' + getRandomPostfix(),
        };
        userData = {
          personal: {
            lastname: null,
          },
        };
        itemsData = {
          itemsWithSeparateInstance: [
            { instanceTitle: `Instance ${getRandomPostfix()}` },
            { instanceTitle: `Instance ${getRandomPostfix()}` },
          ],
        };
        testData = {
          userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
        };
        searchResultsData = {
          userBarcode: null,
          object: 'Notice',
          circAction: 'Send',
          // TODO: add check for date with format <C6/8/2022, 6:46 AM>
          servicePoint: testData.userServicePoint.name,
          source: 'System',
          desc: `Template: ${noticeTemplates[0].name}. Triggering event: Check out.`,
        };

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
            }).then((loanType) => {
              testData.loanTypeId = loanType.id;
            });
            cy.getDefaultMaterialType().then((res) => {
              testData.materialTypeId = res.id;
              testData.materialTypeName = res.name;
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
                itemsData.itemsWithSeparateInstance[index].instanceId =
                  specialInstanceIds.instanceId;
                itemsData.itemsWithSeparateInstance[index].holdingId =
                  specialInstanceIds.holdingIds[0].id;
                itemsData.itemsWithSeparateInstance[index].itemId =
                  specialInstanceIds.holdingIds[0].itemIds;
              });
            });
            cy.wrap(itemsData.itemsWithSeparateInstance).as('items');
          });

        cy.createLoanPolicy({
          loanable: true,
          loansPolicy: {
            closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
            period: {
              duration: 10,
              intervalId: 'Minutes',
            },
            profileId: 'Rolling',
          },
          renewable: true,
          renewalsPolicy: {
            unlimited: true,
            renewFromId: 'CURRENT_DUE_DATE',
          },
        }).then((res) => {
          loanPolicyId = res.id;
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
              permissions.loansAll.gui,
              permissions.uiCirculationCreateViewOverdueFinesPolicies.gui,
            ],
            patronGroup.name,
          )
            .then((userProperties) => {
              userData.username = userProperties.username;
              userData.password = userProperties.password;
              userData.userId = userProperties.userId;
              userData.barcode = userProperties.barcode;
              userData.personal.lastname = userProperties.lastName;
              searchResultsData.userBarcode = userProperties.barcode;
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
        UserEdit.changeServicePointPreferenceViaApi(userData.userId, [
          testData.userServicePoint.id,
        ]);
        CirculationRules.deleteRuleViaApi(testData.addedRule);
        ServicePoints.deleteViaApi(testData.userServicePoint.id);
        cy.deleteLoanPolicy(loanPolicyId);
        NoticePolicyApi.deleteViaApi(testData.noticePolicyId);
        Users.deleteViaApi(userData.userId);
        PatronGroups.deleteViaApi(patronGroup.id);
        cy.get('@items').each((item, index) => {
          cy.deleteItemViaApi(item.itemId);
          cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
          InventoryInstance.deleteInstanceViaApi(
            itemsData.itemsWithSeparateInstance[index].instanceId,
          );
        });
        cy.deleteLoanType(testData.loanTypeId);
        Location.deleteInstitutionCampusLibraryLocationViaApi(
          testData.defaultLocation.institutionId,
          testData.defaultLocation.campusId,
          testData.defaultLocation.libraryId,
          testData.defaultLocation.id,
        );
        noticeTemplates.forEach((template) => {
          NoticePolicyTemplateApi.getViaApi({ query: `name=${template.name}` }).then(
            (templateId) => {
              NoticePolicyTemplateApi.deleteViaApi(templateId);
            },
          );
        });
      });

      it(
        'C347862 Check out + Loan due date change + Check in triggers (volaris)',
        { tags: ['smoke', 'volaris', 'shiftLeft', 'C347862'] },
        () => {
          noticeTemplates.forEach((template) => {
            NewNoticePolicyTemplate.createPatronNoticeTemplate(template);
            NewNoticePolicyTemplate.checkAfterSaving(template);
          });

          SettingsPane.selectSettingsTab('Patron notice policies');
          NewNoticePolicy.waitLoading();
          NewNoticePolicy.createPolicy({ noticePolicy, noticeTemplates });
          NewNoticePolicy.checkPolicyName(noticePolicy);

          cy.getAdminToken();
          cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
            testData.noticePolicyId = noticePolicyRes[0].id;
            CirculationRules.addRuleViaApi(
              { t: testData.loanTypeId },
              { n: testData.noticePolicyId, l: loanPolicyId },
            ).then((newRule) => {
              testData.addedRule = newRule;
            });
          });

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
          CheckOutActions.checkOutUser(userData.barcode);
          CheckOutActions.checkUserInfo(userData, patronGroup.name);
          cy.get('@items').each((item) => {
            CheckOutActions.checkOutItem(item.barcode);
            Checkout.verifyResultsInTheRow([item.barcode]);
          });
          CheckOutActions.endCheckOutSession();
          checkNoticeIsSent(searchResultsData);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          Users.waitLoading();
          UsersSearchPane.searchByKeywords(userData.userId);
          UsersCard.viewCurrentLoans();
          LoansPage.checkAll();
          LoansPage.openChangeDueDate();
          ChangeDueDateForm.fillDate('10/07/2030');
          ChangeDueDateForm.saveAndClose();
          searchResultsData.desc = `Template: ${noticeTemplates[1].name}. Triggering event: Manual due date change.`;
          checkNoticeIsSent(searchResultsData);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
          cy.get('@items').each((item) => {
            CheckInActions.checkInItem(item.barcode);
            CheckInActions.verifyLastCheckInItem(item.barcode);
          });
          CheckInActions.endCheckInSession();
          searchResultsData.desc = `Template: ${noticeTemplates[2].name}. Triggering event: Check in.`;
          checkNoticeIsSent(searchResultsData);
        },
      );
    },
  );
});
