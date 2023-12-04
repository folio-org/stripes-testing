import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    tag611: '611',
    subjectAccordion: 'Subject',
    subjectValue:
      'C377027 Roma Council 1962-1965 : Basilica di San Pietro in Roma) (2nd :--TestV--TestX--TestY--TestZ',
    authorityIconText: 'Linked to MARC authority',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC377027.mrc',
      fileName: `testMarcFileC377027${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC377027.mrc',
      fileName: `testMarcFileC377027${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C377027 Roma Council (2nd : 1962-1965 : Basilica di San Pietro in Roma)',
    },
  ];

  const createdRecordIDs = [];

  const bib611AfterLinkingToAuth111 = [
    15,
    testData.tag611,
    '2',
    '7',
    '$a C377027 Roma Council $d 1962-1965 : $c Basilica di San Pietro in Roma) $n (2nd :',
    '$v TestV $x TestX $y TestY $z TestZ',
    '$0 id.loc.gov/authorities/names/n79084169',
    '$2 fast $1 http://viaf.org/viaf/133636573/',
  ];

  before('Creating user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin().then(() => {
        marcFiles.forEach((marcFile) => {
          cy.visit(TopMenu.dataImportPath);
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then((link) => {
            createdRecordIDs.push(link.split('/')[5]);
          });
        });
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
        else InventoryInstance.deleteInstanceViaApi(id);
      });
    });
  });

  it(
    'C377027 Link the "611" of "MARC Bib" field to "MARC Authority" record (with "v", "x", "y", "z" subfields). (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIcon(testData.tag611);
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.verifySearchOptions();
      MarcAuthorities.switchToSearch();
      MarcAuthorities.clickReset();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag611);
      QuickMarcEditor.checkUnlinkTooltipText(testData.tag611, 'Unlink from MARC Authority record');
      QuickMarcEditor.checkViewMarcAuthorityTooltipText(bib611AfterLinkingToAuth111[0]);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib611AfterLinkingToAuth111);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyInstanceSubject(
        0,
        0,
        `${testData.authorityIconText}${testData.subjectValue}`,
      );
      InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(
        testData.subjectAccordion,
      );
    },
  );
});
