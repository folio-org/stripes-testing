import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import LoansPage from '../../support/fragments/loans/loansPage';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import FileManager from '../../support/utils/fileManager';
import InteractorsTools from '../../support/utils/interactorsTools';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Circulation log', () => {
  const testData = {
    itemBarcode: getTestEntityValue('barcode'),
    instanceTitle: getTestEntityValue('Instance'),
    loanPolicy: {
      id: uuid(),
      name: getTestEntityValue('loanPolicy'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
        period: {
          duration: 2,
          intervalId: 'Hours',
        },
        profileId: 'Rolling',
      },
      renewable: false,
    },
    localeTimezone: 'Asia/Almaty',
    localeOverride: null,
    originalLocale: null,
    localeCode: 'en-US',
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    user: {},
  };

  const ISO_LIKE_DATE_PARTS_LOCALE = 'en-US';

  const getIsoLikeDueDateForTimezone = (dueDate, timezone) => {
    const date = new Date(dueDate);
    const parts = new Intl.DateTimeFormat(ISO_LIKE_DATE_PARTS_LOCALE, {
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      month: '2-digit',
      second: '2-digit',
      timeZone: timezone,
      timeZoneName: 'longOffset',
      year: 'numeric',
    }).formatToParts(date);

    const getPart = (type) => parts.find((part) => part.type === type)?.value;
    const timeZoneName = getPart('timeZoneName');
    const [, sign = '+', rawHours = '00', rawMinutes = '00'] =
      timeZoneName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/) || [];
    const timezoneOffset = `${sign}${rawHours.padStart(2, '0')}${rawMinutes.padStart(2, '0')}`;

    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}.${String(date.getUTCMilliseconds()).padStart(3, '0')}${timezoneOffset}`;
  };

  const setTestTimezone = () => {
    cy.getTenantLocaleApi().then((locale) => {
      testData.originalLocale = locale;
      testData.localeCode = locale.locale || 'en-US';
      testData.localeOverride = {
        ...locale,
        timezone: testData.localeTimezone,
      };
      return cy.setTenantLocaleApi(testData.localeOverride);
    });
  };

  const resetTimezone = () => {
    cy.getTenantLocaleApi().then((locale) => {
      if (locale.timezone === testData.localeTimezone) {
        cy.setTenantLocaleApi({
          ...locale,
          timezone: testData.originalLocale.timezone,
        });
      }
    });
  };

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getDefaultMaterialType().then((materialType) => {
          testData.materialTypeId = materialType.id;
        });
        cy.createLoanType({
          name: getTestEntityValue('loanType'),
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getRequestPolicy({ limit: 1 }).then((requestPolicies) => {
          testData.requestPolicyId = requestPolicies[0].id;
        });
        cy.getNoticePolicy({ limit: 1 }).then((noticePolicies) => {
          testData.noticePolicyId = noticePolicies[0].id;
        });
        cy.getOverdueFinePolicy({ limit: 1 }).then((overdueFinePolicies) => {
          testData.overdueFinePolicyId = overdueFinePolicies[0].id;
        });
        cy.getLostItemFeesPolicy({ limit: 1 }).then((lostItemPolicies) => {
          testData.lostItemPolicyId = lostItemPolicies[0].id;
        });
      })
      .then(() => {
        return InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: testData.itemBarcode,
              materialType: { id: testData.materialTypeId },
              permanentLoanType: { id: testData.loanTypeId },
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            },
          ],
        });
      })
      .then((specialInstanceIds) => {
        testData.folioInstance = specialInstanceIds;
        return LoanPolicy.createViaApi(testData.loanPolicy);
      })
      .then((createdLoanPolicy) => {
        testData.loanPolicy = createdLoanPolicy;
        return CirculationRules.addRuleViaApi(
          { t: testData.loanTypeId },
          {
            l: testData.loanPolicy.id,
            r: testData.requestPolicyId,
            n: testData.noticePolicyId,
            o: testData.overdueFinePolicyId,
            i: testData.lostItemPolicyId,
          },
        ).then((savedRule) => {
          testData.addedRule = savedRule;
        });
      })
      .then(() => {
        return cy.createTempUser([
          permissions.checkoutAll.gui,
          permissions.circulationLogAll.gui,
          permissions.uiUsersViewLoans.gui,
          permissions.uiUserLoansChangeDueDate.gui,
        ]);
      })
      .then((userProperties) => {
        testData.user = userProperties;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          testData.user.userId,
          testData.servicePoint.id,
        );
        return setTestTimezone();
      })
      .then(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.checkOutPath,
          waiter: Checkout.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();

    if (testData.originalLocale && testData.localeOverride) {
      resetTimezone();
    }
    if (testData.addedRule) {
      CirculationRules.deleteRuleViaApi(testData.addedRule);
    }
    if (testData.user.userId) {
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    }
    LoanPolicy.deleteApi(testData.loanPolicy.id);
    if (testData.folioInstance) {
      if (testData.user.userId) {
        UserLoans.closeLoanViaApi(testData.user.userId, testData.servicePoint.id);
      }
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstance,
        servicePoint: testData.servicePoint,
        shouldCheckIn: false,
      });
    }
    if (testData.user.userId) {
      Users.deleteViaApi(testData.user.userId);
    }
    if (testData.servicePoint.id) {
      ServicePoints.deleteViaApi(testData.servicePoint.id);
    }
    if (testData.loanTypeId) {
      cy.deleteLoanType(testData.loanTypeId);
    }
    if (testData.defaultLocation) {
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
    }
    FileManager.deleteFilesFromDownloadsByMask('CIRCULATION_LOG*');
  });

  it(
    'C770448 "Description" field displays time according to current time zone in Circulation log for Changed due date (volaris)',
    { tags: ['extendedPath', 'volaris', 'C770448'] },
    () => {
      // Step 1: Check out item and verify due date/time are shown in the selected timezone
      CheckOutActions.checkOutUser(testData.user.barcode);
      CheckOutActions.checkOutItem(testData.itemBarcode);
      Checkout.verifyResultsInTheRow([testData.itemBarcode, testData.instanceTitle]);

      UserLoans.getUserLoansIdViaApi(testData.user.userId).then(({ loans }) => {
        const originalDueDate = loans[0].dueDate;
        const datePart = DateTools.getFormattedDateInTimezone(
          originalDueDate,
          testData.localeTimezone,
          testData.localeCode,
        );
        const timePart = DateTools.getFormattedTimeInTimezone(
          originalDueDate,
          testData.localeTimezone,
          testData.localeCode,
        );

        CheckOutActions.checkItemDueDate(datePart);
        CheckOutActions.checkItemDueDate(timePart);

        // Step 2: Open Loan details and verify due date in selected timezone
        CheckOutActions.openLoanDetails();
        LoanDetails.waitLoanDetailsLoading();
        CheckOutActions.checkLoanDetailsDueDate(datePart, timePart);

        // Step 3: Change due date to tomorrow at 08:45 PM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowFormatted = `${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${String(tomorrow.getDate()).padStart(2, '0')}/${tomorrow.getFullYear()}`;

        LoansPage.openChangeDueDate();
        ChangeDueDateForm.fillDate(tomorrowFormatted);
        ChangeDueDateForm.fillTime('08:45 PM');
        ChangeDueDateForm.saveAndClose();

        // Verify updated due date is shown correctly in the loan details
        UserLoans.getUserLoansIdViaApi(testData.user.userId).then(({ loans: updatedLoans }) => {
          const newDueDate = updatedLoans[0].dueDate;
          const newDatePart = DateTools.getFormattedDateInTimezone(
            newDueDate,
            testData.localeTimezone,
            testData.localeCode,
          );
          const newTimePart = DateTools.getFormattedTimeInTimezone(
            newDueDate,
            testData.localeTimezone,
            testData.localeCode,
          );

          CheckOutActions.checkLoanDetailsDueDate(newDatePart, newTimePart);
          LoanDetails.checkDueDate(0, newDueDate, {
            timezone: testData.localeTimezone,
            locale: testData.localeCode,
          });

          const expectedNewDueDateIso = getIsoLikeDueDateForTimezone(
            newDueDate,
            testData.localeTimezone,
          );
          const expectedOriginalDueDateIso = getIsoLikeDueDateForTimezone(
            originalDueDate,
            testData.localeTimezone,
          );
          // Asia/Almaty is UTC+5 — verify dates use +0500, not UTC Z
          const timezoneOffsetPart = '+0500';

          // Step 4: Open Circulation log, search for Changed due date, verify description
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
          SearchPane.waitLoading();
          SearchPane.searchByItemBarcode(testData.itemBarcode);
          SearchPane.searchByChangedDueDate();

          SearchPane.findResultRowIndexByContent('Changed due date').then((rowIndex) => {
            SearchPane.checkResultSearch(
              {
                itemBarcode: testData.itemBarcode,
                circAction: 'Changed due date',
              },
              rowIndex,
            );

            // Description must contain both new and old due dates in timezone format
            SearchResults.verifyDescriptionContains(
              rowIndex,
              expectedNewDueDateIso,
              expectedOriginalDueDateIso,
              timezoneOffsetPart,
            );
            // Step 5: Export results as CSV and verify the same description appears
            FileManager.deleteFilesFromDownloadsByMask('CIRCULATION_LOG*');
            SearchPane.exportResults();
            InteractorsTools.checkCalloutMessage(
              'Your Circulation log export has been requested. Please wait while the file is downloaded.',
            );
            InteractorsTools.checkCalloutMessage('Export job has been completed.');
            FileManager.verifyFileIncludes('CIRCULATION_LOG*', [
              'Changed due date',
              expectedNewDueDateIso,
              expectedOriginalDueDateIso,
              timezoneOffsetPart,
            ]);
          });
        });
      });
    },
  );
});
