import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'New title',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    searchOptions: {
      identifierAll: 'Identifier (all)',
    },
  };

  const newFields = [
    {
      rowIndex: 4,
      tag: '100',
      content: '$0 y011012',
      naturalId: '$0 3052044C388568',
    },
    {
      rowIndex: 5,
      tag: '240',
      content: '$0 y011013',
      naturalId: '$0 n99036055C388568',
    },
    {
      rowIndex: 6,
      tag: '610',
      content: '$0 y011014',
      naturalId: '$0 n93094742C388568',
    },
    {
      rowIndex: 7,
      tag: '711',
      content: '$0 y011015',
      naturalId: '$0 n79084169C388568',
    },
    {
      rowIndex: 8,
      tag: '811',
      content: '$0 y011016',
      naturalId: '$0 n85281584C388568',
    },
    {
      rowIndex: 9,
      tag: '830',
      content: '$0 y011017',
      naturalId: '$0 no2011188426C388568',
    },
  ];

  let userData = {};

  const linkableFields = [100, 240, 610, 711, 811, 830];

  const marcFiles = [
    {
      marc: 'marcAuthFileForC388568.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 8,
    },
  ];

  const createdAuthorityIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

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
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              createdAuthorityIDs.push(link.split('/')[5]);
            });
          }
        });
      });
    });
  });

  beforeEach('Sign in to platform', () => {
    cy.login(userData.username, userData.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created users, Instances', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    for (let i = 0; i < 8; i++) {
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
    }
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[8]);
  });

  it(
    'C388568 Unlink auto-linked fields, manually link, edit and auto-link fields again when creating new "MARC Bib" record (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245Content}`,
      );
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      newFields.forEach((newField) => {
        MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
      });
      linkableFields.forEach((tag) => {
        QuickMarcEditor.setRulesForField(tag, true);
      });
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(
        'Field 100, 240, 610, 711, 811, and 830 must be set manually by selecting the link icon.',
      );

      newFields.forEach((newField) => {
        QuickMarcEditor.updateExistingField(newField.tag, newField.naturalId);
      });
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(
        'Field 100, 240, 610, 711, 811, and 830 has been linked to MARC authority record(s).',
      );

      for (let i = 5; i < 9; i++) {
        QuickMarcEditor.clickUnlinkIconInTagField(i);
        QuickMarcEditor.confirmUnlinkingField();
        cy.wait(500);
      }
      QuickMarcEditor.clickLinkIconInTagField(newFields[0].rowIndex + 1);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResultsWithOption(
        testData.searchOptions.identifierAll,
        '3052007C388568',
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(newFields[0].tag, newFields[0].rowIndex + 1);
      QuickMarcEditor.updateExistingField(newFields[1].tag, '$0 n2016004081C388568');
      QuickMarcEditor.updateExistingField(newFields[2].tag, '');
      QuickMarcEditor.deleteFieldAndCheck(newFields[4].rowIndex + 1, newFields[4].tag);
      QuickMarcEditor.clickArrowDownButton(newFields[0].rowIndex + 1);

      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(8);
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(6);
      QuickMarcEditor.checkFieldAbsense(newFields[4].tag);
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(9);
      QuickMarcEditor.checkCallout(
        'Field 240 and 711 has been linked to MARC authority record(s).',
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.getId().then((id) => {
        createdAuthorityIDs.push(id);
      });

      InventoryInstance.viewSource();
      InventoryViewSource.contains(
        'Linked to MARC authority\n\t240\t   \t$a Wakanda Forever $0 id.loc.gov/authorities/names/n2016004081C388568 $9',
      );
      InventoryViewSource.contains(
        'Linked to MARC authority\n\t100\t   \t$a Robertson, Peter, $c Inspector Banks series ; $d 1950-2022 $0 3052007C388568 $9',
      );
      InventoryViewSource.contains(
        'Linked to MARC authority\n\t711\t   \t$a Roma Council $c Basilica di San Pietro in Roma) $d 1962-1965 : $n (2nd : $0 id.loc.gov/authorities/names/n79084169C388568 $9',
      );
      InventoryViewSource.contains(
        'Linked to MARC authority\n\t830\t   \t$a Robinson eminent scholar lecture series $0 id.loc.gov/authorities/names/no2011188426C388568 $9',
      );
    },
  );
});
