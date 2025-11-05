import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        searchQuery: 'C422166',
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
      const marcBibFile = {
        marc: 'marcBibFileForC422166.mrc',
        fileName: `C422166 marcFileOneBib.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      const marcAuthFiles = [
        {
          marc: 'marcFileForC422166.mrc',
          fileName: `C422166 marcFileGenre.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];
      const createdAuthorityIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422166*');
          DataImport.uploadFileViaApi(
            marcBibFile.marc,
            marcBibFile.fileName,
            marcBibFile.jobProfileToRun,
          ).then((response) => {
            testData.createdInstanceId = response[0].instance.id;
          });
          marcAuthFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
            cy.wait(2000);
          });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20000);
          InventoryInstances.searchByTitle(testData.createdInstanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.preconditionUserId);
        InventoryInstance.deleteInstanceViaApi(testData.createdInstanceId);
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C422166 MARC Authority plug-in | Apply "Authority source" facet to the search result list (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C422166'] },
        () => {
          // #1 - #3 Fill in the input field placed at the "Search & filter" pane with " * ", select search option: "Keyword", click on the "Search" button
          MarcAuthorities.searchByParameter('Keyword', testData.searchQuery);
          MarcAuthorities.checkResultsExistance('Authorized');
          // #4 Click on the multiselect element titled "Authority source" and check dropdown options
          MarcAuthorities.checkAuthoritySourceOptionsInPlugInModal();

          // #5 Click on any facet option. (Not "Not specified") and check results
          MarcAuthorities.chooseAuthoritySourceOption(testData.facetOptions.optionA);
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
          MarcAuthorities.checkResultsSelectedByAuthoritySource([
            testData.facetOptions.optionA,
            testData.facetOptions.optionB,
          ]);

          // #11 Delete the selected at step 6 "Authority source" facet option from multiselect box by clicking on the "X" icon placed in the tag.
          MarcAuthorities.removeAuthoritySourceOption(testData.facetOptions.optionA);
          cy.wait(1000);
          MarcAuthorities.selectTitle(testData.facetValues.valueB);
          // #13 Verify that the prefix value from "010 $a" ("001") field matched to selected "Authority source" facet option.
          MarcAuthority.contains(testData.prefixValues.prefixValB);

          // #14 Delete the selected at step 11 "Authority source" facet option from multiselect box by clicking on it at expanded multiselect element.
          MarcAuthorities.removeAuthoritySourceOption(testData.facetOptions.optionB);
          cy.wait(1000);
          MarcAuthorities.verifyEmptyAuthorityField();

          // #15 Click on the "Not specified" facet option.
          MarcAuthorities.chooseAuthoritySourceOption(testData.facetOptions.optionC);
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
  });
});
