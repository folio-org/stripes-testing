import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('plug-in MARC authority | Search', () => {
  const testData = {
    facetOptions: {
      optionA: 'Thesaurus for Graphic Materials (TGM)',
      optionB: 'GSAFD Genre Terms (GSAFD)',
      optionC: 'Not specified',
    },
    prefixValues: {
      // eslint-disable-next-line no-tabs
      prefixValA: '010	   	$a tgm',
      // eslint-disable-next-line no-tabs
      prefixValB: '010	   	$a gsafd',
      // eslint-disable-next-line no-tabs
      prefixValC: '010	   	$a ',
    },
    facetValues: {
      valueA: 'C422166 Postcards',
      valueB: 'C422166 GSAFD Genre (for test)',
      valueC: 'C422166 Stone, Robert B (not from pre-defined list)',
    },
  };
  const marcFiles = [
    {
      marc: 'marcBibFileForC422166.mrc',
      fileName: `marcFileOneBib.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcFileForC422166.mrc',
      fileName: `marcFileGenre.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 13,
    },
  ];
  const createdAuthorityIDs = [];

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
            JobProfiles.waitFileIsUploaded();
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
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
    InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
    InventoryInstances.selectInstance();
    InventoryInstance.editMarcBibliographicRecord();
    InventoryInstance.verifyAndClickLinkIcon('700');
    MarcAuthorities.switchToSearch();
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    for (let i = 1; i < 14; i++) {
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
    }
  });

  it(
    'C422166 MARC Authority plug-in | Apply "Authority source" facet to the search result list (spitfire) (TaaS)',
    { tags: ['extendedPath', DevTeams.spitfire] },
    () => {
      // #1 - #3 Fill in the input field placed at the "Search & filter" pane with " * ", select search option: "Keyword", click on the "Search" button
      MarcAuthorities.searchByParameter('Keyword', '*');
      MarcAuthorities.checkResultsExistance('Authorized');
      // #4 Click on the multiselect element titled "Authority source" and check dropdown options
      MarcAuthorities.checkAuthoritySourceOptions();

      // #5 Click on any facet option. (Not "Not specified") and check results
      MarcAuthorities.chooseAuthoritySourceOption(testData.facetOptions.optionA);
      MarcAuthorities.checkResultsListRecordsCount();
      MarcAuthorities.checkResultsSelectedByAuthoritySource([testData.facetOptions.optionA]);

      // #6 Click on the "Authority source" accordion button at the "Search & filter" pane.
      MarcAuthorities.clickAuthoritySourceAccordion();
      MarcAuthorities.verifyAuthoritySourceAccordionCollapsed();
      MarcAuthorities.checkResultsSelectedByAuthoritySource([testData.facetOptions.optionA]);
      // #7 Click on the "Authority source" accordion button at the "Search & filter" pane.
      MarcAuthorities.clickAuthoritySourceAccordion();
      MarcAuthorities.checkSelectedAuthoritySource(testData.facetOptions.optionA);
      MarcAuthorities.checkResultsSelectedByAuthoritySource([testData.facetOptions.optionA]);

      // #8 Click on any "Heading/Reference" value from the search result pane.
      MarcAuthorities.selectTitle(testData.facetValues.valueA);

      // #9 Verify that the prefix value from "010 $a" ("001") field matched to selected "Authority source" facet option.
      MarcAuthority.contains(testData.prefixValues.prefixValA);

      // #10 Click on the multiselect element titled "Authority source" placed in expanded "Authority source" accordion button and select any facet option. (Not "Not specified")
      MarcAuthorities.chooseAuthoritySourceOption(testData.facetOptions.optionB);
      MarcAuthorities.checkResultsListRecordsCount();
      MarcAuthorities.checkResultsSelectedByAuthoritySource([
        testData.facetOptions.optionA,
        testData.facetOptions.optionB,
      ]);

      // #11 Delete the selected at step 6 "Authority source" facet option from multiselect box by clicking on the "X" icon placed in the tag.
      MarcAuthorities.removeAuthoritySourceOption(testData.facetOptions.optionA);
      // #12 Click on any "Heading/Reference" value from the search result pane.
      MarcAuthorities.selectTitle(testData.facetValues.valueB);

      // #13 Verify that the prefix value from "010 $a" ("001") field matched to selected "Authority source" facet option.
      MarcAuthority.contains(testData.prefixValues.prefixValB);

      // #14 Delete the selected at step 11 "Authority source" facet option from multiselect box by clicking on it at expanded multiselect element.
      MarcAuthorities.removeAuthoritySourceOption(testData.facetOptions.optionB);
      MarcAuthorities.verifyEmptyAuthorityField();

      // #15 Click on the "Not specified" facet option.
      MarcAuthorities.chooseAuthoritySourceOption(testData.facetOptions.optionC);
      MarcAuthorities.checkResultsListRecordsCount();
      MarcAuthorities.checkResultsSelectedByAuthoritySource([testData.facetOptions.optionC]);

      // #16 Click on any "Heading/Reference" value from the search result pane.
      MarcAuthorities.selectTitle(testData.facetValues.valueC);

      // #17 Verify that there is no prefix value from the pre-defined list in "010 $a" ("001") field.
      MarcAuthority.contains(testData.prefixValues.prefixValC);

      // #18 Cancel the applied "Authority source" facet by clicking on the "X" icon next to the "Authority source" accordion button.
      InventoryInstance.closeAuthoritySource();
      MarcAuthorities.verifyEmptyAuthorityField();
      MarcAuthorities.checkResultsExistance('Authorized');
    },
  );
});
