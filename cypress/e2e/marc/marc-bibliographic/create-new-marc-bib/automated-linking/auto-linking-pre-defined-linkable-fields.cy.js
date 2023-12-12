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
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Automated linking', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'C389489 Test: created record with all linkable fields without linking',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
  };

  let userData = {};
  const marcFiles = [
    {
      marc: 'marcAuthFileForC389489.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 20,
    },
  ];

  const createdAuthorityIDs = [];
  let createdInstanceID;
  const queries = ['naturalId="*C389489"', 'keyword="C389489"'];

  const linkableFields = [100, 110, 111, 130, 240, 630, 700, 710, 711, 730, 800, 810, 811, 830];
  const nonLinkableFields = [600, 610, 611, 650, 651, 655];

  const field600 = {
    rowIndex: 4,
    tag: '600',
    content: ' $a Black Panther $c (Fictitious character) $2 fast $0 n2016004081C389489',
  };

  const field630 = {
    rowIndex: 5,
    tag: '630',
    firstContent: '$a Black Panther',
    secondContent: '$a Black Panther $0 no2023006889C389489',
  };

  const newFields = [
    {
      rowIndex: 6,
      tag: '100',
      content: '$a Coates, Ta-Nehisi,$e author. $0 n2008001084C389489',
      isLinked: true,
    },
    {
      rowIndex: 7,
      tag: '110',
      content: '$aBlack Panther (MG) $0 no2006108277C389489',
      isLinked: true,
    },
    {
      rowIndex: 8,
      tag: '111',
      content: '$aPimedate Ööde Filmifestival $0 no2009176429C389489',
      isLinked: true,
    },
    { rowIndex: 9, tag: '130', content: '$a Marvel comics $0 n80026980C389489', isLinked: true },
    {
      rowIndex: 10,
      tag: '240',
      content: '$a Black Panther $0 no2020024230C389489',
      isLinked: true,
    },
    {
      rowIndex: 11,
      tag: '610',
      content: '$a Black Panther $0 nb2009024488C389489',
      isLinked: false,
    },
    {
      rowIndex: 12,
      tag: '611',
      content: '$aPanther Photographic $0n 82216757C389489',
      isLinked: false,
    },
    {
      rowIndex: 13,
      tag: '630',
      content: '$a Black Panther (test: will not be linked) $0 no2023006999C389489',
      isLinked: false,
    },
    {
      rowIndex: 14,
      tag: '650',
      content: '$aGood and evil.$2fast $0 sh2009125989C389489',
      isLinked: false,
    },
    { rowIndex: 15, tag: '651', content: '$aAfrica.$2fast $0 sh 85001531C389489', isLinked: false },
    {
      rowIndex: 16,
      tag: '655',
      content: '$aComics (Graphic works)$2fast $0 gf2014026266C389489',
      isLinked: false,
    },
    {
      rowIndex: 17,
      tag: '700',
      content:
        '$aLee, Stan,$d1922-2018,$ecreator.$0 http://id.loc.gov/authorities/names/n83169267C389489',
      isLinked: true,
    },
    {
      rowIndex: 18,
      tag: '700',
      content: '$a Stelfreeze, Brian, $e artist. $c test: will not be linked $0 tst0013C389489',
      isLinked: false,
    },
    {
      rowIndex: 19,
      tag: '710',
      content: '$a Harry (test: will not be linked) $0 tst0014C389489',
      isLinked: false,
    },
    { rowIndex: 20, tag: '710', content: '$aRobinson $0 no2008081921C389489', isLinked: true },
    { rowIndex: 21, tag: '711', content: '$a Delaware $0 n84745425C389489', isLinked: true },
    { rowIndex: 22, tag: '730', content: '$a Gone T $0 n79066095C389489', isLinked: true },
    { rowIndex: 23, tag: '800', content: '$a Neilson, Donald $0 n79023811C389489', isLinked: true },
    {
      rowIndex: 24,
      tag: '810',
      content: '$a Black Panther Party $0 n80095585C389489',
      isLinked: true,
    },
    {
      rowIndex: 25,
      tag: '811',
      content: '$aStockholm International Film Festival $0 no2018125587C389489',
      isLinked: true,
    },
    { rowIndex: 26, tag: '830', content: '$aBlack Panther $0 no2018018754C389489', isLinked: true },
  ];

  before(() => {
    // Making sure there are no duplicate authority records in the system before auto-linking
    cy.getAdminToken().then(() => {
      queries.forEach((query) => {
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 200,
          query: `${query} and (authRefType=="Authorized")`,
        }).then((records) => {
          records.forEach((record) => {
            MarcAuthority.deleteViaAPI(record.id);
          });
        });
      });
    });

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

      nonLinkableFields.forEach((tag) => {
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
    nonLinkableFields.forEach((tag) => {
      QuickMarcEditor.setRulesForField(tag, true);
    });
    Users.deleteViaApi(userData.userId);
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    InventoryInstance.deleteInstanceViaApi(createdInstanceID);
  });

  it(
    'C389489 Pre-defined linkable fields are linked after clicking on the "Link headings" button when create "MARC bib" (spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      // 1 Click on "Actions" button in second pane → Select "+New MARC Bib Record" option
      InventoryInstance.newMarcBibRecord();
      // 2 Fill "$a" value in "245" field
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245Content}`,
      );
      // 3 Replace blank values in "LDR" positions 06, 07 with valid values
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      // 4 Add eligible for manual linking only field with subfield "$0", by clicking "+" icon next to any field and filling first and fourth box of appeared row with following values
      MarcAuthority.addNewField(field600.rowIndex, field600.tag, field600.content);
      QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
      // 5 Add eligible for automated linking field without subfield "$0", by clicking "+" icon next to any field and filling first and fourth box of appeared row with following values
      MarcAuthority.addNewField(field630.rowIndex, field630.tag, field630.firstContent);
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      // 6 Add subfield "$0" which matched to the "naturalId" field of existing "MARC authority" record to the added eligible for automated linking field
      QuickMarcEditor.updateExistingField(field630.tag, field630.secondContent);
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      // 7 Add new eligible for linking fields, by clicking "+" icon next to any field and filling first and fourth box of appeared row with following values
      newFields.forEach((newField) => {
        MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
      });
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      // 8 Click on the "Link headings" button.
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(
        'Field 100, 110, 111, 130, 240, 630, 700, 710, 711, 730, 800, 810, 811, and 830 has been linked to MARC authority record(s).',
      );
      newFields.forEach((field) => {
        if (field.isLinked) {
          QuickMarcEditor.verifyRowLinked(field.rowIndex + 1, true);
        } else {
          QuickMarcEditor.verifyRowLinked(field.rowIndex + 1, false);
        }
      });
      QuickMarcEditor.checkCallout(
        'Field 630, 700, and 710 must be set manually by selecting the link icon.',
      );
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      // 9 Click "Save & close" button
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.getId().then((id) => {
        createdInstanceID = id;
        // 10 Click on the "Browse" toggle at the "Search & filter" pane
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        // Select "Contributors" as browse option
        BrowseContributors.select();
        // Fill in the search box with contributor name from any linked field, ex.: "Lee, Stan, 1922-2018"
        // Click on the "Search" button.
        BrowseContributors.browse('Lee, Stan, 1922-2018');
        BrowseSubjects.checkRowWithValueAndAuthorityIconExists('Lee, Stan, 1922-2018');
        // 11 Click on the highlighted in bold contributor in the browse result list.
        BrowseSubjects.selectInstanceWithAuthorityIcon('Lee, Stan, 1922-2018');
        // 12 Open detail view of created by user "Instance" record
        InventoryInstances.selectInstanceById(createdInstanceID);
        // Click on the "Actions" in the third pane >> Select "View source".
        InventoryInstance.viewSource();
        // "MARC authority" app icon is displayed next to each field auto linked at Step 8
        newFields.forEach((field) => {
          if (field.isLinked) {
            InventoryViewSource.verifyLinkedToAuthorityIcon(field.rowIndex + 1, true);
          } else {
            InventoryViewSource.verifyLinkedToAuthorityIcon(field.rowIndex + 1, false);
          }
        });
      });
    },
  );
});
