import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import FileManager from '../../support/utils/fileManager';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../support/constants';

let userData = {};
const testData = {};
const itemData = {
  barcode: getRandomPostfix(),
  instanceTitle: `AT_C350727_Instance_${getRandomPostfix()}`,
};
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const lastWeek = DateTools.getFormattedDate({ date: DateTools.getLastWeekDateObj() }, 'MM/DD/YYYY');
const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
const todayWithoutPadding = DateTools.getFormattedDateWithSlashes({ date: new Date() });
const nextWeek = DateTools.getFormattedDate(
  { date: DateTools.getFutureWeekDateObj() },
  'MM/DD/YYYY',
);
const exportRequestedCalloutMessage =
  'Your Circulation log export has been requested. Please wait while the file is downloaded.';
const jobCompletedCalloutMessage = 'Export job has been completed.';

describe('Export Manager', () => {
  before('create instance, user and two jobs', () => {
    cy.getAdminToken()
      .then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          testData.holdingTypeId = res[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          testData.locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
        ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
          testData.servicepointId = servicePoints[0].id;
        });
      })
      .then(() => {
        InventoryInstances.createInstanceViaApi(itemData.instanceTitle, itemData.barcode);
      });
    cy.createTempUser([
      permissions.exportManagerAll.gui,
      permissions.circulationLogAll.gui,
      permissions.checkoutAll.gui,
      permissions.bulkEditUpdateRecords.gui,
      permissions.uiUsersView.gui,
    ])
      .then((userProperties) => {
        userData = { ...userProperties };
        UserEdit.addServicePointViaApi(
          testData.servicepointId,
          userData.userId,
          testData.servicepointId,
        );
      })
      .then(() => {
        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: itemData.barcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.servicepointId,
          userBarcode: userData.barcode,
        });
        cy.wait(3000);

        // Login and visit are separated, because otherwise user wasn't getting assigned permissions
        cy.login(userData.username, userData.password);
      })
      .then(() => {
        // Creating a bulk edit job
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.waitLoading();

        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, userData.userId);
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Creating a circulation log job
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
        SearchPane.waitLoading();
        SearchPane.searchByCheckedOut();
        cy.wait(500);
        SearchPane.exportResults();
        InteractorsTools.checkCalloutMessage(exportRequestedCalloutMessage);
        InteractorsTools.checkCalloutMessage(jobCompletedCalloutMessage);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
      });
  });

  after('check in item, delete instance, user and files', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      checkInDate: moment.utc().format(),
      servicePointId: testData.servicepointId,
      itemBarcode: itemData.barcode,
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    Users.deleteViaApi(userData.userId);
    FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
  });

  it(
    'C788681 Verify search filter options Export Manager (firebird)',
    { tags: ['criticalPath', 'firebird', 'C788681'] },
    () => {
      ExportManagerSearchPane.waitLoading();
      ExportManagerSearchPane.searchBySuccessful();
      cy.do(
        ExportManagerSearchPane.getSearchResult(0, 0).perform((element) => {
          ExportManagerSearchPane.searchById(element.innerText);
        }),
      );
      ExportManagerSearchPane.selectSearchResultItem();
      ExportManagerSearchPane.closeExportJobPane();

      ExportManagerSearchPane.resetAll();

      ExportManagerSearchPane.searchBySuccessful();
      ExportManagerSearchPane.verifyResult('Successful');
      ExportManagerSearchPane.searchByInProgress();
      ExportManagerSearchPane.searchByScheduled();
      ExportManagerSearchPane.searchByFailed();

      ExportManagerSearchPane.searchByBulkEdit();
      ExportManagerSearchPane.verifyResult('Bulk edit identifiers');
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
    },
  );
});
