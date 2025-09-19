import uuid from 'uuid';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomStringCode from '../../../../support/utils/generateTextCode';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const randomCode = getRandomStringCode(8);
      const testData = {
        authoritySourceFile: {
          id: uuid(),
          name: `Source option created by USER 6${getRandomPostfix()}`,
          code: randomCode,
          type: 'names',
          baseUrl: `http://id.loc.gov/authorities/pv6/${getRandomPostfix()}`,
          selectable: false,
          hridManagement: { startNumber: 112 },
        },
      };
      const createdAuthorityIDs = [];
      const marcFileToEdit = 'Auth_1_record_original_C365110.mrc';
      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'Auth_2_records_C365110.mrc',
          fileName: `marcFileGenreC365110.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 4,
          propertyName: 'authority',
        },
        {
          marc: 'Auth_1_record_C365110.mrc',
          fileName: `marcFileGenreC365110.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
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
        cy.getAdminToken().then(() => {
          MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C365110"' }).then(
            (records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            },
          );
        });

        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
          Permissions.inventoryAll.internal,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          marcFiles.slice(0, 2).forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        });
      });

      beforeEach('Login to the application', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.slice(1).forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C422170 MARC Authority plug-in | Apply "Authority source" facet not from pre-defined list to the browse result list (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C422170'] },
        () => {
          // #1 Create autority source
          cy.getAdminToken();
          MarcAuthority.createAuthoritySource(testData.authoritySourceFile).then(() => {
            // #2 - #6 Upload marc authority file with the created "code"
            DataImport.editMarcFile(
              marcFileToEdit,
              marcFiles[2].marc,
              ['PLKVPLKV'],
              [testData.authoritySourceFile.code],
            );
            DataImport.uploadFileViaApi(
              marcFiles[2].marc,
              marcFiles[2].fileName,
              marcFiles[2].jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFiles[2].propertyName].id);

                InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
                InventoryInstances.selectInstance();
                InventoryInstance.editMarcBibliographicRecord();
                InventoryInstance.verifyAndClickLinkIcon('700');
                MarcAuthorities.switchToBrowse();
                // #7- #8 Select "Personal name" browse option. Fill in the input field  with the query which will return records to the result list
                MarcAuthorities.searchByParameter('Personal name', 'C365110Canady, Robert Lynn');
                // #9 - #10 Select facet option which you created at step 1 (e.g.: "Test_source_browse") from "Authority source" dropdown.
                MarcAuthorities.chooseAuthoritySourceOption(testData.authoritySourceFile.name);
                MarcAuthorities.closeMarcViewPane();
                MarcAuthorities.verifyAllResultsHaveSource([testData.authoritySourceFile.name]);
                MarcAuthorities.selectItem('C365110Canady, Robert Lynn');
                // #11 Verify that the prefix value from "010 $a" field matched to selected "Authority source" facet option which you created by API request at step 1.
                MarcAuthority.contains(testData.authoritySourceFile.code);

                // #12 Select "LC Name Authority file (LCNAF)" facet option from pre-defined list:
                MarcAuthorities.chooseAuthoritySourceOption('LC Name Authority file (LCNAF)');
                MarcAuthorities.verifyAllResultsHaveSource([
                  testData.authoritySourceFile.name,
                  'LC Name Authority file (LCNAF)',
                ]);
                // #13 - 14 Update the search box with a new query: "Bechhöfer, Susi, 1936-" and click "Search"
                MarcAuthorities.searchByParameter('Personal name', 'C365110Bechhöfer, Susi, 1936-');
                // #15 Click on the higlighted in bold "Heading/Reference" value from the browse result pane.
                MarcAuthorities.selectTitle('C365110Bechhöfer, Susi, 1936-');

                // #16 Verify that the prefix value from "010 $a" ("001") field matched to selected "Authority source" facet option.
                // eslint-disable-next-line no-tabs
                MarcAuthority.contains('010	   	$a n');
                // #17 Select "Not specified" facet option.
                MarcAuthorities.chooseAuthoritySourceOption('Not specified');
                MarcAuthorities.verifyAllResultsHaveSource([
                  testData.authoritySourceFile.name,
                  'LC Name Authority file (LCNAF)',
                  'Not specified',
                ]);
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
              });
            });
          });
        },
      );
    });
  });
});
