import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import DataImport from '../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../support/constants';
import getRandomPostfix from '../../support/utils/stringTools';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC -> MARC Bibliographic -> Derive MARC bib', () => {
  const testData = {
    tag001: '001',
    tag010: '010',
    tag240: '240',
    tag650: '650'
  };

  const marcFiles = [
    {
      marc: 'marcBibFileC375994.mrc',
      fileName: `testMarcFileC375994.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle: 'C375994 Abraham Lincoln, by Lillian Hertz. Prize essay in Alexander Hamilton junior high school P.S. 186, June 24, 1927.'
    },
    {
      marc: 'marcAuthFileC375994_1.mrc',
      fileName: `testMarcFileC375994.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C375994 Robinson, Peter, 1950-2022 Alt. title',
      authority001FieldValue: '30520443759941',
    },
    {
      marc: 'marcAuthFileC375994_2.mrc',
      fileName: `testMarcFileC375994.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C375994 Speaking Oratory debating',
      authority010FieldValue: 'sh850952993759942',
    }
  ];

  const createdRecordIDs = [];

  before('Import data, link records', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
      marcFiles.forEach(marcFile => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then(link => {
            createdRecordIDs.push(link.split('/')[5]);
          });
        });
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        // here and below - wait for detail view to be fully loaded
        cy.wait(1500);
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(marcFiles[1].authorityHeading);
        MarcAuthorities.checkFieldAndContentExistence(testData.tag001, marcFiles[1].authority001FieldValue);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag650);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(marcFiles[2].authorityHeading);
        MarcAuthorities.checkFieldAndContentExistence(testData.tag010, `‡a ${marcFiles[2].authority010FieldValue}`);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag650);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
      });
    });
  });

  after('Deleting created user, data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it('C375994 Add controllable subfields to multiple linked fields in "MARC bib" record when deriving record (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    InventoryInstance.searchByTitle(createdRecordIDs[0]);
    InventoryInstances.selectInstance();
    InventoryInstance.deriveNewMarcBib();
    cy.wait(10000);
    // QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${testData.fieldContents.tag245Content}`);
    // QuickMarcEditor.updateExistingField(testData.tags.tagLDR, testData.fieldContents.tagLDRContent);
    // MarcAuthority.addNewField(4, testData.tags.tag100, `$a ${testData.fieldContents.tag100Content}`);
    // MarcAuthority.addNewField(5, testData.tags.tag600, `$a ${testData.fieldContents.tag600Content}`);
    // MarcAuthority.addNewField(6, testData.tags.tag700, `$a ${testData.fieldContents.tag700Content}`);
    // MarcAuthority.addNewField(7, testData.tags.tag800, `$a ${testData.fieldContents.tag800Content}`);
    // MarcAuthority.addNewField(8, testData.tags.tag240, `$a ${testData.fieldContents.tag240Content}`);
    // QuickMarcEditor.pressSaveAndClose();
    // QuickMarcEditor.checkAfterSaveAndClose();

    // InventoryInstance.getId().then(id => { importedInstanceID.push(id) });
    // InventoryInstance.checkInstanceTitle(testData.fieldContents.tag245Content);
    // InventoryInstance.checkDetailViewOfInstance(testData.accordions.contributor, testData.fieldContents.tag100Content);
    // InventoryInstance.checkDetailViewOfInstance(testData.accordions.contributor, testData.fieldContents.tag700Content);
    // InventoryInstance.checkDetailViewOfInstance(testData.accordions.subject, testData.fieldContents.tag600Content);
    // InventoryInstance.checkDetailViewOfInstance(testData.accordions.titleData, testData.fieldContents.tag800Content);
    // InventoryInstance.checkDetailViewOfInstance(testData.accordions.titleData, testData.fieldContents.tag240Content);
    
    // InventoryInstance.editMarcBibliographicRecord();
    // QuickMarcEditor.check008FieldContent();
    // QuickMarcEditor.checkFieldContentMatch('textarea[name="records[1].content"]', /in\d{11}/gm);
    // QuickMarcEditor.checkFieldContentMatch('textarea[name="records[3].content"]', /\d{14}\.\d{1}/gm);
    // QuickMarcEditor.verifyTagField(10, '999', 'f', 'f', '$s', '$i');
  });
});
