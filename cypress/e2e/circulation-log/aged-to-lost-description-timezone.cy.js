import uuid from 'uuid';
import { KeyValue, MultiColumnListCell, including } from '../../../interactors';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Circulation log', () => {
  const MAX_AGED_TO_LOST_WAIT_MINUTES = 60;
  const LOAN_STATUS_POLL_INTERVAL_MS = 10000;
  const LOAN_STATUS_MAX_RETRIES =
    (MAX_AGED_TO_LOST_WAIT_MINUTES * 60 * 1000) / LOAN_STATUS_POLL_INTERVAL_MS;
  // The aged-to-lost job may complete any time within the wait window, so allow the
  // same upper bound when comparing the description due date to the original loan due date.
  const ALLOWED_DESCRIPTION_DUE_DATE_DRIFT_MINUTES = MAX_AGED_TO_LOST_WAIT_MINUTES;

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
          duration: 1,
          intervalId: 'Minutes',
        },
        profileId: 'Rolling',
      },
      renewable: false,
    },
    localeTimezone: 'Pacific/Nauru',
    lostItemFeePolicy: {
      id: uuid(),
      name: getTestEntityValue('lostItemFeePolicy'),
      chargeAmountItem: {
        amount: '10.00',
        chargeType: 'anotherCost',
      },
      lostItemProcessingFee: '0.00',
      chargeAmountItemPatron: false,
      chargeAmountItemSystem: false,
      returnedLostItemProcessingFee: false,
      replacedLostItemProcessingFee: false,
      replacementProcessingFee: '0.00',
      replacementAllowed: false,
      lostItemReturned: 'Charge',
      itemAgedLostOverdue: {
        duration: 1,
        intervalId: 'Minutes',
      },
      patronBilledAfterAgedLost: {
        duration: 1,
        intervalId: 'Minutes',
      },
    },
    localeOverride: null,
    originalLocale: null,
    localeCode: 'en-US',
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    user: {},
  };

  const ISO_LIKE_DATE_PARTS_LOCALE = 'en-US';

  const descriptionDatePattern =
    /Due date:\s(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:Z|[+-]\d{4}))/;

  const getDueDatePartsForTimezone = (dueDate, timezone, locale) => {
    const datePart = DateTools.getFormattedDateInTimezone(dueDate, timezone, locale);
    const timePart = DateTools.getFormattedTimeInTimezone(dueDate, timezone, locale);

    return {
      datePart,
      timePart,
    };
  };

  const getIsoLikeDueDateForTimezone = (dueDate, timezone) => {
    const date = new Date(dueDate);
    // Keep a fixed English locale here because this is not UI rendering.
    // We need stable ASCII digits and a predictable GMT offset label for parsing.
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

  const parseIsoLikeDescriptionDate = (value) => {
    const [, year, month, day, hour, minute, second, milliseconds, timezoneOffset] = value.match(
      /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})(Z|[+-]\d{4})/,
    );

    const utcTimestamp = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(milliseconds),
    );

    if (timezoneOffset === 'Z') {
      return utcTimestamp;
    }

    const offsetSign = timezoneOffset.startsWith('+') ? 1 : -1;
    const offsetHours = Number(timezoneOffset.slice(1, 3));
    const offsetMinutes = Number(timezoneOffset.slice(3, 5));
    const totalOffsetMinutes = offsetSign * (offsetHours * 60 + offsetMinutes);

    return utcTimestamp - totalOffsetMinutes * 60 * 1000;
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
      if (locale.timezone === testData.localeOverride.timezone) {
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

        return LostItemFeePolicy.createViaApi(testData.lostItemFeePolicy);
      })
      .then((createdLostItemFeePolicy) => {
        testData.lostItemFeePolicy = createdLostItemFeePolicy;

        return cy.getCirculationRules().then((rules) => {
          const newRule = `t ${testData.loanTypeId}: l ${testData.loanPolicy.id} r ${testData.requestPolicyId} n ${testData.noticePolicyId} o ${testData.overdueFinePolicyId} i ${testData.lostItemFeePolicy.id}`;
          testData.addedRule = `\n${newRule}`;
          const updatedRules = `${rules.rulesAsText}${testData.addedRule}`;

          return CirculationRules.updateCirculationRules(updatedRules);
        });
      })
      .then(() => {
        return cy.createTempUser([
          permissions.checkoutAll.gui,
          permissions.circulationLogAll.gui,
          permissions.uiUsersViewLoans.gui,
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
    LostItemFeePolicy.deleteViaApi(testData.lostItemFeePolicy.id);
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
  });

  it(
    'C770456 "Description" field displays time according to current time zone in Circulation log for Aged to lost item (volaris)',
    { tags: ['extendedPath', 'volaris', 'C770456'] },
    () => {
      CheckOutActions.checkOutUser(testData.user.barcode);
      CheckOutActions.checkOutItem(testData.itemBarcode);
      Checkout.verifyResultsInTheRow([testData.itemBarcode, testData.instanceTitle]);

      UserLoans.getUserLoansIdViaApi(testData.user.userId).then(({ loans }) => {
        const loanId = loans[0].id;
        const dueDate = loans[0].dueDate;
        const { datePart, timePart } = getDueDatePartsForTimezone(
          dueDate,
          testData.localeTimezone,
          testData.localeCode,
        );
        const expectedDescriptionDueDate = getIsoLikeDueDateForTimezone(
          dueDate,
          testData.localeTimezone,
        );

        CheckOutActions.checkItemDueDate(datePart);
        CheckOutActions.checkItemDueDate(timePart);
        CheckOutActions.openLoanDetails();
        cy.expect(KeyValue('Due date').has({ value: including(datePart) }));
        cy.expect(KeyValue('Due date').has({ value: including(timePart) }));

        cy.getAdminToken();
        // Return the timezone back to original while polling to avoid a conflict with other tests
        // as the change of the loan status may take a while.
        resetTimezone();
        UserLoans.waitForLoanItemStatusInHistory(
          loanId,
          ITEM_STATUS_NAMES.AGED_TO_LOST,
          LOAN_STATUS_MAX_RETRIES,
          LOAN_STATUS_POLL_INTERVAL_MS,
        );
        setTestTimezone();

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.circulationLogPath,
          waiter: SearchPane.waitLoading,
        });

        SearchPane.searchByItemBarcode(testData.itemBarcode);
        SearchPane.findResultRowIndexByContent('Due date: ').then((rowIndex) => {
          SearchPane.checkResultSearch(
            {
              itemBarcode: testData.itemBarcode,
              circAction: 'Aged to lost',
            },
            rowIndex,
          );

          cy.wrap(MultiColumnListCell({ row: Number(rowIndex), columnIndex: 7 }).text()).then(
            (description) => {
              const descriptionDateMatch = description.match(descriptionDatePattern);

              expect(description).to.include('Due date:');
              expect(descriptionDateMatch).to.not.equal(null);

              const actualDescriptionDueDate = descriptionDateMatch[1];
              const dueDateDriftMinutes =
                Math.abs(
                  parseIsoLikeDescriptionDate(actualDescriptionDueDate) -
                    parseIsoLikeDescriptionDate(expectedDescriptionDueDate),
                ) /
                (1000 * 60);

              expect(dueDateDriftMinutes).to.be.at.most(ALLOWED_DESCRIPTION_DUE_DATE_DRIFT_MINUTES);
            },
          );

          SearchResults.chooseActionByRow(rowIndex, 'Loan details');
          LoanDetails.waitLoanDetailsLoading();
          LoanDetails.checkAction(0, 'Aged to lost');
          LoanDetails.checkStatusInList(0, ITEM_STATUS_NAMES.AGED_TO_LOST);
          LoanDetails.checkDueDate(0, dueDate, {
            timezone: testData.localeTimezone,
            locale: testData.localeCode,
          });
        });
      });
    },
  );
});
