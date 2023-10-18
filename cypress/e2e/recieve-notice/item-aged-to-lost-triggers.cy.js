import uuid from 'uuid';
import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import SettingsMenu from '../../support/fragments/settingsMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import NoticePolicyApi from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate, {
  createNoticeTemplate,
} from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { getTestEntityValue } from '../../support/utils/stringTools';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';

describe('Loan notice triggers', () => {
  let addedCirculationRule;
  const patronGroup = {
    name: getTestEntityValue('groupToTestNotices'),
  };
  const instanceData = {
    itemBarcode: generateItemBarcode(),
    title: getTestEntityValue('InstanceNotice'),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    ruleProps: {},
    user: {},
  };
  const noticeTemplates = [
    createNoticeTemplate({
      name: 'Item_aged_to_lost_upon_at_template',
      noticeOptions: {
        send: 'Upon/At',
      },
    }),
    createNoticeTemplate({
      name: 'Item_aged_to_lost_after_once_template',
      noticeOptions: {
        send: 'After',
        sendBy: {
          duration: '1',
          interval: 'Minute(s)',
        },
        frequency: 'One Time',
      },
    }),
    createNoticeTemplate({
      name: 'Item_aged_to_lost_after_recurring_template',
      noticeOptions: {
        send: 'After',
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
  const noticePolicy = {
    name: getTestEntityValue('Overdue fine, returned'),
    description: 'Created by autotest team',
  };
  const loanPolicyBody = {
    id: uuid(),
    name: getTestEntityValue('1_minute'),
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
      unlimited: false,
      numberAllowed: 2,
      renewFromId: 'SYSTEM_DATE',
    },
  };
  const lostItemFeePolicyBody = {
    name: getTestEntityValue('1_lost'),
    itemAgedLostOverdue: {
      duration: 1,
      intervalId: 'Minutes',
    },
    chargeAmountItem: {
      chargeType: 'actualCost',
      amount: 0.0,
    },
    lostItemProcessingFee: 0.0,
    chargeAmountItemPatron: false,
    chargeAmountItemSystem: false,
    lostItemChargeFeeFine: {
      duration: 6,
      intervalId: 'Weeks',
    },
    returnedLostItemProcessingFee: false,
    replacedLostItemProcessingFee: false,
    replacementProcessingFee: 0.0,
    replacementAllowed: false,
    lostItemReturned: 'Charge',
    id: uuid(),
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
          name: getTestEntityValue('type'),
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
        });
      });

    LoanPolicy.createViaApi(loanPolicyBody);
    LostItemFeePolicy.createViaApi(lostItemFeePolicyBody);
    PatronGroups.createViaApi(patronGroup.name).then((res) => {
      patronGroup.id = res;
      cy.createTempUser(
        [
          Permissions.circulationLogAll.gui,
          Permissions.uiCirculationSettingsNoticeTemplates.gui,
          Permissions.uiCirculationSettingsNoticePolicies.gui,
          Permissions.checkoutAll.gui,
          Permissions.okapiTimersPatch.gui,
          Permissions.checkinAll.gui,
        ],
        patronGroup.name,
      )
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            testData.user.userId,
            testData.userServicePoint.id,
          );
          cy.getToken(testData.user.username, testData.user.password);
          UserLoans.updateTimerForAgedToLost('minute');
          cy.getAdminToken();
          cy.login(testData.user.username, testData.user.password, {
            path: SettingsMenu.circulationPatronNoticeTemplatesPath,
            waiter: NewNoticePolicyTemplate.waitLoading,
          });
        });
    });
  });

  after('Deleting created entities', () => {
    cy.getToken(testData.user.username, testData.user.password);
    UserLoans.updateTimerForAgedToLost('reset');
    cy.getAdminToken();
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    cy.deleteLoanPolicy(loanPolicyBody.id);
    LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
    NoticePolicyApi.deleteViaApi(testData.ruleProps.n);
    Users.deleteViaApi(testData.user.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instanceData.itemBarcode);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    noticeTemplates.forEach((template) => {
      NoticePolicyTemplateApi.getViaApi({ query: `name=${template.name}` }).then((templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      });
    });
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C347865: Item aged to lost triggers (volaris)',
    { tags: [TestTypes.criticalPath, DevTeams.volaris] },
    () => {
      noticeTemplates.forEach((template, index) => {
        NewNoticePolicyTemplate.createPatronNoticeTemplate(template, !!index);
        NewNoticePolicyTemplate.checkAfterSaving(template);
      });

      cy.visit(SettingsMenu.circulationPatronNoticePoliciesPath);
      NewNoticePolicy.waitLoading();

      NewNoticePolicy.createPolicy({ noticePolicy, noticeTemplates });
      NewNoticePolicy.checkPolicyName(noticePolicy);

      CirculationRules.getViaApi().then((response) => {
        testData.baseRules = response.rulesAsText;
        testData.ruleProps = CirculationRules.getRuleProps(response.rulesAsText);
        cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
          testData.ruleProps.n = noticePolicyRes[0].id;
          testData.ruleProps.l = loanPolicyBody.id;
          testData.ruleProps.i = lostItemFeePolicyBody.id;
          addedCirculationRule =
            't ' +
            testData.loanTypeId +
            ': i ' +
            testData.ruleProps.i +
            ' l ' +
            testData.ruleProps.l +
            ' r ' +
            testData.ruleProps.r +
            ' o ' +
            testData.ruleProps.o +
            ' n ' +
            testData.ruleProps.n;
          CirculationRules.addRuleViaApi(
            testData.baseRules,
            testData.ruleProps,
            't ',
            testData.loanTypeId,
          );
        });
      });

      cy.visit(TopMenu.checkOutPath);
      CheckOutActions.checkOutUserByBarcode({ ...testData.user, patronGroup });
      CheckOutActions.checkOutItem(instanceData.itemBarcode);
      Checkout.verifyResultsInTheRow([instanceData.itemBarcode]);
      CheckOutActions.endCheckOutSession();
      UserLoans.changeDueDateForAllOpenPatronLoans(testData.user.userId, -1);

      cy.visit(TopMenu.circulationLogPath);
      // wait to get "Item aged to lost - after - once" and "Item aged to lost - after - recurring" notices
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(250000);
      cy.reload();
      noticeTemplates.forEach((template) => {
        const searchResults = {
          userBarcode: testData.user.barcode,
          itemBarcode: instanceData.itemBarcode,
          object: 'Notice',
          circAction: 'Send',
          // TODO: add check for date with format <C6/8/2022, 6:46 AM>
          servicePoint: testData.userServicePoint.name,
          source: 'System',
          desc: `Template: ${template.name}. Triggering event: Aged to lost.`,
        };
        SearchPane.checkSearchResultByBarcode({ barcode: testData.user.barcode, searchResults });
      });

      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItemByBarcode(instanceData.itemBarcode);

      cy.visit(TopMenu.circulationLogPath);
      // wait to check that we don't get new "Item aged to lost - after - recurring" notice because item was returned
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(100000);
      SearchPane.searchByUserBarcode(testData.user.barcode);
      SearchPane.checkResultSearch({ object: 'Loan', circAction: 'Closed loan' }, 0);
    },
  );
});
