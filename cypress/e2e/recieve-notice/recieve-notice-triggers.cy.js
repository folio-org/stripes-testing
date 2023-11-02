import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import AppPaths from '../../support/fragments/app-paths';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import LoansPage from '../../support/fragments/loans/loansPage';
import SettingsMenu from '../../support/fragments/settingsMenu';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import NoticePolicyApi from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate, {
  createNoticeTemplate,
} from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import { ITEM_STATUS_NAMES } from '../../support/constants';

describe('Triggers: Check Out, Loan due date change, Check in', () => {
  let addedCirculationRule;
  const noticeTemplates = [
    {
      ...createNoticeTemplate({
        name: 'Check_out',
        noticeOptions: {
          action: 'Check out',
        },
      }),
      body: '{{#loans}}Test_email_body {{item.title}} {{loan.initialBorrowDateTime}}{{/loans}}',
      previewText: 'Test_email_body',
    },
    {
      ...createNoticeTemplate({
        name: 'Loan_due_date_change',
        noticeOptions: {
          action: 'Loan due date change',
        },
      }),
      body: 'Test_email_body {{item.title}} {{loan.dueDateTime}}',
      previewText: 'Test_email_body',
    },
    {
      ...createNoticeTemplate({
        name: 'Check_in',
        noticeOptions: {
          action: 'Check in',
        },
      }),
      body: '{{#loans}}Test_email_body {{item.title}} {{loan.checkedInDateTime}}{{/loans}}',
      previewText: 'Test_email_body',
    },
  ];
  const noticePolicy = {
    name: getTestEntityValue('Overdue fine, returned'),
    description: 'Created by autotest team',
  };
  let loanPolicyId;
  const patronGroup = {
    name: 'groupToTestNoticeCheckout' + getRandomPostfix(),
  };
  const userData = {
    personal: {
      lastname: null,
    },
  };
  const itemsData = {
    itemsWithSeparateInstance: [
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
    ],
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const searchResultsData = {
    userBarcode: null,
    object: 'Notice',
    circAction: 'Send',
    // TODO: add check for date with format <C6/8/2022, 6:46 AM>
    servicePoint: testData.userServicePoint.name,
    source: 'System',
    desc: `Template: ${noticeTemplates[0].name}. Triggering event: Check out.`,
  };

  const checkNoticeIsSent = (checkParams) => {
    cy.visit(TopMenu.circulationLogPath);
    SearchPane.searchByUserBarcode(userData.barcode);
    SearchPane.checkResultSearch(checkParams);
  };

  before('Preconditions', () => {
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
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
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

    OtherSettings.setOtherSettingsViaApi({ prefPatronIdentifier: 'barcode,username' });
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

          cy.getCirculationRules().then((response) => {
            testData.baseRules = response.rulesAsText;
            testData.ruleProps = CirculationRules.getRuleProps(response.rulesAsText);
          });

          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationPatronNoticeTemplatesPath,
            waiter: NewNoticePolicyTemplate.waitLoading,
          });
        });
    });
  });

  after('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    cy.deleteLoanPolicy(loanPolicyId);
    NoticePolicyApi.deleteViaApi(testData.ruleProps.n);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.get('@items').each((item, index) => {
      cy.deleteItemViaApi(item.itemId);
      cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
      InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
    });
    cy.deleteLoanType(testData.loanTypeId);
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
  });

  it(
    'C347862 Check out + Loan due date change + Check in triggers (volaris)',
    { tags: [TestTypes.smoke, devTeams.volaris] },
    () => {
      noticeTemplates.forEach((template) => {
        NewNoticePolicyTemplate.createPatronNoticeTemplate(template);
        NewNoticePolicyTemplate.checkAfterSaving(template);
      });

      cy.visit(SettingsMenu.circulationPatronNoticePoliciesPath);
      NewNoticePolicy.waitLoading();
      NewNoticePolicy.createPolicy({ noticePolicy, noticeTemplates });
      NewNoticePolicy.checkPolicyName(noticePolicy);

      cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((res) => {
        testData.ruleProps.n = res[0].id;
        testData.ruleProps.l = loanPolicyId;
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

      cy.visit(TopMenu.checkOutPath);
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.checkUserInfo(userData, patronGroup.name);
      cy.get('@items').each((item) => {
        CheckOutActions.checkOutItem(item.barcode);
        Checkout.verifyResultsInTheRow([item.barcode]);
      });
      CheckOutActions.endCheckOutSession();
      checkNoticeIsSent(searchResultsData);

      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      LoansPage.checkAll();
      LoansPage.openChangeDueDate();
      ChangeDueDateForm.fillDate('10/07/2030');
      ChangeDueDateForm.saveAndClose();
      searchResultsData.desc = `Template: ${noticeTemplates[1].name}. Triggering event: Manual due date change.`;
      checkNoticeIsSent(searchResultsData);

      cy.visit(TopMenu.checkInPath);
      cy.get('@items').each((item) => {
        CheckInActions.checkInItem(item.barcode);
        CheckInActions.verifyLastCheckInItem(item.barcode);
      });
      CheckInActions.endCheckInSession();
      searchResultsData.desc = `Template: ${noticeTemplates[2].name}. Triggering event: Check in.`;
      checkNoticeIsSent(searchResultsData);
    },
  );
});
