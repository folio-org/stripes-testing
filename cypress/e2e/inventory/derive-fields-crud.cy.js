import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../support/constants';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Derive MARC bib', () => {
  const tags = {
    tag100: '100',
    tag245: '245',
    tag800: '800',
    tag660: '660',
    tag906: '906',
    tag925: '925',
    tag955: '955',
  };

  const inputContent = {
    field800: '$a Created row',
    field655primary: '$a Edited 4th field only',
    field655secondary: '$a Edited MARC tag and 4th field',
  };

  const expectedSourceText = {
    row245: '245  1 4  ‡a The Riviera house / ‡c Natasha Lester.',
    row100: '100  1    ‡a Lester, Natasha, ‡d 1973- ‡e author.',
    row660: '660    7  ‡a Historical fiction. ‡2 gsafd',
    row655primary: '655    7  ‡a Edited 4th field only',
    row655secondary: '655    7  ‡a Edited MARC tag and 4th field',
    row800: '800       ‡a Created row',
  };

  const marcFile = {
    marc: 'marcBibC367956.mrc',
    fileName: `testMarcFile_C367956_${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  let instanceId;
  let testUser;

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
    ]).then((createdUserProperties) => {
      testUser = createdUserProperties;
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          instanceId = link.split('/')[5];
        });
      });
      cy.login(testUser.username, testUser.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user, Instances', () => {
    Users.deleteViaApi(testUser.userId);
    InventoryInstance.deleteInstanceViaApi(instanceId);
  });

  it(
    'C367956 Verify that CRUD actions with fields from "Derive MARC Bib" window will save in new record (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.visit(`${TopMenu.inventoryPath}/view/${instanceId}`);
      InventoryInstance.deriveNewMarcBib();
      QuickMarcEditor.addNewField(tags.tag800, inputContent.field800, 28);
      QuickMarcEditor.checkContent(inputContent.field800, 29);
      // Update the first of three "655" fields to "660"
      QuickMarcEditor.updateExistingTagValue(23, tags.tag660);
      QuickMarcEditor.verifyTagValue(23, tags.tag660);
      // Update the second "655" field content in the following way $a Edited 4th field only
      QuickMarcEditor.updateExistingFieldContent(24, inputContent.field655primary);
      QuickMarcEditor.checkContent(inputContent.field655primary, 24);
      // Update the third "655" field in the following way $a Edited MARC tag and 4th field
      QuickMarcEditor.updateExistingFieldContent(25, inputContent.field655secondary);
      QuickMarcEditor.checkContent(inputContent.field655secondary, 25);
      // Delete all editable 9XX fields by clicking on the "Delete this field" icons.
      QuickMarcEditor.deleteField(26);
      QuickMarcEditor.afterDeleteNotification(tags.tag906);
      QuickMarcEditor.deleteField(27);
      QuickMarcEditor.afterDeleteNotification(tags.tag925);
      QuickMarcEditor.deleteField(28);
      QuickMarcEditor.afterDeleteNotification(tags.tag955);
      // Move "245" MARC field above the "100" field by clicking on the "Move field up a row" icon placed next to the "245" field.
      QuickMarcEditor.moveFieldUp(14);
      QuickMarcEditor.verifyTagValue(14, tags.tag100);
      QuickMarcEditor.verifyTagValue(13, tags.tag245);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.continueWithSaveAndCheckNewInstanceCreated();
      InventoryInstance.viewSource();
      // Verify The "245" MARC field is displayed above the "100 field.
      InventoryViewSource.rowEquals(12, expectedSourceText.row245);
      InventoryViewSource.rowEquals(13, expectedSourceText.row100);
      // Verify edited "6XX" fields are displayed with updates user made.
      InventoryViewSource.rowEquals(22, expectedSourceText.row660);
      InventoryViewSource.rowEquals(23, expectedSourceText.row655primary);
      InventoryViewSource.rowEquals(24, expectedSourceText.row655secondary);
      // Verify the created "800" field is displayed.
      InventoryViewSource.rowEquals(25, expectedSourceText.row800);
      // Verify there are no displayed editable "9XX" fields.
      InventoryViewSource.notContains(tags.tag906);
      InventoryViewSource.notContains(tags.tag925);
      InventoryViewSource.notContains(tags.tag955);
    },
  );
});
