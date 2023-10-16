import TopMenu from '../../../support/fragments/topMenu';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TestTypes from '../../../support/dictionary/testTypes';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../../support/dictionary/devTeams';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import DateTools from '../../../support/utils/dateTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';

describe('Create holding records with MARC source', () => {
  const testData = {
    tagLDR: 'LDR',
    tag001: '001',
    tag004: '004',
    tag005: '005',
    tag151: '151',
    tag400: '400',
    tag852: '852',
    tag866: '866',
    tag999: '999',
    tag866Value: 'Test',
    headerTitle: 'Create a new MARC Holdings record',
    headerSubtitle: 'New',
    defaultLDRmask: /00000nu.{2}\\.{7}un\\4500/,
    tagLDRValueInSourceMask: /LEADER\s\d{5}[c,d,n][u,v,x,y]\s{3}22\d{5}[1,2,3,4,5,m,u,z].\s4500/,
    tag001ValueInSourceMask: /[a-z]+\d+/,
    tag004ValueInSourceMask: /[a-z]+\d+/,
    tag005ValueInSourceMask: /\d+.\d+/,
    tag999ValueInSourceMask: /f\sf‡s\s.+\s‡i\s.+\S/,
    default008BoxesValues: [
      '0',
      'u',
      '\\\\\\\\',
      '0',
      '\\',
      '\\',
      '\\',
      '0',
      '\\\\\\',
      'u',
      'u',
      'eng',
      '0',
      '\\\\\\\\\\\\',
    ],
    sourceMARC: 'MARC',
    tag852callout: 'Record cannot be saved. An 852 is required.',
  };

  const marcFiles = [
    {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
  ];

  let user;
  const recordIDs = [];
  let location;
  let servicePointId;

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
    ]).then((createdUserProperties) => {
      user = createdUserProperties;

      ServicePoints.getViaApi().then((servicePoint) => {
        servicePointId = servicePoint[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
          location = res;
        });
      });

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(marcFile.fileName);
            Logs.getCreatedItemsID().then((link) => {
              recordIDs.push(link.split('/')[5]);
            });
          },
        );
      });
    });
  });

  beforeEach('Login', () => {
    cy.login(user.username, user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created user, data', () => {
    Users.deleteViaApi(user.userId);
    cy.deleteHoldingRecordViaApi(recordIDs[3]);
    cy.deleteHoldingRecordViaApi(recordIDs[4]);
    cy.deleteHoldingRecordViaApi(recordIDs[5]);
    InventoryInstance.deleteInstanceViaApi(recordIDs[0]);
    InventoryInstance.deleteInstanceViaApi(recordIDs[1]);
    InventoryInstance.deleteInstanceViaApi(recordIDs[2]);
    NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
      location.institutionId,
      location.campusId,
      location.libraryId,
      location.id,
    );
  });

  it(
    'C387450 "008" field existence validation when create new "MARC Holdings" (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire], retries: 1 },
    () => {
      InventoryInstance.searchByTitle(recordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.goToMarcHoldingRecordAdding();
      QuickMarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
      QuickMarcEditor.updateExistingTagValue(4, '00');
      QuickMarcEditor.checkDeleteButtonExist(4);
      QuickMarcEditor.deleteFieldAndCheck(4, '008');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkDelete008Callout();
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.updateExistingTagValue(4, '008');
      QuickMarcEditor.checkSubfieldsPresenceInTag008();
      QuickMarcEditor.clearCertain008Boxes(
        'AcqStatus',
        'AcqMethod',
        'Gen ret',
        'Compl',
        'Lend',
        'Repro',
        'Lang',
        'Sep/comp',
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveHoldings();
      HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
        // "Edit in quickMARC" option might not be active immediately after creating MARC Holdings
        // this option becomes active after reopening Holdings view window
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();

        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.check008FieldsEmptyHoldings();
        InventorySteps.verifyHiddenFieldValueIn008(
          holdingsID,
          'Date Ent',
          DateTools.getCurrentDateYYMMDD(),
        );
        recordIDs.push(holdingsID);
      });
    },
  );

  it(
    'C350646 Create a new MARC Holdings record for existing "Instance" record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstances.searchBySource('MARC');
      InventoryInstance.searchByTitle(recordIDs[1]);
      InventoryInstance.checkExpectedMARCSource();
      InventoryInstance.goToMarcHoldingRecordAdding();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.updateExistingField(testData.tag852, QuickMarcEditor.getExistingLocation());
      QuickMarcEditor.addEmptyFields(5);
      QuickMarcEditor.updateExistingTagValue(6, testData.tag866);
      QuickMarcEditor.updateExistingField(testData.tag866, testData.tag866Value);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveHoldings();
      HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
        recordIDs.push(holdingsID);
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.viewSource();
        HoldingsRecordView.closeSourceView();
        InventoryInstance.verifyLastUpdatedDate();
        InventoryInstance.verifyRecordStatus(`Source: ${user.lastName}, ${user.firstName}`);
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkUserNameInHeader(user.firstName, user.lastName);
      });
    },
  );

  it(
    'C350757 MARC fields behavior when creating "MARC Holdings" record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(recordIDs[2]);
      InventoryInstance.goToMarcHoldingRecordAdding();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.checkPaneheaderContains(testData.headerTitle);
      QuickMarcEditor.checkPaneheaderContains(testData.headerSubtitle);
      QuickMarcEditor.checkFieldContentMatch(
        'textarea[name="records[0].content"]',
        testData.defaultLDRmask,
      );
      QuickMarcEditor.checkReadOnlyHoldingsTags();
      QuickMarcEditor.verifyHoldingsDefault008BoxesValues(testData.default008BoxesValues);
      QuickMarcEditor.verifyTagValue(5, testData.tag852);
      QuickMarcEditor.verifyTagValue(6, testData.tag999);
      QuickMarcEditor.checkContent('', 5);
      QuickMarcEditor.updateExistingField(testData.tag852, QuickMarcEditor.getExistingLocation());
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveHoldings();
      HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
        recordIDs.push(holdingsID);
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.viewSource();
        InventoryViewSource.checkFieldContentMatch(
          testData.tag001,
          testData.tag001ValueInSourceMask,
        );
        InventoryViewSource.checkFieldContentMatch(
          testData.tag004,
          testData.tag004ValueInSourceMask,
        );
        InventoryViewSource.checkFieldContentMatch(
          testData.tag005,
          testData.tag005ValueInSourceMask,
        );
        InventoryViewSource.checkFieldContentMatch(
          testData.tag999,
          testData.tag999ValueInSourceMask,
        );
        InventoryViewSource.checkFieldContentMatch(
          testData.tagLDR,
          testData.tagLDRValueInSourceMask,
        );
      });
    },
  );

  it(
    'C359242 Create MARC Holdings | Displaying of placeholder message when user deletes a row (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstances.searchBySource(testData.sourceMARC);
      InventoryInstances.selectInstance();
      InventoryInstance.goToMarcHoldingRecordAdding();
      QuickMarcEditor.waitLoading();
      MarcAuthority.addNewField(5, '', '');
      MarcAuthority.addNewField(6, testData.tag151, '');
      MarcAuthority.addNewField(7, '', '$a');
      MarcAuthority.addNewField(8, testData.tag400, '$a value');
      QuickMarcEditor.deleteField(6);
      // here and below: wait for deleted field to disappear
      cy.wait(1000);
      QuickMarcEditor.deleteField(6);
      cy.wait(1000);
      QuickMarcEditor.deleteField(6);
      cy.wait(1000);
      QuickMarcEditor.deleteField(6);
      cy.wait(1000);
      QuickMarcEditor.checkNoDeletePlaceholder();
      QuickMarcEditor.updateExistingTagName(testData.tag852, '85');
      QuickMarcEditor.deleteFieldAndCheck(5, '85');
      QuickMarcEditor.afterDeleteNotification('85');
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(5, '85');
      QuickMarcEditor.checkContent('', 5);
      QuickMarcEditor.updateExistingTagName('85', testData.tag852);
      QuickMarcEditor.selectExistingHoldingsLocation(location);
      QuickMarcEditor.checkContent(`$b ${location.code} `, 5);
      QuickMarcEditor.updateExistingTagName(testData.tag852, '85');
      QuickMarcEditor.deleteFieldAndCheck(5, testData.tag852);
      QuickMarcEditor.afterDeleteNotification('85');
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(5, '85');
      QuickMarcEditor.checkContent('', 5);
      QuickMarcEditor.deleteFieldAndCheck(5, '85');
      QuickMarcEditor.afterDeleteNotification('85');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.tag852callout);
    },
  );
});
