import moment from 'moment';
import uuid from 'uuid';
import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import DataImport from '../../support/fragments/data_import/dataImport';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import FileManager from '../../support/utils/fileManager';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

let user;
let itemData;
const testData = {};
const lastWeek = DateTools.getFormattedDate({ date: DateTools.getLastWeekDateObj() }, 'MM/DD/YYYY');
const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();
const exportRequestedCalloutMessage =
  'Your Circulation log export has been requested. Please wait while the file is downloaded.';
const jobCompletedCalloutMessage = 'Export job has been completed.';

const marcFiles = {
  marc: 'marcAuthFileC350733.mrc',
  fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  authorityHeading: 'AT_C350733_MarcAuthoriy',
  propertyName: 'authority',
};

const createdRecordIDs = [];

describe('Export Manager', () => {
  before('create test data', () => {
    itemData = {
      barcode: getRandomPostfix(),
      instanceTitle: `AT_C350733_Instance_${getRandomPostfix()}`,
    };

    cy.getAdminToken()
      .then(() => {
        // make sure there are no duplicate authority records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C350733');

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
        cy.getDefaultMaterialType().then((res) => {
          testData.materialTypeId = res.id;
        });
        ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
          testData.servicepointId = servicePoints[0].id;
        });
      })
      .then(() => {
        InventoryInstances.createInstanceViaApi(itemData.instanceTitle, itemData.barcode);

        // Upload MARC authority file
        DataImport.uploadFileViaApi(
          marcFiles.marc,
          marcFiles.fileName,
          marcFiles.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFiles.propertyName].id);
          });
        });
      });

    cy.createTempUser([permissions.exportManagerAll.gui]).then((userProperties) => {
      user = userProperties;
    });

    // Create test jobs using admin token
    cy.getAdminToken().then(() => {
      // Create a circulation log job
      cy.createTempUser([]).then((tempUser) => {
        testData.tempUser = tempUser;
        UserEdit.addServicePointViaApi(
          testData.servicepointId,
          testData.tempUser.userId,
          testData.servicepointId,
        );

        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: itemData.barcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.servicepointId,
          userBarcode: testData.tempUser.barcode,
        });
        cy.wait(3000);
      });

      cy.loginAsAdmin().then(() => {
        // Create circulation log export job
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
        SearchPane.waitLoading();
        SearchPane.searchByCheckedOut();
        cy.wait(500);
        SearchPane.exportResults();
        InteractorsTools.checkCalloutMessage(exportRequestedCalloutMessage);
        InteractorsTools.checkCalloutMessage(jobCompletedCalloutMessage);

        // Create an Authority control job by editing MARC authority record
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.waitLoading();
        MarcAuthorities.searchBy('Keyword', marcFiles.authorityHeading);
        MarcAuthorities.selectTitle(marcFiles.authorityHeading);
        MarcAuthority.edit();
        QuickMarcEditor.waitLoading();
        cy.wait(2000);
        QuickMarcEditor.updateExistingField('100', '$a AT_C350733_MarcAuthoriy_UPDATED');
        QuickMarcEditor.pressSaveAndClose();
        MarcAuthorities.verifyViewPaneContentExists();
        MarcAuthorities.clickActionsAndReportsButtons();
        MarcAuthorities.fillReportModal(today, tomorrow);
        MarcAuthorities.clickExportButton();
        cy.wait(2000);
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      checkInDate: moment.utc().format(),
      servicePointId: testData.servicepointId,
      itemBarcode: itemData.barcode,
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    MarcAuthority.deleteViaAPI(createdRecordIDs[0]);
    Users.deleteViaApi(user.userId);
    Users.deleteViaApi(testData.tempUser.userId);
    FileManager.deleteFileFromDownloadsByMask('CIRCULATION_LOG*');
  });

  it(
    'C350733 Export Manager -- multiple filters in combination with one another (firebird)',
    { tags: ['criticalPath', 'firebird', 'C350733'] },
    () => {
      // Step 1: Navigate to the Export Manager App
      cy.login(user.username, user.password, {
        path: TopMenu.exportManagerPath,
        waiter: ExportManagerSearchPane.waitLoading,
      });

      // Step 2: Select all checkboxes from "Status" accordion
      ExportManagerSearchPane.searchByScheduled();
      ExportManagerSearchPane.searchByInProgress();
      ExportManagerSearchPane.searchBySuccessful();
      ExportManagerSearchPane.searchByFailed();
      ExportManagerSearchPane.waitForJobs();
      ExportManagerSearchPane.checkFilterOptions({
        jobTypeFilterOption: [
          'Authority control',
          'Bursar',
          'Circulation log',
          'eHoldings',
          'Orders (EDI)',
          'Orders (CSV)',
        ],
      });
      ExportManagerSearchPane.verifyResult('Successful');

      // Step 3: Scroll to the "Job type" accordion => Check any of Job types
      ExportManagerSearchPane.searchByCirculationLog();
      ExportManagerSearchPane.checkColumnInResultsTable({ jobType: 'Circulation log' });
      ExportManagerSearchPane.checkFilterOptions({
        jobTypeFilterOption: [
          'Authority control',
          'Bursar',
          'eHoldings',
          'Orders (EDI)',
          'Orders (CSV)',
        ],
      });

      // Step 4: Scroll to the "Start time" accordion => Fill "From" and "To" textboxes => Click on "Apply" button
      ExportManagerSearchPane.enterStartTime(lastWeek, today);
      ExportManagerSearchPane.waitForJobs();
      ExportManagerSearchPane.checkColumnInResultsTable({ jobType: 'Circulation log' });

      // Step 5: Select any other filter option
      ExportManagerSearchPane.searchByCirculationLog();
      ExportManagerSearchPane.searchByAuthorityControl();
      ExportManagerSearchPane.checkColumnInResultsTable({
        jobType: 'MARC authority headings updates',
      });
      ExportManagerSearchPane.resetAll();
      ExportManagerSearchPane.waitLoading();
    },
  );
});
