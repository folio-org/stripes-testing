import uuid from 'uuid';

import { LIBRARY_DUE_DATE_MANAGMENT, LOAN_PROFILE } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import { getTestEntityValue } from '../../support/utils/stringTools';

let materialTypes;
let testData;
let userData;

const loanPolicies = [
  {
    id: uuid(),
    name: getTestEntityValue('1_day'),
    loanable: true,
    loansPolicy: {
      closedLibraryDueDateManagementId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE,
      period: {
        duration: 1,
        intervalId: 'Days',
      },
      profileId: LOAN_PROFILE.ROLLING,
    },
    renewable: true,
    renewalsPolicy: {
      unlimited: false,
      numberAllowed: 1,
      renewFromId: 'SYSTEM_DATE',
    },
  },
  {
    id: uuid(),
    name: getTestEntityValue('1_week'),
    loanable: true,
    loansPolicy: {
      closedLibraryDueDateManagementId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE,
      period: {
        duration: 1,
        intervalId: 'Weeks',
      },
      profileId: LOAN_PROFILE.ROLLING,
    },
    renewable: false,
    renewalsPolicy: {
      unlimited: false,
      numberAllowed: 1,
      renewFromId: 'SYSTEM_DATE',
    },
  },
  {
    id: uuid(),
    name: getTestEntityValue('3_months'),
    loanable: true,
    loansPolicy: {
      closedLibraryDueDateManagementId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE,
      period: {
        duration: 3,
        intervalId: 'Months',
      },
      profileId: LOAN_PROFILE.ROLLING,
    },
    renewable: false,
    renewalsPolicy: {
      unlimited: false,
      numberAllowed: 1,
      renewFromId: 'SYSTEM_DATE',
    },
  },
];

describe('Circulation log', () => {
  describe('Loan Policies', () => {
    before('create inventory instance', () => {
      cy.createTempUser([
        Permissions.circulationLogAll.gui,
        Permissions.checkoutAll.gui,
        Permissions.checkinAll.gui,
      ]).then((userProperties) => {
        userData = userProperties;
        cy.getMaterialTypes({ limit: 3 })
          .then(() => {
            materialTypes = Cypress.env('materialTypes');
            testData = {
              folioInstances: InventoryInstances.generateFolioInstances({
                count: 3,
                itemsProperties: materialTypes.map(({ id }) => ({ materialType: { id } })),
              }),
              servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
              requestsId: '',
            };
            ServicePoints.createViaApi(testData.servicePoint);
            testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
            Locations.createViaApi(testData.defaultLocation).then((location) => {
              InventoryInstances.createFolioInstancesViaApi({
                folioInstances: testData.folioInstances,
                location,
              });
            });
          })
          .then(() => {
            UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);
          })
          .then(() => {
            testData.addedRules = [];
            loanPolicies.forEach((policy) => LoanPolicy.createViaApi(policy));
            materialTypes.forEach((materialType, index) => {
              CirculationRules.addRuleViaApi(
                { m: materialType.id },
                { l: loanPolicies[index].id },
              ).then((newRule) => {
                testData.addedRules.push(newRule);
              });
            });
            cy.login(userData.username, userData.password);
          });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      cy.wrap(testData.addedRules).each((rule) => {
        CirculationRules.deleteRuleViaApi(rule);
      });
      testData.folioInstances.forEach((instance) => {
        CheckInActions.checkinItemViaApi({
          itemBarcode: instance.barcodes[0],
          servicePointId: testData.servicePoint.id,
          checkInDate: new Date().toISOString(),
        });
      });
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      loanPolicies.forEach((policy) => {
        LoanPolicy.deleteApi(policy.id);
      });
      testData.folioInstances.forEach((item) => {
        InventoryInstances.deleteInstanceViaApi({
          instance: item,
          servicePoint: testData.servicePoint,
          shouldCheckIn: true,
        });
      });
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C645 Test "Days" loan period (vega) (TaaS)',
      { tags: ['criticalPath', 'vega', 'C645'] },
      () => {
        const ITEM_BARCODE = testData.folioInstances[0].barcodes[0];
        // Navigate to checkout page
        cy.visit(TopMenu.checkOutPath);
        // Enter patron and item that meet the criteria of the circulation rule
        CheckOutActions.checkOutItemUser(userData.barcode, ITEM_BARCODE);
        const itemDueDate = new Date(DateTools.getTomorrowDay());
        // Check due date/time
        CheckOutActions.checkItemDueDate(
          DateTools.getFormattedDateWithSlashes({ date: itemDueDate }),
        );
      },
    );

    it(
      'C646 Test "Weeks" loan period (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C646'] },
      () => {
        const ITEM_BARCODE = testData.folioInstances[1].barcodes[0];
        // Navigate to checkout page
        cy.visit(TopMenu.checkOutPath);
        // Enter patron and item that meet the criteria of the circulation rule
        CheckOutActions.checkOutItemUser(userData.barcode, ITEM_BARCODE);
        const itemDueDate = new Date(DateTools.getFutureWeekDateObj());
        // Check due date/time
        CheckOutActions.checkItemDueDate(
          DateTools.getFormattedDateWithSlashes({ date: itemDueDate }),
        );
      },
    );

    it(
      'C647 Test "Months" loan period (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C647'] },
      () => {
        const ITEM_BARCODE = testData.folioInstances[2].barcodes[0];
        // Navigate to checkout page
        cy.visit(TopMenu.checkOutPath);
        // Enter patron and item that meet the criteria of the circulation rule
        CheckOutActions.checkOutItemUser(userData.barcode, ITEM_BARCODE);
        const itemDueDate = new Date(DateTools.getAfterThreeMonthsDateObj());
        // Check due date/time
        CheckOutActions.checkItemDueDate(
          DateTools.getFormattedDateWithSlashes({ date: itemDueDate }),
        );
      },
    );
  });
});
