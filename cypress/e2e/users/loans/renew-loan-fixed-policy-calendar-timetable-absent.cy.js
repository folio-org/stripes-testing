import moment from 'moment';
import uuid from 'uuid';

import { LOAN_PROFILE, CLOSED_LIBRARY_DUE_DATE_MANAGEMENT } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import { createCalendar, deleteCalendar } from '../../../support/fragments/calendar/calendar';
import Checkout from '../../../support/fragments/checkout/checkout';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../../support/fragments/circulation/loan-policy';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import LoansPage from '../../../support/fragments/loans/loansPage';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import OverrideAndRenewModal from '../../../support/fragments/users/loans/overrideAndRenewModal';
import RenewConfirmationModal from '../../../support/fragments/users/loans/renewConfirmationModal';
import UserLoans from '../../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Users', () => {
  describe('Loans: Renewals', () => {
    const DATE_API_FORMAT = 'YYYY-MM-DD';
    const DAYS_OF_WEEK = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];

    // Calendar covers today through today+30; fixed schedule spans the same range
    const calendarEndDate = moment.utc().add(30, 'days');
    const scheduleFromDate = moment.utc().subtract(1, 'days');
    const scheduleDueDate = calendarEndDate.clone();

    // Override date lands after the calendar end so the second renewal has no calendar entry
    const overrideDateForInput = moment.utc().add(45, 'days').format('MM/DD/YYYY');

    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      folioInstance: InventoryInstances.generateFolioInstances({ count: 1 }),
      calendarId: null,
      schedule: {},
      addedRule: null,
      defaultLocation: {},
      patron: {},
      staffUser: {},
    };

    const loanPolicyBody = {
      id: uuid(),
      name: getTestEntityValue('fixed-cal-absent'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: CLOSED_LIBRARY_DUE_DATE_MANAGEMENT.CURRENT_DUE_DATE,
        fixedDueDateScheduleId: '',
        profileId: LOAN_PROFILE.FIXED,
      },
      renewable: true,
      renewalsPolicy: {
        numberAllowed: 2,
        unlimited: false,
      },
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Location.createViaApi(testData.defaultLocation).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstance,
            location,
          });
        });

        // Calendar open every day 00:00–23:59; end date before the override date
        const calendarBody = {
          name: getTestEntityValue('cal-fixed-policy'),
          assignments: [testData.servicePoint.id],
          startDate: moment.utc().format(DATE_API_FORMAT),
          endDate: calendarEndDate.format(DATE_API_FORMAT),
          normalHours: DAYS_OF_WEEK.map((day) => ({
            startDay: day,
            startTime: '00:00',
            endDay: day,
            endTime: '23:59',
          })),
          exceptions: [],
        };
        createCalendar(calendarBody, (response) => {
          testData.calendarId = response.body.id;
        });

        cy.getDefaultMaterialType().then((mt) => {
          testData.materialTypeId = mt.id;
        });

        cy.createFixedDueDateSchedule({
          schedules: [
            {
              from: scheduleFromDate.format(),
              to: scheduleDueDate.format(),
              due: scheduleDueDate.format(),
            },
          ],
        }).then((schedule) => {
          testData.schedule = schedule;
          loanPolicyBody.loansPolicy.fixedDueDateScheduleId = schedule.id;

          LoanPolicy.createViaApi(loanPolicyBody).then(() => {
            CirculationRules.addRuleViaApi(
              { m: testData.materialTypeId },
              { l: loanPolicyBody.id },
            ).then((addedRule) => {
              testData.addedRule = addedRule;
            });
          });
        });
      });

      cy.createTempUser([]).then((patronProperties) => {
        testData.patron = patronProperties;
        UserEdit.addServicePointViaApi(testData.servicePoint.id, patronProperties.userId);
        cy.wrap(null).then(() => {
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.folioInstance[0].barcodes[0],
            servicePointId: testData.servicePoint.id,
            userBarcode: patronProperties.barcode,
          });
        });
      });

      cy.createTempUser([
        permissions.uiUsersView.gui,
        permissions.loansView.gui,
        permissions.loansRenew.gui,
        permissions.loansRenewOverride.gui,
      ]).then((staffProperties) => {
        testData.staffUser = staffProperties;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          staffProperties.userId,
          testData.servicePoint.id,
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.folioInstance.forEach((instance) => {
        InventoryInstances.deleteInstanceViaApi({
          instance,
          servicePoint: testData.servicePoint,
          shouldCheckIn: true,
        });
      });
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      cy.deleteLoanPolicy(loanPolicyBody.id).then(() => {
        cy.deleteFixedDueDateSchedule(testData.schedule.id);
      });
      if (testData.calendarId) {
        deleteCalendar(testData.calendarId);
      }
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
      UserEdit.changeServicePointPreferenceViaApi(testData.patron.userId, [
        testData.servicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(testData.staffUser.userId, [
        testData.servicePoint.id,
      ]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.patron.userId);
      Users.deleteViaApi(testData.staffUser.userId);
    });

    it(
      'C1538662 Renew loan with fixed policy when calendar timetable is absent for requested date (vega)',
      { tags: ['extendedPath', 'vega', 'C1538662'] },
      () => {
        const itemBarcode = testData.folioInstance[0].barcodes[0];

        cy.login(testData.staffUser.username, testData.staffUser.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });

        // Step 1: Navigate to patron open loans and open loan details, then click Renew
        UsersSearchPane.searchByUsername(testData.patron.username);
        UsersSearchPane.selectUserFromList(testData.patron.username);
        Users.expandLoansAccordion();
        Users.clickOpenLoansLink();
        UserLoans.waitLoading();
        UserLoans.openLoanDetails(itemBarcode);
        LoansPage.waitLoading();
        UserLoans.renewItem(itemBarcode, true);
        LoansPage.verifyMessage('Item not renewed:');
        LoansPage.verifyMessage('Renewal would not change the due date.');

        // Step 2: Override with a date beyond the calendar end date
        RenewConfirmationModal.confirmRenewOverrideItem();
        OverrideAndRenewModal.fillDateAndTime(overrideDateForInput);
        OverrideAndRenewModal.confirmOverrideItem();
        LoanDetails.waitLoanDetailsLoading();
        LoanDetails.checkRenewalCount();
        LoanDetails.checkAction(0, 'Renewed through override');

        // Step 3: Renew again — expects "Calendar timetable is absent" with no Override button
        UserLoans.renewItem(itemBarcode, true);
        LoansPage.verifyMessage('Item not renewed:');
        LoansPage.verifyMessage('Calendar timetable is absent for requested date.');
        LoansPage.checkOverrideButtonHidden();

        // Step 4: Close modal, verify loan details remain unchanged
        RenewConfirmationModal.closeModal();
        LoanDetails.waitLoanDetailsLoading();
        LoanDetails.checkRenewalCount();
        LoanDetails.checkAction(0, 'Renewed through override');
      },
    );
  });
});
