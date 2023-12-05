import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Automated linking', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'New title',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
  };

  const newFields = [
    {
      rowIndex: 4,
      tag: '100',
      content: '$a value',
      status: 'not linked',
    },
    {
      rowIndex: 5,
      tag: '240',
      content: '$0 n99036055',
      boxFourth: '$a Hosanna Bible',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/names/n99036055',
      boxSeventh: '',
      status: 'linked',
    },
    {
      rowIndex: 6,
      tag: '610',
      content: '$0 001002x',
      status: 'not linked',
    },
    {
      rowIndex: 7,
      tag: '711',
      content: '$j something $0 n79084169C388560 $2 fast',
      boxFourth: '$a Roma Council $c Basilica di San Pietro in Roma) $d 1962-1965 : $n (2nd :',
      boxFifth: '$j something',
      boxSixth: '$0 id.loc.gov/authorities/names/n79084169C388560',
      boxSeventh: '$2 fast',
      status: 'linked',
    },
    {
      rowIndex: 8,
      tag: '830',
      content: '$a something $d 1900-2000 $0 no2011188426',
      boxFourth: '$a Robinson eminent scholar lecture series',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/names/no2011188426',
      boxSeventh: '',
      status: 'linked',
    },
  ];

  let userData = {};

  const linkableFields = [100, 240, 610, 711, 830];

  const marcFiles = [
    {
      marc: 'marcAuthFileForC388560-1.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388560-2.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388560-3.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388560-4.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388560-5.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const createdAuthorityIDs = [];
  let createdInstanceID;

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
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

      linkableFields.forEach((tag) => {
        QuickMarcEditor.setRulesForField(tag, true);
      });

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created users, Instances', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    InventoryInstance.deleteInstanceViaApi(createdInstanceID);
  });

  it(
    'C388560 Auto-linking fields having "$0" when creating new "MARC Bib" record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.newMarcBibRecord();
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
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(
        'Field 240, 711, and 830 has been linked to MARC authority record(s).',
      );
      QuickMarcEditor.checkCallout('Field 610 must be set manually by selecting the link icon.');
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      newFields.forEach((newField) => {
        if (newField.status === 'linked') {
          QuickMarcEditor.verifyTagFieldAfterLinking(
            newField.rowIndex + 1,
            newField.tag,
            '\\',
            '\\',
            `${newField.boxFourth}`,
            `${newField.boxFifth}`,
            `${newField.boxSixth}`,
            `${newField.boxSeventh}`,
          );
        } else {
          QuickMarcEditor.verifyTagFieldNotLinked(
            newField.rowIndex + 1,
            newField.tag,
            '\\',
            '\\',
            newField.content,
          );
        }
      });
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.getId().then((id) => {
        createdInstanceID = id;
      });
      InventoryInstance.viewSource();
      newFields.forEach((newField) => {
        if (newField.status === 'linked') {
          InventoryViewSource.verifyLinkedToAuthorityIcon(newField.rowIndex + 1);
        } else {
          InventoryViewSource.verifyLinkedToAuthorityIconAbsence(newField.rowIndex + 1);
        }
      });
      QuickMarcEditor.closeEditorPane();
      InventoryInstance.waitLoading();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      newFields.forEach((newField) => {
        if (newField.status === 'linked') {
          QuickMarcEditor.verifyTagFieldAfterLinking(
            newField.rowIndex + 1,
            newField.tag,
            '\\',
            '\\',
            `${newField.boxFourth}`,
            `${newField.boxFifth}`,
            `${newField.boxSixth}`,
            `${newField.boxSeventh}`,
          );
        } else {
          QuickMarcEditor.verifyTagFieldNotLinked(
            newField.rowIndex + 1,
            newField.tag,
            '\\',
            '\\',
            newField.content,
          );
        }
      });
    },
  );
});
