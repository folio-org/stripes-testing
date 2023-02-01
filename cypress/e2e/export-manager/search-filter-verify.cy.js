import uuid from 'uuid';
import moment from 'moment';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import testTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import DateTools from '../../support/utils/dateTools';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InteractorsTools from '../../support/utils/interactorsTools';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import FileManager from '../../support/utils/fileManager';

const testData = {};
const userData = {};
const itemData = {
  barcode: getRandomPostfix(),
  instanceTitle: `Instance ${getRandomPostfix()}`,
};
const lastWeek = DateTools.getFormattedDate({ date: DateTools.getLastWeekDateObj() }, 'MM/DD/YYYY');
const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
const todayWithoutPadding = DateTools.getFormattedDateWithSlashes({ date: new Date() });
const nextWeek = DateTools.getFormattedDate({ date: DateTools.getFutureWeekDateObj() }, 'MM/DD/YYYY');
const exportRequestedCalloutMessage = 'Your Circulation log export has been requested. Please wait while the file is downloaded.';
const jobCompletedCalloutMessage = 'Export job has been completed.';

describe('export manager', () => {
  before('navigate to export manager', () => {
    cy.getAdminToken().then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => { testData.instanceTypeId = instanceTypes[0].id; });
      cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingTypeId = res[0].id; });
      cy.getLocations({ limit: 1 }).then((res) => { testData.locationId = res.id; });
      cy.getLoanTypes({ limit: 1 }).then((res) => { testData.loanTypeId = res[0].id; });
      cy.getMaterialTypes({ limit: 1 }).then((res) => { testData.materialTypeId = res.id; });
      ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => { testData.servicepointId = servicePoints[0].id; });
    }).then(() => {
      InventoryInstances.createInstanceViaApi(itemData.instanceTitle, itemData.barcode);
    });
    cy.createTempUser([
      permissions.exportManagerAll.gui,
      permissions.circulationLogAll.gui,
      permissions.checkoutAll.gui,
    ])
      .then(userProperties => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        UserEdit.addServicePointViaApi(testData.servicepointId,
          userData.userId, testData.servicepointId);
      })
      .then(() => {
        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: itemData.barcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.servicepointId,
          userBarcode: userData.barcode,
        });

        //Login and visit are separated, because otherwise user wasn't getting assigned permissions
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.circulationLogPath);
      });

    SearchPane.searchByCheckedOut();
    SearchPane.exportResults();
    InteractorsTools.checkCalloutMessage(exportRequestedCalloutMessage);
    InteractorsTools.checkCalloutMessage(jobCompletedCalloutMessage);

    cy.visit(TopMenu.exportManagerPath);
  });

  after('delete user', () => {
    CheckInActions.checkinItemViaApi({
      checkInDate: moment.utc().format(),
      servicePointId: testData.servicepointId,
      itemBarcode: itemData.barcode,
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    Users.deleteViaApi(userData.userId);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });

  it('C350727 Verify search filter options Export Manager (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    ExportManagerSearchPane.waitLoading();
    // Need to pass variable for the first search result, instead of '000096'
    ExportManagerSearchPane.searchById('000096');
    ExportManagerSearchPane.selectSearchResultItem();
    ExportManagerSearchPane.closeExportJobPane();

    ExportManagerSearchPane.resetAll();

    ExportManagerSearchPane.searchBySuccessful();
    ExportManagerSearchPane.verifyResult('Successful');
    ExportManagerSearchPane.searchByInProgress();
    ExportManagerSearchPane.searchByScheduled();
    ExportManagerSearchPane.searchByFailed();

    ExportManagerSearchPane.searchByBulkEdit();
    ExportManagerSearchPane.verifyResult('BULK_EDIT_IDENTIFIERS');
    ExportManagerSearchPane.resetJobType();
    ExportManagerSearchPane.searchByCirculationLog();
    ExportManagerSearchPane.verifyResult('Circulation log');

    ExportManagerSearchPane.enterStartTime(lastWeek, today);
    ExportManagerSearchPane.verifyResult(todayWithoutPadding);
    ExportManagerSearchPane.resetStartTime();
    ExportManagerSearchPane.enterEndTime(today, nextWeek);
    ExportManagerSearchPane.verifyResult(todayWithoutPadding);
    ExportManagerSearchPane.resetEndTime();

    ExportManagerSearchPane.searchBySystemNo();
    ExportManagerSearchPane.resetAll();
    ExportManagerSearchPane.searchBySourceUserName(userData.username);
    ExportManagerSearchPane.verifyUserSearchResult(userData.username);
  });
});