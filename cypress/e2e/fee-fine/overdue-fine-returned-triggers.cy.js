import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
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
import NoticePolicyApi from '../../support/fragments/circulation/notice-policy';
import NoticePolicyTemplateApi from '../../support/fragments/circulation/notice-policy-template';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import NewNoticePolicy from '../../support/fragments/circulation/newNoticePolicy';
import NewNoticePolicyTemplate from '../../support/fragments/circulation/newNoticePolicyTemplate';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../support/utils/stringTools';
import OverdueFinePolicy from '../../support/fragments/circulation/overdue-fine-policy';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import PayFeeFaine from '../../support/fragments/users/payFeeFaine';

describe('Overdue fine', () => {
  const noticeTemplates = {
    returnedUponAt: {
      name: `Autotest_${getRandomPostfix()}_Overdue_fine_returned_upon_at`,
      description: 'Created by autotest team',
      category: 'Automated fee/fine charge',
      subject: `Autotest_${getRandomPostfix()}_Overdue_fine_returned_upon_at`,
      body: 'Test email body {{item.title}} {{loan.dueDateTime}}',
    },
    returnedAfterOnce: {
      name: `Autotest_${getRandomPostfix()}_Overdue_fine_returned_after_once`,
      description: 'Created by autotest team',
      category: 'Automated fee/fine charge',
      subject: `Autotest_${getRandomPostfix()}_Overdue_fine_returned_after_once`,
      body: 'Test email body {{item.title}} {{loan.dueDateTime}}',
    },
    returnedAfterRecurring: {
      name: `Autotest_${getRandomPostfix()}_Overdue_fine_returned_after_recurring`,
      description: 'Created by autotest team',
      category: 'Automated fee/fine charge',
      subject: `Autotest_${getRandomPostfix()}_Overdue_fine_returned_after_recurring`,
      body: 'Test email body {{item.title}} {{loan.dueDateTime}}',
    },
  };
  const noticePolicy = {
    name: `Autotest ${getRandomPostfix()} Overdue fine, returned`,
    description: 'Created by autotest team',
  };
  const selectOptions = (template) => {
    const generalOptions = {
      noticeName: 'FeeFine',
      noticeId: 'feeFine',
      format: 'Email',
      action: 'Overdue fine, returned',
      templateName: template.name,
    };
    if (template.name === noticeTemplates.returnedUponAt.name) {
      return {
        send: 'Upon/At',
        ...generalOptions,
      };
    } else if (template.name === noticeTemplates.returnedAfterOnce.name) {
      return {
        send: 'After',
        sendBy: {
          duration: '1',
          interval: 'Minute(s)',
        },
        frequency: 'One Time',
        ...generalOptions,
      };
    } else if (template.name === noticeTemplates.returnedAfterRecurring.name) {
      return {
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
        ...generalOptions,
      };
    }
  };
  const patronGroup = {
    name: 'groupToTestNotices' + getRandomPostfix(),
  };
  const userData = {
    personal: {
      lastname: null,
    },
  };
  const itemData = {
    barcode: generateItemBarcode(),
    title: `Instance ${getRandomPostfix()}`,
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('autotestReceiveNotice', uuid()),
    ruleProps: {},
  };
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

  const createPatronNoticeTemplate = (template) => {
    NewNoticePolicyTemplate.startAdding();
    NewNoticePolicyTemplate.checkInitialState();
    NewNoticePolicyTemplate.addToken('item.title');
    NewNoticePolicyTemplate.create(template, false);
    NewNoticePolicyTemplate.chooseCategory(template.category);
    NewNoticePolicyTemplate.checkPreview();
    NewNoticePolicyTemplate.saveAndClose();
    NewNoticePolicyTemplate.waitLoading();
    template.category = 'AutomatedFeeFineCharge';
    NewNoticePolicyTemplate.checkAfterSaving(template);
  };

  const loanPolicyBody = {
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
  const overdueFinePolicyBody = {
    id: uuid(),
    name: `automationOverdueFinePolicy${getRandomPostfix()}`,
    overdueFine: { quantity: '1.00', intervalId: 'minute' },
    countClosed: true,
    maxOverdueFine: '100.00',
  };
  const userOwnerBody = {
    id: uuid(),
    owner: 'AutotestOwner' + getRandomPostfix(),
    servicePointOwner: [
      {
        value: testData.userServicePoint.id,
        label: testData.userServicePoint.name,
      },
    ],
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
          name: `type_${getRandomPostfix()}`,
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
              status: { name: 'Available' },
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
    OverdueFinePolicy.createApi(overdueFinePolicyBody);
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
          permissions.loansAll.gui,

          permissions.uiUsersfeefinesCRUD.gui,
          permissions.uiUserAccounts.gui,
        ],
        patronGroup.name
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
            testData.userServicePoint.id
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
    CirculationRules.deleteRuleViaApi(testData.baseRules);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    cy.deleteLoanPolicy(loanPolicyBody.id);
    NoticePolicyApi.deleteApi(testData.ruleProps.n);
    OverdueFinePolicy.deleteApi(overdueFinePolicyBody.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.deleteItem(itemData.itemId);
    cy.deleteHoldingRecordViaApi(itemData.holdingId);
    InventoryInstance.deleteInstanceViaApi(itemData.instanceId); //
    PaymentMethods.deleteViaApi(testData.paymentMethod.id);
    UsersOwners.deleteViaApi(userOwnerBody.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id
    );
    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplates.returnedUponAt.name}` }).then(
      (templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      }
    );
    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplates.returnedAfterOnce.name}` }).then(
      (templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      }
    );
    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplates.returnedAfterRecurring.name}` }).then(
      (templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      }
    );
  });

  it(
    'C347874 Overdue fine, returned triggers (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      createPatronNoticeTemplate(noticeTemplates.returnedUponAt);
      createPatronNoticeTemplate(noticeTemplates.returnedAfterOnce);
      createPatronNoticeTemplate(noticeTemplates.returnedAfterRecurring);

      cy.visit(SettingsMenu.circulationPatronNoticePoliciesPath);
      NewNoticePolicy.waitLoading();
      NewNoticePolicy.startAdding();
      NewNoticePolicy.checkInitialState();
      NewNoticePolicy.fillGeneralInformation(noticePolicy);
      NewNoticePolicy.addFeeFineNotice(selectOptions(noticeTemplates.returnedUponAt));
      NewNoticePolicy.addFeeFineNotice(selectOptions(noticeTemplates.returnedAfterOnce), 1);
      NewNoticePolicy.addFeeFineNotice(selectOptions(noticeTemplates.returnedAfterRecurring), 2);
      NewNoticePolicy.save();
      NewNoticePolicy.waitLoading();
      NewNoticePolicy.check(noticePolicy);

      cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
        testData.ruleProps.n = noticePolicyRes[0].id;
        testData.ruleProps.l = loanPolicyBody.id;
        testData.ruleProps.o = overdueFinePolicyBody.id;
        CirculationRules.addRuleViaApi(testData.baseRules, testData.ruleProps, 't ', testData.loanTypeId);
      });

      cy.visit(TopMenu.checkOutPath);
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.checkUserInfo(userData, patronGroup.name);
      CheckOutActions.checkOutItem(itemData.barcode);
      Checkout.verifyResultsInTheRow([itemData.barcode]);
      CheckOutActions.endCheckOutSession();

      cy.wait(100000);
      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItem(itemData.barcode);
      CheckInActions.verifyLastCheckInItem(itemData.barcode);
      CheckInActions.endCheckInSession();

      cy.visit(TopMenu.circulationLogPath);
      cy.wait(200000);
      cy.reload();
      checkNoticeIsSent(searchResultsData(noticeTemplates.returnedAfterRecurring.name));
      checkNoticeIsSent(searchResultsData(noticeTemplates.returnedAfterOnce.name));
      checkNoticeIsSent(searchResultsData(noticeTemplates.returnedUponAt.name));

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
      UsersCard.waitLoading();
      UsersCard.openFeeFines();
      UsersCard.showOpenedFeeFines();
      UserAllFeesFines.clickRowCheckbox(0);
      UserAllFeesFines.paySelectedFeeFines();
      PayFeeFaine.setPaymentMethod(testData.paymentMethod);
      PayFeeFaine.submitAndConfirm();

      cy.visit(TopMenu.circulationLogPath);
      cy.wait(100000);
      SearchPane.searchByUserBarcode(userData.barcode);
      SearchPane.checkResultSearch({ object: 'Fee/fine', circAction: 'Paid fully' }, 0);
    }
  );
});
