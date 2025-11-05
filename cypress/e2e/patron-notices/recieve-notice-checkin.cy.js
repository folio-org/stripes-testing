import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import NoticePolicyApi, {
  NOTICE_ACTIONS,
  NOTICE_CATEGORIES,
} from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import settingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('End to end scenarios for automation (Patron notices)', () => {
    let noticePolicyTemplate;
    let searchResultsData;
    let testData;
    let itemsData;
    let userData;
    let patronGroup;
    let noticePolicy;

    const generateTestData = () => {
      noticePolicyTemplate = {
        ...NewNoticePolicyTemplate.getDefaultUI(),
        category: NOTICE_CATEGORIES.loan,
      };
      noticePolicy = {
        ...NewNoticePolicy.getDefaultUI(),
        templateName: noticePolicyTemplate.name,
        format: 'Email',
        action: NOTICE_ACTIONS.checkin,
        noticeName: NOTICE_CATEGORIES.loan.name,
        noticeId: 'loan',
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
          {
            instanceTitle: `AT_C347623_Instance ${getRandomPostfix()}`,
          },
          {
            instanceTitle: `AT_C347623_Instance ${getRandomPostfix()}`,
          },
          {
            instanceTitle: `AT_C347623_Instance ${getRandomPostfix()}`,
          },
          {
            instanceTitle: `AT_C347623_Instance ${getRandomPostfix()}`,
          },
          {
            instanceTitle: `AT_C347623_Instance ${getRandomPostfix()}`,
          },
        ],
      };
      testData = {
        noticePolicyTemplateToken: 'item.title',
        userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      };
      searchResultsData = {
        userBarcode: null,
        object: 'Notice',
        circAction: 'Send',
        // TODO: add check for date with format <C6/8/2022, 6:46 AM>
        servicePoint: testData.userServicePoint.name,
        source: 'System',
        desc: `Template: ${noticePolicyTemplate.name}. Triggering event: Check in.`,
      };
    };

    beforeEach('Preconditions', () => {
      generateTestData();
      itemsData.itemsWithSeparateInstance.forEach((item, index) => {
        item.barcode = generateUniqueItemBarcodeWithShift(index);
      });
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          ServicePoints.createViaApi(testData.userServicePoint);
          testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
          Location.createViaApi(testData.defaultLocation);
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
              itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
              itemsData.itemsWithSeparateInstance[index].holdingId =
                specialInstanceIds.holdingIds[0].id;
              itemsData.itemsWithSeparateInstance[index].itemId =
                specialInstanceIds.holdingIds[0].itemIds;
            });
          });
          cy.wrap(itemsData.itemsWithSeparateInstance).as('items');
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
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(userData.username, userData.password, {
                path: settingsMenu.circulationPatronNoticePoliciesPath,
                waiter: NewNoticePolicyTemplate.waitLoading,
              });
            });
          });
      });
    });

    afterEach('Deleting created entities', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
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
      NoticePolicyTemplateApi.getViaApi({ query: `name=${noticePolicyTemplate.name}` }).then(
        (templateId) => {
          NoticePolicyTemplateApi.deleteViaApi(templateId);
        },
      );
    });

    it(
      'C347623 Check that user can receive notice with multiple items after finishing the session "Check in" by clicking the End Session button (volaris)',
      { tags: ['smoke', 'volaris', 'shiftLeft', 'C347623'] },
      () => {
        NewNoticePolicyTemplate.startAdding();
        NewNoticePolicyTemplate.checkInitialState();
        NewNoticePolicyTemplate.addToken(testData.noticePolicyTemplateToken);
        noticePolicyTemplate.body += '{{item.title}}';
        NewNoticePolicyTemplate.create(noticePolicyTemplate);
        NewNoticePolicyTemplate.checkAfterSaving(noticePolicyTemplate);
        NewNoticePolicyTemplate.checkTemplateActions(noticePolicyTemplate);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        NewNoticePolicy.openTabCirculationPatronNoticePolicies();
        NewNoticePolicy.waitLoading();
        NewNoticePolicy.startAdding();
        NewNoticePolicy.checkInitialState();
        NewNoticePolicy.fillGeneralInformation(noticePolicy);
        NewNoticePolicy.addNotice(noticePolicy);
        NewNoticePolicy.save();
        NewNoticePolicy.checkPolicyName(noticePolicy);
        NewNoticePolicy.checkAfterSaving(noticePolicy);
        NewNoticePolicy.checkNoticeActions(noticePolicy);

        cy.getAdminToken();
        cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
          testData.noticePolicyId = noticePolicyRes[0].id;
          CirculationRules.addRuleViaApi(
            { t: testData.loanTypeId },
            { n: testData.noticePolicyId },
          ).then((newRule) => {
            testData.addedRule = newRule;
          });
        });

        cy.login(userData.username, userData.password, {
          path: TopMenu.checkOutPath,
          waiter: Checkout.waitLoading,
        });
        CheckOutActions.checkOutUser(userData.barcode);
        CheckOutActions.checkUserInfo(userData, patronGroup.name);
        cy.get('@items').each((item) => {
          CheckOutActions.checkOutItem(item.barcode);
          Checkout.verifyResultsInTheRow([item.barcode]);
        });
        CheckOutActions.endCheckOutSession();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
        cy.get('@items').each((item) => {
          CheckInActions.checkInItem(item.barcode);
          CheckInActions.verifyLastCheckInItem(item.barcode);
        });
        CheckInActions.endCheckInSession();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
        SearchPane.searchByUserBarcode(userData.barcode);
        SearchPane.verifyResultCells();
        SearchPane.checkResultSearch(searchResultsData);
      },
    );
  });
});
