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
      tag245Content: 'Test: created record with all linkable fields without linking',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
  };

  const newFields = [
    { rowIndex: 4, tag: '100', content: '$aCoates, Ta-Nehisi,$eauthor. $0 n2008001084' },
    { rowIndex: 5, tag: '110', content: '$aBlack Panther (MG) $0 no2006108277' },
    { rowIndex: 6, tag: '111', content: '$aPimedate Ööde Filmifestival $0 no2009176429' },
    { rowIndex: 7, tag: '130', content: '$aMarvel comics $0n 80026980' },
    { rowIndex: 8, tag: '240', content: '$aBlack Panther $0 no2020024230' },
    {
      rowIndex: 9,
      tag: '600',
      content: '$aBlack Panther$c(Fictitious character)$2fast $0 n2016004081',
    },
    { rowIndex: 10, tag: '610', content: '$aBlack Panther $0 nb2009024488' },
    { rowIndex: 11, tag: '611', content: '$aPanther Photographic $0n 82216757' },
    { rowIndex: 12, tag: '630', content: '$aBlack Panther $0 no2023006889' },
    { rowIndex: 13, tag: '650', content: '$aGood and evil.$2fast $0 sh2009125989' },
    { rowIndex: 14, tag: '651', content: '$aAfrica.$2fast $0 sh 85001531' },
    { rowIndex: 15, tag: '655', content: '$aComics (Graphic works)$2fast $0 gf2014026266' },
    {
      rowIndex: 16,
      tag: '700',
      content: '$aLee, Stan,$d1922-2018,$ecreator.$0 http://id.loc.gov/authorities/names/n83169267',
    },
    { rowIndex: 17, tag: '710', content: '$aRobinson $0 no2008081921' },
    { rowIndex: 18, tag: '711', content: '$aDelaware $0 n  84745425' },
    { rowIndex: 19, tag: '730', content: '$aGone T $0n 79066095' },
    { rowIndex: 20, tag: '800', content: '$aNeilson, Donald $0 n 79023811' },
    { rowIndex: 21, tag: '810', content: '$aBlack Panther Party $0 n 80095585' },
    {
      rowIndex: 22,
      tag: '811',
      content: '$aStockholm International Film Festival $0 no2018125587',
    },
    { rowIndex: 23, tag: '830', content: '$aBlack Panther $0 no2018018754' },
  ];

  let userData = {};

  const linkableFields = [
    100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811,
    830,
  ];

  const marcFiles = [
    {
      marc: 'marcAuthFileForC389484.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 20,
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
        QuickMarcEditor.setRulesForField(tag, false);
      });

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created users, Instances', () => {
    cy.getAdminToken();
    linkableFields.forEach((tag) => {
      QuickMarcEditor.setRulesForField(tag, true);
    });
    Users.deleteViaApi(userData.userId);
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    InventoryInstance.deleteInstanceViaApi(createdInstanceID);
  });

  it(
    'C389484 "Link headings" button is NOT displayed in create "MARC bib" window when auto-link for all heading types is disabled (spitfire) (TaaS)',
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
      newFields.forEach((newField) => {
        QuickMarcEditor.verifyTagField(
          newField.rowIndex + 1,
          newField.tag,
          '\\',
          '\\',
          newField.content,
          '',
        );
      });
      QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.getId().then((id) => {
        createdInstanceID = id;
      });
      InventoryInstance.viewSource();
      newFields.forEach((newField) => {
        InventoryViewSource.verifyLinkedToAuthorityIcon(newField.rowIndex + 1, false);
      });
    },
  );
});
