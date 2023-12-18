import uuid from 'uuid';
import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../support/utils/stringTools';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomStringCode from '../../../../support/utils/genereteTextCode';

describe('plug-in MARC authority | Browse', () => {
  const testData = {
    authoritySourceFile: {
      id: uuid(),
      name: `Test_source_browse_C365110${getRandomPostfix()}`,
      codes: [getRandomStringCode(4)],
      type: 'Personal Name',
      baseUrl: `id.loc.gov/authorities/personalname/test${getRandomPostfix()}`,
      source: 'local',
    },
  };
  const createdAuthorityIDs = [];
  const marcFileToEdit = 'Auth_1_record_C365110.mrc';
  const marcFiles = [
    {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'Auth_2_records_C365110.mrc',
      fileName: `marcFileGenreC365110.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 2,
    },
    {
      marc: 'Auth_1_C365110.mrc',
      fileName: `marcFileGenreC365110.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];
  const predefinedPrefixes = [
    'n',
    'nb',
    'nr',
    'no',
    'sh',
    'sj',
    'gf',
    'dg',
    'mp',
    'fst',
    'D',
    'lcgtm',
    'tgm',
    'rbmscv',
    'aat',
    'aatg',
    'gsafd',
  ];

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      marcFiles.slice(0, 2).forEach((marcFile) => {
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
            for (let i = 0; i < marcFile.numOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                createdAuthorityIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    createdAuthorityIDs.slice(1).forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C365110 MARC Authority plug-in | Apply "Authority source" facet not from pre-defined list to the browse result list (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      // #1 Create autority source
      MarcAuthority.createAuthoritySource(testData.authoritySourceFile).then(() => {
        // #2 - #6 Upload marc authority file with the created "code"
        DataImport.editMarcFile(
          marcFileToEdit,
          marcFiles[2].marc,
          ['PLKV'],
          testData.authoritySourceFile.codes,
        );
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFiles[2].marc, marcFiles[2].fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFiles[2].jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFiles[2].fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFiles[2].fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdAuthorityIDs.push(link.split('/')[5]);
        });
      });
      cy.visit(TopMenu.inventoryPath);
      InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIcon('700');
      MarcAuthorities.switchToBrowse();
      // #7- #8 Select "Personal name" browse option. Fill in the input field  with the query which will return records to the result list
      MarcAuthorities.searchByParameter('Personal name', 'C365110Canady, Robert Lynn');
      // #9 - #10 Select facet option which you created at step 1 (e.g.: "Test_source_browse") from "Authority source" dropdown.
      MarcAuthorities.chooseAuthoritySourceOption(testData.authoritySourceFile.name);
      // #11 Verify that the prefix value from "010 $a" field matched to selected "Authority source" facet option which you created by API request at step 1.
      MarcAuthority.contains(testData.authoritySourceFile.codes[0]);

      // #12 Select "LC Name Authority file (LCNAF)" facet option from pre-defined list:
      MarcAuthorities.chooseAuthoritySourceOption('LC Name Authority file (LCNAF)');
      // #13 - 14 Update the search box with a new query: "Bechhöfer, Susi, 1936-" and click "Search"
      MarcAuthorities.searchByParameter('Personal name', 'C365110Bechhöfer, Susi, 1936-');
      // #15 Click on the higlighted in bold "Heading/Reference" value from the browse result pane.
      MarcAuthorities.selectTitle('C365110Bechhöfer, Susi, 1936-');

      // #16 Verify that the prefix value from "010 $a" ("001") field matched to selected "Authority source" facet option.
      // eslint-disable-next-line no-tabs
      MarcAuthority.contains('010	   	$a n');
      // #17 Select "Not specified" facet option.
      MarcAuthorities.chooseAuthoritySourceOption('Not specified');
      // #18 - #19 Update the search box with a new query: "Stone, Robert B (not from pre-defined list)". Click on the "Search" button.
      MarcAuthorities.searchByParameter(
        'Personal name',
        'C365110Stone, Robert B (not from pre-defined list)',
      );
      // #20 Click on the higlighted in bold "Heading/Reference" value from the browse result pane.
      MarcAuthorities.selectTitle('C365110Stone, Robert B (not from pre-defined list)');
      // #21 Verify that there is no prefix value displayed in the "010 $a" ("001") field, which matched to the prefix values from predefined.
      predefinedPrefixes.forEach((prefix) => {
        // eslint-disable-next-line no-tabs
        MarcAuthority.notContains(`010	   	$a ${prefix}`);
      });
    },
  );
});
